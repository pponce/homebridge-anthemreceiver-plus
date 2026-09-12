"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionTester = void 0;
const net = require("node:net");
const diagnostics_1 = require("./diagnostics");
const config_1 = require("./config");
const capabilities_1 = require("./capabilities");
const protocol_1 = require("./protocol");
/** An isolated, bounded read-only diagnostic. It never uses the control-command path. */
class ConnectionTester {
    constructor(timeout = 8000, cooldown = 5000) {
        this.timeout = timeout;
        this.cooldown = cooldown;
        this.lastAttempt = 0;
    }
    stop() { this.cancel?.(); }
    async diagnose(raw, includeZone2 = false) {
        if (this.cancel)
            throw new Error('A connection test is already running');
        if (Date.now() - this.lastAttempt < this.cooldown)
            throw new Error('Wait five seconds before testing again');
        (0, config_1.normalizeConfig)(raw);
        this.lastAttempt = Date.now();
        const diagnostics = new diagnostics_1.AnthemDiagnostics();
        this.cancel = () => diagnostics.stop();
        try {
            return await diagnostics.run(raw, includeZone2);
        }
        finally {
            this.cancel = undefined;
        }
    }
    test(raw) {
        if (this.cancel)
            return Promise.reject(new Error('A connection test is already running'));
        if (Date.now() - this.lastAttempt < this.cooldown)
            return Promise.reject(new Error('Wait five seconds before testing again'));
        const config = (0, config_1.normalizeConfig)(raw);
        this.lastAttempt = Date.now();
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            const framer = new protocol_1.ResponseFramer();
            let result;
            let inputCount;
            let done = false;
            const finish = (error) => {
                if (done)
                    return;
                done = true;
                clearTimeout(timer);
                this.cancel = undefined;
                socket.destroy();
                if (error || !result)
                    reject(error || new Error('No supported receiver responded at this address'));
                else {
                    result.checkedAt = new Date().toISOString();
                    resolve(result);
                }
            };
            const timer = setTimeout(() => finish(), this.timeout);
            this.cancel = () => finish(new Error('Connection test cancelled'));
            const query = (commands) => {
                if (done)
                    return;
                if (commands.some(command => !/^[A-Z0-9]+\?$/.test(command)))
                    throw new Error('Invalid diagnostic query');
                socket.write(commands.join(';') + ';', error => { if (error)
                    finish(new Error('Could not read receiver status')); });
            };
            socket.on('error', () => finish(new Error('Could not connect. Check the receiver address, port, and Connected Standby setting.')));
            socket.on('end', () => finish(result ? undefined : new Error('Receiver closed the connection before identifying itself')));
            socket.on('data', data => {
                try {
                    for (const reply of framer.push(data)) {
                        (0, protocol_1.validateReply)(reply);
                        if (reply.startsWith('IDM') && !result) {
                            const supported = (0, capabilities_1.capabilities)(reply.slice(3));
                            result = { model: supported.model, serial: '', firmware: '', capabilities: supported, checkedAt: '', complete: false, inputs: [],
                                zones: Array.from({ length: supported.zones }, (_, i) => ({ number: i + 1, power: null, mute: null, volume: null, input: null })) };
                            query(['IDS?', supported.protocol === 2 ? 'GSN?' : 'IDN?', 'ICN?', ...result.zones.map(zone => `Z${zone.number}POW?`)]);
                        }
                        if (!result)
                            continue;
                        if (/^(GSN|IDN)/.test(reply))
                            result.serial = reply.slice(3);
                        if (reply.startsWith('IDS'))
                            result.firmware = reply.slice(3);
                        if (reply.startsWith('ICN') && inputCount === undefined) {
                            inputCount = Number(reply.slice(3));
                            query(Array.from({ length: inputCount }, (_, i) => result.capabilities.protocol === 2 ? `IS${i + 1}IN?` : `ISN${String(i + 1).padStart(2, '0')}?`));
                        }
                        const input = result.capabilities.protocol === 2 ? /^IS(\d+)IN(.*)$/.exec(reply) : /^ISN(\d{2})(.*)$/.exec(reply);
                        if (input && inputCount !== undefined && Number(input[1]) <= inputCount) {
                            const name = result.model === 'MRX SLM' ? Buffer.from(input[2], 'hex').toString('utf8') : input[2];
                            const number = Number(input[1]);
                            result.inputs = result.inputs.filter(item => item.number !== number);
                            result.inputs.push({ number, name });
                            result.inputs.sort((a, b) => a.number - b.number);
                        }
                        const state = /^Z([12])(POW|MUT|VOL|INP)([+-]?\d+(?:\.\d+)?)$/.exec(reply);
                        if (state) {
                            const zone = result.zones.find(zone => zone.number === Number(state[1]));
                            if (zone) {
                                const value = Number(state[3]);
                                if (state[2] === 'POW') {
                                    const previous = zone.power;
                                    zone.power = value === 1;
                                    if (zone.power && previous !== true)
                                        query([`Z${zone.number}MUT?`, `Z${zone.number}VOL?`, `Z${zone.number}INP?`]);
                                }
                                if (state[2] === 'MUT')
                                    zone.mute = value === 1;
                                if (state[2] === 'VOL')
                                    zone.volume = value;
                                if (state[2] === 'INP')
                                    zone.input = value;
                            }
                        }
                        result.complete = !!result.serial && !!result.firmware && inputCount !== undefined && result.inputs.length === inputCount
                            && result.zones.every(zone => zone.power !== null && (!zone.power || (zone.volume !== null && zone.mute !== null && zone.input !== null)));
                        if (result.complete) {
                            finish();
                            return;
                        }
                    }
                }
                catch (error) {
                    finish(error instanceof Error ? error : new Error('Invalid receiver response'));
                }
            });
            try {
                socket.connect(config.Port, config.Host, () => query(['IDM?']));
            }
            catch (error) {
                finish(error instanceof Error ? error : new Error('Invalid receiver address'));
            }
        });
    }
}
exports.ConnectionTester = ConnectionTester;
//# sourceMappingURL=ui-test.js.map