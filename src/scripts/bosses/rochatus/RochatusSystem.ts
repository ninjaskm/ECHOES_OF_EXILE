import { system, world } from "@minecraft/server";
import type { Entity, EntityDieAfterEvent, Player } from "@minecraft/server";
import { BossIds, EntityIds } from "../../core/constants.js";
import { normalizeVector } from "../../core/math.js";
import { StateMachine } from "../../core/FSM.js";
import type { StateDefinitions } from "../../core/FSM.js";
import { saveSystem } from "../../save/SaveSystem.js";
import type { Portal, SystemContext } from "../../types.js";
import { QuakeAttack } from "../attacks/QuakeAttack.js";
import { RollAttack } from "../attacks/RollAttack.js";
import { SpikeWaveAttack } from "../attacks/SpikeWaveAttack.js";
import { BaseBossSystem } from "../base/BaseBossSystem.js";
import type { BaseBossContext } from "../base/BaseBossSystem.js";
import type { BossAttack } from "../base/BossAttack.js";

const BOSS_RADIUS = 160;
const BASE_HEALTH = 400;
const BOSS_BAR_MAX_HEALTH = 500;
const SPIKES_PER_WAVE = 6;
const SPIKE_SPREAD_SIZE = 15;
const ROLL_ATTACK_INTERVAL_TICKS = 150;
const SPIKE_ATTACK_INTERVAL_TICKS = 150;
const QUAKE_ATTACK_INTERVAL_TICKS = 150;
const FIRST_SPECIAL_DELAY_TICKS = 100;
const ATTACK_RECOVERY_TICKS = 24;
const SPECIAL_TELEGRAPH_TICKS = 20;
const TELEGRAPH_REFRESH_TICKS = 5;
const COMMAND_SPAWN_FORWARD_DISTANCE = 6;
const TELEGRAPH_FORWARD_DISTANCE = 2.4;
const RUN_TELEGRAPH_PARTICLE = "exile:warning_run_sheet";
const SPIKE_TELEGRAPH_PARTICLE = "exile:warning_sheet_spikes";
const QUAKE_TELEGRAPH_PARTICLE = "exile:quake_wave_red";
const DAMAGE = {
  roll: 20,
  spikes: 7,
  quake: 20
};

interface RochatusContext extends BaseBossContext {
  attack: BossAttack;
  attackAvailableTicks: Record<string, number>;
}

type RochatusSpawnPortal = Pick<Portal, "dimension" | "location">;

class RochatusSystem extends BaseBossSystem<RochatusContext> {
  private eventBus!: SystemContext["eventBus"];

  private readonly attacks: BossAttack[] = [
    new RollAttack({
      damage: DAMAGE.roll,
      contactRadius: 2.4,
      activeTicks: 18,
      totalTicks: 52,
      stepDistance: 0.432,
      carryStrength: 1.1,
      verticalFollowRange: 2,
      message: "Rochatus rolls",
      effect: { type: "slowness", duration: 120, options: { amplifier: 1 } }
    }),
    new SpikeWaveAttack({
      damage: DAMAGE.spikes,
      spikesPerWave: SPIKES_PER_WAVE,
      spreadSize: SPIKE_SPREAD_SIZE,
      targetLockRange: 15,
      waveIntervalTicks: 10,
      waveUntilTick: 70,
      impactDelayTicks: 18,
      impactRadius: 2,
      totalTicks: 120,
      message: "Spikes falling",
      fallParticleId: "exile:rochatus_stalactite",
      impactParticleId: "exile:rochatus_stalactite",
      fallHeight: 9,
      fallStepTicks: 4,
      effect: { type: "slowness", duration: 60, options: { amplifier: 0 } }
    }),
    new QuakeAttack({
      damage: DAMAGE.quake,
      radius: 7.5,
      jumpHeight: 7,
      minAirTicks: 8,
      maxAirTicks: 45,
      totalTicks: 113,
      message: "Earthquake",
      sound: "random.explode",
      cameraShake: { intensity: 0.45, seconds: 0.7 },
      effect: { type: "slowness", duration: 80, options: { amplifier: 2 } }
    })
  ];

  constructor() {
    super("Rochatus", BOSS_RADIUS);
  }

  initialize({ eventBus, tickManager }: SystemContext): void {
    this.eventBus = eventBus;
    eventBus.subscribe("portal:activated", ({ portal }) => this.spawnRochatus(portal));
    tickManager.every(1, () => this.updateBosses());
    tickManager.every(20, () => this.refreshArenaPlayers());
    world.afterEvents.entityDie.subscribe((event) => this.handleEntityDie(event));

    system.afterEvents.scriptEventReceive.subscribe((event) => {
      if (event.id === "exile:spawn_rochatus") this.spawnRochatusForPlayer(event.sourceEntity as Player | undefined);
    });
  }

  spawnRochatusForPlayer(player: Player | undefined): void {
    if (!player || player.typeId !== "minecraft:player") return;
    const direction = normalizeVector(player.getViewDirection());
    this.spawnRochatus({
      dimension: player.dimension,
      location: {
        x: player.location.x + direction.x * COMMAND_SPAWN_FORWARD_DISTANCE,
        y: player.location.y,
        z: player.location.z + direction.z * COMMAND_SPAWN_FORWARD_DISTANCE
      }
    });
  }

