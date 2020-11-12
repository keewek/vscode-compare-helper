import * as assert from 'assert';
import { test } from 'mocha';

import { OutputChannel } from 'vscode';
import * as Log from '../../log';

interface Test {
    name: string;
    actual: any;
	expected: any;
    msg?: string;
}

class Channel {
    value: string = '';

    appendLine(value: string): void {
        this.value = value;
    }

    append(value: string): void {
        this.value = value;
    }
}

suite('Log Test Suite', function () {
    suite('NullLogger', function() {
        let log: Log.NullLogger;
        let counter: Log.Counter;
                
        setup(function() {
            counter = new Log.Counter();
            log = new Log.NullLogger(counter);
        });

        test('Append', function() {
            log.append('msg');

            assert.deepStrictEqual(log.count, { error: 0, info: 0, warn: 0 });
        });

        test('Error', function() {
            log.error('msg');

            assert.strictEqual(log.count.error, 1);
        });

        test('Info', function() {
            log.info('msg');

            assert.strictEqual(log.count.info, 1);
        });

        test('Warn', function() {
            log.warn('msg');

            assert.strictEqual(log.count.warn, 1);
        });

        test('Works without Counter', function() {

            log = new Log.NullLogger();

            log.append('message');
            log.error('message');
            log.info('message');
            log.warn('message');
            
            assert.strictEqual(log.count.error, 0);
            assert.strictEqual(log.count.info, 0);
            assert.strictEqual(log.count.warn, 0);

            log.counter?.reset();

            assert.deepStrictEqual(log.count, { error: 0, info: 0, warn: 0 });
        });

    });

    suite('ChannelLogger', function() {
        let log: Log.ChannelLogger;
        let channel: Channel;
        let counter: Log.Counter;
                
        setup(function() {
            channel = new Channel();
            counter = new Log.Counter();
            log = new Log.ChannelLogger(channel as unknown as OutputChannel, counter);
        });
    
        suite('Append', function() {
            let tests: Test[] = [
                {name: 'bigint', actual: BigInt(2), expected: '2'},
                {name: 'boolean', actual: true, expected: 'true'},
                {name: 'function', actual: (value: any) => value, expected: '(value) => value'},
                {name: 'number', actual: 1, expected: '1'},
                {name: 'string', actual: '1', expected: '1'},
                {name: 'undefined', actual: undefined, expected: 'undefined'},
                {name: 'symbol', actual: Symbol('Test'), expected: 'Symbol(Test)'},
                {name: 'null', actual: null, expected: 'null'},
                {name: 'object', actual: [
                    { char: 'A', num: 1},
                    { char: 'B', num: 2},
                ], expected: "[\n  {\n    \"char\": \"A\",\n    \"num\": 1\n  },\n  {\n    \"char\": \"B\",\n    \"num\": 2\n  }\n]"},
            ];

            tests.forEach(function (testItem) {
                test(`${testItem.name}`, function () {
                    log.append(testItem.actual);
                    assert.strictEqual(channel.value, testItem.expected);
                });
            });
        });

        suite('Append with prefix', function() {
            let tests: Test[] = [
                {name: 'bigint', actual: BigInt(2), expected: '  |  2'},
                {name: 'boolean', actual: true, expected: '  |  true'},
                {name: 'function', actual: (value: any) => value, expected: '  |  (value) => value'},
                {name: 'number', actual: 1, expected: '  |  1'},
                {name: 'string', actual: '1', expected: '  |  1'},
                {name: 'undefined', actual: undefined, expected: '  |  undefined'},
                {name: 'symbol', actual: Symbol('Test'), expected: '  |  Symbol(Test)'},
                {name: 'null', actual: null, expected: '  |  null'},
                {name: 'object', actual: [
                    { char: 'A', num: 1},
                    { char: 'B', num: 2},
                ], expected: "  |  [\n  |    {\n  |      \"char\": \"A\",\n  |      \"num\": 1\n  |    },\n  |    {\n  |      \"char\": \"B\",\n  |      \"num\": 2\n  |    }\n  |  ]"},
            ];

            tests.forEach(function (testItem) {
                test(`${testItem.name}`, function () {
                    log.append(testItem.actual, '  |  ');
                    assert.strictEqual(channel.value, testItem.expected);
                });
            });
        });

        test('Error', function() {
            const regex = /^\[.+ - (\d{2}:\d{2}:\d{2})\] .+$/u;
            let time: string;
            let expected: string;
    
            log.error('Error message');
    
            let m = regex.exec(channel.value);
            if (m) {
                time = m[1];
                expected = `[Error   - ${time}] Error message`;
            } else {
                assert.fail(`Expected "${channel.value}" to match ${regex.toString()}`);
            }
    
            assert.strictEqual(channel.value, expected);
        });
    
        test('Info', function() {
            const regex = /^\[.+ - (\d{2}:\d{2}:\d{2})\] .+$/u;
            let time: string;
            let expected: string;
    
            log.info('Info message');
    
            let m = regex.exec(channel.value);
            if (m) {
                time = m[1];
                expected = `[Info    - ${time}] Info message`;
            } else {
                assert.fail(`Expected "${channel.value}" to match ${regex.toString()}`);
            }
    
            assert.strictEqual(channel.value, expected);
        });
    
        test('Warn', function() {
            const regex = /^\[.+ - (\d{2}:\d{2}:\d{2})\] .+$/u;
            let time: string;
            let expected: string;
    
            log.warn('Warning message');
    
            let m = regex.exec(channel.value);
            if (m) {
                time = m[1];
                expected = `[Warning - ${time}] Warning message`;
            } else {
                assert.fail(`Expected "${channel.value}" to match ${regex.toString()}`);
            }
    
            assert.strictEqual(channel.value, expected);
        });

        test("Error's count", function() {
            log.error('message');
            assert.strictEqual(log.count.error, 1);
            assert.strictEqual(log.count.info, 0);
            assert.strictEqual(log.count.warn, 0);

            log.error('message');
            assert.strictEqual(log.count.error, 2);
            assert.strictEqual(log.count.info, 0);
            assert.strictEqual(log.count.warn, 0);
        });

        test("Info's count", function() {
            log.info('message');
            assert.strictEqual(log.count.error, 0);
            assert.strictEqual(log.count.info, 1);
            assert.strictEqual(log.count.warn, 0);

            log.info('message');
            assert.strictEqual(log.count.error, 0);
            assert.strictEqual(log.count.info, 2);
            assert.strictEqual(log.count.warn, 0);
        });

        /* cspell:disable-next-line */
        test("Warn's count", function() {
            log.warn('message');
            assert.strictEqual(log.count.error, 0);
            assert.strictEqual(log.count.info, 0);
            assert.strictEqual(log.count.warn, 1);

            log.warn('message');
            assert.strictEqual(log.count.error, 0);
            assert.strictEqual(log.count.info, 0);
            assert.strictEqual(log.count.warn, 2);
        });

        test('Reset counters', function() {
            log.warn('message');
            log.warn('message');
            log.warn('message');
            
            log.counter?.reset();

            assert.strictEqual(log.count.error, 0);
            assert.strictEqual(log.count.info, 0);
            assert.strictEqual(log.count.warn, 0);
        });

        test('Works without Counter', function() {

            log = new Log.ChannelLogger(channel as unknown as OutputChannel);

            log.append('message');
            log.error('message');
            log.info('message');
            log.warn('message');
            
            assert.strictEqual(log.count.error, 0);
            assert.strictEqual(log.count.info, 0);
            assert.strictEqual(log.count.warn, 0);

            log.counter?.reset();

            assert.deepStrictEqual(log.count, { error: 0, info: 0, warn: 0 });
        });

        test('Works without OutputChannel', function() {
            log = new Log.ChannelLogger(channel as unknown as OutputChannel);
        
            log.dispose();

            assert.strictEqual(log.channel, undefined);

            log.append('message');
            log.error('message');
            log.info('message');
            log.warn('message');
            
            assert.strictEqual(log.count.error, 0);
            assert.strictEqual(log.count.info, 0);
            assert.strictEqual(log.count.warn, 0);

            log.counter?.reset();

            assert.deepStrictEqual(log.count, { error: 0, info: 0, warn: 0 });
        });


    });
});
