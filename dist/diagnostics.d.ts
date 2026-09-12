export type QueryOutcome = 'answered' | 'rejected' | 'unrecognized' | 'timeout' | 'connection-error' | 'connection-closed' | 'cancelled';
export interface DiagnosticQuery {
    command: string;
    outcome: QueryOutcome;
    elapsedMs: number;
    replies: string[];
    receivedBytes: number;
    responseHex: string;
}
export interface DiagnosticReport {
    schemaVersion: 1;
    startedAt: string;
    finishedAt: string;
    connection: 'not-connected' | 'connected';
    finishReason: 'finished' | 'cancelled' | 'time-limit' | 'connection-error' | 'connection-closed' | 'response-limit';
    model: string;
    firmware: string;
    recognizedModel: boolean;
    experimental?: boolean;
    queryProfile?: string;
    queries: DiagnosticQuery[];
    unsolicitedReplies: string[];
    notes: string[];
}
/** Collect protocol evidence independently of model support and control initialization. */
export declare class AnthemDiagnostics {
    private readonly queryTimeout;
    private readonly totalTimeout;
    private readonly spacing;
    private cancel?;
    constructor(queryTimeout?: number, totalTimeout?: number, spacing?: number);
    stop(): void;
    run(raw: unknown, includeZone2?: boolean): Promise<DiagnosticReport>;
}
//# sourceMappingURL=diagnostics.d.ts.map