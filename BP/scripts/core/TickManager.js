import { system } from "@minecraft/server";
export class TickManager {
    tasks = new Map();
    nextId = 1;
    started = false;
    every(intervalTicks, callback) {
        const id = this.nextId++;
        this.tasks.set(id, {
            intervalTicks: Math.max(1, intervalTicks),
            callback,
            lastRun: 0
        });
        return () => this.tasks.delete(id);
    }
    start() {
        if (this.started)
            return;
        this.started = true;
        system.runInterval(() => this.update(system.currentTick), 1);
    }
    update(currentTick) {
        for (const task of this.tasks.values()) {
            if (currentTick - task.lastRun < task.intervalTicks)
                continue;
            task.lastRun = currentTick;
            try {
                task.callback(currentTick);
            }
            catch (error) {
                console.warn(`[Echoes of Exile] Tick task failed: ${error}`);
            }
        }
    }
}
export const tickManager = new TickManager();
