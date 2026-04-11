import { AudioPlayer } from "@discordjs/voice";
declare class VoiceManager {
    audioPlayer: AudioPlayer;
    connections: Map<string, string>;
    constructor();
    connectToVoiceChannel(guildId: any, channelId: any, guild: any): Promise<import("@discordjs/voice").VoiceConnection>;
    disconnectFromVoiceChannel(guildId: any): Promise<void>;
    playAudio(guildId: any, audioBuffer: any): Promise<unknown>;
    isConnected(guildId: any): boolean;
}
export default VoiceManager;
//# sourceMappingURL=voiceManager.d.ts.map