  spawnRochatus(portal: RochatusSpawnPortal): void {
    if (saveSystem.isBossKilled(BossIds.rochatus)) {
      for (const player of world.getAllPlayers()) {
        player.sendMessage("Rochatus has already been defeated in this world.");
      }
      return;
    }

    if (this.activeBosses.size > 0) {
      for (const player of world.getAllPlayers()) {
        player.sendMessage("Rochatus is already active.");
      }
      return;
    }

    const boss = portal.dimension.spawnEntity(EntityIds.rochatus, {
      x: portal.location.x,
      y: portal.location.y + 1,
      z: portal.location.z
    });

    const playerCount = Math.max(1, this.getPlayersInArena(boss).length);
    const scaledHealth = Math.min(BOSS_BAR_MAX_HEALTH, Math.floor(BASE_HEALTH * (1 + playerCount * 0.25)));
    const health = boss.getComponent("minecraft:health");
    try {
      health?.setCurrentValue(scaledHealth);
    } catch (error) {
      console.warn(`[Echoes of Exile] Failed to set Rochatus health to ${scaledHealth}: ${error}`);
    }
    const currentHealth = health ? Math.max(0, Math.floor(health.currentValue)) : scaledHealth;
    boss.nameTag = `Rochatus [${currentHealth} HP]`;

    let context: RochatusContext;
    context = {
      boss,
      target: undefined,
      attackIndex: -1,
      attack: this.attacks[0] ?? this.createFallbackAttack(),
      attackAvailableTicks: {},
      playersInArena: this.getPlayersInArena(boss),
      elapsedTicks: 0,
      arenaMessage: (message) => this.arenaMessage(boss, message),
      damagePlayersNear: (radius, amount, effect) =>
        this.damagePlayersNear(boss, context.playersInArena, radius, amount, effect),
      finish: () => undefined
    };

    const machine = new StateMachine({
      initialState: "IDLE",
      context,
      states: this.createStates()
    });

    this.activeBosses.set(boss.id, { boss, machine });
    this.arenaMessage(boss, "Rochatus");
    try {
      boss.dimension.runCommand(`playsound mob.wither.spawn @a ${boss.location.x} ${boss.location.y} ${boss.location.z}`);
    } catch {
      // Spawn sound is best-effort and should not cancel boss initialization.
    }
  }

  createStates(): StateDefinitions<RochatusContext> {
    return {
      IDLE: {
        onTick: (ctx, fsm) => {
          ctx.target = this.selectBossTarget(ctx.boss, ctx.target, ctx.playersInArena);
          if (ctx.target) fsm.transition("SPECIAL_WAIT");
        }
      },
      SPECIAL_WAIT: {
        onTick: (ctx, fsm) => {
          ctx.target = this.selectBossTarget(ctx.boss, ctx.target, ctx.playersInArena);
          if (!ctx.target || !ctx.target.isValid) return fsm.transition("IDLE");
          if (fsm.elapsedTicks >= FIRST_SPECIAL_DELAY_TICKS) fsm.transition("TELEGRAPH");
        }
      },
      TELEGRAPH: {
        onEnter: (ctx) => {
          ctx.attack = this.selectNextAttack(ctx);
          ctx.target = this.selectBossTarget(ctx.boss, ctx.target, ctx.playersInArena);
          this.renderAttackTelegraph(ctx);
        },
        onTick: (ctx, fsm) => {
          ctx.target = this.selectBossTarget(ctx.boss, ctx.target, ctx.playersInArena);
          if (!ctx.target || !ctx.target.isValid) return fsm.transition("IDLE");
          if (fsm.elapsedTicks % TELEGRAPH_REFRESH_TICKS === 0) this.renderAttackTelegraph(ctx);
          if (fsm.elapsedTicks >= SPECIAL_TELEGRAPH_TICKS) fsm.transition("COMBAT");
        }
      },
      COMBAT: {
        onEnter: (ctx, fsm) => {
          ctx.target = this.selectBossTarget(ctx.boss, ctx.target, ctx.playersInArena);
          ctx.attack.onEnter?.(this.createAttackContext(ctx, fsm.elapsedTicks, () => fsm.transition("RECOVER")));
        },
        onTick: (ctx, fsm) => {
          if (!ctx.target || !ctx.target.isValid) return fsm.transition("IDLE");
          ctx.attack.onTick(this.createAttackContext(ctx, fsm.elapsedTicks, () => fsm.transition("RECOVER")));
        }
      },
      RECOVER: {
        onTick: (ctx, fsm) => {
          ctx.target = this.selectBossTarget(ctx.boss, ctx.target, ctx.playersInArena);
          if (!ctx.target || !ctx.target.isValid) return fsm.transition("IDLE");
          if (fsm.elapsedTicks >= ATTACK_RECOVERY_TICKS) fsm.transition("TELEGRAPH");
        }
      },
      STAGGER: {
        onEnter: (ctx) => {
          this.arenaMessage(ctx.boss, "Rochatus staggers");
        },
        onTick: (_ctx, fsm) => {
          if (fsm.elapsedTicks > 20) fsm.transition("COMBAT");
        }
      },
      DEAD: {
        onEnter: (ctx) => {
          this.arenaMessage(ctx.boss, "Rochatus defeated");
        }
      }
    };
  }

