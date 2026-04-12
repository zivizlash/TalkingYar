# Tech Context: TalkingYar

## Технологический стек
- **Runtime**: Node.js (Latest LTS)
- **Язык**: TypeScript
- **Discord библиотека**: discord.js v14
- **Голосовой движок**: @discordjs/voice
- **Аудио кодек**: ffmpeg-static
- **Линтер**: ESLint
- **Форматтер**: Prettier
- **API для синтеза речи**: REST API (http://localhost:8000) с fetch API для GET запросов, axios для PUT
- **База данных**: Level (level) для персистентной очереди

## Настройка окружения
1. Файл `.env` для токена бота и секретных настроек (DISCORD_TOKEN, DISCORD_GUILD_ID, DISCORD_CHANNEL_ID)
2. Файл `tsconfig.json` для конфигурации TypeScript компилятора
3. Node.js версии 20+
4. Gradio сервер для синтеза речи через REST API (localhost:8000)
5. Файлы sample.wav как референсные аудио для синтеза

## Зависимости проекта
- discord.js
- @discordjs/voice
- ffmpeg-static
- level (для персистентной очереди)
- axios (для инициализации голосов через PUT /voice/{name})

### Изначальные зависимости с последующими изменениями
- **Удалено**: `@gradio/client` - заменён на REST API
- **fetch API** используется для GET запросов к генерации речи
- **axios** используется только для инициализации голосов (PUT /voice/{name})

## Конфигурация TypeScript (tsconfig.json)
- target: ES2022
- module: ES2022
- strict: true
- noImplicitAny: false (для совместимости с динамическими типами)

## Инструменты разработки
- ESLint с конфигурацией для TypeScript
- Prettier для форматирования кода
- Visual Studio Code как основная IDE
- Git для контроля версий

## REST API Endpoints
### Инициализация голоса
- **Метод**: PUT
- **Путь**: `/voice/{voice_name}`
- **Body**: FormData
  - `text` (string) - текст для референса
  - `ref_audio` (file) - аудио файл референс (blob)
- **Headers**: `{ "Content-Type": "multipart/form-data" }`

### Генерация речи
- **Метод**: POST (через fetch)
- **Путь**: `/generate_voice/{voice_name}`
- **Params**: 
  - `text` (string) - текст для синтеза
- **Response Type**: blob
- **Описание**: Генерация аудио файла с синтезированной речью

### Получение метаданных голоса
- **Метод**: GET (через axios)
- **Путь**: `/voice/{voice_name}`
- **Description**: Получение информации о настроенном голосе

## Структура голосовых данных
Голоса хранятся в массиве объектов:
```typescript
type VoiceMetadata = {
  filename: string;   // Имя wav файла
  name: string;       // Название голоса (для распознавания)
  referenceText: string; // Текст-референс для голоса
};
```

Доступные голоса:
- `дефолт` - default_sample.wav
- `диана` - diana_sample.wav  
- `егор` - egor_sample.wav

## Паттерны работы с REST API
1. При создании SpeechSynthesizer происходит автоматическая инициализация всех голосов через PUT /voice/{name} (axios)
2. Генерация речи использует POST /generate_voice/{name} с отправкой формы FormData через body (поле text) (fetch)
3. Ответ генерации приходит как Blob

## Работа с Blob данными и AudioResource
- `speechSynthesizer.generateWithRetries()` возвращает **AudioResource** напрямую (Blob конвертируется в AudioResource внутри)
- `session.playAudioResource()` принимает **AudioResource** для воспроизведения
- Конвертация Blob -> Buffer -> Readable Stream -> AudioResource происходит внутри SpeechSynthesizer.createAudioResourceFromBlob()

### Функция конвертации Blob в AudioResource
```typescript
function createAudioResourceFromBlob(blob: Blob): Promise<any> {
  const arrayBuffer = blob.arrayBuffer();
  return arrayBuffer.then(buffer => {
    const bufferObj = Buffer.from(buffer);
    const { Readable } = require("node:stream");
    const stream = Readable.from(bufferObj);
    const { createAudioResource } = require("@discordjs/voice");
    return createAudioResource(stream);
  });
}
```

### Структура QueueItem
- `text`: строка для синтеза речи
- `audioResource`: AudioResource или null если ещё не синтезирован
- `status`: "pending" | "playing" | "completed" | "failed"