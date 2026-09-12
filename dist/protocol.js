"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_INPUTS = exports.ResponseFramer = void 0;
exports.validateReply = validateReply;
const node_string_decoder_1 = require("node:string_decoder");
/** TCP is a byte stream: a data event is not a complete receiver reply. */
class ResponseFramer {
    constructor(limit = 65536) {
        this.limit = limit;
        this.decoder = new node_string_decoder_1.StringDecoder('utf8');
        this.pending = '';
    }
    push(data) {
        this.pending += this.decoder.write(data);
        const replies = [];
        let end;
        while ((end = this.pending.indexOf(';')) !== -1) {
            if (end > this.limit) {
                this.reset();
                throw new Error('Receiver reply exceeds buffer limit');
            }
            const reply = this.pending.slice(0, end).trim();
            this.pending = this.pending.slice(end + 1);
            if (reply)
                replies.push(reply);
        }
        if (this.pending.length > this.limit) {
            this.reset();
            throw new Error('Receiver reply exceeds buffer limit');
        }
        return replies;
    }
    reset() { this.pending = ''; this.decoder = new node_string_decoder_1.StringDecoder('utf8'); }
}
exports.ResponseFramer = ResponseFramer;
exports.MAX_INPUTS = 64;
/** Validate numeric fields before allocating arrays or updating HomeKit state. */
function validateReply(reply) {
    if (reply.startsWith('ICN') && !/^ICN\d+$/.test(reply))
        throw new Error('Invalid receiver input count');
    if (reply.startsWith('ICN')) {
        const count = Number(reply.slice(3));
        if (count < 1 || count > exports.MAX_INPUTS)
            throw new Error('Receiver input count is out of range');
    }
    const rules = [
        [/^Z[12]POW/, /^Z[12]POW([01])$/, 0, 1],
        [/^Z[12]MUT/, /^Z[12]MUT([01])$/, 0, 1],
        [/^Z[12]INP/, /^Z[12]INP(\d+)$/, 1, exports.MAX_INPUTS],
        [/^Z[12]PVOL/, /^Z[12]PVOL(\d+(?:\.\d+)?)$/, 0, 100],
        [/^Z[12]VOL/, /^Z[12]VOL([+-]?\d+(?:\.\d+)?)$/, -100, 20],
        [/^Z[12]ALM/, /^Z[12]ALM(\d+)$/, 0, 16],
        [/^GCFPB/, /^GCFPB(\d+)$/, 0, 100],
        [/^GCLEDB/, /^GCLEDB(\d+)$/, 0, 100],
    ];
    for (const [prefix, pattern, min, max] of rules) {
        if (!prefix.test(reply))
            continue;
        const match = pattern.exec(reply);
        if (!match || !Number.isFinite(Number(match[1])) || Number(match[1]) < min || Number(match[1]) > max) {
            throw new Error('Malformed receiver state reply');
        }
    }
    const input = /^IS(\d+)(IN|ARC|DV)/.exec(reply) || /^ISN(\d{2})/.exec(reply);
    if (input && (Number(input[1]) < 1 || Number(input[1]) > exports.MAX_INPUTS))
        throw new Error('Invalid input identifier');
    if (/^IS\d+ARC/.test(reply) && !/^IS\d+ARC[01]$/.test(reply))
        throw new Error('Invalid ARC reply');
    if (/^IS\d+DV/.test(reply) && !/^IS\d+DV[0-3]$/.test(reply))
        throw new Error('Invalid Dolby reply');
}
//# sourceMappingURL=protocol.js.map