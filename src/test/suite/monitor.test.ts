import * as assert from 'assert';
import * as Os from 'os';
import * as Path from 'path';
import * as Fs from 'fs';

import { 
    Uri, CancellationTokenSource, workspace, FileType, FileStat, EventEmitter, FileChangeEvent, Event, Disposable, 
    FileSystemProvider,
    window,
    Range
} from 'vscode';

import * as Log from '../../log';
import * as Config from '../../config';
import * as Compare from '../../compare';
import * as Monitor from '../../monitor';
import { TextEncoder } from 'util';
import { suite } from 'mocha';

class AsFileSchemeFileSystemProvider implements FileSystemProvider {
    private _emitter = new EventEmitter<FileChangeEvent[]>();

    readonly onDidChangeFile: Event<FileChangeEvent[]> = this._emitter.event;

    private toFileUriScheme(uri: Uri): Uri {
        return uri.with({ scheme: 'file' });
    } 
    
    watch(_uri: Uri, _options: { recursive: boolean; excludes: string[]; }): Disposable {
        return new Disposable(() => { });
    }

    stat(uri: Uri): FileStat | Thenable<FileStat> {
        return workspace.fs.stat(this.toFileUriScheme(uri));
    }

    readDirectory(uri: Uri): [string, FileType][] | Thenable<[string, FileType][]> {
        return workspace.fs.readDirectory(this.toFileUriScheme(uri));
    }

    createDirectory(_uri: Uri): void | Thenable<void> {
        // Null
    }

    readFile(uri: Uri): Uint8Array | Thenable<Uint8Array> {
        return workspace.fs.readFile(this.toFileUriScheme(uri));
    }

