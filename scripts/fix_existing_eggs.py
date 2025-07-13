#!/usr/bin/env python3
"""
Скрипт для обновления существующих яиц с правильным значением time_remaining
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import get_connection, get_egg, update_egg_time_remaining
from settings import FINAL_INCUBATION_TIME, TEST_USER_ID

def fix_existing_eggs():
    """Обновляет существующие яйца с правильным значением time_remaining"""
    with get_connection() as conn:
        c = conn.cursor()
        
        # Получаем все яйца
        c.execute('SELECT user_id, start_time, time_remaining FROM eggs')
        eggs = c.fetchall()
        
        print(f"Найдено {len(eggs)} яиц для обновления")
        
        for user_id, start_time, current_time_remaining in eggs:
            # Если time_remaining равен 0 или None, устанавливаем полное время
            if current_time_remaining is None or current_time_remaining == 0:
                update_egg_time_remaining(user_id, FINAL_INCUBATION_TIME)
                print(f"Обновлено яйцо пользователя {user_id}: установлено время {FINAL_INCUBATION_TIME} секунд")
            else:
                print(f"Яйцо пользователя {user_id}: время уже установлено ({current_time_remaining} секунд)")
        
        print("Обновление завершено!")

if __name__ == "__main__":
    fix_existing_eggs() 