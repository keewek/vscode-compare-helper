import * as Path from 'path';
import { Uri, workspace, FileType } from 'vscode';
import { hasProperty } from './type';
import { Compares, ExternalTool, getTools, getDefaultTool, ExternalToolArgs } from './config';
import { ErrorWithData } from './exception';
import { ChildProcess, spawn } from 'child_process';

export type CompareItemKind = 'folder' | 'file' | 'image';

export interface VscodeExplorerItem {
    external?: string;
    fsPath: string;
    path?: string;
    scheme?: string;
}

export interface CompareItem {
    uri: Uri;
    type: FileType;
    kind: CompareItemKind;
}

export interface CompareTask {
    compares: Compares;
    items: CompareItem[];
    tools: ExternalTool[];
    defaultTool?: ExternalTool;
}

export interface CompareCommand {
    tool: ExternalTool;
    args: string[];
}

/* cSpell:disable */
const imageExtensions =  new Set(['3ds', 'apng', 'avci', 'avcs', 'avif', 'avifs', 'azv', 'b16', 'bmp', 'btif', 'cgm', 
    'cmx', 'dds', 'dib', 'djv', 'djvu', 'drle', 'dwg', 'dxf', 'emf', 'exr', 'fbs', 'fh', 'fh4', 'fh5', 'fh7', 'fhc', 
    'fits', 'fpx', 'fst', 'g3', 'gif', 'heic', 'heics', 'heif', 'heifs', 'hej2', 'hsj2', 'ico', 'ief', 'j2k', 'jfi', 
    'jfif', 'jhc', 'jif', 'jls', 'jng', 'jp2', 'jpe', 'jpeg', 'jpf', 'jpg', 'jpg2', 'jph', 'jpm', 'jpx', 'jxr', 'jxra', 
    'jxrs', 'jxs', 'jxsc', 'jxsi', 'jxss', 'ktx', 'ktx2', 'mdi', 'mj2', 'mmr', 'mng', 'npx', 'pbm', 'pct', 'pcx', 'pgm', 
    'pic', 'png', 'pnm', 'ppm', 'psd', 'pti', 'ras', 'rgb', 'rlc', 'sgi', 'sid', 'sub', 'svg', 'svgz', 't38', 'tap', 
    'tfx', 'tga', 'tif', 'tiff', 'uvg', 'uvi', 'uvvg', 'uvvi', 'vtf', 'wbmp', 'wdp', 'webp', 'wmf', 'xbm', 'xif', 'xpm',
    'xwd'
]);
/* cSpell:enable */

export function executeCompareCommand(cmd: CompareCommand): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
        const cp = spawn(cmd.tool.path, cmd.args, {
            detached: true,
            // stdio: 'ignore',
        });

        cp.unref();

        if (cp.pid) {
            resolve(cp);
        }

        cp.on('error', error => {
            const errorWithData = new ErrorWithData('Encountered error while running comparison tool', {
                scope: 'compare.executeCompareCommand',
                data: {
                    name: error.name,
                    message: error.message
                }
            });
            reject(errorWithData);
        });
    });
}

export function prepareCompareCommand(
    tool: ExternalTool, 
    data: CompareItem[] | { items: CompareItem[] }
): CompareCommand {

    const items: CompareItem[] = Array.isArray(data) ? data : data.items;
    let args: string[];
    
    if (tool.args.length > 0) {
        // Process args template
        args = processArgs(tool.args, items);
    } else {
        // Tool has no args template. Use all selected items as args.
        args = items.map(item => item.uri.fsPath);
    }

    return {
        tool: tool,
        args: args
    };
}

export async function prepareCompareTask(items: unknown): Promise<CompareTask> {
    // Normalize input
    const compareItems = await asCompareItems(items);
    
    // Determine what we are comparing
    const compares = determineCompares(compareItems);

    // Filter compatible tools
    const tools = getTools(compares);

    return {
        compares: compares,
        items: compareItems,
        tools: tools,
        defaultTool: getDefaultTool(compares)
    };
}

