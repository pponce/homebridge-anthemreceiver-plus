/* global module */
'use strict';
// Export only a deliberate report projection, never the Homebridge configuration.
const AnthemDiagnosticReport = {
  explain(query, queries) {
    const purposes = {
      'IDM?': 'Model identification', 'IDS?': 'Firmware version', 'GSN?': 'Newer serial-number format',
      'IDN?': 'MAC address (older receivers and STR)', 'ICN?': 'Input count', 'IS1IN?': 'Newer input-1 name format', 'ISN01?': 'Older input-1 name format',
    };
    const zone = /^Z([12])(POW|MUT|VOL|PVOL|INP|ALM)\?$/.exec(query.command);
    const purpose = purposes[query.command] || (zone ? `Zone ${zone[1]} ${{ POW: 'power', MUT: 'mute', VOL: 'volume in dB', PVOL: 'volume percentage', INP: 'selected input', ALM: 'listening-mode number' }[zone[2]]}` : 'Protocol query');
    const errorCode = query.outcome === 'rejected' ? query.replies.find(reply => /^![EIRZ]/.test(reply))?.slice(0, 2) : undefined;
    const errors = { '!I': 'Invalid command', '!E': 'Command cannot be executed', '!R': 'Parameter out of range', '!Z': 'Zone is not powered' };
    const alternative = { 'IDN?': 'GSN?', 'GSN?': 'IDN?', 'ISN01?': 'IS1IN?', 'IS1IN?': 'ISN01?' }[query.command];
    const expectedAlternativeRejection = query.outcome === 'rejected' && !!alternative
      && queries.some(item => item.command === alternative && item.outcome === 'answered');
    let explanation = query.outcome === 'answered' ? 'Device replied.' : {
      timeout: 'No reply arrived within the query timeout; this does not prove lack of support.',
      unrecognized: 'Reply did not match the expected format or valid range.',
      'connection-error': 'Connection failed while querying.', 'connection-closed': 'Device closed the connection.',
      cancelled: 'Query was cancelled.', rejected: errors[errorCode] || 'Device rejected the query.',
    }[query.outcome] || 'No interpreted result.';
    if (expectedAlternativeRejection) explanation += ` Alternate format: ${alternative} answered successfully; this rejection is expected when the device uses that format.`;
    return { purpose, ...(errorCode ? { errorCode } : {}), expectedAlternativeRejection, explanation };
  },
  summarize(report) {
    const counts = { attempted: report.queries.length, answered: 0, rejected: 0, expectedAlternativeRejections: 0, otherOutcomes: 0 };
    const zones = new Map();
    let inputCount = null;
    for (const query of report.queries) {
      if (query.outcome === 'answered') counts.answered++;
      else if (query.outcome === 'rejected') counts.rejected++;
      else counts.otherOutcomes++;
      if (this.explain(query, report.queries).expectedAlternativeRejection) counts.expectedAlternativeRejections++;
      const command = /^Z([12])(POW|MUT|VOL|PVOL|INP|ALM)\?$/.exec(query.command);
      if (command && !zones.has(Number(command[1]))) zones.set(Number(command[1]), {
        zone: Number(command[1]), power: null, muted: null, volumeDb: null, volumePercent: null, input: null,
      });
      if (query.outcome !== 'answered') continue;
      for (const reply of query.replies) {
        if (query.command === 'ICN?' && /^ICN\d+$/.test(reply)) inputCount = Number(reply.slice(3));
        const state = /^Z([12])(POW|MUT|VOL|PVOL|INP|ALM)([+-]?\d+(?:\.\d+)?)$/.exec(reply);
        if (!state || !command || state[1] !== command[1] || state[2] !== command[2]) continue;
        const zone = zones.get(Number(state[1])); const value = Number(state[3]);
        if (state[2] === 'POW') zone.power = value === 1 ? 'on' : 'off';
        if (state[2] === 'MUT') zone.muted = value === 1;
        if (state[2] === 'VOL') zone.volumeDb = value;
        if (state[2] === 'PVOL') zone.volumePercent = value;
        if (state[2] === 'INP') zone.input = value;
        if (state[2] === 'ALM') zone.listeningMode = value;
      }
    }
    return { queries: counts, detectedState: { inputCount, zones: [...zones.values()] } };
  },
  build(report, context = {}, includePrivate = false, host = '') {
    const serials = [...report.queries.flatMap(query => query.replies), ...report.unsolicitedReplies]
      .filter(reply => /^(GSN|IDN)/.test(reply)).map(reply => reply.slice(3)).filter(Boolean);
    const clean = value => {
      let text = String(value ?? '');
      if (includePrivate) return text;
      for (const secret of [host, ...serials].filter(Boolean)) text = text.split(secret).join('[redacted]');
      return text.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[address redacted]')
        .replace(/\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/gi, '[address redacted]');
    };
    const replyText = (reply, command, outcome) => {
      if (includePrivate) return reply;
      // Unknown and malformed reply contents may contain private identifiers.
      if (/^![EIRZ]/.test(reply)) return reply.slice(0, 2) + '[details omitted]';
      if (outcome !== 'answered') return '[reply content omitted]';
      if (reply.startsWith('GSN')) return 'GSN[serial redacted]';
      if (reply.startsWith('IDN')) return 'IDN[MAC redacted]';
      if (/^IS/.test(reply)) return '[input name omitted]';
      if (command === 'IDM?' || command === 'IDS?' || /^(ICN\d+|Z[12](POW|MUT|VOL|PVOL|INP|ALM)[+-]?\d+(\.\d+)?)$/.test(reply)) return clean(reply);
      return '[reply content omitted]';
    };
    return {
      schemaVersion: 2, startedAt: report.startedAt, finishedAt: report.finishedAt,
      environment: report.environment, summary: this.summarize(report), connection: report.connection, finishReason: report.finishReason,
      model: clean(report.model), firmware: clean(report.firmware), recognizedModel: report.recognizedModel, experimental: report.experimental === true, queryProfile: report.queryProfile,
      userContext: { reportedModel: clean(context.reportedModel).slice(0, 120), userReportedPowerState: ['on', 'standby'].includes(context.powerState) ? context.powerState : null },
      privacy: includePrivate ? 'Includes raw replies and device identifiers. Review before sharing.' : 'Serials, MAC addresses, input names, and unrecognized replies omitted; configured address redacted.',
      queries: report.queries.map(query => ({ command: query.command, outcome: query.outcome, ...this.explain(query, report.queries),
        elapsedMs: query.elapsedMs, receivedBytes: query.receivedBytes,
        ...(includePrivate ? { responseHex: query.responseHex } : {}), replies: query.replies.map(reply => replyText(reply, query.command, query.outcome)) })),
      unsolicitedReplies: report.unsolicitedReplies.map(reply => includePrivate ? reply : '[unsolicited reply omitted]'),
      notes: report.notes,
    };
  },
};
if (typeof module !== 'undefined') module.exports = AnthemDiagnosticReport;
