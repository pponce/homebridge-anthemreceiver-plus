import type { AnthemController } from './AnthemController';
import { HKAccessory } from './HKAccessory';
import type { AnthemReceiverHomebridgePlatform } from './platform';
export declare class HKDolbyPostProcessingAccessory extends HKAccessory {
    protected readonly platform: AnthemReceiverHomebridgePlatform;
    protected readonly Controller: AnthemController;
    private readonly ZoneNumber;
    constructor(platform: AnthemReceiverHomebridgePlatform, Controller: AnthemController, ZoneNumber: number);
}
//# sourceMappingURL=HKDolbyPostProcessingAccessory.d.ts.map