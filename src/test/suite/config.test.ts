import * as assert from 'assert';
import { before, test } from 'mocha';

import * as config from '../../config';

const bareConfig: config.VscodeConfiguration = {
	defaults: {},
	tools: []
};

const emptyConfig: config.VscodeConfiguration = {
	defaults: {
		folders: '',
		images: '',
		text: ''
	},
	tools: [
		{
			args: [],
			compares: [],
			name: '',
			path: ''
		},
		{
			args: [],
			compares: [],
			name: '',
			path: ''
		}
	]
};

const invalidConfig: config.VscodeConfiguration = {
	defaults: {
		folders: 1,
		images: 2,
		text: 3
	},
	tools: [
		{
			args: 1,
			compares: 2,
			name: 3,
			path: 4
		},
		{
			args: 5,
			compares: 6,
			name: 7,
			path: 8
		}
	]
};

const goodConfig: config.VscodeConfiguration = {
	defaults: {
		folders: "meld",
		images: "p4merge",
		text: "P4merge",
	},
	tools: [
		{
			name: "p4merge",
			path: "C:\\Program\\ Files\\Perforce\\p4merge.exe",
			args: [
				"${FOLDER_ITEM_1}", // Base
				"${FOLDER_ITEM_2}", // Left
				"${FOLDER_ITEM_3}", // Right
				"${FOLDER_ITEM_4}"  // Merge
			],
			compares: ["images", "text"],
		},
		{
			name: "Meld",
			path: "C:\\Program\\ Files\\ \\(x86\\)\\Meld\\Meld.exe",
			args: [
				"${FOLDER_ITEM_1}",
				"${FOLDER_ITEM_2}",
				"${FOLDER_ITEM_3}"
			],
			compares: ["folders", "text"]
		},
		{
			name: "KDiff3",
			path: "C:\\Program\\ Files\\kdiff3\\bin\\kdiff3.exe",
			args: [
				"${FOLDER_ITEM_1}", // Base
				"${FOLDER_ITEM_2}", // Left
				"${FOLDER_ITEM_3}"  // Right
			],
			compares: ["folders", "text"]
		}
	]
};

suite('Bare Configuration Test Suite', function () {
	before(function () {
		config.processConfiguration(bareConfig);
	});

	suite('Tools', function () {
		test('count', () => {
			testToolsCountIs(0);
		});

		test('assert', () => {
			testToolsAre([]);
		});
	});

	suite('Tools with criteria', function () {
		let params: TestParam[];

		params = [
			{name: 'folders', expected: 0},
			{name: 'images',  expected: 0},
			{name: 'text',    expected: 0},
			{name: '#not assignable to type "Compares"', expected: 0}
		];

		params.forEach(param => {
			test(`count for "${param.name}"`, () => {
				testToolsWithCriteriaCountIs(param.name, param.expected);
			});
		});

		params = [
			{name: 'folders', expected: []},
			{name: 'images',  expected: []},
			{name: 'text',    expected: []},
			{name: '#not assignable to type "Compares"', expected: []}
		];

		params.forEach(param => {
			test(`assert for "${param.name}"`, () => {
				testToolsWithCriteriaAre(param.name, param.expected);
			});
		});
	});

	suite('Default tool', function () {
		let params: TestParam[];

		params = [
			{name: 'folders', expected: null},
			{name: 'images',  expected: null},
			{name: 'text',    expected: null},
			{name: '#not assignable to type "Compares"', expected: null}
		];

		params.forEach(param => {
			test(`${param.name}`, () => {
				testDefaultToolIs(param.name, param.expected);
			});
		});
	});

	test('Assert configuration', () => {
		let expected: config.Configuration = {
			defaults: {
				folders: null,
				images: null,
				text: null
			},
			tools: []
		};

		assert.deepStrictEqual(config.getConfiguration(), expected);
	});
});

suite('Empty Configuration Test Suite', function () {
	before(function () {
		config.processConfiguration(emptyConfig);
	});

	suite('Tools', function () {
		test('count', () => {
			testToolsCountIs(0);
		});

		test('assert', () => {
			testToolsAre([]);
		});
	});

	suite('Tools with criteria', function () {
		let params: TestParam[];

		params = [
			{name: 'folders', expected: 0},
			{name: 'images',  expected: 0},
			{name: 'text',    expected: 0},
			{name: '#not assignable to type "Compares"', expected: 0}
		];

		params.forEach(param => {
			test(`count for "${param.name}"`, () => {
				testToolsWithCriteriaCountIs(param.name, param.expected);
			});
		});

		params = [
			{name: 'folders', expected: []},
			{name: 'images',  expected: []},
			{name: 'text',    expected: []},
			{name: '#not assignable to type "Compares"', expected: []}
		];

		params.forEach(param => {
			test(`assert for "${param.name}"`, () => {
				testToolsWithCriteriaAre(param.name, param.expected);
			});
		});
	});

	suite('Default tool', function () {
		let params: TestParam[];

		params = [
			{name: 'folders', expected: null},
			{name: 'images',  expected: null},
			{name: 'text',    expected: null},
			{name: '#not assignable to type "Compares"', expected: null}
		];

		params.forEach(param => {
			test(`${param.name}`, () => {
				testDefaultToolIs(param.name, param.expected);
			});
		});
	});

	test('Assert configuration', () => {
		let expected: config.Configuration = {
			defaults: {
				folders: null,
				images: null,
				text: null
			},
			tools: []
		};

		assert.deepStrictEqual(config.getConfiguration(), expected);
	});
});

