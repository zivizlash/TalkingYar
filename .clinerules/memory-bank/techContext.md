# Tech Context: TalkingYar

## Технологический стек
- **Runtime**: Node.js (Latest LTS)
- **Язык**: TypeScript
- **Discord библиотека**: discord.js v14
- **Голосовой движок**: @discordjs/voice
- **Аудио кодек**: ffmpeg-static
- **Линтер**: ESLint
- **Форматтер**: Prettier
- **API для синтеза речи**: REST API (http://localhost:8000) с axios для POST /generate_voice и PUT /voice/{name}
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

### Генерация речи через axios
- **Метод**: POST (через axios)
- **Путь**: `/generate_voice/{voice_name}`
- **Body**: `{ text: string }` - JSON объект с полем text
- **Headers**: `{ "Content-Type": "application/json" }`
- **Response Type**: blob → сохраняется в temp/ как wav файл
- **Имя файла**: `voice_{name}_{timestamp}.wav`
- **Описание**: Генерация аудио файла с синтезированной речью, который возвращается как путь к файлу

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
2. Генерация речи использует POST /generate_voice/{name} через axios с JSON body `{ text }`
3. Ответ генерации сохраняется во временный wav файл в temp/ (`voice_{name}_{timestamp}.wav`)
4. Метод возвращает путь к файлу вместо Blob

## Работа с Blob данными и AudioResource
- `generateVoice()` возвращает **path to string** (путь к wav файлу), а не Blob напрямую
- `createAudioResourceFromPath()` создаёт **AudioResource** из wav файла (через Readable stream)
- `session.playAudioResource()` принимает **AudioResource** для воспроизведения

### Функция создания AudioResource из wav файла
```typescript
function createAudioResourceFromPath(filePath: string): any {
  const buffer = fs.readFileSync(filePath);
  const stream = Readable.from(buffer);
  const { createAudioResource } = require("@discordjs/voice");
  return createAudioResource(stream);
}
```

### Структура ApiHttpClient
- `baseUrl`: URL REST API (default: "http://localhost:8000")
- `tempDir`: Путь к временной директории для wav файлов (default: process.cwd() + "/temp")

### Структура QueueItem
- `text`: строка для синтеза речи
- `audioResource`: AudioResource или null если ещё не синтезирован
- `status`: "pending" | "playing" | "completed" | "failed"
