import { world } from "@minecraft/server";
import { saveSystem } from "../save/SaveSystem.js";
import { getXpToNextLevel } from "../combat/progression.js";
const HUD_BAR_SEGMENTS = 8;
function formatResourceBar(current, max, segments = HUD_BAR_SEGMENTS) {
    const percent = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    const filled = Math.round(percent * segments);
    return `${"█".repeat(filled)}${"░".repeat(segments - filled)}`;
}
function formatPercent(current, max) {
    const percent = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    return `${Math.round(percent * 100)}%`;
}
class HudSystem {
    initialize({ tickManager }) {
        tickManager.every(20, () => this.updateHud());
    }
    updateHud() {
        for (const player of world.getAllPlayers()) {
            const stats = saveSystem.getPlayerStats(player);
            const xpNext = getXpToNextLevel(stats.level);
            const manaBar = formatResourceBar(stats.mana, stats.maxMana);
            const xpBar = formatResourceBar(stats.xp, xpNext);
            player.onScreenDisplay.setActionBar(`MP[${manaBar}]${formatPercent(stats.mana, stats.maxMana)} XP[${xpBar}]${formatPercent(stats.xp, xpNext)} LV${stats.level} AP${stats.attributePoints}`);
        }
    }
}
export const hudSystem = new HudSystem();
