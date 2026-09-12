"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HKARCAccessory = void 0;
const HKAccessory_1 = require("./HKAccessory");
class HKARCAccessory extends HKAccessory_1.HKAccessory {
    constructor(platform, Controller, ZoneNumber) {
        super(platform, Controller, 'Zone' + ZoneNumber + ' ARC', Controller.SerialNumber + ZoneNumber + 'ARC');
        this.platform = platform;
        this.Controller = Controller;
        this.ZoneNumber = ZoneNumber;
        this.platform.log.info('Zone' + ZoneNumber + ': ARC');
        this.service = this.Accessory.getService(this.platform.Service.Switch)
            || this.Accessory.addService(this.platform.Service.Switch);
        // set accessory information
        this.Accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' ARC Accessory')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' ARC');
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onSet(value => this.platform.HandleSet(() => this.SwitchARC(value)));
        this.Controller.on('ZoneARCEnabledChange', (Zone, ARCEnabled) => {
            if (this.ZoneNumber === Zone) {
                this.HandleARCEvent(ARCEnabled);
            }
        });
        this.Controller.on('ZonePowerChange', (Zone, Power) => {
            if (this.ZoneNumber === Zone && !Power) {
                this.HandleARCEvent(false);
            }
        });
    }
    HandleARCEvent(ARCEnabled) {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(ARCEnabled);
    }
    SwitchARC(Value) {
        const Zone = this.Controller.GetZones()[this.ZoneNumber];
        if (!Zone.GetIsPowered()) {
            this.platform.log.error('Zone' + this.ZoneNumber + ': Cannot toggle ARC, zone is not powered on');
            setTimeout(() => {
                this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
            }, 100);
            return;
        }
        if (!Zone.GetIsMainZone()) {
            this.platform.log.error('Zone' + this.ZoneNumber + ': Cannot toggle ARC, not main zone');
            setTimeout(() => {
                this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
            }, 100);
            return;
        }
        if (!Zone.GetARCConfigured()) {
            this.platform.log.error('Zone' + this.ZoneNumber + ': Cannot toggle ARC, ARC is not configured');
            setTimeout(() => {
                this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
            }, 100);
            return;
        }
        this.Controller.SetZoneARCEnabled(this.ZoneNumber, Value);
    }
}
exports.HKARCAccessory = HKARCAccessory;
//# sourceMappingURL=HKARCAccessory.js.map