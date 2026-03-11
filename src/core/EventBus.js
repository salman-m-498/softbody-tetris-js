/**
 * EventBus.js
 * Lightweight publish/subscribe event system.
 *
 * Usage:
 *   EventBus.on('player:died', handler);
 *   EventBus.emit('player:died', { score: 100 });
 *   EventBus.off('player:died', handler);
 *   EventBus.once('game:start', handler);
 */

class _EventBus {
    constructor() {
        this._listeners = new Map();
    }

    on(event, handler) {
        if (!this._listeners.has(event)) this._listeners.set(event, []);
        this._listeners.get(event).push({ handler, once: false });
        return () => this.off(event, handler); // returns unsubscribe fn
    }

    once(event, handler) {
        if (!this._listeners.has(event)) this._listeners.set(event, []);
        this._listeners.get(event).push({ handler, once: true });
    }

    off(event, handler) {
        if (!this._listeners.has(event)) return;
        const filtered = this._listeners.get(event).filter(l => l.handler !== handler);
        this._listeners.set(event, filtered);
    }

    emit(event, data) {
        if (!this._listeners.has(event)) return;
        const listeners = this._listeners.get(event).slice(); // snapshot
        const remaining = [];
        for (const entry of listeners) {
            entry.handler(data);
            if (!entry.once) remaining.push(entry);
        }
        this._listeners.set(event, remaining);
    }

    /** Remove all listeners for an event, or all events if omitted. */
    clear(event = null) {
        if (event) this._listeners.delete(event);
        else       this._listeners.clear();
    }
}

// Singleton — share across all modules via import
export const EventBus = new _EventBus();
