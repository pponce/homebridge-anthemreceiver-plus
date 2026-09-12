const older = ['MRX 310', 'MRX 510', 'MRX 710', 'MRX 520', 'MRX 720', 'MRX 1120', 'AVM 60'];
const newer = ['MRX 540', 'MRX 740', 'MRX 1140', 'MRX SLM', 'AVM 70', 'AVM 90'];

export const strListeningModes = [
  { name: 'Stereo', mode: 7 }, { name: 'Mono', mode: 9 },
  { name: 'Both Left', mode: 11 }, { name: 'Both Right', mode: 12 },
];

// Separate profiles: PA and IA have different bypass behavior. Bypass is not enabled yet.
const strProfiles = {
  'STR PA': { family: 'str-pa', bypass: false },
  'STR IA': { family: 'str-ia', bypass: false },
};

export function isSTR(model: string): boolean {
  return Object.prototype.hasOwnProperty.call(strProfiles, model.trim());
}

// Only commands used by the initial STR feature set. In particular, never send BRT:
// a bitrate query on an AVR can change balance on STR firmware (python-anthemav PR #40).
export function isSTRCommand(command: string): boolean {
  if (/^(IDM|IDS|IDN|ICN|ISN\d{2}|Z1(?:POW|MUT|VOL|INP|ALM))\?$/.test(command)) return true;
  if (/^Z1(?:POW|MUT)[01]$/.test(command)) return true;
  if (/^Z1ALM(?:7|9|11|12)$/.test(command)) return true;
  const volume = /^Z1VOL([+-]?\d+(?:\.\d+)?)$/.exec(command);
  if (volume) { const db = Number(volume[1]); return db >= -96 && db <= 7 && Number.isInteger(db * 2); }
  const input = /^Z1INP(\d+)$/.exec(command);
  return !!input && Number(input[1]) >= 1 && Number(input[1]) <= 64;
}

export function capabilities(model: string) {
  const normalized = model.trim();
  if (isSTR(normalized)) return { model: normalized, ...strProfiles[normalized as keyof typeof strProfiles],
    experimental: true, protocol: 1, zones: 1, brightness: false, volume: true, dolby: false,
    directListeningMode: true, arc: false, minVolumeDb: -96, maxVolumeDb: 7, volumeStepDb: 0.5 };
  if (!older.includes(normalized) && !newer.includes(normalized)) throw new Error(`Unsupported Anthem model: ${normalized.slice(0, 80)}`);
  const modern = newer.includes(normalized);
  return { model: normalized, experimental: false, protocol: modern ? 2 : 1, zones: normalized === 'MRX SLM' ? 1 : 2,
    brightness: modern, volume: modern, dolby: modern, directListeningMode: modern, arc: true };
}
