/**
 * Services Loader - делает современные сервисы доступными глобально
 * для интеграции с legacy кодом
 */

// Сервисы будут созданы после загрузки всех файлов
window.telegramService = null;
window.apiService = null;
// EggService будет создан в своем файле

// Функция для инициализации APIService после получения userId
window.initAPIService = function(userId) {
    window.apiService = new APIService(userId);
    return window.apiService;
};

// Функция для инициализации всех сервисов
window.initServices = async function() {
    try {
        // Создаем экземпляры сервисов
        if (window.TelegramService) {
            window.telegramService = new window.TelegramService();
        }
        if (window.APIService) {
            window.apiService = null; // Будет инициализирован после получения userId
        }
        
        // Инициализируем Telegram Service
        if (window.telegramService) {
            await window.telegramService.initialize();
        }
        
        // Получаем userId и инициализируем API Service
        if (window.telegramService && window.APIService) {
            const userId = window.telegramService.getUserId();
            window.apiService = new window.APIService(userId);
        }
        
        // Инициализируем Egg Service (если доступен)
        if (window.eggService) {
            window.eggService.initialize();
        }
        
        // Инициализируем Progress Service (если доступен)
        if (window.progressService) {
            window.progressService.initialize();
        }
        
        console.log('✅ Сервисы инициализированы успешно');
        return { 
            telegramService: window.telegramService, 
            apiService: window.apiService,
            eggService: window.eggService,
            progressService: window.progressService
        };
    } catch (error) {
        console.error('❌ Ошибка инициализации сервисов:', error);
        throw error;
    }
};

// Делаем классы доступными глобально для возможного прямого использования
// (EggService уже доступен через свой файл)

console.log('🔧 Services Loader инициализирован'); 