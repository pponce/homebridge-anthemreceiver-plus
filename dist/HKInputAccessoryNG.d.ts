import type { AnthemController } from './AnthemController';
import { HKAccessory } from './HKAccessory';
import type { AnthemReceiverHomebridgePlatform } from './platform';
export declare class HKInputAccessoryNG extends HKAccessory {
    protected readonly platform: AnthemReceiverHomebridgePlatform;
    protected readonly Controller: AnthemController;
    private readonly ZoneNumber;
    private Inputs;
    constructor(platform: AnthemReceiverHomebridgePlatform, Controller: AnthemController, ZoneNumber: number);
    private Update;
    SetInputs(inputs: string[]): void;
}
//# sourceMappingURL=HKInputAccessoryNG.d.ts.map