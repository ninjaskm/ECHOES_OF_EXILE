import { applyKnockbackSafe, horizontalDistance, normalizeVector } from "../../core/math.js";
import type { BossAttack, BossAttackContext, BossAttackEffect } from "../base/BossAttack.js";

export interface RollAttackConfig {
  damage: number;
  contactRadius: number;
  activeTicks: number;
  totalTicks: number;
  stepDistance: number;
  carryStrength: number;
  verticalFollowRange: number;
  message: string;
  effect?: BossAttackEffect;
}

export class RollAttack implements BossAttack {
  readonly id = "roll";
  private readonly lockedDirections = new Map<string, { x: number; z: number }>();
  private readonly carriedPlayers = new Map<string, Set<string>>();

  constructor(private readonly config: RollAttackConfig) {}

  onEnter(context: BossAttackContext): void {
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
      context.boss.dimension.runCommand(
        `particle minecraft:large_explosion ${context.boss.location.x} ${context.boss.location.y + 1} ${context.boss.location.z}`
      );
    } catch {
      // Combat particles are visual-only.
    }
  }

  onTick(context: BossAttackContext): void {
    const dir = this.lockedDirections.get(context.boss.id);
    if (!dir) return context.finish();

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

  private moveBossForward(context: BossAttackContext, dir: { x: number; z: number }): void {
    const nextY = this.resolveVerticalStep(context);
    const nextLocation = {
      x: context.boss.location.x + dir.x * this.config.stepDistance,
      y: nextY,
      z: context.boss.location.z + dir.z * this.config.stepDistance
    };

    try {
      context.boss.runCommand(`tp @s ${nextLocation.x} ${nextLocation.y} ${nextLocation.z}`);
    } catch {
      // Roll movement is best-effort; damage and attack state should continue.
    }
  }

  private resolveVerticalStep(context: BossAttackContext): number {
    if (!context.target) return context.boss.location.y;

    const deltaY = context.target.location.y - context.boss.location.y;
    if (Math.abs(deltaY) <= this.config.verticalFollowRange) return context.target.location.y;
    return context.boss.location.y;
  }

  private carryHitPlayers(context: BossAttackContext, dir: { x: number; z: number }): void {
    const hitPlayers = this.carriedPlayers.get(context.boss.id) ?? new Set<string>();
    this.carriedPlayers.set(context.boss.id, hitPlayers);

    for (const player of context.playersInArena) {
      if (!player.isValid) continue;
      if (horizontalDistance(player.location, context.boss.location) <= this.config.contactRadius) {
        const alreadyHit = hitPlayers.has(player.id);
        applyKnockbackSafe(player, dir.x, dir.z, this.config.carryStrength, 0.05);
        if (!alreadyHit) {
          player.applyDamage(this.config.damage, { cause: "entityAttack", damagingEntity: context.boss });
          if (this.config.effect) player.addEffect(this.config.effect.type, this.config.effect.duration, this.config.effect.options ?? {});
          hitPlayers.add(player.id);
        }
      }
    }
  }
}
