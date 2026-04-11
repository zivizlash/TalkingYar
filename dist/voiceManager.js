import { joinVoiceChannel, createAudioPlayer, createAudioResource } from "@discordjs/voice";
class VoiceManager {
    audioPlayer;
    connections;
    constructor() {
        this.audioPlayer = createAudioPlayer();
        this.connections = new Map();
    }
    async connectToVoiceChannel(guildId, channelId, guild) {
        try {
            const connection = joinVoiceChannel({
                channelId,
                guildId,
                selfMute: false,
                selfDeaf: true,
                adapterCreator: guild.voiceAdapterCreator,
            });
            connection.subscribe(this.audioPlayer);
            this.connections.set(guildId, connection);
            return connection;
        }
        catch (error) {
            throw new Error(`Failed to connect to voice channel: ${error.message}`);
        }
    }
    async disconnectFromVoiceChannel(guildId) {
        const connection = this.connections.get(guildId);
        if (connection) {
            connection.destroy();
            this.connections.delete(guildId);
        }
    }
    async playAudio(guildId, audioBuffer) {
        try {
            const resource = createAudioResource(audioBuffer, {
                inputType: "converted",
            });
            this.audioPlayer.play(resource);
            return new Promise((resolve, reject) => {
                const cleanup = () => {
                    this.audioPlayer.off("error", onError);
                    this.audioPlayer.off("idle", onIdle);
                };
                const onError = (error) => {
                    cleanup();
                    reject(error);
                };
                const onIdle = () => {
                    cleanup();
                    resolve();
                };
                this.audioPlayer.on("error", onError);
                this.audioPlayer.on("idle", onIdle);
            });
        }
        catch (error) {
            throw new Error(`Failed to play audio: ${error.message}`);
        }
    }
    isConnected(guildId) {
        return this.connections.has(guildId);
    }
}
export default VoiceManager;
//# sourceMappingURL=voiceManager.js.map