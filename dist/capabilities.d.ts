export declare const strListeningModes: {
    name: string;
    mode: number;
}[];
export declare function isSTR(model: string): boolean;
export declare function isSTRCommand(command: string): boolean;
export declare function capabilities(model: string): {
    family: string;
    bypass: boolean;
    model: string;
    experimental: boolean;
    protocol: number;
    zones: number;
    brightness: boolean;
    volume: boolean;
    dolby: boolean;
    directListeningMode: boolean;
    arc: boolean;
    minVolumeDb: number;
    maxVolumeDb: number;
    volumeStepDb: number;
} | {
    model: string;
    experimental: boolean;
    protocol: number;
    zones: number;
    brightness: boolean;
    volume: boolean;
    dolby: boolean;
    directListeningMode: boolean;
    arc: boolean;
};
//# sourceMappingURL=capabilities.d.ts.map