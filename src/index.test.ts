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
        assert.isTrue(EventEmitter.prefixed === false || EventEmitter.prefixed === '~');
    });

    it('exposes a module namespace object', () => {
        assert.strictEquals(StarImport.EventEmitter, EventEmitter);
    });

    it('works with ES6 symbols', () => {
        var e = new EventEmitter(),
            event = Symbol('cows'),
            unknown = Symbol('moo');

        e.on(event, function listener(arg) {
            assert.strictEquals(e.listenerCount(unknown), 0);
            assert.deepEquals(e.listeners(unknown), []);
            assert.strictEquals(arg, 'bar');

            function bar(onced) {
                assert.strictEquals(e.listenerCount(unknown), 0);
                assert.deepEquals(e.listeners(unknown), []);
                assert.strictEquals(onced, 'foo');
            }

            e.once(unknown, bar);

            assert.strictEquals(e.listenerCount(event), 1);
            assert.deepEquals(e.listeners(event), [listener]);
            assert.strictEquals(e.listenerCount(unknown), 1);
            assert.deepEquals(e.listeners(unknown), [bar]);

            e.removeListener(event);

            assert.strictEquals(e.listenerCount(event), 0);
            assert.deepEquals(e.listeners(event), []);
            assert.strictEquals(e.emit(unknown, 'foo'), true);
        });

        assert.strictEquals(e.emit(unknown, 'bar'), false);
        assert.strictEquals(e.emit(event, 'bar'), true);
    });

    describe('EventEmitter#emit', () => {
        it('should return false when there are not events to emit', () => {
            var e = new EventEmitter();

            assert.strictEquals(e.emit('foo'), false);
            assert.strictEquals(e.emit('bar'), false);
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
                    function (bar) {
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
                    function (bar) {
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
            var e = new EventEmitter();

            for (var i = 0; i < 100; i++) {
                ((j) => {
                    for (var i = 0, args = []; i < j; i++) {
                        args.push(j);
                    }

                    e.once('args', function () {
                        assert.strictEquals(arguments.length, args.length);
                    });

                    e.emit.apply(e, ['args'].concat(args));
                })(i);
            }
        });

        it('can emit the function with multiple arguments, multiple listeners', () => {
            var e = new EventEmitter();

            for (var i = 0; i < 100; i++) {
                ((j) => {
                    for (var i = 0, args = []; i < j; i++) {
                        args.push(j);
                    }

                    e.once('args', function () {
                        assert.strictEquals(arguments.length, args.length);
                    });

                    e.once('args', function () {
                        assert.strictEquals(arguments.length, args.length);
                    });

                    e.once('args', function () {
                        assert.strictEquals(arguments.length, args.length);
                    });

                    e.once('args', function () {
                        assert.strictEquals(arguments.length, args.length);
                    });

                    e.emit.apply(e, ['args'].concat(args));
                })(i);
            }
        });

        it('emits with context, multiple listeners (force loop)', () => {
            var e = new EventEmitter();

            e.on(
                'foo',
                function (bar) {
                    assert.deepEquals(this, {foo: 'bar'});
                    assert.strictEquals(bar, 'bar');
                },
                {foo: 'bar'},
            );

            e.on(
                'foo',
                function (bar) {
                    assert.deepEquals(this, {bar: 'baz'});
                    assert.strictEquals(bar, 'bar');
                },
                {bar: 'baz'},
            );

            e.emit('foo', 'bar');
        });

        it('emits with different contexts', () => {
            var e = new EventEmitter(),
                pattern = '';

            function writer() {
                pattern += this;
            }

            e.on('write', writer, 'foo');
            e.on('write', writer, 'baz');
            e.once('write', writer, 'bar');
            e.once('write', writer, 'banana');

            e.emit('write');
            assert.strictEquals(pattern, 'foobazbarbanana');
        });

        it('should return true when there are events to emit', () => {
            var e = new EventEmitter(),
                called = 0;

            e.on('foo', () => {
                called++;
            });

            assert.strictEquals(e.emit('foo'), true);
            assert.strictEquals(e.emit('foob'), false);
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
            var e = new EventEmitter(),
                pattern = [];

            e.on('foo', () => {
                pattern.push('foo1');
            });

            e.on('foo', () => {
                pattern.push('foo2');
            });

            e.emit('foo');

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
                    var e = new EventEmitter();

                    let innerKey: any;

                    e.on(key, (k) => {
                        innerKey = k;
                    }).emit(key, key);

                    await waitUntil.strictEquals(key, () => innerKey);
                }),
            );
        });
    });

    describe('EventEmitter#listeners', () => {
        it('returns an empty array if no listeners are specified', () => {
            var e = new EventEmitter();

            assert.isArray(e.listeners('foo'));
            assert.strictEquals(e.listeners('foo').length, 0);
        });

        it('returns an array of function', () => {
            var e = new EventEmitter();

            function foo() {}

            e.on('foo', foo);
            assert.isArray(e.listeners('foo'));
            assert.strictEquals(e.listeners('foo').length, 1);
            assert.deepEquals(e.listeners('foo'), [foo]);
        });

        it('is not vulnerable to modifications', () => {
            var e = new EventEmitter();

            function foo() {}

            e.on('foo', foo);

            assert.deepEquals(e.listeners('foo'), [foo]);

            e.listeners('foo').length = 0;
            assert.deepEquals(e.listeners('foo'), [foo]);
        });
    });

    describe('EventEmitter#listenerCount', () => {
        it('returns the number of listeners for a given event', () => {
            var e = new EventEmitter();

            assert.strictEquals(e.listenerCount(), 0);
            assert.strictEquals(e.listenerCount('foo'), 0);

            e.on('foo', () => {});
            assert.strictEquals(e.listenerCount('foo'), 1);
            e.on('foo', () => {});
            assert.strictEquals(e.listenerCount('foo'), 2);
        });
    });

    describe('EventEmitter#on', () => {
        it('throws an error if the listener is not a function', () => {
            var e = new EventEmitter();

            try {
                e.on('foo', 'bar');
            } catch (ex) {
                assert.instanceOf(ex, TypeError);
                assert.strictEquals(ex.message, 'The listener must be a function');
                return;
            }

            throw new Error('oops');
        });
    });

    describe('EventEmitter#once', () => {
        it('only emits it once', () => {
            var e = new EventEmitter(),
                calls = 0;

            e.once('foo', () => {
                calls++;
            });

            e.emit('foo');
            e.emit('foo');
            e.emit('foo');
            e.emit('foo');
            e.emit('foo');

            assert.strictEquals(e.listeners('foo').length, 0);
            assert.strictEquals(calls, 1);
        });

        it('only emits once if emits are nested inside the listener', () => {
            var e = new EventEmitter(),
                calls = 0;

            e.once('foo', () => {
                calls++;
                e.emit('foo');
            });

            e.emit('foo');
            assert.strictEquals(e.listeners('foo').length, 0);
            assert.strictEquals(calls, 1);
        });

        it('only emits once for multiple events', () => {
            var e = new EventEmitter(),
                multi = 0,
                foo = 0,
                bar = 0;

            e.once('foo', () => {
                foo++;
            });

            e.once('foo', () => {
                bar++;
            });

            e.on('foo', () => {
                multi++;
            });

            e.emit('foo');
            e.emit('foo');
            e.emit('foo');
            e.emit('foo');
            e.emit('foo');

            assert.strictEquals(e.listeners('foo').length, 1);
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
                    function (bar) {
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
            var e = new EventEmitter();

            e.on('foo', () => {});
            e.on('foo', () => {});

            assert.strictEquals(e.removeListener('foo'), e);
            assert.deepEquals(e.listeners('foo'), []);
        });

        it('removes only the listeners matching the specified listener', () => {
            var e = new EventEmitter();

            function foo() {}
            function bar() {}
            function baz() {}

            e.on('foo', foo);
            e.on('bar', bar);
            e.on('bar', baz);

            assert.strictEquals(e.removeListener('foo', bar), e);
            assert.deepEquals(e.listeners('bar'), [
                bar,
                baz,
            ]);
            assert.deepEquals(e.listeners('foo'), [foo]);
            assert.strictEquals(e._eventsCount, 2);

            assert.strictEquals(e.removeListener('foo', foo), e);
            assert.deepEquals(e.listeners('bar'), [
                bar,
                baz,
            ]);
            assert.deepEquals(e.listeners('foo'), []);
            assert.strictEquals(e._eventsCount, 1);

            assert.strictEquals(e.removeListener('bar', bar), e);
            assert.deepEquals(e.listeners('bar'), [baz]);
            assert.strictEquals(e._eventsCount, 1);

            assert.strictEquals(e.removeListener('bar', baz), e);
            assert.deepEquals(e.listeners('bar'), []);
            assert.strictEquals(e._eventsCount, 0);

            e.on('foo', foo);
            e.on('foo', foo);
            e.on('bar', bar);

            assert.strictEquals(e.removeListener('foo', foo), e);
            assert.deepEquals(e.listeners('bar'), [bar]);
            assert.deepEquals(e.listeners('foo'), []);
            assert.strictEquals(e._eventsCount, 1);
        });

        it('removes only the once listeners when using the once flag', () => {
            var e = new EventEmitter();

            function foo() {}

            e.on('foo', foo);

            assert.strictEquals(
                e.removeListener('foo', () => {}, undefined, true),
                e,
            );
            assert.deepEquals(e.listeners('foo'), [foo]);
            assert.strictEquals(e._eventsCount, 1);

            assert.strictEquals(e.removeListener('foo', foo, undefined, true), e);
            assert.deepEquals(e.listeners('foo'), [foo]);
            assert.strictEquals(e._eventsCount, 1);

            assert.strictEquals(e.removeListener('foo', foo), e);
            assert.deepEquals(e.listeners('foo'), []);
            assert.strictEquals(e._eventsCount, 0);

            e.once('foo', foo);
            e.on('foo', foo);

            assert.strictEquals(
                e.removeListener('foo', () => {}, undefined, true),
                e,
            );
            assert.deepEquals(e.listeners('foo'), [
                foo,
                foo,
            ]);
            assert.strictEquals(e._eventsCount, 1);

            assert.strictEquals(e.removeListener('foo', foo, undefined, true), e);
            assert.deepEquals(e.listeners('foo'), [foo]);
            assert.strictEquals(e._eventsCount, 1);

            e.once('foo', foo);

            assert.strictEquals(e.removeListener('foo', foo), e);
            assert.deepEquals(e.listeners('foo'), []);
            assert.strictEquals(e._eventsCount, 0);
        });

        it('removes only the listeners matching the correct context', () => {
            var context = {foo: 'bar'},
                e = new EventEmitter();

            function foo() {}
            function bar() {}

            e.on('foo', foo, context);

            assert.strictEquals(
                e.removeListener('foo', () => {}, context),
                e,
            );
            assert.deepEquals(e.listeners('foo'), [foo]);
            assert.strictEquals(e._eventsCount, 1);

            assert.strictEquals(e.removeListener('foo', foo, {baz: 'quux'}), e);
            assert.deepEquals(e.listeners('foo'), [foo]);
            assert.strictEquals(e._eventsCount, 1);

            assert.strictEquals(e.removeListener('foo', foo, context), e);
            assert.deepEquals(e.listeners('foo'), []);
            assert.strictEquals(e._eventsCount, 0);

            e.on('foo', foo, context);
            e.on('foo', bar);

            assert.strictEquals(e.removeListener('foo', foo, {baz: 'quux'}), e);
            assert.deepEquals(e.listeners('foo'), [
                foo,
                bar,
            ]);
            assert.strictEquals(e._eventsCount, 1);

            assert.strictEquals(e.removeListener('foo', foo, context), e);
            assert.deepEquals(e.listeners('foo'), [bar]);
            assert.strictEquals(e._eventsCount, 1);

            e.on('foo', bar, context);

            assert.strictEquals(e.removeListener('foo', bar), e);
            assert.deepEquals(e.listeners('foo'), []);
            assert.strictEquals(e._eventsCount, 0);
        });
    });

    describe('EventEmitter#removeAllListeners', () => {
        it('removes all events for the specified events', () => {
            var e = new EventEmitter();

            e.on('foo', () => {
                throw new Error('oops');
            });
            e.on('foo', () => {
                throw new Error('oops');
            });
            e.on('bar', () => {
                throw new Error('oops');
            });
            e.on('aaa', () => {
                throw new Error('oops');
            });

            assert.strictEquals(e.removeAllListeners('foo'), e);
            assert.strictEquals(e.listeners('foo').length, 0);
            assert.strictEquals(e.listeners('bar').length, 1);
            assert.strictEquals(e.listeners('aaa').length, 1);
            assert.strictEquals(e._eventsCount, 2);

            assert.strictEquals(e.removeAllListeners('bar'), e);
            assert.strictEquals(e._eventsCount, 1);
            assert.strictEquals(e.removeAllListeners('aaa'), e);
            assert.strictEquals(e._eventsCount, 0);

            assert.strictEquals(e.emit('foo'), false);
            assert.strictEquals(e.emit('bar'), false);
            assert.strictEquals(e.emit('aaa'), false);
        });

        it('just nukes the fuck out of everything', () => {
            var e = new EventEmitter();

            e.on('foo', () => {
                throw new Error('oops');
            });
            e.on('foo', () => {
                throw new Error('oops');
            });
            e.on('bar', () => {
                throw new Error('oops');
            });
            e.on('aaa', () => {
                throw new Error('oops');
            });

            assert.strictEquals(e.removeAllListeners(), e);
            assert.strictEquals(e.listeners('foo').length, 0);
            assert.strictEquals(e.listeners('bar').length, 0);
            assert.strictEquals(e.listeners('aaa').length, 0);
            assert.strictEquals(e._eventsCount, 0);

            assert.strictEquals(e.emit('foo'), false);
            assert.strictEquals(e.emit('bar'), false);
            assert.strictEquals(e.emit('aaa'), false);
        });
    });

    describe('EventEmitter#eventNames', () => {
        it('returns an empty array when there are no events', () => {
            var e = new EventEmitter();

            assert.deepEquals(e.eventNames(), []);

            e.on('foo', () => {});
            e.removeAllListeners('foo');

            assert.deepEquals(e.eventNames(), []);
        });

        it('returns an array listing the events that have listeners', () => {
            var e = new EventEmitter(),
                original;

            function bar() {}

            e.on('foo', () => {});
            e.on('bar', bar);

            try {
                assert.deepEquals(e.eventNames(), [
                    'foo',
                    'bar',
                ]);
                e.removeListener('bar', bar);
                assert.deepEquals(e.eventNames(), ['foo']);
            } catch (ex) {
                throw ex;
            }
        });

        it('does not return inherited property identifiers', () => {
            var e = new EventEmitter();

            class Collection {
                foo() {
                    return 'foo';
                }
            }

            e._events = new Collection();

            assert.strictEquals(e._events.foo(), 'foo');
            assert.deepEquals(e.eventNames(), []);
        });

        if ('undefined' !== typeof Symbol)
            it('includes ES6 symbols', () => {
                var e = new EventEmitter(),
                    s = Symbol('s');

                function foo() {}

                e.on('foo', foo);
                e.on(s, () => {});

                assert.deepEquals(e.eventNames(), [
                    'foo',
                    s,
                ]);

                e.removeListener('foo', foo);

                assert.deepEquals(e.eventNames(), [s]);
            });
    });
});
