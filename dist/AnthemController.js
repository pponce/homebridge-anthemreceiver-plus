"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthemController = exports.AnthemZone = exports.AnthemKeyCode = exports.AnthemControllerError = exports.AnthemDolbyAudioPostProcessing = exports.AnthemAudioListeningMode = exports.AnthemReceiverModel = void 0;
const node_events_1 = require("node:events");
const protocol_1 = require("./protocol");
const capabilities_1 = require("./capabilities");
const transactions_1 = require("./transactions");
const net = require("net");
var AnthemReceiverModel;
(function (AnthemReceiverModel) {
    AnthemReceiverModel["Undefined"] = "";
    AnthemReceiverModel["MRX310"] = "MRX 310";
    AnthemReceiverModel["MRX510"] = "MRX 510";
    AnthemReceiverModel["MRX710"] = "MRX 710";
    AnthemReceiverModel["MRX520"] = "MRX 520";
    AnthemReceiverModel["MRX720"] = "MRX 720";
    AnthemReceiverModel["MRX1120"] = "MRX 1120";
    AnthemReceiverModel["MRX540"] = "MRX 540";
    AnthemReceiverModel["MRX740"] = "MRX 740";
    AnthemReceiverModel["MRX1140"] = "MRX 1140";
    AnthemReceiverModel["MRXSLM"] = "MRX SLM";
    AnthemReceiverModel["AVM60"] = "AVM 60";
    AnthemReceiverModel["AVM70"] = "AVM 70";
    AnthemReceiverModel["AVM90"] = "AVM 90";
    AnthemReceiverModel["STRPA"] = "STR PA";
    AnthemReceiverModel["STRIA"] = "STR IA";
})(AnthemReceiverModel || (exports.AnthemReceiverModel = AnthemReceiverModel = {}));
var AnthemAudioListeningMode;
(function (AnthemAudioListeningMode) {
    AnthemAudioListeningMode[AnthemAudioListeningMode["NONE"] = 0] = "NONE";
    AnthemAudioListeningMode[AnthemAudioListeningMode["ANTHEMLOGIC_CINEMA"] = 1] = "ANTHEMLOGIC_CINEMA";
    AnthemAudioListeningMode[AnthemAudioListeningMode["ANTHEMLOGIC_MUSIC"] = 2] = "ANTHEMLOGIC_MUSIC";
    AnthemAudioListeningMode[AnthemAudioListeningMode["DOLBYSUROUND"] = 3] = "DOLBYSUROUND";
    AnthemAudioListeningMode[AnthemAudioListeningMode["DTSNEURALX"] = 4] = "DTSNEURALX";
    AnthemAudioListeningMode[AnthemAudioListeningMode["DTSVIRTUALX"] = 5] = "DTSVIRTUALX";
    AnthemAudioListeningMode[AnthemAudioListeningMode["ALLCHANNELSTEREO"] = 6] = "ALLCHANNELSTEREO";
    AnthemAudioListeningMode[AnthemAudioListeningMode["MONO"] = 7] = "MONO";
    AnthemAudioListeningMode[AnthemAudioListeningMode["ALLCHANNELMONO"] = 8] = "ALLCHANNELMONO";
})(AnthemAudioListeningMode || (exports.AnthemAudioListeningMode = AnthemAudioListeningMode = {}));
var AnthemDolbyAudioPostProcessing;
(function (AnthemDolbyAudioPostProcessing) {
    AnthemDolbyAudioPostProcessing[AnthemDolbyAudioPostProcessing["OFF"] = 0] = "OFF";
    AnthemDolbyAudioPostProcessing[AnthemDolbyAudioPostProcessing["MOVIE"] = 1] = "MOVIE";
    AnthemDolbyAudioPostProcessing[AnthemDolbyAudioPostProcessing["MUSIC"] = 2] = "MUSIC";
    AnthemDolbyAudioPostProcessing[AnthemDolbyAudioPostProcessing["NIGHT"] = 3] = "NIGHT";
})(AnthemDolbyAudioPostProcessing || (exports.AnthemDolbyAudioPostProcessing = AnthemDolbyAudioPostProcessing = {}));
const AllAnthemReceiverModel = [
    AnthemReceiverModel.STRPA,
    AnthemReceiverModel.STRIA,
    AnthemReceiverModel.MRX310,
    AnthemReceiverModel.MRX510,
    AnthemReceiverModel.MRX710,
    AnthemReceiverModel.MRX520,
    AnthemReceiverModel.MRX720,
    AnthemReceiverModel.MRX1120,
    AnthemReceiverModel.MRX540,
    AnthemReceiverModel.MRX740,
    AnthemReceiverModel.MRX1140,
    AnthemReceiverModel.MRXSLM,
    AnthemReceiverModel.AVM60,
    AnthemReceiverModel.AVM70,
    AnthemReceiverModel.AVM90,
];
const ProtocolV01Model = [
    AnthemReceiverModel.MRX310,
    AnthemReceiverModel.MRX510,
    AnthemReceiverModel.MRX710,
    AnthemReceiverModel.MRX520,
    AnthemReceiverModel.MRX720,
    AnthemReceiverModel.MRX1120,
    AnthemReceiverModel.AVM60,
    AnthemReceiverModel.STRPA,
    AnthemReceiverModel.STRIA,
];
const ProtocolV02Model = [
    AnthemReceiverModel.MRX540,
    AnthemReceiverModel.MRX740,
    AnthemReceiverModel.MRXSLM,
    AnthemReceiverModel.MRX1140,
    AnthemReceiverModel.AVM70,
    AnthemReceiverModel.AVM90,
];
var ControllerState;
(function (ControllerState) {
    ControllerState[ControllerState["Idle"] = 0] = "Idle";
    ControllerState[ControllerState["Configure"] = 1] = "Configure";
    ControllerState[ControllerState["Operation"] = 2] = "Operation";
})(ControllerState || (ControllerState = {}));
const ALMV01 = [
    'AnthemLogic Movie',
    'AnthemLogic Music',
    'PLIIx Movie',
    'PLIIx Music',
    'Neo:6 Cinema',
    'Neo:6 Music',
    'All Channel Stereo',
    'All Channel Mono',
    'Mono',
    'Mono Academy',
    'Mono(L)',
    'Mono(R)',
    'High Blend',
    'Dolby Surround',
    'Neo:X-Cinema',
    'Neo:X-Music',
];
const ALMV02 = [
    'ANTHEM LOGIC CINEMA',
    'ANTHEM LOGIC MUSIC',
    'DOLBY SURROUND',
    'DTS NEURAL X',
    'DTS VIRTUAL X',
    'ALL CHANNEL STEREO',
    'MONO',
    'ALL CHANNEL MONO',
];
var AnthemControllerError;
(function (AnthemControllerError) {
    AnthemControllerError["CONNECTION_ERROR"] = "Controller Connection Error";
    AnthemControllerError["ZONE_IS_NOT_POWERED"] = "Zone is not powered";
    AnthemControllerError["COMMAND_NOT_SUPPORTED"] = "Command is not supported by receiver";
    AnthemControllerError["RECEIVER_NOT_READY"] = "Receiver not ready for operation";
    AnthemControllerError["INVALID_MODEL_STRING_RECEIVED"] = "Received and invalid model string from receiver";
    AnthemControllerError["CANNOT_EXECUTE_COMMAND"] = "Received a valid command that cannot be executed";
    AnthemControllerError["OUT_OF_RANGE_PARAMETER"] = "Controller received an out of range paramenter";
    AnthemControllerError["INVALID_COMMAND"] = "Invalid command reveived";
    AnthemControllerError["COMMAND_ONLY_AVAILABLE_ON_MAIN_ZONE"] = "Command only available on main zone";
})(AnthemControllerError || (exports.AnthemControllerError = AnthemControllerError = {}));
var AnthemKeyCode;
(function (AnthemKeyCode) {
    AnthemKeyCode["UP"] = "0018";
    AnthemKeyCode["DOWN"] = "0019";
    AnthemKeyCode["LEFT"] = "0020";
    AnthemKeyCode["RIGHT"] = "0021";
    AnthemKeyCode["SELECT"] = "0022";
})(AnthemKeyCode || (exports.AnthemKeyCode = AnthemKeyCode = {}));
class AnthemZone {
    constructor(ZoneNumber, ZoneName, IsMainZone) {
        this.ZoneNumber = 0;
        this.IsMainZone = false;
        this.IsMuted = false;
        this.ARCConfigured = true;
        this.ActiveInput = 0;
        this.ActiveInputARCEnabled = false;
        this.IsPowered = false;
        this.PowerConfigured = false;
        this.MutedConfigured = false;
        this.InputConfigured = false;
        this.VolumeConfigured = false;
        this.VolumePercentage = 0;
        this.Volume = 0;
        this.AudioListeningMode = AnthemAudioListeningMode.NONE;
        this.ZoneName = '';
        this.ZoneNumber = ZoneNumber;
        this.ZoneName = ZoneName;
        this.IsMainZone = IsMainZone;
    }
    GetIsMuted() {
        return this.IsMuted;
    }
    SetIsMuted(Muted) {
        this.IsMuted = Muted;
        this.MutedConfigured = true;
    }
    GetIsPowered() {
        return this.IsPowered;
    }
    SetIsPowered(Powered) {
        if (!Powered) {
            this.MutedConfigured = this.InputConfigured = this.VolumeConfigured = false;
            this.IsMuted = this.ActiveInputARCEnabled = false;
            this.VolumePercentage = this.Volume = 0;
            this.AudioListeningMode = AnthemAudioListeningMode.NONE;
        }
        this.IsPowered = Powered;
        this.PowerConfigured = true;
    }
    GetIsMainZone() {
        return this.IsMainZone;
    }
    GetActiveInput() {
        return this.ActiveInput;
    }
    SetActiveInput(ActiveInput) {
        this.ActiveInput = ActiveInput;
        this.InputConfigured = true;
    }
    GetARCConfigured() {
        return this.ARCConfigured;
    }
    SetARCConfigured(ARCConfigured) {
        this.ARCConfigured = ARCConfigured;
    }
    GetActiveInputARCEnabled() {
        return this.ActiveInputARCEnabled;
    }
    SetActiveInputARCEnabled(ARCEnabled) {
        this.ActiveInputARCEnabled = ARCEnabled;
    }
    GetVolumePercentage() {
        return this.VolumePercentage;
    }
    GetVolume() {
        return this.Volume;
    }
    SetVolumePercentage(VolumePercentage) {
        this.VolumePercentage = VolumePercentage;
    }
    SetVolume(Volume) {
        this.Volume = Volume;
        this.VolumeConfigured = true;
    }
    IsZoneConfigured() {
        return this.PowerConfigured && (!this.IsPowered || (this.MutedConfigured && this.InputConfigured && this.VolumeConfigured));
    }
    Reset() {
        this.PowerConfigured = this.MutedConfigured = this.InputConfigured = this.VolumeConfigured = false;
        this.IsPowered = this.IsMuted = this.ActiveInputARCEnabled = false;
        this.ActiveInput = this.VolumePercentage = this.Volume = 0;
        this.AudioListeningMode = AnthemAudioListeningMode.NONE;
    }
    SetALM(AudioListeningMode) {
        this.AudioListeningMode = AudioListeningMode;
    }
    GetALM() {
        return this.AudioListeningMode;
    }
}
exports.AnthemZone = AnthemZone;
class AnthemController extends node_events_1.EventEmitter {
    constructor(Timing = { connect: 10000, handshake: 30000, idle: 300000, keepalive: 150000, reconnect: 3000, maxReconnect: 60000, command: 7000 }) {
        super();
        this.Timing = Timing;
        this.Host = '';
        this.Port = 14999;
        this.Client = new net.Socket();
        this.CurrentState = ControllerState.Idle;
        this.CommandArray = [];
        this.InputNameArray = [];
        this.InputNameArrayOld = []; // Used to check for any changes when inputs name are refreshed
        this.Zones = {};
        this.ConfigMenuDisplayVisible = false;
        this.PanelBrightness = 0;
        this.SocketTimeout = 300000; // 5 minutes
        this.MaxVolumeDb = 10;
        this.UseHomeKitDbVolumeMapping = false;
        this.SerialNumber = '';
        this.SoftwareVersion = '';
        this.ReceiverModel = AnthemReceiverModel.Undefined;
        this.Framer = new protocol_1.ResponseFramer();
        this.Stopped = true;
        this.ConnectionFailed = true;
        this.Connected = false;
        this.RetryAttempt = 0;
        // Need to add more possible EventEmitter lsteners if all accessories are active
        this.setMaxListeners(32);
        this.Transactions = new transactions_1.CommandTransactions(commands => this.WriteCommands(commands), () => this.IsReady(), this.Timing.command, 16, () => this.Disconnect('Receiver command confirmation timed out'));
    }
    Clamp(Value, Min, Max) {
        return Math.min(Max, Math.max(Min, Value));
    }
    GetReceiverDbFromPercent(ReceiverPercent) {
        const Percent = this.Clamp(Math.round(ReceiverPercent), 0, 100);
        if (Percent === 0) {
            return -90;
        }
        if (Percent <= 4) {
            return -90 + (Percent * 4);
        }
        if (Percent <= 13) {
            return -71 + ((Percent - 5) * 3);
        }
        if (Percent === 14) {
            return -47;
        }
        if (Percent <= 30) {
            return -45 + (Percent - 15);
        }
        return -24.5 + ((Percent - 31) * 0.5);
    }
    GetHomeKitVolumeFromDb(DbValue) {
        const MinDb = this.IsSTR() ? -96 : -89.5;
        const MaxDb = this.IsSTR() ? this.GetSTRMaxVolumeDb() : this.MaxVolumeDb;
        if (DbValue <= MinDb) {
            return 1;
        }
        if (DbValue >= MaxDb) {
            return 100;
        }
        if (MaxDb <= MinDb) {
            return 100;
        }
        const Normalized = (DbValue - MinDb) / (MaxDb - MinDb);
        return this.Clamp(Math.round(1 + (Normalized * 99)), 1, 100);
    }
    GetDbFromHomeKitVolume(HomeKitVolumePercent) {
        const MinDb = this.IsSTR() ? -96 : -89.5;
        const MaxDb = this.IsSTR() ? this.GetSTRMaxVolumeDb() : this.MaxVolumeDb;
        const VolumePercent = this.Clamp(Math.round(HomeKitVolumePercent), 1, 100);
        if (MaxDb <= MinDb) {
            return MinDb;
        }
        const Normalized = (VolumePercent - 1) / 99;
        const RawDb = MinDb + ((MaxDb - MinDb) * Normalized);
        return Math.round(RawDb * 2) / 2;
    }
    SetMaxVolumeDB(MaxVolumeDb) {
        if (MaxVolumeDb === undefined || MaxVolumeDb === null) {
            this.UseHomeKitDbVolumeMapping = false;
            this.MaxVolumeDb = 10;
            return;
        }
        this.MaxVolumeDb = this.Clamp(MaxVolumeDb, -89.5, 10);
        this.UseHomeKitDbVolumeMapping = true;
    }
    Connect(Host, Port) {
        this.Stop();
        this.Host = Host;
        this.Port = Port;
        this.Stopped = false;
        this.RetryAttempt = 0;
        this.OpenConnection();
    }
    OpenConnection() {
        if (this.Stopped)
            return;
        this.ConnectionFailed = false;
        this.Connected = false;
        this.CurrentState = ControllerState.Idle;
        this.CommandArray = [];
        this.Framer.reset();
        this.SerialNumber = this.SoftwareVersion = '';
        this.ReceiverModel = AnthemReceiverModel.Undefined;
        this.InputNameArrayOld = this.InputNameArray;
        this.InputNameArray = [];
        for (const zone of Object.values(this.Zones))
            zone.Reset();
        const client = new net.Socket();
        this.Client = client;
        client.setTimeout(this.Timing.connect);
        const current = () => client === this.Client && !this.Stopped && !this.ConnectionFailed;
        client.on('data', data => { if (current())
            this.AnalyseResponse(data); });
        client.on('error', error => { if (current())
            this.Disconnect(error.message); });
        client.on('timeout', () => { if (current())
            this.Disconnect('Receiver connection timed out'); });
        client.on('end', () => { if (current())
            this.Disconnect('Receiver closed the connection'); });
        client.on('close', () => { if (current())
            this.Disconnect('Receiver connection closed'); });
        try {
            client.connect(this.Port, this.Host, () => {
                if (!current())
                    return;
                this.Connected = true;
                client.setTimeout(this.Timing.idle);
                this.HandshakeTimer = setTimeout(() => this.Disconnect('Receiver initialization timed out'), this.Timing.handshake);
                this.GetModel();
            });
        }
        catch (error) {
            this.Disconnect(error instanceof Error ? error.message : 'Could not connect');
        }
    }
    ClearTimers() {
        clearTimeout(this.ReconnectTimer);
        clearTimeout(this.HandshakeTimer);
        clearTimeout(this.KeepAliveTimer);
        clearTimeout(this.StableTimer);
        this.ReconnectTimer = this.HandshakeTimer = this.KeepAliveTimer = this.StableTimer = undefined;
    }
    Disconnect(message) {
        if (this.Stopped || this.ConnectionFailed)
            return;
        this.ConnectionFailed = true;
        this.Connected = false;
        this.CurrentState = ControllerState.Idle;
        this.ClearTimers();
        this.Transactions.disconnect();
        this.CommandArray = [];
        this.Framer.reset();
        this.Client.destroy();
        this.emit('ControllerUnavailable');
        this.emit('ControllerError', AnthemControllerError.CONNECTION_ERROR, message);
        const delay = Math.min(this.Timing.maxReconnect, this.Timing.reconnect * 2 ** Math.min(this.RetryAttempt++, 5));
        this.ReconnectTimer = setTimeout(() => { this.ReconnectTimer = undefined; this.OpenConnection(); }, delay + Math.floor(delay * Math.random() * 0.1));
        this.ReconnectTimer.unref();
    }
    Stop() {
        this.Stopped = true;
        this.ConnectionFailed = true;
        this.Connected = false;
        this.CurrentState = ControllerState.Idle;
        this.ClearTimers();
        this.Transactions?.disconnect();
        this.Framer.reset();
        this.CommandArray = [];
        this.Client.destroy();
    }
    IsReady() {
        return !this.Stopped && this.Connected && !this.Client.destroyed && this.CurrentState === ControllerState.Operation;
    }
    RunCommand(action) {
        return this.Transactions.run(() => {
            this.CapturedCommands = [];
            try {
                action();
                for (const command of this.CapturedCommands) {
                    const zone = /^Z([12])(?!POW)/.exec(command);
                    if (zone && (!this.GetZonePower(Number(zone[1])) || !this.GetZone(Number(zone[1])).IsZoneConfigured())) {
                        throw new Error('Receiver zone is powered off or still starting');
                    }
                }
                return this.CapturedCommands;
            }
            finally {
                this.CapturedCommands = undefined;
                this.CommandArray = [];
            }
        });
    }
    WriteCommands(commands) {
        if (!this.Connected || this.Client.destroyed || !this.Client.writable)
            return Promise.reject(new Error('Receiver is disconnected'));
        const message = commands.map(command => command + ';').join('');
        this.emit('ShowDebugInfo', 'Sending: ' + message);
        return new Promise((resolve, reject) => {
            this.Client.write(message, error => error ? reject(error) : resolve());
        });
    }
    RemoveControllingZone(zone) { delete this.Zones[zone]; }
    PublishSnapshot() {
        if (!this.IsReady())
            return;
        this.emit('PanelBrightnessChange', this.PanelBrightness);
        this.emit('InputChange', this.InputNameArray);
        for (const zone of Object.values(this.Zones)) {
            const n = zone.ZoneNumber;
            this.emit('ZonePowerChange', n, zone.GetIsPowered());
            this.emit('ZoneInputChange', n, zone.GetActiveInput());
            this.emit('ZoneMutedChange', n, zone.GetIsMuted());
            this.emit('ZoneVolumePercentageChange', n, zone.GetIsPowered() ? zone.GetVolumePercentage() : 0);
            this.emit('ZoneARCEnabledChange', n, zone.GetActiveInputARCEnabled());
            this.emit('ZoneALMChange', n, zone.GetALM());
        }
    }
    AddControllingZone(NewZone, ZoneName, IsMainZone) {
        // We can only add a new zone while the controller is Idle
        if (this.CurrentState === ControllerState.Operation) {
            return false;
        }
        // Check if zone is 1 or 2;
        if (NewZone !== 1 && NewZone !== 2) {
            return false;
        }
        // Cannot add a duplicate zone.
        if (this.Zones[NewZone] !== undefined) {
            return false;
        }
        this.Zones[NewZone] = new AnthemZone(NewZone, ZoneName, IsMainZone);
        return true;
    }
    GetZones() {
        return this.Zones;
    }
    GetZone(ZoneNumber) {
        return this.Zones[ZoneNumber];
    }
    GetIsMenuDisplayVisible() {
        return this.ConfigMenuDisplayVisible;
    }
    GetZoneName(ZoneNumber) {
        return this.Zones[ZoneNumber].ZoneName;
    }
    GetConfiguredZoneNumber() {
        return Object.keys(this.Zones).length;
    }
    GetNumberOfInput() {
        return this.InputNameArray.length;
    }
    GetInputs() {
        return this.InputNameArray;
    }
    SwitchInput(ZoneNumber) {
        let Input = this.Zones[ZoneNumber].GetActiveInput();
        Input++;
        if (Input > this.InputNameArray.length) {
            Input = 1;
        }
        this.SetZoneInput(ZoneNumber, Input);
    }
    IsSTR() { return (0, capabilities_1.isSTR)(this.ReceiverModel); }
    GetCapabilities() { return (0, capabilities_1.capabilities)(this.ReceiverModel); }
    GetListeningModes() {
        return this.IsSTR() ? capabilities_1.strListeningModes : [
            ...this.GetALMArray().map((name, index) => ({ name, mode: index + 1 })),
            { name: 'None', mode: AnthemAudioListeningMode.NONE },
        ];
    }
    GetSTRMaxVolumeDb() {
        // Round down so the receiver's half-dB step never exceeds the configured cap.
        return Math.floor(Math.min(this.MaxVolumeDb, 7) * 2) / 2;
    }
    GetALMArray() {
        if (this.IsSTR())
            return capabilities_1.strListeningModes.map(item => item.name);
        if (this.IsProtocolV01()) {
            return ALMV01;
        }
        if (this.IsProtocolV02()) {
            return ALMV02;
        }
        return [];
    }
    //
    // Function GetInputHasChange()
    // To be called after receiver updates inputs name
    // Check if any input has changed with update
    //
    GetInputHasChange() {
        if (this.InputNameArray.length !== this.InputNameArrayOld.length) {
            return true;
        }
        for (let i = 0; i < this.InputNameArray.length; i++) {
            if (this.InputNameArray[i] !== this.InputNameArrayOld[i]) {
                return true;
            }
        }
        return false;
    }
    //
    // Function Queue Command()
    // Insert a new command in the queue. Dont sent immediatly
    //
    QueueCommand(Command) {
        if (this.IsSTR() && !(0, capabilities_1.isSTRCommand)(Command))
            throw new Error('This command is not enabled for experimental STR support');
        this.CommandArray.push(Command);
    }
    //
    // Function SendCommand()
    // Clear the Command Buffer and send to receiver
    //
    SendCommand() {
        const commands = this.CommandArray.splice(0);
        if (!commands.length)
            return;
        if (this.CapturedCommands) {
            this.CapturedCommands.push(...commands);
            return;
        }
        void this.WriteCommands(commands).catch(error => this.Disconnect(error.message));
    }
    //
    // Function IsProtocolV01()
    // Check if current model support protocol V01
    // Anthem MRX 710-510-310 AVR
    // Anthem MRX 1120-720-520 AVR and AVM 60
    //
    IsProtocolV01() {
        if (ProtocolV01Model.indexOf(this.ReceiverModel) !== -1) {
            return true;
        }
        return false;
    }
    //
    // Function IsProtocolV02()
    // Check if current model support protocol V02
    // Anthem MRX 1140-740-540 AVR and AVM 90-70 AVP
    //
    IsProtocolV02() {
        if (ProtocolV02Model.indexOf(this.ReceiverModel) !== -1) {
            return true;
        }
        return false;
    }
    //
    // Function GetModelFromReceiver()
    // Get model number from receiver
    //
    // Availability: All models supported by controller
    GetModelFromReceiver() {
        this.QueueCommand('IDM?');
    }
    //
    // Function SendKeepAlivePacket()
    // Keep connection open (Receiver will process GetModel command even when powered off)
    //
    // Availability: All models supported by controller
    SendKeepAlivePacket() {
        clearTimeout(this.KeepAliveTimer);
        if (!this.IsReady())
            return;
        this.KeepAliveTimer = setTimeout(() => {
            if (!this.IsReady())
                return;
            this.GetModelFromReceiver();
            this.SendCommand();
        }, this.Timing.keepalive);
        this.KeepAliveTimer.unref();
    }
    //
    // Function GetSerialNumberFromReceiver()
    // Get serial number from receiver
    //
    // Availability:
    // Anthem MRX 1140-740-540 AVR and AVM 90-70 AVP
    //
    GetSerialNumberFromReceiver() {
        if (!this.IsProtocolV02()) {
            this.CurrentState = ControllerState.Idle;
            this.emit('ControllerError', AnthemControllerError.COMMAND_NOT_SUPPORTED, 'GetSerial (GSN?)');
            return;
        }
        this.QueueCommand('GSN?');
    }
    GetPanelBrightness() {
        if (this.IsProtocolV01()) {
            return;
        }
        if (this.IsProtocolV02()) {
            if (this.ReceiverModel === AnthemReceiverModel.MRXSLM) { // MRX SLM only has an LED
                this.QueueCommand('GCLEDB?');
            }
            else {
                this.QueueCommand('GCFPB?');
            }
        }
    }
    SetPanelBrightness(Brightness) {
        if (this.ReceiverModel === AnthemReceiverModel.MRXSLM) { // MRX SLM only has an LED with four options.
            Brightness = Math.round(Brightness / 33);
            this.emit('ShowDebugInfo', 'Brightness rounded: ' + Brightness);
            Brightness =
                Brightness < 1 ? 0 :
                    Brightness < 2 ? 40 :
                        Brightness < 3 ? 80 : 100;
            this.QueueCommand('GCLEDB' + Brightness);
            this.QueueCommand('GCLEDB?');
        }
        else {
            this.QueueCommand('GCFPB' + Brightness);
            this.QueueCommand('GCFPB?');
        }
        this.SendCommand();
    }
    //
    // Function GetMACAddress()
    // Get MAC Address from receiver. To be used as unique id
    //
    // Availability:
    // Anthem MRX 710-510-310 AVR
    // Anthem MRX 1120-720-520 AVR and AVM 60
    //
    GetMACAddress() {
        if (!this.IsProtocolV01()) {
            this.CurrentState = ControllerState.Idle;
            this.emit('ControllerError', AnthemControllerError.COMMAND_NOT_SUPPORTED, 'GetMACAddress (IDN?)');
            return;
        }
        this.QueueCommand('IDN?');
    }
    //
    // Function GetsoftwareVersionFromReceiver()
    // Get software version from receiver
    //
    // Availability: All models supported by controller
    GetsoftwareVersionFromReceiver() {
        this.QueueCommand('IDS?');
    }
    //
    // Function GetIsZonePoweredFromReceiver()
    // Get zone power status from receiver
    //
    // Availability: All models supported by controller
    GetIsZonePoweredFromReceiver(ZoneNumber) {
        this.QueueCommand('Z' + ZoneNumber + 'POW?');
    }
    //
    // Function GetIsZoneMutedromReceiver()
    // Get zone muted status from receiver
    //
    // Availability: All models supported by controller
    GetIsZoneMutedFromReceiver(ZoneNumber) {
        this.QueueCommand('Z' + ZoneNumber + 'MUT?');
    }
    GetZoneVolumeFromReceiver(ZoneNumber) {
        this.QueueCommand('Z' + ZoneNumber + 'VOL?');
    }
    GetZoneVolumePercentageFromReceiver(ZoneNumber) {
        this.QueueCommand('Z' + ZoneNumber + 'PVOL?');
    }
    SetZoneVolumePercentage(ZoneNumber, VolumePercentage) {
        const HomeKitVolume = this.Clamp(Math.round(VolumePercentage), 0, 100);
        if (HomeKitVolume === 0) {
            this.QueueCommand('Z' + ZoneNumber + 'MUT1');
            this.SendCommand();
            return;
        }
        this.QueueCommand('Z' + ZoneNumber + 'MUT0');
        if (this.UseHomeKitDbVolumeMapping || this.IsSTR()) {
            const TargetDb = this.GetDbFromHomeKitVolume(HomeKitVolume);
            this.QueueCommand('Z' + ZoneNumber + 'VOL' + TargetDb.toFixed(1));
        }
        else {
            this.QueueCommand('Z' + ZoneNumber + 'PVOL' + HomeKitVolume);
        }
        this.SendCommand();
    }
    //
    // Function  GetNumberOfInputFromReceiver()
    // Get number of inputs from receiver
    //
    // Availability: All models supported by controller
    GetNumberOfInputFromReceiver() {
        this.QueueCommand('ICN?');
    }
    //
    // Function GetInputsNameFromReceiver()
    // Get input name from receiver
    //
    // Availability: All models
    //
    GetInputsNameFromReceiver() {
        if (this.IsProtocolV01()) {
            for (let i = 1; i <= this.InputNameArray.length; i++) {
                if (i < 10) {
                    this.QueueCommand('ISN0' + i + '?');
                }
                else {
                    this.QueueCommand('ISN' + i + '?');
                }
            }
        }
        if (this.IsProtocolV02()) {
            for (let i = 1; i <= this.InputNameArray.length; i++) {
                this.QueueCommand('IS' + i + 'IN?');
            }
        }
        this.SendCommand();
    }
    //
    // Function GetZoneActiveInputFromReceiver()
    // Get zone active input
    //
    // Availability: All models
    GetZoneActiveInputFromReceiver(ZoneNumber) {
        this.QueueCommand('Z' + ZoneNumber + 'INP?');
    }
    //
    // Function SetZoneInput()
    // Set Zone active input
    //
    // Availability: All models
    SetZoneInput(ZoneNumber, InputNumber) {
        if (this.IsSTR() && (!Number.isInteger(InputNumber) || InputNumber < 1 || InputNumber > this.InputNameArray.length
            || (this.ReceiverModel === AnthemReceiverModel.STRIA && InputNumber === 32))) {
            throw new Error('Select a discovered normal STR input; integrated bypass input 32 is not enabled');
        }
        this.QueueCommand('Z' + ZoneNumber + 'INP' + InputNumber);
        this.SendCommand();
    }
    //
    // Function GetARCConfigured()
    //
    // Availability: x40 models
    GetARCConfigured() {
        if (!this.IsProtocolV02()) {
            this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND, 'GetARCConfigured command only supported on x40 models');
            return;
        }
        this.QueueCommand('Z1ARCVAL?');
        this.SendCommand();
    }
    //
    // Function GetZoneARCEnabled()
    //
    // Availability: All models
    GetZoneARCEnabled(ZoneNumber) {
        if (this.IsSTR())
            return;
        if (!this.Zones[ZoneNumber].GetIsMainZone()) {
            this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND, 'ARC Command only available on main zone');
            return;
        }
        if (this.IsProtocolV01()) {
            this.QueueCommand('Z' + ZoneNumber + 'ARC?');
        }
        if (this.IsProtocolV02()) {
            this.QueueCommand('IS' + this.Zones[ZoneNumber].GetActiveInput() + 'ARC?');
        }
        this.SendCommand();
    }
    //
    // Function SetZoneARCEnabled()
    //
    // Availability: All models
    SetZoneARCEnabled(ZoneNumber, ARCEnabled) {
        if (this.IsSTR())
            throw new Error('ARC control is not enabled for experimental STR support');
        if (!this.Zones[ZoneNumber].GetIsMainZone()) {
            this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND, 'ARC Command only available on main zone');
            return;
        }
        if (this.IsProtocolV02() && !this.Zones[ZoneNumber].GetARCConfigured()) {
            this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND, 'ARC is not configured on main zone');
            return;
        }
        let CommandString = '0';
        if (ARCEnabled) {
            CommandString = '1';
        }
        if (this.IsProtocolV01()) {
            this.QueueCommand('Z' + ZoneNumber + 'ARC' + CommandString);
        }
        if (this.IsProtocolV02()) {
            this.QueueCommand('IS' + this.Zones[ZoneNumber].GetActiveInput() + 'ARC' + CommandString);
        }
        this.SendCommand();
    }
    //
    // Function GetDolbyPostProcessing()
    //
    // Availability: x40 models
    GetDolbyPostProcessing(ZoneNumber) {
        if (this.IsProtocolV02()) {
            this.QueueCommand('IS' + this.Zones[ZoneNumber].GetActiveInput() + 'DV?');
            this.SendCommand();
        }
    }
    //
    // Function SetDolbyPostProcessing()
    //
    // Availability: x40 models
    SetDolbyPostProcessing(ZoneNumber, DolbyAudioMode) {
        if (this.IsProtocolV02()) {
            this.QueueCommand('IS' + this.Zones[ZoneNumber].GetActiveInput() + 'DV' + DolbyAudioMode);
            this.SendCommand();
        }
    }
    //
    // Function SetAudioListeningMode()
    //
    // Availability: All models
    SetAudioListeningMode(ZoneNumber, AudioMode) {
        if (!this.Zones[ZoneNumber].GetIsMainZone()) {
            this.emit('ControllerError', AnthemControllerError.COMMAND_ONLY_AVAILABLE_ON_MAIN_ZONE, '');
            return;
        }
        if (this.IsSTR() && !capabilities_1.strListeningModes.some(item => item.mode === AudioMode))
            throw new Error('Listening mode is unavailable on STR');
        if (this.IsProtocolV02() || this.IsSTR()) {
            this.QueueCommand('Z' + ZoneNumber + 'ALM' + AudioMode);
        }
        else {
            throw new Error('Direct listening-mode selection is unavailable on this model; use the Apple Remote cycle control');
        }
        this.SendCommand();
    }
    //
    // Function ToggleAudioListeningMode()
    // Iterate throught inputs
    //
    // Availability: All models
    ToggleAudioListeningMode(ZoneNumber, UP) {
        if (this.IsSTR()) {
            const modes = capabilities_1.strListeningModes.map(item => item.mode);
            const current = modes.indexOf(this.GetZone(ZoneNumber).GetALM());
            if (current < 0)
                throw new Error('STR listening mode is not known yet; select a named mode');
            this.SetAudioListeningMode(ZoneNumber, modes[(current + (UP ? 1 : modes.length - 1)) % modes.length]);
            return;
        }
        if (!this.Zones[ZoneNumber].GetIsMainZone()) {
            this.emit('ControllerError', AnthemControllerError.COMMAND_ONLY_AVAILABLE_ON_MAIN_ZONE, '');
            return;
        }
        if (this.IsProtocolV02()) {
            if (UP) {
                this.QueueCommand('Z1AUP');
            }
            else {
                this.QueueCommand('Z1ADN');
            }
        }
        else {
            if (UP) {
                this.QueueCommand('Z1ALMna');
            }
            else {
                this.QueueCommand('Z1ALMpa');
            }
        }
        this.SendCommand();
    }
    //
    // Function GetAudioListeningMode()
    // Iterate throught inputs
    //
    // Availability: All models
    GetAudioListeningMode(ZoneNumber) {
        if (!this.Zones[ZoneNumber].GetIsMainZone()) {
            this.emit('ControllerError', AnthemControllerError.COMMAND_ONLY_AVAILABLE_ON_MAIN_ZONE, '');
            return;
        }
        this.QueueCommand('Z1ALM?');
    }
    // All zone need to have IsMuted, IsPowered and ActiveInput set before starting
    // Controller operation;
    IsAllZoneConfigured() {
        if (this.IsProtocolV01()) {
            for (const ZoneNumber in this.Zones) {
                const Zone = this.Zones[ZoneNumber];
                if (!Zone.IsZoneConfigured()) {
                    return false;
                }
            }
            return this.IsAllInputConfigured();
        }
        if (this.IsProtocolV02()) {
            for (const ZoneNumber in this.Zones) {
                const Zone = this.Zones[ZoneNumber];
                if (!Zone.IsZoneConfigured()) {
                    return false;
                }
            }
            return this.IsAllInputConfigured();
        }
    }
    //
    // Function IsAllInputConfigured()
    // Check if name has been set or all inputs
    //
    IsAllInputConfigured() {
        if (this.InputNameArray.length === 0) {
            return false;
        }
        for (let i = 0; i < this.InputNameArray.length; i++) {
            if (this.InputNameArray[i] === undefined) {
                return false;
            }
        }
        return true;
    }
    //
    // Function PowerZone()
    // Set power to zone
    //
    PowerZone(ZoneNumber, Power) {
        if (Power === true) {
            this.QueueCommand('Z' + ZoneNumber + 'POW1');
        }
        else {
            this.QueueCommand('Z' + ZoneNumber + 'POW0');
        }
        this.SendCommand();
    }
    //
    // Function ToggleMute()
    //
    // Availability: All models
    ToggleMute(ZoneNumber) {
        if (this.IsSTR()) {
            this.SetMute(ZoneNumber, !this.GetMute(ZoneNumber));
            return;
        }
        this.QueueCommand('Z' + ZoneNumber + 'MUTt');
        this.SendCommand();
    }
    //
    // Function SetMute()
    //
    // Availability: All models
    SetMute(ZoneNumber, Mute) {
        let m = '0';
        if (Mute === true) {
            m = '1';
        }
        this.QueueCommand('Z' + ZoneNumber + 'MUT' + m);
        this.SendCommand();
    }
    //
    // Function GetMute()
    //
    // Availability: All models
    GetMute(ZoneNumber) {
        return this.Zones[ZoneNumber].GetIsMuted();
    }
    //
    // Function VolumeUp()
    //
    // Availability: All models
    VolumeUp(ZoneNumber) {
        if (this.IsSTR()) {
            const db = this.Clamp(this.GetZone(ZoneNumber).GetVolume() + 0.5, -96, this.GetSTRMaxVolumeDb());
            this.QueueCommand('Z' + ZoneNumber + 'VOL' + db.toFixed(1));
            this.SendCommand();
            return;
        }
        if (this.IsProtocolV02()) {
            this.QueueCommand('Z' + ZoneNumber + 'VUP');
            this.SendCommand();
            return;
        }
        if (this.IsProtocolV01()) {
            this.QueueCommand('Z' + ZoneNumber + 'VUP1');
            this.SendCommand();
            return;
        }
    }
    //
    // Function Volume Down()
    //
    // Availability: All models
    VolumeDown(ZoneNumber) {
        if (this.IsSTR()) {
            const db = this.Clamp(this.GetZone(ZoneNumber).GetVolume() - 0.5, -96, this.GetSTRMaxVolumeDb());
            this.QueueCommand('Z' + ZoneNumber + 'VOL' + db.toFixed(1));
            this.SendCommand();
            return;
        }
        if (this.IsProtocolV02()) {
            this.QueueCommand('Z' + ZoneNumber + 'VDN');
        }
        else {
            this.QueueCommand('Z' + ZoneNumber + 'VDN1');
        }
        this.SendCommand();
    }
    //
    // Function ToggleConfigMenu()
    // Show on screen configuration menu
    //
    // Availability: All models
    ToggleConfigMenu() {
        if (this.ReceiverModel === AnthemReceiverModel.MRXSLM) {
            return;
        } // MRX SLM Does not support on-screen config menu.
        this.QueueCommand('Z1SMD');
        this.SendCommand();
    }
    //
    // Function ToggleConfigMenu()
    // Show on screen configuration menu
    //
    // Availability: All models
    GetConfigMenuState() {
        if (this.IsSTR())
            return;
        if (this.ReceiverModel === AnthemReceiverModel.MRXSLM) {
            return;
        } // MRX SLM Does not support on-screen config menu.
        this.QueueCommand('Z1SMD?');
    }
    //
    // Function SendKey()
    //
    // Availability: All models
    SendKey(ZoneNumber, Code) {
        this.QueueCommand('Z' + ZoneNumber + 'SIM' + Code);
        this.SendCommand();
    }
    //
    // Function GetZonePower()
    // Get Zone power status
    //
    GetZonePower(ZoneNumber) {
        const Zone = this.Zones[ZoneNumber];
        if (Zone === undefined) {
            return false;
        }
        return Zone.GetIsPowered();
    }
    //
    // Function SetModel
    // Set receiver model from string received from receiver
    //
    SetModel(ModelString) {
        const model = (0, capabilities_1.capabilities)(ModelString).model;
        const changed = this.ReceiverModel !== model;
        this.ReceiverModel = model;
        if (this.IsSTR())
            this.RemoveControllingZone(2);
        if (changed)
            this.emit('ModelDetected', model);
    }
    //
    // Function GetModel
    // First step for controller configuration
    // Need to get model from receiver to send proper command format afterward.
    GetModel() {
        this.CurrentState = ControllerState.Configure;
        this.GetModelFromReceiver();
        this.SendCommand();
    }
    //
    // Function UpdateOnZonePower
    //
    //
    UpdateOnZonePower(ZoneNumber) {
        this.GetZoneActiveInputFromReceiver(ZoneNumber);
        this.GetIsZoneMutedFromReceiver(ZoneNumber);
        this.GetZoneVolumeFromReceiver(ZoneNumber);
        if (this.IsProtocolV02()) {
            this.GetZoneVolumePercentageFromReceiver(ZoneNumber);
        }
        this.GetConfigMenuState();
        this.GetNumberOfInputFromReceiver();
        this.GetPanelBrightness();
        this.GetAudioListeningMode(1);
        this.SendCommand();
    }
    //
    // Function Configure
    // Second step for controller configuration
    // Need to get model from receiver to send proper command format afterward.
    Configure() {
        this.CurrentState = ControllerState.Configure;
        this.GetsoftwareVersionFromReceiver();
        if (this.IsProtocolV01()) {
            this.GetMACAddress();
            // Experimental
            this.GetNumberOfInputFromReceiver();
        }
        // Protocol 2 devices can read inputs number and inputs names even if zone is powered off
        if (this.IsProtocolV02()) {
            this.GetSerialNumberFromReceiver();
            this.GetNumberOfInputFromReceiver();
            this.GetARCConfigured();
        }
        for (const ZoneNumber in this.Zones) {
            this.GetIsZonePoweredFromReceiver(Number(ZoneNumber));
        }
        this.SendCommand();
    }
    //
    // Function AnalyseResponse
    // Process data received from receiver
    //
    AnalyseResponse(Data) {
        let replies;
        try {
            replies = this.Framer.push(Data);
        }
        catch (error) {
            this.Disconnect(error instanceof Error ? error.message : 'Invalid receiver data');
            return;
        }
        for (const response of replies) {
            try {
                (0, protocol_1.validateReply)(response);
                this.ProcessResponse(response);
                this.Transactions.receive(response);
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Invalid receiver response';
                this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND, message);
                if (response.startsWith('IDM'))
                    this.Disconnect(message);
            }
        }
    }
    ProcessResponse(Response) {
        this.emit('ShowDebugInfo', 'Reading: "' + Response + '"');
        // Remove white space if present
        if (Response.slice(Response.length - 1) === ' ') {
            Response = Response.slice(0, Response.length - 1);
        }
        if (Response.length !== 0) {
            // Get Device Model
            if (Response.substring(0, 3) === 'IDM') {
                this.SetModel(Response.substring(3, Response.length));
                if (this.CurrentState === ControllerState.Configure) {
                    this.Configure();
                }
                else {
                    // Continue keep alive process
                    this.SendKeepAlivePacket();
                }
            }
            // Get Serial Number
            if (Response.substring(0, 3) === 'GSN') {
                this.SerialNumber = Response.substring(3, Response.length);
            }
            // Get Mac Address
            if (Response.substring(0, 3) === 'IDN') {
                this.SerialNumber = Response.substring(3, Response.length);
            }
            // Get software version
            if (Response.substring(0, 3) === 'IDS') {
                this.SoftwareVersion = Response.substring(3, Response.length);
            }
            // Get Panel Brightness
            if (Response.substring(0, 5) === 'GCFPB') {
                this.PanelBrightness = Number(Response.substring(5, Response.length));
                if (this.CurrentState === ControllerState.Operation) {
                    this.emit('PanelBrightnessChange', this.PanelBrightness);
                }
            }
            // Get LED Brightness for MRX SLM
            if (Response.substring(0, 6) === 'GCLEDB') {
                this.PanelBrightness = Number(Response.substring(6, Response.length));
                this.PanelBrightness =
                    this.PanelBrightness === 0 ? 0 :
                        this.PanelBrightness === 40 ? 33 :
                            this.PanelBrightness === 80 ? 66 : 100; // Map request and response to four brightness values.
                if (this.CurrentState === ControllerState.Operation) {
                    this.emit('PanelBrightnessChange', this.PanelBrightness);
                }
            }
            // Get Dolby Post Processing
            const dolby = /^IS(\d+)DV([0-3])$/.exec(Response);
            if (dolby) {
                const Input = Number(dolby[1]);
                const DolbyAudioMode = Number(dolby[2]);
                for (const ZoneNumber in this.Zones) {
                    const Zone = this.Zones[ZoneNumber];
                    if (Zone.GetActiveInput() === Input) {
                        this.emit('ZoneDolbyPostProcessingChange', Number(ZoneNumber), DolbyAudioMode);
                    }
                }
            }
            // Get number of input
            if (Response.substring(0, 3) === 'ICN') {
                const NumberInput = Number(Response.substring(3, Response.length));
                this.InputNameArrayOld = this.InputNameArray;
                this.InputNameArray = new Array(NumberInput);
                this.GetInputsNameFromReceiver();
            }
            // Get Zone power status
            for (const ZoneNumber in this.Zones) {
                const Zone = this.Zones[ZoneNumber];
                if (Response.substring(0, 5) === ('Z' + ZoneNumber + 'POW')) {
                    const wasPowered = Zone.GetIsPowered();
                    Zone.SetIsPowered(Response[5] === '1');
                    // Update zone info when power is on
                    if (Zone.GetIsPowered() && (!wasPowered || this.CurrentState === ControllerState.Configure)) {
                        this.UpdateOnZonePower(Number(ZoneNumber));
                    }
                    if (this.CurrentState === ControllerState.Operation) {
                        this.emit('ZonePowerChange', Number(ZoneNumber), Zone.GetIsPowered());
                    }
                    break;
                }
            }
            // Set Zone ALM
            for (const ZoneNumber in this.Zones) {
                const Zone = this.Zones[ZoneNumber];
                if (Response.substring(0, 5) === ('Z' + ZoneNumber + 'ALM')) {
                    Zone.SetALM(Number(Response.slice(5)));
                    if (this.CurrentState === ControllerState.Operation) {
                        this.emit('ZoneALMChange', Number(ZoneNumber), Zone.GetALM());
                    }
                }
            }
            // Set Zone Mute
            for (const ZoneNumber in this.Zones) {
                const Zone = this.Zones[ZoneNumber];
                if (Response.substring(0, 5) === ('Z' + ZoneNumber + 'MUT')) {
                    Zone.SetIsMuted(Response[5] === '1');
                    if (this.CurrentState === ControllerState.Operation) {
                        this.emit('ZoneMutedChange', Number(ZoneNumber), Zone.GetIsMuted());
                    }
                    break;
                }
            }
            // Set VolumePercentage
            for (const ZoneNumber in this.Zones) {
                const Zone = this.Zones[ZoneNumber];
                if (!this.IsSTR() && Response.substring(0, 6) === ('Z' + ZoneNumber + 'PVOL')) {
                    const ReceiverVolumePercent = Number(Response.substring(6, Response.length));
                    if (this.UseHomeKitDbVolumeMapping) {
                        const VolumeDb = this.GetReceiverDbFromPercent(ReceiverVolumePercent);
                        Zone.SetVolumePercentage(this.GetHomeKitVolumeFromDb(VolumeDb));
                    }
                    else {
                        Zone.SetVolumePercentage(ReceiverVolumePercent);
                    }
                    if (this.CurrentState === ControllerState.Operation) {
                        this.emit('ZoneVolumePercentageChange', Number(ZoneNumber), Zone.GetVolumePercentage());
                        break;
                    }
                }
            }
            // Set Volume
            for (const ZoneNumber in this.Zones) {
                const Zone = this.Zones[ZoneNumber];
                if (Response.substring(0, 5) === ('Z' + ZoneNumber + 'VOL')) {
                    Zone.SetVolume(Number(Response.substring(5, Response.length)));
                    if (this.UseHomeKitDbVolumeMapping || this.IsSTR()) {
                        Zone.SetVolumePercentage(this.GetHomeKitVolumeFromDb(Zone.GetVolume()));
                        if (this.CurrentState === ControllerState.Operation) {
                            this.emit('ZoneVolumePercentageChange', Number(ZoneNumber), Zone.GetVolumePercentage());
                        }
                    }
                }
            }
            // Protocol V02 input names (the name itself may contain "IN").
            const inputName = /^IS(\d+)IN(.*)$/.exec(Response);
            if (inputName) {
                const InputNumber = Number(inputName[1]);
                if (InputNumber > this.InputNameArray.length)
                    throw new Error('Input name arrived without a valid input count');
                let Name = inputName[2];
                if (this.ReceiverModel === AnthemReceiverModel.MRXSLM) {
                    if (!/^(?:[0-9a-fA-F]{2})*$/.test(Name))
                        throw new Error('Invalid SLM input name encoding');
                    Name = Buffer.from(Name, 'hex').toString('utf8');
                }
                if (!Number.isInteger(InputNumber) || InputNumber < 1 || InputNumber > this.InputNameArray.length)
                    throw new Error('Invalid input-name identifier');
                this.InputNameArray[InputNumber - 1] = Name;
                if (this.CurrentState === ControllerState.Operation && this.IsAllInputConfigured() && this.GetInputHasChange()) {
                    this.InputNameArrayOld = [...this.InputNameArray];
                    this.emit('InputChange', this.InputNameArray);
                }
            }
            // Get input name from older device function
            if (Response.substring(0, 3) === 'ISN') {
                const InputNumber = Number(Response.substring(3, 5));
                const Name = Response.substring(5, Response.length);
                if (!Number.isInteger(InputNumber) || InputNumber < 1 || InputNumber > this.InputNameArray.length)
                    throw new Error('Invalid input-name identifier');
                this.InputNameArray[InputNumber - 1] = Name;
                if (this.CurrentState === ControllerState.Operation) {
                    if (this.IsAllInputConfigured()) {
                        if (this.GetInputHasChange()) {
                            this.emit('InputChange', this.InputNameArray);
                        }
                    }
                }
            }
            // Get new active input
            for (const ZoneNumber in this.Zones) {
                const Zone = this.Zones[ZoneNumber];
                if (Response.substring(0, 5) === ('Z' + ZoneNumber + 'INP')) {
                    Zone.SetActiveInput(Number(Response.substring(5, Response.length)));
                    this.GetDolbyPostProcessing(Number(ZoneNumber));
                    if (Zone.GetIsMainZone()) {
                        this.GetZoneARCEnabled(Number(ZoneNumber));
                    }
                    if (this.CurrentState === ControllerState.Operation) {
                        this.emit('ZoneInputChange', Number(ZoneNumber), Zone.GetActiveInput());
                    }
                }
            }
            // Get Config Menu Sate
            if (Response.substring(0, 5) === 'Z1SMD') {
                this.ConfigMenuDisplayVisible = Response[5] === '1';
            }
            // Get Main Zone ARC Configured
            if (Response.substring(0, 8) === 'Z1ARCVAL') {
                const MainZoneARCConfigured = (Response[8] === '1');
                for (const ZoneNumber in this.Zones) {
                    const Zone = this.Zones[ZoneNumber];
                    if (Zone.GetIsMainZone()) {
                        Zone.SetARCConfigured(MainZoneARCConfigured);
                    }
                }
            }
            // Get Main Zone ARC Enabled ProtocolV02
            for (const ZoneNumber in this.Zones) {
                const Zone = this.Zones[ZoneNumber];
                if (Zone.GetIsMainZone() && this.IsProtocolV02()) {
                    const arc = /^IS(\d+)ARC([01])$/.exec(Response);
                    if (arc && Number(arc[1]) === Zone.GetActiveInput()) {
                        const ARCEnabled = arc[2] === '1';
                        Zone.SetActiveInputARCEnabled(ARCEnabled);
                        this.emit('ZoneARCEnabledChange', Number(ZoneNumber), ARCEnabled);
                        break;
                    }
                }
            }
            // Get Zone ARC Enabled ProtocolV01
            for (const ZoneNumber in this.Zones) {
                const Zone = this.Zones[ZoneNumber];
                if (new RegExp('^Z' + ZoneNumber + 'ARC[01]$').test(Response)) {
                    const ARCEnabled = Response[5] === '1';
                    Zone.SetActiveInputARCEnabled(ARCEnabled);
                    this.emit('ZoneARCEnabledChange', Number(ZoneNumber), ARCEnabled);
                    break;
                }
            }
            // Error management
            if (Response.substring(0, 2) === '!E') {
                // Valid command, but cannot be executed
                this.emit('ControllerError', AnthemControllerError.CANNOT_EXECUTE_COMMAND, ': ' + Response.substring(2, Response.length));
            }
            // Error management
            if (Response.substring(0, 2) === '!R') {
                // Out of range parameter
                this.emit('ControllerError', AnthemControllerError.OUT_OF_RANGE_PARAMETER, ': ' + Response.substring(2, Response.length));
            }
            // Error management
            if (Response.substring(0, 2) === '!I') {
                // Invalid command
                this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND, ': ' + Response.substring(2, Response.length));
            }
            // Error management
            if (Response.substring(0, 2) === '!Z') {
                // Invalid command
                this.emit('ControllerError', AnthemControllerError.ZONE_IS_NOT_POWERED, ': ' + Response.substring(2, Response.length));
            }
            // Check if all information has been received to become ready for operation
            if (this.CurrentState === ControllerState.Configure) {
                if (this.ReceiverModel !== AnthemReceiverModel.Undefined
                    && this.SoftwareVersion !== ''
                    && this.SerialNumber !== ''
                    && this.IsAllZoneConfigured()) {
                    // Panel is configured, now ready for operation
                    this.CurrentState = ControllerState.Operation;
                    clearTimeout(this.HandshakeTimer);
                    this.StableTimer = setTimeout(() => { this.RetryAttempt = 0; }, 60000);
                    this.StableTimer.unref();
                    this.emit('ControllerReadyForOperation');
                    this.PublishSnapshot();
                    // Start keep alice process (GetModel)
                    this.SendKeepAlivePacket();
                }
            }
        }
    }
}
exports.AnthemController = AnthemController;
//# sourceMappingURL=AnthemController.js.map