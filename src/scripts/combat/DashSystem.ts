import { system, world } from "@minecraft/server";
import type { Player } from "@minecraft/server";
import { applyKnockbackSafe, normalizeVector } from "../core/math.js";
import { saveSystem } from "../save/SaveSystem.js";
import { resolveDash } from "./dashRules.js";
import type { SystemContext } from "../types.js";

const DASH_POWER = 2.2;
const DOUBLE_JUMP_DASH_WINDOW_TICKS = 10;
const JUMP_POLL_INTERVAL_TICKS = 2;

class DashSystem {
  private readonly lastJumpTicks = new Map<string, number>();
  private readonly previousJumpStates = new Map<string, boolean>();
  private readonly diagnosticsShown = new Set<string>();
  private eventBus!: SystemContext["eventBus"];

  initialize({ eventBus, tickManager }: SystemContext): void {
    this.eventBus = eventBus;

    world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
      if (source.typeId !== "minecraft:player") return;
      if (itemStack.typeId !== "minecraft:feather") return;
      this.tryDash(source as Player);
    });

    tickManager.every(20, () => this.showInputDiagnostics());
    tickManager.every(JUMP_POLL_INTERVAL_TICKS, () => this.pollJumpDashInput());
  }

  showInputDiagnostics(): void {
    for (const player of world.getAllPlayers()) {
      if (this.diagnosticsShown.has(player.id)) continue;
      this.diagnosticsShown.add(player.id);
      player.sendMessage("Double jump dash polling active.");
    }
  }

  pollJumpDashInput(): void {
    for (const player of world.getAllPlayers()) {
      const wasJumping = this.previousJumpStates.get(player.id) ?? false;
      const isJumping = player.isJumping;
      this.previousJumpStates.set(player.id, isJumping);
      if (!isJumping || wasJumping) continue;
      this.tryDoubleJumpDash(player);
    }
  }

  tryDoubleJumpDash(player: Player): void {
    const now = system.currentTick;
    const lastJumpTick = this.lastJumpTicks.get(player.id);
    player.onScreenDisplay.setActionBar(
      lastJumpTick === undefined ? "Jump input received" : `Jump input received: ${now - lastJumpTick} ticks`
    );

    if (lastJumpTick !== undefined && now - lastJumpTick <= DOUBLE_JUMP_DASH_WINDOW_TICKS) {
      this.lastJumpTicks.delete(player.id);
      this.tryDash(player);
      return;
    }

    this.lastJumpTicks.set(player.id, now);
  }

  tryDash(player: Player): boolean {
    const stats = saveSystem.getPlayerStats(player);
    const now = system.currentTick;
    const result = resolveDash({
      mana: stats.mana,
      dashCooldownUntil: stats.dashCooldownUntil,
      currentTick: now
    });

    if (!result.ok && result.reason === "cooldown") {
      player.onScreenDisplay.setActionBar("Dash cooling down");
      return false;
    }

    if (!result.ok && result.reason === "not_enough_mana") {
      player.playSound("note.bass");
      player.onScreenDisplay.setActionBar("Not enough mana");
      return false;
    }

    const view = normalizeVector(player.getViewDirection());
    applyKnockbackSafe(player, view.x, view.z, DASH_POWER, 0.15);
    player.addEffect("resistance", 10, { amplifier: 4, showParticles: false });
    player.playSound("mob.endermen.portal");

    stats.mana = result.mana;
    stats.dashCooldownUntil = result.dashCooldownUntil;
    saveSystem.setPlayerStats(player, stats);
    this.eventBus.publish("player:statsChanged", { player, stats });
    return true;
  }
}

export const dashSystem = new DashSystem();
