import { system } from "@minecraft/server";
import { horizontalDistance } from "../../core/math.js";
export class SpikeWaveAttack {
    config;
    id = "spikes";
    constructor(config) {
        this.config = config;
    }
    onEnter(context) {
        context.arenaMessage(this.config.message);
    }
    onTick(context) {
        if (!context.target)
            return;
        if (context.elapsedTicks % this.config.waveIntervalTicks === 0 && context.elapsedTicks <= this.config.waveUntilTick) {
            for (let spikeIndex = 0; spikeIndex < this.config.spikesPerWave; spikeIndex += 1) {
                const x = context.target.location.x + Math.floor(Math.random() * this.config.spreadSize) - this.config.spreadSize / 2;
                const y = context.target.location.y;
                const z = context.target.location.z + Math.floor(Math.random() * this.config.spreadSize) - this.config.spreadSize / 2;
                try {
                    context.boss.dimension.runCommand(`particle minecraft:critical_hit_emitter ${x} ${y + 0.2} ${z}`);
                }
                catch {
                    // Spike warning particles are visual-only.
                }
                this.animateFallingParticle(context, { x, y, z });
                system.runTimeout(() => {
                    this.resolveSpikeImpact(context, { x, y, z });
                }, this.config.impactDelayTicks);
            }
        }
        if (context.elapsedTicks > this.config.totalTicks)
            context.finish();
    }
    animateFallingParticle(context, location) {
        if (!this.config.fallParticleId)
            return;
        const fallHeight = this.config.fallHeight ?? 6;
        const fallStepTicks = this.config.fallStepTicks ?? 3;
        for (let step = 0; step <= fallHeight; step += 1) {
            system.runTimeout(() => {
                try {
                    context.boss.dimension.spawnParticle(this.config.fallParticleId, {
                        x: location.x,
                        y: location.y + fallHeight - step,
                        z: location.z
                    });
                }
                catch {
                    // Falling spike particles are visual-only.
                }
            }, step * fallStepTicks);
        }
    }
    resolveSpikeImpact(context, location) {
        const { x, y, z } = location;
        if (this.config.impactParticleId) {
            try {
                context.boss.dimension.spawnParticle(this.config.impactParticleId, { x, y: y + 0.2, z });
            }
            catch {
                // Spike impact particles are visual-only.
            }
        }
        for (const player of context.playersInArena) {
            if (horizontalDistance(player.location, { x, y, z }) <= this.config.impactRadius) {
                player.applyDamage(this.config.damage, { cause: "entityAttack", damagingEntity: context.boss });
                if (this.config.effect)
                    player.addEffect(this.config.effect.type, this.config.effect.duration, this.config.effect.options ?? {});
            }
        }
    }
}
