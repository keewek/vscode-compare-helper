import * as assert from 'assert';
import { Uri } from 'vscode';
import { ChildProcess } from 'child_process';

import * as config from '../../config'; 
import * as Compare from '../../compare';
import { NullLogger, Counter } from '../../log';
import * as Path from 'path';

// const rootUri  = workspace.workspaceFolders?.[0].uri;
const rootUri = Uri.file(Path.resolve(__dirname, '../../../src/test/workspace'));
const testToolPath = workspacePath(rootUri, 'tools/testTool.js');
const txtItems: Compare.VscodeExplorerItem[] = [
    { fsPath: workspacePath(rootUri, 'foo.txt') },
    { fsPath: workspacePath(rootUri, 'bar.txt') },
    { fsPath: workspacePath(rootUri, 'baz.txt') },
    { fsPath: workspacePath(rootUri, 'zzz.xxx.yyy.txt') }
];
const testConfig: config.VscodeConfiguration = {
	defaults: {
		folders: "t1",
		images: "t2",
		text: "t3",
	},
	tools: [
		{
			name: "t1",
			path: "node",
			args: [ testToolPath, 't1', '${FOLDER_ITEM_1}', '${FOLDER_ITEM_2}' ],
			compares: ['folders']
		},
		{
			name: "t2",
			path: "node",
			args: [ testToolPath, 't2', '${FOLDER_ITEM_1}', '${FOLDER_ITEM_2}' ],
			compares: ['folders', 'images']
		},
		{
			name: "t3",
			path: "node",
			args: [ testToolPath, 't3', '${FOLDER_ITEM_1}', '${FOLDER_ITEM_2}' ],
			compares: ['folders', 'images', 'text']
        },
		{
			name: "t4",
			path: "node",
			args: [testToolPath, 't4', '1__${FOLDER_ITEM_1}__', ['1_1', ['1_1_1', '${FOLDER_ITEM_2}'], '${FOLDER_ITEM_3}'], '2'],
			compares: ['folders']
		},
		{
			name: "t5",
			path: "node",
			args: [],
			compares: ['folders']
		}
	]
};

if (!rootUri) {
    console.error('Cannot determine rootPath. Running outside workspace ?!');
    console.error('Some tests will be skipped !!!');
}

