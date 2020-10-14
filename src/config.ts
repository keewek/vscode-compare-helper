'use strict';

import { Logger } from './log';

export type Compares = 'folders' | 'images' | 'text';
type TypeOf = 'bigint' | 'boolean' | 'function' | 'number' | 'object' | 'string' | 'symbol' | 'undefined';
type Unknown<T> = { [P in keyof T]?: unknown };

export interface Defaults {
    folders: string | null;
    images: string | null;
    text: string | null;
}

export interface DefaultsConfiguration {
    folders?: string;
    images?: string;
    text?: string;
}

export interface ExternalTool {
    name: string;
    path: string;
    args: string[];
    compares: Set<Compares>;
}

export interface ExternalToolConfiguration {
    name: string;
    path: string;
    args?: string[];
    compares?: Compares[];
}

export interface Configuration {
    defaults: Defaults;
    tools: ExternalTool[];
}

export interface VscodeConfiguration {
    defaults: Unknown<DefaultsConfiguration>;
    tools: Unknown<ExternalToolConfiguration>[];
}

const defaultTools: Defaults = { folders: null, images: null, text: null };
const toolsByName: Map<string, ExternalTool> = new Map();
const toolsByCompares: Map<Compares, Set<ExternalTool>> = new Map();
let log: Logger | undefined;

function resetDefaultTools(): void {
    defaultTools.folders = null;
    defaultTools.images = null;
    defaultTools.text = null;
}

function isStringArray(data: any): data is string[] {
    if (Array.isArray(data)) {
        return data.every(el => typeof el === 'string');
    }

    return false;
}

function hasOptionalProperty<T, U extends keyof T>(obj: T, prop: U, type: TypeOf): boolean {
    if (prop in obj) {
        return typeof obj[prop] === type;
    }

    return true;
}

function hasProperty<T, U extends keyof T>(obj: T, prop: U, type: TypeOf): boolean {
    return prop in obj && typeof obj[prop] === type;
}

function isDefaultsConfiguration(data: unknown): data is DefaultsConfiguration {
    let obj: DefaultsConfiguration;

    if (typeof data === 'object') {
        obj = data as DefaultsConfiguration;

        if (!hasOptionalProperty(obj, 'text', 'string')) { return false; }
        if (!hasOptionalProperty(obj, 'images', 'string')) { return false; }
        if (!hasOptionalProperty(obj, 'folders', 'string')) { return false; };

        return true;
    }

    return false;
}

function isExternalToolConfiguration(data: unknown): data is ExternalToolConfiguration {
    let obj: ExternalToolConfiguration;

    if (typeof data === 'object') {
        obj = data as ExternalToolConfiguration;
        
        if (!hasProperty(obj, 'name', 'string')) { return false; }
        if (!hasProperty(obj, 'path', 'string')) { return false; }

        // args: must be a string[] if defined
        if (obj.args !== undefined && !isStringArray(obj.args)) { return false; }
    
        // compares: allowed values are ['folders', 'images', 'text'] if defined
        if (obj.compares !== undefined) {
            if (Array.isArray(obj.compares)) {
                let filtered = obj.compares.filter(el => !['folders', 'images', 'text'].includes(el));
                if (filtered.length > 0) { return false; }
            }
        }

        return true;
    }

    return false;
}

function isValidExternalTool(tool: ExternalTool): boolean {
    if (tool.name.length < 1) { return false; }
    if (tool.path.length < 1) { return false; }

    return true;
}

function asDefaults(data: unknown): Defaults | null {
    let defaults: Defaults;

    if (isDefaultsConfiguration(data)) {
        defaults = {
            folders: data.folders ?? null,
            images: data.images ?? null,
            text: data.text ?? null
        };

        return defaults;
    }

    return null;
}

function processDefaultsConfiguration(data: unknown): Defaults {
    let defaults: Defaults | null;

    if (defaults = asDefaults(data)) {
        return defaults;
    } else {
        log?.error('processDefaultsConfiguration: Invalid configuration, skipping...');
        log?.append(data, '  |  ');
    }

    return { folders: null, images: null, text: null };
}

function asExternalTool(data: unknown): ExternalTool | null {
    let tool: ExternalTool;

    if (isExternalToolConfiguration(data)) {
        tool = {
            name: data.name,
            path: data.path,
            args: data.args ?? [],
            compares: data.compares ? new Set(data.compares) : new Set(['folders', 'images', 'text'])
        };

        return tool;
    }

    return null;
}

function processExternalToolConfiguration(data: unknown): ExternalTool[] {
    let tools: ExternalTool[] = [];
    let tool: ExternalTool | null;

    if (Array.isArray(data)) {
        data.forEach((element: unknown) => {
            if (tool = asExternalTool(element)) {
                tools.push(tool);
            } else {
                log?.error('processExternalToolConfiguration: Invalid configuration, skipping...');
                log?.append(element, '  |  ');
            }
        });
    }

    return tools;
}

function indexTools(tools: ExternalTool[], defaults?: Defaults): void {
    toolsByCompares.clear();
    toolsByName.clear();
    
    resetDefaultTools();

    toolsByCompares.set('folders', new Set());
    toolsByCompares.set('images', new Set());
    toolsByCompares.set('text', new Set());

    tools.forEach(tool => {
        if (isValidExternalTool(tool)) {
            let name = tool.name.toLowerCase();

            if (!toolsByName.has(name)) {
                toolsByName.set(name, tool);

                tool.compares.forEach(by => {
                    toolsByCompares.get(by)?.add(tool);
                });
            } else {
                log?.warn(`indexTools: Duplicate tool name "${name}", skipping...`);
                log?.append(tool, '  |  ');
            }
        } else {
            log?.warn('indexTools: Tool validation failure, skipping...');
            log?.append(tool, '  |  ');
        }
    });

    // ### Defaults ###
    if (defaults) {
        let compares: Compares[] = ['folders', 'images', 'text'];
        
        compares.forEach(by => {
            let name = defaults[by];
            if (name) {
                if (toolsByName.has(name.toLowerCase())) {
                    defaultTools[by] = name;
                } else {
                    log?.warn(`indexTools: Unknown tool "${name}", skipping setting default for "${by}"`);
                }
            }
        });
    }
}

export function processConfiguration(config: VscodeConfiguration): void {
    let defaults: Defaults;
    let tools: ExternalTool[];
   
    tools = processExternalToolConfiguration(config.tools);
    defaults = processDefaultsConfiguration(config.defaults);

    indexTools(tools, defaults);
}

export function getConfiguration(): Configuration {
    return {
        defaults: defaultTools,
        tools: getTools()
    };
}

export function getDefaultTool(compares: Compares): ExternalTool | null {
    let name = defaultTools[compares]?.toLowerCase();

    if (name) {
        return toolsByName.get(name) ?? null;
    }

    return null;
}

export function getTools(compares?: Compares): ExternalTool[] {
    let tools: ExternalTool[];

    if (compares) {
        let set = toolsByCompares.get(compares);
        tools = set ? [...set.values()] : [];
    } else {
        tools = [...toolsByName.values()];
    }

    return tools;
}

export function setLogger(logger: Logger | undefined): void {
    log = logger;
}
