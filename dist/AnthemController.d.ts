import { EventEmitter } from 'node:events';
export interface AnthemControllerEvent {
    'ControllerReadyForOperation': () => void;
    'ModelDetected': (model: AnthemReceiverModel) => void;
    'ControllerUnavailable': () => void;
    'PanelBrightnessChange': (Brightness: number) => void;
    'ZonePowerChange': (Zone: number, Power: boolean) => void;
    'ZoneMutedChange': (Zone: number, Muted: boolean) => void;
    'ZoneALMChange': (Zone: number, ALM: number) => void;
    'ZoneDolbyPostProcessingChange': (Zone: number, DolbyAudioMode: AnthemDolbyAudioPostProcessing) => void;
    'ZoneVolumePercentageChange': (Zone: number, VolumePercentage: number) => void;
    'ZoneARCEnabledChange': (Zone: number, ARCEnabled: boolean) => void;
    'ZoneInputChange': (Zone: number, Input: number) => void;
    'InputChange': (InputArray: string[]) => void;
    'ControllerError': (Error: AnthemControllerError, ErrorString: string) => void;
    'ShowDebugInfo': (DebugString: string) => void;
}
export declare enum AnthemReceiverModel {
    Undefined = "",
    MRX310 = "MRX 310",
    MRX510 = "MRX 510",
    MRX710 = "MRX 710",
    MRX520 = "MRX 520",
    MRX720 = "MRX 720",
    MRX1120 = "MRX 1120",
    MRX540 = "MRX 540",
    MRX740 = "MRX 740",
    MRX1140 = "MRX 1140",
    MRXSLM = "MRX SLM",
    AVM60 = "AVM 60",
    AVM70 = "AVM 70",
    AVM90 = "AVM 90",
    STRPA = "STR PA",
    STRIA = "STR IA"
}
export declare enum AnthemAudioListeningMode {
    NONE = 0,
    ANTHEMLOGIC_CINEMA = 1,
    ANTHEMLOGIC_MUSIC = 2,
    DOLBYSUROUND = 3,
    DTSNEURALX = 4,
    DTSVIRTUALX = 5,
    ALLCHANNELSTEREO = 6,
    MONO = 7,
    ALLCHANNELMONO = 8
}
export declare enum AnthemDolbyAudioPostProcessing {
    OFF = 0,
    MOVIE = 1,
    MUSIC = 2,
    NIGHT = 3
}
export declare enum AnthemControllerError {
    CONNECTION_ERROR = "Controller Connection Error",
    ZONE_IS_NOT_POWERED = "Zone is not powered",
    COMMAND_NOT_SUPPORTED = "Command is not supported by receiver",
    RECEIVER_NOT_READY = "Receiver not ready for operation",
    INVALID_MODEL_STRING_RECEIVED = "Received and invalid model string from receiver",
    CANNOT_EXECUTE_COMMAND = "Received a valid command that cannot be executed",
    OUT_OF_RANGE_PARAMETER = "Controller received an out of range paramenter",
    INVALID_COMMAND = "Invalid command reveived",
    COMMAND_ONLY_AVAILABLE_ON_MAIN_ZONE = "Command only available on main zone"
}
export declare enum AnthemKeyCode {
    UP = "0018",
    DOWN = "0019",
    LEFT = "0020",
    RIGHT = "0021",
    SELECT = "0022"
}
export declare class AnthemZone {
    ZoneNumber: number;
    private IsMainZone;
    private IsMuted;
    private ARCConfigured;
    private ActiveInput;
    private ActiveInputARCEnabled;
    private IsPowered;
    private PowerConfigured;
    private MutedConfigured;
    private InputConfigured;
    private VolumeConfigured;
    private VolumePercentage;
    private Volume;
    private AudioListeningMode;
    ZoneName: string;
    constructor(ZoneNumber: number, ZoneName: string, IsMainZone: boolean);
    GetIsMuted(): boolean;
    SetIsMuted(Muted: boolean): void;
    GetIsPowered(): boolean;
    SetIsPowered(Powered: boolean): void;
    GetIsMainZone(): boolean;
    GetActiveInput(): number;
    SetActiveInput(ActiveInput: number): void;
    GetARCConfigured(): boolean;
    SetARCConfigured(ARCConfigured: boolean): void;
    GetActiveInputARCEnabled(): boolean;
    SetActiveInputARCEnabled(ARCEnabled: boolean): void;
    GetVolumePercentage(): number;
    GetVolume(): number;
    SetVolumePercentage(VolumePercentage: number): void;
    SetVolume(Volume: number): void;
    IsZoneConfigured(): boolean;
    Reset(): void;
    SetALM(AudioListeningMode: number): void;
    GetALM(): number;
}
export declare class AnthemController extends EventEmitter {
    private readonly Timing;
    private Host;
    private Port;
    private Client;
    private CurrentState;
    private CommandArray;
    private InputNameArray;
    private InputNameArrayOld;
    private Zones;
    private ConfigMenuDisplayVisible;
    PanelBrightness: number;
    private SocketTimeout;
    private MaxVolumeDb;
    private UseHomeKitDbVolumeMapping;
    SerialNumber: string;
    SoftwareVersion: string;
    ReceiverModel: AnthemReceiverModel;
    private readonly Framer;
    private Stopped;
    private ConnectionFailed;
    private Connected;
    private RetryAttempt;
    private ReconnectTimer?;
    private HandshakeTimer?;
    private KeepAliveTimer?;
    private StableTimer?;
    private CapturedCommands?;
    private readonly Transactions;
    constructor(Timing?: {
        connect: number;
        handshake: number;
        idle: number;
        keepalive: number;
        reconnect: number;
        maxReconnect: number;
        command: number;
    });
    private Clamp;
    private GetReceiverDbFromPercent;
    private GetHomeKitVolumeFromDb;
    private GetDbFromHomeKitVolume;
    SetMaxVolumeDB(MaxVolumeDb: number | undefined): void;
    Connect(Host: string, Port: number): void;
    private OpenConnection;
    private ClearTimers;
    private Disconnect;
    Stop(): void;
    IsReady(): boolean;
    RunCommand(action: () => void): Promise<void>;
    private WriteCommands;
    RemoveControllingZone(zone: number): void;
    PublishSnapshot(): void;
    AddControllingZone(NewZone: number, ZoneName: string, IsMainZone: boolean): boolean;
    GetZones(): Record<number, AnthemZone>;
    GetZone(ZoneNumber: number): AnthemZone;
    GetIsMenuDisplayVisible(): boolean;
    GetZoneName(ZoneNumber: number): string;
    GetConfiguredZoneNumber(): number;
    GetNumberOfInput(): number;
    GetInputs(): string[];
    SwitchInput(ZoneNumber: number): void;
    IsSTR(): boolean;
    GetCapabilities(): {
        family: string;
        bypass: boolean;
        model: string;
        experimental: boolean;
        protocol: number;
        zones: number;
        brightness: boolean;
        volume: boolean;
        dolby: boolean;
        directListeningMode: boolean;
        arc: boolean;
        minVolumeDb: number;
        maxVolumeDb: number;
        volumeStepDb: number;
    } | {
        model: string;
        experimental: boolean;
        protocol: number;
        zones: number;
        brightness: boolean;
        volume: boolean;
        dolby: boolean;
        directListeningMode: boolean;
        arc: boolean;
    };
    GetListeningModes(): {
        name: string;
        mode: number;
    }[];
    private GetSTRMaxVolumeDb;
    GetALMArray(): string[];
    private GetInputHasChange;
    private QueueCommand;
    private SendCommand;
    IsProtocolV01(): boolean;
    IsProtocolV02(): boolean;
    private GetModelFromReceiver;
    private SendKeepAlivePacket;
    private GetSerialNumberFromReceiver;
    private GetPanelBrightness;
    SetPanelBrightness(Brightness: number): void;
    GetMACAddress(): void;
    private GetsoftwareVersionFromReceiver;
    private GetIsZonePoweredFromReceiver;
    private GetIsZoneMutedFromReceiver;
    private GetZoneVolumeFromReceiver;
    private GetZoneVolumePercentageFromReceiver;
    SetZoneVolumePercentage(ZoneNumber: number, VolumePercentage: number): void;
    private GetNumberOfInputFromReceiver;
    private GetInputsNameFromReceiver;
    private GetZoneActiveInputFromReceiver;
    SetZoneInput(ZoneNumber: number, InputNumber: number): void;
    private GetARCConfigured;
    GetZoneARCEnabled(ZoneNumber: number): void;
    SetZoneARCEnabled(ZoneNumber: number, ARCEnabled: boolean): void;
    GetDolbyPostProcessing(ZoneNumber: number): void;
    SetDolbyPostProcessing(ZoneNumber: number, DolbyAudioMode: number): void;
    SetAudioListeningMode(ZoneNumber: number, AudioMode: number): void;
    ToggleAudioListeningMode(ZoneNumber: number, UP: boolean): void;
    GetAudioListeningMode(ZoneNumber: number): void;
    IsAllZoneConfigured(): boolean | undefined;
    IsAllInputConfigured(): boolean;
    PowerZone(ZoneNumber: number, Power: boolean): void;
    ToggleMute(ZoneNumber: number): void;
    SetMute(ZoneNumber: number, Mute: boolean): void;
    GetMute(ZoneNumber: number): boolean;
    VolumeUp(ZoneNumber: number): void;
    VolumeDown(ZoneNumber: number): void;
    ToggleConfigMenu(): void;
    GetConfigMenuState(): void;
    SendKey(ZoneNumber: number, Code: AnthemKeyCode): void;
    GetZonePower(ZoneNumber: number): boolean;
    private SetModel;
    private GetModel;
    private UpdateOnZonePower;
    private Configure;
    private AnalyseResponse;
    private ProcessResponse;
}
//# sourceMappingURL=AnthemController.d.ts.map