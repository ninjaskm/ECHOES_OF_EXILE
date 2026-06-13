import { system, world } from "@minecraft/server";
import { BossIds, EntityIds } from "../../core/constants.js";
import { StateMachine } from "../../core/FSM.js";
import { saveSystem } from "../../save/SaveSystem.js";
import { QuakeAttack } from "../attacks/QuakeAttack.js";
import { RollAttack } from "../attacks/RollAttack.js";
import { SpikeWaveAttack } from "../attacks/SpikeWaveAttack.js";
import { BaseBossSystem } from "../base/BaseBossSystem.js";
const BOSS_RADIUS = 160;
const BASE_HEALTH = 400;
const SPIKES_PER_WAVE = 6;
const SPIKE_SPREAD_SIZE = 12;
const ROLL_ATTACK_INTERVAL_TICKS = 150;
const SPIKE_ATTACK_INTERVAL_TICKS = 150;
const QUAKE_ATTACK_INTERVAL_TICKS = 150;
const FIRST_SPECIAL_DELAY_TICKS = 100;
const ATTACK_RECOVERY_TICKS = 24;
const DAMAGE = {
    roll: 10,
    spikes: 7,
    quake: 14
};
class RochatusSystem extends BaseBossSystem {
    eventBus;
    attacks = [
        new RollAttack({
            damage: DAMAGE.roll,
            contactRadius: 2.4,
            activeTicks: 18,
            totalTicks: 52,
            stepDistance: 0.72,
            message: "Rochatus rolls",
            effect: { type: "slowness", duration: 60, options: { amplifier: 0 } }
        }),
        new SpikeWaveAttack({
            damage: DAMAGE.spikes,
            spikesPerWave: SPIKES_PER_WAVE,
            spreadSize: SPIKE_SPREAD_SIZE,
            waveIntervalTicks: 10,
            waveUntilTick: 70,
            impactDelayTicks: 18,
            impactRadius: 2,
            totalTicks: 120,
            message: "Spikes falling",
            effect: { type: "slowness", duration: 60, options: { amplifier: 0 } }
        }),
        new QuakeAttack({
            damage: DAMAGE.quake,
            radius: 9,
            jumpHeight: 5,
            minAirTicks: 8,
            maxAirTicks: 45,
            totalTicks: 75,
            message: "Earthquake",
            sound: "random.explode",
            effect: { type: "slowness", duration: 80, options: { amplifier: 1 } }
        })
    ];
    constructor() {
        super("Rochatus", BOSS_RADIUS);
    }
    initialize({ eventBus, tickManager }) {
        this.eventBus = eventBus;
        eventBus.subscribe("portal:activated", ({ portal }) => this.spawnRochatus(portal));
        tickManager.every(1, () => this.updateBosses());
        tickManager.every(20, () => this.refreshArenaPlayers());
        world.afterEvents.entityDie.subscribe((event) => this.handleEntityDie(event));
        system.afterEvents.scriptEventReceive.subscribe((event) => {
            if (event.id === "exile:spawn_rochatus")
                this.spawnRochatusForPlayer(event.sourceEntity);
        });
    }
    spawnRochatusForPlayer(player) {
        if (!player || player.typeId !== "minecraft:player")
            return;
        this.spawnRochatus({
            dimension: player.dimension,
            location: {
                x: player.location.x + 4,
                y: player.location.y,
                z: player.location.z + 4
            }
        });
    }
    spawnRochatus(portal) {
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
        const scaledHealth = Math.floor(BASE_HEALTH * (1 + playerCount * 0.25));
        const health = boss.getComponent("minecraft:health");
        try {
            health?.setCurrentValue(scaledHealth);
        }
        catch (error) {
            console.warn(`[Echoes of Exile] Failed to set Rochatus health to ${scaledHealth}: ${error}`);
        }
        const currentHealth = health ? Math.max(0, Math.floor(health.currentValue)) : scaledHealth;
        boss.nameTag = `Rochatus [${currentHealth} HP]`;
        let context;
        context = {
            boss,
            target: undefined,
            attackIndex: -1,
            attack: this.attacks[0] ?? this.createFallbackAttack(),
            attackAvailableTicks: {},
            playersInArena: this.getPlayersInArena(boss),
            elapsedTicks: 0,
            arenaMessage: (message) => this.arenaMessage(boss, message),
            damagePlayersNear: (radius, amount, effect) => this.damagePlayersNear(boss, context.playersInArena, radius, amount, effect),
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
        }
        catch {
            // Spawn sound is best-effort and should not cancel boss initialization.
        }
    }
    createStates() {
        return {
            IDLE: {
                onTick: (ctx, fsm) => {
                    ctx.target = this.nearestPlayer(ctx.boss, ctx.playersInArena);
                    if (ctx.target)
                        fsm.transition("SPECIAL_WAIT");
                }
            },
            SPECIAL_WAIT: {
                onTick: (ctx, fsm) => {
                    ctx.target = this.nearestPlayer(ctx.boss, ctx.playersInArena);
                    if (!ctx.target || !ctx.target.isValid)
                        return fsm.transition("IDLE");
                    if (fsm.elapsedTicks >= FIRST_SPECIAL_DELAY_TICKS)
                        fsm.transition("COMBAT");
                }
            },
            COMBAT: {
                onEnter: (ctx, fsm) => {
                    ctx.attack = this.selectNextAttack(ctx);
                    ctx.target = this.nearestPlayer(ctx.boss, ctx.playersInArena);
                    ctx.attack.onEnter?.(this.createAttackContext(ctx, fsm.elapsedTicks, () => fsm.transition("RECOVER")));
                },
                onTick: (ctx, fsm) => {
                    if (!ctx.target || !ctx.target.isValid)
                        return fsm.transition("IDLE");
                    ctx.attack.onTick(this.createAttackContext(ctx, fsm.elapsedTicks, () => fsm.transition("RECOVER")));
                }
            },
            RECOVER: {
                onTick: (ctx, fsm) => {
                    ctx.target = this.nearestPlayer(ctx.boss, ctx.playersInArena);
                    if (!ctx.target || !ctx.target.isValid)
                        return fsm.transition("IDLE");
                    if (fsm.elapsedTicks >= ATTACK_RECOVERY_TICKS)
                        fsm.transition("COMBAT");
                }
            },
            STAGGER: {
                onEnter: (ctx) => {
                    this.arenaMessage(ctx.boss, "Rochatus staggers");
                },
                onTick: (_ctx, fsm) => {
                    if (fsm.elapsedTicks > 20)
                        fsm.transition("COMBAT");
                }
            },
            DEAD: {
                onEnter: (ctx) => {
                    this.arenaMessage(ctx.boss, "Rochatus defeated");
                }
            }
        };
    }
    refreshArenaPlayers() {
        this.updateArenaPlayers();
    }
    updateBosses() {
        for (const [id, entry] of this.activeBosses) {
            if (!entry.boss.isValid) {
                this.activeBosses.delete(id);
                continue;
            }
            entry.machine.update();
            this.updateBossNameTag(entry.boss);
        }
    }
    handleEntityDie({ deadEntity }) {
        if (deadEntity.typeId !== EntityIds.rochatus)
            return;
        const players = this.getPlayersInArena(deadEntity, BOSS_RADIUS);
        saveSystem.markBossKilled(BossIds.rochatus);
        this.activeBosses.get(deadEntity.id)?.machine.transition("DEAD");
        this.activeBosses.delete(deadEntity.id);
        this.eventBus.publish("boss:killed", { bossId: BossIds.rochatus, players, location: deadEntity.location });
    }
    createFallbackAttack() {
        return {
            id: "fallback",
            onTick: (context) => context.finish()
        };
    }
    selectNextAttack(context) {
        const now = system.currentTick;
        const availableAttacks = this.attacks.filter((attack) => this.isAttackAvailable(context, attack, now));
        if (availableAttacks.length > 0) {
            const selected = availableAttacks[Math.floor(Math.random() * availableAttacks.length)];
            if (!selected)
                return this.createFallbackAttack();
            context.attackIndex = this.attacks.indexOf(selected);
            this.markAttackUsed(context, selected, now);
            return selected;
        }
        return this.createFallbackAttack();
    }
    isAttackAvailable(context, attack, currentTick) {
        return currentTick >= (context.attackAvailableTicks[attack.id] ?? 0);
    }
    markAttackUsed(context, attack, currentTick) {
        context.attackAvailableTicks[attack.id] = currentTick + this.getAttackIntervalTicks(attack);
    }
    getAttackIntervalTicks(attack) {
        if (attack.id === "roll")
            return ROLL_ATTACK_INTERVAL_TICKS;
        if (attack.id === "spikes")
            return SPIKE_ATTACK_INTERVAL_TICKS;
        if (attack.id === "quake")
            return QUAKE_ATTACK_INTERVAL_TICKS;
        return ATTACK_RECOVERY_TICKS;
    }
}
export const rochatusSystem = new RochatusSystem();
