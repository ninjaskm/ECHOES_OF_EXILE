export interface StateDefinition<TContext> {
  onEnter?: (context: TContext, fsm: StateMachine<TContext>) => void;
  onExit?: (context: TContext, fsm: StateMachine<TContext>) => void;
  onTick?: (context: TContext, fsm: StateMachine<TContext>) => void;
}

export type StateDefinitions<TContext> = Record<string, StateDefinition<TContext>>;

export interface StateMachineOptions<TContext> {
  initialState: string;
  states: StateDefinitions<TContext>;
  context: TContext;
}

export class StateMachine<TContext> {
  state: string;
  readonly states: StateDefinitions<TContext>;
  readonly context: TContext;
  elapsedTicks = 0;

  constructor({ initialState, states, context }: StateMachineOptions<TContext>) {
    this.state = initialState;
    this.states = states;
    this.context = context;
    this.states[this.state]?.onEnter?.(this.context, this);
  }

  transition(nextState: string): void {
    if (nextState === this.state || !this.states[nextState]) return;
    this.states[this.state]?.onExit?.(this.context, this);
    this.state = nextState;
    this.elapsedTicks = 0;
    this.states[this.state]?.onEnter?.(this.context, this);
  }

  update(): void {
    this.elapsedTicks += 1;
    this.states[this.state]?.onTick?.(this.context, this);
  }
}
