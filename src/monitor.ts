import * as Os from 'os';
import UUID from 'pure-uuid';
import { CancellationToken, FileStat, FileSystemError, Progress, ProgressLocation, Range, Uri, window, workspace } from 'vscode';
import { ChildProcess } from 'child_process';

import * as File from './file';
import { Logger, NullLogger } from './log';
import { CompareTask, CompareItem, CompareCommand, executeCompareCommand } from './compare';
import { ErrorWithData } from './exception';
import { TextDecoder } from 'util';
// import { ErrorWithData } from './exception';

export type IncrementProgress = Progress<{
    message?: string | undefined;
    increment?: number | undefined;
}>;

export interface CompareSessionItem extends CompareItem {
    remoteUri: Uri;
}

export class CompareSession {
    private _uuid: UUID = new UUID(4);
    private _home: Uri;
    private _task: CompareTask;
    private _items: CompareItem[] = [];
    private _transferredItems: CompareSessionItem[] = [];
    private _stats: Map<CompareSessionItem, FileStat> = new Map();
    private _log: Logger;
    private _isInitialized = false;
    private _shouldDispose = true;

    constructor(task: CompareTask, root: Uri, log: Logger) {
        this._home = Uri.joinPath(root, this.uuid);
        this._task = task;
        this._log = log;
    }

    get uuid(): string {
        return this._uuid.format('std');
    }

    get home(): Uri {
        return this._home;
    }

    get task(): CompareTask {
        return this._task;
    }

    get items(): CompareItem[] {
        return this._items;
    }

    get isInitialized() : boolean {
        return this._isInitialized;
    }

    get shouldDispose() : boolean {
        return this._shouldDispose;
    }
    
    async init(progress: IncrementProgress, token: CancellationToken): Promise<boolean> {
        if (!this.task.isRemote) {
            return false;
        }

        /* istanbul ignore else */
        if (!this.isInitialized) {
            await workspace.fs.createDirectory(this.home);
    
            const itemsCount = this.task.items.length;
            const reportIncrement = 100 / itemsCount;
    
            // Scan for remote items. 
            for (const [i, item] of this.task.items.entries()) {
                let sessionItem: CompareItem;
    
                if (token.isCancellationRequested) {
                    return false;
                }
    
                progress.report({
                    increment: reportIncrement,
                    message: `Processing remote items... (${i + 1} of ${itemsCount})`
                });
    
                if (item.kind === 'file' || item.kind === 'image') {
                    if (item.uri.scheme !== 'file') {
                        // Transfer to session's folder
                        sessionItem = await this.transferItem(item);
                    } else {
                        sessionItem = item;
                    }

                    this._items.push(sessionItem);
                }
            }
     
            this._isInitialized = true;
        }

        return this.isInitialized;
    }
    
    async getChangedItems(): Promise<CompareSessionItem[]> {
        const result: CompareSessionItem[] = [];
        /* istanbul ignore next */
        const isStatsEqual = (a: FileStat, b: FileStat) => {
            if (a.ctime !== b.ctime) { return false; }
            if (a.mtime !== b.mtime) { return false; }
            if (a.size  !== b.size)  { return false; }
            // if (a.type !== b.type) { return false; }

            return true;
        };

        for (const [item, prevStat] of this._stats.entries()) {
            const newStat = await workspace.fs.stat(item.uri);

            if (!isStatsEqual(prevStat, newStat)) {
                result.push(item);
            }
        }

        return result;
    }

    sessionUriForUri(uri: Uri): Uri {
        const path = `${uri.authority}${uri.path}`;
        const sanitizedPath = File.sanitizePath(path, 'posix', Os.platform());

        return Uri.joinPath(this.home, sanitizedPath);
    }

    private async transferItem(item: CompareItem): Promise<CompareSessionItem> { 
        // const path = `${item.uri.authority}${item.uri.path}`;
        // const sanitizedPath = File.sanitizePath(path, 'posix', Os.platform());
        // const localUri = Uri.joinPath(this.home, sanitizedPath);
        const localUri = this.sessionUriForUri(item.uri);
        const mappedItem: CompareSessionItem = {
            kind: item.kind,
            type: item.type,
            remoteUri: item.uri,
            uri: localUri
        };
        
        this._log.info('Transferring remote item');
        this._log.append(`Remote: '${mappedItem.remoteUri.toString(true)}' ⟶`, '  -->  ');
        this._log.append(` Local: '${mappedItem.uri.toString(true)}'`, '  -->  ');

        await workspace.fs.copy(mappedItem.remoteUri, mappedItem.uri, { overwrite: true });

        this._transferredItems.push(mappedItem);

        await this.storeStatForItem(mappedItem);

        return mappedItem;
    }

