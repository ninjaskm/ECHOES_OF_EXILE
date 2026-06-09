# ARCHITECTURE.md — Echoes of Exile

Documento de referência da arquitetura interna do projeto.
Leia este arquivo antes de implementar qualquer sistema novo ou modificar um existente.

> **Para o Codex:** consulte este arquivo no início de toda sessão. Se implementar algo que mude a arquitetura, atualize este documento na mesma tarefa.

---

## Visão Geral

O Echoes of Exile é um **Minecraft Bedrock Addon** (Behavior Pack + Resource Pack) escrito em JavaScript com a Script API oficial do Bedrock. A arquitetura é orientada a sistemas independentes que se comunicam via EventBus central.

```
ECHOES_OF_EXILE/
├── BP/                        ← Behavior Pack (lógica)
│   ├── scripts/
│   │   ├── main.js            ← Entry point — inicializa todos os sistemas
│   │   ├── core/              ← Infraestrutura base (não tocar sem aprovação)
│   │   │   ├── EventBus.js
│   │   │   └── TickManager.js
│   │   ├── save/
│   │   │   └── SaveSystem.js
│   │   ├── combat/
│   │   │   ├── PlayerStatsSystem.js
│   │   │   └── DashSystem.js
│   │   ├── portals/
│   │   │   └── PortalSystem.js
│   │   ├── bosses/
│   │   │   └── rochatus/
│   │   │       └── RochatusSystem.js
│   │   ├── ui/
│   │   │   ├── HudSystem.js
│   │   │   └── DevCommandSystem.js
│   │   ├── cutscenes/
│   │   ├── multiplayer/
│   │   └── particles/
│   ├── entities/
│   ├── items/
│   ├── loot_tables/
│   ├── functions/             ← Comandos mcfunction (dev/debug)
│   └── manifest.json
├── RP/                        ← Resource Pack (visual)
│   ├── entity/
│   ├── models/
│   ├── textures/
│   ├── ui/
│   └── manifest.json
└── docs/
```

---

## Inicialização (`main.js`)

O entry point registra todos os sistemas e os inicializa em sequência no evento `worldInitialize`.

**Ordem de inicialização — importa, não altere sem motivo:**

```
1. saveSystem.registerWorldProperties()   ← deve ser o primeiro (registra Dynamic Properties)
2. Todos os sistemas recebem { eventBus, tickManager } via initialize()
3. tickManager.start()                    ← deve ser o último
```

**Regra:** todo novo sistema deve ser adicionado ao array `systems` em `main.js` e implementar o método `initialize({ eventBus, tickManager })`.

---

## Sistemas Core (`scripts/core/`)

> ⚠️ Arquivos proibidos de editar sem aprovação explícita.

### EventBus (`core/EventBus.js`)

Barramento de eventos global. Toda comunicação entre sistemas passa por aqui — sem imports diretos entre sistemas.

```javascript
// Publicar evento
eventBus.emit('onBossKilled', { bossId: 'rochatus', playerId: '...' });

// Assinar evento
eventBus.on('onBossKilled', (data) => { ... });

// Cancelar assinatura (fazer isso no cleanup de sistemas)
const unsub = eventBus.on('onBossKilled', handler);
unsub();
```

**Eventos existentes — não renomear sem atualizar todos os assinantes:**

| Evento | Payload esperado | Quem emite |
|---|---|---|
| *(documente aqui conforme forem sendo criados)* | | |

### TickManager (`core/TickManager.js`)

Controla a execução periódica de tarefas sem sobrecarregar o loop principal.

```javascript
// Executar a cada 20 ticks (~1 segundo)
const cancelar = tickManager.every(20, (currentTick) => {
  // lógica periódica
});

// Cancelar quando o sistema for destruído
cancelar();
```

**Regras de uso:**
- Nunca use `system.runInterval` diretamente nos sistemas — use sempre o TickManager
- Nunca use `world.getAllPlayers()` a cada tick — armazene referências em cache
- Verificação de portais: a cada **20 ticks** (não a cada tick)
- IA de boss ativa: a cada **2–5 ticks** dependendo da complexidade

---

