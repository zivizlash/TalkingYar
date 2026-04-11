import { Client } from "@gradio/client";
import fs from "fs";
import { Blob } from "buffer";
let soundRef = null;
const loadVoiceEntry = (filename, name, referenceText) => {
    const bytes = fs.readFileSync(`samples/${filename}`);
    const blob = new Blob([bytes]);
    return {
        filename,
        name,
        referenceText,
        blob
    };
};
const voices = [
    loadVoiceEntry("diana_sample.wav", "диана", "Ярослав, посмотри игру, пожалуйста. Пожалуйста. Мне кажется, там прикольный кооператив, и как будто бы мы сможем даже втроём поиграть, если что вдруг, если кто-то больше не захочет. Вот."),
    loadVoiceEntry("danya_sample.wav", "даня", "Мне вообще до пизды, чел. Мне вообще похуй. Понимаешь, чел? Поебать. Похуй. В курсе, нет? Это же не я не доберусь, а вы. Ха Ха. Бля у сука"),
    loadVoiceEntry("egor_sample.wav", "егор", "Так ты, богохульник. Зачем пиво проливаешь.")
];
const getRef = () => {
    if (soundRef === null) {
        const buffer = fs.readFileSync('example.wav');
        const blob = new Blob([buffer]);
        soundRef = blob;
    }
    return soundRef;
};
/**
 * Нормализует текст: удаляет лишние пробелы, переводит в нижний регистр, добавляет точку в конце
 */
const normalizeText = (text) => {
    return text
        .replace(/\s+/g, " ") // Заменяем все подряд идущие пробелы на один
        .trim() // Убираем leading/trailing пробелы
        .toLowerCase() // Переводим в нижний регистр
        .replace(/[.,?!;:]+$/, ".") // Заменим любые знаки препинания в конце на точку
        + "."; // Добавляем точку в конце
};
/**
 * Распознаёт шаблон "{имя голоса}: текст" и извлекает имя голоса
 * Ищет первый символ ":" - если перед ним нет пробелов и после него стоит одно слово, это имя голоса
 */
const extractVoiceName = (text) => {
    const colonIndex = text.indexOf(":");
    if (colonIndex === -1) {
        // ":" не найдено
        return {
            voiceName: undefined,
            normalizedText: normalizeText(text),
        };
    }
    const prefix = text.substring(0, colonIndex);
    const afterColon = text.substring(colonIndex + 1);
    // Проверяем, что перед ":" нет пробелов (имя голоса идет сразу до двоеточия)
    if (prefix.endsWith(" ")) {
        return {
            voiceName: undefined,
            normalizedText: normalizeText(text),
        };
    }
    // Ищем первое слово после ":" - считаем его именем голоса
    const afterColonTrimmed = afterColon.trimStart();
    const firstSpaceOrDotIndex = afterColonTrimmed.indexOf(" ");
    const firstDotIndex = afterColonTrimmed.indexOf(".");
    // Определяем, где заканчивается имя голоса (до пробела или до точки)
    let voiceNameEndIndex = -1;
    if (firstSpaceOrDotIndex === -1 && firstDotIndex === -1) {
        // Нет ни пробела, ни точки - имя голоса это всё после двоеточия
        voiceNameEndIndex = afterColonTrimmed.length;
    }
    else {
        // Берём минимум из позиций пробела и точки
        const endPositions = [];
        if (firstSpaceOrDotIndex !== -1)
            endPositions.push(firstSpaceOrDotIndex);
        if (firstDotIndex !== -1)
            endPositions.push(firstDotIndex);
        if (endPositions.length > 0) {
            voiceNameEndIndex = Math.min(...endPositions);
        }
    }
    const extractedVoiceName = afterColonTrimmed.substring(0, voiceNameEndIndex).trim();
    // Проверяем, что извлечённое имя - это одно слово
    if (/^\w+$/.test(extractedVoiceName)) {
        return {
            voiceName: extractedVoiceName.toLowerCase(),
            normalizedText: normalizeText(text),
        };
    }
    return {
        voiceName: undefined,
        normalizedText: normalizeText(text),
    };
};
/**
 * Ищет голос по имени в списке voices и возвращает соответствующую пару referenceText/blob
 */
const findVoiceByname = (targetVoice) => {
    const found = voices.find((v) => v.name.toLowerCase() === targetVoice);
    return found || null;
};
class SpeechSynthesizer {
    /**
     * Генерирует речь с ретрайми (3 попытки) при ошибках синтеза.
     * Если все попытки неудачны, возвращает null.
     * @param text - текст для синтеза
     * @returns результат синтеза или null если все попытки были неудачны
     */
    async generateWithRetries(text) {
        const parsed = extractVoiceName(text);
        console.log(parsed);
        // Если найден голос по имени, используем его referenceText и blob
        if (parsed.voiceName) {
            const voice = findVoiceByname(parsed.voiceName);
            if (voice) {
                return await this._generateWithRetries(parsed.normalizedText, voice.referenceText, voice.blob);
            }
        }
        const referenceAudio = voices[0].blob;
        const referenceText = voices[0].referenceText;
        return await this._generateWithRetries(parsed.normalizedText, referenceText, referenceAudio);
    }
    /**
     * Внутренний метод для синтеза с предоставленным аудио и текстом референса
     */
    async _generateWithAudio(genText, refText, refAudio) {
        const client = await Client.connect("http://127.0.0.1:7860");
        const result = await client.predict("/synthesize", {
            ref_audio: refAudio,
            ref_text: refText,
            gen_text: genText,
            remove_silence: false,
            seed: -1,
            cross_fade_duration: 0.15,
            nfe_step: 48,
            speed: 1.0,
        });
        return result.data;
    }
    /**
     * Внутренний метод для синтеза с ретрайми и предоставленным аудио и текстом референса
     */
    async _generateWithRetries(genText, refText, refAudio) {
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const client = await Client.connect("http://127.0.0.1:7860");
                const result = await client.predict("/synthesize", {
                    ref_audio: refAudio,
                    ref_text: refText,
                    gen_text: genText,
                    remove_silence: false,
                    seed: -1,
                    cross_fade_duration: 0.15,
                    nfe_step: 48,
                    speed: 1.0,
                });
                if (result && result.data) {
                    return result.data;
                }
            }
            catch (error) {
                console.error(`Попытка ${attempt} из ${maxRetries} синтеза речи для текста "${genText.substring(0, 30)}...":`);
                // Если это ретрий и не последняя попытка, ждем перед следующей
                if (attempt < maxRetries) {
                    const waitTime = 1000 * attempt; // 1с, 2с, 3с
                    console.log(`Жду ${waitTime}ms перед следующей попыткой...`);
                    await new Promise((resolve) => setTimeout(resolve, waitTime));
                }
            }
        }
        console.warn(`Все ${maxRetries} попыток синтеза речи для текста "${genText.substring(0, 30)}..." завершены неудачно.`);
        return null;
    }
}
export default SpeechSynthesizer;
//# sourceMappingURL=speechSynthesizer.js.map