suite('Compare Test Suite', function () {
    let log: NullLogger;
    
    suiteSetup(function() {
        log = new NullLogger(new Counter);
        config.setLogger(log);
        config.processConfiguration(testConfig);
    });

    suite('prepareCompareTask', function() {

        test('with text items', async function() {
            if (!rootUri) { this.skip(); }

            const items: Compare.VscodeExplorerItem[] = [
                { fsPath: workspacePath(rootUri, 'foo.txt') },
                { fsPath: workspacePath(rootUri, 'bar.txt') },
            ];

            const task = await Compare.prepareCompareTask(items);
        
            assert.strictEqual(task.compares, 'text');
            assert.strictEqual(task.defaultTool?.name, 't3');
            assert.strictEqual(task.items.length, 2);
            assert.strictEqual(task.items[0].kind, 'file');
            assert.strictEqual(task.items[1].kind, 'file');
            assert.strictEqual(task.tools.length, 1);
            assert.strictEqual(task.tools[0].name, 't3');
        });

        test('with image items', async function() {
            if (!rootUri) { this.skip(); }

            const items: Compare.VscodeExplorerItem[] = [
                { fsPath: workspacePath(rootUri, 'R.png') },
                { fsPath: workspacePath(rootUri, 'G.jpg') },
            ];

            const task = await Compare.prepareCompareTask(items);
        
            assert.strictEqual(task.compares, 'images');
            assert.strictEqual(task.defaultTool?.name, 't2');
            assert.strictEqual(task.items.length, 2);
            assert.strictEqual(task.items[0].kind, 'image');
            assert.strictEqual(task.items[1].kind, 'image');
            assert.strictEqual(task.tools.length, 2);
            assert.strictEqual(task.tools[0].name, 't2');
            assert.strictEqual(task.tools[1].name, 't3');
        });

        test('with folder items', async function() {
            if (!rootUri) { this.skip(); }

            const items: Compare.VscodeExplorerItem[] = [
                { fsPath: workspacePath(rootUri, 'folder_1') },
                { fsPath: workspacePath(rootUri, 'folder_2') },
            ];

            const task = await Compare.prepareCompareTask(items);
        
            assert.strictEqual(task.compares, 'folders');
            assert.strictEqual(task.defaultTool?.name, 't1');
            assert.strictEqual(task.items.length, 2);
            assert.strictEqual(task.items[0].kind, 'folder');
            assert.strictEqual(task.items[1].kind, 'folder');
            assert.strictEqual(task.tools.length, 5);
            assert.strictEqual(task.tools[0].name, 't1');
            assert.strictEqual(task.tools[1].name, 't2');
            assert.strictEqual(task.tools[2].name, 't3');
            assert.strictEqual(task.tools[3].name, 't4');
            assert.strictEqual(task.tools[4].name, 't5');
        });

        test('throws on mixed items', async function() {
            if (!rootUri) { this.skip(); }

            assert.rejects(async () => {
                await Compare.prepareCompareTask([
                    { fsPath: workspacePath(rootUri, 'foo.txt') },
                    { fsPath: workspacePath(rootUri, 'R.png') },
                ]);
            }, {
                name: 'ErrorWithData',
                message: 'All selected items must be of the same kind'
            });
        });

        test('throws on non-array data', async function() {
            assert.rejects(async () => {
                await Compare.prepareCompareTask('');
            }, {
                name: 'ErrorWithData',
                message: 'Expected an array'
            });
        });

        test('throws on less than 2 items', async function() {
            if (!rootUri) { this.skip(); }

            assert.rejects(async () => {
                await Compare.prepareCompareTask([{fsPath: workspacePath(rootUri, 'foo.txt')}]);
            }, {
                name: 'ErrorWithData',
                message: 'Expected an array of at least 2 items'
            });
        });

        test('throws on incorrect item type', async function() {
            assert.rejects(async () => {
                await Compare.prepareCompareTask(['', '']);
            }, {
                name: 'ErrorWithData',
                message: 'Unexpected format'
            });
        });

        test('throws on missing required properties', async function() {
            assert.rejects(async () => {
                await Compare.prepareCompareTask([{}, {}]);
            }, {
                name: 'ErrorWithData',
                message: 'Unexpected format'
            });
        });

        test('throws on empty "fsPath" property', async function() {
            assert.rejects(async () => {
                await Compare.prepareCompareTask([{fsPath: ''}, {fsPath: ''}]);
            }, {
                name: 'ErrorWithData',
                message: '"fsPath" is empty'
            });
        });

        test('throws on non-existent "fsPath" property', async function() {
            assert.rejects(async () => {
                await Compare.prepareCompareTask([
                    {fsPath: '712b067e-b0a1-47da-87c5-cd2741aaffc4'},
                    {fsPath: '920a96ee-df35-489b-9865-9d374ea83dcb'}
                ]);
            }, {
                name: 'EntryNotFound (FileSystemError)'
            });
        });
    });

    suite('prepareCompareCommand', function() {
        let tools: config.ExternalTool[];
        let txtTask: Compare.CompareTask;

        suiteSetup(async function() {
            if (!rootUri) { this.skip(); }

            tools = config.getTools();
            txtTask = await Compare.prepareCompareTask(txtItems);
        });

        test('accepts CompareTask', function() {
            const t1 = tools[0];
            const cmd = Compare.prepareCompareCommand(t1, txtTask);

            assert.strictEqual(cmd.tool.path, t1.path);
            assert.strictEqual(cmd.args.length, 4);
        });

        test('accepts CompareItem[]', function() {
            const t1 = tools[0];
            const cmd = Compare.prepareCompareCommand(t1, txtTask.items);

            assert.strictEqual(cmd.tool.path, t1.path);
            assert.strictEqual(cmd.args.length, 4);
        });

        test('processes args template for tools with args', function() {
            const t1 = tools[0];
            const cmd = Compare.prepareCompareCommand(t1, txtTask.items);

            assert.deepStrictEqual(cmd.args, [
                testToolPath,
                't1', 
                txtItems[0].fsPath,
                txtItems[1].fsPath
            ]);
        });

        test('processes args template for tools with subargs', function() {
            const t4 = tools[3];
            const cmd = Compare.prepareCompareCommand(t4, txtTask.items);

            assert.deepStrictEqual(cmd.args, [
                testToolPath,
                't4', 
                `1__${txtItems[0].fsPath}__`,
                '1_1',
                '1_1_1',
                txtItems[1].fsPath,
                txtItems[2].fsPath,
                '2'
            ]);
        });

        test('uses item\'s fsPath as arg for tools without args', function() {
            const t1 = { ...tools[0] };
            
            t1.args = [];
            
            const cmd = Compare.prepareCompareCommand(t1, txtTask.items);

            assert.deepStrictEqual(cmd.args, [
                txtItems[0].fsPath,
                txtItems[1].fsPath,
                txtItems[2].fsPath,
                txtItems[3].fsPath
            ]);
        });

        test('skips an entire arg on template\'s item out of range', function() {
            const t1 = { ...tools[0] };
            
            t1.args.splice(0, 0, 'arg0 ${FOLDER_ITEM_400}');
            t1.args.splice(2, 0, 'arg2 ${FOLDER_ITEM_300}');
            
            const cmd = Compare.prepareCompareCommand(t1, txtTask.items);

            assert.deepStrictEqual(cmd.args, [
                testToolPath,
                't1', 
                txtItems[0].fsPath,
                txtItems[1].fsPath
            ]);
        });

        test('skips an entire subarg without affecting parent subarg on template\'s item out of range', function() {
            const t5 = { ...tools[4] };

            t5.args = [
                testToolPath,
                't5',
                '1',
                [
                    '1.1',
                    [
                        '1.1.1',
                        [
                            '1.1.1.1',
                            '1.1.1.2',
                            '${FOLDER_ITEM_999}',
                            '1.1.1.3',
                            '1.1.1.4'
                        ],
                        '1.1.2',
                        '1.1.3'
                    ],
                    '1.2',
                    '1.3'
                ],
                '2'
            ];

            const cmd = Compare.prepareCompareCommand(t5, txtTask.items);
            
            assert.deepStrictEqual(cmd.args, [
                testToolPath,
                't5', 
                '1',
                '1.1',
                '1.1.1',
                '1.1.2',
                '1.1.3',
                '1.2',
                '1.3',
                '2'
            ]);
        });

        test('skipping an entire subarg skips children on template\'s item out of range', function() {
            const t5 = { ...tools[4] };

            t5.args = [
                testToolPath,
                't5',
                '1',
                [
                    '1.1',
                    [
                        '1.1.1',
                        [
                            '1.1.1.1',
                            '1.1.1.2',
                            '1.1.1.3',
                            '1.1.1.4'
                        ],
                        '1.1.2',
                        '${FOLDER_ITEM_999}',
                        '1.1.3'
                    ],
                    '1.2',
                    '1.3'
                ],
                '2'
            ];

            const cmd = Compare.prepareCompareCommand(t5, txtTask.items);
            
            assert.deepStrictEqual(cmd.args, [
                testToolPath,
                't5', 
                '1',
                '1.1',
                '1.2',
                '1.3',
                '2'
            ]);
        });

        test('subargs example from readme (4 args)', function() {
            const t5 = { ...tools[4] };

            t5.args = [
                "${FOLDER_ITEM_1}",     // base / left
                "${FOLDER_ITEM_2}",     // left / right
                "${FOLDER_ITEM_3}",     // right
                [
                    "--out",
                    "${FOLDER_ITEM_4}", // Output file
                    [
                        "-L", "Label for Base",
                        "-L", "Label for Left",
                        "-L", "Label for Right",
                    ]
                ]
            ];

            const cmd = Compare.prepareCompareCommand(t5, txtTask.items);
            
            assert.deepStrictEqual(cmd.args, [
                txtItems[0].fsPath,
                txtItems[1].fsPath,
                txtItems[2].fsPath,
                '--out',
                txtItems[3].fsPath,
                "-L", 
                "Label for Base",
                "-L",
                "Label for Left",
                "-L",
                "Label for Right",
            ]);
        });

        test('subargs example from readme (2 args)', function() {
            const t5 = { ...tools[4] };

            t5.args = [
                "${FOLDER_ITEM_1}",     // base / left
                "${FOLDER_ITEM_2}",     // left / right
                "${FOLDER_ITEM_3}",     // right
                [
                    "--out",
                    "${FOLDER_ITEM_4}", // Output file
                    [
                        "-L", "Label for Base",
                        "-L", "Label for Left",
                        "-L", "Label for Right",
                    ]
                ]
            ];

            const testItems = txtTask.items.slice(0, 2);
            const cmd = Compare.prepareCompareCommand(t5, testItems);
            
            assert.deepStrictEqual(cmd.args, [
                txtItems[0].fsPath,
                txtItems[1].fsPath
            ]);
        });

    });

    suite('executeCompareCommand', function() {
        let tools: config.ExternalTool[];
        let txtTask: Compare.CompareTask;
        let cmd: Compare.CompareCommand;

        suiteSetup(async function() {
            if (!rootUri) { this.skip(); }

            tools = config.getTools();
            txtTask = await Compare.prepareCompareTask(txtItems);
            cmd = await Compare.prepareCompareCommand(tools[0], txtTask.items);
        });
        
        test('executes CompareCommand', async function() {
            let result: string;
            let cp: ChildProcess;

            this.slow(1000);

            try {
                cp = await Compare.executeCompareCommand(cmd);
            } catch (e) {
                return Promise.reject(e);
            }

            return new Promise((resolve, reject) => {
                cp.stdout?.setEncoding('utf8');
                cp.stdout?.on('data', (data) => {
                    try {
                        result = JSON.parse(data);
                        assert.strictEqual(result[2], 't1');
                        assert.strictEqual(result[3], txtItems[0].fsPath);
                        assert.strictEqual(result[4], txtItems[1].fsPath);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });

        test('throws on error', function() {
            cmd.tool.path = 'qqq';

            assert.rejects(async () => {
                await Compare.executeCompareCommand(cmd);
            }, {
                name: 'ErrorWithData',
                message: 'Encountered error while running comparison tool'
            });
        });

    });
});

function workspacePath(root?: Uri, ...pathSegments: string[]): string {
    if (root) {
        return Uri.joinPath(root, ...pathSegments).fsPath;
    }

    return '';
}
