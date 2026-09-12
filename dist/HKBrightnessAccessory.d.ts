import type { AnthemController } from './AnthemController';
import type { AnthemReceiverHomebridgePlatform } from './platform';
import { HKAccessory } from './HKAccessory';
export declare class HKBrightnessAccessory extends HKAccessory {
    protected readonly platform: AnthemReceiverHomebridgePlatform;
    protected readonly Controller: AnthemController;
    private service;
    private PanelBrightnessOn;
    constructor(platform: AnthemReceiverHomebridgePlatform, Controller: AnthemController);
    SetPanelBrightness(value: any): void;
    AllZonesOff(): boolean;
    SetPanelOn(value: any): void;
}
//# sourceMappingURL=HKBrightnessAccessory.d.ts.map