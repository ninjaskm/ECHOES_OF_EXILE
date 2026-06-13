import { system } from "@minecraft/server";
import { saveSystem } from "../save/SaveSystem.js";
import { BossIds } from "../core/constants.js";
import { DEBUG_XP_AMOUNT, grantDebugXp } from "./debugXp.js";
import { formatExileReport } from "./report.js";
import { PACK_VERSION } from "./packVersion.js";
const ATTRIBUTE_LABELS = {
    vit: "Vitality",
    str: "Strength"
};
class DevCommandSystem {
    initialize() {
        system.afterEvents.scriptEventReceive.subscribe((event) => {
            const player = event.sourceEntity;
            if (!player || player.typeId !== "minecraft:player")
                return;
            const sourcePlayer = player;
            switch (event.id) {
                case "exile:help":
                    this.showHelp(sourcePlayer);
                    break;
                case "exile:stats":
                    this.showStats(sourcePlayer);
                    break;
                case "exile:report":
                    this.showReport(sourcePlayer);
                    break;
                case "exile:add_vit":
                    this.investAttribute(sourcePlayer, "vit");
                    break;
                case "exile:add_str":
                    this.investAttribute(sourcePlayer, "str");
                    break;
                case "exile:add_xp":
                    this.addDebugXp(sourcePlayer);
                    break;
                case "exile:reset_player":
                    saveSystem.resetPlayer(sourcePlayer);
                    sourcePlayer.sendMessage("Player MVP save reset.");
                    break;
                case "exile:reset_bosses":
                    saveSystem.resetBossProgress();
                    sourcePlayer.sendMessage("World boss progress reset.");
                    break;
                case "exile:complete_rochatus":
                    saveSystem.markBossKilled(BossIds.rochatus);
                    sourcePlayer.sendMessage("Rochatus marked as defeated.");
                    break;
            }
        });
    }
    showHelp(player) {
        player.sendMessage("Echoes of Exile MVP commands:");
        player.sendMessage("/function exile_mvp_start - spawn portal and get shard");
        player.sendMessage("/function exile_stats - show stats");
        player.sendMessage("/function exile_report - copy-friendly test report");
        player.sendMessage("/function exile_add_vit - spend 1 point in Vitality");
        player.sendMessage("/function exile_add_str - spend 1 point in Strength");
        player.sendMessage("/function exile_add_xp - grant debug XP");
        player.sendMessage("/function exile_spawn_rochatus - spawn boss directly");
        player.sendMessage("/function exile_reset_mvp - reset MVP player/world progress");
    }
    showStats(player) {
        const stats = saveSystem.getPlayerStats(player);
        const killed = saveSystem.getBossProgress().killed.join(", ") || "none";
        player.sendMessage(`Level ${stats.level} | XP ${stats.xp} | AP ${stats.attributePoints}`);
        player.sendMessage(`Mana ${Math.floor(stats.mana)}/${stats.maxMana}`);
        player.sendMessage(`Vitality ${stats.attributes.vit}/30 | Strength ${stats.attributes.str}/30`);
        player.sendMessage(`Bosses defeated: ${killed}`);
    }
    showReport(player) {
        const stats = saveSystem.getPlayerStats(player);
        const progress = saveSystem.getBossProgress();
        const lines = formatExileReport({
            packVersion: PACK_VERSION,
            playerName: player.nameTag || player.id,
            stats,
            bossesKilled: progress.killed
        });
        for (const line of lines) {
            player.sendMessage(line);
        }
    }
    addDebugXp(player) {
        const before = saveSystem.getPlayerStats(player);
        const after = grantDebugXp(before);
        saveSystem.setPlayerStats(player, after);
        player.sendMessage(`Debug XP +${DEBUG_XP_AMOUNT}: level ${after.level}/20 | XP ${after.xp} | AP ${after.attributePoints}`);
    }
    investAttribute(player, attribute) {
        const stats = saveSystem.getPlayerStats(player);
        const cap = attribute === "vit" || attribute === "str" ? 30 : 25;
        if (stats.attributePoints <= 0) {
            player.sendMessage("No attribute points available.");
            return;
        }
        if (stats.attributes[attribute] >= cap) {
            player.sendMessage(`${ATTRIBUTE_LABELS[attribute]} is already capped.`);
            return;
        }
        stats.attributes[attribute] += 1;
        stats.attributePoints -= 1;
        saveSystem.setPlayerStats(player, stats);
        player.playSound("random.orb");
        player.sendMessage(`${ATTRIBUTE_LABELS[attribute]} increased to ${stats.attributes[attribute]}/${cap}.`);
    }
}
export const devCommandSystem = new DevCommandSystem();
