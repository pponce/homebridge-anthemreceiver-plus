"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthemDiagnostics = void 0;
const net = require("node:net");
const capabilities_1 = require("./capabilities");
const config_1 = require("./config");
const protocol_1 = require("./protocol");
// Fixed queries already used by the plugin's Anthem protocol implementations.
// Unknown devices are not assigned a protocol or capability profile.
const commonQueries = ['IDM?', 'IDS?', 'GSN?', 'IDN?', 'ICN?', 'IS1IN?', 'ISN01?',
    'Z1POW?', 'Z1MUT?', 'Z1VOL?', 'Z1PVOL?', 'Z1INP?'];
const zone2Queries = ['Z2POW?', 'Z2MUT?', 'Z2VOL?', 'Z2PVOL?', 'Z2INP?'];
const strQueries = ['IDS?', 'IDN?', 'ICN?', 'ISN01?', 'Z1POW?', 'Z1MUT?', 'Z1VOL?', 'Z1INP?', 'Z1ALM?'];
/** Collect protocol evidence independently of model support and control initialization. */
class AnthemDiagnostics {
    constructor(queryTimeout = 1500, totalTimeout = 30000, spacing = 150) {
        this.queryTimeout = queryTimeout;
        this.totalTimeout = totalTimeout;
        this.spacing = spacing;
    }
    stop() { this.cancel?.(); }
    async run(raw, includeZone2 = false) {
        if (this.cancel)
            throw new Error('A diagnostic test is already running');
        const config = (0, config_1.normalizeConfig)(raw);
        const report = {
            schemaVersion: 1, startedAt: new Date().toISOString(), finishedAt: '', connection: 'not-connected',
            finishReason: 'finished', model: '', firmware: '', recognizedModel: false, queries: [], unsolicitedReplies: [],
            notes: [
                'Selected Anthem queries only. Replies do not verify control commands or HomeKit compatibility.',
                'Receiver profiles sample alternative device-identity and first-input query formats; rejections can be normal.',
                'STR uses a restricted query list. Query syntax alone does not guarantee read-only behavior on every model; BRT is never queried.',
                'A timeout does not prove a feature is unsupported. Standby and connection limits can affect replies.',
                'Only the first input is sampled. Zone 2 is queried only when explicitly selected.',
                'Raw hex samples, when included, contain at most the first 1024 response bytes per query.',
            ],
        };
        let stopped = false;
        let socket;
        let active;
        let wake;
        let receivedBytes = 0;
        const halt = (reason, outcome) => {
            stopped = true;
            report.finishReason = reason;
            active?.resolve(outcome);
            wake?.();
            socket?.destroy();
        };
        this.cancel = () => halt('cancelled', 'cancelled');
        const deadline = setTimeout(() => halt('time-limit', 'timeout'), this.totalTimeout);
        const pause = () => new Promise(resolve => {
            const timer = setTimeout(() => { wake = undefined; resolve(); }, this.spacing);
            wake = () => { clearTimeout(timer); wake = undefined; resolve(); };
        });
        const connect = () => new Promise(resolve => {
            const client = new net.Socket();
            socket = client;
            const framer = new protocol_1.ResponseFramer(8192);
            let settled = false;
            const connected = (ok) => { if (!settled) {
                settled = true;
                clearTimeout(timer);
                resolve(ok);
            } };
            const timer = setTimeout(() => { connected(false); halt('connection-error', 'connection-error'); }, this.queryTimeout);
            client.on('connect', () => { report.connection = 'connected'; connected(true); });
            client.on('error', () => {
                if (client !== socket || stopped)
                    return;
                connected(false);
                halt('connection-error', 'connection-error');
            });
            client.on('close', () => {
                connected(false);
                if (client !== socket || stopped)
                    return;
                halt('connection-closed', 'connection-closed');
            });
            client.on('data', data => {
                if (client !== socket || stopped)
                    return;
                receivedBytes += data.length;
                if (active) {
                    active.receivedBytes += data.length;
                    active.responseHex = (active.responseHex + data.subarray(0, 1024).toString('hex')).slice(0, 2048);
                }
                if (receivedBytes > 65536) {
                    halt('response-limit', 'unrecognized');
                    return;
                }
                try {
                    for (const reply of framer.push(data)) {
                        const recorded = reply.slice(0, 512);
                        if (!active) {
                            if (report.unsolicitedReplies.length < 32)
                                report.unsolicitedReplies.push(recorded);
                            continue;
                        }
                        if (active.replies.length >= 32 || reply.length > 512) {
                            halt('response-limit', 'unrecognized');
                            return;
                        }
                        active.replies.push(recorded);
                        if (/^![EIRZ]/.test(reply)) {
                            active.resolve('rejected');
                            continue;
                        }
                        if (!reply.startsWith(active.command.slice(0, -1)))
                            continue;
                        try {
                            (0, protocol_1.validateReply)(reply);
                        }
                        catch {
                            active.resolve('unrecognized');
                            continue;
                        }
                        // Require a value, even for identity/name replies not covered by validateReply.
                        if (reply.length === active.command.length - 1) {
                            active.resolve('unrecognized');
                            continue;
                        }
                        if (active.command === 'IDM?') {
                            report.model = reply.slice(3).trim();
                            try {
                                report.experimental = (0, capabilities_1.capabilities)(report.model).experimental;
                                report.recognizedModel = true;
                            }
                            catch { /* Evidence only. */ }
                        }
                        if (active.command === 'IDS?')
                            report.firmware = reply.slice(3);
                        active.resolve('answered');
                    }
                }
                catch {
                    halt('response-limit', 'unrecognized');
                }
            });
            try {
                client.connect(config.Port, config.Host);
            }
            catch {
                connected(false);
                halt('connection-error', 'connection-error');
            }
        });
        try {
            const commands = [...commonQueries, ...(includeZone2 ? zone2Queries : [])];
            report.queryProfile = 'receiver-discovery';
            for (let index = 0; index < commands.length; index++) {
                const command = commands[index];
                if (stopped)
                    break;
                if (!socket || socket.destroyed) {
                    if (!await connect() || stopped)
                        break;
                }
                const started = Date.now();
                const replies = [];
                const capture = { command, replies, receivedBytes: 0, responseHex: '', resolve: (_status) => { } };
                const outcome = await new Promise(resolve => {
                    const timer = setTimeout(() => {
                        finish(capture.receivedBytes ? 'unrecognized' : 'timeout');
                        // A late reply/error must not be attributed to the next query.
                        const previous = socket;
                        socket = undefined;
                        previous?.destroy();
                    }, this.queryTimeout);
                    const finish = (status) => {
                        if (!active)
                            return;
                        clearTimeout(timer);
                        active = undefined;
                        resolve(status);
                    };
                    capture.resolve = finish;
                    active = capture;
                    const writingSocket = socket;
                    writingSocket.write(command + ';', error => { if (error && !stopped && socket === writingSocket)
                        halt('connection-error', 'connection-error'); });
                });
                report.queries.push({ command, outcome, elapsedMs: Date.now() - started, replies, receivedBytes: capture.receivedBytes, responseHex: capture.responseHex });
                if (command === 'IDM?' && (0, capabilities_1.isSTR)(report.model)) {
                    commands.splice(index + 1, commands.length, ...strQueries);
                    report.queryProfile = report.model === 'STR PA' ? 'str-pa' : 'str-ia';
                    report.notes.push('Experimental STR profile: one zone, MAC identity, dB volume and STR listening mode. Hardware validation is pending.');
                    if (includeZone2)
                        report.notes.push('Zone 2 was requested but skipped because STR has one zone.');
                }
                if (!stopped)
                    await pause();
            }
        }
        finally {
            clearTimeout(deadline);
            this.cancel = undefined;
            const previous = socket;
            socket = undefined;
            previous?.destroy();
            report.finishedAt = new Date().toISOString();
        }
        return report;
    }
}
exports.AnthemDiagnostics = AnthemDiagnostics;
//# sourceMappingURL=diagnostics.js.map