import type { AnthemController } from './AnthemController';
import type { AnthemReceiverHomebridgePlatform } from './platform';
import { HKAccessory } from './HKAccessory';
export declare class HKMuteAccessory extends HKAccessory {
    protected readonly platform: AnthemReceiverHomebridgePlatform;
    protected readonly Controller: AnthemController;
    private readonly ZoneNumber;
    private service;
    constructor(platform: AnthemReceiverHomebridgePlatform, Controller: AnthemController, ZoneNumber: number);
    HandleMuteEvent(Mute: boolean): void;
    SetMute(value: any): void;
}
//# sourceMappingURL=HKMuteAccessory.d.ts.map