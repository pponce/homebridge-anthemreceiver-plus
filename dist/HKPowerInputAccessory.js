"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HKPowerInputAccessory = void 0;
const AnthemController_1 = require("./AnthemController");
const settings_1 = require("./settings");
class HKPowerInputAccessory {
    constructor(platform, Controller, ZoneNumber) {
        this.platform = platform;
        this.Controller = Controller;
        this.ZoneNumber = ZoneNumber;
        const Name = this.Controller.GetZoneName(this.ZoneNumber);
        this.HdmiInputService = [];
        this.platform.log.info('Zone' + ZoneNumber + ': Power/Input');
        const uuid = this.platform.api.hap.uuid.generate('Anthem_Receiver' + this.Controller.ReceiverModel +
            this.Controller.SerialNumber + ZoneNumber);
        this.ReceiverAccessory = new this.platform.api.platformAccessory(Name, uuid);
        this.ReceiverAccessory.category = 31 /* this.platform.api.hap.Categories.TELEVISION */;
        // set accessory information
        this.ReceiverAccessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Anthem')
            .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel)
            .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber)
            .setCharacteristic(this.platform.Characteristic.FirmwareRevision, Controller.SoftwareVersion);
        this.TVService = this.ConfigureTelevisionservice();
        this.SpeakerService = this.ConfigureTelevisionSpeakerService();
        this.TVService.addLinkedService(this.SpeakerService);
        this.Controller.on('ZonePowerChange', (Zone, Power) => {
            if (this.ZoneNumber === Zone) {
                this.TVService.updateCharacteristic(this.platform.Characteristic.Active, Power);
            }
        });
        this.Controller.on('ZoneInputChange', (Zone, Input) => {
            if (this.ZoneNumber === Zone) {
                this.TVService.updateCharacteristic(this.platform.Characteristic.ActiveIdentifier, Input);
            }
        });
        this.Controller.on('ZoneMutedChange', (Zone, Muted) => {
            if (this.ZoneNumber === Zone) {
                this.SpeakerService.updateCharacteristic(this.platform.Characteristic.Mute, Muted);
            }
        });
        this.Controller.on('ZoneVolumePercentageChange', (Zone, VolumePercentage) => {
            if (this.ZoneNumber === Zone) {
                this.SpeakerService.updateCharacteristic(this.platform.Characteristic.Volume, VolumePercentage);
            }
        });
        this.platform.ConfigureAvailability(this.ReceiverAccessory);
        this.platform.api.publishExternalAccessories(settings_1.PLUGIN_NAME, [this.ReceiverAccessory]);
    }
    SetInputs(InputArray) {
        const next = [];
        for (let i = 0; i < InputArray.length; i++) {
            const subtype = 'HDMI ' + (i + 1);
            const input = this.ReceiverAccessory.getServiceById(this.platform.Service.InputSource, subtype)
                || this.ReceiverAccessory.addService(this.platform.Service.InputSource, 'hdmi' + (i + 1), subtype);
            input.setCharacteristic(this.platform.Characteristic.Identifier, i + 1)
                .setCharacteristic(this.platform.Characteristic.ConfiguredName, InputArray[i] || 'Input ' + (i + 1))
                .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
                .setCharacteristic(this.platform.Characteristic.InputSourceType, (this.Controller.IsSTR() ? this.platform.Characteristic.InputSourceType.OTHER : this.platform.Characteristic.InputSourceType.HDMI));
            this.TVService.addLinkedService(input);
            next.push(input);
        }
        for (const input of this.HdmiInputService) {
            if (!next.includes(input)) {
                this.TVService.removeLinkedService(input);
                this.ReceiverAccessory.removeService(input);
            }
        }
        this.HdmiInputService = next;
        this.platform.ConfigureAvailability(this.ReceiverAccessory);
    }
    ConfigureTelevisionservice() {
        const Name = this.Controller.GetZoneName(this.ZoneNumber);
        const TVService = this.ReceiverAccessory.addService(this.platform.Service.Television);
        TVService.setCharacteristic(this.platform.Characteristic.ConfiguredName, Name);
        TVService.setCharacteristic(this.platform.Characteristic.SleepDiscoveryMode, this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);
        // Send change from homekit to Anthem Receiver - Power
        TVService.getCharacteristic(this.platform.Characteristic.Active)
            .onSet((newValue) => this.platform.HandleSet(() => {
            this.Controller.PowerZone(this.ZoneNumber, newValue === 1);
        }));
        // Send change from homekit to Anthem Receiver - Active input
        TVService.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
            .onSet((newValue) => this.platform.HandleSet(() => {
            this.Controller.SetZoneInput(this.ZoneNumber, Number(newValue));
        }));
        TVService
            .getCharacteristic(this.platform.Characteristic.RemoteKey)
            .onSet((newValue) => this.platform.HandleSet(() => {
            if (!this.Controller.GetZones()[this.ZoneNumber].GetIsPowered()) {
                this.Controller.PowerZone(this.ZoneNumber, true);
                return;
            }
            switch (newValue) {
                case this.platform.Characteristic.RemoteKey.ARROW_UP: {
                    if (this.Controller.GetIsMenuDisplayVisible()) {
                        this.Controller.SendKey(this.ZoneNumber, AnthemController_1.AnthemKeyCode.UP);
                    }
                    else {
                        this.Controller.VolumeUp(this.ZoneNumber);
                    }
                    break;
                }
                case this.platform.Characteristic.RemoteKey.ARROW_DOWN: {
                    if (this.Controller.GetIsMenuDisplayVisible()) {
                        this.Controller.SendKey(this.ZoneNumber, AnthemController_1.AnthemKeyCode.DOWN);
                    }
                    else {
                        this.Controller.VolumeDown(this.ZoneNumber);
                    }
                    break;
                }
                case this.platform.Characteristic.RemoteKey.ARROW_LEFT: {
                    if (this.Controller.GetZones()[this.ZoneNumber].GetIsMainZone()) {
                        this.Controller.SendKey(this.ZoneNumber, AnthemController_1.AnthemKeyCode.LEFT);
                    }
                    break;
                }
                case this.platform.Characteristic.RemoteKey.ARROW_RIGHT: {
                    if (this.Controller.GetZones()[this.ZoneNumber].GetIsMainZone()) {
                        this.Controller.SendKey(this.ZoneNumber, AnthemController_1.AnthemKeyCode.RIGHT);
                    }
                    break;
                }
                case this.platform.Characteristic.RemoteKey.SELECT: {
                    if (this.Controller.GetZones()[this.ZoneNumber].GetIsMainZone()) {
                        this.Controller.SendKey(this.ZoneNumber, AnthemController_1.AnthemKeyCode.SELECT);
                    }
                    break;
                }
                case this.platform.Characteristic.RemoteKey.BACK: {
                    if (this.Controller.GetZones()[this.ZoneNumber].GetIsMainZone()) {
                        this.Controller.ToggleAudioListeningMode(this.ZoneNumber, true);
                    }
                    break;
                }
                case this.platform.Characteristic.RemoteKey.EXIT: {
                    break;
                }
                case this.platform.Characteristic.RemoteKey.PLAY_PAUSE: {
                    this.Controller.ToggleMute(this.ZoneNumber);
                    break;
                }
                case this.platform.Characteristic.RemoteKey.INFORMATION: {
                    if (this.Controller.GetZones()[this.ZoneNumber].GetIsMainZone()) {
                        this.Controller.ToggleConfigMenu();
                    }
                    break;
                }
            }
        }));
        // Set initial power status
        TVService.getCharacteristic(this.platform.Characteristic.Active).updateValue(this.Controller.GetZonePower(this.ZoneNumber));
        return TVService;
    }
    ConfigureTelevisionSpeakerService() {
        const Name = this.Controller.GetZoneName(this.ZoneNumber);
        const SpeakerService = this.ReceiverAccessory.addService(this.platform.Service.TelevisionSpeaker);
        SpeakerService.setCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.ACTIVE);
        SpeakerService.setCharacteristic(this.platform.Characteristic.Name, Name);
        SpeakerService.setCharacteristic(this.platform.Characteristic.VolumeControlType, this.platform.Characteristic.VolumeControlType.ABSOLUTE);
        SpeakerService.getCharacteristic(this.platform.Characteristic.Mute)
            .onSet(value => this.platform.HandleSet(() => this.HandleMuteSet(value)));
        SpeakerService.getCharacteristic(this.platform.Characteristic.Volume)
            .onSet(value => this.platform.HandleSet(() => this.HandleVolumeSet(value)));
        SpeakerService.getCharacteristic(this.platform.Characteristic.VolumeSelector)
            .onSet(value => this.platform.HandleSet(() => this.HandleVolumeSelector(value)));
        return SpeakerService;
    }
    HandleMuteSet(newValue) {
        if (this.Controller.GetZone(this.ZoneNumber).GetIsPowered()) {
            this.Controller.SetMute(this.ZoneNumber, Boolean(newValue));
        }
    }
    HandleVolumeSelector(Value) {
        if (!this.Controller.GetZone(this.ZoneNumber).GetIsPowered()) {
            this.Controller.PowerZone(this.ZoneNumber, true);
            return;
        }
        switch (Value) {
            case this.platform.Characteristic.VolumeSelector.INCREMENT: // Volume up
                this.Controller.VolumeUp(this.ZoneNumber);
                break;
            case this.platform.Characteristic.VolumeSelector.DECREMENT: // Volume down
                this.Controller.VolumeDown(this.ZoneNumber);
                break;
        }
    }
    HandleVolumeSet(newValue) {
        this.Controller.SetZoneVolumePercentage(this.ZoneNumber, newValue);
    }
}
exports.HKPowerInputAccessory = HKPowerInputAccessory;
//# sourceMappingURL=HKPowerInputAccessory.js.map