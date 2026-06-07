# ⚔️ Exiled World

> *"Portais de origem desconhecida rasgaram a realidade. Reis caíram. Cidades arderam. Apenas alguém com coragem suficiente para enfrentar os 20 guardiões pode selar o caos de uma vez por todas."*

**Exiled World** é um addon para **Minecraft Bedrock Edition** — um RPG de ação sombrio com 20 bosses únicos, progressão por tiers, sistema de atributos e atmosfera cinematográfica inspirada em **Elden Ring** e **Solo Leveling**.

---

## 🎮 Sobre o Projeto

| Campo | Detalhe |
|---|---|
| Plataforma | Minecraft Bedrock Edition |
| Versão mínima | Bedrock 1.21.0+ |
| Gênero | RPG de Ação · Boss Rush · Progressão PvE |
| Estilo visual | Dark Fantasy |
| Combat feel | Souls-like + Monster Hunter |
| Inspirações | Elden Ring · Dark Souls · Solo Leveling |
| Multiplayer | Cooperativo (boss escala com jogadores) |

---

## ⚡ Gameplay Loop

```
Explorar mundo → Encontrar portal → Ativar portal → Derrotar boss
      ↓
Coletar minérios e artefatos → Evoluir atributos → Novo tier desbloqueado
      ↓
                    Repetir até selar os 20 portais
```

---

## 🌑 Os 20 Bosses

Distribuídos em 5 tiers de dificuldade crescente, cada boss tem mecânicas únicas, cutscene de entrada e drops garantidos.

| Tier | Level Cap | Bosses |
|---|---|---|
| 1 | Nível 20 | Rochatus · Verme do Deserto · Garras-de-Cinza · Cavaleiro Sagrado |
| 2 | Nível 40 | Cérbero · Minotauro Chefe · Rainha das Valquírias · Dama de Ferro |
| 3 | Nível 60 | Gênio da Lâmpada · Pescador de Almas · Valquíria Corrompida · Ztroz · Titã de Lava |
| 4 | Nível 80 | Golem Mecânico · Esfinges Gêmeas · Hydra · Leviathan |
| 5 | Nível 100 | Dragão Arathos · Lich · Gigante Etéreo |

---

## ⚙️ Sistemas Principais

### Progressão
- **Level 1 a 100** com curva de XP crescente
- **5 atributos** investíveis: Vitalidade, Força, Speed, Destreza, Regen de Mana
- **100 pontos** totais para distribuir — impossível maximizar tudo
- Investimento permanente — sem reset

### Mana
- Recurso único de combate (sem stamina)
- Cobre dodge, magias e encantamentos
- Base: 200 · Ganho: +8/nível · Regen: 5/seg em combate

### Combate
- Parry como único interrupt de boss (via Escudo de Asgard)
- Dodge com iFrames definido por playtest
- Sem lock-on — combate posicional e manual
- Dificuldade: desafiador, não punitivo extremo

### Portais
- 20 portais pré-determinados no mundo
- Portal 2D que segue a visão do jogador
- Sleep mode quando o jogador se afasta
- Tier superior só aparece após limpar o anterior

### Minérios
10 minérios exclusivos com progressão por tier: Azurion → Oricalum → Solvaris → Vhaltrita → Asterita → Nythera → Krysalto → Drakyl → Nexílio → Zerônix

---

## 🛠️ Stack Técnica

| Componente | Tecnologia |
|---|---|
| Linguagem | TypeScript |
| API de jogo | Script API (Bedrock) |
| Modelagem 3D | Blockbench |
| Editor | VSCode + Bridge |
| Versionamento | GitHub |
| UI em jogo | Custom UI JSON + ActionForms |
| Persistência | Dynamic Properties |
| Animações | Animation Controllers + Molang + Herança de Skeletons |

---

## 📁 Estrutura do Repositório

```
exiled-world/
├── BP/                         # Behavior Pack
│   ├── entities/               # Definições de entidades (bosses, mobs)
│   ├── items/                  # Itens, minérios, artefatos
│   ├── scripts/                # TypeScript — lógica principal
│   │   ├── core/               # EventBus, FSM, Save System
│   │   ├── bosses/             # Classes de cada boss
│   │   ├── combat/             # Combat Framework, parry, mana
│   │   ├── portals/            # Gerenciador de portais
│   │   └── ui/                 # HUDs e menus
│   └── manifest.json
├── RP/                         # Resource Pack
│   ├── models/                 # Modelos 3D dos bosses
│   ├── animations/             # Animações (herança de skeletons)
│   ├── textures/               # Texturas dark fantasy
│   ├── sounds/                 # Música e efeitos sonoros
│   ├── particles/              # Partículas modulares
│   └── manifest.json
├── docs/                       # Documentação
│   └── GDD.docx                # Game Design Document completo
├── .gitignore
└── README.md
```

---

## 🗺️ Roadmap

| Fase | Foco | Estimativa |
|---|---|---|
| 0 — Foundation | Arquitetura base, sistemas core, HUD, multiplayer sync | 4-6 semanas |
| 1 — MVP | Rochatus funcional, 1 portal, combat loop validado | 2-3 semanas |
| 2 — Tier 1 | 4 bosses, atributos, artefatos, crafting, mapa de portais | 3-4 semanas |
| 3 — Tiers 2 e 3 | 9 bosses, parry, missão da Catedral, cutscenes | 5-7 semanas |
| 4 — Endgame | 7 bosses finais, New Game+, cutscene final | 4-6 semanas |
| 5 — Polish | Balanceamento, otimização, UX, som, QA | 3-4 semanas |

**Estimativa total: 5 a 7 meses**

---

## 👥 Equipe

| Membro | Foco |
|---|---|
| Dev 1 | Código · Script API · Sistemas de combate |
| Dev 2 | Arte · Modelos 3D · Animações · Texturas |

---

## 📋 Status

```
[ ] Fase 0 — Foundation
[ ] Fase 1 — MVP
[ ] Fase 2 — Tier 1
[ ] Fase 3 — Tiers 2 e 3
[ ] Fase 4 — Endgame
[ ] Fase 5 — Polish
```

---

## ⚠️ Aviso

Este repositório é **privado e proprietário**. Todo o código, arte e design pertencem exclusivamente à equipe de desenvolvimento. Nenhuma parte deste projeto pode ser copiada, distribuída ou utilizada sem autorização expressa dos autores.

---

*Exiled World — Seal the chaos. Become the hero.*
