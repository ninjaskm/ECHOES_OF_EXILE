import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EventBus } from "../BP/scripts/core/EventBus.js";

describe("EventBus", () => {
  it("calls subscribed handlers when an event is published", () => {
    const bus = new EventBus();
    const received = [];

    bus.subscribe("boss:killed", (payload) => received.push(payload.bossId));
    bus.publish("boss:killed", { bossId: "rochatus" });

    assert.deepEqual(received, ["rochatus"]);
  });

  it("unsubscribes handlers", () => {
    const bus = new EventBus();
    let calls = 0;

    const unsubscribe = bus.subscribe("player:levelUp", () => {
      calls += 1;
    });

    bus.publish("player:levelUp");
    unsubscribe();
    bus.publish("player:levelUp");

    assert.equal(calls, 1);
  });

  it("keeps publishing to other handlers when one handler throws", () => {
    const bus = new EventBus();
    let safeHandlerCalled = false;

    bus.subscribe("portal:activated", () => {
      throw new Error("broken listener");
    });
    bus.subscribe("portal:activated", () => {
      safeHandlerCalled = true;
    });

    bus.publish("portal:activated");

    assert.equal(safeHandlerCalled, true);
  });
});
