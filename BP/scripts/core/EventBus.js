export class EventBus {
    listeners = new Map();
    subscribe(eventName, handler) {
        const handlers = this.listeners.get(eventName) ?? new Set();
        handlers.add(handler);
        this.listeners.set(eventName, handlers);
        return () => this.unsubscribe(eventName, handler);
    }
    unsubscribe(eventName, handler) {
        this.listeners.get(eventName)?.delete(handler);
    }
    publish(eventName, payload) {
        const handlers = this.listeners.get(eventName);
        if (!handlers)
            return;
        for (const handler of handlers) {
            try {
                handler(payload);
            }
            catch (error) {
                console.warn(`[Echoes of Exile] EventBus error on ${eventName}: ${error}`);
            }
        }
    }
}
export const eventBus = new EventBus();