  refreshArenaPlayers(): void {
    this.updateArenaPlayers();
  }

  updateBosses(): void {
    for (const [id, entry] of this.activeBosses) {
      if (!entry.boss.isValid) {
        this.activeBosses.delete(id);
        continue;
      }

      entry.machine.update();
      this.updateBossNameTag(entry.boss);
    }
  }

  handleEntityDie({ deadEntity }: EntityDieAfterEvent): void {
    if (deadEntity.typeId !== EntityIds.rochatus) return;

    const players = this.getPlayersInArena(deadEntity, BOSS_RADIUS);
    saveSystem.markBossKilled(BossIds.rochatus);
    this.activeBosses.get(deadEntity.id)?.machine.transition("DEAD");
    this.activeBosses.delete(deadEntity.id);
    this.eventBus.publish("boss:killed", { bossId: BossIds.rochatus, players, location: deadEntity.location });
  }

  private createFallbackAttack(): BossAttack {
    return {
      id: "fallback",
      onTick: (context) => context.finish()
    };
  }

  private selectNextAttack(context: RochatusContext): BossAttack {
    const now = system.currentTick;
    const availableAttacks = this.attacks.filter((attack) => this.isAttackAvailable(context, attack, now));

    if (availableAttacks.length > 0) {
      const selected = availableAttacks[Math.floor(Math.random() * availableAttacks.length)];
      if (!selected) return this.createFallbackAttack();
      context.attackIndex = this.attacks.indexOf(selected);
      this.markAttackUsed(context, selected, now);
      return selected;
    }

    return this.createFallbackAttack();
  }

  private isAttackAvailable(context: RochatusContext, attack: BossAttack, currentTick: number): boolean {
    return currentTick >= (context.attackAvailableTicks[attack.id] ?? 0);
  }

  private markAttackUsed(context: RochatusContext, attack: BossAttack, currentTick: number): void {
    context.attackAvailableTicks[attack.id] = currentTick + this.getAttackIntervalTicks(attack);
  }

  private renderAttackTelegraph(context: RochatusContext): void {
    if (context.attack.id === "roll") return this.renderSideArrowTelegraph(context.boss, this.resolveTelegraphForward(context));
    if (context.attack.id === "spikes") return this.renderSpikeWarningTelegraph(context.boss, this.resolveTelegraphForward(context));
    if (context.attack.id === "quake") return this.renderQuakeWarningTelegraph(context.boss, this.resolveTelegraphForward(context));
  }

  private resolveTelegraphForward(context: RochatusContext): { x: number; z: number } {
    if (!context.target) return { x: 0, z: 1 };
    const direction = normalizeVector({
      x: context.target.location.x - context.boss.location.x,
      y: 0,
      z: context.target.location.z - context.boss.location.z
    });
    return { x: direction.x, z: direction.z };
  }

  private renderSideArrowTelegraph(boss: Entity, forward: { x: number; z: number }): void {
    this.spawnTelegraphShape(boss, RUN_TELEGRAPH_PARTICLE, forward, [
      { x: 0, y: 1.5, z: 0 }
    ]);
  }

  private renderSpikeWarningTelegraph(boss: Entity, forward: { x: number; z: number }): void {
    this.spawnTelegraphShape(boss, SPIKE_TELEGRAPH_PARTICLE, forward, [
      { x: 0, y: 1.4, z: 0 }
    ]);
  }

  private renderQuakeWarningTelegraph(boss: Entity, forward: { x: number; z: number }): void {
    this.spawnTelegraphShape(boss, QUAKE_TELEGRAPH_PARTICLE, forward, [
      { x: 0, y: 1.3, z: 0 }
    ]);
  }

  private spawnTelegraphShape(
    boss: Entity,
    particleId: string,
    forward: { x: number; z: number },
    offsets: Array<{ x: number; y: number; z: number }>
  ): void {
    for (const offset of offsets) {
      try {
        boss.dimension.runCommand(
          `particle ${particleId} ${boss.location.x + forward.x * TELEGRAPH_FORWARD_DISTANCE + offset.x} ${boss.location.y + offset.y} ${boss.location.z + forward.z * TELEGRAPH_FORWARD_DISTANCE + offset.z}`
        );
      } catch {
        // Telegraph particles are visual-only.
      }
    }
  }

  private getAttackIntervalTicks(attack: BossAttack): number {
    if (attack.id === "roll") return ROLL_ATTACK_INTERVAL_TICKS;
    if (attack.id === "spikes") return SPIKE_ATTACK_INTERVAL_TICKS;
    if (attack.id === "quake") return QUAKE_ATTACK_INTERVAL_TICKS;
    return ATTACK_RECOVERY_TICKS;
  }
}

export const rochatusSystem = new RochatusSystem();
