import { Blob } from "buffer";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { createAudioResource } from "@discordjs/voice";
import { Readable } from "node:stream";
import { finished } from 'stream/promises';

type VoiceMetadata = {
  filename: string;
  name: string;
  referenceText: string;
};

const loadVoiceEntry = (filename: string, name: string, referenceText: string): VoiceMetadata => ({
  filename,
  name,
  referenceText,
});

const voices = [
  loadVoiceEntry("default_sample.wav", "дефолт", "Малышка, ты выполнила задание на 5 с плюсом!"),
  loadVoiceEntry("egor_sample.wav", "егор", "Так ты богах+ульник Ты зачем пиво проливаешь?.")
];

const normalizeText = (text: string): string => {
  return text
    .replace(/\s+/g, " ")
    .trim();
};

// Распознаёт шаблон "{имя голоса}: текст" и извлекает имя голоса
const extractVoiceName = (text: string): { voiceName?: string; normalizedText: string } => {
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
  readonly baseUrl: string;
  readonly tempDir: string;

  constructor(baseUrl: string, tempDir?: string) {
    this.baseUrl = baseUrl;
    this.tempDir = tempDir || "/tmp" || process.cwd() + "/temp";
  }

  async initializeVoices(): Promise<void> {
    for (const voice of voices) {
      try {
        const audioPath = `samples/${voice.filename}`;
        
        // Загружаем аудио файл и создаем formData для PUT /voice/{voice_name}
        let refAudio: Blob | null = null;
        if (fs.existsSync(audioPath)) {
          refAudio = await fs.openAsBlob(audioPath);
        }

        const formData = new FormData();
        formData.append("text", voice.referenceText);
        formData.append("ref_audio", refAudio!, `reference_${voice.name}.wav`);

        await axios.put(`${this.baseUrl}/voice/${voice.name}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        console.log(`Голос "${voice.name}" инициализирован`);
      } catch (error: any) {
        const voiceName = error?.config?.url?.split('/voice/')[1]?.split('?')[0];
        console.error(`Ошибка при инициализации голоса "${voiceName || ''}":`, error.message);
      }
    }
  }

  async downloadFile(formData, outputPath, voiceName) {
    const writer = fs.createWriteStream(outputPath);

    const response = await axios({
      method: "POST",
      url: `${this.baseUrl}/generate_voice/${voiceName}`,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data"
      },
      responseType: 'stream'
    });

    // Pipe the read stream into the write stream
    response.data.pipe(writer);

    // Wait for the stream to finish successfully
    return finished(writer);
  }

  async generateVoice(text: string, voiceName: string): Promise<string | null> {
    try {
      var formData = new FormData();
      formData.append("text", text);

      // const response = await axios({
      //   method: "POST",
      //   url: `${this.baseUrl}/generate_voice/${voiceName}`,
      //   data: formData,
      //   headers: {
      //     "Content-Type": "multipart/form-data"
      //   },
      //   responseType: "blob"
      // });

      // Преобразуем response.data в Blob и сохраняем во временный файл
      // const arrayBuffer = await blob.arrayBuffer();
      const tempPath = path.join(this.tempDir, `voice_${voiceName}_${Date.now()}.wav`);
      
      await this.downloadFile(formData, tempPath, voiceName);

      // const blob = new Blob([response.data], { type: "audio.wav" });

      // fs.writeFileSync(tempPath, await blob.bytes());

      // fs.writeFileSync(tempPath, buffer);
      return tempPath;
    } catch (error: any) {
      console.error(`Ошибка генерации речи для голоса "${voiceName}", текст: "${text.substring(0, 30)}...":`, error.message);
      return null;
    }
  }

}

class SpeechSynthesizer {
  private voicesMap: Map<string, VoiceMetadata>;
  
  constructor(baseUrl: string = "http://localhost:8000", tempDir?: string) {
    this.voicesMap = new Map(voices.map(v => [v.name.toLowerCase(), v]));
    
    console.log("Инициализация SpeechSynthesizer через REST API...");
    const client = new ApiHttpClient(baseUrl);
    
    client.initializeVoices().then(() => {
      console.log("Все голоса инициализированы.");
    }).catch(err => {
      console.error("Ошибка при инициализации голосов:", err);
    });
  }

  async generate(text: string): Promise<any> {
    const parsed = extractVoiceName(text);

    if (parsed.voiceName) {
      return await this.generateFromPath(parsed.normalizedText, parsed.voiceName);
    }

    return await this.generateFromPath(parsed.normalizedText, "дефолт");
  }

  private async generateFromPath(genText: string, voiceName: string): Promise<any> {
    const httpClient = new ApiHttpClient("http://localhost:8000", process.cwd() + "/temp");

    console.log(`Старт генерации для голоса "${voiceName}"...`);
    const filePath = await httpClient.generateVoice(genText, voiceName);
    
    if (!filePath) {
      console.error("Не удалось получить путь к аудио файлу");
      return null;
    }

    console.log("Генерация закончена, файл сохранён:", filePath);
    return this.createAudioResourceFromPath(filePath);
  }

  // Создание AudioResource напрямую из wav файла
  private createAudioResourceFromPath(filePath: string) {
    const resource = createAudioResource(filePath);
    return resource;
  }
}

export { SpeechSynthesizer };