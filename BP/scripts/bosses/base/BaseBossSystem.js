import { world } from "@minecraft/server";
import { distance, horizontalDistance } from "../../core/math.js";
const LOW_HEALTH_TARGET_PERCENT = 0.3;
export class BaseBossSystem {
    displayName;
    arenaRadius;
    activeBosses = new Map();
    constructor(displayName, arenaRadius) {
        this.displayName = displayName;
        this.arenaRadius = arenaRadius;
    }
    getPlayersInArena(entity, radius = this.arenaRadius) {
        return world
            .getAllPlayers()
            .filter((player) => player.dimension.id === entity.dimension.id)
            .filter((player) => distance(player.location, entity.location) <= radius);
    }
    nearestPlayer(entity, players = this.getPlayersInArena(entity)) {
        players.sort((a, b) => distance(a.location, entity.location) - distance(b.location, entity.location));
        return players[0];
    }
    selectBossTarget(entity, currentTarget, players = this.getPlayersInArena(entity)) {
        if (currentTarget?.isValid &&
            players.some((player) => player.id === currentTarget.id) &&
            this.isPlayerAtOrBelowHealthPercent(currentTarget, LOW_HEALTH_TARGET_PERCENT)) {
            return currentTarget;
        }
        return this.nearestPlayer(entity, players);
    }
    arenaMessage(entity, message) {
        for (const player of this.getPlayersInArena(entity)) {
            player.onScreenDisplay.setTitle(message);
        }
    }
    damagePlayersNear(entity, players, radius, amount, effect) {
        for (const player of players) {
            if (horizontalDistance(player.location, entity.location) > radius)
                continue;
            player.applyDamage(amount, { cause: "entityAttack", damagingEntity: entity });
            if (effect)
                player.addEffect(effect.type, effect.duration, effect.options ?? {});
        }
    }
    updateArenaPlayers() {
        for (const entry of this.activeBosses.values()) {
            entry.machine.context.playersInArena = this.getPlayersInArena(entry.boss);
            entry.machine.context.target = this.selectBossTarget(entry.boss, entry.machine.context.target, entry.machine.context.playersInArena);
        }
    }
    updateBossNameTag(entity) {
        const health = entity.getComponent("minecraft:health");
        if (health)
            entity.nameTag = `${this.displayName} [${Math.max(0, Math.floor(health.currentValue))} HP]`;
    }
    createAttackContext(context, elapsedTicks, finish) {
        return {
            boss: context.boss,
            target: context.target,
            playersInArena: context.playersInArena,
            elapsedTicks,
            arenaMessage: (message) => this.arenaMessage(context.boss, message),
            damagePlayersNear: (radius, amount, effect) => this.damagePlayersNear(context.boss, context.playersInArena, radius, amount, effect),
            finish
        };
    }
    isPlayerAtOrBelowHealthPercent(player, percent) {
        const health = player.getComponent("minecraft:health");
        if (!health)
            return false;
        return health.currentValue <= health.effectiveMax * percent;
    }
}