    private async storeStatForItem(item: CompareSessionItem): Promise<void> {
        const stat = await workspace.fs.stat(item.uri);

        this._stats.set(item, stat);
    }

    private async disposeSessionHomeFolder(): Promise<void> {
        try {
            await workspace.fs.delete(this.home, {
                recursive: true,
                useTrash: false
            });
        } catch (e) {
            this._log.warn('Problems detected while removing session\'s temporary folder');
            
            /* istanbul ignore next */
            if (e instanceof FileSystemError) {
                if (e.code !== 'FileNotFound') {
                    this._log.append({
                        name: e.name,
                        code: e.code,
                        message: e.message
                    }, '  -->  ');
                }
            } else {
                this._log.append(e, '  -->  ');
            }
        }
    }

    async dispose(): Promise<void> {
        if (this.shouldDispose) {
            this._shouldDispose = false;
            this._isInitialized = false;
    
            this._items = [];
            this._transferredItems = [];
            this._stats.clear();
    
            await this.disposeSessionHomeFolder();
        }
    }
}

export function prepareSessionForTask(task: CompareTask): CompareSession {
    const session = new CompareSession(task, tmpDirUri, log);

    sessions.set(session.uuid, session);

    return session;
}

export async function initSessionAndShowProgress(session: CompareSession): Promise<boolean> {

    try {
        const isInitialized = await window.withProgress({
            location: ProgressLocation.Notification,
            cancellable: true,
            title: "Compare Helper"
        }, (progress, token) => {
            return session.init(progress, token);
        });

        if (!isInitialized) {
            disposeSession(session);
        }

        return isInitialized;

    } catch (e) {
        disposeSession(session);
        throw e;
    }
}

export async function executeCompareCommandWithSession(cmd: CompareCommand, session: CompareSession): Promise<boolean> {
    
    if (!session.isInitialized) {
        throw new ErrorWithData('Session has not been initialized', {
            scope: 'monitor.executeCompareCommandWithSession',
            data: session
        });
    }

    try {
        const cp = await executeCompareCommand(cmd);

        log.info('Waiting for external tool to exit...');

        const result = await onChildProcessExit(cp);

        log.info('External tool exit detected. ');
        log.append({
            pid: cp.pid,
            code: result.code
        }, '  -->  ');

        log.info('Checking for changed items...');

        const changedItems = await session.getChangedItems();

        log.append(`Number of changed items: ${changedItems.length}`, '  -->  ');

        if (changedItems.length > 0) {
            await syncEditor(changedItems);
        }
    } finally {
        disposeSession(session);
    }

    return true;
}

/* istanbul ignore next */
export function setLogger(logger: Logger | undefined): void {
    if (logger) {
        log = logger;
    } else {
        log = new NullLogger();
    }
}

export function getSessionCount(): number {
    return sessions.size;
}

export async function dispose(): Promise<void> {
    for (const session of sessions.values()) {
        session.dispose();
    }

    sessions.clear();
}

function onChildProcessExit(cp: ChildProcess): Promise<{ code: number | null, signal: NodeJS.Signals | null }> {
    return new Promise((resolve, _reject) => {
        cp.prependOnceListener('exit', (code, signal) => {
            resolve({
                code: code,
                signal: signal
            });
        });
    });
}

function disposeSession(session: CompareSession): Promise<void> {
    sessions.delete(session.uuid);
    return session.dispose();
}

async function syncEditor(changedItems: CompareSessionItem[]): Promise<void> {
    log.info('Synchronizing changes with editor...');

    const decoder = new TextDecoder('utf-8');

    for (const item of changedItems) {
        if (item.kind === 'file') {
            const editor = await window.showTextDocument(item.remoteUri, { preview: false });
            const data = await workspace.fs.readFile(item.uri);
            
            await editor.edit(editBuilder => {
                const range = new Range(0, 0, editor.document.lineCount, 0);
                editBuilder.replace(range, decoder.decode(data));
            }, {
                undoStopBefore: true,
                undoStopAfter: true
            });
        }
    }
}

const tmpDirUri = Uri.file(Os.tmpdir());
let log: Logger = new NullLogger();
let sessions: Map<string, CompareSession> = new Map();
