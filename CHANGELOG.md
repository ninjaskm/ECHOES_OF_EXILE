# CHANGELOG — Echoes of Exile

**Versão atual:** v0.1.28

Todas as mudanças relevantes do projeto são registradas aqui.
Formato: `[DATA] — Descrição` agrupado por versão/fase.

> **Para o Codex:** atualize este arquivo ao final de **toda tarefa concluída**.
> Adicione uma entrada na seção da fase atual. Nunca delete entradas antigas.

---

## Como registrar

```
### [AAAA-MM-DD] Título curto da mudança

- **O que foi feito:** descrição objetiva
- **Arquivos alterados:** lista de caminhos
- **Testes:** passou / falhou / não aplicável
- **Observações:** quebras de compatibilidade, decisões tomadas, dívida técnica
```

---

## Fase 0 — Foundation

*(ainda sem entradas)*

---

## Fase 1 — MVP

### [2026-06-12] Boss architecture convention documented

- **O que foi feito:** registrada a regra de arquitetura reutilizável de bosses com `BaseBossSystem`, `BossAttack`, `RollAttack`, `SpikeWaveAttack` e `QuakeAttack`
- **Arquivos alterados:** `AGENTS.md`, `docs/ARCHITECTURE.md`, `tests/docsContracts.test.js`
- **Testes:** contrato de arquitetura de bosses validado em `tests/docsContracts.test.js`
- **Observações:** bosses futuros devem configurar ataques reutilizáveis em vez de duplicar lógica específica dentro do sistema do boss

### [2026-06-10] Rochatus reward fixed

- **O que foi feito:** a recompensa de Azurion do Rochatus voltou para o loot table nativo da entidade, garantindo drop no chão em vez de ir direto para o inventário via script
- **Arquivos alterados:** `src/scripts/combat/PlayerStatsSystem.ts`, `BP/entities/rochatus.json`, `BP/scripts/combat/PlayerStatsSystem.js`, `tests/projectConventions.test.js`, `tests/rochatusRewards.test.js`
- **Testes:** pendente de reexecução após o ajuste do fluxo de drop
- **Observações:** o script agora só concede XP e mensagem de vitória; o loot table de `BP/loot_tables/entities/rochatus.json` passou a ser o ponto único da recompensa

---

## Fase 2 — Tier 1 Completo

*(ainda sem entradas)*

---

## Fase 3 — Tiers 2 e 3

*(ainda sem entradas)*

---

## Fase 4 — Endgame

*(ainda sem entradas)*

---

## Fase 5 — Polish

*(ainda sem entradas)*

---

## Protótipo inicial

### [2025] Estrutura inicial do repositório

- **O que foi feito:** criação da estrutura de pastas BP/RP, manifest.json, scripts core/bosses/save/portals/combat/ui/cutscenes/multiplayer/particles, entidade Rochatus, loot table, funções mcfunction, portal_shard
- **Arquivos alterados:** estrutura completa do repositório
- **Testes:** não aplicável (protótipo pré-AGENTS.md)
- **Observações:** código protótipo — será adaptado para seguir padrões do AGENTS.md (TDD, EventBus, FSM)
