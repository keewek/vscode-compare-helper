import * as assert from 'assert';
import * as Path from 'path';
import { Uri } from 'vscode';

import * as Inform from '../../inform';
import { NullLogger } from '../../log';

const workspaceRootUri = Uri.file(Path.resolve(__dirname, '../../..'));

function createContext() {
    let context = {
        _relativePathIn: '',
        asAbsolutePath: (relativePath: string): string => {
            const uri = Uri.joinPath(workspaceRootUri, relativePath).fsPath;
            // console.error(`relativePath: [${relativePath}]`);
            // console.error(uri);
            context._relativePathIn = relativePath;
            return uri;
        },
        globalState: {
            _valueIn: undefined,
            _valueOut: undefined,
            _key: '', 
            _values: new Map<string, any>(),
            get: (key: string): string | undefined => {
                // console.error(`globalState.get: '${key}'`);
                context.globalState._key = key;
                context.globalState._valueOut = context.globalState._values.get(key);
                return context.globalState._valueOut;
            },
            update: (key: string, value: any): Thenable<void> => {
                // console.error(`globalState.update: '${key}':'${value}'`);
                context.globalState._key = key;
                context.globalState._valueIn = value;
                context.globalState._values.set(key, value);
                return Promise.resolve();
            }
        }
    };

    return context;
}

function createExtension(version: any, id: string) {
    let extension = {
        id: id,
        packageJSON: {
            version: version
        }
    };

    return extension;
}

suite('Inform Test Suite', function () {
    let extension: any;
    let context: any; 
    let informer: Inform.InformerInterface;
    let logger: NullLogger;

    suiteSetup(function () {
        extension = createExtension('1.0.0', 'keewek.compare-helper');
        context = createContext();
        logger = new NullLogger();
        informer = new Inform.WhatIsNewInformer(context, extension, logger);
    });

    test('stores new version in Global State Memento', function () {
        const testContext: any = createContext();
        const testInformer = new Inform.WhatIsNewInformer(testContext, extension, logger);
        
        assert.strictEqual(testInformer.shouldInform, true);

        assert.strictEqual(testContext.globalState._key, 'keewek.compare-helper.version');
        assert.strictEqual(testContext.globalState._valueIn, '1.0.0');
    });

    test('shouldInform is true when versions differ', function () {
        assert.strictEqual(informer.shouldInform, true);
        assert.strictEqual(context.globalState._key, 'keewek.compare-helper.version');
    });

    test('shouldInform uses cache', function () {
        context.globalState._key = '';
        assert.strictEqual(informer.shouldInform, true);
        assert.strictEqual(context.globalState._key, '');
    });

    test('shouldInform is false when versions are the same', function () {
        const testInformer = new Inform.WhatIsNewInformer(context, extension, logger);

        assert.strictEqual(testInformer.shouldInform, false);
        assert.strictEqual(context.globalState._key, 'keewek.compare-helper.version');
    });

    test('shouldInform is false when extension is undefined', function () {
        const testContext: any = createContext();
        const testInformer = new Inform.WhatIsNewInformer(testContext, undefined, logger);
        
        assert.strictEqual(testInformer.shouldInform, false, 'shouldInform check');

        assert.strictEqual(testContext.globalState._key, '', 'access key check');
        assert.strictEqual(testContext.globalState._valueIn, undefined, 'value check');
    });

    test('inform() - will try to open "WHAT-IS-NEW.md" as preview', async function () {
        this.slow(5000);
        await informer.inform();

        assert.strictEqual(context._relativePathIn, 'WHAT-IS-NEW.md');
    });

});
