import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { applyKnockbackSafe } from "../BP/scripts/core/math.js";

function read(path) {
  return readFileSync(path, "utf8");
}

describe("Bedrock math compatibility", () => {
  it("uses the stable two-argument VectorXZ applyKnockback signature first", () => {
    const calls = [];
    const entity = {
      applyKnockback(...args) {
        calls.push(args);
      }
    };

    applyKnockbackSafe(entity, 0.5, -0.25, 2, 0.15);

    assert.deepEqual(calls, [[{ x: 1, z: -0.5 }, 0.15]]);
  });

  it("falls back to the legacy four-argument applyKnockback signature when needed", () => {
    const calls = [];
    const entity = {
      applyKnockback(...args) {
        calls.push(args);
        if (args.length === 2) {
          throw new Error("legacy runtime");
        }
      }
    };

    applyKnockbackSafe(entity, 0.5, -0.25, 2, 0.15);

    assert.deepEqual(calls, [
      [{ x: 1, z: -0.5 }, 0.15],
      [0.5, -0.25, 2, 0.15]
    ]);
  });

  it("does not call the removed three-argument VectorXZ applyKnockback shape", () => {
    const source = read("src/scripts/core/math.ts");
    const builtSource = read("BP/scripts/core/math.js");

    for (const candidate of [source, builtSource]) {
      assert.doesNotMatch(candidate, /applyKnockback\(\{ x: directionX, z: directionZ \}, horizontalStrength, verticalStrength\)/);
      assert.doesNotMatch(candidate, /applyKnockback\(\{ x: directionX \* horizontalStrength, z: directionZ \* horizontalStrength \}, horizontalStrength, verticalStrength\)/);
    }
  });
});
