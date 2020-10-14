import * as assert from 'assert';
import { beforeEach, test } from 'mocha';

import { OutputChannel } from 'vscode';
import * as Log from '../../log';

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
    suite('ChannelLogger', function() {
        let log: Log.Logger;
        let channel: Channel;
                
        beforeEach(function() {
            channel = new Channel();
            log = new Log.ChannelLogger(channel as unknown as OutputChannel);
        });
    
        test('Append object', function() {
            const expected = "[\n  {\n    \"char\": \"A\",\n    \"num\": 1\n  },\n  {\n    \"char\": \"B\",\n    \"num\": 2\n  }\n]";
            let data = [
                { char: 'A', num: 1},
                { char: 'B', num: 2},
            ];

            log.append(data);

            assert.strictEqual(channel.value, expected);
        });

        test('Append string', function() {
            const expected = "Test";
            let data = 'Test';

            log.append(data);

            assert.strictEqual(channel.value, expected);
        });

        test('Append object with prefix', function() {
            const expected = "  |  [\n  |    {\n  |      \"char\": \"A\",\n  |      \"num\": 1\n  |    },\n  |    {\n  |      \"char\": \"B\",\n  |      \"num\": 2\n  |    }\n  |  ]";
            let data = [
                { char: 'A', num: 1},
                { char: 'B', num: 2},
            ];

            log.append(data, '  |  ');

            assert.strictEqual(channel.value, expected);
        });

        test('Append string with prefix', function() {
            const expected = "  |  Test";
            let data = 'Test';

            log.append(data, '  |  ');

            assert.strictEqual(channel.value, expected);
        });

        test('Error', function() {
            const regex = /^\[.+ - (\d{2}:\d{2}:\d{2})\] .+$/u;
            let time: string;
            let expected: string;
    
            log.error('Error message');
    
            let m = regex.exec(channel.value);
            if (m) {
                time = m[1];
                expected = `[Error - ${time}] Error message`;
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
                expected = `[Info - ${time}] Info message`;
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
            
            log.resetCount();

            assert.strictEqual(log.count.error, 0);
            assert.strictEqual(log.count.info, 0);
            assert.strictEqual(log.count.warn, 0);
        });

    });
});
