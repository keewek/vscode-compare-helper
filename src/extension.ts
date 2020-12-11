import { commands, window, ExtensionContext, workspace, Disposable, FileSystemError } from 'vscode';
import { prepareCompareTask, prepareCompareCommand, executeCompareCommand } from './compare';
import { ErrorWithData } from "./exception";
import { ChannelLogger, Logger, Counter } from './log';
import * as Monitor from './monitor';
import * as config from './config';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
    const channel = window.createOutputChannel('Compare Helper');
    const configLog = new ChannelLogger(channel, new Counter());
    const generalLog = new ChannelLogger(channel);
    
    config.setLogger(configLog);
    Monitor.setLogger(generalLog);
    
    processConfiguration(configLog);
    
    context.subscriptions.push(generalLog, configLog, channel);
    context.subscriptions.push(registerCommandCompareFromExplorer(generalLog));
    context.subscriptions.push(registerCommandCompareFromExplorerUseDefaultTool(generalLog));
    context.subscriptions.push(registerCommandDumpConfiguration(generalLog));
    context.subscriptions.push(onDidChangeConfiguration(configLog));
}

// this method is called when your extension is deactivated
export function deactivate(): Promise<void> {
    config.setLogger(undefined);
    Monitor.setLogger(undefined);
    
    return Monitor.dispose();
}

function onDidChangeConfiguration(log: ChannelLogger): Disposable {
    return workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('compareHelper')) {
            log.info('Preparing to update configuration...');
            processConfiguration(log);
        }
    });
}

function processConfiguration(log: ChannelLogger): void {
    const extConfig = workspace.getConfiguration('compareHelper');

    log.counter?.reset();

    config.processConfiguration({
        defaults: extConfig.get('defaultExternalTools', {}),
        tools: extConfig.get('externalTools', [])
    });

    const count = log.count;

    if (count.error > 0) {
        window.showErrorMessage('Errors detected while processing configuration. See output for details...');
        log.channel?.show(true);
    }

    if (count.warn > 0) {
        window.showWarningMessage('Warnings detected while processing configuration. See output for details...');
        log.channel?.show(true);
    }
}

function registerCommandDumpConfiguration(log: ChannelLogger): Disposable {
    return commands.registerCommand('compare-helper.dumpConfiguration', () => {
        log.info('Dumping configuration...');
        log.append(config.getConfiguration(), '  -->  ');
        log.channel?.show(true);
    });
}

function registerCommandCompareFromExplorerUseDefaultTool(log: ChannelLogger): Disposable {
    return commands.registerCommand('compare-helper.compareFromExplorerUseDefaultTool', async (_activeItem, items) => {
        await onCommandCompareFromExplorer(items, log, true);
    });
}

function registerCommandCompareFromExplorer(log: ChannelLogger): Disposable {
    return commands.registerCommand('compare-helper.compareFromExplorer', async (_activeItem, items) => {
        await onCommandCompareFromExplorer(items, log, false);
    });
}

async function onCommandCompareFromExplorer(items: any, log: ChannelLogger, isUseDefault: boolean): Promise<boolean> { 
    try {
        let selectedTool: config.ExternalTool | undefined;
        const task = await prepareCompareTask(items);
        
        if (task.isRemote && task.compares === 'folders') {
            window.showWarningMessage("Current version doesn't support remote folders.");
            return false;
        }

        if (task.tools.length === 0) {
            window.showWarningMessage(`No configured tools found for ${task.compares} comparison.\n\nCheck configuration...`);
            return false;
        }

        // Use default if it is set
        if (isUseDefault && task.defaultTool) {
            selectedTool = task.defaultTool;
        }

        // Show UI for user to pick a tool to compare with
        if (!selectedTool) {
            selectedTool = await showPickToolUserInterface(task.tools);
            if (!selectedTool) {
                return true;
            }
        }

        if (task.isRemote) {
            log.info('Preparing to process remote items...');

            const session = Monitor.prepareSessionForTask(task);
            if (await Monitor.initSessionAndShowProgress(session)) {
                const cmd = prepareCompareCommand(selectedTool, session.items);
                await Monitor.executeCompareCommandWithSession(cmd, session);
            }

        } else {
            const cmd = prepareCompareCommand(selectedTool, task);
            await executeCompareCommand(cmd);
        }

        return true;
        
    } catch (e) {
        processError(e, log);
        return false;
    }
}

async function showPickToolUserInterface(tools: config.ExternalTool[]): Promise<config.ExternalTool | undefined> {
    const items = tools.map(tool => ({ label: tool.name, tool: tool })).sort((a, b) => {
        if (a.label < b.label) { return -1; }
        if (a.label > b.label) { return 1; }
        return 0;
    });
    
    const r = await window.showQuickPick(items, {placeHolder: 'Pick a tool to compare with'});
    
    if (r) {
        return r.tool;
    } else {
        return undefined;
    }
}

function processErrorWithData(err: ErrorWithData, log: Logger): void {
    log.error(err.scopedMessage());
    if (err.hasData) { log.append(err.data, '  -->  '); }  // Looks the best with 'ibm.output-colorizer' extension
    // if (err.hasData) { log.append(err.data, '  ↦  '); }
    // if (err.hasData) { log.append(err.data, '  ⤅  '); }
   
    window.showErrorMessage(`${err.message}.\n\nSee output for details...`);
    if (log instanceof ChannelLogger) {
        log.channel?.show(true);
    }
}

function processError(err: unknown, log: Logger): void {
    let errorWithData: ErrorWithData;

    if (err instanceof ErrorWithData) {
        errorWithData = err;
    } else if (err instanceof FileSystemError) {
        errorWithData = new ErrorWithData('FileSystemError', {
            data: {
                name: err.name,
                code: err.code,
                message: err.message
            }
        });
    } else if (err instanceof Error) {
        errorWithData = new ErrorWithData('Error', {
            data: {
                name: err.name,
                message: err.message
            }
        });
    } else {
        errorWithData = new ErrorWithData('Unexpected error', { data: err });
    }

    processErrorWithData(errorWithData, log);
}
