export interface ZoneConfig {
    Name: string;
    Active: boolean;
    Power: boolean;
    Mute: boolean;
    MultipleInputs: boolean;
    Volume: boolean;
    ALM: boolean;
    ARC: boolean;
    DolbyPostProcessing: boolean;
}
export interface ReceiverConfig {
    Host: string;
    Port: number;
    PanelBrightness: boolean;
    MaxVolumeDB?: number;
    Zone1: ZoneConfig;
    Zone2: ZoneConfig;
}
/** Pure validation: never mutate the user's config or Homebridge metadata. */
export declare function normalizeConfig(value: unknown, requireHost?: boolean): ReceiverConfig;
export declare function zoneEnabled(zone: ZoneConfig): boolean;
//# sourceMappingURL=config.d.ts.map