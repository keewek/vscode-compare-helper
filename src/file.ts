import * as Path from 'path';

export type Platform = NodeJS.Platform | "posix";

export interface SanitizeNameOptions {
    removeReservedChars?: boolean;
}

export function sanitizeName(name: string, targetPlatform: Platform, options?: SanitizeNameOptions): string {
    const isRemoveReservedChars = options?.removeReservedChars ?? false;
    const replacementChar = isRemoveReservedChars ? '' : '-';
    let result: string;
    
    result = name.trim();

    // Remove Control chars
    result = result.replace(/\p{Cc}/gu, '');
    
    // Replace or remove reserved chars
    // Most chars are reserved only on Windows but we will replace across all platforms anyway
    result = result.replace(/[<>:"/\\|?*]/gu, replacementChar);

    // Remove trailing periods and spaces
    result = result.replace(/[ .]+$/u, '');

    // Prefix Windows reserved filenames
    if (targetPlatform === 'win32') {
        const name = Path.parse(result).name.toLowerCase().trim();

        if (/^(con|prn|aux|nul|com\d|lpt\d)$/u.test(name)) {
            result = '_' + result;
        }
    }

    return result;
}

export function sanitizePath(path: string, sourcePlatform: Platform, targetPlatform?: Platform): string {
    let sanitizedRoot: string;
    let sanitizedDir: string;
    let dirs: string[];
    let names: string[];

    if (targetPlatform === undefined) {
        targetPlatform = sourcePlatform;
    }

    const platformPathSource = sourcePlatform === 'win32' ? Path.win32 : Path.posix;
    const platformPathTarget = targetPlatform === 'win32' ? Path.win32 : Path.posix;

    const parsedPath = platformPathSource.parse(path.trim());
    const sanitizedBase = sanitizeName(parsedPath.base, targetPlatform);

    // Need to sanitize root separately. 
    // Otherwise roots, e.g.,     `C:\`, `C:/`, `\`, `/`
    // will transform into, i.e., `C--`, `C--`, `-`, `-`
    // as `:`, '\', `/` are among the reserved chars.
    sanitizedRoot = sanitizeName(parsedPath.root, targetPlatform, { removeReservedChars: true });
   
    names = [sanitizedRoot];                              // Add sanitized root
    dirs = parsedPath.dir
        .slice(parsedPath.root.length)                    // Skip over `root` part
        .split(platformPathSource.sep);                   // Split using source platform's separator

    for (const dir of dirs) {
        names.push(sanitizeName(dir, targetPlatform));    // Sanitize per target platform's rules
    }

    sanitizedDir = names.join(platformPathTarget.sep);    // Join using target platform's separator

    return platformPathTarget.format({
        dir: sanitizedDir,
        base: sanitizedBase
    });
}
