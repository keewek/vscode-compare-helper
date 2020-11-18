import { Logger, NullLogger } from './log';
import { Unknown, hasOptionalProperty, hasProperty, isStringArray } from './type';

export type Compares = 'folders' | 'images' | 'text';
export type ExternalToolArgs = Array<string | ExternalToolArgs>;

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
    args: ExternalToolArgs;
    compares: Compares[];
}

export interface ExternalToolConfiguration {
    name: string;
    path: string;
    args?: ExternalToolArgs;
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
let log: Logger = new NullLogger();

export function isDefaultsConfiguration(data: unknown): data is DefaultsConfiguration {
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

export function isExternalToolConfiguration(data: unknown): data is ExternalToolConfiguration {
    let obj: ExternalToolConfiguration;

    if (typeof data === 'object') {
        obj = data as ExternalToolConfiguration;
        
        if (!hasProperty(obj, 'name', 'string')) { return false; }
        if (!hasProperty(obj, 'path', 'string')) { return false; }

        // args: must be a string[] if defined
        if (obj.args !== undefined && !isStringArray(obj.args)) { return false; }
    
        // compares: allowed values are ['folders', 'images', 'text'] if defined
        if (obj.compares !== undefined && Array.isArray(obj.compares)) {
            const filtered = obj.compares.filter(el => !['folders', 'images', 'text'].includes(el));
            if (filtered.length > 0) { return false; }
        }

        return true;
    }

    return false;
}

export function isValidExternalTool(tool: ExternalTool): boolean {
    if (tool.name.length < 1) {
        log.error(`config.isValidExternalTool: "name" must not be empty`);
        return false;
    }

    if (tool.path.length < 1) {
        log.error('config.isValidExternalTool: "path" must not be empty');
        return false;
    }

    return true;
}

export function asDefaults(data: unknown): Defaults | null {
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

export function asExternalTool(data: unknown): ExternalTool | null {
    let tool: ExternalTool;

    if (isExternalToolConfiguration(data)) {
        tool = {
            name: data.name,
            path: data.path,
            args: data.args ?? [],
            compares: data.compares ? [...(new Set(data.compares).values())] : ['folders', 'images', 'text']
        };

        return tool;
    }

    return null;
}

export function processConfiguration(config: VscodeConfiguration): void {
    let defaults: Defaults;
    let tools: ExternalTool[];
   
    log.info('Processing configuration...');

    tools = processExternalToolConfiguration(config.tools);
    defaults = processDefaultsConfiguration(config.defaults);

    indexTools(tools, defaults);

    log.info(`Finished processing configuration... Tools count: ${countTools()}`);
}

export function getConfiguration(): Configuration {
    return {
        defaults: defaultTools,
        tools: getTools()
    };
}

export function getDefaultTool(compares: Compares): ExternalTool | undefined {
    const name = defaultTools[compares]?.toLowerCase();

    return name ? toolsByName.get(name) : undefined;
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

export function countTools(): number {
    return toolsByName.size;
}

export function setLogger(logger: Logger | undefined): void {
    /* istanbul ignore else */
    if (logger) {
        log = logger;
    } else {
        log = new NullLogger();
    }
}

function resetDefaultTools(): void {
    defaultTools.folders = null;
    defaultTools.images = null;
    defaultTools.text = null;
}

function processDefaultsConfiguration(data: unknown): Defaults {
    let defaults: Defaults | null;

    if (defaults = asDefaults(data)) {
        return defaults;
    } else {
        log.error('config.processDefaultsConfiguration: Invalid configuration, skipping...');
        log.append(data, '  -->  ');
    }

    return { folders: null, images: null, text: null };
}

function processExternalToolConfiguration(data: unknown): ExternalTool[] {
    let tools: ExternalTool[] = [];
    let tool: ExternalTool | null;

    if (Array.isArray(data)) {
        for (const element of data) {
            if (tool = asExternalTool(element)) {
                tools.push(tool);
            } else {
                log.error('config.processExternalToolConfiguration: Invalid configuration, skipping...');
                log.append(element, '  -->  ');
            } 
        }
    } else {
        log.error('config.processExternalToolConfiguration: Expected an array, skipping...');
        log.append(data, '  -->  ');
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

    for (const tool of tools) {
        if (isValidExternalTool(tool)) {
            let key = tool.name.toLowerCase();
    
            if (!toolsByName.has(key)) {
                toolsByName.set(key, tool);
    
                for (const by of tool.compares) {
                    /* istanbul ignore next */
                    toolsByCompares.get(by)?.add(tool);
                }
            } else {
                log.warn(`config.indexTools: Duplicate tool name "${tool.name}", skipping...`);
                log.append(tool, '  -->  ');
            }
        } else {
            log.error('config.indexTools: Tool validation failure, skipping...');
            log.append(tool, '  -->  ');
        }
    }

    // ### Defaults ###
    /* istanbul ignore else */
    if (defaults) {
        let compares: Compares[] = ['folders', 'images', 'text'];
        
        for (const by of compares) {
            let toolName = defaults[by];
            /* istanbul ignore else */
            if (toolName) {
                if (toolsByName.has(toolName.toLowerCase())) {
                    defaultTools[by] = toolName;
                } else {
                    log.warn(`config.indexTools: Unknown tool "${toolName}", skipping setting default for "${by}"`);
                }
            }
        }
    }
}
