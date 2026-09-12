"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HKBrightnessAccessory = void 0;
const HKAccessory_1 = require("./HKAccessory");
class HKBrightnessAccessory extends HKAccessory_1.HKAccessory {
    constructor(platform, Controller) {
        super(platform, Controller, 'Front Panel', Controller.SerialNumber + 'Brightness Accessory');
        this.platform = platform;
        this.Controller = Controller;
        this.PanelBrightnessOn = true;
        this.platform.log.info('Front Panel Brightness');
        this.service = this.Accessory.getService(this.platform.Service.Lightbulb)
            || this.Accessory.addService(this.platform.Service.Lightbulb);
        // set accessory information
        this.Accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' Brightness Accessory')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' Brightness');
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onSet(value => this.platform.HandleSet(() => this.SetPanelOn(value)));
        this.service.getCharacteristic(this.platform.Characteristic.Brightness)
            .onSet(value => this.platform.HandleSet(() => this.SetPanelBrightness(value)));
        this.Controller.on('PanelBrightnessChange', (Brightness) => {
            this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(Brightness > 0);
            this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(Brightness);
        });
        this.Controller.on('ZonePowerChange', () => {
            // Power off panel accessory if all zones are off
            if (this.AllZonesOff()) {
                this.PanelBrightnessOn = false;
                this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
                this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(0);
            }
        });
    }
    SetPanelBrightness(value) {
        // If configured zones are powered off, cannot change brightness level
        if (this.AllZonesOff()) {
            this.platform.log.error('Brightness Accessory' + ': Cannot change brightness level, zones are not powered on');
            setTimeout(() => {
                this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
                this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(0);
            }, 100);
            return;
        }
        this.Controller.SetPanelBrightness(value);
    }
    AllZonesOff() {
        const isSLM = this.Controller.ReceiverModel === 'MRX SLM';
        return !isSLM ? !this.Controller.GetZonePower(1) && !this.Controller.GetZonePower(2) : !this.Controller.GetZonePower(1);
    }
    SetPanelOn(value) {
        this.PanelBrightnessOn = value;
        // If configured zones are powered off, cannot change accessory stage
        if (this.AllZonesOff()) {
            this.platform.log.error('Brightness Accessory' + ': Cannot change status, zones are not powered on');
            setTimeout(() => {
                this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
                this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(0);
            }, 100);
            return;
        }
        if (!this.PanelBrightnessOn) {
            this.SetPanelBrightness(0);
        }
        else {
            this.SetPanelBrightness(100);
        }
    }
}
exports.HKBrightnessAccessory = HKBrightnessAccessory;
//# sourceMappingURL=HKBrightnessAccessory.js.map