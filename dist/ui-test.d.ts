import { DiagnosticReport } from './diagnostics';
import { capabilities } from './capabilities';
export interface ReceiverPreview {
    model: string;
    serial: string;
    firmware: string;
    capabilities: ReturnType<typeof capabilities>;
    checkedAt: string;
    complete: boolean;
    inputs: Array<{
        number: number;
        name: string;
    }>;
    zones: Array<{
        number: number;
        power: boolean | null;
        mute: boolean | null;
        volume: number | null;
        input: number | null;
    }>;
}
/** An isolated, bounded read-only diagnostic. It never uses the control-command path. */
export declare class ConnectionTester {
    private readonly timeout;
    private readonly cooldown;
    private cancel?;
    private lastAttempt;
    constructor(timeout?: number, cooldown?: number);
    stop(): void;
    diagnose(raw: unknown, includeZone2?: boolean): Promise<DiagnosticReport>;
    test(raw: unknown): Promise<ReceiverPreview>;
}
//# sourceMappingURL=ui-test.d.ts.map