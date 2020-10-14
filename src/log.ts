'use strict';

import { OutputChannel } from 'vscode';

export interface Count {
    error: number;
    info: number;
    warn: number;
}

export interface Logger {
    count: Count;
    resetCount(): void;
    append(value: any, prefix?: string): void;
    error(msg: string): void;
    info(msg: string): void;
    warn(msg: string): void;
}

export class ChannelLogger implements Logger {
    readonly  channel?: OutputChannel;
    private errorCount: number = 0;
    private  infoCount: number = 0;
    private  warnCount: number = 0;
    
    constructor(channel: OutputChannel) {
        this.channel = channel;
    }

    private get time(): string {
        return (new Date()).toLocaleTimeString(undefined, {hour12: false});
    }

    get count(): Count {
        return { 
            error: this.errorCount,
            info: this.infoCount,
            warn: this.warnCount
         };
    }

    resetCount(): void {
        this.errorCount = 0;
        this.infoCount  = 0;
        this.warnCount  = 0;
    }

    append(value: any, prefix: string = ''): void {
        let result: string;

        switch (typeof value) {
            case 'bigint':
            case 'boolean':
            case 'function':
            case 'number':
            case 'string':
            case 'undefined':
                result = `${prefix}${value}`;
                break;
            
            case 'symbol':
                result = `${prefix}${value.toString()}`;
                break;

            case 'object':
                if (value === null) {
                    result = `${prefix}${value}`;
                } else {
                    result = JSON.stringify(value, undefined, 2).split('\n').map(line => {
                        return `${prefix}${line}`;
                    }).join('\n');
                }
                break;

            default:
                throw new TypeError(`Unsupported type: "${typeof value}"`);
                break;
        }
        
        this.channel?.append(result);
    }

    error(msg: string): void {
        this.errorCount +=1;
        this.channel?.appendLine(`[Error - ${this.time}] ${msg}`);
    }

    info(msg: string): void {
        this.infoCount +=1;
        this.channel?.appendLine(`[Info - ${this.time}] ${msg}`);
    }

    warn(msg: string): void {
        this.warnCount +=1;
        this.channel?.appendLine(`[Warning - ${this.time}] ${msg}`);
    }
}
