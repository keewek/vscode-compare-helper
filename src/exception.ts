export class ErrorWithData extends Error {
    private _data: any;
    private _hasData: boolean = false;
    readonly scope: string;

    constructor(message: string | undefined, options?: { scope?: string; data?: any; }) {
        super(message);

        this.scope = options?.scope ?? '';
        if (options && 'data' in options) {
            this.data = options.data;
        }
    }

    set data(data: any) {
        this._hasData = true;
        this._data = data;
    }

    get data(): any {
        return this._data;
    }

    get hasData(): boolean {
        return this._hasData;
    }

    scopedMessage(separator: string = ': '): string {
        if (this.scope.length > 0) {
            return this.scope + separator + this.message;
        }

        return this.message;
    }
}

Object.defineProperty(ErrorWithData.prototype, 'name', {
    value: 'ErrorWithData'
});
