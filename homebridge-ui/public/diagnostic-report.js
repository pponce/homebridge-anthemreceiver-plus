/* global module */
'use strict';
// Export only a deliberate report projection, never the Homebridge configuration.
const AnthemDiagnosticReport = {
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
      if (/^(GSN|IDN)/.test(reply)) return reply.slice(0, 3) + '[serial redacted]';
      if (/^IS/.test(reply)) return '[input name omitted]';
      if (command === 'IDM?' || command === 'IDS?' || /^(ICN\d+|Z[12](POW|MUT|VOL|PVOL|INP)[+-]?\d+(\.\d+)?)$/.test(reply)) return clean(reply);
      return '[reply content omitted]';
    };
    return {
      schemaVersion: report.schemaVersion, startedAt: report.startedAt, finishedAt: report.finishedAt,
      environment: report.environment, connection: report.connection, finishReason: report.finishReason,
      model: clean(report.model), firmware: clean(report.firmware), recognizedModel: report.recognizedModel,
      userContext: { reportedModel: clean(context.reportedModel).slice(0, 120), powerState: context.powerState },
      privacy: includePrivate ? 'Includes raw replies and device identifiers. Review before sharing.' : 'Serials, input names, and unrecognized replies omitted; configured address redacted.',
      queries: report.queries.map(query => ({ command: query.command, outcome: query.outcome,
        elapsedMs: query.elapsedMs, receivedBytes: query.receivedBytes,
        ...(includePrivate ? { responseHex: query.responseHex } : {}), replies: query.replies.map(reply => replyText(reply, query.command, query.outcome)) })),
      unsolicitedReplies: report.unsolicitedReplies.map(reply => includePrivate ? reply : '[unsolicited reply omitted]'),
      notes: report.notes,
    };
  },
};
if (typeof module !== 'undefined') module.exports = AnthemDiagnosticReport;
