type SelectableType = "node" | "anchorPoint" | "connection" | null;

export class SelectionManager {
  private selectedType: SelectableType = null;
  private selectedId: string | null = null;

  private listeners: Set<() => void> = new Set();

  // 订阅选中变更
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  getSelection(): { type: SelectableType; id: string | null } {
    return { type: this.selectedType, id: this.selectedId };
  }

  select(type: SelectableType, id: string | null) {
    this.selectedType = type;
    this.selectedId = id;
    this.notify();
  }

  clear() {
    this.selectedType = null;
    this.selectedId = null;
    this.notify();
  }

  isSelected(type: SelectableType, id: string): boolean {
    return this.selectedType === type && this.selectedId === id;
  }
}