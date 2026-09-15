export declare const CACHE_VERSION: string;
export declare function canonicalJSON(value: unknown): string;
export declare function contentKey(value: unknown): Promise<string>;
export declare function modeKey(problem: Record<string, unknown>): Promise<string>;
export declare function pairKey(pair: Record<string, unknown>): Promise<string>;
