"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthemReceiverHomebridgePlatform = void 0;
const HKPowerInputAccessory_1 = require("./HKPowerInputAccessory");
const HKMuteAccessory_1 = require("./HKMuteAccessory");
const HKPowerAccessory_1 = require("./HKPowerAccessory");
const HKInputAccessoryNG_1 = require("./HKInputAccessoryNG");
const HKALMAccessoryNG_1 = require("./HKALMAccessoryNG");
const HKARCAccessory_1 = require("./HKARCAccessory");
const HKVolumeAccessory_1 = require("./HKVolumeAccessory");
const HKDolbyPostProcessingAccessory_1 = require("./HKDolbyPostProcessingAccessory");
const HKBrightnessAccessory_1 = require("./HKBrightnessAccessory");
const AnthemController_1 = require("./AnthemController");
const settings_1 = require("./settings");
const config_1 = require("./config");
const capabilities_1 = require("./capabilities");
class AnthemReceiverHomebridgePlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.accessories = [];
        this.CreatedAccessories = [];
        this.Zone1Active = false;
        this.Zone2Active = false;
        this.Zone1Name = 'Zone 1';
        this.Zone2Name = 'Zone 2';
        this.Zone1Mute = false;
        this.Zone2Mute = false;
        this.Zone1Power = false;
        this.Zone2Power = false;
        this.Zone1ALM = false;
        this.Zone1MultipleInputs = false;
        this.Zone2MultipleInputs = false;
        this.Zone1ARC = false;
        this.Zone1Volume = false;
        this.Zone2Volume = false;
        this.Zone1DolbyPostProcessing = false;
        this.Zone2DolbyPostProcessing = false;
        this.PanelBrightness = false;
        this.LastConnectionError = '';
        this.MaxVolumeDB = undefined;
        this.InitialRun = true;
        this.IsRunning = false;
        this.Service = api.hap.Service;
        this.Characteristic = api.hap.Characteristic;
        this.Controller = new AnthemController_1.AnthemController();
        this.api.on('shutdown', () => this.Controller.Stop());
        this.AnthemReceiverPowerInputArray = [];
        this.api.on('didFinishLaunching', () => {
            log.debug('Finished initializing platform');
            // Do not start plugin if errors have been found in config file
            if (this.CheckConfigFile()) {
                if (!this.Controller.AddControllingZone(1, this.Zone1Name, true)) {
                    this.log.error('Error adding zone 1 to controller');
                }
                this.Controller.on('ModelDetected', model => {
                    const supported = (0, capabilities_1.capabilities)(model);
                    if (supported.experimental)
                        this.log.warn('Experimental STR support: hardware validation is pending. See STR_TESTING.md for diagnostic and control checks.');
                    if (supported.zones === 1) {
                        this.Controller.RemoveControllingZone(2);
                        if (this.Normalized && (0, config_1.zoneEnabled)(this.Normalized.Zone2))
                            this.log.warn('This receiver has one zone; Zone 2 controls will not be created. Saved settings are preserved.');
                    }
                    else if (this.Normalized && (0, config_1.zoneEnabled)(this.Normalized.Zone2) && !this.Controller.GetZone(2)) {
                        this.Controller.AddControllingZone(2, this.Zone2Name, false);
                    }
                });
                // Start operation when controller is ready
                this.Controller.on('ControllerReadyForOperation', () => {
                    this.DumpControllerInfo();
                    if (this.InitialRun) {
                        this.discoverDevices();
                        this.InitialRun = false;
                    }
                    this.log.info('-----------------------------------------');
                    this.log.info('Starting Controller Operation');
                    this.log.info('-----------------------------------------');
                    this.IsRunning = true;
                    this.LastConnectionError = '';
                });
                this.Controller.on('ShowDebugInfo', (DebugString) => {
                    this.log.debug(DebugString);
                });
                this.Controller.on('InputChange', (InputArray) => {
                    this.log.info('Discovered new inputs');
                    for (let i = 1; i <= InputArray.length; i++) {
                        this.log.info('Input' + i + ': ' + InputArray[i - 1]);
                    }
                    for (let i = 0; i < this.AnthemReceiverPowerInputArray.length; i++) {
                        this.AnthemReceiverPowerInputArray[i].SetInputs(InputArray);
                    }
                });
                // Configure Controller Error Event
                this.ConfigureControllerError();
                this.Controller.SetMaxVolumeDB(this.MaxVolumeDB);
                this.Controller.Connect(this.Normalized.Host, this.Normalized.Port);
            }
        });
    }
    configureAccessory(accessory) {
        this.log.info('Loading accessory from cache:', accessory.displayName);
        this.accessories.push(accessory);
    }
    DeviceCacheCleanUp() {
        // Do some cleanup of accessories that have been restored and are not in config file anymore
        for (let i = 0; i < this.accessories.length; i++) {
            if (this.CreatedAccessories.indexOf(this.accessories[i]) === -1) {
                this.api.unregisterPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [this.accessories[i]]);
            }
        }
    }
    discoverDevices() {
        this.log.info('-----------------------------------------');
        this.log.info('Configuring Homebridge Accessories');
        this.log.info('-----------------------------------------');
        const Inputs = this.Controller.GetInputs();
        if (this.PanelBrightness) {
            this.AddBrightnessAccessory();
        }
        if (this.Zone1Active) {
            const AnthemReceiver = new HKPowerInputAccessory_1.HKPowerInputAccessory(this, this.Controller, 1);
            this.AnthemReceiverPowerInputArray.push(AnthemReceiver);
            AnthemReceiver.SetInputs(Inputs);
        }
        if (this.Zone1Mute) {
            new HKMuteAccessory_1.HKMuteAccessory(this, this.Controller, 1);
        }
        if (this.Zone1Power) {
            new HKPowerAccessory_1.HKPowerAccessory(this, this.Controller, 1);
        }
        if (this.Zone1Volume) {
            this.ADDVolumeAccessory(1);
        }
        if (this.Zone1MultipleInputs) {
            new HKInputAccessoryNG_1.HKInputAccessoryNG(this, this.Controller, 1);
        }
        if (this.Zone1ARC && this.Controller.GetCapabilities().arc) {
            new HKARCAccessory_1.HKARCAccessory(this, this.Controller, 1);
        }
        if (this.Zone1ALM && this.Controller.GetCapabilities().directListeningMode) {
            new HKALMAccessoryNG_1.HKALMAccessoryNG(this, this.Controller, 1);
        }
        if (this.Zone1DolbyPostProcessing) {
            this.AddDolbyPostProcessingAccessory(1);
        }
        if (this.Controller.GetZone(2)) {
            if (this.Zone2Active) {
                const AnthemReceiver2 = new HKPowerInputAccessory_1.HKPowerInputAccessory(this, this.Controller, 2);
                this.AnthemReceiverPowerInputArray.push(AnthemReceiver2);
                AnthemReceiver2.SetInputs(Inputs);
            }
            if (this.Zone2Mute) {
                new HKMuteAccessory_1.HKMuteAccessory(this, this.Controller, 2);
            }
            if (this.Zone2Power) {
                new HKPowerAccessory_1.HKPowerAccessory(this, this.Controller, 2);
            }
            if (this.Zone2MultipleInputs) {
                new HKInputAccessoryNG_1.HKInputAccessoryNG(this, this.Controller, 2);
            }
            if (this.Zone2Volume) {
                this.ADDVolumeAccessory(2);
            }
            if (this.Zone2DolbyPostProcessing) {
                this.AddDolbyPostProcessingAccessory(2);
            }
        }
        for (const accessory of this.CreatedAccessories)
            this.ConfigureAvailability(accessory);
        this.DeviceCacheCleanUp();
    }
    ADDVolumeAccessory(ZoneNumber) {
        if (!this.Controller.GetCapabilities().volume) {
            this.log.error('Volume Accessory: Zone' + ZoneNumber + ' Not adding accessory (only supported on X40 Serie)');
            return;
        }
        new HKVolumeAccessory_1.HKVolumeAccessory(this, this.Controller, ZoneNumber);
    }
    AddBrightnessAccessory() {
        if (!this.Controller.IsProtocolV02()) {
            this.log.error('Panel Brightness Accessory: Not adding accessory (only supported on X40 Serie)');
            return;
        }
        new HKBrightnessAccessory_1.HKBrightnessAccessory(this, this.Controller);
    }
    AddDolbyPostProcessingAccessory(Zone) {
        if (!this.Controller.IsProtocolV02()) {
            this.log.error('Dolbpy Post-Processing Accessory: Not adding accessory (only supported on X40 Serie)');
            return;
        }
        new HKDolbyPostProcessingAccessory_1.HKDolbyPostProcessingAccessory(this, this.Controller, Zone);
    }
    CheckConfigFile() {
        try {
            this.Normalized = (0, config_1.normalizeConfig)(this.config, false);
            if (!this.Normalized.Host) {
                this.log.info('Anthem Receiver is not configured. Enter its address in plugin settings.');
                return false;
            }
            const config = this.Normalized;
            this.PanelBrightness = config.PanelBrightness;
            this.MaxVolumeDB = config.MaxVolumeDB;
            for (const number of [1, 2]) {
                const zone = config[number === 1 ? 'Zone1' : 'Zone2'];
                for (const key of ['Active', 'Name', 'Mute', 'Power', 'MultipleInputs', 'Volume', 'DolbyPostProcessing']) {
                    this[`Zone${number}${key}`] = zone[key];
                }
            }
            this.Zone1ALM = config.Zone1.ALM;
            this.Zone1ARC = config.Zone1.ARC;
            return true;
        }
        catch (error) {
            this.log.error('Invalid Anthem settings: ' + (error instanceof Error ? error.message : 'Unknown configuration error'));
            return false;
        }
    }
    HandleSet(action) {
        return this.Controller.RunCommand(action).catch(error => {
            this.log.warn('Receiver action failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
            this.Controller.PublishSnapshot();
            throw new this.api.hap.HapStatusError(-70402 /* this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        });
    }
    ConfigureAvailability(accessory) {
        const information = accessory.getService(this.Service.AccessoryInformation);
        for (const service of accessory.services) {
            if (service === information)
                continue;
            for (const characteristic of service.characteristics) {
                if (!characteristic.props.perms.includes("pr" /* this.api.hap.Perms.PAIRED_READ */))
                    continue;
                characteristic.onGet(() => {
                    if (!this.Controller.IsReady())
                        throw new this.api.hap.HapStatusError(-70402 /* this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
                    return characteristic.value;
                });
            }
        }
    }
    DumpControllerInfo() {
        this.log.info('-----------------------------------------');
        this.log.info('Anthem Receiver Controller Information');
        this.log.info('-----------------------------------------');
        this.log.info('Model: ' + this.Controller.ReceiverModel);
        this.log.info('Serial Number: ' + this.Controller.SerialNumber);
        this.log.info('Software Version: ' + this.Controller.SoftwareVersion);
        this.log.info('Zones: ' + this.Controller.GetConfiguredZoneNumber());
        for (const ZoneNumber in this.Controller.GetZones()) {
            const Zone = this.Controller.GetZones()[ZoneNumber];
            this.log.info(' Zone' + ZoneNumber + ': ' + Zone.ZoneName);
        }
        const Inputs = this.Controller.GetInputs();
        this.log.info('Inputs: ' + Inputs.length);
        for (let i = 0; i < Inputs.length; i++) {
            this.log.info(' Input' + (i + 1) + ': ' + Inputs[i]);
        }
    }
    ConfigureControllerError() {
        this.Controller.on('ControllerError', (error, message) => {
            if (error === AnthemController_1.AnthemControllerError.CONNECTION_ERROR) {
                if (!this.LastConnectionError)
                    this.log.warn('Receiver disconnected: ' + message + '. Reconnecting automatically.');
                else
                    this.log.debug('Receiver reconnect attempt: ' + message);
                this.LastConnectionError = message;
                this.IsRunning = false;
            }
            else
                this.log.warn(error + ': ' + message);
        });
    }
}
exports.AnthemReceiverHomebridgePlatform = AnthemReceiverHomebridgePlatform;
//# sourceMappingURL=platform.js.map