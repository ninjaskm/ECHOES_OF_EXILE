# Echoes of Exile MVP

**Current MVP version:** v0.1.28

This MVP is a first playable technical slice for the Bedrock addon.

## What is implemented

- Behavior/resource pack manifests.
- Script entrypoint with modular systems.
- EventBus, FSM and TickManager foundation.
- Dynamic Properties save for player stats, gear, boss progress and generated portal structure locations.
- Mana regeneration, XP, level cap 20 and attribute points.
- Placeholder actionbar HUD for level, XP, mana and attribute points, plus a separate dash sidebar.
- Dash using fast double-jump input with feather fallback: costs 20 mana and has a 2 second cooldown.
- Tier 1 portal prototype using the desert portal structure and animated portal particle.
- Portal Shard activation item.
- Rochatus placeholder custom entity.
- Scripted Rochatus fight with roll, falling spikes and earthquake attacks.
- Ground-dropped Azurion and Oricalum rewards from the Rochatus entity loot table and world boss completion flag.
- MVP reset clears saved portal structures and portal gameplay state for repeatable tests.

## How to test in Minecraft

1. Import or copy `BP` and `RP` into a Bedrock world.
2. Enable Beta APIs / experimental scripting for the world if required by your Bedrock version.
3. Run:

```mcfunction
/function exile_mvp_start
```

4. Drop the `Portal Shard` into the portal particles.
5. Fight Rochatus. Use double jump to dash; keep the feather as fallback if needed.
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
- Portal uses a generated structure plus animated particle, not the final cinematic portal art pass.
- Feather dash remains as a fallback while double-jump dash is validated in Bedrock.