## Save System (`save/SaveSystem.js`)

Persiste o estado do jogador via **Dynamic Properties** do Bedrock. Usa Dirty Flag — só escreve quando algo muda.

### Schema das propriedades

| Propriedade | Tipo | Conteúdo |
|---|---|---|
| `modulo:player_stats` | JSON string | `{ level, xp, attribute_points, attributes: { vit, str, spd, dex, mana_regen } }` |
| `modulo:boss_progress` | JSON string | `{ killed: string[] }` — IDs dos bosses derrotados |
| `modulo:player_gear` | JSON string | `{ accessories: string[], active_enchant: string \| null }` |

> ⚠️ **Nunca acesse Dynamic Properties diretamente.** Use sempre o SaveSystem. Mudanças no schema quebram saves existentes — exigem confirmação antes de qualquer alteração.

---

## Padrão de Sistema

Todo sistema segue esta estrutura:

```javascript
class MeuSystem {
  initialize({ eventBus, tickManager }) {
    this.eventBus = eventBus;
    this.tickManager = tickManager;
    this._setupEvents();
    this._setupTicks();
  }

  _setupEvents() {
    this.eventBus.on('algumEvento', (data) => this._handleEvento(data));
  }

  _setupTicks() {
    this.tickManager.every(20, () => this._update());
  }

  _update() { ... }
  _handleEvento(data) { ... }
}

export const meuSystem = new MeuSystem();
```

---

## Padrão de Boss (FSM)

Todo boss usa uma FSM (Finite State Machine) com estados obrigatórios:

```
IDLE → COMBAT → STAGGER → DEAD
         ↑          ↓
         └──────────┘ (volta ao COMBAT após stagger)
```

**Estados obrigatórios:**

| Estado | Descrição |
|---|---|
| `IDLE` | Boss inativo, aguardando jogador entrar no raio de 40 blocos |
| `COMBAT` | IA ativa — seleciona e executa ataques |
| `STAGGER` | Recebeu dano acima do threshold — animação de dano, IA pausada brevemente |
| `DEAD` | HP zerou — emite `onBossKilled`, spawn de loot, remove entidade |

Ao criar um novo boss, herde do skeleton base correspondente em `scripts/bosses/base/`.

---

## Manifest

| Campo | Valor |
|---|---|
| BP UUID | `8646c5c7-8f0d-4b5b-87a9-d33543649fd2` |
| Script entry | `scripts/main.js` |
| `@minecraft/server` | `1.13.0` |
| `@minecraft/server-ui` | `1.2.0` |
| Versão atual | `[0, 1, 0]` |
| Bedrock mínimo | `1.21.0` |

> ⚠️ Nunca altere os UUIDs do manifest. Isso desvincula o pack de mundos existentes.

---

## Funções mcfunction (`BP/functions/`)

Usadas apenas para **desenvolvimento e debug**. Não fazem parte da lógica de jogo em produção.

| Função | Propósito |
|---|---|
| `exile_mvp_start` | Inicia o MVP com estado limpo |
| `exile_reset_mvp` | Reseta progresso para testes |
| `exile_spawn_rochatus` | Spawna Rochatus na posição do jogador |
| `exile_clear_portals` | Remove todos os portais ativos |
| `exile_stats` | Exibe stats do jogador no chat |
| `exile_add_str` | Adiciona pontos de Força (debug) |
| `exile_add_vit` | Adiciona pontos de Vitalidade (debug) |
| `exile_help` | Lista todos os comandos disponíveis |

---

## Regras Gerais

- **Comunicação entre sistemas:** sempre via EventBus — sem imports diretos entre sistemas
- **Ticks pesados:** use TickManager com intervalo adequado — nunca lógica a cada tick
- **Save:** sempre via SaveSystem com Dirty Flag — nunca Dynamic Properties direto
- **Novos sistemas:** adicionar ao array `systems` em `main.js` + implementar `initialize()`
- **Novos bosses:** herdar skeleton base + FSM com 4 estados obrigatórios
- **Partículas:** máximo de 20 simultâneas por boss

---

*Atualize este documento sempre que um novo sistema, evento ou convenção for adicionado ao projeto.*
