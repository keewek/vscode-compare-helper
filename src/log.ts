'use strict';

import { OutputChannel } from 'vscode';

export interface Logger {
    error(msg: string): void,
    info(msg: string): void,
    warn(msg: string): void,
}

export class ChannelLogger implements Logger {
    readonly channel?: OutputChannel;
    
    constructor(channel: OutputChannel) {
        this.channel = channel;
    }

    private get time(): string {
        return (new Date()).toLocaleTimeString(undefined, {hour12: false});
    }

    error(msg: string): void {
        this.channel?.appendLine(`[Error - ${this.time}] ${msg}`);
    }

    info(msg: string): void {
        this.channel?.appendLine(`[Info - ${this.time}] ${msg}`);
    }

    warn(msg: string): void {
        this.channel?.appendLine(`[Warning - ${this.time}] ${msg}`);
    }
}
