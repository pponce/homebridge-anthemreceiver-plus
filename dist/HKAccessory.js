"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HKAccessory = void 0;
const settings_1 = require("./settings");
class HKAccessory {
    constructor(platform, Controller, Name, UUID) {
        this.platform = platform;
        this.Controller = Controller;
        this.Name = Name;
        this.UUID = UUID;
        const uuid = this.platform.api.hap.uuid.generate(UUID);
        let accessory = this.platform.accessories.find(accessory => accessory.UUID === uuid);
        if (accessory) {
            this.platform.api.updatePlatformAccessories([accessory]);
        }
        else {
            accessory = new this.platform.api.platformAccessory(this.Name, uuid);
            this.platform.api.registerPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
        }
        platform.CreatedAccessories.push(accessory);
        this.Accessory = accessory;
        this.Accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Anthem')
            .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel)
            .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber)
            .setCharacteristic(this.platform.Characteristic.FirmwareRevision, Controller.SoftwareVersion);
    }
    AddService(Type, Name, Subtype) {
        let service;
        if (Subtype) {
            service = this.Accessory.getServiceById(Type, Subtype);
        }
        else {
            service = this.Accessory.getService(Type);
        }
        return service || this.Accessory.addService(Type, Name, Subtype);
    }
}
exports.HKAccessory = HKAccessory;
//# sourceMappingURL=HKAccessory.js.map