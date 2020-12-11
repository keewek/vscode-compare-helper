import * as assert from 'assert';
import * as File from '../../file';

suite('File Test Suite', function () {
    suite('sanitizeName', function () {

        test('trims', function () {
            assert.strictEqual(File.sanitizeName('  \n  trim-test.txt  \n  ', 'posix'), 'trim-test.txt');
        });

        test('removes control chars', function () {
            const c0 = String.fromCharCode(...Array(32).keys());
            const c1 = Array.from(Array(32), (_v, k) => String.fromCharCode(k + 128));
            const del = String.fromCharCode(127);
            const input = ['c0', ...c0, 'c1', ...c1, 'del', ...del, '.txt'].join('');
            
            assert.strictEqual(File.sanitizeName(input, 'posix'), 'c0c1del.txt');
        });

        test('removes trailing periods and spaces', function () {
            assert.strictEqual(File.sanitizeName('  ....test.txt  ..  ..  ', 'posix'), '....test.txt');
        });

        test('removes reserved chars with removeReservedChars option', function () {
            const options = { removeReservedChars: true };
            assert.strictEqual(File.sanitizeName('_<_>_:_"_/_\\_|_?_*_.txt', 'posix', options), '__________.txt');
        });

        test('replaces reserved chars', function () {
            assert.strictEqual(File.sanitizeName('_<_>_:_"_/_\\_|_?_*_.txt', 'posix'), '_-_-_-_-_-_-_-_-_-_.txt');
        });

        test('returns empty string for "." as a name', function () {
            assert.strictEqual(File.sanitizeName('.', 'posix'), '');
        });

        test('returns empty string for ".." as a name', function () {
            assert.strictEqual(File.sanitizeName('..', 'posix'), '');
        });

        test('prefixes Windows reserved filenames when a target platform is "win32"', function () {
            const windowsReservedNames = [
                'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
                'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
            ];

            for (const name of windowsReservedNames) {
                let badFilename = `${name} .txt`;
                let goodFilename = `${name}-.txt`;

                assert.strictEqual(File.sanitizeName(badFilename, 'win32'), `_${badFilename}`, name);
                assert.strictEqual(File.sanitizeName(goodFilename, 'win32'), goodFilename, name);
            }
        });

        test('ignores Windows reserved filenames when a target platform is not "win32"', function () {
            const windowsReservedNames = [
                'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
                'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
            ];

            for (const name of windowsReservedNames) {
                let badFilename = `${name} .txt`;
                let goodFilename = `${name}-.txt`;

                assert.strictEqual(File.sanitizeName(badFilename, 'posix'), badFilename, name);
                assert.strictEqual(File.sanitizeName(goodFilename, 'posix'), goodFilename, name);
            }
        });

        test('considers path as a part of the name', function () {
            assert.strictEqual(File.sanitizeName('  \n  /dir1\\dir2/CON.txt  \n  ', 'posix'), '-dir1-dir2-CON.txt');
        });

    });

    suite('sanitizePath', function () {

        test('trims', function () {
            assert.strictEqual(File.sanitizePath('  \n  /dir1/dir2/test.txt  \n  ', 'posix'), '/dir1/dir2/test.txt');
        });

        test('sanitizes segments', function () {
            assert.strictEqual(File.sanitizePath('/d<ir1/d>ir2/te*st.txt', 'posix'), '/d-ir1/d-ir2/te-st.txt');
        });

        test('transforms path using target platform\'s separator', function () {
            assert.strictEqual(File.sanitizePath('/dir1/dir2/test.txt', 'posix', 'win32'), '\\dir1\\dir2\\test.txt');
        });

        test('transforms Windows drive letters into dirs', function () {
            assert.strictEqual(File.sanitizePath('C:\\d*ir1\\d:ir2\\CON.txt', 'win32'), 'C\\d-ir1\\d-ir2\\_CON.txt');
        });
    });
});
