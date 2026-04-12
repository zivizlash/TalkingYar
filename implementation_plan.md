# Implementation Plan

[Overview]
Замена синтеза речи через Gradio Client на REST API для управления голосовыми каналами.

Данная реализация переводит модуль SpeechSynthesizer от использования Gradio Client к прямым HTTP-запросам к REST API на localhost:8000. Это позволяет более гибко управлять состоянием и использовать OpenAPI спецификацию для документирования доступных эндпоинтов. Основные изменения включают замену клиента Gradio на axios, реализацию предварительной загрузки голосов через PUT /voice/{voice_name} и изменение формата результата синтеза на GET /generate_voice/{voice_name}.

[Types]
- **VoiceMetadata** - интерфейс для метаданных голоса с полями: filename (string), name (string), referenceText (string)
- **AudioResult** - интерфейс для результата синтеза с полями: path (string) или data (Blob)
- **HttpClient** - тип для axios клиент HTTP запросов

[Files]
1. speechSynthesizer.ts - полное переписывание файла со следующими изменениями:
   - Удаление импорта "@gradio/client"
   - Добавление импорта "axios" с типом AnyAxiosRequestConfig
   - Замена static массива voices на Map для хранения голосов и их метаданных
   - Удаление функции loadVoiceEntry (заменяется на конструктор VoiceMetadata)
   - Изменение объекта voices на Map<string, VoiceMetadata>
   - Добавление класса HttpClient для работы с API localhost:8000
   - Добавление метода _initializeVoices() в HttpClient для инициализации голосов через PUT /voice/{voice_name}
   - Изменение SpeechSynthesizer класса:
     * Конструктор принимает baseUrl (default: "http://localhost:8000")
     * В конструкторе вызывается HttpClient.initializeVoices() для предварительной загрузки всех голосов
     * Замена _generateWithRetries на новый метод generateVoiceWithRetry()
     * Метод использует GET /generate_voice/{voice_name} вместо Gradio predict
     * Изменение парсинга результата: ожидание Blob или Base64 данные в response.data

[Functions]
1. New function - HttpClient.initializeVoices(): асинхронная функция инициализации всех голосов через PUT /voice/{voice_name}
2. New function - HttpClient.generateVoice(text, voiceName): генерация речи через GET /generate_voice/{voice_name} с передачей текста в параметре query

[Classes]
1. New class HttpClient:
   - Файл: speechSynthesizer.ts (встроенный inner class)
   - Ключевые методы: initializeVoices(), getVoiceMetadata(), generateVoice()
   - Использует axios для HTTP запросов к localhost:8000

2. Modified class SpeechSynthesizer:
   - Файл: speechSynthesizer.ts
   - Изменения:
     * Конструктор принимает baseUrl и список голосов
     * В конструкторе вызывается HttpClient.initializeVoices()
     * Метод generateWithRetories(text): теперь использует new HttpClient(baseUrl) для создания клиента и вызывает generateVoiceWithRetry()
     * Удалён метод _generateWithRetries - заменён на generateVoiceWithRetry()
     * Метод generateVoiceWithRetry(text, retries=3): использует REST API GET /generate_voice/{voice_name}

[Dependencies]
Добавление axios в package.json: "axios": "^1.7.4" (или последняя LTS версия)
Удаление @gradio/client из зависимостей после замены на REST API
Изменение tsconfig.json если нужно: removal resolveJsonModule может не требоваться (но можно оставить для совместимости)

[Testing]
- Создание test scripts в package.json для проверки синтеза через новый API
- Тестирование инициализации голосов при запуске SpeechSynthesizer
- Тестирование обработки ошибок при недоступности API localhost:8000
- Валидация формата Blob response от /generate_voice/{voice_name}
- Проверка retry логики при неудачных запросах

[Implementation Order]
1. Установка axios через npm install
2. Изменение tsconfig.json для поддержки axios (если требуется)
3. Переписывание speechSynthesizer.ts:
   а) Удаление импорта Gradio Client, добавление axios
   б) Удаление функции loadVoiceEntry
   в) Замена массива voices на Map<string, VoiceMetadata>
   г) Добавление HttpClient класса с методами для REST API
   д) Изменение конструктора SpeechSynthesizer для инициализации через HttpClient
   е) Замена _generateWithRetries на generateVoiceWithRetry() использующую REST API
4. Обновление package.json удалением @gradio/client добавлением axios
5. Тестирование изменений в index.ts или отдельном тестовом файле