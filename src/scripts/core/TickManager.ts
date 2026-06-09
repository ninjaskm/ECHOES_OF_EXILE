import { system } from "@minecraft/server";

interface TickTask {
  intervalTicks: number;
  callback: (currentTick: number) => void;
  lastRun: number;
}

export class TickManager {
  private readonly tasks = new Map<number, TickTask>();
  private nextId = 1;
  private started = false;

  every(intervalTicks: number, callback: (currentTick: number) => void): () => void {
    const id = this.nextId++;
    this.tasks.set(id, {
      intervalTicks: Math.max(1, intervalTicks),
      callback,
      lastRun: 0
    });
    return () => this.tasks.delete(id);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    system.runInterval(() => this.update(system.currentTick), 1);
  }

  update(currentTick: number): void {
    for (const task of this.tasks.values()) {
      if (currentTick - task.lastRun < task.intervalTicks) continue;
      task.lastRun = currentTick;

      try {
        task.callback(currentTick);
      } catch (error) {
        console.warn(`[Echoes of Exile] Tick task failed: ${error}`);
      }
    }
  }
}

export const tickManager = new TickManager();
