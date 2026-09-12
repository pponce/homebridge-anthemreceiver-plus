"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HKDolbyPostProcessingAccessory = void 0;
const HKAccessory_1 = require("./HKAccessory");
class HKDolbyPostProcessingAccessory extends HKAccessory_1.HKAccessory {
    constructor(platform, Controller, ZoneNumber) {
        super(platform, Controller, 'Zone' + ZoneNumber + ' Dolby Mode', Controller.SerialNumber + ZoneNumber + 'Dolby Post Processing');
        this.platform = platform;
        this.Controller = Controller;
        this.ZoneNumber = ZoneNumber;
        this.platform.log.info('Zone' + ZoneNumber + ': Audio Dolby Processing');
        // set accessory information
        this.Accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' Dolby Accessory')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' Dolby');
        // Create service list
        const DPP = [
            'Off',
            'Movie',
            'Music',
            'Night',
        ];
        for (let i = 0; i < DPP.length; i++) {
            const service = this.AddService(this.platform.Service.Switch, DPP[i], DPP[i]);
            service.getCharacteristic(this.platform.Characteristic.On).onSet((Value) => this.platform.HandleSet(() => {
                if (!this.Controller.GetZonePower(this.ZoneNumber)) {
                    setTimeout(() => {
                        service.getCharacteristic(this.platform.Characteristic.On).updateValue((false));
                    }, 100);
                    return;
                }
                if (Value) {
                    this.Controller.SetDolbyPostProcessing(this.ZoneNumber, i);
                }
                else {
                    setTimeout(() => {
                        service.getCharacteristic(this.platform.Characteristic.On).updateValue((true));
                    }, 100);
                }
            }));
        }
        Controller.on('ZoneDolbyPostProcessingChange', (Zone, DolbyAudioMode) => {
            if (this.ZoneNumber === Zone) {
                // Update all switch
                for (let i = 0; i < DPP.length; i++) {
                    const service = this.Accessory.getServiceById(this.platform.Service.Switch, DPP[i]);
                    if (service !== undefined) {
                        service.getCharacteristic(this.platform.Characteristic.On).updateValue(((i) === DolbyAudioMode));
                    }
                }
            }
        });
        // Handle ZonePowerChange event from controller
        this.Controller.on('ZonePowerChange', (Zone, Power) => {
            if (this.ZoneNumber === Zone) {
                for (let i = 0; i < DPP.length; i++) {
                    const service = this.Accessory.getServiceById(this.platform.Service.Switch, DPP[i]);
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
exports.HKDolbyPostProcessingAccessory = HKDolbyPostProcessingAccessory;
//# sourceMappingURL=HKDolbyPostProcessingAccessory.js.map