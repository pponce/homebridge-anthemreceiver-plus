import type { PlatformAccessory, Service, WithUUID } from 'homebridge';
import type { AnthemController } from './AnthemController';
import type { AnthemReceiverHomebridgePlatform } from './platform';
export declare abstract class HKAccessory {
    protected readonly platform: AnthemReceiverHomebridgePlatform;
    protected readonly Controller: AnthemController;
    protected readonly Name: string;
    protected readonly UUID: string;
    readonly Accessory: PlatformAccessory;
    constructor(platform: AnthemReceiverHomebridgePlatform, Controller: AnthemController, Name: string, UUID: string);
    protected AddService(Type: WithUUID<typeof Service>, Name: string, Subtype: string): Service;
}
//# sourceMappingURL=HKAccessory.d.ts.map