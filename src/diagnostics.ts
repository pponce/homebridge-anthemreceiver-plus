import net = require('node:net');
import { capabilities } from './capabilities';
import { normalizeConfig } from './config';
import { ResponseFramer, validateReply } from './protocol';

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
  queries: DiagnosticQuery[];
  unsolicitedReplies: string[];
  notes: string[];
}

// Fixed queries already used by the plugin's Anthem protocol implementations.
// Unknown devices are not assigned a protocol or capability profile.
const commonQueries = ['IDM?', 'IDS?', 'GSN?', 'IDN?', 'ICN?', 'IS1IN?', 'ISN01?',
  'Z1POW?', 'Z1MUT?', 'Z1VOL?', 'Z1PVOL?', 'Z1INP?'];
const zone2Queries = ['Z2POW?', 'Z2MUT?', 'Z2VOL?', 'Z2PVOL?', 'Z2INP?'];

/** Collect protocol evidence independently of model support and control initialization. */
export class AnthemDiagnostics {
  private cancel?: () => void;
  constructor(private readonly queryTimeout = 1500, private readonly totalTimeout = 30000, private readonly spacing = 150) {}
  stop(): void { this.cancel?.(); }

  async run(raw: unknown, includeZone2 = false): Promise<DiagnosticReport> {
    if (this.cancel) throw new Error('A diagnostic test is already running');
    const config = normalizeConfig(raw);
    const report: DiagnosticReport = {
      schemaVersion: 1, startedAt: new Date().toISOString(), finishedAt: '', connection: 'not-connected',
      finishReason: 'finished', model: '', firmware: '', recognizedModel: false, queries: [], unsolicitedReplies: [],
      notes: [
        'Read-only Anthem query probe. Replies do not verify control commands or HomeKit compatibility.',
        'Both known serial-number and first-input query formats are sampled; rejections can be normal.',
        'A timeout does not prove a feature is unsupported. Standby and connection limits can affect replies.',
        'Only the first input is sampled. Zone 2 is queried only when explicitly selected.',
        'Raw hex samples, when included, contain at most the first 1024 response bytes per query.',
      ],
    };
    let stopped = false;
    let socket: net.Socket | undefined;
    let active: { command: string; replies: string[]; receivedBytes: number; responseHex: string; resolve: (status: QueryOutcome) => void } | undefined;
    let wake: (() => void) | undefined;
    let receivedBytes = 0;
    const halt = (reason: DiagnosticReport['finishReason'], outcome: QueryOutcome) => {
      stopped = true; report.finishReason = reason;
      active?.resolve(outcome); wake?.(); socket?.destroy();
    };
    this.cancel = () => halt('cancelled', 'cancelled');
    const deadline = setTimeout(() => halt('time-limit', 'timeout'), this.totalTimeout);
    const pause = () => new Promise<void>(resolve => {
      const timer = setTimeout(() => { wake = undefined; resolve(); }, this.spacing);
      wake = () => { clearTimeout(timer); wake = undefined; resolve(); };
    });
    const connect = () => new Promise<boolean>(resolve => {
      const client = new net.Socket(); socket = client;
      const framer = new ResponseFramer(8192);
      let settled = false;
      const connected = (ok: boolean) => { if (!settled) { settled = true; clearTimeout(timer); resolve(ok); } };
      const timer = setTimeout(() => { connected(false); halt('connection-error', 'connection-error'); }, this.queryTimeout);
      client.on('connect', () => { report.connection = 'connected'; connected(true); });
      client.on('error', () => {
        if (client !== socket || stopped) return;
        connected(false); halt('connection-error', 'connection-error');
      });
      client.on('close', () => {
        connected(false);
        if (client !== socket || stopped) return;
        halt('connection-closed', 'connection-closed');
      });
      client.on('data', data => {
        if (client !== socket || stopped) return;
        receivedBytes += data.length;
        if (active) {
          active.receivedBytes += data.length;
          active.responseHex = (active.responseHex + data.subarray(0, 1024).toString('hex')).slice(0, 2048);
        }
        if (receivedBytes > 65536) { halt('response-limit', 'unrecognized'); return; }
        try {
          for (const reply of framer.push(data)) {
            const recorded = reply.slice(0, 512);
            if (!active) {
              if (report.unsolicitedReplies.length < 32) report.unsolicitedReplies.push(recorded);
              continue;
            }
            if (active.replies.length >= 32 || reply.length > 512) { halt('response-limit', 'unrecognized'); return; }
            active.replies.push(recorded);
            if (/^![EIRZ]/.test(reply)) { active.resolve('rejected'); continue; }
            if (!reply.startsWith(active.command.slice(0, -1))) continue;
            try { validateReply(reply); } catch { active.resolve('unrecognized'); continue; }
            // Require a value, even for identity/name replies not covered by validateReply.
            if (reply.length === active.command.length - 1) { active.resolve('unrecognized'); continue; }
            if (active.command === 'IDM?') {
              report.model = reply.slice(3).trim();
              try { capabilities(report.model); report.recognizedModel = true; } catch { /* Evidence only. */ }
            }
            if (active.command === 'IDS?') report.firmware = reply.slice(3);
            active.resolve('answered');
          }
        } catch { halt('response-limit', 'unrecognized'); }
      });
      try { client.connect(config.Port, config.Host); }
      catch { connected(false); halt('connection-error', 'connection-error'); }
    });
    try {
      for (const command of [...commonQueries, ...(includeZone2 ? zone2Queries : [])]) {
        if (stopped) break;
        if (!socket || socket.destroyed) {
          if (!await connect() || stopped) break;
        }
        const started = Date.now();
        const replies: string[] = [];
        const capture = { command, replies, receivedBytes: 0, responseHex: '', resolve: (_status: QueryOutcome) => {} };
        const outcome = await new Promise<QueryOutcome>(resolve => {
          const timer = setTimeout(() => {
            finish(capture.receivedBytes ? 'unrecognized' : 'timeout');
            // A late reply/error must not be attributed to the next query.
            const previous = socket; socket = undefined; previous?.destroy();
          }, this.queryTimeout);
          const finish = (status: QueryOutcome) => {
            if (!active) return;
            clearTimeout(timer); active = undefined; resolve(status);
          };
          capture.resolve = finish; active = capture;
          const writingSocket = socket!;
          writingSocket.write(command + ';', error => { if (error && !stopped && socket === writingSocket) halt('connection-error', 'connection-error'); });
        });
        report.queries.push({ command, outcome, elapsedMs: Date.now() - started, replies, receivedBytes: capture.receivedBytes, responseHex: capture.responseHex });
        if (!stopped) await pause();
      }
    } finally {
      clearTimeout(deadline); this.cancel = undefined;
      const previous = socket; socket = undefined; previous?.destroy();
      report.finishedAt = new Date().toISOString();
    }
    return report;
  }
}
