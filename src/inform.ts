import { commands, ExtensionContext, Extension, Uri } from 'vscode';
import { Logger } from './log';

export interface InformerInterface {
    shouldInform: boolean;
    inform(): Thenable<unknown>;
}

// interface WhatIsNewInformerOptions {
//     versionKey?: string;
// }

export class WhatIsNewInformer implements InformerInterface {
    private _versionKey = 'version';
    private _context: ExtensionContext;
    private _extensionId?: string;
    private _extensionVersion?: string;
    private _log: Logger;
    private _shouldInform?: boolean;

    constructor(context: ExtensionContext, extension: Extension<any> | undefined, log: Logger) {
        this._context = context;

        if (typeof extension !== 'undefined') {
            this._extensionId = extension.id;
            this._extensionVersion = extension.packageJSON.version;
        } else {
            this._shouldInform = false;
            log.warn('Can not determine current version of extension.');
            log.warn('Use "What is new in this version" command to see what is new.');
        }

        this._log = log;

        // if (options?.versionKey) {
        //     this._versionKey = options?.versionKey;
        // }
    }

    get shouldInform(): boolean {
        if (typeof this._shouldInform === 'undefined') {
            this._shouldInform = this.processVersion();
        }

        return this._shouldInform;
    }

    inform(): Thenable<unknown> {
        this._shouldInform = false;
        return this.showPreview();
    }

    private showPreview(): Thenable<unknown> {
        let uri = Uri.file(this._context.asAbsolutePath('WHAT-IS-NEW.md'));
        return commands.executeCommand('markdown.showPreview', uri);
    }

    private processVersion(): boolean {
        const currentVersion = `${this._extensionVersion}`;
        const storedVersion = this.getStoredVersion();
        let shouldInform: boolean;

        if (storedVersion === undefined) {
            shouldInform = false;
            this._log.info(`Current version has changed: 'undefined' ⟶ '${currentVersion}'`);
            this.setStoredVersion(currentVersion);
        } else if (currentVersion !== storedVersion) {
            shouldInform = true;
            this._log.info(`Current version has changed: '${storedVersion}' ⟶ '${currentVersion}'`);
            this.setStoredVersion(currentVersion);
        } else {
            shouldInform = false;
        }

        return shouldInform;
    }

    private getStoredVersion(): string | undefined {
        return this._context.globalState.get(`${this._extensionId}.${this._versionKey}`);
    }

    private setStoredVersion(value: string): Thenable<void> {
        return this._context.globalState.update(`${this._extensionId}.${this._versionKey}`, value);
    }

    // unsetStoredVersion(): Thenable<void> {
    //     return this._context.globalState.update(`${this._extensionId}.${this._versionKey}`, undefined);
    // }

}
