#!/usr/bin/env python3
"""
Итоговый тест для демонстрации автоматического обновления интерфейса при истечении времени
"""

import requests
import json
import time

# Настройки
BASE_URL = "http://localhost:5000"
USER_ID = 273065571

def test_auto_interface_update():
    """Тестирует полный цикл автоматического обновления интерфейса"""
    
    print("🚀 Тест автоматического обновления интерфейса")
    print("=" * 50)
    
    # 1. Сбрасываем яйцо для чистого теста
    print("\n🔄 Сбрасываем яйцо для чистого теста...")
    reset_response = requests.post(f"{BASE_URL}/api/egg/{USER_ID}/fix_egg")
    
    if reset_response.status_code == 200:
        print("✅ Яйцо сброшено в состояние инкубации")
    else:
        print(f"❌ Ошибка сброса: {reset_response.status_code}")
        return
    
    # 2. Получаем начальное состояние
    response = requests.get(f"{BASE_URL}/api/egg/{USER_ID}")
    if response.status_code == 200:
        egg_data = response.json()
        print(f"📊 Начальное состояние: {egg_data['state']}")
        print(f"⏰ Начальное время: {egg_data['time_remaining']} секунд")
        print(f"🌡️ Температура: {egg_data['temperature']}°C")
    
    # 3. Мониторим изменения состояния
    print(f"\n🔍 Мониторим изменения состояния...")
    print("💡 Ожидаем переход: incubating -> hatching")
    
    last_state = egg_data['state']
    last_time = egg_data['time_remaining']
    state_changed = False
    
    while not state_changed:
        try:
            response = requests.get(f"{BASE_URL}/api/egg/{USER_ID}")
            
            if response.status_code == 200:
                egg_data = response.json()
                current_state = egg_data['state']
                current_time = egg_data['time_remaining']
                
                # Проверяем изменение состояния
                if current_state != last_state:
                    print(f"\n🎉 ИЗМЕНЕНИЕ СОСТОЯНИЯ: {last_state} -> {current_state}")
                    print(f"⏰ Время: {current_time} секунд")
                    
                    if current_state == 'hatching':
                        print("✅ Инкубация завершена! Интерфейс автоматически обновился!")
                        print("✅ Теперь можно кликать по яйцу для вылупления")
                        state_changed = True
                        break
                
                # Показываем прогресс каждые 5 секунд
                elif abs(current_time - last_time) > 5:
                    print(f"⏰ Время: {current_time} секунд (осталось {current_time}с)")
                    last_time = current_time
                
                if current_time <= 0:
                    print("⏰ Время истекло!")
                    break
                    
            else:
                print(f"❌ Ошибка получения данных: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Ошибка: {e}")
            
        time.sleep(1)  # Проверяем каждую секунду
    
    # 4. Проверяем финальное состояние
    print(f"\n📊 Финальное состояние:")
    response = requests.get(f"{BASE_URL}/api/egg/{USER_ID}")
    if response.status_code == 200:
        egg_data = response.json()
        print(f"📊 Состояние: {egg_data['state']}")
        print(f"⏰ Время: {egg_data['time_remaining']} секунд")
        print(f"🌡️ Температура: {egg_data['temperature']}°C")
        
        if egg_data['state'] == 'hatching':
            print("✅ ТЕСТ ПРОЙДЕН! Интерфейс автоматически обновился при истечении времени!")
        else:
            print(f"❌ ТЕСТ НЕ ПРОЙДЕН! Ожидалось состояние 'hatching', получено '{egg_data['state']}'")

if __name__ == "__main__":
    test_auto_interface_update() 