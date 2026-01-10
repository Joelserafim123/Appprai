// A simple event emitter for broadcasting errors throughout the app.
// This is used to decouple error reporting from the components that generate them.

type Listener = (data: any) => void;

class EventEmitter {
  private listeners: { [event: string]: Listener[] } = {};

  on(event: string, listener: Listener): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);

    // Return an unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    };
  }

  emit(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(data));
    }
  }
}

export const errorEmitter = new EventEmitter();
