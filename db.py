import sqlite3
from datetime import datetime
from settings import DATABASE_PATH, TEST_MODE, AUTO_CREATE_TEST_EGG, TEST_USER_ID, FINAL_INCUBATION_TIME

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
        c.execute('''
            CREATE TABLE IF NOT EXISTS eggs (
                user_id INTEGER PRIMARY KEY,
                egg_type TEXT,
                start_time TEXT,
                status TEXT,
                last_touch_time TEXT,
                temperature INTEGER DEFAULT 37,
                progress REAL DEFAULT 0
            )
        ''')
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
            VALUES (?, ?, ?, ?, ?, 37, 0)
        ''', (user_id, egg_type, now, status, now))
        conn.commit()

def get_egg(user_id):
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('SELECT * FROM eggs WHERE user_id = ?', (user_id,))
        return c.fetchone()

def update_egg_time_remaining(user_id, time_remaining):
    pass  # больше не используется

def update_egg_progress(user_id, progress):
    """Обновляет прогресс инкубации"""
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('UPDATE eggs SET progress = ? WHERE user_id = ?', (progress, user_id))
        conn.commit() 