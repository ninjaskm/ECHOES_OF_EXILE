import { addXp } from "../combat/progression.js";
export const DEBUG_XP_AMOUNT = 80;
export function grantDebugXp(stats) {
    return addXp(stats, DEBUG_XP_AMOUNT);
}
