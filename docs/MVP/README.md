# Echoes of Exile MVP

This MVP is a first playable technical slice for the Bedrock addon.

## What is implemented

- Behavior/resource pack manifests.
- Script entrypoint with modular systems.
- EventBus, FSM and TickManager foundation.
- Dynamic Properties save for player stats, gear and boss progress.
- Mana regeneration, XP, level cap 20 and attribute points.
- Placeholder actionbar HUD for level, XP, mana and attribute points.
- Dash using a feather: costs 20 mana and has a 2 second cooldown.
- Tier 1 portal prototype.
- Portal Shard activation item.
- Rochatus placeholder custom entity.
- Scripted Rochatus fight with roll, falling spikes and earthquake attacks.
- Guaranteed Azurion reward and world boss completion flag.

## How to test in Minecraft

1. Import or copy `BP` and `RP` into a Bedrock world.
2. Enable Beta APIs / experimental scripting for the world if required by your Bedrock version.
3. Run:

```mcfunction
/function exile_mvp_start
```

4. Drop the `Portal Shard` into the portal particles.
5. Fight Rochatus. Use the feather to dash.
6. Check stats:

```mcfunction
/function exile_stats
```

## Useful MVP functions

```mcfunction
/function exile_mvp_start
/function exile_help
/function exile_stats
/function exile_add_vit
/function exile_add_str
/function exile_spawn_rochatus
/function exile_clear_portals
/function exile_reset_mvp
```

## Current placeholders

- Rochatus model and texture are placeholder geometry/assets.
- HUD is actionbar text, not final Custom UI JSON.
- Portal is particle-based, not the final 2D cinematic portal.
- Dash is triggered by feather use for fast MVP validation.
