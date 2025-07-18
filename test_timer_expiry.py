#!/usr/bin/env python3
"""
Простой тест для проверки автоматического обновления интерфейса при истечении времени
"""

import requests
import json
import time

# Настройки
BASE_URL = "http://localhost:5000"
USER_ID = 273065571

def test_timer_expiry():
    """Тестирует автоматическое обновление интерфейса при истечении времени"""
    
    print("🚀 Тест автоматического обновления интерфейса при истечении времени")
    
    # 1. Получаем текущее состояние яйца
    print("\n📊 Получаем текущее состояние яйца...")
    response = requests.get(f"{BASE_URL}/api/egg/{USER_ID}")
    
    if response.status_code != 200:
        print(f"❌ Ошибка получения данных: {response.status_code}")
        return
    
    egg_data = response.json()
    print(f"📊 Текущее состояние: {egg_data['state']}")
    print(f"⏰ Время: {egg_data['time_remaining']} секунд")
    print(f"🌡️ Температура: {egg_data['temperature']}°C")
    
    # 2. Если яйцо в состоянии hatching, сбрасываем его
    if egg_data['state'] == 'hatching':
        print("\n🔄 Сбрасываем яйцо для тестирования...")
        reset_response = requests.post(f"{BASE_URL}/api/egg/{USER_ID}/fix_egg")
        
        if reset_response.status_code == 200:
            print("✅ Яйцо сброшено")
            
            # Получаем обновленные данные
            response = requests.get(f"{BASE_URL}/api/egg/{USER_ID}")
            if response.status_code == 200:
                egg_data = response.json()
                print(f"📊 Новое состояние: {egg_data['state']}")
                print(f"⏰ Время: {egg_data['time_remaining']} секунд")
    
    # 3. Проверяем, что яйцо в состоянии инкубации
    if egg_data['state'] != 'incubating':
        print(f"❌ Яйцо не в состоянии инкубации: {egg_data['state']}")
        return
    
    # 4. Мониторим состояние до истечения времени
    print(f"\n🔍 Мониторим состояние до истечения времени...")
    print(f"⏰ Начальное время: {egg_data['time_remaining']} секунд")
    
    last_state = egg_data['state']
    last_time = egg_data['time_remaining']
    
    while True:
        try:
            response = requests.get(f"{BASE_URL}/api/egg/{USER_ID}")
            
            if response.status_code == 200:
                egg_data = response.json()
                current_state = egg_data['state']
                current_time = egg_data['time_remaining']
                
                # Проверяем изменения
                if current_state != last_state:
                    print(f"\n🔄 Изменение состояния: {last_state} -> {current_state}")
                    print(f"⏰ Время: {current_time} секунд")
                    last_state = current_state
                    
                    if current_state == 'hatching':
                        print("🎉 Инкубация завершена! Интерфейс должен автоматически обновиться!")
                        break
                
                elif abs(current_time - last_time) > 5:  # Показываем изменения каждые 5 секунд
                    print(f"⏰ Время: {current_time} секунд (осталось {current_time}с)")
                    last_time = current_time
                
                if current_time <= 0:
                    print("⏰ Время истекло! Проверьте интерфейс...")
                    break
                    
            else:
                print(f"❌ Ошибка получения данных: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Ошибка: {e}")
            
        time.sleep(1)  # Проверяем каждую секунду

if __name__ == "__main__":
    test_timer_expiry() 