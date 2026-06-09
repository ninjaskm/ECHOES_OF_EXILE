export const DASH_COST = 20;
export const DASH_COOLDOWN_TICKS = 40;

export type DashResult =
  | {
      ok: true;
      mana: number;
      dashCooldownUntil: number;
    }
  | {
      ok: false;
      reason: "cooldown" | "not_enough_mana";
      mana: number;
      dashCooldownUntil: number;
    };

export interface DashInput {
  mana: number;
  dashCooldownUntil: number;
  currentTick: number;
}

export function resolveDash({ mana, dashCooldownUntil, currentTick }: DashInput): DashResult {
  if (dashCooldownUntil > currentTick) {
    return {
      ok: false,
      reason: "cooldown",
      mana,
      dashCooldownUntil
    };
  }

  if (mana < DASH_COST) {
    return {
      ok: false,
      reason: "not_enough_mana",
      mana,
      dashCooldownUntil
    };
  }

  return {
    ok: true,
    mana: mana - DASH_COST,
    dashCooldownUntil: currentTick + DASH_COOLDOWN_TICKS
  };
}
