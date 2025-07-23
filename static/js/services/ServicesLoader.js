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
        // APIService будет инициализирован после получения userId
        
        // Инициализируем Telegram Service
        if (window.telegramService) {
            await window.telegramService.initialize();
        }
        
        // Получаем userId и инициализируем API Service
        if (window.telegramService && window.APIService) {
            const userId = window.telegramService.getUserId();
            console.log('Using test user ID:', userId);
            window.apiService = new window.APIService(userId);
            console.log('✅ APIService initialized:', !!window.apiService);
        } else {
            console.error('❌ Required services not available:', {
                telegramService: !!window.telegramService,
                APIService: !!window.APIService
            });
            throw new Error('Required services not available');
        }
        
        // Инициализируем Egg Service (если доступен)
        if (window.eggService) {
            window.eggService.initialize();
        }
        
        // Инициализируем Progress Service (если доступен)
        if (window.progressService) {
            window.progressService.initialize();
        }
        
        // Инициализируем SwipeWarm Service (если доступен)
        if (window.swipeWarmService) {
            window.swipeWarmService.initialize();
        }
        
        console.log('✅ Сервисы инициализированы успешно');
        return { 
            telegramService: window.telegramService, 
            apiService: window.apiService,
            eggService: window.eggService,
            progressService: window.progressService,
            swipeWarmService: window.swipeWarmService
        };
    } catch (error) {
        console.error('❌ Ошибка инициализации сервисов:', error);
        throw error;
    }
};

// Делаем классы доступными глобально для возможного прямого использования
// (EggService уже доступен через свой файл)

console.log('🔧 Services Loader инициализирован'); 