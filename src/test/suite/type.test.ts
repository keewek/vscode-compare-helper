import * as assert from 'assert';
import * as Type from '../../type';

interface Foo {
    foo: string,
    bar?: string
}

suite('Type Test Suite', function () {
    test('isStringArray', function () {

        assert.strictEqual(Type.isStringArray([]), true);
        assert.strictEqual(Type.isStringArray(['']), true);
        assert.strictEqual(Type.isStringArray(['1', ['1.1', ['1.1.1', '1.1.2'], '1.2'], '2']), true);
        
        assert.strictEqual(Type.isStringArray(''), false);
        assert.strictEqual(Type.isStringArray([1]), false);
        assert.strictEqual(Type.isStringArray(['1', ['1.1', ['1.1.1', '1.1.2'], 1.2], '2']), false);

    });

    test('hasProperty', function () {
        assert.strictEqual(Type.hasProperty({} as Foo, 'foo'), false);
        assert.strictEqual(Type.hasProperty({} as Foo, 'foo', 'string'), false);
        assert.strictEqual(Type.hasProperty({ foo:  1, bar: '' } as unknown as Foo, 'foo'), true);
        assert.strictEqual(Type.hasProperty({ foo:  1, bar: '' } as unknown as Foo, 'foo', 'string'), false);
    });

    test('hasOptionalProperty', function () {
        assert.strictEqual(Type.hasOptionalProperty({} as Foo, 'bar'), true);
        assert.strictEqual(Type.hasOptionalProperty({bar: 1} as unknown as Foo, 'bar'), true);
        assert.strictEqual(Type.hasOptionalProperty({bar: 1} as unknown as Foo, 'bar', 'string'), false);
    });

    test('TypeName<T>', function() {
        const testTypeName = function<T>(value: T, typeName: Type.TypeName<T>) {
            return typeof value === typeName;
        };

        assert.strictEqual(testTypeName(BigInt(2), 'bigint'), true);
        assert.strictEqual(testTypeName(false, 'boolean'), true);
        assert.strictEqual(testTypeName(() => 1, 'function'), true);
        assert.strictEqual(testTypeName(1, 'number'), true);
        assert.strictEqual(testTypeName('1', 'string'), true);
        assert.strictEqual(testTypeName(Symbol('1'), 'symbol'), true);
        assert.strictEqual(testTypeName(undefined, 'undefined'), true);
        assert.strictEqual(testTypeName({}, 'object'), true);
        
        assert.strictEqual(testTypeName([], 'object'), true);
        assert.strictEqual(testTypeName(null, 'object'), true);

    });

});
