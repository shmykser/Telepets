#!/usr/bin/env python3
"""
Простой скрипт для переключения состояний яйца для тестирования
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5000"

def switch_state(user_id, new_state):
    """Переключить состояние яйца"""
    
    # Валидация состояний
    valid_states = ["incubating", "hatching", "dead", "hatched"]
    
    if new_state not in valid_states:
        print(f"❌ Неверное состояние. Допустимые: {', '.join(valid_states)}")
        return False
    
    try:
        # Устанавливаем новое состояние
        data = {
            "state": new_state,
            "time_remaining": 3600 if new_state == "incubating" else 0
        }
        
        response = requests.put(
            f"{BASE_URL}/api/egg/{user_id}/set-parameters",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Состояние изменено на: {new_state}")
            print(f"📊 Данные: {json.dumps(result, indent=2, ensure_ascii=False)}")
            return True
        else:
            print(f"❌ Ошибка: {response.status_code}")
            print(f"   Ответ: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

def show_current_state(user_id):
    """Показать текущее состояние"""
    try:
        response = requests.get(f"{BASE_URL}/api/egg/{user_id}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"📊 Текущее состояние пользователя {user_id}:")
            print(f"   Состояние: {data.get('state', 'N/A')}")
            print(f"   Температура: {data.get('temperature', 'N/A')}°C")
            print(f"   Оставшееся время: {data.get('time_remaining', 'N/A')}")
            print(f"   Клики вылупления: {data.get('hatching_clicks', 'N/A')}")
            return True
        else:
            print(f"❌ Ошибка получения данных: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

def main():
    """Главная функция"""
    print("🔄 Переключатель состояний для тестирования")
    print("=" * 50)
    
    # Используем тестового пользователя
    user_id = 273065571  # Тестовый пользователь из приложения
    
    while True:
        print(f"\n👤 Текущий пользователь: {user_id}")
        print("\nДоступные команды:")
        print("1. incubating - Инкубация")
        print("2. hatching - Вылупление") 
        print("3. dead - Мертвое состояние")
        print("4. hatched - Вылупилось")
        print("5. status - Показать текущее состояние")
        print("6. exit - Выход")
        
        choice = input("\nВведите команду: ").strip().lower()
        
        if choice == "exit":
            print("👋 До свидания!")
            break
        elif choice == "status":
            show_current_state(user_id)
        elif choice in ["incubating", "hatching", "dead", "hatched"]:
            switch_state(user_id, choice)
        else:
            print("❌ Неверная команда. Попробуйте снова.")

if __name__ == "__main__":
    main() 