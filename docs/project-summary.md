# Echoes of Exile — project summary

## Purpose

This document is a compact technical summary of what has been built and stabilized so far in the Echoes of Exile MVP.
It is intended as a handoff reference for another AI or developer who needs the current state of the project without reading the entire repo history.

## High-level status

The project is a Minecraft Bedrock addon MVP built with TypeScript and the Script API.
The current focus is a playable technical slice with:

- player progression and stats;
- mana and dash rules;
- scripted portal flow;
- Rochatus boss encounter;
- boss reward handling;
- pack versioning and test automation;
- Bedrock-compatible build output in `BP/scripts`.

## What has been implemented

### Core gameplay systems

- EventBus-based communication between systems.
- FSM/state-machine structure for boss behavior.
- TickManager scheduling for per-tick and interval logic.
- SaveSystem-backed player data using Dynamic Properties.
- Player stats storage for level, XP, mana, attributes, cooldowns and related progression data.
- XP and level-up flow with attribute points.
- Mana regeneration logic.
- Dash rule using the feather item as a fast MVP input.

### Portal and world flow

- Tier 1 portal prototype.
- Portal Shard activation item.
- Portal activation events and portal lifecycle wiring.
- Rift/portal prototype assets and script flow prepared for later upgrade into the final cinematic portal.

### Rochatus boss

- Custom Rochatus boss entity.
- Rochatus spawn flow tied to portal activation and debug spawn hooks.
- Boss state machine with the required states:
  - `IDLE`
  - `COMBAT`
  - `STAGGER`
  - `DEAD`
- Boss attacks and arena behavior:
  - roll
  - falling spikes
  - earthquake
- Arena player targeting and boss health scaling.
- Boss defeat tracking in save data.

### Reward and progression

- Azurion reward defined as a native entity loot-table drop.
- Rochatus reward now uses `BP/entities/rochatus.json` plus `BP/loot_tables/entities/rochatus.json`.
- Reward logic is no longer command-driven.
- On boss death, the script grants XP and defeat messaging, while Bedrock handles the actual ground drop.

### UI and reporting

- In-game stats/reporting flow.
- Debug helper commands for testing progression and boss flow.
- Copy-friendly report output for quick validation in Minecraft chat.

### Build and packaging

- Behavior pack and resource pack manifests are kept version-aligned.
- Pack versioning is synchronized with visible in-game version text.
- Build output is generated into `BP/scripts`.
- Pack archives are produced for import/testing.

## Key changes that were made during stabilization

### 1. Fixed old Dynamic Properties runtime issues

The codebase was aligned away from deprecated or removed runtime patterns and toward the current SaveSystem flow.

### 2. Stabilized test workflow

The automated test suite was expanded to check:

- progression rules;
- dash behavior;
- pack version alignment;
- Bedrock pack archive structure;
- Rochatus reward conventions;
- project conventions that prevent runtime regressions.

### 3. Corrected Rochatus reward semantics

The reward path was corrected so Azurion is produced as a real world drop through the entity loot system.
This replaced earlier attempts that used script-driven item spawning and could behave inconsistently in the Bedrock runtime.

### 4. Tightened docs and handoff material

Several docs were updated so the current implementation and validation flow are easier to follow:

- `CHANGELOG.md`
- `docs/TESTING.md`
- `docs/MVP/README.md`
- `docs/rochatus-reward-technical-notes.md`

## Current project shape

### Source of truth

- TypeScript lives in `src/scripts`.
- Bedrock runtime JavaScript lives in `BP/scripts`.
- JSON pack data lives in `BP/` and `RP/`.

### Current reward model

- Rochatus death is detected in script.
- Save data records the boss as defeated.
- Players get XP and victory messaging from script.
- The actual Azurion drop is handled by the entity loot table.

### Current validation model

- Automated tests cover repository conventions and logic that can run outside Minecraft.
- Bedrock-only behavior still needs manual world testing.
- Manual validation currently matters for:
  - boss spawning;
  - portal activation;
  - reward drop visibility;
  - in-world progression behavior.

## Manual test checklist used by the team

1. Import or activate the current BP and RP.
2. Start the MVP flow.
3. Trigger the portal.
4. Spawn Rochatus.
5. Defeat Rochatus.
6. Confirm Azurion drops on the ground.
7. Confirm player progression and report commands still behave correctly.

## Important implementation notes

- Bedrock runtime behavior is not fully captured by string-only tests.
- Reward logic should prefer native entity loot tables over scripted `give` or `loot spawn` commands.
- If the reward amount changes, the loot table entry is the first place to update.
- If future behavior becomes conditional, that logic should still stay close to the loot table path rather than being forced into inventory commands.

## Use this summary for handoff

This project is currently in a playable MVP state with a functioning boss loop and a corrected reward path.
The next phase should build on the existing portal, boss, and progression systems instead of reworking them.
