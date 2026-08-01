type EventCallback = (...args: any[]) => void;

export class EventBus {
  private readonly map = new Map<string, EventCallback[]>();

  on(eventName: string, callback: EventCallback): void {
    if (!this.map.has(eventName)) {
      this.map.set(eventName, []);
    }
    this.map.get(eventName)!.push(callback);
  }

  off(eventName: string, callback: EventCallback): void {
    const list = this.map.get(eventName);
    if (!list) return;
    const index = list.indexOf(callback);
    if (index > -1) list.splice(index, 1);
  }

  emit(eventName: string, ...args: any[]): void {
    this.map.get(eventName)?.forEach((cb) => cb(...args));
  }

  offAll(): void {
    this.map.clear();
  }
}