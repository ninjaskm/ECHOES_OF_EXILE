export const DASH_COST = 20;
export const DASH_COOLDOWN_TICKS = 40;
export const DOUBLE_JUMP_DASH_WINDOW_TICKS = 10;
export const DOUBLE_JUMP_DASH_MAX_DISPLAY_TICKS = 40;
export function resolveDash({ mana, dashCooldownUntil, currentTick }) {
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
export function resolveDoubleJumpDashInput({ currentTick, lastJumpTick }) {
    if (lastJumpTick === undefined) {
        return {
            shouldDash: false,
            nextLastJumpTick: currentTick,
            displayedTickGap: undefined
        };
    }
    const tickGap = currentTick - lastJumpTick;
    if (tickGap <= DOUBLE_JUMP_DASH_WINDOW_TICKS) {
        return {
            shouldDash: true,
            nextLastJumpTick: undefined,
            displayedTickGap: tickGap
        };
    }
    if (tickGap > DOUBLE_JUMP_DASH_MAX_DISPLAY_TICKS) {
        return {
            shouldDash: false,
            nextLastJumpTick: currentTick,
            displayedTickGap: undefined
        };
    }
    return {
        shouldDash: false,
        nextLastJumpTick: currentTick,
        displayedTickGap: tickGap
    };
}
