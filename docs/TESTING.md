# Testing

**Current MVP version:** v0.1.28

Echoes of Exile follows the repository rule from `AGENTS.md`: tests come before production code.

## Official commands

Run all automated tests:

```powershell
npm test
```

Compile TypeScript into Bedrock-loadable JavaScript:

```powershell
npm run build
```

Run the TypeScript compiler without emitting files:

```powershell
npm run typecheck
```

Run tests in watch mode:

```powershell
npm run test:watch
```

Run the full local validation suite:

```powershell
npm run check
```

The full check runs:

- TypeScript typecheck
- `npm test`
- JavaScript syntax validation for all current script files
- JSON parsing validation for pack files and other repository JSON files

## Current test scope

Automated tests cover logic that can run outside Minecraft Bedrock:

- `EventBus`
- `StateMachine`
- MVP progression rules
- Dash rules
- boss architecture contracts
- Bedrock command/API compatibility contracts
- portal structure, animation and reset contracts
- Rochatus loot table reward contracts

Gameplay that depends on Bedrock runtime must use a manual checklist until a dedicated integration harness exists.

## Test file rules

- Test files live in `tests/`.
- Test files use the native Node test runner.
- Test files are named `*.test.js` and import compiled JavaScript from `BP/scripts`.
- Production source lives in `src/scripts/**/*.ts`.
- The build emits Bedrock-loadable JavaScript into `BP/scripts`.
- Tests must describe behavior, not implementation details.

## Manual Bedrock checklist

Use this checklist after `npm run check` passes:

- Minecraft Bedrock in-game files are stored at `C:\Users\teteu\AppData\Roaming\Minecraft Bedrock\Users\Shared\games\com.mojang`.
- Imported/downloaded packs live under `behavior_packs` and `resource_packs` inside that folder.
- DEV linked packs live under `development_behavior_packs\EchoesOfExile_BP_DEV` and `development_resource_packs\EchoesOfExile_RP_DEV`.
- Import/activate `BP` and `RP` in a Bedrock world.
- Enable required Script API experiments for the installed Bedrock version.
- Run `/function exile_mvp_start`.
- Confirm a Tier 1 desert portal structure appears with the animated portal particle centered in it.
- Drop `Portal Shard` into the portal.
- Confirm Rochatus spawns.
- Use double jump and confirm dash consumes mana.
- Use a feather and confirm fallback dash still works.
- Confirm the dash sidebar shows cooldown/tick state separately from the character actionbar.
- Defeat Rochatus.
- Confirm Azurion and Oricalum drop on the ground from the boss entity loot table.
- Run `/function exile_stats`.
- Confirm Rochatus is listed as defeated.
- Run `/function exile_reset_mvp`.
- Confirm player stats, boss progress, portal particles and generated portal structure reset for the current saved portal flow.

## TypeScript direction

The repository standard is TypeScript. Bedrock still loads JavaScript, so `src/scripts` is the source of truth and `BP/scripts` is generated output.
