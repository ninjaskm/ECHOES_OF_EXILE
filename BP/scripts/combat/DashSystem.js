import { system, world } from "@minecraft/server";
import { applyKnockbackSafe } from "../core/math.js";
import { saveSystem } from "../save/SaveSystem.js";
import { DASH_COOLDOWN_TICKS, resolveDash, resolveDashDirection, resolveDoubleJumpDashInput } from "./dashRules.js";
const DASH_POWER = 2.2;
const JUMP_POLL_INTERVAL_TICKS = 1;
const DASH_HUD_OBJECTIVE = "exile_dash";
class DashSystem {
    lastJumpTicks = new Map();
    lastDisplayedTickGap = new Map();
    previousJumpStates = new Map();
    diagnosticsShown = new Set();
    eventBus;
    initialize({ eventBus, tickManager }) {
        this.eventBus = eventBus;
        tickManager.every(20, () => this.showInputDiagnostics());
        tickManager.every(JUMP_POLL_INTERVAL_TICKS, () => this.pollJumpDashInput());
        tickManager.every(JUMP_POLL_INTERVAL_TICKS, () => this.updateDashCooldownHud());
    }
    showInputDiagnostics() {
        for (const player of world.getAllPlayers()) {
            if (this.diagnosticsShown.has(player.id))
                continue;
            this.diagnosticsShown.add(player.id);
            player.sendMessage("Double jump dash polling active.");
        }
    }
    pollJumpDashInput() {
        for (const player of world.getAllPlayers()) {
            const wasJumping = this.previousJumpStates.get(player.id) ?? false;
            const isJumping = player.isJumping;
            this.previousJumpStates.set(player.id, isJumping);
            if (!isJumping || wasJumping)
                continue;
            this.tryDoubleJumpDash(player);
        }
    }
    tryDoubleJumpDash(player) {
        const now = system.currentTick;
        const lastJumpTick = this.lastJumpTicks.get(player.id);
        const jumpInput = resolveDoubleJumpDashInput({ currentTick: now, lastJumpTick });
        if (jumpInput.shouldDash) {
            this.lastJumpTicks.delete(player.id);
            this.lastDisplayedTickGap.set(player.id, 0);
            this.tryDash(player);
            return;
        }
        if (jumpInput.displayedTickGap !== undefined) {
            this.updateDashHud(player, 0, jumpInput.displayedTickGap);
        }
        if (jumpInput.nextLastJumpTick === undefined) {
            this.lastJumpTicks.delete(player.id);
            return;
        }
        this.lastJumpTicks.set(player.id, jumpInput.nextLastJumpTick);
    }
    tryDash(player) {
        const stats = saveSystem.getPlayerStats(player);
        const now = system.currentTick;
        const result = resolveDash({
            mana: stats.mana,
            dashCooldownUntil: stats.dashCooldownUntil,
            currentTick: now
        });
        if (!result.ok && result.reason === "cooldown") {
            this.updateDashHud(player, Math.max(0, result.dashCooldownUntil - now));
            return false;
        }
        if (!result.ok && result.reason === "not_enough_mana") {
            player.playSound("note.bass");
            this.updateDashHud(player, 0);
            return false;
        }
        const direction = resolveDashDirection({
            viewDirection: player.getViewDirection(),
            movementVector: this.getMovementVector(player)
        });
        applyKnockbackSafe(player, direction.x, direction.z, DASH_POWER, 0.15);
        player.addEffect("resistance", 10, { amplifier: 4, showParticles: false });
        player.playSound("mob.endermen.portal");
        stats.mana = result.mana;
        stats.dashCooldownUntil = result.dashCooldownUntil;
        saveSystem.setPlayerStats(player, stats);
        this.eventBus.publish("player:statsChanged", { player, stats });
        this.updateDashHud(player, DASH_COOLDOWN_TICKS);
        return true;
    }
    getMovementVector(player) {
        try {
            return player.inputInfo?.getMovementVector() ?? { x: 0, y: 0 };
        }
        catch {
            return { x: 0, y: 0 };
        }
    }
    updateDashCooldownHud() {
        const now = system.currentTick;
        for (const player of world.getAllPlayers()) {
            const stats = saveSystem.getPlayerStats(player);
            const remainingCooldown = Math.max(0, stats.dashCooldownUntil - now);
            if (remainingCooldown > 0) {
                this.updateDashHud(player, remainingCooldown);
                continue;
            }
            this.updateDashHud(player, 0);
        }
    }
    updateDashHud(player, cooldownTicks, missedTickGap) {
        try {
            player.runCommand(`scoreboard objectives add ${DASH_HUD_OBJECTIVE} dummy "Dash"`);
        }
        catch {
            // Objective may already exist.
        }
        try {
            player.runCommand(`scoreboard objectives setdisplay sidebar ${DASH_HUD_OBJECTIVE}`);
            player.runCommand(`scoreboard players reset * ${DASH_HUD_OBJECTIVE}`);
            const tickScore = missedTickGap === undefined ? this.lastDisplayedTickGap.get(player.id) ?? 0 : missedTickGap;
            this.lastDisplayedTickGap.set(player.id, tickScore);
            const cooldownLabel = `Cooldown ${Math.floor(cooldownTicks)}`;
            const tickLabel = `Tick ${Math.floor(tickScore)}`;
            player.runCommand(`scoreboard players set "${cooldownLabel}" ${DASH_HUD_OBJECTIVE} 2`);
            player.runCommand(`scoreboard players set "${tickLabel}" ${DASH_HUD_OBJECTIVE} 1`);
        }
        catch {
            // Dash HUD is diagnostic UI and should never block the dash itself.
        }
    }
}
export const dashSystem = new DashSystem();
