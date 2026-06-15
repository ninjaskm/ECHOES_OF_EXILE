import { applyKnockbackSafe, horizontalDistance, normalizeVector } from "../../core/math.js";
export class RollAttack {
    config;
    id = "roll";
    lockedDirections = new Map();
    carriedPlayers = new Map();
    constructor(config) {
        this.config = config;
    }
    onEnter(context) {
        if (context.target) {
            const dir = normalizeVector({
                x: context.target.location.x - context.boss.location.x,
                y: 0,
                z: context.target.location.z - context.boss.location.z
            });
            this.lockedDirections.set(context.boss.id, { x: dir.x, z: dir.z });
        }
        this.carriedPlayers.set(context.boss.id, new Set());
        context.arenaMessage(this.config.message);
        try {
            context.boss.dimension.runCommand(`particle minecraft:large_explosion ${context.boss.location.x} ${context.boss.location.y + 1} ${context.boss.location.z}`);
        }
        catch {
            // Combat particles are visual-only.
        }
    }
    onTick(context) {
        const dir = this.lockedDirections.get(context.boss.id);
        if (!dir)
            return context.finish();
        if (context.elapsedTicks <= this.config.activeTicks) {
            this.moveBossForward(context, dir);
            this.carryHitPlayers(context, dir);
        }
        if (context.elapsedTicks > this.config.totalTicks) {
            this.lockedDirections.delete(context.boss.id);
            this.carriedPlayers.delete(context.boss.id);
            context.finish();
        }
    }
    moveBossForward(context, dir) {
        const nextY = this.resolveVerticalStep(context);
        const nextLocation = {
            x: context.boss.location.x + dir.x * this.config.stepDistance,
            y: nextY,
            z: context.boss.location.z + dir.z * this.config.stepDistance
        };
        try {
            context.boss.runCommand(`tp @s ${nextLocation.x} ${nextLocation.y} ${nextLocation.z}`);
        }
        catch {
            // Roll movement is best-effort; damage and attack state should continue.
        }
    }
    resolveVerticalStep(context) {
        if (!context.target)
            return context.boss.location.y;
        const deltaY = context.target.location.y - context.boss.location.y;
        if (Math.abs(deltaY) <= this.config.verticalFollowRange)
            return context.target.location.y;
        return context.boss.location.y;
    }
    carryHitPlayers(context, dir) {
        const hitPlayers = this.carriedPlayers.get(context.boss.id) ?? new Set();
        this.carriedPlayers.set(context.boss.id, hitPlayers);
        for (const player of context.playersInArena) {
            if (!player.isValid)
                continue;
            if (horizontalDistance(player.location, context.boss.location) <= this.config.contactRadius) {
                const alreadyHit = hitPlayers.has(player.id);
                applyKnockbackSafe(player, dir.x, dir.z, this.config.carryStrength, 0.05);
                if (!alreadyHit) {
                    player.applyDamage(this.config.damage, { cause: "entityAttack", damagingEntity: context.boss });
                    if (this.config.effect)
                        player.addEffect(this.config.effect.type, this.config.effect.duration, this.config.effect.options ?? {});
                    hitPlayers.add(player.id);
                }
            }
        }
    }
}
