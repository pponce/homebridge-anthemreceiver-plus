import type { AnthemController } from './AnthemController';
import type { AnthemReceiverHomebridgePlatform } from './platform';
import { HKAccessory } from './HKAccessory';
export declare class HKPowerAccessory extends HKAccessory {
    protected readonly platform: AnthemReceiverHomebridgePlatform;
    protected readonly Controller: AnthemController;
    protected readonly ZoneNumber: number;
    private service;
    constructor(platform: AnthemReceiverHomebridgePlatform, Controller: AnthemController, ZoneNumber: number);
    HandlePowerEvent(Power: boolean): void;
    SetPower(value: any): void;
}
//# sourceMappingURL=HKPowerAccessory.d.ts.map