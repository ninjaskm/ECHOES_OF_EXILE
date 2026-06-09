export function formatExileReport({ packVersion, playerName, stats, bossesKilled }) {
    const bosses = bossesKilled.length > 0 ? bossesKilled.join(",") : "none";
    return [
        `[ECHOES REPORT ${packVersion}]`,
        `player=${playerName} level=${stats.level}/20 xp=${stats.xp} ap=${stats.attributePoints}`,
        `mana=${Math.floor(stats.mana)}/${stats.maxMana} vit=${stats.attributes.vit} str=${stats.attributes.str} spd=${stats.attributes.spd} dex=${stats.attributes.dex} regen=${stats.attributes.manaRegen}`,
        `bosses=${bosses}`
    ];
}
