import { world } from "@minecraft/server";
import { DynamicProperties } from "../core/constants.js";
import { createDefaultPlayerStats, getMaxMana } from "../combat/progression.js";
function createDefaultBossProgress() {
    return {
        killed: []
    };
}
function createDefaultPlayerGear() {
    return {
        accessories: [],
        activeEnchant: null
    };
}
function readJsonProperty(holder, key, fallbackFactory) {
    const raw = holder.getDynamicProperty(key);
    if (typeof raw !== "string" || raw.length === 0)
        return fallbackFactory();
    try {
        return { ...fallbackFactory(), ...JSON.parse(raw) };
    }
    catch {
        return fallbackFactory();
    }
}
function writeJsonProperty(holder, key, value) {
    holder.setDynamicProperty(key, JSON.stringify(value));
}
class SaveSystem {
    dirtyPlayers = new Set();
    registerWorldProperties() {
        // Dynamic properties are available directly through world/player in the supported runtime.
    }
    initialize({ tickManager }) {
        tickManager.every(100, () => this.flushDirtyPlayers());
    }
    getPlayerStats(player) {
        const stats = readJsonProperty(player, DynamicProperties.playerStats, createDefaultPlayerStats);
        const maxMana = getMaxMana(stats.level);
        return {
            ...stats,
            maxMana,
            mana: Math.min(stats.mana ?? maxMana, maxMana)
        };
    }
    setPlayerStats(player, stats) {
        writeJsonProperty(player, DynamicProperties.playerStats, stats);
    }
    markPlayerDirty(player) {
        this.dirtyPlayers.add(player.id);
    }
    flushPlayer(player) {
        const stats = this.getPlayerStats(player);
        this.setPlayerStats(player, stats);
        this.dirtyPlayers.delete(player.id);
    }
    flushDirtyPlayers() {
        for (const player of world.getAllPlayers()) {
            if (this.dirtyPlayers.has(player.id))
                this.flushPlayer(player);
        }
    }
    getBossProgress() {
        return readJsonProperty(world, DynamicProperties.bossProgress, createDefaultBossProgress);
    }
    setBossProgress(progress) {
        writeJsonProperty(world, DynamicProperties.bossProgress, progress);
    }
    isBossKilled(bossId) {
        return this.getBossProgress().killed.includes(bossId);
    }
    markBossKilled(bossId) {
        const progress = this.getBossProgress();
        if (!progress.killed.includes(bossId)) {
            progress.killed.push(bossId);
            this.setBossProgress(progress);
        }
    }
    getPlayerGear(player) {
        return readJsonProperty(player, DynamicProperties.playerGear, createDefaultPlayerGear);
    }
    resetPlayer(player) {
        player.setDynamicProperty(DynamicProperties.playerStats, undefined);
        player.setDynamicProperty(DynamicProperties.playerGear, undefined);
        this.dirtyPlayers.delete(player.id);
    }
    resetBossProgress() {
        world.setDynamicProperty(DynamicProperties.bossProgress, undefined);
    }
}
export const saveSystem = new SaveSystem();
