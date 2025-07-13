import sqlite3
import sys
import os

# Добавляем родительскую директорию в путь для импорта
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def fix_egg(user_id, new_status="incubating", new_temperature=37):
    """Исправляет статус яйца в базе данных"""
    conn = sqlite3.connect('telepets.db')
    cursor = conn.cursor()
    
    # Проверяем, существует ли яйцо
    cursor.execute('SELECT * FROM eggs WHERE user_id = ?', (user_id,))
    egg = cursor.fetchone()
    
    if not egg:
        print(f"Яйцо для пользователя {user_id} не найдено!")
        return
    
    print(f"Текущее состояние яйца:")
    print(f"User ID: {egg[0]}")
    print(f"Egg Type: {egg[1]}")
    print(f"Start Time: {egg[2]}")
    print(f"Status: {egg[3]}")
    print(f"Last Touch: {egg[4]}")
    print(f"Temperature: {egg[5]}°C")
    print(f"Progress: {egg[6]}%")
    
    # Обновляем статус и температуру
    cursor.execute('''
        UPDATE eggs 
        SET status = ?, temperature = ? 
        WHERE user_id = ?
    ''', (new_status, new_temperature, user_id))
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ Яйцо исправлено!")
    print(f"Новый статус: {new_status}")
    print(f"Новая температура: {new_temperature}°C")

def list_eggs():
    """Показывает все яйца в базе данных"""
    conn = sqlite3.connect('telepets.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT user_id, egg_type, status, temperature, progress FROM eggs')
    eggs = cursor.fetchall()
    
    if not eggs:
        print("В базе данных нет яиц!")
        return
    
    print("Все яйца в базе данных:")
    print("-" * 60)
    for egg in eggs:
        print(f"User ID: {egg[0]}, Type: {egg[1]}, Status: {egg[2]}, Temp: {egg[3]}°C, Progress: {egg[4]}%")
    
    conn.close()

if __name__ == "__main__":
    print("=== Скрипт исправления яйца ===")
    print("1. Показать все яйца")
    print("2. Исправить конкретное яйцо")
    print("3. Сбросить все яйца к нормальному состоянию")
    
    choice = input("\nВыберите действие (1-3): ").strip()
    
    if choice == "1":
        list_eggs()
    
    elif choice == "2":
        try:
            user_id = int(input("Введите User ID: "))
            new_status = input("Новый статус (incubating/hatched/dead) [incubating]: ").strip() or "incubating"
            new_temp = input("Новая температура [37]: ").strip()
            new_temp = int(new_temp) if new_temp else 37
            
            fix_egg(user_id, new_status, new_temp)
        except ValueError:
            print("Ошибка: введите корректный User ID (число)")
    
    elif choice == "3":
        print("Сброс всех яиц к нормальному состоянию...")
        conn = sqlite3.connect('telepets.db')
        cursor = conn.cursor()
        
        cursor.execute('UPDATE eggs SET status = "incubating", temperature = 37')
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        
        print(f"✅ Сброшено {affected} яиц!")
    
    else:
        print("Неверный выбор!") 