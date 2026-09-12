import type { Service } from 'homebridge';
import { AnthemController } from './AnthemController';
import type { AnthemReceiverHomebridgePlatform } from './platform';
export declare class HKPowerInputAccessory {
    private readonly platform;
    private readonly Controller;
    private readonly ZoneNumber;
    private ReceiverAccessory;
    private TVService;
    private SpeakerService;
    private HdmiInputService;
    constructor(platform: AnthemReceiverHomebridgePlatform, Controller: AnthemController, ZoneNumber: number);
    SetInputs(InputArray: string[]): void;
    ConfigureTelevisionservice(): Service;
    ConfigureTelevisionSpeakerService(): Service;
    HandleMuteSet(newValue: any): void;
    HandleVolumeSelector(Value: any): void;
    HandleVolumeSet(newValue: any): void;
}
//# sourceMappingURL=HKPowerInputAccessory.d.ts.map