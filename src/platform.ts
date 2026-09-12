import type { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { HKPowerInputAccessory } from './HKPowerInputAccessory';
import { HKMuteAccessory } from './HKMuteAccessory';
import { HKPowerAccessory } from './HKPowerAccessory';
import { HKInputAccessoryNG } from './HKInputAccessoryNG';
import { HKALMAccessoryNG } from './HKALMAccessoryNG';
import { HKARCAccessory } from './HKARCAccessory';
import { HKVolumeAccessory } from './HKVolumeAccessory';
import { HKDolbyPostProcessingAccessory } from './HKDolbyPostProcessingAccessory';
import { HKBrightnessAccessory } from './HKBrightnessAccessory';
import { AnthemController, AnthemControllerError } from './AnthemController';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { normalizeConfig, zoneEnabled, ReceiverConfig } from './config';
import { capabilities } from './capabilities';

export class AnthemReceiverHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: PlatformAccessory[] = [];
  public CreatedAccessories: PlatformAccessory[] = [];

  private Controller:AnthemController;

  private Zone1Active = false;
  private Zone2Active = false;
  private Zone1Name = 'Zone 1';
  private Zone2Name = 'Zone 2';
  private Zone1Mute = false;
  private Zone2Mute = false;
  private Zone1Power = false;
  private Zone2Power = false;
  private Zone1ALM = false;
  private Zone1MultipleInputs = false;
  private Zone2MultipleInputs =false;
  private Zone1ARC = false;
  private Zone1Volume = false;
  private Zone2Volume = false;
  private Zone1DolbyPostProcessing = false;
  private Zone2DolbyPostProcessing = false;
  private PanelBrightness = false;

  private Normalized?: ReceiverConfig;
  private LastConnectionError = '';
  private MaxVolumeDB:number|undefined = undefined;
  private InitialRun = true;
  private IsRunning = false;

  private AnthemReceiverPowerInputArray: HKPowerInputAccessory[];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.Controller = new AnthemController();
    this.api.on('shutdown', () => this.Controller.Stop());
    this.AnthemReceiverPowerInputArray = [];

    this.api.on('didFinishLaunching', () => {
      log.debug('Finished initializing platform');

      // Do not start plugin if errors have been found in config file
      if(this.CheckConfigFile()){

        if(!this.Controller.AddControllingZone(1, this.Zone1Name, true)){
          this.log.error('Error adding zone 1 to controller');
        }

        this.Controller.on('ModelDetected', model => {
          const supported = capabilities(model);
          if(supported.experimental) this.log.warn('Experimental STR support: hardware validation is pending. See STR_TESTING.md for diagnostic and control checks.');
          if(supported.zones === 1) {
            this.Controller.RemoveControllingZone(2);
            if(this.Normalized && zoneEnabled(this.Normalized.Zone2)) this.log.warn('This receiver has one zone; Zone 2 controls will not be created. Saved settings are preserved.');
          } else if(this.Normalized && zoneEnabled(this.Normalized.Zone2) && !this.Controller.GetZone(2)) {
            this.Controller.AddControllingZone(2, this.Zone2Name, false);
          }
        });
        // Start operation when controller is ready
        this.Controller.on('ControllerReadyForOperation', () => {
          this.DumpControllerInfo();

          if(this.InitialRun){
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

        this.Controller.on('InputChange', (InputArray)=>{
          this.log.info('Discovered new inputs');
          for(let i = 1 ; i <= InputArray.length; i++){
            this.log.info('Input' + i + ': ' + InputArray[i-1]);
          }

          for(let i = 0 ; i < this.AnthemReceiverPowerInputArray.length ; i++){
            this.AnthemReceiverPowerInputArray[i].SetInputs(InputArray);
          }
        });

        // Configure Controller Error Event
        this.ConfigureControllerError();

        this.Controller.SetMaxVolumeDB(this.MaxVolumeDB);
        this.Controller.Connect(this.Normalized!.Host, this.Normalized!.Port);
      }
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  private DeviceCacheCleanUp(){
    // Do some cleanup of accessories that have been restored and are not in config file anymore
    for(let i = 0; i< this.accessories.length;i++){
      if(this.CreatedAccessories.indexOf(this.accessories[i]) === -1){
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.accessories[i]]);
      }
    }
  }

  discoverDevices() {

    this.log.info('-----------------------------------------');
    this.log.info('Configuring Homebridge Accessories');
    this.log.info('-----------------------------------------');

    const Inputs = this.Controller.GetInputs();

    if(this.PanelBrightness){
      this.AddBrightnessAccessory();
    }
    if(this.Zone1Active){
      const AnthemReceiver = new HKPowerInputAccessory(this, this.Controller, 1);
      this.AnthemReceiverPowerInputArray.push(AnthemReceiver);
      AnthemReceiver.SetInputs(Inputs);
    }

    if(this.Zone1Mute){
      new HKMuteAccessory(this, this.Controller, 1);
    }

    if(this.Zone1Power){
      new HKPowerAccessory(this, this.Controller, 1);
    }

    if(this.Zone1Volume){
      this.ADDVolumeAccessory(1);
    }

    if(this.Zone1MultipleInputs){
      new HKInputAccessoryNG(this, this.Controller, 1);
    }

    if(this.Zone1ARC && this.Controller.GetCapabilities().arc){
      new HKARCAccessory(this, this.Controller, 1);
    }

    if(this.Zone1ALM && this.Controller.GetCapabilities().directListeningMode){
      new HKALMAccessoryNG(this, this.Controller, 1);
    }

    if(this.Zone1DolbyPostProcessing){
      this.AddDolbyPostProcessingAccessory(1);
    }

    if(this.Controller.GetZone(2)) {
    if(this.Zone2Active){
      const AnthemReceiver2 = new HKPowerInputAccessory(this, this.Controller, 2);
      this.AnthemReceiverPowerInputArray.push(AnthemReceiver2);
      AnthemReceiver2.SetInputs(Inputs);
    }

    if(this.Zone2Mute){
      new HKMuteAccessory(this, this.Controller, 2);
    }

    if(this.Zone2Power){
      new HKPowerAccessory(this, this.Controller, 2);
    }

    if(this.Zone2MultipleInputs){
      new HKInputAccessoryNG(this, this.Controller, 2);
    }

    if(this.Zone2Volume){
      this.ADDVolumeAccessory(2);
    }

    if(this.Zone2DolbyPostProcessing){
      this.AddDolbyPostProcessingAccessory(2);

    }

    }

    for(const accessory of this.CreatedAccessories) this.ConfigureAvailability(accessory);
    this.DeviceCacheCleanUp();
  }

  private ADDVolumeAccessory(ZoneNumber: number){

    if(!this.Controller.GetCapabilities().volume){
      this.log.error('Volume Accessory: Zone' + ZoneNumber + ' Not adding accessory (only supported on X40 Serie)');
      return;
    }

    new HKVolumeAccessory(this, this.Controller, ZoneNumber);
  }

  AddBrightnessAccessory(){

    if(!this.Controller.IsProtocolV02()){
      this.log.error('Panel Brightness Accessory: Not adding accessory (only supported on X40 Serie)');
      return;
    }

    new HKBrightnessAccessory(this, this.Controller);
  }

  AddDolbyPostProcessingAccessory(Zone:number){
    if(!this.Controller.IsProtocolV02()){
      this.log.error('Dolbpy Post-Processing Accessory: Not adding accessory (only supported on X40 Serie)');
      return;
    }

    new HKDolbyPostProcessingAccessory(this, this.Controller, Zone);
  }

  private CheckConfigFile():boolean{
    try {
      this.Normalized = normalizeConfig(this.config, false);
      if(!this.Normalized.Host) {
        this.log.info('Anthem Receiver is not configured. Enter its address in plugin settings.');
        return false;
      }
      const config = this.Normalized;
      this.PanelBrightness = config.PanelBrightness;
      this.MaxVolumeDB = config.MaxVolumeDB;
      for(const number of [1, 2] as const) {
        const zone = config[number === 1 ? 'Zone1' : 'Zone2'];
        for(const key of ['Active', 'Name', 'Mute', 'Power', 'MultipleInputs', 'Volume', 'DolbyPostProcessing'] as const) {
          (this as unknown as Record<string, unknown>)[`Zone${number}${key}`] = zone[key];
        }
      }
      this.Zone1ALM = config.Zone1.ALM;
      this.Zone1ARC = config.Zone1.ARC;
      return true;
    } catch(error) {
      this.log.error('Invalid Anthem settings: ' + (error instanceof Error ? error.message : 'Unknown configuration error'));
      return false;
    }
  }

  HandleSet(action: () => void): Promise<void> {
    return this.Controller.RunCommand(action).catch(error => {
      this.log.warn('Receiver action failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      this.Controller.PublishSnapshot();
      throw new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    });
  }

  ConfigureAvailability(accessory: PlatformAccessory){
    const information = accessory.getService(this.Service.AccessoryInformation);
    for(const service of accessory.services) {
      if(service === information) continue;
      for(const characteristic of service.characteristics) {
        if(!characteristic.props.perms.includes(this.api.hap.Perms.PAIRED_READ)) continue;
        characteristic.onGet(() => {
          if(!this.Controller.IsReady()) throw new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
          return characteristic.value!;
        });
      }
    }
  }

  private DumpControllerInfo(){
    this.log.info('-----------------------------------------');
    this.log.info('Anthem Receiver Controller Information');
    this.log.info('-----------------------------------------');
    this.log.info('Model: ' + this.Controller.ReceiverModel);
    this.log.info('Serial Number: ' + this.Controller.SerialNumber);
    this.log.info('Software Version: ' + this.Controller.SoftwareVersion);

    this.log.info('Zones: ' + this.Controller.GetConfiguredZoneNumber());
    for(const ZoneNumber in this.Controller.GetZones()){
      const Zone = this.Controller.GetZones()[ZoneNumber];
      this.log.info(' Zone' + ZoneNumber + ': ' + Zone.ZoneName);
    }

    const Inputs = this.Controller.GetInputs();

    this.log.info('Inputs: ' + Inputs.length);
    for(let i = 0 ; i < Inputs.length ; i ++){
      this.log.info(' Input' + (i + 1) + ': ' + Inputs[i]);
    }
  }

  ConfigureControllerError(){
    this.Controller.on('ControllerError', (error, message) => {
      if(error === AnthemControllerError.CONNECTION_ERROR) {
        if(!this.LastConnectionError) this.log.warn('Receiver disconnected: ' + message + '. Reconnecting automatically.');
        else this.log.debug('Receiver reconnect attempt: ' + message);
        this.LastConnectionError = message;
        this.IsRunning = false;
      } else this.log.warn(error + ': ' + message);
    });
  }
}
