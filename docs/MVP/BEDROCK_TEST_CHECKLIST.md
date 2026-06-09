# Bedrock MVP Test Checklist

Run this after `npm.cmd run check` passes.

## Setup

- [ ] Build output is fresh: `npm.cmd run build`
- [ ] `BP` and `RP` are active in a Minecraft Bedrock test world.
- [ ] Required Script API / experimental toggles are enabled for the installed Bedrock version.
- [ ] Cheats are enabled for `/function` commands.

## Smoke test

- [ ] Enter the world without script initialization errors.
- [ ] Run `/function exile_help`.
- [ ] Expected: chat shows MVP commands.
- [ ] Run `/function exile_stats`.
- [ ] Expected: level, XP, mana, attributes and boss progress are shown.

## Portal loop

- [ ] Run `/function exile_mvp_start`.
- [ ] Expected: player receives a `Portal Shard` and a feather.
- [ ] Expected: Tier 1 portal particles appear several blocks in front of the player.
- [ ] Drop the `Portal Shard` into the portal particles.
- [ ] Expected: portal consumes the shard.
- [ ] Expected: Rochatus spawns and title text appears.

## Dash and HUD

- [ ] Use the feather.
- [ ] Expected: player dashes forward.
- [ ] Expected: mana decreases by 20.
- [ ] Use the feather again immediately.
- [ ] Expected: cooldown message appears.
- [ ] Wait 2 seconds and use the feather again.
- [ ] Expected: dash works again if enough mana exists.
- [ ] Expected: actionbar shows level, XP, mana and available attribute points.

## Rochatus fight

- [ ] Keep one player within roughly 40 blocks of Rochatus.
- [ ] Expected: Rochatus attacks after detecting the player.
- [ ] Expected: attacks cycle between roll, spikes and earthquake.
- [ ] Expected: no script crash occurs during several attack cycles.
- [ ] Defeat Rochatus.
- [ ] Expected: Azurion reward is granted.
- [ ] Expected: `/function exile_stats` lists Rochatus as defeated.
- [ ] Try activating/spawning Rochatus again.
- [ ] Expected: player is told Rochatus has already been defeated.

## Reset

- [ ] Run `/function exile_reset_mvp`.
- [ ] Expected: player stats and world boss progress reset.
- [ ] Run `/function exile_stats`.
- [ ] Expected: boss progress is empty again.

## Multiplayer minimum

- [ ] Join with a second local player.
- [ ] Run `/function exile_reset_mvp`.
- [ ] Run `/function exile_mvp_start`.
- [ ] Activate the portal.
- [ ] Expected: Rochatus spawns without desync/crash.
- [ ] Expected: both players can see the fight.
- [ ] Defeat Rochatus.
- [ ] Expected: both nearby players receive the boss reward.

## Notes

Record:

- Bedrock version:
- Device/platform:
- Any content log errors:
- Any command that failed:
- Any crash/desync:
