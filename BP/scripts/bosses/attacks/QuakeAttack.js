export class QuakeAttack {
    config;
    id = "quake";
    states = new Map();
    constructor(config) {
        this.config = config;
    }
    onEnter(context) {
        this.states.set(context.boss.id, {
            groundY: context.boss.location.y,
            impacted: false
        });
        context.arenaMessage(this.config.message);
        try {
            context.boss.dimension.runCommand(`playsound ${this.config.sound} @a ${context.boss.location.x} ${context.boss.location.y} ${context.boss.location.z}`);
        }
        catch {
            // Combat sounds are best-effort.
        }
        try {
            context.boss.runCommand(`tp @s ${context.boss.location.x} ${context.boss.location.y + this.config.jumpHeight} ${context.boss.location.z}`);
        }
        catch {
            // Jump movement is visual/balance feedback; the quake still resolves through the attack timer.
        }
    }
    onTick(context) {
        const state = this.states.get(context.boss.id);
        if (!state)
            return context.finish();
        if (!state.impacted && this.shouldImpact(context, state)) {
            this.impact(context);
            state.impacted = true;
        }
        if (context.elapsedTicks > this.config.totalTicks) {
            this.states.delete(context.boss.id);
            context.finish();
        }
    }
    shouldImpact(context, state) {
        const hadAirTime = context.elapsedTicks >= this.config.minAirTicks;
        const landed = context.boss.location.y <= state.groundY + 0.2;
        const timedOut = context.elapsedTicks >= this.config.maxAirTicks;
        return hadAirTime && (landed || timedOut);
    }
    impact(context) {
        try {
            context.boss.dimension.runCommand(`particle minecraft:huge_explosion_emitter ${context.boss.location.x} ${context.boss.location.y} ${context.boss.location.z}`);
        }
        catch {
            // Combat particles are visual-only.
        }
        this.shakeCamera(context);
        context.damagePlayersNear(this.config.radius, this.config.damage, this.config.effect);
    }
    shakeCamera(context) {
        if (!this.config.cameraShake)
            return;
        try {
            context.boss.dimension.runCommand(`execute positioned ${context.boss.location.x} ${context.boss.location.y} ${context.boss.location.z} run camerashake add @a[r=${this.config.radius}] ${this.config.cameraShake.intensity} ${this.config.cameraShake.seconds} positional`);
        }
        catch {
            // Camera shake is optional feedback; unsupported commands should not break the quake.
        }
    }
}
