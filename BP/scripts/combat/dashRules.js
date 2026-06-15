export const DASH_COST = 35;
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
export function resolveDashDirection({ viewDirection, movementVector }) {
    const forward = normalizeHorizontal({ x: viewDirection.x, z: viewDirection.z });
    const movement = movementVector ?? { x: 0, y: 0 };
    const right = { x: forward.z, z: -forward.x };
    const directional = {
        x: forward.x * movement.y + right.x * movement.x,
        z: forward.z * movement.y + right.z * movement.x
    };
    const normalizedDirectional = normalizeHorizontal(directional);
    if (normalizedDirectional.x === 0 && normalizedDirectional.z === 0)
        return forward;
    return normalizedDirectional;
}
function normalizeHorizontal(vector) {
    const length = Math.sqrt(vector.x * vector.x + vector.z * vector.z);
    if (length <= 0.0001)
        return { x: 0, z: 1 };
    return {
        x: zeroTiny(vector.x / length),
        z: zeroTiny(vector.z / length)
    };
}
function zeroTiny(value) {
    return Math.abs(value) <= 0.0001 ? 0 : value;
}
