# System Patterns: TalkingYar

## Архитектура системы
- Модульная структура на TypeScript
- Отдельные классы для разных областей ответственности
- Использование событийной модели discord.js
- In-memory Map хранение сессий по guildId
- REST API (http://localhost:8000) вместо Gradio Client с axios для POST /generate_voice

## Основные компоненты
1. **TalkingYarBot (index.ts)** - основной класс бота, управляет клиентом Discord и событиями
2. **Session (session.ts)** - представляет сессию для конкретного guild, хранит состояние голосового канала
3. **SessionManager (session.ts)** - менеджер сессий, хранит все сессии в in-memory Map
4. **SpeechSynthesizer (speechSynthesizer.ts)** - синтез текста в речь через REST API
5. **ApiHttpClient (speechSynthesizer.ts)** - встроенный HTTP клиент для REST API запросов

## Паттерны проектирования
- Классовая структура с TypeScript
- Событийная модель discord.js для обработки сообщений и голосовых состояний
- Очередь для последовательного воспроизведения сообщений
- Паттерн Manager для управления сессиями
- Персистентное хранение очереди через Level (level package)

## Критические пути выполнения
1. Подключение бота -> Аутентификация -> Готовность к работе
2. Получение сообщения от пользователя -> Проверка голосового канала -> Создание/получение сессии
3. Подключение к голосовому каналу -> Установка соединения -> Воспроизведение аудио
4. Получение сообщения -> Синтез речи через REST API -> Сохранение в temp/wav файл -> Создание AudioResource из файла -> Воспроизведение

## Работа с Blob данными и AudioResource
- `generateVoice()` возвращает **path to string** (путь к wav файлу), а не Blob напрямую
- Ответ axios (Blob) сохраняется во временный wav файл в temp/ (`voice_{name}_{timestamp}.wav`)
- `createAudioResourceFromPath()` создаёт **AudioResource** из wav файла (через Readable stream)
- Метод воспроизведения принимает **AudioResource** для прямого воспроизведения

## REST API Endpoints
- PUT `/voice/{voice_name}` - инициализация голоса (axios, FormData)
- POST `/generate_voice/{voice_name}` - генерация речи (axios, JSON body {text}, ответ: Blob → temp/wav файл)
