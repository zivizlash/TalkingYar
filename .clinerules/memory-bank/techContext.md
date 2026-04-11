# Tech Context: TalkingYar

## Технологический стек
- **Runtime**: Node.js (Latest LTS)
- **Язык**: TypeScript
- **Discord библиотека**: discord.js v14
- **Голосовой движок**: @discordjs/voice
- **Аудио кодек**: ffmpeg-static
- **Линтер**: ESLint
- **Форматтер**: Prettier
- **API для синтеза речи**: Gradio Client (@gradio/client)
- **База данных**: Level (level) для персистентной очереди

## Настройка окружения
1. Файл `.env` для токена бота и секретных настроек (DISCORD_TOKEN, DISCORD_GUILD_ID, DISCORD_CHANNEL_ID)
2. Файл `tsconfig.json` для конфигурации TypeScript компилятора
3. Node.js версии 18+
4. Gradio сервер для синтеза речи (localhost:7860)
5. Файл example.wav как референсный аудио для синтеза

## Зависимости проекта
- discord.js
- @discordjs/voice
- @discordjs/opus
- libsodium-wrappers
- ffmpeg-static
- @gradio/client
- level (для персистентной очереди)

## Конфигурация TypeScript (tsconfig.json)
- target: ES2022
- module: ES2022
- strict: true
- noImplicitAny: false (для совместимости с динамическими типами Gradio)

## Инструменты разработки
- ESLint с конфигурацией для TypeScript
- Prettier для форматирования кода
- Visual Studio Code как основная IDE
- Git для контроля версий