import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayer,
  AudioPlayerStatus,
  VoiceConnection,
} from "@discordjs/voice";
import SpeechSynthesizer from "./speechSynthesizer";

/**
 * Интерфейс для элемента очереди воспроизведения
 */
interface QueueItem {
  /** Текст для синтеза речи */
  text: string;
  /** Путь к аудио файлу (результат синтеза) */
  audioPath: string | null;
  /** Статус элемента в очереди */
  status: "pending" | "playing" | "completed" | "failed";
}

/**
 * Класс Session представляет сессию для конкретного guild (сервера Discord).
 * Хранит все данные о голосовом канале, очереди воспроизведения и состоянии.
 */
class Session {
  /** ID сервера (guild) */
  guildId: string;

  /** Подключение к голосовому каналу */
  voiceConnection: VoiceConnection | null;

  /** Аудио плеер для воспроизведения */
  audioPlayer: AudioPlayer;

  /** Синтезатор речи */
  speechSynthesizer: SpeechSynthesizer;

  /** Очередь элементов для воспроизведения */
  queue: QueueItem[];

  /** Флаг, указывающий идет ли сейчас воспроизведение */
  isPlaying: boolean;

  /** ID голосового канала, к которому подключен бот */
  channelId: string | null;

  /**
   * Создает новую сессию для указанного guild
   * @param guildId - ID сервера Discord
   * @param speechSynthesizer - экземпляр синтезатора речи
   */
  constructor(guildId: string, speechSynthesizer: SpeechSynthesizer) {
    this.guildId = guildId;
    this.voiceConnection = null;
    this.audioPlayer = createAudioPlayer();
    this.speechSynthesizer = speechSynthesizer;
    this.queue = [];
    this.isPlaying = false;
    this.channelId = null;

    // Подписываемся на события аудио плеера
    this.setupAudioPlayerEvents();
  }

