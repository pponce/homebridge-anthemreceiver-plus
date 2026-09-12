"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HKVolumeAccessory = void 0;
const HKAccessory_1 = require("./HKAccessory");
class HKVolumeAccessory extends HKAccessory_1.HKAccessory {
    constructor(platform, Controller, ZoneNumber) {
        super(platform, Controller, 'Zone' + ZoneNumber + ' Volume', Controller.SerialNumber + ZoneNumber + 'Volume');
        this.platform = platform;
        this.Controller = Controller;
        this.ZoneNumber = ZoneNumber;
        this.platform.log.info('Zone' + ZoneNumber + ': Volume');
        this.service = this.Accessory.getService(this.platform.Service.Lightbulb)
            || this.Accessory.addService(this.platform.Service.Lightbulb);
        // set accessory information
        this.Accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' Volume Accessory')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' Volume');
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onSet(value => this.platform.HandleSet(() => this.SetMute(value)));
        this.service.getCharacteristic(this.platform.Characteristic.Brightness)
            .onSet(value => this.platform.HandleSet(() => this.SetBrightness(value)));
        // Hande ZoneVolumePercentageChange event from controller
        this.Controller.on('ZoneVolumePercentageChange', (Zone, VolumePercentage) => {
            if (this.ZoneNumber === Zone) {
                this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(VolumePercentage);
            }
        });
        // Handle ZoneMutedChange event from controller
        this.Controller.on('ZoneMutedChange', (Zone, Muted) => {
            if (this.ZoneNumber === Zone) {
                this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.Controller.GetZonePower(this.ZoneNumber) && !Muted);
            }
        });
        // Handle ZonePowerChange event from controller
        // Only force Off when zone powers down; when powering up, wait for muted state.
        this.Controller.on('ZonePowerChange', (Zone, Power) => {
            if (this.ZoneNumber === Zone && !Power) {
                this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
            }
        });
    }
    SetBrightness(value) {
        const CurrentVolumePercentage = this.Controller.GetZone(this.ZoneNumber).GetVolumePercentage();
        // Brightness can only be set on a powered zone
        if (this.Controller.GetZonePower(this.ZoneNumber)) {
            this.Controller.SetZoneVolumePercentage(this.ZoneNumber, value);
        }
        else {
            this.platform.log.error('Zone' + this.ZoneNumber + ': Cannot set volume percentage, zone is not powered on');
            setTimeout(() => {
                this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(CurrentVolumePercentage);
            }, 100);
        }
    }
    SetMute(value) {
        // Mute can only be set on a powered zone
        if (this.Controller.GetZonePower(this.ZoneNumber)) {
            this.Controller.SetMute(this.ZoneNumber, !value);
        }
        else {
            this.platform.log.error('Zone' + this.ZoneNumber + ': Cannot set mute, zone is not powered on');
            setTimeout(() => {
                this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
            }, 100);
        }
    }
}
exports.HKVolumeAccessory = HKVolumeAccessory;
//# sourceMappingURL=HKVolumeAccessory.js.map