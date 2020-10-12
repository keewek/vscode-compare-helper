import * as assert from 'assert';
import { before, test } from 'mocha';

import { OutputChannel } from 'vscode';
import * as Log from '../../log';

class Channel {
    value: string = '';

    appendLine(value: string): void {
        this.value = value;
    }
}

suite('Log Test Suite', function () {
    suite('ChannelLogger', function() {
        let log: Log.Logger;
        let channel: Channel;
        
        before(function() {
            channel = new Channel();
            log = new Log.ChannelLogger(channel as unknown as OutputChannel);
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
    });
});
