"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HKInputAccessoryNG = void 0;
const HKAccessory_1 = require("./HKAccessory");
class HKInputAccessoryNG extends HKAccessory_1.HKAccessory {
    constructor(platform, Controller, ZoneNumber) {
        super(platform, Controller, 'Zone' + ZoneNumber + ' Inputs', Controller.SerialNumber + ZoneNumber + 'Input Selector NG');
        this.platform = platform;
        this.Controller = Controller;
        this.ZoneNumber = ZoneNumber;
        this.Inputs = [];
        this.SetInputs(Controller.GetInputs());
        Controller.on('InputChange', inputs => this.SetInputs(inputs));
        Controller.on('ZoneInputChange', (zone, input) => { if (zone === this.ZoneNumber)
            this.Update(input); });
        Controller.on('ZonePowerChange', (zone, powered) => {
            if (zone === this.ZoneNumber)
                this.Update(powered ? Controller.GetZone(zone).GetActiveInput() : 0);
        });
    }
    Update(active) {
        for (let i = 0; i < this.Inputs.length; i++) {
            this.Accessory.getServiceById(this.platform.Service.Switch, 'Input' + i)
                ?.updateCharacteristic(this.platform.Characteristic.On, this.Controller.GetZonePower(this.ZoneNumber) && i + 1 === active);
        }
    }
    SetInputs(inputs) {
        const services = new Set();
        for (let i = 0; i < inputs.length; i++) {
            const name = 'Input' + (i + 1) + ' ' + inputs[i];
            const service = this.AddService(this.platform.Service.Switch, name, 'Input' + i);
            services.add(service);
            service.setCharacteristic(this.platform.Characteristic.Name, name);
            service.getCharacteristic(this.platform.Characteristic.On).onSet(value => this.platform.HandleSet(() => {
                if (!this.Controller.GetZonePower(this.ZoneNumber))
                    throw new Error('Zone is powered off');
                if (!value)
                    throw new Error('Choose another input to change the active input');
                this.Controller.SetZoneInput(this.ZoneNumber, i + 1);
            }));
        }
        for (const service of [...this.Accessory.services]) {
            if (service.UUID === this.platform.Service.Switch.UUID && /^Input[0-9]+$/.test(service.subtype || '') && !services.has(service)) {
                this.Accessory.removeService(service);
            }
        }
        this.Inputs = [...inputs];
        this.Update(this.Controller.GetZone(this.ZoneNumber).GetActiveInput());
        this.platform.ConfigureAvailability(this.Accessory);
    }
}
exports.HKInputAccessoryNG = HKInputAccessoryNG;
//# sourceMappingURL=HKInputAccessoryNG.js.map