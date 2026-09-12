export declare class CommandTransactions {
    private readonly send;
    private readonly ready;
    private readonly timeout;
    private readonly queueLimit;
    private readonly onTimeout;
    private tail;
    private queued;
    private epoch;
    private pending?;
    constructor(send: (commands: string[]) => Promise<void>, ready: () => boolean, timeout?: number, queueLimit?: number, onTimeout?: () => void);
    run(build: () => string[]): Promise<void>;
    receive(reply: string): void;
    disconnect(): void;
    private fail;
}
//# sourceMappingURL=transactions.d.ts.map