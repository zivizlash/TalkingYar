import { Client, GatewayIntentBits, Events } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TalkingYarBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.audioPlayer = createAudioPlayer();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on(Events.ClientReady, this.onReady.bind(this));
    this.client.on(Events.MessageCreate, this.onMessageCreate.bind(this));

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      if (this.connection) {
        this.connection.destroy();
        this.connection = null;
      }
    });

    this.audioPlayer.on("error", (error) => {
      console.error("Ошибка аудио плеера:", error);
    });

  }
  onReady() {
    console.log(`✅ Бот авторизован как ${this.client.user.tag}`);
    console.log(`🔑 ID сервера: ${process.env.DISCORD_GUILD_ID}`);
    console.log(`📢 Канал: ${process.env.DISCORD_CHANNEL_ID}`);

    this.autoPlay();
  }

  async onMessageCreate(message) {
    if (message.author.bot) return;

    console.log(message.channel.toJSON());

    // check for voice_channel
    if (message.channel.type !== 2) {

    }

    if (message.content.toLowerCase() === "play the funky tune.") {
      await this.handlePlayCommand(message);
    }
  }

  async autoPlay() {

    const channel = await this.client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

    this.connection = joinVoiceChannel({
        channelId: process.env.DISCORD_CHANNEL_ID,
        guildId: process.env.DISCORD_GUILD_ID,
        selfMute: false,
        selfDeaf: true,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

    this.connection.subscribe(this.audioPlayer);

    const audioPath = path.join(__dirname, "test.mp3");
    const resource = createAudioResource(audioPath);

    this.audioPlayer.play(resource);

    console.log("🎵 Воспроизведение началось...");
  }

  async handlePlayCommand(message) {
    if (!message.member?.voice?.channel) {
      return message.reply("❌ Вы должны находиться в голосовом канале!");
    }

    if (message.guild.members.me.voice.channel) {
      return message.reply("⚠️ Я уже воспроизвожу аудио!");
    }

    try {
      this.connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      this.connection.subscribe(this.audioPlayer);

      const audioPath = path.join(__dirname, "test.mp3");
      const resource = createAudioResource(audioPath);

      this.audioPlayer.play(resource);

      await message.reply("🎵 Воспроизведение началось...");
    } catch (error) {
      console.error("Ошибка при подключении к каналу:", error);
      await message.reply("❌ Произошла ошибка при подключении к голосовому каналу");

      if (this.connection) {
        this.connection.destroy();
        this.connection = null;
      }
    }
  }

  async start() {
    try {
      await this.client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
      console.error("❌ Не удалось авторизоваться:", error.message);
      process.exit(1);
    }
  }
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("Uncaught promise rejection:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

const bot = new TalkingYarBot();
bot.start();
