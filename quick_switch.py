#!/usr/bin/env python3
"""
Быстрое переключение состояний для тестирования
Использование: python quick_switch.py <состояние>
"""

import requests
import sys

BASE_URL = "http://localhost:5000"
USER_ID = 273065571  # Тестовый пользователь

def quick_switch(state):
    """Быстрое переключение состояния"""
    valid_states = ["incubating", "hatching", "dead", "hatched"]
    
    if state not in valid_states:
        print(f"❌ Неверное состояние. Допустимые: {', '.join(valid_states)}")
        return False
    
    try:
        data = {
            "state": state,
            "time_remaining": 3600 if state == "incubating" else 0
        }
        
        response = requests.put(
            f"{BASE_URL}/api/egg/{USER_ID}/set-parameters",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            print(f"✅ Состояние изменено на: {state}")
            print(f"🌐 Обновите страницу: http://localhost:5000")
            return True
        else:
            print(f"❌ Ошибка: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Использование: python quick_switch.py <состояние>")
        print("Состояния: incubating, hatching, dead, hatched")
        sys.exit(1)
    
    state = sys.argv[1].lower()
    quick_switch(state) 