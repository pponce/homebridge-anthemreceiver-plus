"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeConfig = normalizeConfig;
exports.zoneEnabled = zoneEnabled;
const zoneFlags = ['Active', 'Power', 'Mute', 'MultipleInputs', 'Volume', 'ALM', 'ARC', 'DolbyPostProcessing'];
function object(value, label) {
    if (value === undefined)
        return {};
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error(`${label} must be an object`);
    return value;
}
function boolean(value, label) {
    if (value === undefined)
        return false;
    if (typeof value !== 'boolean')
        throw new Error(`${label} must be true or false`);
    return value;
}
/** Pure validation: never mutate the user's config or Homebridge metadata. */
function normalizeConfig(value, requireHost = true) {
    const raw = object(value, 'Configuration');
    if (raw.platform !== undefined && raw.platform !== 'AnthemReceiver')
        throw new Error('Invalid Anthem platform identifier');
    const host = raw.Host ?? '';
    if (typeof host !== 'string' || /[\s/;\x00-\x1f]/.test(host.trim()) || host.length > 253)
        throw new Error('Host must be an IP address or hostname without a port or URL');
    if (requireHost && !host.trim())
        throw new Error('Enter the receiver IP address or hostname');
    const port = raw.Port ?? 14999;
    if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535)
        throw new Error('Port must be a number between 1 and 65535');
    const max = raw.MaxVolumeDB;
    if (max !== undefined && (typeof max !== 'number' || !Number.isFinite(max) || max < -89.5 || max > 10))
        throw new Error('Maximum volume must be between -89.5 and 10 dB');
    const zone = (key) => {
        const input = object(raw[key], key);
        const name = input.Name ?? (key === 'Zone1' ? 'Zone 1' : 'Zone 2');
        if (typeof name !== 'string' || name.length > 128)
            throw new Error(`${key} name must be text, up to 128 characters`);
        const output = { Name: name.trim() || (key === 'Zone1' ? 'Zone 1' : 'Zone 2') };
        for (const keyName of zoneFlags)
            output[keyName] = boolean(input[keyName], `${key}.${keyName}`);
        return output;
    };
    return { Host: host.trim(), Port: port, PanelBrightness: boolean(raw.PanelBrightness, 'PanelBrightness'),
        MaxVolumeDB: max, Zone1: zone('Zone1'), Zone2: zone('Zone2') };
}
function zoneEnabled(zone) {
    return zoneFlags.some(key => zone[key]);
}
//# sourceMappingURL=config.js.map