#!/usr/bin/env python3
"""
Скрипт для быстрого тестирования с измененными настройками
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from settings import *

def print_current_settings():
    """Выводит текущие настройки"""
    print("=== ТЕКУЩИЕ НАСТРОЙКИ ===")
    print(f"Время инкубации: {FINAL_INCUBATION_TIME} секунд ({FINAL_INCUBATION_TIME/3600:.1f} часов)")
    print(f"Быстрый режим: {'ВКЛ' if FAST_MODE else 'ВЫКЛ'}")
    print(f"Интервал охлаждения: {COOLING_INTERVAL_SECONDS} секунд")
    print(f"Критические температуры: {CRITICAL_LOW_TEMP}°C - {CRITICAL_HIGH_TEMP}°C")
    print(f"Смертельные температуры: {DEAD_LOW_TEMP}°C - {DEAD_HIGH_TEMP}°C")
    print(f"Максимальная температура: {MAX_TEMP}°C")
    print(f"Минимальная температура: {MIN_TEMP}°C")
    print(f"Режим отладки: {'ВКЛ' if DEBUG_MODE else 'ВЫКЛ'}")
    print(f"Тестовый режим: {'ВКЛ' if TEST_MODE else 'ВЫКЛ'}")
    print("==========================")

def suggest_test_settings():
    """Предлагает настройки для быстрого тестирования"""
    print("\n=== НАСТРОЙКИ ДЛЯ БЫСТРОГО ТЕСТИРОВАНИЯ ===")
    print("Для быстрого тестирования измените в settings.py:")
    print("FAST_MODE = True")
    print("COOLING_INTERVAL_SECONDS = 10  # Охлаждение каждые 10 секунд")
    print("SWIPE_THRESHOLD_PERCENT = 20   # Легче свайпать")
    print("SWIPES_PER_DEGREE = 10         # Меньше свайпов для нагрева")
    print("PROGRESS_DECAY_TIME = 1000     # Медленнее сбрасывается прогресс")
    print("=============================================")

if __name__ == "__main__":
    print_current_settings()
    suggest_test_settings() 