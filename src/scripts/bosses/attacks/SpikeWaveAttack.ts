import { system } from "@minecraft/server";
import { horizontalDistance } from "../../core/math.js";
import type { BossAttack } from "../base/BossAttack.js";
import type { BossAttackContext, BossAttackEffect } from "../base/BossAttack.js";

export interface SpikeWaveAttackConfig {
  damage: number;
  spikesPerWave: number;
  spreadSize: number;
  waveIntervalTicks: number;
  waveUntilTick: number;
  impactDelayTicks: number;
  impactRadius: number;
  totalTicks: number;
  message: string;
  effect?: BossAttackEffect;
}

export class SpikeWaveAttack implements BossAttack {
  readonly id = "spikes";

  constructor(private readonly config: SpikeWaveAttackConfig) {}

  onEnter(context: BossAttackContext): void {
    context.arenaMessage(this.config.message);
  }

  onTick(context: BossAttackContext): void {
    if (!context.target) return;

    if (context.elapsedTicks % this.config.waveIntervalTicks === 0 && context.elapsedTicks <= this.config.waveUntilTick) {
      for (let spikeIndex = 0; spikeIndex < this.config.spikesPerWave; spikeIndex += 1) {
        const x = context.target.location.x + Math.floor(Math.random() * this.config.spreadSize) - this.config.spreadSize / 2;
        const y = context.target.location.y;
        const z = context.target.location.z + Math.floor(Math.random() * this.config.spreadSize) - this.config.spreadSize / 2;
        try {
          context.boss.dimension.runCommand(`particle minecraft:critical_hit_emitter ${x} ${y + 0.2} ${z}`);
        } catch {
          // Spike warning particles are visual-only.
        }
        system.runTimeout(() => {
          try {
            context.boss.dimension.runCommand(`particle minecraft:large_explosion ${x} ${y + 0.2} ${z}`);
          } catch {
            // Spike impact particles are visual-only.
          }
          for (const player of context.playersInArena) {
            if (horizontalDistance(player.location, { x, y, z }) <= this.config.impactRadius) {
              player.applyDamage(this.config.damage, { cause: "entityAttack", damagingEntity: context.boss });
              if (this.config.effect) player.addEffect(this.config.effect.type, this.config.effect.duration, this.config.effect.options ?? {});
            }
          }
        }, this.config.impactDelayTicks);
      }
    }

    if (context.elapsedTicks > this.config.totalTicks) context.finish();
  }
}
