import { AudioPlayer, VoiceConnection } from "@discordjs/voice";
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
declare class Session {
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
    constructor(guildId: string, speechSynthesizer: SpeechSynthesizer);
    /**
     * Настраивает обработчики событий аудио плеера и состояния аудио подключения
     */
    private setupAudioPlayerEvents;
    /**
     * Обработчик завершения воспроизведения текущего трека
     */
    private onTrackFinished;
    /**
     * Обрабатывает следующий элемент в очереди
     */
    private processNextInQueue;
    /**
     * Воспроизводит аудио файл по указанному пути
     * @param filePath - путь к аудио файлу
     */
    private playAudioFile;
    /**
     * Подключает бота к голосовому каналу
     * @param channelId - ID голосового канала
     * @param guild - объект guild для получения voiceAdapterCreator
     */
    connect(channelId: string, guild: any): Promise<void>;
    /**
     * Отключает бота от голосового канала
     */
    disconnect(): void;
    /**
     * Добавляет текст в очередь воспроизведения
     * @param text - текст для синтеза и воспроизведения
     */
    enqueue(text: string): Promise<void>;
    /**
     * Очищает очередь воспроизведения
     */
    clearQueue(): void;
    /**
     * Возвращает текущий размер очереди
     */
    getQueueLength(): number;
    /**
     * Проверяет, подключен ли бот к голосовому каналу
     */
    isConnected(): boolean;
    /**
     * Проверяет, идет ли воспроизведение
     */
    isCurrentlyPlaying(): boolean;
}
/**
 * Менеджер сессий - хранит все сессии в in-memory Map
 * Ключ - guildId, значение - экземпляр Session
 */
declare class SessionManager {
    /** Map хранящий все сессии, ключ - guildId */
    sessions: Map<string, Session>;
    /** Синтезатор речи (общий для всех сессий) */
    speechSynthesizer: SpeechSynthesizer;
    constructor();
    /**
     * Получает или создает сессию для указанного guild
     * @param guildId - ID сервера Discord
     * @returns существующая или новая сессия
     */
    getOrCreateSession(guildId: string): Session;
    /**
     * Получает сессию по guildId
     * @param guildId - ID сервера Discord
     * @returns сессия или undefined если не найдена
     */
    getSession(guildId: string): Session | undefined;
    /**
     * Удаляет сессию для указанного guild
     * @param guildId - ID сервера Discord
     */
    removeSession(guildId: string): void;
    /**
     * Проверяет, существует ли сессия для указанного guild
     * @param guildId - ID сервера Discord
     */
    hasSession(guildId: string): boolean;
    /**
     * Возвращает количество активных сессий
     */
    getSessionCount(): number;
}
export default Session;
export { SessionManager, type QueueItem };
//# sourceMappingURL=session.d.ts.map