suite('Invalid Configuration Test Suite', function () {
	before(function () {
		config.processConfiguration(invalidConfig);
	});

	suite('Tools', function () {
		test('count', () => {
			testToolsCountIs(0);
		});

		test('assert', () => {
			testToolsAre([]);
		});
	});

	suite('Tools with criteria', function () {
		let params: TestParam[];

		params = [
			{name: 'folders', expected: 0},
			{name: 'images',  expected: 0},
			{name: 'text',    expected: 0},
			{name: '#not assignable to type "Compares"', expected: 0}
		];

		params.forEach(param => {
			test(`count for "${param.name}"`, () => {
				testToolsWithCriteriaCountIs(param.name, param.expected);
			});
		});

		params = [
			{name: 'folders', expected: []},
			{name: 'images',  expected: []},
			{name: 'text',    expected: []},
			{name: '#not assignable to type "Compares"', expected: []}
		];

		params.forEach(param => {
			test(`assert for "${param.name}"`, () => {
				testToolsWithCriteriaAre(param.name, param.expected);
			});
		});
	});

	suite('Default tool', function () {
		let params: TestParam[];

		params = [
			{name: 'folders', expected: null},
			{name: 'images',  expected: null},
			{name: 'text',    expected: null},
			{name: '#not assignable to type "Compares"', expected: null}
		];

		params.forEach(param => {
			test(`${param.name}`, () => {
				testDefaultToolIs(param.name, param.expected);
			});
		});
	});

	test('Assert configuration', () => {
		let expected: config.Configuration = {
			defaults: {
				folders: null,
				images: null,
				text: null
			},
			tools: []
		};

		assert.deepStrictEqual(config.getConfiguration(), expected);
	});
});

suite('Configuration Test Suite', function () {
	before(function () {
		config.processConfiguration(goodConfig);
	});

	suite('Tools', function () {
		test('count', () => {
			testToolsCountIs(3);
		});

		test('assert', () => {
			testToolsAre([
				getToolFromConfig(goodConfig, 0),
				getToolFromConfig(goodConfig, 1),
				getToolFromConfig(goodConfig, 2),
			]);
		});
	});

	suite('Tools with criteria', function () {
		let params: TestParam[];

		params = [
			{name: 'folders', expected: 2},
			{name: 'images',  expected: 1},
			{name: 'text',    expected: 3},
			{name: '#not assignable to type "Compares"', expected: 0}
		];

		params.forEach(param => {
			test(`count for "${param.name}"`, () => {
				testToolsWithCriteriaCountIs(param.name, param.expected);
			});
		});

		params = [
			{name: 'folders', expected: [
				getToolFromConfig(goodConfig, 1),
				getToolFromConfig(goodConfig, 2)
			]},
			{name: 'images', expected: [
				getToolFromConfig(goodConfig, 0)
			]},
			{name: 'text', expected: [
				getToolFromConfig(goodConfig, 0),
				getToolFromConfig(goodConfig, 1),
				getToolFromConfig(goodConfig, 2)
			]},
			{name: '#not assignable to type "Compares"', expected: []}
		];

		params.forEach(param => {
			test(`assert for "${param.name}"`, () => {
				testToolsWithCriteriaAre(param.name, param.expected);
			});
		});
	});

	suite('Default tool', function () {
		let params: TestParam[];

		params = [
			{name: 'folders', expected: getToolFromConfig(goodConfig, 1)},
			{name: 'images',  expected: getToolFromConfig(goodConfig, 0)},
			{name: 'text',    expected: getToolFromConfig(goodConfig, 0)},
			{name: '#not assignable to type "Compares"', expected: null}
		];

		params.forEach(param => {
			test(`${param.name}`, () => {
				testDefaultToolIs(param.name, param.expected);
			});
		});
	});

	test('Assert configuration', function () {
		let expected: config.Configuration = {
			defaults: {
				folders: goodConfig.defaults.folders as string,
				images: goodConfig.defaults.images as string,
				text: goodConfig.defaults.text as string
			},
			tools: [
				getToolFromConfig(goodConfig, 0),
				getToolFromConfig(goodConfig, 1),
				getToolFromConfig(goodConfig, 2),
			]
		};

		assert.deepStrictEqual(config.getConfiguration(), expected);
	});
});

interface TestParam {
	name: string,
	expected: any,
	msg?: string
}

function getToolFromConfig(configuration: config.VscodeConfiguration, index: number): config.ExternalTool {
	let config = configuration as config.Configuration;
	return {
		args: config.tools[index].args,
		compares: new Set(config.tools[index].compares),
		name: config.tools[index].name,
		path: config.tools[index].path
	};
}

function testToolsAre(expected: any[]) {
	let tools = config.getTools();

	assert.strictEqual(Array.isArray(tools), true);
	assert.deepStrictEqual(tools, expected);
}

function testToolsCountIs(count: number) {
	let tools = config.getTools();

	assert.strictEqual(Array.isArray(tools), true);
	assert.strictEqual(tools.length, count);
}

function testToolsWithCriteriaAre(criteria: string, expected: any) {
	let tools = config.getTools(criteria as config.Compares);

	assert.strictEqual(Array.isArray(tools), true);
	assert.deepStrictEqual(tools, expected);
}

function testToolsWithCriteriaCountIs(criteria: string, expected: any) {
	let tools = config.getTools(criteria as config.Compares);

	assert.strictEqual(Array.isArray(tools), true);
	assert.strictEqual(tools.length, expected);
}

function testDefaultToolIs(criteria: string, expected: any) {
	assert.deepStrictEqual(config.getDefaultTool(criteria as config.Compares), expected);
}
