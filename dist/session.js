import { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus, } from "@discordjs/voice";
import { SpeechSynthesizer } from "./speechSynthesizer.js";
/**
 * Класс Session представляет сессию для конкретного guild (сервера Discord).
 * Хранит все данные о голосовом канале, очереди воспроизведения и состоянии.
 */
class Session {
    /** ID сервера (guild) */
    guildId;
    /** Подключение к голосовому каналу */
    voiceConnection;
    /** Аудио плеер для воспроизведения */
    audioPlayer;
    /** Синтезатор речи */
    speechSynthesizer;
    /** Очередь элементов для воспроизведения */
    queue;
    /** Флаг, указывающий идет ли сейчас воспроизведение */
    isPlaying;
    /** ID голосового канала, к которому подключен бот */
    channelId;
    /**
     * Создает новую сессию для указанного guild
     * @param guildId - ID сервера Discord
     * @param speechSynthesizer - экземпляр синтезатора речи
     */
    constructor(guildId, speechSynthesizer) {
        this.guildId = guildId;
        this.voiceConnection = null;
        this.audioPlayer = createAudioPlayer();
        this.speechSynthesizer = speechSynthesizer;
        this.queue = [];
        this.isPlaying = false;
        this.channelId = null;
        if (speechSynthesizer) {
            this.speechSynthesizer = speechSynthesizer;
        }
        else {
            this.speechSynthesizer = null;
        }
        // Подписываемся на события аудио плеера
        this.setupAudioPlayerEvents();
    }
    /**
     * Настраивает обработчики событий аудио плеера и состояния аудио подключения
     */
    setupAudioPlayerEvents() {
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
    onTrackFinished() {
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
    async processNextInQueue() {
        // Если уже идет воспроизведение или очередь пуста, выходим
        if (this.isPlaying || this.queue.length === 0) {
            return;
        }
        // Удаляем завершенные и неуспешные элементы из начала очереди
        while (this.queue.length > 0) {
            const item = this.queue[0];
            if (item.status === "completed" || item.status === "failed") {
                this.queue.shift();
            }
            else if (item.audioResource !== null) {
                // Успешно синтезированный, но ещё не воспроизведённый элемент
                break;
            }
            else {
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
        // Если элемент еще не синтезирован, пробуем синтезировать/воспроизвести
        if (nextItem.audioResource === null && this.speechSynthesizer) {
            try {
                // Синтезируем речь с ретрайми (3 попытки)
                const audioResource = await this.speechSynthesizer.generateWithRetries(nextItem.text);
                if (audioResource) {
                    // Сохраняем AudioResource для воспроизведения
                    nextItem.audioResource = audioResource;
                    // Помечаем как воспроизводящийся и запускаем
                    nextItem.status = "playing";
                    this.isPlaying = true;
                    // Воспроизводим
                    await this.playAudioResource(audioResource);
                }
                else {
                    // Синтез неудачен - помечаем как неудачный и удаляем из начала очереди
                    nextItem.status = "failed";
                    console.error(`Не удалось синтезировать речь для текста: ${nextItem.text.substring(0, 30)}...`);
                    this.processNextInQueue(); // Перезапускаем цикл очистки очереди
                }
            }
            catch (error) {
                console.error(`Ошибка обработки очереди в guild ${this.guildId}:`, error.message);
                nextItem.status = "failed";
                this.processNextInQueue(); // Перезапускаем цикл очистки очереди
            }
        }
        else if (nextItem.audioResource !== null && nextItem.status === "playing") {
            // Элемент уже синтезирован и помечен как воспроизводящийся, ждём Idle событие
        }
        else if (nextItem.audioResource !== null && nextItem.status === "pending") {
            // Успешно синтезированный элемент в pending статусе - начинаем воспроизведение
            try {
                nextItem.status = "playing";
                this.isPlaying = true;
                await this.playAudioResource(nextItem.audioResource);
            }
            catch (error) {
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
    async playAudioResource(audioResource) {
        if (!this.voiceConnection) {
            console.error("Нет подключения к голосовому каналу");
            this.processNextInQueue();
            return;
        }
        this.audioPlayer.play(audioResource);
    }
    /**
     * Подключает бота к голосовому каналу
     * @param channelId - ID голосового канала
     * @param guild - объект guild для получения voiceAdapterCreator
     */
    async connect(channelId, guild) {
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
        }
        catch (error) {
            throw new Error(`Не удалось подключиться к голосовому каналу: ${error}`);
        }
    }
    /**
     * Отключает бота от голосового канала
     */
    disconnect() {
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
    async enqueue(text) {
        if (!this.speechSynthesizer) {
            console.warn(`Session для guild ${this.guildId}: синтезатор речи не инициализирован`);
            return;
        }
        const queueItem = {
            text,
            audioResource: null,
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
    clearQueue() {
        this.queue = [];
        console.log(`Очередь очищена для guild ${this.guildId}`);
    }
    /**
     * Возвращает текущий размер очереди
     */
    getQueueLength() {
        return this.queue.length;
    }
    /**
     * Проверяет, подключен ли бот к голосовому каналу
     */
    isConnected() {
        return this.voiceConnection !== null && this.channelId !== null;
    }
    /**
     * Проверяет, идет ли воспроизведение
     */
    isCurrentlyPlaying() {
        return this.isPlaying;
    }
}
/**
 * Менеджер сессий - хранит все сессии в in-memory Map
 * Ключ - guildId, значение - экземпляр Session
 */
class SessionManager {
    /** Map хранящий все сессии, ключ - guildId */
    sessions;
    /** Синтезатор речи (общий для всех сессий) */
    speechSynthesizer;
    constructor() {
        this.sessions = new Map();
        this.speechSynthesizer = new SpeechSynthesizer();
        console.log("SessionManager инициализирован с REST API");
    }
    /**
     * Получает или создает сессию для указанного guild
     * @param guildId - ID сервера Discord
     * @returns существующая или новая сессия
     */
    getOrCreateSession(guildId) {
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
    getSession(guildId) {
        return this.sessions.get(guildId);
    }
    /**
     * Удаляет сессию для указанного guild
     * @param guildId - ID сервера Discord
     */
    removeSession(guildId) {
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
    hasSession(guildId) {
        return this.sessions.has(guildId);
    }
    /**
     * Возвращает количество активных сессий
     */
    getSessionCount() {
        return this.sessions.size;
    }
}
export default Session;
export { SessionManager, SpeechSynthesizer };
//# sourceMappingURL=session.js.map