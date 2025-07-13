// Основная логика приложения
let tg = window.Telegram.WebApp;
let userId = null;
let currentEggData = null;
let timerInterval = null;
let localTimeRemaining = null;
let lastSyncTimestamp = null;
let syncInterval = null;
let longPollStarted = false;

// Инициализация приложения
function initApp() {
    tg.expand();
    tg.ready();
    
    // Получаем ID пользователя из Telegram
    userId = tg.initDataUnsafe?.user?.id;
    
    // Проверяем, что ID получен корректно
    if (!userId) {
        // Для тестирования
        userId = TEST_USER_ID;
    }
    
    if (DEBUG_MODE) {
        console.log('User ID:', userId);
        console.log('Settings loaded:', {
            swipeThreshold: SWIPE_THRESHOLD_PIXELS,
            incubationTime: INCUBATION_TIME_SECONDS,
            coolingInterval: COOLING_INTERVAL_SECONDS,
            fastMode: FAST_MODE
        });
    }
    
    // Сначала обычный запрос для быстрой загрузки
    fetch(`/api/egg/${userId}`)
        .then(res => res.json())
        .then(data => {
            renderEgg(data);
            // Скрываем 'Загрузка...'
            const loading = document.querySelector('.loading');
            if (loading) loading.style.display = 'none';
            // После первого успешного ответа запускаем long polling
            startLongPollingWithFallback();
            // Периодическая сверка состояния с сервером
            syncInterval = setInterval(syncEggData, 60000);
        })
        .catch(() => {
            const loading = document.querySelector('.loading');
            if (loading) loading.textContent = 'Ошибка загрузки';
        });
}

function startLongPollingWithFallback() {
    longPollStarted = false;
    longPollEggUpdates();
    setTimeout(() => {
        if (!longPollStarted) {
            console.log('Long polling did not start, retrying...');
            longPollEggUpdates();
        }
    }, 3000);
}

function longPollEggUpdates() {
    console.log('Long polling request to /updates');
    longPollStarted = true;
    fetch(`/api/egg/${userId}/updates`)
        .then(res => res.json())
        .then(data => {
            renderEgg(data);
            longPollEggUpdates();
        })
        .catch(() => setTimeout(longPollEggUpdates, 2000));
}

document.addEventListener('DOMContentLoaded', initApp);