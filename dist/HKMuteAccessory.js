"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HKMuteAccessory = void 0;
const HKAccessory_1 = require("./HKAccessory");
class HKMuteAccessory extends HKAccessory_1.HKAccessory {
    constructor(platform, Controller, ZoneNumber) {
        super(platform, Controller, 'Zone' + ZoneNumber + ' Mute', Controller.SerialNumber + ZoneNumber + 'Mute Accessory');
        this.platform = platform;
        this.Controller = Controller;
        this.ZoneNumber = ZoneNumber;
        this.platform.log.info('Zone' + ZoneNumber + ': Mute');
        this.service = this.Accessory.getService(this.platform.Service.Switch)
            || this.Accessory.addService(this.platform.Service.Switch);
        this.Accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' Mute Accessory')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' Mute');
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onSet(value => this.platform.HandleSet(() => this.SetMute(value)));
        // Handle ZoneMutedChange event from controller
        this.Controller.on('ZoneMutedChange', (Zone, Muted) => {
            if (this.ZoneNumber === Zone) {
                this.HandleMuteEvent(Muted);
            }
        });
        // Handle ZonePowerChange event from controller
        // Disable mute accessory when zone is powered off
        this.Controller.on('ZonePowerChange', (Zone, Power) => {
            if (this.ZoneNumber === Zone && !Power) {
                this.HandleMuteEvent(false);
                // insert timer ....
            }
        });
    }
    HandleMuteEvent(Mute) {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(Mute);
    }
    SetMute(value) {
        // Mute can only be set on a powered zone
        if (this.Controller.GetZonePower(this.ZoneNumber)) {
            this.Controller.SetMute(this.ZoneNumber, value);
        }
        else {
            this.platform.log.error('Zone' + this.ZoneNumber + ': Cannot set mute, zone is not powered on');
            setTimeout(() => {
                this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
            }, 100);
        }
    }
}
exports.HKMuteAccessory = HKMuteAccessory;
//# sourceMappingURL=HKMuteAccessory.js.map