export class StateMachine {
    state;
    states;
    context;
    elapsedTicks = 0;
    constructor({ initialState, states, context }) {
        this.state = initialState;
        this.states = states;
        this.context = context;
        this.states[this.state]?.onEnter?.(this.context, this);
    }
    transition(nextState) {
        if (nextState === this.state || !this.states[nextState])
            return;
        this.states[this.state]?.onExit?.(this.context, this);
        this.state = nextState;
        this.elapsedTicks = 0;
        this.states[this.state]?.onEnter?.(this.context, this);
    }
    update() {
        this.elapsedTicks += 1;
        this.states[this.state]?.onTick?.(this.context, this);
    }
}
