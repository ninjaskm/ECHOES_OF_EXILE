import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { StateMachine } from "../BP/scripts/core/FSM.js";

describe("StateMachine", () => {
  it("starts in the configured initial state and calls onEnter", () => {
    const calls = [];

    const machine = new StateMachine({
      initialState: "IDLE",
      context: {},
      states: {
        IDLE: {
          onEnter: () => calls.push("enter:IDLE")
        }
      }
    });

    assert.equal(machine.state, "IDLE");
    assert.deepEqual(calls, ["enter:IDLE"]);
  });

  it("calls onExit and next onEnter when transitioning", () => {
    const calls = [];

    const machine = new StateMachine({
      initialState: "IDLE",
      context: {},
      states: {
        IDLE: {
          onExit: () => calls.push("exit:IDLE")
        },
        COMBAT: {
          onEnter: () => calls.push("enter:COMBAT")
        }
      }
    });

    machine.transition("COMBAT");

    assert.equal(machine.state, "COMBAT");
    assert.deepEqual(calls, ["exit:IDLE", "enter:COMBAT"]);
  });

  it("calls onTick for the active state and increments elapsedTicks", () => {
    const calls = [];

    const machine = new StateMachine({
      initialState: "COMBAT",
      context: {},
      states: {
        COMBAT: {
          onTick: (_context, fsm) => calls.push(fsm.elapsedTicks)
        }
      }
    });

    machine.update();
    machine.update();

    assert.deepEqual(calls, [1, 2]);
  });
});