  /**
   * Настраивает обработчики событий аудио плеера и состояния аудио подключения
   */
  private setupAudioPlayerEvents() {
    this.audioPlayer.on("error", (error) => {
      console.error(`Ошибка воспроизведения в guild ${this.guildId}:`, error);
      this.processNextInQueue();
    });

    // Отслеживаем событие Playing когда начинается воспроизведение
    this.audioPlayer.on(AudioPlayerStatus.Playing, () => {
      console.log(`Воспроизведение запущено в guild ${this.guildId}`);
    });

    // Слушаем завершение воспроизведения через AudioPlayerStatus.Idle event
    // Когда трек заканчивается, событие Idle срабатывает и вызывается onTrackFinished()
    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      console.log(`Трек завершен в guild ${this.guildId}, обработка следующей очереди`);
      this.onTrackFinished();
    });
  }

  /**
   * Обработчик завершения воспроизведения текущего трека
   */
  private onTrackFinished() {
    // Помечаем текущий элемент как завершенный
    if (this.queue.length > 0 && this.queue[0].status === "playing") {
      this.queue[0].status = "completed";
    }

    this.isPlaying = false;
    this.processNextInQueue();
  }

    /**
     * Обрабатывает следующий элемент в очереди
     */
    private async processNextInQueue() {
      // Если уже идет воспроизведение или очередь пуста, выходим
      if (this.isPlaying || this.queue.length === 0) {
        return;
      }

      // Удаляем завершенные и неуспешные элементы из начала очереди
      while (this.queue.length > 0) {
        const item = this.queue[0];
        if (item.status === "completed" || item.status === "failed") {
          this.queue.shift();
        } else if (item.audioPath !== null) {
          // Успешно синтезированный, но ещё не воспроизведённый элемент
          break;
        } else {
          // pending или playing
          break;
        }
      }

      // Если очередь пуста после удаления завершенных и неуспешных, выходим
      if (this.queue.length === 0) {
        return;
      }

      // Получаем следующий элемент
      const nextItem = this.queue[0];

      // Если элемент еще не синтезирован или ещё не воспроизведён, пробуем синтезировать/воспроизвести
      if (nextItem.audioPath === null) {
        try {
          // Синтезируем речь с ретрайми (3 попытки)
          const result = await this.speechSynthesizer.generateWithRetries(nextItem.text);

          if (result && result[0] && result[0].path) {
            // Сохраняем путь к файлу для воспроизведения
            nextItem.audioPath = result[0].path;
            
            // Помечаем как воспроизводящийся и запускаем
            nextItem.status = "playing";
            this.isPlaying = true;

            // Воспроизводим
            await this.playAudioFile(result[0].path);
          } else {
            // Синтез неудачен - помечаем как неудачный и удаляем из начала очереди
            nextItem.status = "failed";
            console.error(`Не удалось получить аудио для текста: ${nextItem.text.substring(0, 30)}...`);
            this.processNextInQueue(); // Перезапускаем цикл очистки очереди
          }
        } catch (error: any) {
          console.error(`Ошибка обработки очереди в guild ${this.guildId}:`, error.message);
          nextItem.status = "failed";
          this.processNextInQueue(); // Перезапускаем цикл очистки очереди
        }
      } else if (nextItem.audioPath !== null && nextItem.status === "playing") {
        // Элемент уже синтезирован и помечен как воспроизводящийся, ждём Idle событие
      } else if (nextItem.audioPath !== null && nextItem.status === "pending") {
        // Успешно синтезированный элемент в pending статусе - начинаем воспроизведение
        try {
          nextItem.status = "playing";
          this.isPlaying = true;
          await this.playAudioFile(nextItem.audioPath);
        } catch (error: any) {
          console.error(`Ошибка воспроизведения:`, error.message);
          nextItem.status = "failed";
          this.processNextInQueue(); // Перезапускаем цикл очистки очереди
        }
      }
    }

  /**
   * Воспроизводит аудио файл по указанному пути
   * @param filePath - путь к аудио файлу
   */
  private async playAudioFile(filePath: string) {
    if (!this.voiceConnection) {
      console.error("Нет подключения к голосовому каналу");
      this.processNextInQueue();
      return;
    }

    const resource = createAudioResource(filePath);

    this.audioPlayer.play(resource);
  }

  /**
   * Подключает бота к голосовому каналу
   * @param channelId - ID голосового канала
   * @param guild - объект guild для получения voiceAdapterCreator
   */
  async connect(channelId: string, guild: any): Promise<void> {
    try {
      this.voiceConnection = joinVoiceChannel({
        channelId,
        guildId: this.guildId,
        selfMute: false,
        selfDeaf: true,
        adapterCreator: guild.voiceAdapterCreator,
      });

      this.voiceConnection.subscribe(this.audioPlayer);
      this.channelId = channelId;

      console.log(`Бот подключен к голосовому каналу ${channelId} на сервере ${this.guildId}`);
    } catch (error) {
      throw new Error(`Не удалось подключиться к голосовому каналу: ${error}`);
    }
  }

  /**
   * Отключает бота от голосового канала
   */
  disconnect(): void {
    if (this.voiceConnection) {
      this.voiceConnection.destroy();
      this.voiceConnection = null;
      this.channelId = null;
      console.log(`Бот отключен от голосового канала на сервере ${this.guildId}`);
    }
  }

  /**
   * Добавляет текст в очередь воспроизведения
   * @param text - текст для синтеза и воспроизведения
   */
  async enqueue(text: string): Promise<void> {
    const queueItem: QueueItem = {
      text,
      audioPath: null,
      status: "pending",
    };

    this.queue.push(queueItem);
    console.log(`Добавлено в очередь guild ${this.guildId}: "${text}" (в очереди: ${this.queue.length})`);

    // Если ничего не воспроизводится, запускаем обработку очереди
    if (!this.isPlaying) {
      this.processNextInQueue();
    }
  }

  /**
   * Очищает очередь воспроизведения
   */
  clearQueue(): void {
    this.queue = [];
    console.log(`Очередь очищена для guild ${this.guildId}`);
  }

  /**
   * Возвращает текущий размер очереди
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Проверяет, подключен ли бот к голосовому каналу
   */
  isConnected(): boolean {
    return this.voiceConnection !== null && this.channelId !== null;
  }

  /**
   * Проверяет, идет ли воспроизведение
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
}

/**
 * Менеджер сессий - хранит все сессии в in-memory Map
 * Ключ - guildId, значение - экземпляр Session
 */
class SessionManager {
  /** Map хранящий все сессии, ключ - guildId */
  sessions: Map<string, Session>;

  /** Синтезатор речи (общий для всех сессий) */
  speechSynthesizer: SpeechSynthesizer;

  constructor() {
    this.sessions = new Map();
    this.speechSynthesizer = new SpeechSynthesizer();
  }

  /**
   * Получает или создает сессию для указанного guild
   * @param guildId - ID сервера Discord
   * @returns существующая или новая сессия
   */
  getOrCreateSession(guildId: string): Session {
    let session = this.sessions.get(guildId);

    if (!session) {
      session = new Session(guildId, this.speechSynthesizer);
      this.sessions.set(guildId, session);
      console.log(`Создана новая сессия для guild ${guildId}`);
    }

    return session;
  }

  /**
   * Получает сессию по guildId
   * @param guildId - ID сервера Discord
   * @returns сессия или undefined если не найдена
   */
  getSession(guildId: string): Session | undefined {
    return this.sessions.get(guildId);
  }

  /**
   * Удаляет сессию для указанного guild
   * @param guildId - ID сервера Discord
   */
  removeSession(guildId: string): void {
    const session = this.sessions.get(guildId);
    if (session) {
      session.disconnect();
      session.clearQueue();
      this.sessions.delete(guildId);
      console.log(`Удалена сессия для guild ${guildId}`);
    }
  }

  /**
   * Проверяет, существует ли сессия для указанного guild
   * @param guildId - ID сервера Discord
   */
  hasSession(guildId: string): boolean {
    return this.sessions.has(guildId);
  }

  /**
   * Возвращает количество активных сессий
   */
  getSessionCount(): number {
    return this.sessions.size;
  }
}

export default Session;
export { SessionManager, type QueueItem };