function replaceArg(arg: string, items: CompareItem[]): { isSkip: boolean, result: string } {
    const regexp = /\$\{FOLDER_ITEM_(\d+)\}/gu;
    const lastIndex = items.length - 1;

    let isSkip = false;

    const result = arg.replace(regexp, (_match, itemNumber, _offset, _string) => {
        const index = parseInt(itemNumber, 10) - 1;
        
        if (index >= 0 && index <= lastIndex) {
            return items[index].uri.fsPath;
        } else {
            isSkip = true;
            return '';
        }
    });

    return { isSkip: isSkip, result: result };
}

function processArgs(args: ExternalToolArgs, items: CompareItem[], depth = 0): string[] {
        let result: string[] = [];

        // TODO: Possible optimization, process subargs after string args.

        for (const arg of args) {
            if (Array.isArray(arg)) {
                const subArgs = processArgs(arg, items, depth + 1);
                
                // Flatten subargs
                for (const subArg of subArgs) {
                    result.push(subArg);
                }

            } else {
                const template = replaceArg(arg, items);

                if (template.isSkip) {
                    // template is out of range
                    if (depth > 0) {
                        // Skip an entire subarg
                        result = [];
                        break;
                    } else {
                        // Skip an entire arg
                        continue;
                    }
                } else {
                    result.push(template.result);
                }
            }
        }

        return result;
}

function determineCompares(items: CompareItem[]): Compares {
    let kind: CompareItemKind;
    let compares: Compares;

    if (items.length >= 2) {
        const item = items[0];
        kind = item.kind;
        
        // First item's kind determines what we compare
        switch (kind) {
            case 'folder':
                compares = 'folders';
                break;

            case 'image':
                compares = 'images';
                break;
            
            default:
                compares = 'text';
                break;
        }

        // Check that all items are of the same kind
        for (const item of items) {
            if (item.kind !== kind) {
                throw new ErrorWithData('All selected items must be of the same kind', {scope: 'compare.determineCompares', data: items});
            }
        }

        return compares;
        
    } else {
        throw new ErrorWithData('Expected an array of at least 2 items', {scope: 'compare.determineCompares', data: items});
    }
}


async function asCompareItems(items: unknown): Promise<CompareItem[]> {
    const result: CompareItem[] = [];

    if (Array.isArray(items)) {
        for (const item of items) {
            if (isVscodeExplorerItem(item)) {
                if (item.fsPath.length > 0) {
                    const uri = Uri.file(item.fsPath);
                    const stat = await workspace.fs.stat(uri);

                    result.push({
                        kind: determineKind(uri, stat.type),
                        type: stat.type,
                        uri: uri
                    });

                } else {
                    throw new ErrorWithData('"fsPath" is empty', {scope: 'compare.asCompareItems', data: item});
                }
            } else {
                throw new ErrorWithData('Unexpected format', {scope: 'compare.asCompareItems', data: item});
            }
        }
    } else {
        throw new ErrorWithData('Expected an array', {scope: 'compare.asCompareItems', data: items});
    }

    return result;
}

function determineKind(uri: Uri, type: FileType): CompareItemKind {
    let kind: CompareItemKind;

    switch (type) {
        case FileType.Directory:
            kind = 'folder';
            break;
        
        default:
            kind = isImage(uri) ? 'image' : 'file';
            break;
    }

    return kind;
}

function isVscodeExplorerItem(value: unknown): value is VscodeExplorerItem {
    let obj: VscodeExplorerItem;

    if (typeof value === 'object') {
        obj = value as VscodeExplorerItem;

        if (!hasProperty(obj, 'fsPath', 'string')) { return false; }

        return true;
    }

    return false;
}

function isImage(uri: Uri): boolean {
    const parsedPath = Path.parse(uri.fsPath);
    const ext = parsedPath.ext.slice(1); // Skip the leading '.'

    if (imageExtensions.has(ext)) {
        return true;
    }

    return false;
}
