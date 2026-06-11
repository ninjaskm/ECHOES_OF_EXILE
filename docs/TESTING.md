# Testing

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

- Import/activate `BP` and `RP` in a Bedrock world.
- Enable required Script API experiments for the installed Bedrock version.
- Run `/function exile_mvp_start`.
- Confirm a Tier 1 portal appears as particles.
- Drop `Portal Shard` into the portal.
- Confirm Rochatus spawns.
- Use a feather and confirm dash consumes mana.
- Defeat Rochatus.
- Confirm Azurion drops on the ground from the boss entity loot table.
- Run `/function exile_stats`.
- Confirm Rochatus is listed as defeated.

## TypeScript direction

The repository standard is TypeScript. Bedrock still loads JavaScript, so `src/scripts` is the source of truth and `BP/scripts` is generated output.
