declare class SpeechSynthesizer {
    /**
     * Генерирует речь с ретрайми (3 попытки) при ошибках синтеза.
     * Если все попытки неудачны, возвращает null.
     * @param text - текст для синтеза
     * @returns результат синтеза или null если все попытки были неудачны
     */
    generateWithRetries(text: string): Promise<any | null>;
    /**
     * Внутренний метод для синтеза с предоставленным аудио и текстом референса
     */
    private _generateWithAudio;
    /**
     * Внутренний метод для синтеза с ретрайми и предоставленным аудио и текстом референса
     */
    private _generateWithRetries;
}
export default SpeechSynthesizer;
//# sourceMappingURL=speechSynthesizer.d.ts.map