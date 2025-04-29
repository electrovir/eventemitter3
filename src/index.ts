import {type AnyFunction} from '@augment-vir/common';

/** Representation of a single event listener. */
class WrappedListener<EventTypes extends EventEmitter.ValidEventTypes> {
    constructor(
        public listener: EventEmitter.EventListener<EventTypes, any>,
        public context: unknown,
        public once: boolean = false,
    ) {}
}

/** Minimal `EventEmitter` interface that is molded against the Node.js `EventEmitter` interface. */
export class EventEmitter<
    EventTypes extends EventEmitter.ValidEventTypes = string | symbol,
    Context = any,
> {
    public static readonly prefixed = false;

    /**
     * Use Object.create(null) to create a truly empty object for storing events, avoiding potential
     * prototype pollution or interference from built-in Object properties.
     */
    public _events: Record<
        EventEmitter.EventNames<EventTypes>,
        WrappedListener<EventTypes> | WrappedListener<EventTypes>[] | undefined
    > = Object.create(null);
    public _eventsCount = 0;

    /** Add a listener for a given event. */
    #addListener(
        event: EventEmitter.EventNames<EventTypes>,
        listener: AnyFunction,
        context: unknown,
        once: boolean,
    ): this {
        if (typeof listener !== 'function') {
            throw new TypeError('The listener must be a function');
        }

        const wrappedListener = new WrappedListener(listener, context || this, once);

        const events = this._events[event];

        if (Array.isArray(events)) {
            /** Third or more listener for this event (pushing to existing array) */
            events.push(wrappedListener);
        } else if (events) {
            /** Second listener for this event (converting single EE to array) */
            this._events[event] = [
                events,
                wrappedListener,
            ];
        } else {
            /** First listener for this event */
            this._events[event] = wrappedListener;
            this._eventsCount++;
        }

        return this;
    }

    /** Clear event by name. */
    protected clearEvent(event: EventEmitter.EventNames<EventTypes>) {
        if (--this._eventsCount === 0) {
            this._events = Object.create(null); // Re-initialize
        } else {
            delete this._events[event];
        }
    }

    /** Return an array listing the events for which the emitter has registered listeners. */
    public eventNames(): EventEmitter.EventNames<EventTypes>[] {
        if (this._eventsCount === 0) {
            return [];
        }

        /**
         * Use `Reflect.ownKeys` to get both string and symbol properties directly from the _events
         * object.
         */
        return Reflect.ownKeys(this._events) as EventEmitter.EventNames<EventTypes>[];
    }

    /** Return the listeners registered for a given event. */
    public listeners<Event extends EventEmitter.EventNames<EventTypes>>(
        event: Event,
    ): EventEmitter.EventListener<EventTypes, Event>[] {
        const handlers = this._events[event];

        if (!handlers) {
            return [];
        } else if (Array.isArray(handlers)) {
            /** Array of listeners. */
            return handlers.map(
                (handler) => handler.listener as EventEmitter.EventListener<EventTypes, Event>,
            );
        } else {
            /** Single listener. */
            return [
                handlers.listener as EventEmitter.EventListener<EventTypes,
                    Event>,
            ];
        }
    }

    /** Return the number of listeners listening to a given event. */
    public listenerCount(event: EventEmitter.EventNames<EventTypes>): number {
        const listeners = this._events[event];

        if (!listeners) {
            return 0;
        } else if (Array.isArray(listeners)) {
            /** Array of listeners. */
            return listeners.length;
        } else {
            /** Single listener. */
            return 1;
        }
    }

    /** Calls each of the listeners registered for a given event. */
    public emit<Event extends EventEmitter.EventNames<EventTypes>>(
        event: Event,
        ...args: EventEmitter.EventArgs<EventTypes, Event>
    ): boolean {
        const listeners = this._events[event];

        if (!listeners) {
            return false;
        }

        if (Array.isArray(listeners)) {
            /** Multiple listeners (array) */

            /** Create a copy to avoid issues if listeners are removed during iteration. */
            const currentListeners = listeners.slice(0);

            currentListeners.forEach((listener) => {
                if (listener.once) {
                    this.removeListener(
                        event,
                        listener.listener as EventEmitter.EventListener<EventTypes, Event>,
                        undefined,
                        true,
                    );
                }

                (listener.listener as AnyFunction).call(listener.context, ...args);
            });
        } else {
            // Single listener
            if (listeners.once) {
                this.removeListener(
                    event,
                    listeners.listener as EventEmitter.EventListener<EventTypes, Event>,
                    undefined,
                    true,
                );
            }
            (listeners.listener as AnyFunction).call(listeners.context, ...args);
        }

        return true;
    }

    /** Add a listener for a given event. */
    public on<Event extends EventEmitter.EventNames<EventTypes>>(
        event: Event,
        listener: EventEmitter.EventListener<EventTypes, Event>,
        context?: Context,
    ): this {
        return this.#addListener(event, listener, context, false);
    }

    /** Add a one-time listener for a given event. */
    public once<Event extends EventEmitter.EventNames<EventTypes>>(
        event: Event,
        listener: EventEmitter.EventListener<EventTypes, Event>,
        context?: Context,
    ): this {
        return this.#addListener(event, listener, context, true);
    }

    /** Remove the listeners of a given event. */
    public removeListener<Event extends EventEmitter.EventNames<EventTypes>>(
        event: Event,
        listener?: EventEmitter.EventListener<EventTypes, Event>,
        context?: Context,
        once?: boolean,
    ): this {
        const wrappedListeners = this._events[event];

        if (!wrappedListeners) {
            return this;
        } else if (!listener) {
            this.clearEvent(event);
            return this;
        } else if (Array.isArray(wrappedListeners)) {
            const events: WrappedListener<EventTypes>[] = [];

            wrappedListeners.forEach((wrappedListener) => {
                if (
                    wrappedListener.listener !== listener ||
                    (once && !wrappedListener.once) ||
                    (context && wrappedListener.context !== context)
                ) {
                    events.push(wrappedListener);
                }
            });

            if (events.length) {
                this._events[event] = events.length === 1 ? events[0] : events;
            } else {
                this.clearEvent(event);
            }
        } else if (
            wrappedListeners.listener === listener &&
            (!once || wrappedListeners.once) &&
            (!context || wrappedListeners.context === context)
        ) {
            this.clearEvent(event);
        }

        return this;
    }

    /** Remove all listeners, or those of the specified event. */
    public removeAllListeners(event?: EventEmitter.EventNames<EventTypes>): this {
        if (event) {
            if (this._events[event]) {
                this.clearEvent(event);
            }
        } else {
            this._events = Object.create(null);
            this._eventsCount = 0;
        }

        return this;
    }

    /** Remove the listeners of a given event. */
    public off<Event extends EventEmitter.EventNames<EventTypes>>(
        event: Event,
        listener?: EventEmitter.EventListener<EventTypes, Event>,
        context?: Context,
        once?: boolean,
    ): this {
        return this.removeListener(event, listener, context, once);
    }

    /** Add a listener for a given event. */
    public addListener<Event extends EventEmitter.EventNames<EventTypes>>(
        event: Event,
        listener: EventEmitter.EventListener<EventTypes, Event>,
        context?: Context,
    ): this {
        return this.on(event, listener, context);
    }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace EventEmitter {
    export interface ListenerFn<Args extends any[] = any[]> {
        (...args: Args): void;
    }

    export interface EventEmitterStatic {
        new <EventTypes extends ValidEventTypes = string | symbol, Context = any>(): EventEmitter<
            EventTypes,
            Context
        >;
    }

    /**
     * `object` should be in either of the following forms:
     *
     *     interface EventTypes {
     *         'event-with-parameters': any[];
     *         'event-with-example-handler': (...args: any[]) => void;
     *     }
     */
    export type ValidEventTypes = string | symbol | object;

    export type EventNames<EventTypes extends ValidEventTypes> = EventTypes extends string | symbol
        ? EventTypes
        : keyof EventTypes;

    export type ArgumentMap<T extends object> = {
        [K in keyof T]: T[K] extends (...args: any[]) => void
            ? Parameters<T[K]>
            : T[K] extends any[]
              ? T[K]
              : any[];
    };

    export type EventListener<
        Event extends ValidEventTypes,
        K extends EventNames<Event>,
    > = Event extends string | symbol
        ? (...args: any[]) => void
        : (...args: ArgumentMap<Exclude<Event, string | symbol>>[Extract<K, keyof Event>]) => void;

    export type EventArgs<Event extends ValidEventTypes, K extends EventNames<Event>> = Parameters<
        EventListener<Event, K>
    >;
}

export default EventEmitter;
