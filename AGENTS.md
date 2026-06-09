# AGENTS.md — Echoes of Exile

Regras de comportamento para o Codex (e qualquer agente de IA) neste repositório.
Leia este arquivo **antes de qualquer ação**. Estas regras têm prioridade máxima.

---

## Regra de Ouro

> **Escreva o teste antes do código. Quando em dúvida, pergunte. Nunca assuma.**

---

## 1. Fluxo obrigatório para toda nova implementação

**Toda feature, sistema ou correção segue esta ordem — sem exceção:**

```
1. Escreva o(s) teste(s) que definem o comportamento esperado
2. Mostre os testes e aguarde aprovação
3. Implemente o código mínimo para os testes passarem
4. Rode os testes e confirme que passam
5. Só então considere a tarefa concluída
```

Se não for possível escrever testes (ex: animações, UI visual), **documente por que** e descreva o comportamento esperado em formato de checklist manual.

### Exemplo de como apresentar antes de implementar

```
### Testes planejados (src/bosses/__tests__/rochatus.test.ts)

- [ ] deve entrar em estado COMBAT ao detectar jogador em raio de 40 blocos
- [ ] deve transitar para STAGGER ao receber dano acima do threshold
- [ ] deve transitar para DEAD ao chegar em 0 HP e disparar evento onBossKilled
- [ ] ataque Rolamento deve respeitar cooldown de X segundos após uso

Posso prosseguir com a implementação?
```

Aguarde confirmação antes de escrever o código de produção.

---

## 2. Ações que SEMPRE exigem confirmação explícita

Antes de executar qualquer item abaixo, descreva o que pretende fazer e **aguarde aprovação**:

- **Deletar arquivos** — qualquer `rm`, `unlink` ou remoção de pasta
- **Renomear ou mover** arquivos de sistema do addon (`manifest.json`, `pack_icon.png`, estrutura de pastas raiz)
- **Alterar o `manifest.json`** — uuid, versões, dependências, módulos
- **Modificar o schema de Dynamic Properties** — mudanças em `modulo:player_stats`, `modulo:boss_progress`, `modulo:player_gear` quebram saves existentes de jogadores
- **Refatorar nomes de eventos do EventBus** — strings de evento usadas em múltiplos arquivos
- **Alterar assinaturas de funções públicas** em `src/core/` (EventBus, FSM, TickManager, EntityRegistry, DirtyFlag, SaveSystem)
- **Reescrever um sistema inteiro** em vez de corrigir o problema específico solicitado
- **Fazer commit ou push** para qualquer branch
- **Instalar ou remover dependências** (`npm install`, `npm uninstall`)
- **Criar novos arquivos em `src/core/`** sem solicitação explícita

---

## 3. O que pode fazer livremente

- Ler qualquer arquivo do repositório
- Escrever arquivos de teste em `src/**/__tests__/`
- Criar novos arquivos em pastas de conteúdo (`src/bosses/`, `src/items/`, `src/portals/`, `src/missions/`)
- Adicionar comentários e JSDoc
- Corrigir erros de TypeScript apontados explicitamente na tarefa
- Criar stubs/rascunhos com `// TODO` para revisão humana

---

## 4. Escopo de cada tarefa

- Trabalhe **somente** nos arquivos relacionados à tarefa pedida
- Se encontrar um bug em outro arquivo durante o trabalho, **reporte no final da resposta** mas não corrija sem permissão
- Não faça "melhorias de oportunidade" em código não relacionado à tarefa atual

---

## 5. Padrões obrigatórios do projeto

### TypeScript

- Sem `any` implícito — use tipos explícitos ou `unknown` com narrowing
- Sem `// @ts-ignore` — corrija o tipo, não esconda o erro
- Todos os eventos do EventBus devem ter interface tipada em `src/types/events.ts`

### Bedrock Script API

- Nunca use `world.getAllPlayers()` em loop a cada tick — use o TickManager
- Acesso a Dynamic Properties sempre via `src/core/SaveSystem.ts` — nunca direto
- Máximo de **20 partículas simultâneas** por boss

### Arquitetura

- Toda comunicação entre sistemas via EventBus — sem imports circulares
- Novos bosses herdam do skeleton base correspondente (`src/bosses/base/`)
- FSM de boss: estados obrigatórios → `IDLE`, `COMBAT`, `STAGGER`, `DEAD`

---

## 6. Formato de resposta esperado

Para toda tarefa, estruture sua resposta assim:

```
### Entendimento da tarefa
[o que você interpretou que precisa ser feito]

### Testes que escreverei primeiro
[lista de casos de teste]

### Arquivos que serão criados/modificados
[lista de caminhos]

### Requer confirmação antes de prosseguir?
[Sim/Não — justifique se Sim]
```

Se **Sim** na confirmação — **pare aqui e aguarde**.

---

## 7. Quando a tarefa for ambígua

1. Liste as interpretações possíveis
2. Indique qual assumiria por padrão
3. **Pergunte antes de implementar**

---

## 8. Contexto do projeto

| Campo               | Valor                                               |
| ------------------- | --------------------------------------------------- |
| Projeto             | Echoes of Exile — Minecraft Bedrock Addon           |
| Stack               | TypeScript + Script API (Bedrock 1.21.0+)           |
| Ferramentas         | VSCode · Bridge · Blockbench · GitHub               |
| Equipe              | 2 desenvolvedores                                   |
| Save System         | Dynamic Properties via JSON.stringify — schema fixo |
| Comunicação interna | EventBus pub/sub — não viole esse padrão            |
| Branch principal    | `main` — nunca faça push direto sem confirmação     |

---

_Atualize este arquivo sempre que uma nova convenção for adotada no projeto._
