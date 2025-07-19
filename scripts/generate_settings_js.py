#!/usr/bin/env python3
"""
Скрипт для автоматической генерации static/js/settings.js из config/settings.py
Запускается при старте сервера или вручную для синхронизации настроек
"""

import os
import sys
import json
from pathlib import Path

# Добавляем корневую директорию в путь
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def generate_settings_js():
    """Генерирует settings.js из settings.py"""
    
    # Импортируем настройки из settings.py
    from config.settings import (
        # Временные параметры
        INCUBATION_TIME_SECONDS, FAST_MODE, FAST_MODE_MULTIPLIER, FINAL_INCUBATION_TIME,
        HATCHING_CLICKS_REQUIRED, HATCHING_TIME_LIMIT, CRACK_STAGES,
        
        # Температурные параметры
        CRITICAL_LOW_TEMP, CRITICAL_HIGH_TEMP, DEAD_LOW_TEMP, DEAD_HIGH_TEMP,
        MAX_TEMP, MIN_TEMP, NORMAL_TEMP_MIN, NORMAL_TEMP_MAX,
        
        # Охлаждение и нагрев
        COOLING_INTERVAL_SECONDS, COOLING_DEGREES_PER_INTERVAL,
        WARMING_DEGREES_PER_RUB,
        
        # Свайпы и взаимодействие
        SWIPE_THRESHOLD_PERCENT, SWIPES_PER_DEGREE, SWIPE_RESET_TIME, PROGRESS_DECAY_TIME,
        
        # UI/Анимации/Визуализация
        EGG_WIDTH, EGG_HEIGHT, PROGRESS_BAR_WIDTH, PROGRESS_BAR_HEIGHT,
        WARMING_ANIMATION_DURATION, RUBBING_ANIMATION_DURATION, TEMP_INCREASE_ANIMATION_DURATION,
        
        # Интервалы
        DATA_UPDATE_INTERVAL, TIMER_UPDATE_INTERVAL,
        
        # Тестирование
        TEST_USER_ID, DEBUG_MODE, TEST_MODE, AUTO_CREATE_TEST_EGG,
        
        # Сообщения
        MESSAGES
    )
    
    # Формируем содержимое settings.js
    js_content = f"""/**
 * Автоматически сгенерированный файл настроек из config/settings.py
 * НЕ РЕДАКТИРУЙТЕ ВРУЧНУЮ! Изменения вносятся только в config/settings.py
 * 
 * Генерация: {__file__}
 */

// ========================================
// НАСТРОЙКИ ВРЕМЕНИ ИНКУБАЦИИ
// ========================================

// Время инкубации (в секундах)
const INCUBATION_TIME_SECONDS = {INCUBATION_TIME_SECONDS}; // {INCUBATION_TIME_SECONDS} секунд

// Быстрый режим для тестирования (уменьшает время инкубации)
const FAST_MODE = {str(FAST_MODE).lower()};
const FAST_MODE_MULTIPLIER = {FAST_MODE_MULTIPLIER}; // {FAST_MODE_MULTIPLIER * 100}% от обычного времени

// Финальное время инкубации (с учетом быстрого режима)
const FINAL_INCUBATION_TIME = {FINAL_INCUBATION_TIME};

// ========================================
// НАСТРОЙКИ ВЫЛУПЛЕНИЯ
// ========================================

// Количество кликов, необходимых для вылупления
const HATCHING_CLICKS_REQUIRED = {HATCHING_CLICKS_REQUIRED};

// Максимальное время на вылупление (в секундах)
const HATCHING_TIME_LIMIT = {HATCHING_TIME_LIMIT}; // {HATCHING_TIME_LIMIT // 60} минут

// Стадии трещин для вылупления
const CRACK_STAGES = {json.dumps(CRACK_STAGES)};

// ========================================
// НАСТРОЙКИ СВАЙПОВ И ВЗАИМОДЕЙСТВИЯ
// ========================================

// Размер свайпа (в процентах от ширины яйца)
const SWIPE_THRESHOLD_PERCENT = {SWIPE_THRESHOLD_PERCENT}; // {SWIPE_THRESHOLD_PERCENT}% = {SWIPE_THRESHOLD_PERCENT * EGG_WIDTH // 100}px при ширине яйца {EGG_WIDTH}px

// Количество свайпов для нагрева на 1 градус
const SWIPES_PER_DEGREE = {SWIPES_PER_DEGREE};

// Время сброса счетчика свайпов (в миллисекундах)
const SWIPE_RESET_TIME = {SWIPE_RESET_TIME}; // {SWIPE_RESET_TIME // 1000} секунды

// Скорость уменьшения прогресса свайпов (в миллисекундах)
const PROGRESS_DECAY_TIME = {PROGRESS_DECAY_TIME}; // {PROGRESS_DECAY_TIME / 1000} секунды

// ========================================
// НАСТРОЙКИ ТЕМПЕРАТУРЫ
// ========================================

// Критически низкая температура (таймер останавливается)
const CRITICAL_LOW_TEMP = {CRITICAL_LOW_TEMP};

// Критически высокая температура (таймер останавливается)
const CRITICAL_HIGH_TEMP = {CRITICAL_HIGH_TEMP};

// Смертельная низкая температура
const DEAD_LOW_TEMP = {DEAD_LOW_TEMP};

// Смертельная высокая температура
const DEAD_HIGH_TEMP = {DEAD_HIGH_TEMP};

// Нормальная температура для инкубации
const NORMAL_TEMP_MIN = {NORMAL_TEMP_MIN};
const NORMAL_TEMP_MAX = {NORMAL_TEMP_MAX};

// ========================================
// НАСТРОЙКИ ВРЕМЕНИ
// ========================================

// Время остывания яйца (в секундах)
const COOLING_INTERVAL_SECONDS = {COOLING_INTERVAL_SECONDS}; // {COOLING_INTERVAL_SECONDS // 60} минута

// Количество градусов, на которое остывает яйцо за один интервал
const COOLING_DEGREES_PER_INTERVAL = {COOLING_DEGREES_PER_INTERVAL};

// Интервал обновления данных с сервера (в миллисекундах)
const DATA_UPDATE_INTERVAL = {DATA_UPDATE_INTERVAL}; // {DATA_UPDATE_INTERVAL // 1000} секунд

// Интервал обновления таймера (в миллисекундах)
const TIMER_UPDATE_INTERVAL = {TIMER_UPDATE_INTERVAL}; // {TIMER_UPDATE_INTERVAL // 1000} секунда

// ========================================
// НАСТРОЙКИ РАЗМЕРОВ И ВИЗУАЛИЗАЦИИ
// ========================================

// Ширина яйца в пикселях
const EGG_WIDTH = {EGG_WIDTH};  // Увеличено на 50%

// Высота яйца в пикселях
const EGG_HEIGHT = {EGG_HEIGHT}; // Увеличено на 50%

// Размер шкалы прогресса свайпов
const PROGRESS_BAR_WIDTH = {PROGRESS_BAR_WIDTH};  // Увеличено на 50% для соответствия яйцу
const PROGRESS_BAR_HEIGHT = {PROGRESS_BAR_HEIGHT};

// ========================================
// НАСТРОЙКИ АНИМАЦИЙ
// ========================================

// Длительность анимации нагрева (в миллисекундах)
const WARMING_ANIMATION_DURATION = {WARMING_ANIMATION_DURATION};

// Длительность анимации трения (в миллисекундах)
const RUBBING_ANIMATION_DURATION = {RUBBING_ANIMATION_DURATION};

// Длительность анимации +1°C (в миллисекундах)
const TEMP_INCREASE_ANIMATION_DURATION = {TEMP_INCREASE_ANIMATION_DURATION};

// ========================================
// НАСТРОЙКИ ТЕСТИРОВАНИЯ
// ========================================

// Тестовый User ID (используется если не получен из Telegram)
const TEST_USER_ID = {TEST_USER_ID};

// Режим отладки (показывает дополнительную информацию в консоли)
const DEBUG_MODE = {str(DEBUG_MODE).lower()};

// ========================================
// ВЫЧИСЛЯЕМЫЕ НАСТРОЙКИ
// ========================================

// Размер свайпа в пикселях
const SWIPE_THRESHOLD_PIXELS = EGG_WIDTH * (SWIPE_THRESHOLD_PERCENT / 100);

// Время инкубации с учетом быстрого режима
const FINAL_INCUBATION_TIME_SECONDS = FAST_MODE ? 
    (INCUBATION_TIME_SECONDS * FAST_MODE_MULTIPLIER) : 
    INCUBATION_TIME_SECONDS;

// ========================================
// НАСТРОЙКИ СООБЩЕНИЙ (для совместимости)
// ========================================

// Сообщения перенесены в NotificationService
// Оставляем только критические значения для проверок
const MESSAGES = {{
    TIMER_STOPPED: ""
}};
"""
    
    # Путь к файлу settings.js
    settings_js_path = Path(__file__).parent.parent / 'static' / 'js' / 'settings.js'
    
    # Создаём директорию если её нет
    settings_js_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Записываем файл
    with open(settings_js_path, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"✅ settings.js сгенерирован: {settings_js_path}")
    print(f"📝 Содержит {len(js_content.split(chr(10)))} строк")

if __name__ == '__main__':
    generate_settings_js() 