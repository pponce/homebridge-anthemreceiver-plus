import type { AnthemController } from './AnthemController';
import type { AnthemReceiverHomebridgePlatform } from './platform';
import { HKAccessory } from './HKAccessory';
export declare class HKVolumeAccessory extends HKAccessory {
    protected readonly platform: AnthemReceiverHomebridgePlatform;
    protected readonly Controller: AnthemController;
    private readonly ZoneNumber;
    private service;
    constructor(platform: AnthemReceiverHomebridgePlatform, Controller: AnthemController, ZoneNumber: number);
    SetBrightness(value: any): void;
    SetMute(value: any): void;
}
//# sourceMappingURL=HKVolumeAccessory.d.ts.map