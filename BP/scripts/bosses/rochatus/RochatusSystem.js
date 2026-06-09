import { system, world } from "@minecraft/server";
import { BossIds, EntityIds } from "../../core/constants.js";
import { StateMachine } from "../../core/FSM.js";
import { applyKnockbackSafe, distance, horizontalDistance, normalizeVector } from "../../core/math.js";
import { saveSystem } from "../../save/SaveSystem.js";
const BOSS_RADIUS = 40;
const BASE_HEALTH = 240;
const DAMAGE = {
    roll: 10,
    spikes: 7,
    quake: 12
};
function getPlayersInArena(entity, radius = BOSS_RADIUS) {
    return world
        .getAllPlayers()
        .filter((player) => player.dimension.id === entity.dimension.id)
        .filter((player) => distance(player.location, entity.location) <= radius);
}
function nearestPlayer(entity, players = getPlayersInArena(entity)) {
    players.sort((a, b) => distance(a.location, entity.location) - distance(b.location, entity.location));
    return players[0];
}
function damagePlayersNear(entity, radius, amount, effect) {
    for (const player of getPlayersInArena(entity, radius)) {
        if (horizontalDistance(player.location, entity.location) > radius)
            continue;
        player.applyDamage(amount, { cause: "entityAttack", damagingEntity: entity });
        if (effect)
            player.addEffect(effect.type, effect.duration, effect.options ?? {});
    }
}
function arenaMessage(entity, message) {
    for (const player of getPlayersInArena(entity)) {
        player.onScreenDisplay.setTitle(message);
    }
}
class RochatusSystem {
    activeBosses = new Map();
    eventBus;
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
        const boss = portal.dimension.spawnEntity(EntityIds.rochatus, {
            x: portal.location.x,
            y: portal.location.y + 1,
            z: portal.location.z
        });
        const playerCount = Math.max(1, getPlayersInArena(boss).length);
        const scaledHealth = Math.floor(BASE_HEALTH * (1 + playerCount * 0.25));
        boss.nameTag = `Rochatus [${scaledHealth} HP]`;
        boss.getComponent("minecraft:health")?.setCurrentValue(scaledHealth);
        const context = {
            boss,
            target: undefined,
            attackIndex: 0,
            attack: "roll",
            playersInArena: getPlayersInArena(boss)
        };
        const machine = new StateMachine({
            initialState: "IDLE",
            context,
            states: this.createStates()
        });
        this.activeBosses.set(boss.id, { boss, machine });
        arenaMessage(boss, "Rochatus");
        boss.dimension.runCommandAsync(`playsound mob.wither.spawn @a ${boss.location.x} ${boss.location.y} ${boss.location.z}`).catch(() => { });
    }
    createStates() {
        return {
            IDLE: {
                onTick: (ctx, fsm) => {
                    ctx.target = nearestPlayer(ctx.boss, ctx.playersInArena);
                    if (ctx.target)
                        fsm.transition("COMBAT");
                }
            },
            COMBAT: {
                onEnter: (ctx, fsm) => {
                    const attacks = ["roll", "spikes", "quake"];
                    ctx.attackIndex = (ctx.attackIndex + 1) % attacks.length;
                    ctx.attack = attacks[ctx.attackIndex] ?? "roll";
                    ctx.target = nearestPlayer(ctx.boss, ctx.playersInArena);
                },
                onTick: (ctx, fsm) => {
                    if (!ctx.target || !ctx.target.isValid())
                        return fsm.transition("IDLE");
                    if (ctx.attack === "roll")
                        this.updateRoll(ctx, fsm);
                    if (ctx.attack === "spikes")
                        this.updateSpikes(ctx, fsm);
                    if (ctx.attack === "quake")
                        this.updateQuake(ctx, fsm);
                }
            },
            STAGGER: {
                onEnter: (ctx) => {
                    arenaMessage(ctx.boss, "Rochatus staggers");
                },
                onTick: (_ctx, fsm) => {
                    if (fsm.elapsedTicks > 20)
                        fsm.transition("COMBAT");
                }
            },
            DEAD: {
                onEnter: (ctx) => {
                    arenaMessage(ctx.boss, "Rochatus defeated");
                }
            }
        };
    }
    updateRoll(ctx, fsm) {
        if (fsm.elapsedTicks === 1) {
            arenaMessage(ctx.boss, "Rochatus rolls");
            ctx.boss.dimension.runCommandAsync(`particle minecraft:large_explosion ${ctx.boss.location.x} ${ctx.boss.location.y + 1} ${ctx.boss.location.z}`).catch(() => { });
        }
        if (!ctx.target)
            return;
        const dir = normalizeVector({
            x: ctx.target.location.x - ctx.boss.location.x,
            y: 0,
            z: ctx.target.location.z - ctx.boss.location.z
        });
        if (fsm.elapsedTicks <= 24) {
            applyKnockbackSafe(ctx.boss, dir.x, dir.z, 0.55, 0);
            damagePlayersNear(ctx.boss, 2.4, DAMAGE.roll, { type: "slowness", duration: 60, options: { amplifier: 0 } });
        }
        if (fsm.elapsedTicks > 68)
            fsm.transition("COMBAT");
    }
    updateSpikes(ctx, fsm) {
        if (fsm.elapsedTicks === 1)
            arenaMessage(ctx.boss, "Spikes falling");
        if (!ctx.target)
            return;
        if (fsm.elapsedTicks % 10 === 0 && fsm.elapsedTicks <= 70) {
            const x = ctx.target.location.x + Math.floor(Math.random() * 7) - 3;
            const y = ctx.target.location.y;
            const z = ctx.target.location.z + Math.floor(Math.random() * 7) - 3;
            ctx.boss.dimension.runCommandAsync(`particle minecraft:critical_hit_emitter ${x} ${y + 0.2} ${z}`).catch(() => { });
            system.runTimeout(() => {
                ctx.boss.dimension.runCommandAsync(`particle minecraft:large_explosion ${x} ${y + 0.2} ${z}`).catch(() => { });
                for (const player of ctx.playersInArena) {
                    if (horizontalDistance(player.location, { x, y, z }) <= 2) {
                        player.applyDamage(DAMAGE.spikes, { cause: "projectile", damagingEntity: ctx.boss });
                        player.addEffect("slowness", 60, { amplifier: 0 });
                    }
                }
            }, 18);
        }
        if (fsm.elapsedTicks > 120)
            fsm.transition("COMBAT");
    }
    updateQuake(ctx, fsm) {
        if (fsm.elapsedTicks === 1) {
            arenaMessage(ctx.boss, "Earthquake");
            ctx.boss.dimension.runCommandAsync(`playsound random.explode @a ${ctx.boss.location.x} ${ctx.boss.location.y} ${ctx.boss.location.z}`).catch(() => { });
        }
        if (fsm.elapsedTicks === 20) {
            ctx.boss.dimension.runCommandAsync(`particle minecraft:huge_explosion_emitter ${ctx.boss.location.x} ${ctx.boss.location.y} ${ctx.boss.location.z}`).catch(() => { });
            damagePlayersNear(ctx.boss, 7, DAMAGE.quake, { type: "slowness", duration: 80, options: { amplifier: 1 } });
        }
        if (fsm.elapsedTicks > 75)
            fsm.transition("COMBAT");
    }
    refreshArenaPlayers() {
        for (const entry of this.activeBosses.values()) {
            entry.machine.context.playersInArena = getPlayersInArena(entry.boss);
            entry.machine.context.target = nearestPlayer(entry.boss, entry.machine.context.playersInArena);
        }
    }
    updateBosses() {
        for (const [id, entry] of this.activeBosses) {
            if (!entry.boss.isValid()) {
                this.activeBosses.delete(id);
                continue;
            }
            entry.machine.update();
            const health = entry.boss.getComponent("minecraft:health");
            if (health)
                entry.boss.nameTag = `Rochatus [${Math.max(0, Math.floor(health.currentValue))} HP]`;
        }
    }
    handleEntityDie({ deadEntity }) {
        if (deadEntity.typeId !== EntityIds.rochatus)
            return;
        const players = getPlayersInArena(deadEntity, 80);
        saveSystem.markBossKilled(BossIds.rochatus);
        this.activeBosses.get(deadEntity.id)?.machine.transition("DEAD");
        this.activeBosses.delete(deadEntity.id);
        this.eventBus.publish("boss:killed", { bossId: BossIds.rochatus, players });
    }
}
export const rochatusSystem = new RochatusSystem();
