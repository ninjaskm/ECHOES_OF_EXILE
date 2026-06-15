import { system } from "@minecraft/server";
import { horizontalDistance } from "../../core/math.js";
import type { BossAttack } from "../base/BossAttack.js";
import type { BossAttackContext, BossAttackEffect } from "../base/BossAttack.js";

export interface SpikeWaveAttackConfig {
  damage: number;
  spikesPerWave: number;
  spreadSize: number;
  targetLockRange: number;
  waveIntervalTicks: number;
  waveUntilTick: number;
  impactDelayTicks: number;
  impactRadius: number;
  totalTicks: number;
  message: string;
  fallParticleId?: string;
  impactParticleId?: string;
  fallHeight?: number;
  fallStepTicks?: number;
  effect?: BossAttackEffect;
}

export class SpikeWaveAttack implements BossAttack {
  readonly id = "spikes";
  private readonly lockedTargetLocations = new Map<string, { x: number; y: number; z: number }>();

  constructor(private readonly config: SpikeWaveAttackConfig) {}

  onEnter(context: BossAttackContext): void {
    this.lockedTargetLocations.delete(context.boss.id);
    context.arenaMessage(this.config.message);
  }

  onTick(context: BossAttackContext): void {
    if (context.elapsedTicks > this.config.totalTicks) {
      this.lockedTargetLocations.delete(context.boss.id);
      context.finish();
      return;
    }

    if (context.elapsedTicks % this.config.waveIntervalTicks === 0 && context.elapsedTicks <= this.config.waveUntilTick) {
      const targetLocation = this.resolveTargetLocation(context);
      if (!targetLocation) return;

      for (let spikeIndex = 0; spikeIndex < this.config.spikesPerWave; spikeIndex += 1) {
        const x = targetLocation.x + Math.floor(Math.random() * this.config.spreadSize) - this.config.spreadSize / 2;
        const y = targetLocation.y;
        const z = targetLocation.z + Math.floor(Math.random() * this.config.spreadSize) - this.config.spreadSize / 2;
        this.spawnWarningParticles(context, { x, y, z });
        this.animateFallingParticle(context, { x, y, z });
        system.runTimeout(() => {
          this.resolveSpikeImpact(context, { x, y, z });
        }, this.config.impactDelayTicks);
      }
    }
  }

  private resolveTargetLocation(context: BossAttackContext): { x: number; y: number; z: number } | undefined {
    if (
      context.target &&
      horizontalDistance(context.target.location, context.boss.location) <= this.config.targetLockRange
    ) {
      this.lockedTargetLocations.set(context.boss.id, {
        x: context.target.location.x,
        y: context.target.location.y,
        z: context.target.location.z
      });
    }

    return this.lockedTargetLocations.get(context.boss.id);
  }

  private spawnWarningParticles(context: BossAttackContext, location: { x: number; y: number; z: number }): void {
    const warningOffsets = [
      { x: 0, z: 0 },
      { x: 0.35, z: 0 },
      { x: -0.35, z: 0 },
      { x: 0, z: 0.35 },
      { x: 0, z: -0.35 }
    ];

    for (const offset of warningOffsets) {
      try {
        context.boss.dimension.runCommand(
          `particle minecraft:critical_hit_emitter ${location.x + offset.x} ${location.y + 0.12} ${location.z + offset.z}`
        );
      } catch {
        // Spike warning particles are visual-only.
      }
    }
  }

  private animateFallingParticle(context: BossAttackContext, location: { x: number; y: number; z: number }): void {
    if (!this.config.fallParticleId) return;

    const fallHeight = this.config.fallHeight ?? 6;
    const fallStepTicks = this.config.fallStepTicks ?? 3;

    for (let step = 0; step <= fallHeight; step += 1) {
      system.runTimeout(() => {
        try {
          context.boss.dimension.spawnParticle(this.config.fallParticleId!, {
            x: location.x,
            y: location.y + fallHeight - step,
            z: location.z
          });
        } catch {
          // Falling spike particles are visual-only.
        }
      }, step * fallStepTicks);
    }
  }

  private resolveSpikeImpact(context: BossAttackContext, location: { x: number; y: number; z: number }): void {
    const { x, y, z } = location;
    if (this.config.impactParticleId) {
      try {
        context.boss.dimension.spawnParticle(this.config.impactParticleId, { x, y: y + 0.2, z });
      } catch {
        // Spike impact particles are visual-only.
      }
    }
    for (const player of context.playersInArena) {
      if (horizontalDistance(player.location, { x, y, z }) <= this.config.impactRadius) {
        player.applyDamage(this.config.damage, { cause: "entityAttack", damagingEntity: context.boss });
        if (this.config.effect) player.addEffect(this.config.effect.type, this.config.effect.duration, this.config.effect.options ?? {});
      }
    }
  }
}
