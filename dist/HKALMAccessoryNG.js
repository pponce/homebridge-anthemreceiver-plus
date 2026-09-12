"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HKALMAccessoryNG = void 0;
const HKAccessory_1 = require("./HKAccessory");
class HKALMAccessoryNG extends HKAccessory_1.HKAccessory {
    constructor(platform, Controller, ZoneNumber) {
        super(platform, Controller, 'Zone' + ZoneNumber + ' ALM', // Name
        Controller.SerialNumber + ZoneNumber + 'ALM NG'); // UUID
        this.platform = platform;
        this.Controller = Controller;
        this.ZoneNumber = ZoneNumber;
        this.platform.log.info('Zone' + ZoneNumber + ': Audio Listening Mode');
        // set accessory information
        this.Accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' ALM Accessory')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' ALM');
        // Create service list
        // Model-specific numbers; receiver None and existing service subtypes remain stable.
        const ALM = this.Controller.GetListeningModes();
        for (let i = 0; i < ALM.length; i++) {
            const { name, mode } = ALM[i];
            const service = this.AddService(this.platform.Service.Switch, name, name);
            service.getCharacteristic(this.platform.Characteristic.On).onSet((Value) => {
                // These switches select a mode. Restore confirmed state after an Off request.
                if (!Value) {
                    setTimeout(() => {
                        service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.Controller.GetZonePower(this.ZoneNumber) && this.Controller.GetZone(this.ZoneNumber)?.GetALM() === mode);
                    }, 100);
                    return;
                }
                return this.platform.HandleSet(() => {
                    if (!this.Controller.GetZonePower(this.ZoneNumber)) {
                        throw new Error('Turn the zone on before selecting a listening mode');
                    }
                    this.Controller.SetAudioListeningMode(this.ZoneNumber, mode);
                });
            });
        }
        Controller.on('ZoneALMChange', (Zone, AudioMode) => {
            if (this.ZoneNumber === Zone) {
                // Update all switch
                for (let i = 0; i < ALM.length; i++) {
                    const service = this.Accessory.getServiceById(this.platform.Service.Switch, ALM[i].name);
                    if (service !== undefined) {
                        service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.Controller.GetZonePower(this.ZoneNumber) && ALM[i].mode === AudioMode);
                    }
                }
            }
        });
        // Handle ZonePowerChange event from controller
        this.Controller.on('ZonePowerChange', (Zone, Power) => {
            if (this.ZoneNumber === Zone) {
                for (let i = 0; i < ALM.length; i++) {
                    const service = this.Accessory.getServiceById(this.platform.Service.Switch, ALM[i].name);
                    if (service !== undefined) {
                        if (!Power) {
                            service.getCharacteristic(this.platform.Characteristic.On).updateValue((false));
                        }
                    }
                }
            }
        });
    }
}
exports.HKALMAccessoryNG = HKALMAccessoryNG;
//# sourceMappingURL=HKALMAccessoryNG.js.map