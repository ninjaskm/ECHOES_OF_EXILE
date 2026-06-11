declare module "@minecraft/server" {
  export interface Vector3 {
    x: number;
    y: number;
    z: number;
  }

  export interface VectorXZ {
    x: number;
    z: number;
  }

  export interface WorldInitializeAfterEvent {}

  export interface ItemStack {
    typeId: string;
  }

  export interface EntityItemComponent {
    itemStack: ItemStack;
  }

  export interface EntityHealthComponent {
    currentValue: number;
    setCurrentValue(value: number): void;
  }

  export interface Entity {
    readonly id: string;
    readonly typeId: string;
    nameTag: string;
    readonly location: Vector3;
    readonly dimension: Dimension;
    readonly isValid: boolean;
    remove(): void;
    getComponent(componentId: "minecraft:item"): EntityItemComponent | undefined;
    getComponent(componentId: "minecraft:health"): EntityHealthComponent | undefined;
    getComponent(componentId: string): unknown;
    applyKnockback(horizontalForce: VectorXZ, verticalStrength: number): void;
    applyKnockback(directionX: number, directionZ: number, horizontalStrength: number, verticalStrength: number): void;
    applyDamage(amount: number, options?: DamageOptions): void;
    addEffect(effectType: string, duration: number, options?: EffectOptions): void;
    runCommand(command: string): unknown;
  }

  export interface ScreenDisplay {
    setActionBar(text: string): void;
    setTitle(text: string): void;
  }

  export interface Player extends Entity {
    readonly typeId: "minecraft:player";
    readonly isJumping: boolean;
    readonly onScreenDisplay: ScreenDisplay;
    sendMessage(message: string): void;
    playSound(soundId: string): void;
    getViewDirection(): Vector3;
    setDynamicProperty(identifier: string, value: string | number | boolean | undefined): void;
    getDynamicProperty(identifier: string): string | number | boolean | undefined;
  }

  export interface Dimension {
    readonly id: string;
    spawnEntity(identifier: string, location: Vector3): Entity;
    spawnParticle(effectName: string, location: Vector3): void;
    getEntities(options?: EntityQueryOptions): Entity[];
    runCommand(command: string): unknown;
  }

  export interface EntityQueryOptions {
    type?: string;
    location?: Vector3;
    maxDistance?: number;
  }

  export interface EffectOptions {
    amplifier?: number;
    showParticles?: boolean;
  }

  export interface DamageOptions {
    cause?: string;
    damagingEntity?: Entity;
  }

  export interface EntityDieAfterEvent {
    deadEntity: Entity;
    damageSource?: {
      damagingEntity?: Entity;
    };
  }

  export interface PlayerSpawnAfterEvent {
    player: Player;
    initialSpawn: boolean;
  }

  export interface ItemUseAfterEvent {
    source: Entity;
    itemStack: ItemStack;
  }

  export interface ScriptEventCommandMessageAfterEvent {
    id: string;
    sourceEntity?: Entity;
  }

  export interface EventSignal<T> {
    subscribe(callback: (event: T) => void): void;
  }

  export interface World {
    afterEvents: {
      worldInitialize: EventSignal<WorldInitializeAfterEvent>;
      playerSpawn: EventSignal<PlayerSpawnAfterEvent>;
      entityDie: EventSignal<EntityDieAfterEvent>;
      itemUse: EventSignal<ItemUseAfterEvent>;
    };
    getAllPlayers(): Player[];
    getDynamicProperty(identifier: string): string | number | boolean | undefined;
    setDynamicProperty(identifier: string, value: string | number | boolean | undefined): void;
  }

  export interface System {
    readonly currentTick: number;
    run(callback: () => void): number;
    runInterval(callback: () => void, tickInterval: number): number;
    runTimeout(callback: () => void, tickDelay: number): number;
    afterEvents: {
      scriptEventReceive: EventSignal<ScriptEventCommandMessageAfterEvent>;
    };
  }

  export const world: World;
  export const system: System;
}
