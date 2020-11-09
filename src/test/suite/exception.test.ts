import * as assert from 'assert';
import { ErrorWithData } from '../../exception';

suite('Exception Test Suite', function () {
    suite('ErrorWithData', function () {
        test('name is "ErrorWithData"', function () {
            const e = new ErrorWithData('msg');

            assert.strictEqual(e.name, 'ErrorWithData');
        });

        test('scopedMessage without scope', function () {
            const e = new ErrorWithData('msg');

            assert.strictEqual(e.scopedMessage(), 'msg');
        });

        test('scopedMessage with scope', function () {
            const e = new ErrorWithData('msg', {scope: 'scope'});

            assert.strictEqual(e.scopedMessage(), 'scope: msg');
        });

        test('scopedMessage with scope and custom separator', function () {
            const e = new ErrorWithData('msg', {scope: 'scope'});

            assert.strictEqual(e.scopedMessage(' = '), 'scope = msg');
        });

        test('hasData is false with no data', function () {
            const e = new ErrorWithData('msg', {scope: 'scope'});

            assert.strictEqual(e.hasData, false);
        });

        test('data can be set to undefined', function () {
            const e = new ErrorWithData('msg', {scope: 'scope', data: undefined});

            assert.strictEqual(e.hasData, true);
            assert.strictEqual(e.data, undefined);
        });

    });
});
