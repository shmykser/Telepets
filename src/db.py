import sqlite3
from datetime import datetime, timedelta
import sys
import os
import sqlite3
from contextlib import contextmanager

# Добавляем корневую директорию в путь
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from config.settings import (
    DATABASE_PATH, TEST_MODE, AUTO_CREATE_TEST_EGG, TEST_USER_ID,
    FINAL_INCUBATION_TIME, HATCHING_CLICKS_REQUIRED, HATCHING_TIME_LIMIT,
    CRACK_STAGES, START_TEMP
)
from config.messages import get_message

def get_connection():
    return sqlite3.connect(DATABASE_PATH)

def init_db():
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                registered_at TEXT,
                balance INTEGER DEFAULT 0,
                has_pet INTEGER DEFAULT 0,
                current_stage TEXT DEFAULT 'egg'
            )
        ''')
        c.execute(f'''
            CREATE TABLE IF NOT EXISTS eggs (
                user_id INTEGER PRIMARY KEY,
                egg_type TEXT,
                start_time TEXT,
                status TEXT,
                last_touch_time TEXT,
                temperature INTEGER DEFAULT {START_TEMP},
                progress REAL DEFAULT 0,
                hatching_clicks INTEGER DEFAULT 0,
                hatching_start_time TEXT
            )
        ''')
        conn.commit()
        
        # Миграция: добавляем новые поля если они отсутствуют
        try:
            # Проверяем существование поля hatching_clicks
            c.execute("SELECT hatching_clicks FROM eggs LIMIT 1")
        except sqlite3.OperationalError:
            # Поле не существует, добавляем его
            c.execute("ALTER TABLE eggs ADD COLUMN hatching_clicks INTEGER DEFAULT 0")
            print("✅ Добавлено поле hatching_clicks")
            
        try:
            # Проверяем существование поля hatching_start_time
            c.execute("SELECT hatching_start_time FROM eggs LIMIT 1")
        except sqlite3.OperationalError:
            # Поле не существует, добавляем его
            c.execute("ALTER TABLE eggs ADD COLUMN hatching_start_time TEXT")
            print("✅ Добавлено поле hatching_start_time")
            
        conn.commit()
        
        # Автоматическое создание тестового яйца
        if AUTO_CREATE_TEST_EGG and TEST_MODE:
            test_user = get_user(TEST_USER_ID)
            if not test_user:
                add_user(TEST_USER_ID, 'test_user', 'Test', 'User')
            test_egg = get_egg(TEST_USER_ID)
            if not test_egg:
                add_egg(TEST_USER_ID)

def get_user(user_id):
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
        return c.fetchone()

def add_user(user_id, username, first_name, last_name):
    with get_connection() as conn:
        c = conn.cursor()
        now = datetime.utcnow().isoformat()
        c.execute('''
            INSERT INTO users (user_id, username, first_name, last_name, registered_at, balance, has_pet, current_stage)
            VALUES (?, ?, ?, ?, ?, 0, 1, 'egg')
        ''', (user_id, username, first_name, last_name, now))
        conn.commit()

def add_egg(user_id, egg_type='basic', status='инкубация'):
    with get_connection() as conn:
        c = conn.cursor()
        now = datetime.utcnow().isoformat()
        c.execute('''
            INSERT INTO eggs (user_id, egg_type, start_time, status, last_touch_time, temperature, progress)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        ''', (user_id, egg_type, now, status, now, START_TEMP))
        conn.commit()

def get_egg(user_id):
    """Получает данные яйца с вычисленным временем и прогрессом"""
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('SELECT * FROM eggs WHERE user_id = ?', (user_id,))
        row = c.fetchone()
        
        if not row:
            return None
            
        # Конвертируем в словарь для совместимости
        columns = [description[0] for description in c.description]
        egg_data = dict(zip(columns, row))
        
        # Рассчитываем актуальное время и прогресс
        if egg_data['start_time']:
            from datetime import datetime
            start_time = datetime.fromisoformat(egg_data['start_time'])
            now = datetime.utcnow()
            time_passed = (now - start_time).total_seconds()
            time_remaining = max(0, FINAL_INCUBATION_TIME - time_passed)
            
            # Проверяем, нужно ли автоматически переходить в режим вылупления
            if time_remaining <= 0 and egg_data['status'] == 'инкубация':
                # Переходим в режим вылупления
                egg_data['status'] = 'вылупление'
                egg_data['hatching_start_time'] = now.isoformat()
                egg_data['hatching_clicks'] = 0
                
                # Обновляем базу данных
                c.execute('''
                    UPDATE eggs SET 
                        status = ?, 
                        hatching_start_time = ?,
                        hatching_clicks = 0
                    WHERE user_id = ?
                ''', ('вылупление', now.isoformat(), user_id))
                conn.commit()
            
            # Обрабатываем этап вылупления
            if egg_data['status'] == 'вылупление' and egg_data.get('hatching_start_time'):
                hatching_start = datetime.fromisoformat(egg_data['hatching_start_time'])
                hatching_time_passed = (now - hatching_start).total_seconds()
                hatching_time_remaining = max(0, HATCHING_TIME_LIMIT - hatching_time_passed)
                
                # Если время на вылупление истекло
                if hatching_time_remaining <= 0:
                    egg_data['status'] = 'dead'
                    c.execute('UPDATE eggs SET status = ? WHERE user_id = ?', ('dead', user_id))
                    conn.commit()
                
                egg_data['hatching_time_remaining'] = hatching_time_remaining
                egg_data['hatching_clicks'] = egg_data.get('hatching_clicks', 0)
            else:
                # Устанавливаем значения по умолчанию для новых полей
                egg_data['hatching_clicks'] = egg_data.get('hatching_clicks', 0)
                egg_data['hatching_start_time'] = egg_data.get('hatching_start_time')
                
            if time_remaining > 0:
                progress = max(0, min(100, ((FINAL_INCUBATION_TIME - time_remaining) / FINAL_INCUBATION_TIME) * 100))
            else:
                progress = 100
                time_remaining = 0
                
            egg_data['time_remaining'] = time_remaining
            egg_data['progress'] = round(progress, 1)
            
            # Добавляем информацию о стадии трещин
            if egg_data.get('hatching_clicks', 0) > 0:
                clicks = egg_data['hatching_clicks']
                egg_data['crack_stage'] = None
                for threshold, stage in sorted(CRACK_STAGES.items()):
                    if clicks >= threshold:
                        egg_data['crack_stage'] = stage
                        
        return egg_data

def update_egg_time_remaining(user_id, time_remaining):
    pass  # больше не используется

def update_egg_progress(user_id, progress):
    """Обновляет прогресс инкубации"""
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('UPDATE eggs SET progress = ? WHERE user_id = ?', (progress, user_id))
        conn.commit()

def update_egg_temperature(user_id, temperature):
    """Обновляет температуру яйца"""
    with get_connection() as conn:
        c = conn.cursor()
        now = datetime.utcnow().isoformat()
        c.execute('UPDATE eggs SET temperature = ?, last_touch_time = ? WHERE user_id = ?', 
                  (temperature, now, user_id))
        conn.commit()

def reset_egg(user_id):
    with get_connection() as conn:
        c = conn.cursor()
        now = datetime.utcnow().isoformat()
        c.execute('''
            UPDATE eggs SET
                egg_type = 'basic',
                start_time = ?,
                status = 'инкубация',
                last_touch_time = ?,
                temperature = ?,
                progress = 0
            WHERE user_id = ?
        ''', (now, now, START_TEMP, user_id))
        conn.commit()
        return True

def set_egg_parameters(user_id, temperature=None, time_remaining=None, status=None):
    """
    Устанавливает произвольные параметры яйца для тестирования
    
    Args:
        user_id: ID пользователя
        temperature: Температура яйца (1-50°C)
        time_remaining: Оставшееся время в секундах
        status: Статус яйца ('инкубация', 'dead', etc.)
    
    Returns:
        bool: True если обновление прошло успешно
    """
    with get_connection() as conn:
        c = conn.cursor()
        
        # Сначала получаем текущие данные яйца
        c.execute('SELECT * FROM eggs WHERE user_id = ?', (user_id,))
        current_egg = c.fetchone()
        
        if not current_egg:
            return False
            
        now = datetime.utcnow()
        
        # Подготавливаем параметры для обновления
        update_fields = []
        update_values = []
        
        if temperature is not None:
            # Валидация температуры
            temperature = max(1, min(50, int(temperature)))
            update_fields.append('temperature = ?')
            update_values.append(temperature)
            
        if time_remaining is not None:
            # Конвертируем оставшееся время в start_time
            time_remaining = max(0, int(time_remaining))
            new_start_time = now - timedelta(seconds=(FINAL_INCUBATION_TIME - time_remaining))
            update_fields.append('start_time = ?')
            update_values.append(new_start_time.isoformat())
            
        if status is not None:
            # Валидация статуса
            valid_statuses = ['инкубация', 'вылупление', 'dead', 'hatched']
            if status in valid_statuses:
                update_fields.append('status = ?')
                update_values.append(status)
                
                # При установке статуса "вылупление" нужно также установить hatching_start_time
                if status == 'вылупление':
                    update_fields.append('hatching_start_time = ?')
                    update_values.append(now.isoformat())
        
        # Всегда обновляем last_touch_time
        update_fields.append('last_touch_time = ?')
        update_values.append(now.isoformat())
        
        if update_fields:
            query = f"UPDATE eggs SET {', '.join(update_fields)} WHERE user_id = ?"
            update_values.append(user_id)
            c.execute(query, update_values)
            conn.commit()
            return True
            
        return False

def click_hatching_egg(user_id):
    """
    Обрабатывает клик по яйцу во время вылупления
    
    Returns:
        dict: Результат клика с информацией о прогрессе
    """
    with get_connection() as conn:
        c = conn.cursor()
        
        # Получаем текущие данные яйца
        egg = get_egg(user_id)
        if not egg:
            return {'success': False, 'error': get_message('ERROR', 'EGG_NOT_FOUND')}
            
        if egg['status'] != 'вылупление':
            if egg['status'] == 'hatched':
                return {'success': False, 'error': get_message('TELEGRAM', 'EGG_ALREADY_HATCHED')}
            elif egg['status'] == 'dead':
                return {'success': False, 'error': get_message('ENTITY_STATE', 'DEAD')}
            else:
                return {'success': False, 'error': get_message('TELEGRAM', 'NOT_HATCHING_STAGE')}
        
        # Увеличиваем счетчик кликов
        current_clicks = egg.get('hatching_clicks', 0)
        new_clicks = current_clicks + 1
        
        c.execute('''
            UPDATE eggs SET hatching_clicks = ? WHERE user_id = ?
        ''', (new_clicks, user_id))
        conn.commit()
        
        # Проверяем, достигнуто ли необходимое количество кликов
        if new_clicks >= HATCHING_CLICKS_REQUIRED:
            # Вылупление завершено!
            from datetime import datetime
            c.execute('''
                UPDATE eggs SET status = 'hatched' WHERE user_id = ?
            ''', (user_id,))
            conn.commit()
            
            return {
                'success': True,
                'status': 'hatched',
                'clicks': new_clicks,
                'required_clicks': HATCHING_CLICKS_REQUIRED,
                'message': 'HATCHING_SUCCESS',
                'crack_stage': 'hatched'
            }
        
        # Определяем стадию трещин
        crack_stage = None
        crack_message = None
        for threshold, stage in sorted(CRACK_STAGES.items()):
            if new_clicks >= threshold and current_clicks < threshold:
                crack_stage = stage
                crack_message = 'HATCHING_CRACK'
                break
        
        progress_percent = round((new_clicks / HATCHING_CLICKS_REQUIRED) * 100, 1)
        
        return {
            'success': True,
            'status': 'вылупление',
            'clicks': new_clicks,
            'required_clicks': HATCHING_CLICKS_REQUIRED,
            'progress_percent': progress_percent,
            'crack_stage': crack_stage,
            'message': crack_message or 'CLICK_SUCCESS',
            'remaining_clicks': HATCHING_CLICKS_REQUIRED - new_clicks
        }