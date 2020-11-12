import { OutputChannel } from 'vscode';

export interface Count {
    error: number;
    info: number;
    warn: number;
}

export interface Logger {
    count: Count;

    append(value: any, prefix?: string): void;
    error(msg: string): void;
    info(msg: string): void;
    warn(msg: string): void;
}

export class Counter implements Count {
    error: number = 0;
     info: number = 0;
     warn: number = 0;

    get count(): Count {
        return {
            error: this.error,
             info: this.info,
             warn: this.warn
        };
    }

    incrementError(): void {
        this.error += 1;
    }

    incrementInfo(): void {
        this.info += 1;
    }

    incrementWarn(): void {
        this.warn += 1;
    }

    reset(): void {
        this.error = 0;
        this.info  = 0;
        this.warn  = 0;
    }
}

export class NullLogger implements Logger {
    private _counter?: Counter;
    
    constructor(counter?: Counter) {
        if (counter) {
            this._counter = counter;
        }
    }

    get count(): Count {
        return this._counter?.count ?? { error: 0, info: 0, warn: 0 };
    }

    get counter(): Counter | undefined {
        return this._counter;
    }

    append(_value: any, _prefix?: string): void {
        // NULL
    }

    error(_msg: string): void {
        this._counter?.incrementError();
    }

    info(_msg: string): void {
        this._counter?.incrementInfo();
    }

    warn(_msg: string): void {
        this._counter?.incrementWarn();
    }
}

export class ChannelLogger implements Logger {
    private _channel?: OutputChannel;
    private _counter?: Counter;
    
    constructor(channel: OutputChannel, counter?: Counter) {
        this._channel = channel;
        if (counter) {
            this._counter = counter;
        }
    }

    dispose(): void {
        this._channel = undefined;
    }

    private get time(): string {
        return (new Date()).toLocaleTimeString(undefined, {hour12: false});
    }

    get channel(): OutputChannel | undefined {
        return this._channel;
    }

    get count(): Count {
        return this._counter?.count ?? { error: 0, info: 0, warn: 0 };
    }

    get counter(): Counter | undefined {
        return this._counter;
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
                    result = JSON.stringify(value, undefined, 2).split('\n').map(line => `${prefix}${line}`).join('\n');
                }
                break;
                
            /* istanbul ignore next */
            default:
                throw new TypeError(`Unsupported type: "${typeof value}"`);
                break;
        }
        
        this.channel?.appendLine(result);
    }

    error(msg: string): void {
        this._counter?.incrementError();
        this.channel?.appendLine(`[Error   - ${this.time}] ${msg}`);
    }

    info(msg: string): void {
        this._counter?.incrementInfo();
        this.channel?.appendLine(`[Info    - ${this.time}] ${msg}`);
    }

    warn(msg: string): void {
        this._counter?.incrementWarn();
        this.channel?.appendLine(`[Warning - ${this.time}] ${msg}`);
    }
}
