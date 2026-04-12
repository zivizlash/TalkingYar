import { Client, GatewayIntentBits, Events } from "discord.js";
import { SessionManager } from "./session.js";

class TalkingYarBot {
  client: Client;
  sessionManager: SessionManager;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.sessionManager = new SessionManager();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on(Events.ClientReady, this.onReady.bind(this));
    this.client.on(Events.MessageCreate, this.onMessageCreate.bind(this));
    this.client.on(Events.VoiceStateUpdate, this.onVoiceStateUpdate.bind(this));
  }

  onReady() {
    console.log(`✅ Бот авторизован как ${this.client.user!.tag}`);
  }

  async onMessageCreate(message) {
    if (message.author.bot) return;

    // Проверяем, находится ли пользователь в голосовом канале
    if (message.member?.voice?.channel) {
      await this.processVoiceMessage(message);
    }

  }

  async onVoiceStateUpdate(oldState, newState) {
    // Обработка отключения бота от голосового канала
    if (oldState.channelId && !newState.channelId) {
      const guildId = oldState.guild.id;
      const session = this.sessionManager.getSession(guildId);

      if (session && oldState.member.id === this.client.user?.id) {
        // Бот был отключен
        console.log(`Бот отключен от голосового канала на сервере ${guildId}`);
      }
    }
  }

  async processVoiceMessage(message) {
    try {
      const guildId = message.guild.id;
      const session = this.sessionManager.getOrCreateSession(guildId);

      // Если бот не подключен к голосовому каналу, подключаем
      if (!session.isConnected()) {
        const channelId = message.member.voice.channel.id;
        await session.connect(channelId, message.guild);
      }

      // Добавляем сообщение в очередь сессии
      await session.enqueue(message.content);
    } catch (error) {
      console.error("Ошибка обработки голосового сообщения:", error);
      await message.reply("❌ Произошла ошибка при обработке вашего сообщения");
    }
  }

  async start() {
    try {
      await this.client.login(process.env.DISCORD_TOKEN);
    } catch (error: any) {
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

main();