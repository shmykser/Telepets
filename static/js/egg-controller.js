// Контроллер яйца - управление отображением и состоянием

// Рендеринг яйца
let localTimerInterval = null;

function renderEgg(data) {
    currentEggData = data;
    const app = document.getElementById('app');
    let warningHtml = '';
    
    // Проверяем статус яйца
    if (data.status === 'dead') {
        if (typeof resetSwipeCount === 'function') resetSwipeCount();
        warningHtml = `<div class="critical">${MESSAGES.DEAD}</div>`;
    } else {
        if (data.temperature < CRITICAL_LOW_TEMP) {
            warningHtml = `<div class="critical">${MESSAGES.CRITICAL_LOW}</div>`;
        } else if (data.temperature > CRITICAL_HIGH_TEMP) {
            warningHtml = `<div class="critical">${MESSAGES.CRITICAL_HIGH}</div>`;
        } else if (data.temperature <= 30) {
            warningHtml = `<div class="warning">${MESSAGES.LOW_TEMP}</div>`;
        }
    }
    
    const progressPercent = (swipeCount / SWIPES_PER_DEGREE) * 100;
    const timerClass = data.status === 'dead' ? 'timer stopped' : 'timer';
    const swipeProgressOpacity = (data.status === 'dead' || swipeCount === 0) ? 'opacity: 0;' : 'opacity: 1;';
    
    app.innerHTML = `
        ${warningHtml ? `<div class="temperature-notifications">${warningHtml}</div>` : ''}
        <div class="egg-container">
            <div class="egg${data.status !== 'dead' ? ' pulse' : ''}" id="egg" style="${data.status === 'dead' ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                <div class="swipe-progress" id="swipeProgress" style="${swipeProgressOpacity}">
                    <div class="swipe-fill" id="swipeFill" style="width: ${progressPercent}%"></div>
                </div>
            </div>
        </div>
        <div class="info-panel">
            <div class="temperature" id="temperature">
                🌡️ ${data.temperature > 0 ? '+' : ''}${data.temperature}°C
            </div>
            <div class="${timerClass}" id="timer">
                ${data.status === 'dead' ? '<span class="game-over">Игра окончена</span>' : data.formatted_time_remaining}
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${data.progress}%"></div>
            </div>
            <div class="status">
                ${data.status === 'dead' ? 'Погибло' : data.status} • ${data.progress}%
            </div>
        </div>
    `;

    // Очищаем предыдущий локальный таймер
    if (localTimerInterval) {
        clearInterval(localTimerInterval);
        localTimerInterval = null;
    }

    // Если яйцо живо, запускаем локальный таймер
    if (data.status !== 'dead') {
        let timeLeft = data.time_remaining;
        const timerElem = () => document.getElementById('timer');
        localTimerInterval = setInterval(() => {
            timeLeft = Math.max(0, timeLeft - 1);
            if (timerElem()) {
                timerElem().textContent = formatTime(timeLeft);
            }
            if (timeLeft <= 0) {
                clearInterval(localTimerInterval);
            }
        }, 1000);
    }

    // Добавляем обработчики событий для свайпов
    if (data.status !== 'dead') {
        setupSwipeHandlers();
    }
}

// Обновление прогресса свайпов
function updateSwipeProgress() {
    const swipeProgress = document.getElementById('swipeProgress');
    const swipeFill = document.getElementById('swipeFill');
    
    if (swipeProgress && swipeFill) {
        const progressPercent = (swipeCount / SWIPES_PER_DEGREE) * 100;
        
        // Показываем/скрываем шкалу через прозрачность
        if (swipeCount === 0) {
            swipeProgress.style.opacity = '0';
        } else {
            swipeProgress.style.opacity = '1';
            swipeFill.style.width = progressPercent + '%';
        }
    }
}

// Показ анимации увеличения температуры
function showTempIncrease() {
    const tempIncrease = document.createElement('div');
    tempIncrease.className = 'temp-increase';
    tempIncrease.innerHTML = '+1°C';
    document.body.appendChild(tempIncrease);
    
    setTimeout(() => {
        if (tempIncrease.parentNode) {
            tempIncrease.parentNode.removeChild(tempIncrease);
        }
    }, TEMP_INCREASE_ANIMATION_DURATION);
} 

// Форматирование времени (мин:сек или ч:мин:сек)
function formatTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
} 