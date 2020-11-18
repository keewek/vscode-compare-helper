import * as assert from 'assert';
import { test } from 'mocha';

import * as config from '../../config';
import * as Log from '../../log';

const testConfig: config.VscodeConfiguration = {
	defaults: {
		folders: "t1",
		images: "t2",
		text: "t3",
	},
	tools: [
		{
			name: "t1",
			path: "p1",
			args: ['t1a1', 't1a2', 't1a3'],
			compares: ['folders'],
		},
		{
			name: "t2",
			path: "p2",
			args: ['t2a1', 't2a2', 't2a3'],
			compares: ['folders', 'images']
		},
		{
			name: "t3",
			path: "p3",
			args: ['t3a1', 't3a2', 't3a3'],
			compares: ['folders', 'images', 'text']
		},
		{
			name: "t4",
			path: "p4"
		},
		{
			name: "t5",
			path: "p5",
			args: ['1', ['1.1', ['1.1.1', '1.1.2'], '1.2'], '2'],
			compares: ['folders']
		}
	]
};

suite('Configuration Test Suite', function () {
	suite('isDefaultsConfiguration', function () {
		test('is false on non object', function() {
			assert.strictEqual(config.isDefaultsConfiguration(1), false);
		});

		test('is false with non string optional properties', function() {
			assert.strictEqual(config.isDefaultsConfiguration({ folders:  0 }), false);
			assert.strictEqual(config.isDefaultsConfiguration({  images:  0 }), false);
			assert.strictEqual(config.isDefaultsConfiguration({    text:  0 }), false);
		});

		test('is true on empty object', function() {
			assert.strictEqual(config.isDefaultsConfiguration({}), true);
		});

		test('is true with any additional properties', function() {
			assert.strictEqual(config.isDefaultsConfiguration({ str: '', bool: false, num: 1, }), true);
		});

		test('assert configuration', function() {
			let data: config.DefaultsConfiguration = {
				folders: 'f',
				images: 'i',
				text: 't'
			};

			assert.strictEqual(config.isDefaultsConfiguration(data), true);
		});
	});

	suite('isExternalToolConfiguration', function () {
		test('is false on non object', function() {
			assert.strictEqual(config.isExternalToolConfiguration(1), false);
		});

		test('is false on empty object', function() {
			assert.strictEqual(config.isExternalToolConfiguration({}), false);
		});

		test('is false with missing properties', function() {
			assert.strictEqual(config.isExternalToolConfiguration({ name:  '' }), false);
			assert.strictEqual(config.isExternalToolConfiguration({ path:  '' }), false);
		});

		test('is false with non string properties', function() {
			assert.strictEqual(config.isExternalToolConfiguration({ name:  0, path:  0 }), false);
		});

		test('is false with non string args array', function() {
			assert.strictEqual(config.isExternalToolConfiguration({ name:  '', path:  '', args: [1]}), false);
		});

		test('is false with extra values in compares array', function() {
			assert.strictEqual(config.isExternalToolConfiguration({ name:  '', path:  '', compares: [1]}), false);
		});

		test('configuration with required properties only', function() {
			let data: config.ExternalToolConfiguration = {
				name: 'name',
				path: 'path'
			};

			assert.strictEqual(config.isExternalToolConfiguration(data), true);
		});

		test('configuration with all properties', function() {
			let data: config.ExternalToolConfiguration = {
				name: 'name',
				path: 'path',
				args: ['1', '2', '3'],
				compares: ['folders', 'images', 'text']
			};

			assert.strictEqual(config.isExternalToolConfiguration(data), true);
		});

		test('configuration with subargs', function() {
			let data: config.ExternalToolConfiguration = {
				name: 'name',
				path: 'path',
				args: ['1', ['1.1', ['1.1.1', '1.1.2'], '1.2'], '2'],
				compares: ['folders', 'images', 'text']
			};

			assert.strictEqual(config.isExternalToolConfiguration(data), true);
		});

	});

	suite('isValidExternalTool', function () {
		test('is false with empty name', function() {
			assert.strictEqual(config.isValidExternalTool({
				name: '',
				path: 'path',
				args: [],
				compares: ['text']
			}), false);
		});

		test('is false with empty path', function() {
			assert.strictEqual(config.isValidExternalTool({
				name: 'name',
				path: '',
				args: [],
				compares: ['text']
			}), false);
		});

		test('is true on success', function() {
			assert.strictEqual(config.isValidExternalTool({
				name: 'name',
				path: 'path',
				args: [],
				compares: ['text']
			}), true);
		});

		test('logs errors with logger', function() {
			const log = new Log.NullLogger(new Log.Counter);
			
			config.setLogger(log);

			config.isValidExternalTool({
				name: '',
				path: '',
				args: [],
				compares: []
			});

			config.isValidExternalTool({
				name: 'n',
				path: '',
				args: [],
				compares: []
			});

			assert.strictEqual(log.count.error, 2);
		});

	});

	suite('asDefaults', function () {
		test('is null on invalid data', function() {
			assert.strictEqual(config.asDefaults(0), null);
		});

		test('sets missing optional properties to null', function() {
			assert.deepStrictEqual(config.asDefaults({ folders: 'f' }), { folders:  'f', images: null, text: null });
			assert.deepStrictEqual(config.asDefaults({  images: 'i' }), { folders: null, images:  'i', text: null });
			assert.deepStrictEqual(config.asDefaults({    text: 't' }), { folders: null, images: null, text:  't' });
		});
	});

	suite('asExternalTool', function () {
		test('is null on invalid data', function() {
			assert.strictEqual(config.asExternalTool(0), null);
		});

		test('sets missing args property to an empty array', function() {
			assert.deepStrictEqual(config.asExternalTool(
				{ name: 'n', path: 'p', compares: ['text'] }),
				{ name: 'n', path: 'p', compares: ['text'], args: [] }
			);
		});

		test('sets missing compares property to default value', function() {
			assert.deepStrictEqual(config.asExternalTool(
				{ name: 'n', path: 'p', args: ['1'] }),
				{ name: 'n', path: 'p', compares: ['folders', 'images', 'text'], args: ['1'] }
			);
		});
	});

	suite('processConfiguration', function () {
		let log: Log.NullLogger;

		suiteSetup(function() {
			log = new Log.NullLogger(new Log.Counter);
			config.setLogger(log);
			config.processConfiguration(testConfig);
		});

		suite('assert configuration', function () {
			const expected: config.Configuration = {
				defaults: getDefaultsFromConfig(testConfig),
				tools: getToolsFromConfig(testConfig)
			};

			test('configuration is correct', function() {
				assert.deepStrictEqual(config.getConfiguration(), expected);
			});

			test('tools count is correct', function() {
				assert.strictEqual(config.countTools(), expected.tools.length);
			});
		});

		suite('getDefaultTool', function () {
			test('returns correct tool', function() {
				assert.deepStrictEqual(config.getDefaultTool('folders'), getToolWithIndexFromConfig(testConfig, 0));
				assert.deepStrictEqual(config.getDefaultTool('images'), getToolWithIndexFromConfig(testConfig, 1));
				assert.deepStrictEqual(config.getDefaultTool('text'), getToolWithIndexFromConfig(testConfig, 2));
			});
	
			test('returns undefined for unknown keys', function() {
				assert.strictEqual(config.getDefaultTool('foo' as config.Compares), undefined);
			});
		});

		suite('getTools', function () {
			test('returns an array of all tools', function() {
				assert.deepStrictEqual(config.getTools(), getToolsFromConfig(testConfig));
			});
	
			test('with key returns a filtered array of tools', function() {
				assert.deepStrictEqual(config.getTools('folders'), getToolsFromConfig(testConfig), 'folders');
				assert.deepStrictEqual(config.getTools('images'), [
					getToolWithIndexFromConfig(testConfig, 1),
					getToolWithIndexFromConfig(testConfig, 2),
					getToolWithIndexFromConfig(testConfig, 3),
				], 'images');
				assert.deepStrictEqual(config.getTools('text'), [
					getToolWithIndexFromConfig(testConfig, 2),
					getToolWithIndexFromConfig(testConfig, 3)
				], 'text');
			});

			test('returns an empty array for unknown keys', function() {
				assert.deepStrictEqual(config.getTools('foo' as config.Compares), []);
			});
		});

		suite('Logging', function () {
			test('logs error on invalid defaults configuration', function() {
				log = new Log.NullLogger(new Log.Counter);
				config.setLogger(log);
				config.processConfiguration({
					defaults: 0,
					tools: []
				} as config.VscodeConfiguration);

				assert.strictEqual(log.count.error, 1);
				assert.strictEqual(config.getDefaultTool('folders'), undefined);
				assert.strictEqual(config.getDefaultTool('images'), undefined);
				assert.strictEqual(config.getDefaultTool('text'), undefined);
			});

			test('logs error on invalid tools configuration', function() {
				log = new Log.NullLogger(new Log.Counter);
				config.setLogger(log);
				config.processConfiguration({
					defaults: {},
					tools: 0
				} as unknown as config.VscodeConfiguration);

				assert.strictEqual(log.count.error, 1);
				assert.deepStrictEqual(config.getTools(), []);

				log.counter?.reset();
				config.processConfiguration({
					defaults: {},
					tools: [1, {}, '']
				} as unknown as config.VscodeConfiguration);

				assert.strictEqual(log.count.error, 3);
				assert.deepStrictEqual(config.getTools(), []);
			});

			test('logs error on a tool validation failure', function() {
				log = new Log.NullLogger(new Log.Counter);
				config.setLogger(log);
				config.processConfiguration({
					defaults: {},
					tools: [{name: '', path: ''}]
				} as config.VscodeConfiguration);

				assert.strictEqual(log.count.error, 2);
				assert.deepStrictEqual(config.getTools(), []);
			});

			test('logs warning on a duplicate tool name', function() {
				log = new Log.NullLogger(new Log.Counter);
				config.setLogger(log);
				config.processConfiguration({
					defaults: {},
					tools: [{name: 't1', path: 'p1'}, {name: 't1', path: 'p2'}]
				} as config.VscodeConfiguration);

				const expected: config.ExternalTool[] = [{
					name: 't1',
					path: 'p1',
					args: [],
					compares: ['folders', 'images', 'text']
				}];

				assert.strictEqual(log.count.warn, 1);
				assert.deepStrictEqual(config.getTools(), expected);
			});

			test('logs warning on a unknown default tool name', function() {
				log = new Log.NullLogger(new Log.Counter);
				config.setLogger(log);
				config.processConfiguration({
					defaults: {folders: 'e1', images: 't1', text: 't2'},
					tools: [{name: 't1', path: 'p1'}, {name: 't2', path: 'p2'}]
				} as config.VscodeConfiguration);

				const expected: config.Defaults = {
					folders: null,
					images: 't1',
					text: 't2'
				};

				assert.strictEqual(log.count.warn, 1);
				assert.deepStrictEqual(config.getConfiguration().defaults, expected);
			});
		});
	});
});

function getDefaultsFromConfig(configuration: config.VscodeConfiguration): config.Defaults {
	return (configuration as config.Configuration).defaults;
}

function getToolsFromConfig(configuration: config.VscodeConfiguration): config.ExternalTool[] {
	const config = configuration as config.Configuration;

	return config.tools.map(tool => ({
		name: tool.name,
		path: tool.path,
		args: tool.args ?? [],
		compares: tool.compares ? [...(new Set(tool.compares).values())] : ['folders', 'images', 'text']
	}));
}

// function getDefaultForKeyFromConfig(configuration: config.VscodeConfiguration, key: config.Compares): string | null {
// 	return (configuration as config.Configuration).defaults[key];
// }

function getToolWithIndexFromConfig(configuration: config.VscodeConfiguration, index: number): config.ExternalTool {
	const  config = configuration as config.Configuration;
	const tool = config.tools[index];

	return {
		name: tool.name,
		path: tool.path,
		args: tool.args ?? [],
		compares: tool.compares ? [...(new Set(tool.compares).values())] : ['folders', 'images', 'text']
	};
}