    writeFile(_uri: Uri, _content: Uint8Array, _options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {
        // Null
    }

    delete(_uri: Uri, _options: { recursive: boolean; }): void | Thenable<void> {
        // Null
    }

    rename(_oldUri: Uri, _newUri: Uri, _options: { overwrite: boolean; }): void | Thenable<void> {
        // Null
    } 
}

const testWorkspaceRootUri = Uri.file(Path.resolve(__dirname, '../../../src/test/workspace'));
const testToolPath = Uri.joinPath(testWorkspaceRootUri, 'tools/testTool.js');
const UUID = '645e55cc-e400-4d26-8543-695a0a3396e7';
const tmpDirUri = Uri.file(Os.tmpdir());
const progress: Monitor.IncrementProgress = { report: _ => {} };

let sessions: Monitor.CompareSession[] = [];
let tokens: CancellationTokenSource[] = [];

function createSession(task: Compare.CompareTask, args?: { root?: Uri, log?: Log.Logger }): Monitor.CompareSession {
    const root = args?.root ?? tmpDirUri;
    const log = args?.log ?? new Log.NullLogger();

    const session = new Monitor.CompareSession(task, root, log);

    sessions.push(session);

    return session;
}

function createToken(): CancellationTokenSource {
    const token = new CancellationTokenSource();
    tokens.push(token);

    return token;
}

function disposeAllSessions(): void {
    for (const session of sessions) {
        session.dispose();
    }

    sessions = [];
}

function disposeAllTokens(): void {
    for (const token of tokens) {
        token.dispose();
    }

    tokens = [];
}


suite('Monitor Test Suite', function () {
    let provider: AsFileSchemeFileSystemProvider;
    let providerDisposables: Disposable[] = [];
    
    suiteSetup(async function() {
        provider = new AsFileSchemeFileSystemProvider();
        providerDisposables.push(workspace.registerFileSystemProvider('vscode-remote', provider));
        providerDisposables.push(workspace.registerFileSystemProvider('compare-helper', provider));
    });

    suiteTeardown(function() {
        for (const providerDisposable of providerDisposables) {
            providerDisposable.dispose();
        }

        Monitor.dispose();
    });

    test('prepareSessionForTask() - returns an instance of CompareSession', async function () {
        const task: Compare.CompareTask = {
            compares: "text",
            isRemote: true,
            tools: [],
            items: []
        };

        const session = Monitor.prepareSessionForTask(task);

        assert.strictEqual(session instanceof Monitor.CompareSession, true);
    });

    suite('initSessionAndShowProgress()', function () {
        test('returns true on success', async function () {
            const task: Compare.CompareTask = {
                compares: "text",
                isRemote: true,
                tools: [],
                items: []
            };
    
            const session = Monitor.prepareSessionForTask(task);
            const result = await Monitor.initSessionAndShowProgress(session);
    
            assert.strictEqual(result, true);
        });
    
        test('returns false on initialization failure', async function () {
            const task: Compare.CompareTask = {
                compares: "text",
                isRemote: false,
                tools: [],
                items: []
            };
    
            const session = Monitor.prepareSessionForTask(task);
            const result = await Monitor.initSessionAndShowProgress(session);
    
            assert.strictEqual(result, false);
        });
    
        test('calls session.dispose() on error', async function () {
            let isDisposeCalled = false;
    
            const session = {
                init() { throw new Error('test: re-throws on error'); },
                dispose() { isDisposeCalled = true; }
            } as unknown as Monitor.CompareSession;
            
            try {
                await Monitor.initSessionAndShowProgress(session);
            } catch (error) {
                
            }
            
            assert.strictEqual(isDisposeCalled, true);
           
        });
    
        test('re-throws on error', async function () {
            const session = {
                init() { throw new Error('test: re-throws on error'); },
                dispose() {}
            } as unknown as Monitor.CompareSession;
    
            assert.rejects(async () => {
                await Monitor.initSessionAndShowProgress(session);
            }, {
                name: 'Error',
                message: 'test: re-throws on error'
            });
        });
    });
 
    suite('executeCompareCommandWithSession()', function () {
        test('returns true on success', async function () {
            this.slow(5000);
    
            const task: Compare.CompareTask = {
                compares: "text",
                isRemote: true,
                tools: [],
                items: [
                    {
                        kind: 'file',
                        type: FileType.File,
                        uri: Uri.joinPath(testWorkspaceRootUri, 'foo.txt').with({scheme: 'vscode-remote'})
                    },
                    {
                        kind: 'file',
                        type: FileType.File,
                        uri: Uri.joinPath(testWorkspaceRootUri, 'bar.txt').with({scheme: 'compare-helper'})
                    }
                ]
            };
    
            const extTool: Config.ExternalTool = {
                name: "t1",
                path: "node",
                args: [ testToolPath.fsPath, 't1' ],
                compares: ['text']
            };
    
    
            const session = Monitor.prepareSessionForTask(task);
            let result = await Monitor.initSessionAndShowProgress(session);
    
            assert.strictEqual(result, true, 'initSessionAndShowProgress result check');
    
            const cmd = Compare.prepareCompareCommand(extTool, session.items);
    
            result = await Monitor.executeCompareCommandWithSession(cmd, session);
    
            assert.strictEqual(result, true);
        });
    
        test('syncs changed text files back with editor', async function () {
            this.slow(5000);
    
            const task: Compare.CompareTask = {
                compares: "text",
                isRemote: true,
                tools: [],
                items: [
                    {
                        kind: 'file',
                        type: FileType.File,
                        uri: Uri.joinPath(testWorkspaceRootUri, 'foo.txt').with({scheme: 'vscode-remote'})
                    },
                    {
                        kind: 'file',
                        type: FileType.File,
                        uri: Uri.joinPath(testWorkspaceRootUri, 'bar.txt').with({scheme: 'compare-helper'})
                    }
                ]
            };
    
            const extTool: Config.ExternalTool = {
                name: "t1",
                path: "node",
                args: [ testToolPath.fsPath, 't1' ],
                compares: ['text']
            };
    
            const session = Monitor.prepareSessionForTask(task);
            const sessionItem1 = session.sessionUriForUri(task.items[1].uri);
            await Monitor.initSessionAndShowProgress(session);
    
            // Change remote items
            let editor = await window.showTextDocument(Uri.joinPath(testWorkspaceRootUri, 'bar.txt'), { preview: false });
            let range = new Range(0, 0, editor.document.lineCount, 0);
            
            // Change remote items
            const encoder = new TextEncoder();
            let newContent = '111\nᚠᛇᚻ᛫ᛒᛦᚦ᛫ᚠᚱᚩᚠᚢᚱ᛫ᚠᛁᚱᚪ᛫ᚷᛖᚻᚹᛦᛚᚳᚢᛗ\n333\n'; // cspell:disable-line
            await workspace.fs.writeFile(sessionItem1, encoder.encode(newContent));
    
            const cmd = Compare.prepareCompareCommand(extTool, session.items);
            await Monitor.executeCompareCommandWithSession(cmd, session);
    
            let dataAfter: string | undefined;
            if (window.activeTextEditor) {
                editor = window.activeTextEditor;
                range = new Range(0, 0, editor.document.lineCount, 0);
                dataAfter = editor.document.getText(range);
            }
        
            assert.strictEqual(dataAfter, newContent);
            
        });
    
        test('editor synchronization skips images', async function () {
            this.slow(5000);
    
            const task: Compare.CompareTask = {
                compares: "text",
                isRemote: true,
                tools: [],
                items: [
                    {
                        kind: 'image',
                        type: FileType.File,
                        uri: Uri.joinPath(testWorkspaceRootUri, 'R.png').with({scheme: 'vscode-remote'})
                    },
                    {
                        kind: 'image',
                        type: FileType.File,
                        uri: Uri.joinPath(testWorkspaceRootUri, 'G.jpg').with({scheme: 'vscode-remote'})
                    }
                ]
            };
    
            const extTool: Config.ExternalTool = {
                name: "t1",
                path: "node",
                args: [ testToolPath.fsPath, 't1' ],
                compares: ['text']
            };
    
            const session = Monitor.prepareSessionForTask(task);
            const sessionItem1 = session.sessionUriForUri(task.items[1].uri);
            await Monitor.initSessionAndShowProgress(session);
    
            const editor = await window.showTextDocument(Uri.joinPath(testWorkspaceRootUri, 'bar.txt'), { preview: false });
            const fileNameBefore = editor.document.fileName;
        
            const date = new Date();
            Fs.utimesSync(sessionItem1.fsPath, date, date);
    
            const cmd = Compare.prepareCompareCommand(extTool, session.items);
            await Monitor.executeCompareCommandWithSession(cmd, session);
    
            let fileNameAfter: string | undefined;
            if (window.activeTextEditor) {
                fileNameAfter = window.activeTextEditor.document.fileName;
            }
        
            assert.strictEqual(fileNameBefore, fileNameAfter);
            
        });
    
        test('throws on uninitialized session', async function () {
            const task: Compare.CompareTask = {
                compares: "text",
                isRemote: true,
                tools: [],
                items: []
            };
    
            const session = Monitor.prepareSessionForTask(task);
            const cmd = {} as Compare.CompareCommand;
    
            assert.rejects(async () => {
                await Monitor.executeCompareCommandWithSession(cmd, session);
            }, {
                name: 'ErrorWithData',
                message: 'Session has not been initialized'
            });
    
        });
    });

    suite('dispose()', function () {
        test('calls session.dispose()', async function () {
            let isDisposeCalled = false;
        
            const task: Compare.CompareTask = {
                compares: "text",
                isRemote: false,
                tools: [],
                items: []
            };
    
            const session = Monitor.prepareSessionForTask(task) as any;
            session._dispose = session.dispose;
            session.dispose = () => {
                isDisposeCalled = true;
                session._dispose();
            };
            
            await Monitor.dispose();
    
            assert.strictEqual(isDisposeCalled, true);
        });
    
        test('clears sessions map', async function () {
            
            const task: Compare.CompareTask = {} as Compare.CompareTask;
    
            let count = Monitor.getSessionCount();
    
            Monitor.prepareSessionForTask(task);
    
            assert.strictEqual(Monitor.getSessionCount() > count, true, 'post prepareSessionForTask() count');
    
            await Monitor.dispose();
    
            assert.strictEqual(Monitor.getSessionCount() === 0, true, 'post dispose() count');
        });
    });


    suite('CompareSession', function () {
        let session: Monitor.CompareSession;

        suiteSetup(function () {
            const task: Compare.CompareTask = {
                compares: "text",
                isRemote: true,
                tools: [],
                items: []
            };

            session = createSession(task);
        });

        suiteTeardown(function () {
            disposeAllSessions();
            disposeAllTokens();
        });

        test('constructor()', async function () {
            assert.strictEqual(session.isInitialized, false);
            assert.strictEqual(session.items.length, 0);
            assert.strictEqual((await session.getChangedItems()).length, 0);
        });

        test('uuid', function () {
            assert.strictEqual(session.uuid.length, UUID.length);
        });

        test('home is inside root folder', function () {
            const expected = Uri.joinPath(tmpDirUri, session.uuid);
            assert.strictEqual(session.home.fsPath, expected.fsPath);
        });

        suite('init()', function () {
            test('creates session\'s home folder', async function () {
                this.slow(5000);
    
                const task: Compare.CompareTask = {
                    compares: "text",
                    isRemote: true,
                    tools: [],
                    items: []
                };
    
                const tokenSource = createToken();
                const testSession = createSession(task);
    
                await testSession.init(progress, tokenSource.token);
    
                assert.strictEqual(Fs.existsSync(testSession.home.fsPath), true);
    
            });
    
            test('transfers remote text files to session\'s folder', async function () {
                this.slow(5000);
    
                const task: Compare.CompareTask = {
                    compares: "text",
                    isRemote: true,
                    tools: [],
                    items: [
                        {
                            kind: 'file',
                            type: FileType.File,
                            uri: Uri.joinPath(testWorkspaceRootUri, 'foo.txt').with({scheme: 'vscode-remote'})
                        },
                        {
                            kind: 'file',
                            type: FileType.File,
                            uri: Uri.joinPath(testWorkspaceRootUri, 'bar.txt').with({scheme: 'compare-helper'})
                        }
                    ]
                };
    
                const tokenSource = createToken();
                const testSession = createSession(task);
                // const testSession = new Monitor.CompareSession(tmpDirUri, new Log.NullLogger());
    
                const sessionItem0 = testSession.sessionUriForUri(task.items[0].uri);
                const sessionItem1 = testSession.sessionUriForUri(task.items[1].uri);
    
                const result = await testSession.init(progress, tokenSource.token);
    
                assert.strictEqual(result, true, 'result');
                assert.strictEqual(testSession.items.length, 2, 'Items count');
                assert.strictEqual(Fs.existsSync(sessionItem0.fsPath), true, 'item 0 existsSync check');
                assert.strictEqual(Fs.existsSync(sessionItem1.fsPath), true, 'item 1 existsSync check');
                assert.strictEqual(testSession.items[0].uri.fsPath, sessionItem0.fsPath, 'items[0].uri.fsPath');
                assert.strictEqual(testSession.items[1].uri.fsPath, sessionItem1.fsPath, 'items[1].uri.fsPath');
            });
    
            test('transfers remote image files to session\'s folder', async function () {
                this.slow(5000);
    
                const task: Compare.CompareTask = {
                    compares: "text",
                    isRemote: true,
                    tools: [],
                    items: [
                        {
                            kind: 'image',
                            type: FileType.File,
                            uri: Uri.joinPath(testWorkspaceRootUri, 'R.png').with({scheme: 'vscode-remote'})
                        },
                        {
                            kind: 'image',
                            type: FileType.File,
                            uri: Uri.joinPath(testWorkspaceRootUri, 'G.jpg').with({scheme: 'compare-helper'})
                        }
                    ]
                };
    
                const tokenSource = createToken();
                const testSession = createSession(task);
                // const testSession = new Monitor.CompareSession(tmpDirUri, new Log.NullLogger());
    
                const sessionItem0 = testSession.sessionUriForUri(task.items[0].uri);
                const sessionItem1 = testSession.sessionUriForUri(task.items[1].uri);
    
                const result = await testSession.init(progress, tokenSource.token);
    
                assert.strictEqual(result, true, 'result');
                assert.strictEqual(testSession.items.length, 2, 'Items count');
                assert.strictEqual(Fs.existsSync(sessionItem0.fsPath), true, 'item 0 existsSync check');
                assert.strictEqual(Fs.existsSync(sessionItem1.fsPath), true, 'item 1 existsSync check');
                assert.strictEqual(testSession.items[0].uri.fsPath, sessionItem0.fsPath, 'items[0].uri.fsPath');
                assert.strictEqual(testSession.items[1].uri.fsPath, sessionItem1.fsPath, 'items[1].uri.fsPath');
            });
    
            test('does not transfer local files to session\'s folder', async function () {
                this.slow(5000);
    
                const task: Compare.CompareTask = {
                    compares: "text",
                    isRemote: true,
                    tools: [],
                    items: [
                        {
                            kind: 'file',
                            type: FileType.File,
                            uri: Uri.joinPath(testWorkspaceRootUri, 'foo.txt')
                        },
                        {
                            kind: 'image',
                            type: FileType.File,
                            uri: Uri.joinPath(testWorkspaceRootUri, 'R.png')
                        }
                    ]
                };
    
                const tokenSource = createToken();
                const testSession = createSession(task);
    
                const sessionItem0 = testSession.sessionUriForUri(task.items[0].uri);
                const sessionItem1 = testSession.sessionUriForUri(task.items[1].uri);
    
                const result = await testSession.init(progress, tokenSource.token);
    
                assert.strictEqual(result, true, 'result');
                assert.strictEqual(testSession.items.length, 2, 'Items count');
                assert.strictEqual(Fs.existsSync(sessionItem0.fsPath), false, 'item 0 existsSync check');
                assert.strictEqual(Fs.existsSync(sessionItem1.fsPath), false, 'item 1 existsSync check');
                assert.strictEqual(testSession.items[0].uri.fsPath, task.items[0].uri.fsPath, 'items[0].uri.fsPath');
                assert.strictEqual(testSession.items[1].uri.fsPath, task.items[1].uri.fsPath, 'items[1].uri.fsPath');
            });
    
            test('ignores folders', async function () {
                this.slow(5000);
    
                const task: Compare.CompareTask = {
                    compares: "text",
                    isRemote: true,
                    tools: [],
                    items: [
                        {
                            kind: 'folder',
                            type: FileType.Directory,
                            uri: Uri.joinPath(testWorkspaceRootUri, 'folder_2')
                        },
                        {
                            kind: 'file',
                            type: FileType.File,
                            uri: Uri.joinPath(testWorkspaceRootUri, 'foo.txt')
                        }
                    ]
                };
    
                const tokenSource = createToken();
                const testSession = createSession(task);
    
                const sessionItem0 = testSession.sessionUriForUri(task.items[0].uri);
                const sessionItem1 = testSession.sessionUriForUri(task.items[1].uri);
    
                const result = await testSession.init(progress, tokenSource.token);
    
                assert.strictEqual(result, true, 'result');
                assert.strictEqual(testSession.items.length, 1, 'Items count');
                assert.strictEqual(Fs.existsSync(sessionItem0.fsPath), false, 'item 0 existsSync check');
                assert.strictEqual(Fs.existsSync(sessionItem1.fsPath), false, 'item 1 existsSync check');
                assert.strictEqual(testSession.items[0].uri.fsPath, task.items[1].uri.fsPath, 'items[0].uri.fsPath');
            });
    
            test('handles CancellationToken', async function () {
                this.slow(5000);
    
                const task: Compare.CompareTask = {
                    compares: "text",
                    isRemote: true,
                    tools: [],
                    items: [
                        {
                            kind: 'file',
                            type: FileType.File,
                            uri: Uri.joinPath(testWorkspaceRootUri, 'foo.txt')
                        }
                    ]
                };
    
                const tokenSource = createToken();
                const testSession = createSession(task);
    
                tokenSource.cancel();
    
                const result = await testSession.init(progress, tokenSource.token);
    
                assert.strictEqual(result, false, 'result');
                assert.strictEqual(testSession.isInitialized, false, 'testSession.isInitialized');
                
            });
        });
  
        test('getChangedItems()', async function () {
            this.slow(5000);

            const task: Compare.CompareTask = {
                compares: "text",
                isRemote: true,
                tools: [],
                items: [
                    {
                        kind: 'file',
                        type: FileType.File,
                        uri: Uri.joinPath(testWorkspaceRootUri, 'foo.txt').with({scheme: 'vscode-remote'})
                    },
                    {
                        kind: 'file',
                        type: FileType.File,
                        uri: Uri.joinPath(testWorkspaceRootUri, 'bar.txt').with({scheme: 'compare-helper'})
                    }
                ]
            };

            const tokenSource = createToken();
            const testSession = createSession(task);
           
            const sessionItem0 = testSession.sessionUriForUri(task.items[0].uri);
            // const sessionItem1 = testSession.sessionUriForUri(task.items[1].uri);

            const result = await testSession.init(progress, tokenSource.token);

            assert.strictEqual(result, true, 'result');
            assert.strictEqual(testSession.items.length, 2, 'Items count');

            let changedItems = await testSession.getChangedItems();

            assert.strictEqual(changedItems.length, 0, 'getChangedItems() count before change');
            
            const date = new Date();
            Fs.utimesSync(sessionItem0.fsPath, date, date);

            changedItems = await testSession.getChangedItems();

            assert.strictEqual(changedItems.length, 1, 'getChangedItems() count after change');
            assert.strictEqual(changedItems[0].uri.fsPath, sessionItem0.fsPath);
        });
        
        suite('dispose()', function () {
            test('removes session\'s folder', async function () {
                this.slow(5000);
    
                const task: Compare.CompareTask = {
                    compares: "text",
                    isRemote: true,
                    tools: [],
                    items: [
                        {
                            kind: 'file',
                            type: FileType.File,
                            uri: Uri.joinPath(testWorkspaceRootUri, 'foo.txt')
                        }
                    ]
                };
    
                const tokenSource = createToken();
                const testSession = createSession(task);
    
                const result = await testSession.init(progress, tokenSource.token);
    
                assert.strictEqual(result, true, 'result');
                assert.strictEqual(Fs.existsSync(testSession.home.fsPath), true, 'existsSync() check before dispose');
    
                await testSession.dispose();
    
                assert.strictEqual(Fs.existsSync(testSession.home.fsPath), false, 'existsSync() check after dispose');
            });
    
            test('logs warning on problems with clean up', async function () {
                this.slow(5000);
    
                const task: Compare.CompareTask = {
                    compares: "text",
                    isRemote: true,
                    tools: [],
                    items: []
                };
    
                const testLogger = new Log.NullLogger(new Log.Counter());
                const tokenSource = createToken();
                const testSession = createSession(task, {log: testLogger});
    
                const result = await testSession.init(progress, tokenSource.token);
    
                assert.strictEqual(result, true, 'result');
                assert.strictEqual(Fs.existsSync(testSession.home.fsPath), true, 'existsSync() check before dispose');
    
                try {
                    await workspace.fs.delete(testSession.home, { recursive: true, useTrash: false });
                } catch (e) {
                    // Ignore
                }
    
                await testSession.dispose();
                
                assert.strictEqual(testLogger.count.warn, 1, 'warnings count check');
            });
        });
    });
});
