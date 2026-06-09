import type { EventMap, EventName, EventPayload } from "../types.js";

export class EventBus {
  private readonly listeners = new Map<EventName, Set<(payload: EventMap[EventName]) => void>>();

  subscribe<TEventName extends EventName>(
    eventName: TEventName,
    handler: (payload: EventPayload<TEventName>) => void
  ): () => void {
    const handlers = this.listeners.get(eventName) ?? new Set();
    handlers.add(handler as (payload: EventMap[EventName]) => void);
    this.listeners.set(eventName, handlers);

    return () => this.unsubscribe(eventName, handler);
  }

  unsubscribe<TEventName extends EventName>(
    eventName: TEventName,
    handler: (payload: EventPayload<TEventName>) => void
  ): void {
    this.listeners.get(eventName)?.delete(handler as (payload: EventMap[EventName]) => void);
  }

  publish<TEventName extends EventName>(eventName: TEventName, payload: EventPayload<TEventName>): void {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (error) {
        console.warn(`[Echoes of Exile] EventBus error on ${eventName}: ${error}`);
      }
    }
  }
}

export const eventBus = new EventBus();
