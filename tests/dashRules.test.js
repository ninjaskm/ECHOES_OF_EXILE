import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DASH_COST,
  DASH_COOLDOWN_TICKS,
  DOUBLE_JUMP_DASH_MAX_DISPLAY_TICKS,
  DOUBLE_JUMP_DASH_WINDOW_TICKS,
  resolveDash,
  resolveDashDirection,
  resolveDoubleJumpDashInput
} from "../BP/scripts/combat/dashRules.js";

describe("Dash rules", () => {
  it("caps the MVP dash mana cost at thirty-five when the previous tuning is higher", () => {
    assert.equal(DASH_COST, 35);
  });

  it("fails when the player does not have enough mana", () => {
    const result = resolveDash({
      mana: DASH_COST - 1,
      dashCooldownUntil: 0,
      currentTick: 100
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "not_enough_mana");
  });

  it("allows dash with exactly the required mana", () => {
    const result = resolveDash({
      mana: DASH_COST,
      dashCooldownUntil: 0,
      currentTick: 100
    });

    assert.equal(result.ok, true);
    assert.equal(result.mana, 0);
    assert.equal(result.dashCooldownUntil, 100 + DASH_COOLDOWN_TICKS);
  });

  it("fails while dash is cooling down", () => {
    const result = resolveDash({
      mana: DASH_COST,
      dashCooldownUntil: 120,
      currentTick: 100
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "cooldown");
  });

  it("allows dash on the exact tick the cooldown expires", () => {
    const result = resolveDash({
      mana: DASH_COST,
      dashCooldownUntil: 100,
      currentTick: 100
    });

    assert.equal(result.ok, true);
    assert.equal(result.mana, 0);
    assert.equal(result.dashCooldownUntil, 100 + DASH_COOLDOWN_TICKS);
  });

  it("does not change mana or cooldown when blocked by cooldown", () => {
    const result = resolveDash({
      mana: 100,
      dashCooldownUntil: 120,
      currentTick: 100
    });

    assert.equal(result.ok, false);
    assert.equal(result.mana, 100);
    assert.equal(result.dashCooldownUntil, 120);
  });

  it("does not change mana or cooldown when blocked by mana", () => {
    const result = resolveDash({
      mana: DASH_COST - 1,
      dashCooldownUntil: 40,
      currentTick: 100
    });

    assert.equal(result.ok, false);
    assert.equal(result.mana, DASH_COST - 1);
    assert.equal(result.dashCooldownUntil, 40);
  });

  it("consumes mana and sets cooldown when dash succeeds", () => {
    const result = resolveDash({
      mana: 100,
      dashCooldownUntil: 0,
      currentTick: 100
    });

    assert.equal(result.ok, true);
    assert.equal(result.mana, 100 - DASH_COST);
    assert.equal(result.dashCooldownUntil, 100 + DASH_COOLDOWN_TICKS);
  });

  it("reports missed double-jump gaps up to the HUD display cap", () => {
    const result = resolveDoubleJumpDashInput({
      currentTick: 100 + DOUBLE_JUMP_DASH_MAX_DISPLAY_TICKS,
      lastJumpTick: 100
    });

    assert.equal(result.shouldDash, false);
    assert.equal(result.nextLastJumpTick, 100 + DOUBLE_JUMP_DASH_MAX_DISPLAY_TICKS);
    assert.equal(result.displayedTickGap, DOUBLE_JUMP_DASH_MAX_DISPLAY_TICKS);
  });

  it("treats stale double-jump inputs above the HUD display cap as a fresh first jump", () => {
    const result = resolveDoubleJumpDashInput({
      currentTick: 100 + DOUBLE_JUMP_DASH_MAX_DISPLAY_TICKS + 1,
      lastJumpTick: 100
    });

    assert.equal(result.shouldDash, false);
    assert.equal(result.nextLastJumpTick, 100 + DOUBLE_JUMP_DASH_MAX_DISPLAY_TICKS + 1);
    assert.equal(result.displayedTickGap, undefined);
  });

  it("triggers double-jump dash only inside the configured input window", () => {
    const result = resolveDoubleJumpDashInput({
      currentTick: 100 + DOUBLE_JUMP_DASH_WINDOW_TICKS,
      lastJumpTick: 100
    });

    assert.equal(result.shouldDash, true);
    assert.equal(result.nextLastJumpTick, undefined);
    assert.equal(result.displayedTickGap, DOUBLE_JUMP_DASH_WINDOW_TICKS);
  });

  it("uses the player view direction when there is no movement input", () => {
    const result = resolveDashDirection({
      viewDirection: { x: 0, y: 0, z: 1 },
      movementVector: { x: 0, y: 0 }
    });

    assert.deepEqual(result, { x: 0, z: 1 });
  });

  it("dashes backward when the movement input is backward", () => {
    const result = resolveDashDirection({
      viewDirection: { x: 0, y: 0, z: 1 },
      movementVector: { x: 0, y: -1 }
    });

    assert.deepEqual(result, { x: 0, z: -1 });
  });

  it("dashes right when the movement input strafes right", () => {
    const result = resolveDashDirection({
      viewDirection: { x: 0, y: 0, z: 1 },
      movementVector: { x: 1, y: 0 }
    });

    assert.deepEqual(result, { x: 1, z: 0 });
  });

  it("dashes left when the movement input strafes left", () => {
    const result = resolveDashDirection({
      viewDirection: { x: 0, y: 0, z: 1 },
      movementVector: { x: -1, y: 0 }
    });

    assert.deepEqual(result, { x: -1, z: 0 });
  });

  it("normalizes partial lateral movement input to full dash distance", () => {
    const result = resolveDashDirection({
      viewDirection: { x: 0, y: 0, z: 1 },
      movementVector: { x: 0.25, y: 0 }
    });

    assert.deepEqual(result, { x: 1, z: 0 });
  });

  it("normalizes diagonal movement input for directional dash", () => {
    const result = resolveDashDirection({
      viewDirection: { x: 0, y: 0, z: 1 },
      movementVector: { x: 1, y: 1 }
    });

    assert.ok(Math.abs(result.x - Math.SQRT1_2) < 0.0001);
    assert.ok(Math.abs(result.z - Math.SQRT1_2) < 0.0001);
  });
});
