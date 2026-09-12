import type { AnthemController } from './AnthemController';
import type { AnthemReceiverHomebridgePlatform } from './platform';
import { HKAccessory } from './HKAccessory';
export declare class HKARCAccessory extends HKAccessory {
    protected readonly platform: AnthemReceiverHomebridgePlatform;
    protected readonly Controller: AnthemController;
    private readonly ZoneNumber;
    private service;
    constructor(platform: AnthemReceiverHomebridgePlatform, Controller: AnthemController, ZoneNumber: number);
    private HandleARCEvent;
    SwitchARC(Value: any): void;
}
//# sourceMappingURL=HKARCAccessory.d.ts.map