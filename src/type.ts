export type TypeName<T> = T extends bigint
    ? 'bigint'
    : T extends boolean
    ? 'boolean'
    : T extends Function
    ? 'function'
    : T extends number
    ? 'number'
    : T extends string
    ? 'string'
    : T extends Symbol
    ? 'symbol'
    : T extends undefined
    ? 'undefined'
    : 'object';
// export type TypeOf = 'bigint' | 'boolean' | 'function' | 'number' | 'object' | 'string' | 'symbol' | 'undefined';
export type TypeOf = TypeName<any>;
export type Unknown<T> = { [P in keyof T]?: unknown };
export type UndefinedPropertyNames<T> = {
    [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];
export type UndefinedProperties<T> = Pick<T, UndefinedPropertyNames<T>>;
export type DefinedPropertyNames<T> = {
    [K in keyof T]: undefined extends T[K] ? never : K;
}[keyof T];
export type DefinedProperties<T> = Pick<T, DefinedPropertyNames<T>>;

export function isStringArray(data: any): data is string[] {
    if (Array.isArray(data)) {
        return data.every(el => typeof el === 'string' || isStringArray(el) );
    }

    return false;
}

export function hasOptionalProperty<T, U extends UndefinedPropertyNames<T>>(obj: T, prop: U, type?: TypeName<T[U]>): boolean {
    if (prop in obj && type !== undefined) {
        return typeof obj[prop] === type;
    }

    return true;
}

export function hasProperty<T, K extends DefinedPropertyNames<T>>(obj: T, prop: K, type?: TypeName<T[K]>): boolean {
    if (type !== undefined) {
        return prop in obj && typeof obj[prop] === type;
    } else {
        return prop in obj;
    }
}
