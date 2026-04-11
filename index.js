import { Client, GatewayIntentBits, Events } from "discord.js";
import VoiceQueue from "./voiceQueue.js";
import SpeechSynthesizer from "./speechSynthesizer.js";
import VoiceManager from "./voiceManager.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  AudioPlayer,
} from "@discordjs/voice";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Session { 
  constructor(guildId) {
    this.guildId = guildId;
  }

  async processMessage(message) {

  }
}

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

    this.voiceQueue = new VoiceQueue();
    this.speechSynthesizer = new SpeechSynthesizer();
    this.voiceManager = new VoiceManager();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on(Events.ClientReady, this.onReady.bind(this));
    this.client.on(Events.MessageCreate, this.onMessageCreate.bind(this));

    this.voiceManager.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      if (this.voiceManager.connections.size > 0) {
        const guildId = Array.from(this.voiceManager.connections.keys())[0];
        this.voiceManager.disconnectFromVoiceChannel(guildId);
      }
    });

    this.voiceManager.audioPlayer.on("error", (error) => {
      console.error("Ошибка аудио плеера VoiceManager:", error);
    });
  }
  
  onReady() {
    console.log(`✅ Бот авторизован как ${this.client.user.tag}`);
    console.log(`🔑 ID сервера: ${process.env.DISCORD_GUILD_ID}`);
    console.log(`📢 Канал: ${process.env.DISCORD_CHANNEL_ID}`);
  }

  async onMessageCreate(message) {
    if (message.author.bot) return;

    if (message.channel.type === 2) {
      await this.processVoiceMessage(message);
    }

    if (message.content.toLowerCase() === "play the funky tune.") {
      await this.handlePlayCommand(message);
    }
  }

  async processVoiceMessage(message) {
    try {
      await this.voiceQueue.enqueueMessage(message.guild.id, message.content);
      await this.processQueue(message.guild.id);
    } catch (error) {
      console.error("Ошибка обработки голосового сообщения:", error);
      await message.reply("❌ Произошла ошибка при обработке вашего сообщения");
    }
  }

  async processQueue(guildId) {
    if (await this.voiceQueue.isEmpty(guildId)) {
      return;
    }

    if (!this.voiceManager.isConnected(guildId)) {
      const channel = await this.client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
      await this.voiceManager.connectToVoiceChannel(guildId, channel.id, channel.guild);
    }

    const message = await this.voiceQueue.dequeueMessage(guildId);
    if (message) {
      try {
        const audioBuffer = await this.speechSynthesizer.synthesizeSpeech(message);
        await this.voiceManager.playAudio(guildId, audioBuffer);
        await this.processQueue(guildId);
      } catch (error) {
        console.error("Ошибка воспроизведения сообщения:", error);
        await this.processQueue(guildId);
      }
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

const main = () => {  
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Uncaught promise rejection:", promise, "reason:", reason);
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    process.exit(1);
  });

  const bot = new TalkingYarBot();
  bot.start();
};

const test = () => {
  const speechSynthesizer = new SpeechSynthesizer();
  speechSynthesizer.generate('Всем привет! Я из Воронежа!')
};

test();
