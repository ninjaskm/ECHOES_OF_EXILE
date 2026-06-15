# Bedrock MVP Test Checklist

**Current MVP version:** v0.1.28

Run this after `npm.cmd run check` passes.

## Setup

- [ ] Minecraft Bedrock files path is `C:\Users\teteu\AppData\Roaming\Minecraft Bedrock\Users\Shared\games\com.mojang`.
- [ ] Imported/downloaded packs are checked under `behavior_packs` and `resource_packs` when needed.
- [ ] DEV packs, when using `npm.cmd run dev:link`, are under `development_behavior_packs\EchoesOfExile_BP_DEV` and `development_resource_packs\EchoesOfExile_RP_DEV`.
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

- [ ] Importar/confirmar v0.1.28 in the world packs screen.
- [ ] Run `/function exile_mvp_start`.
- [ ] Expected: player receives a `Portal Shard`.
- [ ] Expected: Tier 1 desert portal structure appears several blocks in front of the player.
- [ ] Expected: animated portal particle is centered in the structure and has no visible sheet seam.
- [ ] Drop the `Portal Shard` into the portal particles.
- [ ] Expected: portal consumes the shard.
- [ ] Expected: Rochatus spawns and title text appears.

## Dash and HUD

- [ ] Press jump twice quickly.
- [ ] Expected: player dashes forward from double-jump input.
- [ ] Expected: mana decreases by 50.
- [ ] Expected: dash sidebar shows cooldown counting down to `0`.
- [ ] Try to dash again immediately.
- [ ] Expected: cooldown message appears.
- [ ] Wait 2 seconds and dash again.
- [ ] Expected: dash works again if enough mana exists.
- [ ] Expected: actionbar shows HP, mana and XP bars with numeric values beside them, plus level and available attribute points.
- [ ] Expected: dash state stays in the separate dash sidebar, not mixed into mana/actionbar text.

## Rochatus fight

- [ ] Keep one player within the arena/follow range of Rochatus.
- [ ] Expected: Rochatus attacks after detecting the player.
- [ ] Expected: attacks cycle between roll, spikes and earthquake.
- [ ] Expected: first special attack waits roughly 5 seconds after detection.
- [ ] Expected: each special attack respects its current 150 tick interval.
- [ ] Expected: roll locks the player's initial position and does not keep tracking mid-roll.
- [ ] Expected: earthquake makes Rochatus jump before the impact.
- [ ] Expected: Rochatus nameTag keeps vida atualizando while taking damage.
- [ ] Expected: no script crash occurs during several attack cycles.
- [ ] Defeat Rochatus.
- [ ] Expected: drop + XP are granted, including Azurion and Oricalum.
- [ ] Expected: `/function exile_stats` lists Rochatus as defeated.
- [ ] Try activating/spawning Rochatus again.
- [ ] Expected: player is told Rochatus has already been defeated.

## Reset

- [ ] Run `/function exile_reset_mvp`.
- [ ] Expected: player stats and world boss progress reset.
- [ ] Expected: generated MVP portal structure is cleared when it was spawned by the current saved portal flow.
- [ ] Expected: portal particles stop after reset.
- [ ] Run `/function exile_stats`.
- [ ] Expected: boss progress is empty again.
- [ ] Expected: sair e entrar no mundo keeps scripts working after reload.

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
