from flask import Flask, render_template, request, jsonify, send_from_directory, stream_with_context, Response
from datetime import datetime, timedelta
import sqlite3
import json
import threading
import time
import os
from settings import (
    FINAL_INCUBATION_TIME, CRITICAL_LOW_TEMP, CRITICAL_HIGH_TEMP, 
    DEAD_LOW_TEMP, DEAD_HIGH_TEMP, MAX_TEMP, MIN_TEMP,
    COOLING_INTERVAL_SECONDS, COOLING_DEGREES_PER_INTERVAL,
    WARMING_DEGREES_PER_RUB, DATABASE_PATH, MESSAGES,
    TEST_MODE, DEBUG_MODE
)
from db import update_egg_time_remaining, update_egg_progress

app = Flask(__name__)

# Глобальные переменные для хранения времени обновления
last_cooling_update = {}
last_timer_update = {}

# Для хранения последних данных по каждому яйцу
last_egg_data = {}

def get_connection():
    return sqlite3.connect(DATABASE_PATH)

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

def format_time(seconds):
    seconds = int(seconds)
    days, seconds = divmod(seconds, 86400)
    hours, seconds = divmod(seconds, 3600)
    minutes, seconds = divmod(seconds, 60)
    
    # Показываем только числа, разделенные двоеточием
    if days > 0:
        return f"{days}:{hours:02d}:{minutes:02d}:{seconds:02d}"
    elif hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    else:
        return f"{minutes}:{seconds:02d}"

def update_egg_cooling():
    """Функция для охлаждения яйца каждые N секунд"""
    while True:
        try:
            with get_connection() as conn:
                c = conn.cursor()
                c.execute('SELECT user_id, temperature, time_remaining FROM eggs WHERE status = "incubating"')
                eggs = c.fetchall()
                
                for user_id, current_temp, time_remaining in eggs:
                    # Проверяем, прошло ли нужное время с последнего обновления
                    current_time = time.time()
                    if user_id not in last_cooling_update or current_time - last_cooling_update[user_id] >= COOLING_INTERVAL_SECONDS:
                        new_temp = max(MIN_TEMP, current_temp - COOLING_DEGREES_PER_INTERVAL)
                        c.execute('UPDATE eggs SET temperature = ? WHERE user_id = ?', (new_temp, user_id))
                        last_cooling_update[user_id] = current_time
                        
                        # Проверяем смерть от экстремальных температур
                        if new_temp <= DEAD_LOW_TEMP or new_temp >= DEAD_HIGH_TEMP:
                            c.execute('UPDATE eggs SET status = "dead" WHERE user_id = ?', (user_id,))
                            if DEBUG_MODE:
                                print(f"Яйцо погибло от экстремальной температуры для пользователя {user_id}: {new_temp}°C")
                        # Если температура критически низкая, отправляем уведомление
                        elif new_temp < CRITICAL_LOW_TEMP:
                            if DEBUG_MODE:
                                print(f"Критически низкая температура для пользователя {user_id}: {new_temp}°C")
                
                conn.commit()
        except Exception as e:
            if DEBUG_MODE:
                print(f"Ошибка при обновлении температуры: {e}")
        
        time.sleep(COOLING_INTERVAL_SECONDS)

# Запускаем потоки для обновления
cooling_thread = threading.Thread(target=update_egg_cooling, daemon=True)
cooling_thread.start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/egg/<int:user_id>')
def get_egg_data(user_id):
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('SELECT * FROM eggs WHERE user_id = ?', (user_id,))
        egg = c.fetchone()
        
        if not egg:
            return jsonify({'error': 'Egg not found'}), 404
        
        # egg: (user_id, egg_type, start_time, status, last_touch_time, temperature, progress, ...)
        start_time = datetime.fromisoformat(egg[2])
        now = datetime.utcnow()
        time_passed = (now - start_time).total_seconds()
        time_remaining = max(0, FINAL_INCUBATION_TIME - time_passed)
        if time_remaining > 0:
            progress = max(0, min(100, ((FINAL_INCUBATION_TIME - time_remaining) / FINAL_INCUBATION_TIME) * 100))
        else:
            progress = 100
            time_remaining = 0
        return jsonify({
            'egg_type': egg[1],
            'status': egg[3],
            'temperature': egg[5],
            'progress': round(progress, 1),
            'time_remaining': int(time_remaining),
            'formatted_time_remaining': format_time(time_remaining),
            'message': MESSAGES['LOW_TEMP'] if egg[5] <= 23 else None
        })

