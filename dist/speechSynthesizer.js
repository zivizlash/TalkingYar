import * as fs from "fs";
import axios from "axios";
const loadVoiceEntry = (filename, name, referenceText) => ({
    filename,
    name,
    referenceText,
});
const voices = [
    loadVoiceEntry("default_sample.wav", "дефолт", "Малышка, ты выполнила задание на 5 с плюсом!"),
    loadVoiceEntry("diana_sample.wav", "диана", "Ярослав, посмотри игру, пожалуйста. Пожалуйста. Мне кажется, там прикольный кооператив, и как будто бы мы сможем даже втроём поиграть, если что вдруг, если кто-то больше не захочет. Вот."),
    loadVoiceEntry("egor_sample.wav", "егор", "Так ты богах+ульник Ты зачем пиво проливаешь?.")
];
const normalizeText = (text) => {
    return text
        .replace(/\s+/g, " ")
        .trim();
};
// Распознаёт шаблон "{имя голоса}: текст" и извлекает имя голоса
const extractVoiceName = (text) => {
    const colonIndex = text.indexOf(":");
    if (colonIndex === -1) {
        return {
            voiceName: undefined,
            normalizedText: normalizeText(text),
        };
    }
    const prefix = text.substring(0, colonIndex).trim();
    const afterColon = text.substring(colonIndex + 1);
    if (prefix.length > 0) {
        return {
            voiceName: prefix.toLowerCase(),
            normalizedText: normalizeText(afterColon),
        };
    }
    return {
        voiceName: undefined,
        normalizedText: normalizeText(text),
    };
};
class ApiHttpClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async initializeVoices() {
        for (const voice of voices) {
            try {
                const audioPath = `samples/${voice.filename}`;
                // Загружаем аудио файл и создаем formData для PUT /voice/{voice_name}
                let refAudio = null;
                if (fs.existsSync(audioPath)) {
                    refAudio = await fs.openAsBlob(audioPath);
                }
                const formData = new FormData();
                formData.append("text", voice.referenceText);
                formData.append("ref_audio", refAudio, `reference_${voice.name}.wav`);
                await axios.put(`${this.baseUrl}/voice/${voice.name}`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                console.log(`Голос "${voice.name}" инициализирован`);
            }
            catch (error) {
                const voiceName = error?.config?.url?.split('/voice/')[1]?.split('?')[0];
                console.error(`Ошибка при инициализации голоса "${voiceName || ''}":`, error.message);
            }
        }
    }
    async getVoiceMetadata(voiceName) {
        try {
            const response = await axios.get(`${this.baseUrl}/voice/${voiceName}`);
            if (response.data) {
                return response.data;
            }
            return null;
        }
        catch (error) {
            console.error(`Не удалось получить метаданные для голоса "${voiceName}":`, error);
            return null;
        }
    }
    async generateVoice(text, voiceName) {
        try {
            var formData = new FormData();
            formData.append("text", text);
            const response = await axios({
                method: "POST",
                url: `${this.baseUrl}/generate_voice/${voiceName}`,
                responseType: "blob",
                data: formData,
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            // const response = await axios.post(`${this.baseUrl}/generate_voice/${voiceName}`, 
            //   { 
            //     headers: {  },
            //     responseType: 'blob'
            //   }
            // );
            return response.data;
        }
        catch (error) {
            console.error(`Ошибка генерации речи для голоса "${voiceName}", текст: "${text.substring(0, 30)}...":`, error);
            return null;
        }
    }
}
class SpeechSynthesizer {
    voicesMap;
    constructor(baseUrl = "http://localhost:8000") {
        this.voicesMap = new Map(voices.map(v => [v.name.toLowerCase(), v]));
        console.log("Инициализация SpeechSynthesizer через REST API...");
        const client = new ApiHttpClient(baseUrl);
        client.initializeVoices().then(() => {
            console.log("Все голоса инициализированы.");
        }).catch(err => {
            console.error("Ошибка при инициализации голосов:", err);
        });
    }
    async generateWithRetries(text) {
        const parsed = extractVoiceName(text);
        if (parsed.voiceName) {
            return await this.generateVoiceWithRetry(parsed.normalizedText, parsed.voiceName);
        }
        return await this.generateVoiceWithRetry(parsed.normalizedText, "дефолт");
    }
    async generateVoiceWithRetry(genText, voiceName) {
        const httpClient = new ApiHttpClient("http://localhost:8000");
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const blob = await httpClient.generateVoice(genText, voiceName);
                if (blob && blob.size > 0) {
                    console.log(`Речь успешно синтезирована за ${attempt} попытку`);
                    // Преобразуем Blob в AudioResource и возвращаем
                    return this.createAudioResourceFromBlob(blob);
                }
            }
            catch (error) {
                console.error(`Попытка ${attempt} из ${maxRetries} синтеза речи для текста "${genText.substring(0, 30)}...":`);
                if (attempt < maxRetries) {
                    const waitTime = 1000 * attempt;
                    console.log(`Жду ${waitTime}ms перед следующей попыткой...`);
                    await new Promise((resolve) => setTimeout(resolve, waitTime));
                }
            }
        }
        console.warn(`Все ${maxRetries} попыток синтеза речи для текста "${genText.substring(0, 30)}..." завершены неудачно.`);
        return null;
    }
    // Вспомогательная функция для создания AudioResource из Blob
    createAudioResourceFromBlob(blob) {
        const arrayBuffer = blob.arrayBuffer();
        return arrayBuffer.then(buffer => {
            const bufferObj = Buffer.from(buffer);
            const { Readable } = require("node:stream");
            const stream = Readable.from(bufferObj);
            const { createAudioResource } = require("@discordjs/voice");
            return createAudioResource(stream);
        });
    }
}
export { SpeechSynthesizer };
//# sourceMappingURL=speechSynthesizer.js.map