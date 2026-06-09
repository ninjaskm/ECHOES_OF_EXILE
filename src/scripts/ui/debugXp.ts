import { addXp } from "../combat/progression.js";
import type { PlayerStats } from "../types.js";

export const DEBUG_XP_AMOUNT = 80;

export function grantDebugXp(stats: PlayerStats): PlayerStats {
  return addXp(stats, DEBUG_XP_AMOUNT);
}
