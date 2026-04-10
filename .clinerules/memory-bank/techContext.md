# Tech Context: TalkingYar

## Технологический стек
- **Runtime**: Node.js (Latest LTS)
- **Discord библиотека**: discord.js v14
- **Голосовой движок**: @discordjs/voice
- **Аудио кодек**: ffmpeg-static
- **Линтер**: ESLint
- **Форматтер**: Prettier
- **API для синтеза речи**: Gradio Client

## Настройка окружения
1. Файл `.env` для токена бота и секретных настроек
2. Файл `config.json` для общих конфигураций
3. Node.js версии 18+
4. Gradio сервер для синтеза речи (localhost:7860)

## Зависимости проекта
- discord.js
- @discordjs/voice
- libsodium-wrappers
- ffmpeg-static
- opusscript
- @gradio/client

## Инструменты разработки
- ESLint с конфигурацией для современного JavaScript
- Prettier для форматирования кода
- Visual Studio Code как основная IDE
