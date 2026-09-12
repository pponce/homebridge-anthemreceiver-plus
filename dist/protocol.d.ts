/** TCP is a byte stream: a data event is not a complete receiver reply. */
export declare class ResponseFramer {
    private readonly limit;
    private decoder;
    private pending;
    constructor(limit?: number);
    push(data: Buffer): string[];
    reset(): void;
}
export declare const MAX_INPUTS = 64;
/** Validate numeric fields before allocating arrays or updating HomeKit state. */
export declare function validateReply(reply: string): void;
//# sourceMappingURL=protocol.d.ts.map