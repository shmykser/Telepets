// Обработчик свайпов - логика взаимодействия с яйцом

let swipeCount = 0;
let lastSwipeTime = 0;
let isSwiping = false;
let startX = 0;
let startY = 0;
let totalDistance = 0; // Общий пройденный путь
let lastX = 0;
let lastY = 0;
let progressDecayTimer = null; // Таймер для уменьшения прогресса

// Сброс счетчика свайпов
function resetSwipeCount() {
    swipeCount = 0;
    updateSwipeProgress();
}

// Настройка обработчиков событий для свайпов
function setupSwipeHandlers() {
    const egg = document.getElementById('egg');
    if (!egg) return;
    
    // resetSwipeCount(); // УБРАНО: сброс теперь только при явных событиях
    
    egg.addEventListener('touchstart', handleTouchStart, false);
    egg.addEventListener('touchmove', handleTouchMove, false);
    egg.addEventListener('touchend', handleTouchEnd, false);
    
    // Для десктопа - симуляция свайпов мышью
    egg.addEventListener('mousedown', handleMouseDown, false);
    egg.addEventListener('mousemove', handleMouseMove, false);
    egg.addEventListener('mouseup', handleMouseUp, false);
}

// Обработка начала касания (мобильные устройства)
function handleTouchStart(e) {
    if (currentEggData.status === 'dead') return;
    e.preventDefault();
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    lastX = startX;
    lastY = startY;
    totalDistance = 0;
    isSwiping = true;
    resetProgressDecayTimer();
}

// Обработка движения пальца (мобильные устройства)
function handleTouchMove(e) {
    if (!isSwiping || currentEggData.status === 'dead') return;
    e.preventDefault();
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    
    // Вычисляем расстояние от предыдущей точки
    const deltaX = Math.abs(currentX - lastX);
    const deltaY = Math.abs(currentY - lastY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    totalDistance += distance;
    lastX = currentX;
    lastY = currentY;
    
    // Используем настройку из settings.js
    if (totalDistance >= SWIPE_THRESHOLD_PIXELS) {
        handleSwipe();
        totalDistance = 0; // Сбрасываем накопленное расстояние
    }
    
    resetProgressDecayTimer();
}

// Обработка окончания касания (мобильные устройства)
function handleTouchEnd(e) {
    isSwiping = false;
    totalDistance = 0;
    startProgressDecayTimer();
}

// Обработка нажатия мыши (десктоп)
function handleMouseDown(e) {
    if (currentEggData.status === 'dead') return;
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    lastX = startX;
    lastY = startY;
    totalDistance = 0;
    isSwiping = true;
    resetProgressDecayTimer();
}

// Обработка движения мыши (десктоп)
function handleMouseMove(e) {
    if (!isSwiping || currentEggData.status === 'dead') return;
    e.preventDefault();
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    // Вычисляем расстояние от предыдущей точки
    const deltaX = Math.abs(currentX - lastX);
    const deltaY = Math.abs(currentY - lastY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    totalDistance += distance;
    lastX = currentX;
    lastY = currentY;
    
    // Используем настройку из settings.js
    if (totalDistance >= SWIPE_THRESHOLD_PIXELS) {
        handleSwipe();
        totalDistance = 0; // Сбрасываем накопленное расстояние
    }
    
    resetProgressDecayTimer();
}

// Обработка отпускания мыши (десктоп)
function handleMouseUp(e) {
    isSwiping = false;
    totalDistance = 0;
    startProgressDecayTimer();
}

// Обработка свайпа
function handleSwipe() {
    const now = Date.now();
    
    // Увеличиваем счетчик свайпов
    swipeCount++;
    lastSwipeTime = now;
    
    // Обновляем шкалу прогресса
    updateSwipeProgress();
    
    // Анимация трения
    const egg = document.getElementById('egg');
    if (egg) {
        egg.classList.add('rubbing');
        setTimeout(() => egg.classList.remove('rubbing'), RUBBING_ANIMATION_DURATION);
    }
    
    // Если набрали нужное количество свайпов, нагреваем яйцо
    if (swipeCount >= SWIPES_PER_DEGREE) {
        showTempIncrease();
        warmEgg();
        swipeCount = 0;
        updateSwipeProgress();
    }
}

// Сброс таймера уменьшения прогресса
function resetProgressDecayTimer() {
    if (progressDecayTimer) {
        clearTimeout(progressDecayTimer);
        progressDecayTimer = null;
    }
}

// Запуск таймера уменьшения прогресса
function startProgressDecayTimer() {
    resetProgressDecayTimer();
    progressDecayTimer = setTimeout(() => {
        if (swipeCount > 0) {
            swipeCount = Math.max(0, swipeCount - 1);
            updateSwipeProgress();
            
            // Если прогресс еще есть, продолжаем уменьшение
            if (swipeCount > 0) {
                startProgressDecayTimer();
            }
        }
    }, PROGRESS_DECAY_TIME);
} 