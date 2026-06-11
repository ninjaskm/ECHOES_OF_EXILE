import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assertOrdered(source, patterns) {
  let cursor = 0;

  for (const pattern of patterns) {
    const match = source.slice(cursor).match(pattern);
    assert.ok(match, `Expected to find ${pattern} after offset ${cursor}`);
    cursor += match.index + match[0].length;
  }
}

describe("main script entrypoint", () => {
  it("initializes systems through system.run instead of removed worldInitialize", () => {
    const source = read("src/scripts/main.ts");
    const builtSource = read("BP/scripts/main.js");

    for (const candidate of [source, builtSource]) {
      assert.doesNotMatch(candidate, /world\.afterEvents\.worldInitialize/);
      assert.match(candidate, /system\.run\(\(\) => \{/);
    }
  });

  it("registers save properties before systems and starts TickManager last", () => {
    const source = read("src/scripts/main.ts");

    assertOrdered(source, [
      /function initializeMvpSystems\(\): void \{/,
      /saveSystem\.registerWorldProperties\(\);/,
      /for \(const system of systems\) \{/,
      /system\.initialize\?\.\(\{ eventBus, tickManager \}\);/,
      /tickManager\.start\(\);/
    ]);
  });
});