@app.route('/api/egg/<int:user_id>/updates')
def egg_updates(user_id):
    timeout = 20  # секунд
    poll_interval = 0.5
    start_time_poll = time.time()
    global last_egg_data
    force_first = request.args.get('force') == '1'
    def get_egg_snapshot():
        with get_connection() as conn:
            c = conn.cursor()
            c.execute('SELECT * FROM eggs WHERE user_id = ?', (user_id,))
            egg = c.fetchone()
            if not egg:
                # Если пользователь не найден — сбрасываем last_egg_data
                last_egg_data.pop(user_id, None)
                return None
            start_time = datetime.fromisoformat(egg[2])
            now = datetime.utcnow()
            time_passed = (now - start_time).total_seconds()
            time_remaining = max(0, FINAL_INCUBATION_TIME - time_passed)
            if time_remaining > 0:
                progress = max(0, min(100, ((FINAL_INCUBATION_TIME - time_remaining) / FINAL_INCUBATION_TIME) * 100))
            else:
                progress = 100
                time_remaining = 0
            return {
                'egg_type': egg[1],
                'status': egg[3],
                'temperature': egg[5],
                'progress': round(progress, 1),
                'time_remaining': int(time_remaining),
                'formatted_time_remaining': format_time(time_remaining),
                'message': MESSAGES['LOW_TEMP'] if egg[5] <= 23 else None
            }
    def important_fields(snapshot):
        return (
            snapshot['status'],
            snapshot['temperature'],
            snapshot['progress'],
            snapshot['message']
        )
    initial = get_egg_snapshot()
    if initial is None:
        return jsonify({'error': 'Egg not found'}), 404
    last_snapshot = last_egg_data.get(user_id)
    if force_first or last_snapshot is None or important_fields(last_snapshot) != important_fields(initial):
        last_egg_data[user_id] = initial
        return jsonify(initial)
    while time.time() - start_time_poll < timeout:
        time.sleep(poll_interval)
        current = get_egg_snapshot()
        if important_fields(current) != important_fields(last_snapshot):
            last_egg_data[user_id] = current
            return jsonify(current)
    return jsonify(initial)

@app.route('/api/egg/<int:user_id>/warm', methods=['POST'])
def warm_egg(user_id):
    """API для нагрева яйца при свайпе"""
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('SELECT temperature, status FROM eggs WHERE user_id = ?', (user_id,))
        egg = c.fetchone()
        
        if not egg:
            return jsonify({'error': 'Egg not found'}), 404
        
        if egg[1] == 'dead':
            return jsonify({
                'temperature': egg[0],
                'status': 'dead',
                'message': MESSAGES['EGG_ALREADY_DEAD']
            })
        
        current_temp = egg[0]
        new_temp = min(MAX_TEMP, current_temp + WARMING_DEGREES_PER_RUB)
        
        # Проверяем смерть от экстремальных температур
        if new_temp >= DEAD_HIGH_TEMP:
            c.execute('UPDATE eggs SET status = "dead", temperature = ? WHERE user_id = ?', (new_temp, user_id))
            conn.commit()
            return jsonify({
                'temperature': new_temp,
                'status': 'dead',
                'message': MESSAGES['OVERHEAT_DEATH']
            })
        
        # Обновляем время последнего касания для корректного расчета прогресса
        c.execute('UPDATE eggs SET temperature = ?, last_touch_time = ? WHERE user_id = ?', 
                 (new_temp, datetime.utcnow().isoformat(), user_id))
        conn.commit()
        
        return jsonify({
            'temperature': new_temp,
            'status': 'warmed'
        })

if __name__ == '__main__':
    if TEST_MODE:
        print('=== РЕЖИМ ТЕСТИРОВАНИЯ ===')
        print(f'Время инкубации: {FINAL_INCUBATION_TIME} секунд')
        print(f'Интервал охлаждения: {COOLING_INTERVAL_SECONDS} секунд')
        print(f'Критические температуры: {CRITICAL_LOW_TEMP}°C - {CRITICAL_HIGH_TEMP}°C')
        print(f'Смертельные температуры: {DEAD_LOW_TEMP}°C - {DEAD_HIGH_TEMP}°C')
        print('========================')
    
    print('Web App доступен по адресу: http://localhost:5000')
    print('Для Telegram Web App нужен HTTPS. Используйте ngrok или localtunnel.')
    app.run(debug=DEBUG_MODE, host='0.0.0.0', port=5000) 