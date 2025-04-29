/* eslint-disable unicorn/prefer-event-target */
/* eslint-disable sonarjs/constructor-for-side-effects */

/**
 * These tests are copied from
 * https://github.com/primus/eventemitter3/blob/4e76a51d4af66f318e7d6b4f1c250ff05a51ff90/test/test.js
 * and heavily modified to fit a modern typescript testing runtime. The original code has the
 * following license:
 *
 *     The MIT License (MIT)
 *
 *     Copyright (c) 2014 Arnout Kazemier
 *
 *     Permission is hereby granted, free of charge, to any person obtaining a copy
 *     of this software and associated documentation files (the "Software"), to deal
 *     in the Software without restriction, including without limitation the rights
 *     to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *     copies of the Software, and to permit persons to whom the Software is
 *     furnished to do so, subject to the following conditions:
 *
 *     The above copyright notice and this permission notice shall be included in all
 *     copies or substantial portions of the Software.
 *
 *     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *     AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *     SOFTWARE.
 */

import {assert, waitUntil} from '@augment-vir/assert';
import {type AnyObject} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import * as StarImport from './index.js';
import EventEmitterDefault, {EventEmitter} from './index.js';

describe('EventEmitter', () => {
    it('exports `EventEmitter` as default export', () => {
        new EventEmitterDefault();
    });

    it('exports `EventEmitter` as a named export', () => {
        new EventEmitter();
    });

    it('exposes a `prefixed` property', () => {
        assert.isFalse(EventEmitter.prefixed);
    });

    it('exposes a module namespace object', () => {
        assert.strictEquals(StarImport.EventEmitter, EventEmitter);
    });

    it('works with ES6 symbols', () => {
        const emitter = new EventEmitter(),
            event = Symbol('cows'),
            unknown = Symbol('moo');

        emitter.on(event, function listener(arg) {
            assert.strictEquals(emitter.listenerCount(unknown), 0);
            assert.deepEquals(emitter.listeners(unknown), []);
            assert.strictEquals(arg, 'bar');

            function bar(arg: any) {
                assert.strictEquals(emitter.listenerCount(unknown), 0);
                assert.deepEquals(emitter.listeners(unknown), []);
                assert.strictEquals(arg, 'foo');
            }

            emitter.once(unknown, bar);

            assert.strictEquals(emitter.listenerCount(event), 1);
            assert.deepEquals(emitter.listeners(event), [listener]);
            assert.strictEquals(emitter.listenerCount(unknown), 1);
            assert.deepEquals(emitter.listeners(unknown), [bar]);

            emitter.removeListener(event);

            assert.strictEquals(emitter.listenerCount(event), 0);
            assert.deepEquals(emitter.listeners(event), []);
            assert.strictEquals(emitter.emit(unknown, 'foo'), true);
        });

        assert.strictEquals(emitter.emit(unknown, 'bar'), false);
        assert.strictEquals(emitter.emit(event, 'bar'), true);
    });

    describe('EventEmitter#emit', () => {
        it('should return false when there are not events to emit', () => {
            const emitter = new EventEmitter();

            assert.strictEquals(emitter.emit('foo'), false);
            assert.strictEquals(emitter.emit('bar'), false);
        });

        it('emits with context', async () => {
            const context = {bar: 'baz'};
            const emitter = new EventEmitter();

            let inner: {
                bar: string;
                context: typeof context;
            };

            emitter
                .on(
                    'foo',
                    function (this: typeof context, bar) {
                        inner = {
                            bar,
                            context: this,
                        };
                    },
                    context,
                )
                .emit('foo', 'bar');

            await waitUntil.deepEquals({bar: 'bar', context}, () => inner);
        });

        it('emits with context, multiple arguments (force apply)', async () => {
            const context = {bar: 'baz'};
            const emitter = new EventEmitter();

            let inner: {
                bar: string;
                context: typeof context;
            };

            emitter
                .on(
                    'foo',
                    function (this: typeof context, bar) {
                        inner = {
                            bar,
                            context: this,
                        };
                    },
                    context,
                )
                .emit('foo', 'bar', 1, 2, 3, 4, 5, 6, 7, 8, 9, 0);

            await waitUntil.deepEquals({bar: 'bar', context}, () => inner);
        });

        it('can emit the function with multiple arguments', () => {
            const emitter = new EventEmitter();

            for (let i = 0; i < 100; i++) {
                ((j) => {
                    const args: number[] = [];
                    for (let i = 0; i < j; i++) {
                        args.push(j);
                    }

                    emitter.once('args', function () {
                        assert.strictEquals(arguments.length, args.length);
                    });

                    emitter.emit('args', ...args);
                })(i);
            }
        });

        it('can emit the function with multiple arguments, multiple listeners', () => {
            const emitter = new EventEmitter();

            for (let i = 0; i < 100; i++) {
                ((j) => {
                    const args: number[] = [];
                    for (let i = 0; i < j; i++) {
                        args.push(j);
                    }

                    emitter.once('args', function () {
                        assert.strictEquals(arguments.length, args.length);
                    });

                    emitter.once('args', function () {
                        assert.strictEquals(arguments.length, args.length);
                    });

                    emitter.once('args', function () {
                        assert.strictEquals(arguments.length, args.length);
                    });

                    emitter.once('args', function () {
                        assert.strictEquals(arguments.length, args.length);
                    });

                    emitter.emit('args', ...args);
                })(i);
            }
        });

        it('emits with context, multiple listeners (force loop)', () => {
            const emitter = new EventEmitter();

            emitter.on(
                'foo',
                function (this: AnyObject, bar) {
                    assert.deepEquals(this, {foo: 'bar'});
                    assert.strictEquals(bar, 'bar');
                },
                {foo: 'bar'},
            );

            emitter.on(
                'foo',
                function (this: AnyObject, bar) {
                    assert.deepEquals(this, {bar: 'baz'});
                    assert.strictEquals(bar, 'bar');
                },
                {bar: 'baz'},
            );

            emitter.emit('foo', 'bar');
        });

        it('emits with different contexts', () => {
            const emitter = new EventEmitter();
            let pattern = '';

            function writer(this: string) {
                // eslint-disable-next-line @typescript-eslint/no-this-alias
                pattern += this;
            }

            emitter.on('write', writer, 'foo');
            emitter.on('write', writer, 'baz');
            emitter.once('write', writer, 'bar');
            emitter.once('write', writer, 'banana');

            emitter.emit('write');
            // cspell:ignore foobazbarbanana
            assert.strictEquals(pattern, 'foobazbarbanana');
        });

        it('should return true when there are events to emit', () => {
            const emitter = new EventEmitter();
            let called = 0;

            emitter.on('foo', () => {
                called++;
            });

            assert.strictEquals(emitter.emit('foo'), true);
            assert.strictEquals(emitter.emit('foo b'), false);
            assert.strictEquals(called, 1);
        });

        it('receives the emitted events', async () => {
            const emitter = new EventEmitter();

            let inner: Record<any, any> = {};

            emitter.on('data', function (a, b, c, d, undef) {
                inner = {
                    a,
                    b,
                    c,
                    d,
                    undef,
                    // eslint-disable-next-line prefer-rest-params
                    args: arguments,
                };
            });

            emitter.emit('data', 'foo', emitter, new Date());

            await waitUntil.isTrue(() => {
                const {a, b, c, undef, args} = inner;

                assert.strictEquals(a, 'foo');
                assert.strictEquals(b, emitter);
                assert.instanceOf(c, Date);
                assert.strictEquals(undef, undefined);
                assert.strictEquals(args.length, 3);
                return true;
            });
        });

        it('emits to all event listeners', () => {
            const emitter = new EventEmitter();
            const pattern: string[] = [];

            emitter.on('foo', () => {
                pattern.push('foo1');
            });

            emitter.on('foo', () => {
                pattern.push('foo2');
            });

            emitter.emit('foo');

            assert.strictEquals(pattern.join(';'), 'foo1;foo2');
        });

        it('can store event which is a known property', async () => {
            await Promise.all(
                [
                    'hasOwnProperty',
                    'constructor',
                    '__proto__',
                    'toString',
                    'toValue',
                    'unwatch',
                    'watch',
                ].map(async (key) => {
                    const emitter = new EventEmitter();

                    let innerKey: any;

                    emitter
                        .on(key, (k) => {
                            innerKey = k;
                        })
                        .emit(key, key);

                    await waitUntil.strictEquals(key, () => innerKey);
                }),
            );
        });
    });

    describe('EventEmitter#listeners', () => {
        it('returns an empty array if no listeners are specified', () => {
            const emitter = new EventEmitter();

            assert.isArray(emitter.listeners('foo'));
            assert.strictEquals(emitter.listeners('foo').length, 0);
        });

        it('returns an array of function', () => {
            const emitter = new EventEmitter();

            function foo() {}

            emitter.on('foo', foo);
            assert.isArray(emitter.listeners('foo'));
            assert.strictEquals(emitter.listeners('foo').length, 1);
            assert.deepEquals(emitter.listeners('foo'), [foo]);
        });

        it('is not vulnerable to modifications', () => {
            const emitter = new EventEmitter();

            function foo() {}

            emitter.on('foo', foo);

            assert.deepEquals(emitter.listeners('foo'), [foo]);

            emitter.listeners('foo').length = 0;
            assert.deepEquals(emitter.listeners('foo'), [foo]);
        });
    });

    describe('EventEmitter#listenerCount', () => {
        it('returns the number of listeners for a given event', () => {
            const emitter = new EventEmitter();

            assert.strictEquals(emitter.listenerCount('foo'), 0);

            emitter.addListener('foo', () => {});
            assert.strictEquals(emitter.listenerCount('foo'), 1);
            emitter.addListener('foo', () => {});
            assert.strictEquals(emitter.listenerCount('foo'), 2);
        });
    });

    describe('EventEmitter#on', () => {
        it('throws an error if the listener is not a function', () => {
            const emitter = new EventEmitter();

            assert.throws(
                () => {
                    // @ts-expect-error: intentionally incorrect listener
                    emitter.on('foo', 'bar');
                },
                {
                    matchConstructor: TypeError,
                    matchMessage: 'The listener must be a function',
                },
            );
        });
    });

    describe('EventEmitter#once', () => {
        it('only emits it once', () => {
            const emitter = new EventEmitter();
            let calls = 0;

            emitter.once('foo', () => {
                calls++;
            });

            emitter.emit('foo');
            emitter.emit('foo');
            emitter.emit('foo');
            emitter.emit('foo');
            emitter.emit('foo');

            assert.strictEquals(emitter.listeners('foo').length, 0);
            assert.strictEquals(calls, 1);
        });

        it('only emits once if emits are nested inside the listener', () => {
            const emitter = new EventEmitter();
            let calls = 0;

            emitter.once('foo', () => {
                calls++;
                emitter.emit('foo');
            });

            emitter.emit('foo');
            assert.strictEquals(emitter.listeners('foo').length, 0);
            assert.strictEquals(calls, 1);
        });

        it('only emits once for multiple events', () => {
            const emitter = new EventEmitter();
            let multi = 0;
            let foo = 0;
            let bar = 0;

            emitter.once('foo', () => {
                foo++;
            });

            emitter.once('foo', () => {
                bar++;
            });

            emitter.on('foo', () => {
                multi++;
            });

            emitter.emit('foo');
            emitter.emit('foo');
            emitter.emit('foo');
            emitter.emit('foo');
            emitter.emit('foo');

            assert.strictEquals(emitter.listeners('foo').length, 1);
            assert.strictEquals(multi, 5);
            assert.strictEquals(foo, 1);
            assert.strictEquals(bar, 1);
        });

        it('only emits once with context', async () => {
            const context = {bar: 'baz'};
            const emitter = new EventEmitter();

            let inner: {
                bar: string;
                context: typeof context;
            };

            emitter
                .once(
                    'foo',
                    function (this: typeof context, bar) {
                        inner = {
                            bar,
                            context: this,
                        };
                    },
                    context,
                )
                .emit('foo', 'bar');

            await waitUntil.deepEquals({bar: 'bar', context}, () => inner);
        });
    });

    describe('EventEmitter#removeListener', () => {
        it('removes all listeners when the listener is not specified', () => {
            const emitter = new EventEmitter();

            emitter.on('foo', () => {});
            emitter.on('foo', () => {});

            assert.strictEquals(emitter.removeListener('foo'), emitter);
            assert.deepEquals(emitter.listeners('foo'), []);
        });
        it('is aliased to off', () => {
            const emitter = new EventEmitter();

            emitter.on('foo', () => {});
            emitter.on('foo', () => {});

            assert.strictEquals(emitter.off('foo'), emitter);
            assert.deepEquals(emitter.listeners('foo'), []);
        });
        it('handles an event type with no listeners', () => {
            const emitter = new EventEmitter();

            assert.strictEquals(emitter.removeListener('fffffffffff'), emitter);
        });
        it('removes only the listeners matching the specified listener', () => {
            const emitter = new EventEmitter();

            function foo() {}
            function bar() {}
            function baz() {}

            emitter.on('foo', foo);
            emitter.on('bar', bar);
            emitter.on('bar', baz);

            assert.strictEquals(emitter.removeListener('foo', bar), emitter);
            assert.deepEquals(emitter.listeners('bar'), [
                bar,
                baz,
            ]);
            assert.deepEquals(emitter.listeners('foo'), [foo]);
            assert.strictEquals<number, number>(emitter._eventsCount, 2);

            assert.strictEquals(emitter.removeListener('foo', foo), emitter);
            assert.deepEquals(emitter.listeners('bar'), [
                bar,
                baz,
            ]);
            assert.deepEquals(emitter.listeners('foo'), []);
            assert.strictEquals<number, number>(emitter._eventsCount, 1);

            assert.strictEquals(emitter.removeListener('bar', bar), emitter);
            assert.deepEquals(emitter.listeners('bar'), [baz]);
            assert.strictEquals<number, number>(emitter._eventsCount, 1);

            assert.strictEquals(emitter.removeListener('bar', baz), emitter);
            assert.deepEquals(emitter.listeners('bar'), []);
            assert.strictEquals<number, number>(emitter._eventsCount, 0);

            emitter.on('foo', foo);
            emitter.on('foo', foo);
            emitter.on('bar', bar);

            assert.strictEquals(emitter.removeListener('foo', foo), emitter);
            assert.deepEquals(emitter.listeners('bar'), [bar]);
            assert.deepEquals(emitter.listeners('foo'), []);
            assert.strictEquals<number, number>(emitter._eventsCount, 1);
        });

        it('removes only the once listeners when using the once flag', () => {
            const emitter = new EventEmitter();

            function foo() {}

            emitter.on('foo', foo);

            assert.strictEquals(
                emitter.removeListener('foo', () => {}, undefined, true),
                emitter,
            );
            assert.deepEquals(emitter.listeners('foo'), [foo]);
            assert.strictEquals<number, number>(emitter._eventsCount, 1);

            assert.strictEquals(emitter.removeListener('foo', foo, undefined, true), emitter);
            assert.deepEquals(emitter.listeners('foo'), [foo]);
            assert.strictEquals<number, number>(emitter._eventsCount, 1);

            assert.strictEquals(emitter.removeListener('foo', foo), emitter);
            assert.deepEquals(emitter.listeners('foo'), []);
            assert.strictEquals<number, number>(emitter._eventsCount, 0);

            emitter.once('foo', foo);
            emitter.on('foo', foo);

            assert.strictEquals(
                emitter.removeListener('foo', () => {}, undefined, true),
                emitter,
            );
            assert.deepEquals(emitter.listeners('foo'), [
                foo,
                foo,
            ]);
            assert.strictEquals<number, number>(emitter._eventsCount, 1);

            assert.strictEquals(emitter.removeListener('foo', foo, undefined, true), emitter);
            assert.deepEquals(emitter.listeners('foo'), [foo]);
            assert.strictEquals<number, number>(emitter._eventsCount, 1);

            emitter.once('foo', foo);

            assert.strictEquals(emitter.removeListener('foo', foo), emitter);
            assert.deepEquals(emitter.listeners('foo'), []);
            assert.strictEquals<number, number>(emitter._eventsCount, 0);
        });

        it('removes only the listeners matching the correct context', () => {
            const context = {foo: 'bar'},
                emitter = new EventEmitter();

            function foo() {}
            function bar() {}

            emitter.on('foo', foo, context);

            assert.strictEquals(
                emitter.removeListener('foo', () => {}, context),
                emitter,
            );
            assert.deepEquals(emitter.listeners('foo'), [foo]);
            assert.strictEquals<number, number>(emitter._eventsCount, 1);

            assert.strictEquals(emitter.removeListener('foo', foo, {baz: 'quux'}), emitter);
            assert.deepEquals(emitter.listeners('foo'), [foo]);
            assert.strictEquals<number, number>(emitter._eventsCount, 1);

            assert.strictEquals(emitter.removeListener('foo', foo, context), emitter);
            assert.deepEquals(emitter.listeners('foo'), []);
            assert.strictEquals<number, number>(emitter._eventsCount, 0);

            emitter.on('foo', foo, context);
            emitter.on('foo', bar);

            assert.strictEquals(emitter.removeListener('foo', foo, {baz: 'quux'}), emitter);
            assert.deepEquals(emitter.listeners('foo'), [
                foo,
                bar,
            ]);
            assert.strictEquals<number, number>(emitter._eventsCount, 1);

            assert.strictEquals(emitter.removeListener('foo', foo, context), emitter);
            assert.deepEquals(emitter.listeners('foo'), [bar]);
            assert.strictEquals<number, number>(emitter._eventsCount, 1);

            emitter.on('foo', bar, context);

            assert.strictEquals(emitter.removeListener('foo', bar), emitter);
            assert.deepEquals(emitter.listeners('foo'), []);
            assert.strictEquals<number, number>(emitter._eventsCount, 0);
        });
    });

    describe('EventEmitter#removeAllListeners', () => {
        it('removes all events for the specified events', () => {
            const emitter = new EventEmitter();

            emitter.on('foo', () => {
                throw new Error('oops');
            });
            emitter.on('foo', () => {
                throw new Error('oops');
            });
            emitter.on('bar', () => {
                throw new Error('oops');
            });
            emitter.on('aaa', () => {
                throw new Error('oops');
            });

            assert.strictEquals(emitter.removeAllListeners('foo'), emitter);
            assert.strictEquals(emitter.listeners('foo').length, 0);
            assert.strictEquals(emitter.listeners('bar').length, 1);
            assert.strictEquals(emitter.listeners('aaa').length, 1);
            assert.strictEquals<number, number>(emitter._eventsCount, 2);

            assert.strictEquals(emitter.removeAllListeners('bar'), emitter);
            assert.strictEquals<number, number>(emitter._eventsCount, 1);
            assert.strictEquals(emitter.removeAllListeners('aaa'), emitter);
            assert.strictEquals<number, number>(emitter._eventsCount, 0);

            assert.strictEquals(emitter.emit('foo'), false);
            assert.strictEquals(emitter.emit('bar'), false);
            assert.strictEquals(emitter.emit('aaa'), false);
        });

        it('just nukes the fuck out of everything', () => {
            const emitter = new EventEmitter();

            emitter.on('foo', () => {
                throw new Error('oops');
            });
            emitter.on('foo', () => {
                throw new Error('oops');
            });
            emitter.on('bar', () => {
                throw new Error('oops');
            });
            emitter.on('aaa', () => {
                throw new Error('oops');
            });

            assert.strictEquals(emitter.removeAllListeners(), emitter);
            assert.strictEquals(emitter.listeners('foo').length, 0);
            assert.strictEquals(emitter.listeners('bar').length, 0);
            assert.strictEquals(emitter.listeners('aaa').length, 0);
            assert.strictEquals<number, number>(emitter._eventsCount, 0);

            assert.strictEquals(emitter.emit('foo'), false);
            assert.strictEquals(emitter.emit('bar'), false);
            assert.strictEquals(emitter.emit('aaa'), false);
        });
    });

    describe('EventEmitter#eventNames', () => {
        it('returns an empty array when there are no events', () => {
            const emitter = new EventEmitter();

            assert.deepEquals(emitter.eventNames(), []);

            emitter.on('foo', () => {});
            emitter.removeAllListeners('foo');

            assert.deepEquals(emitter.eventNames(), []);
        });

        it('returns an array listing the events that have listeners', () => {
            const emitter = new EventEmitter();

            function bar() {}

            emitter.on('foo', () => {});
            emitter.on('bar', bar);

            assert.deepEquals(emitter.eventNames(), [
                'foo',
                'bar',
            ]);
            emitter.removeListener('bar', bar);
            assert.deepEquals(emitter.eventNames(), ['foo']);
        });

        it('does not return inherited property identifiers', () => {
            const emitter = new EventEmitter();

            class Collection {
                foo() {
                    return 'foo';
                }
            }

            emitter._events = new Collection() as any;

            assert.strictEquals((emitter._events.foo as any)(), 'foo');
            assert.deepEquals(emitter.eventNames(), []);
        });

        it('includes ES6 symbols', () => {
            const emitter = new EventEmitter(),
                s = Symbol('s');

            function foo() {}

            emitter.on('foo', foo);
            emitter.on(s, () => {});

            assert.deepEquals(emitter.eventNames(), [
                'foo',
                s,
            ]);

            emitter.removeListener('foo', foo);

            assert.deepEquals(emitter.eventNames(), [s]);
        });
    });
});
