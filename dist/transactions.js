"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandTransactions = void 0;
/** State-changing operations get read-back confirmation; navigation has no state acknowledgement. */
function expectations(commands) {
    const result = new Map();
    for (const command of commands) {
        if (command.endsWith('?'))
            continue;
        const exact = /^(Z[12](?:POW|MUT|INP|PVOL|VOL|ALM)|IS\d+(?:ARC|DV)|GCFPB|GCLEDB)([+-]?\d+(?:\.\d+)?)$/.exec(command);
        if (exact) {
            const [, prefix, value] = exact;
            result.set(prefix, { query: `${prefix}?`, matches: reply => reply.startsWith(prefix) && Number(reply.slice(prefix.length)) === Number(value) });
            if (/^Z[12]POW$/.test(prefix) && value === '1') {
                for (const field of ['MUT', 'INP', 'VOL']) {
                    const state = prefix.slice(0, 2) + field;
                    result.set(state, { query: `${state}?`, matches: reply => reply.startsWith(state) && Number.isFinite(Number(reply.slice(state.length))) });
                }
            }
        }
        else {
            const relative = /^Z([12])(?:VUP\d*|VDN\d*|MUTt|AUP|ADN|ALM[np]a)$/.exec(command);
            if (relative) {
                const field = /MUT/.test(command) ? 'MUT' : /ALM|AUP|ADN/.test(command) ? 'ALM' : 'VOL';
                const prefix = `Z${relative[1]}${field}`;
                result.set(prefix, { query: `${prefix}?`, matches: reply => reply.startsWith(prefix) && Number.isFinite(Number(reply.slice(prefix.length))) });
            }
        }
    }
    return [...result.values()];
}
class CommandTransactions {
    constructor(send, ready, timeout = 7000, queueLimit = 16, onTimeout = () => { }) {
        this.send = send;
        this.ready = ready;
        this.timeout = timeout;
        this.queueLimit = queueLimit;
        this.onTimeout = onTimeout;
        this.tail = Promise.resolve();
        this.queued = 0;
        this.epoch = 0;
    }
    run(build) {
        if (!this.ready())
            return Promise.reject(new Error('Receiver is not connected and ready'));
        if (this.queued >= this.queueLimit)
            return Promise.reject(new Error('Receiver command queue is full; try again shortly'));
        this.queued++;
        const epoch = this.epoch;
        const operation = this.tail.then(async () => {
            if (epoch !== this.epoch || !this.ready())
                throw new Error('Receiver connection changed; command was not replayed');
            const commands = build();
            if (!commands.length)
                throw new Error('This action is not available in the current receiver state');
            const remaining = expectations(commands);
            if (!remaining.length) {
                await this.send(commands);
                return;
            }
            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    this.fail(new Error('Receiver did not confirm the command in time'));
                    this.onTimeout();
                }, this.timeout);
                const current = { remaining, resolve, reject, timer, poweringOn: commands.some(command => /^Z[12]POW1$/.test(command)),
                    poll: setInterval(() => {
                        if (this.pending !== current)
                            return;
                        void this.send(current.remaining.map(item => item.query)).catch(error => { if (this.pending === current)
                            this.fail(error); });
                    }, 1000) };
                this.pending = current;
                void this.send([...commands, ...remaining.map(item => item.query)]).catch(error => { if (this.pending === current)
                    this.fail(error); });
            });
        });
        this.tail = operation.catch(() => undefined);
        return operation.finally(() => { this.queued--; });
    }
    receive(reply) {
        if (!this.pending)
            return;
        // A powered-on receiver may reject status queries while its audio processor boots.
        // Retry reads until the deadline, without replaying the power command.
        if (this.pending.poweringOn && /^!Z/.test(reply))
            return;
        if (/^![ERIZ]/.test(reply)) {
            this.fail(new Error(`Receiver rejected the command (${reply.slice(0, 2)})`));
            return;
        }
        this.pending.remaining = this.pending.remaining.filter(item => !item.matches(reply));
        if (this.pending.remaining.length)
            return;
        const pending = this.pending;
        this.pending = undefined;
        clearTimeout(pending.timer);
        clearInterval(pending.poll);
        pending.resolve();
    }
    disconnect() {
        this.epoch++;
        this.fail(new Error('Receiver disconnected before confirming the command'));
    }
    fail(error) {
        if (!this.pending)
            return;
        const pending = this.pending;
        this.pending = undefined;
        clearTimeout(pending.timer);
        clearInterval(pending.poll);
        pending.reject(error);
    }
}
exports.CommandTransactions = CommandTransactions;
//# sourceMappingURL=transactions.js.map