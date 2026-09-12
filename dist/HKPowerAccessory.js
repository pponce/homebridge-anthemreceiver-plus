"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HKPowerAccessory = void 0;
const HKAccessory_1 = require("./HKAccessory");
class HKPowerAccessory extends HKAccessory_1.HKAccessory {
    constructor(platform, Controller, ZoneNumber) {
        super(platform, Controller, 'Zone' + ZoneNumber + ' Power', Controller.SerialNumber + ZoneNumber + 'Power Accessory');
        this.platform = platform;
        this.Controller = Controller;
        this.ZoneNumber = ZoneNumber;
        this.platform.log.info('Zone' + ZoneNumber + ': Power');
        this.service = this.Accessory.getService(this.platform.Service.Switch) || this.Accessory.addService(this.platform.Service.Switch);
        this.Accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' Power Accessory')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' Power');
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onSet(value => this.platform.HandleSet(() => this.SetPower(value)));
        // Handle ZonePowerChange event from controller
        this.Controller.on('ZonePowerChange', (Zone, Power) => {
            if (this.ZoneNumber === Zone) {
                this.HandlePowerEvent(Power);
            }
        });
        // Set initial State
        this.HandlePowerEvent(this.Controller.GetZonePower(ZoneNumber));
    }
    HandlePowerEvent(Power) {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(Power);
    }
    SetPower(value) {
        this.Controller.PowerZone(this.ZoneNumber, value);
    }
}
exports.HKPowerAccessory = HKPowerAccessory;
//# sourceMappingURL=HKPowerAccessory.js.map