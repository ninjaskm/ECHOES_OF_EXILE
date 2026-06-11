import { system } from "@minecraft/server";
import { eventBus } from "./core/EventBus.js";
import { tickManager } from "./core/TickManager.js";
import { saveSystem } from "./save/SaveSystem.js";
import { playerStatsSystem } from "./combat/PlayerStatsSystem.js";
import { dashSystem } from "./combat/DashSystem.js";
import { portalSystem } from "./portals/PortalSystem.js";
import { rochatusSystem } from "./bosses/rochatus/RochatusSystem.js";
import { hudSystem } from "./ui/HudSystem.js";
import { devCommandSystem } from "./ui/DevCommandSystem.js";
const systems = [
    saveSystem,
    playerStatsSystem,
    dashSystem,
    portalSystem,
    rochatusSystem,
    hudSystem,
    devCommandSystem
];
let initialized = false;
function initializeMvpSystems() {
    if (initialized) {
        return;
    }
    initialized = true;
    saveSystem.registerWorldProperties();
    for (const system of systems) {
        system.initialize?.({ eventBus, tickManager });
    }
    tickManager.start();
    console.warn("[Echoes of Exile] MVP systems initialized.");
}
system.run(() => {
    initializeMvpSystems();
});
