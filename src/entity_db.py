"""
Новая архитектура базы данных с поддержкой сущностей
Entity-based подход для масштабируемого управления яйцами и особями
"""

import sys
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import json

from config.settings import DATABASE_PATH, TEST_MODE, AUTO_CREATE_TEST_EGG, TEST_USER_ID, FINAL_INCUBATION_TIME

from config.entity_states import EntityType, EggState, get_valid_states
from config.settings import HATCHING_CLICKS_REQUIRED, HATCHING_TIME_LIMIT
from src.services.entity_state_service import EntityStateService

@contextmanager
def get_connection():
    """Контекстный менеджер для работы с базой данных"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Для доступа к колонкам по имени
    try:
        yield conn
        conn.commit()  # Автоматический коммит при успешном выходе
    except Exception:
        conn.rollback()  # Откат при ошибке
        raise
    finally:
        conn.close()

def init_entity_db():
    """Инициализация базы данных с новой entity-based схемой"""
    print("🔄 Инициализация entity-based базы данных...")
    
    with get_connection() as conn:
        c = conn.cursor()
        
        # Создание новой таблицы entities
        c.execute('''
            CREATE TABLE IF NOT EXISTS entities (
                user_id INTEGER PRIMARY KEY,
                entity_type TEXT NOT NULL DEFAULT 'egg',
                state TEXT NOT NULL DEFAULT 'incubating',
                start_time TEXT,
                last_touch_time TEXT,
                temperature INTEGER DEFAULT 37,
                progress REAL DEFAULT 0,
                
                -- Данные для вылупления
                hatching_clicks INTEGER DEFAULT 0,
                hatching_start_time TEXT,
                
                -- JSON для специфичных данных состояния
                state_data TEXT DEFAULT '{}',
                
                -- Метаданные
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        
        # Миграция данных из старой таблицы eggs (если существует)
        try:
            c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='eggs'")
            if c.fetchone():
                print("📦 Найдена старая таблица eggs, выполняю миграцию...")
                migrate_from_old_schema(conn)
        except sqlite3.Error as e:
            print(f"⚠️ Ошибка при проверке старой схемы: {e}")
        
        # Создание индексов для производительности
        c.execute("CREATE INDEX IF NOT EXISTS idx_entity_type_state ON entities(entity_type, state)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_user_updated ON entities(user_id, updated_at)")
        
        conn.commit()
        print("✅ База данных инициализирована")
        
        # Создание тестового яйца
        if AUTO_CREATE_TEST_EGG and TEST_MODE:
            create_test_entity()

def migrate_from_old_schema(conn):
    """Миграция данных из старой схемы eggs в новую схему entities"""
    try:
        c = conn.cursor()
        
        # Получаем все данные из старой таблицы
        c.execute("SELECT * FROM eggs")
        old_rows = c.fetchall()
        
        for row in old_rows:
            # Конвертируем старые состояния в новые
            old_status = row[3] if len(row) > 3 else 'инкубация'
            new_state = convert_old_status_to_new_state(old_status)
            
            # Подготавливаем данные для новой таблицы
            entity_data = {
                'user_id': row[0],
                'entity_type': 'egg',
                'state': new_state,
                'start_time': row[2] if len(row) > 2 else None,
                'last_touch_time': row[4] if len(row) > 4 else None,
                'temperature': row[5] if len(row) > 5 else 37,
                'progress': row[6] if len(row) > 6 else 0,
                'hatching_clicks': row[7] if len(row) > 7 else 0,
                'hatching_start_time': row[8] if len(row) > 8 else None,
                'state_data': '{}',
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Вставляем в новую таблицу
            c.execute('''
                INSERT OR REPLACE INTO entities 
                (user_id, entity_type, state, start_time, last_touch_time, 
                 temperature, progress, hatching_clicks, hatching_start_time,
                 state_data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                entity_data['user_id'], entity_data['entity_type'], entity_data['state'],
                entity_data['start_time'], entity_data['last_touch_time'], 
                entity_data['temperature'], entity_data['progress'],
                entity_data['hatching_clicks'], entity_data['hatching_start_time'],
                entity_data['state_data'], entity_data['created_at'], entity_data['updated_at']
            ))
        
        # Переименовываем старую таблицу в backup
        c.execute("ALTER TABLE eggs RENAME TO eggs_backup")
        conn.commit()
        
        print(f"✅ Мигрировано {len(old_rows)} записей из старой схемы")
        
    except sqlite3.Error as e:
        print(f"❌ Ошибка миграции: {e}")
        conn.rollback()

def convert_old_status_to_new_state(old_status: str) -> str:
    """Конвертировать старые статусы в новые состояния"""
    conversion_map = {
        'инкубация': 'incubating',
        'вылупление': 'hatching',
        'dead': 'dead',
        'hatched': 'hatched'
    }
    return conversion_map.get(old_status, 'incubating')

def create_test_entity():
    """Создание тестовой сущности"""
    print("🧪 Создание тестовой сущности...")
    
    test_entity = get_entity(TEST_USER_ID)
    if not test_entity:
        now = datetime.utcnow().isoformat()
        
        with get_connection() as conn:
            c = conn.cursor()
            c.execute('''
                INSERT INTO entities 
                (user_id, entity_type, state, start_time, last_touch_time, 
                 temperature, progress, state_data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                TEST_USER_ID, 'egg', 'incubating', now, now, 
                37, 0, '{}', now, now
            ))
            conn.commit()
            print(f"✅ Тестовая сущность создана для пользователя {TEST_USER_ID}")

def _get_entity_raw(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Получить данные сущности БЕЗ автоматических переходов состояний
    Используется внутри transition_entity_state чтобы избежать рекурсии
    """
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('SELECT * FROM entities WHERE user_id = ?', (user_id,))
        row = c.fetchone()
        
        if not row:
            return None
        
        # Конвертируем в словарь
        entity_data = dict(row)
        
        # Парсим JSON данные состояния
        try:
            entity_data['state_data'] = json.loads(entity_data.get('state_data', '{}'))
        except json.JSONDecodeError:
            entity_data['state_data'] = {}
        
        # Рассчитываем прогресс БЕЗ проверки переходов
        progress_data = EntityStateService.calculate_progress_data(entity_data)
        entity_data.update(progress_data)
        
        # Добавляем UI конфигурацию
        ui_config = EntityStateService.get_entity_ui_config(
            entity_data['entity_type'], 
            entity_data['state']
        )
        entity_data['ui_config'] = ui_config
        
        return entity_data

def get_entity(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Получить данные сущности с автоматическими переходами состояний
    
    Returns:
        Dict с полными данными сущности включая UI конфигурацию
    """
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('SELECT * FROM entities WHERE user_id = ?', (user_id,))
        row = c.fetchone()
        
        if not row:
            return None
        
        # Конвертируем в словарь
        entity_data = dict(row)
        
        # Парсим JSON данные состояния
        try:
            entity_data['state_data'] = json.loads(entity_data.get('state_data', '{}'))
        except json.JSONDecodeError:
            entity_data['state_data'] = {}
        
        # Применяем автоматическое охлаждение
        apply_cooling_to_entity(user_id)
        
        # Проверяем автоматические переходы состояний
        new_state = EntityStateService.check_auto_transitions(entity_data)
        if new_state:
            entity_data = transition_entity_state(user_id, new_state, auto=True)
        
        # Рассчитываем прогресс
        progress_data = EntityStateService.calculate_progress_data(entity_data)
        entity_data.update(progress_data)
        
        # Добавляем UI конфигурацию
        ui_config = EntityStateService.get_entity_ui_config(
            entity_data['entity_type'], 
            entity_data['state']
        )
        entity_data['ui_config'] = ui_config
        
        # Обновляем last_touch_time
        now = datetime.utcnow().isoformat()
        c.execute('UPDATE entities SET updated_at = ? WHERE user_id = ?', (now, user_id))
        conn.commit()
        
        return entity_data

def transition_entity_state(user_id: int, new_state: str, auto: bool = False) -> Dict[str, Any]:
    """
    Выполнить переход сущности в новое состояние
    
    Args:
        user_id: ID пользователя
        new_state: Новое состояние
        auto: Автоматический переход (True) или ручной (False)
    """
    with get_connection() as conn:
        c = conn.cursor()
        now = datetime.utcnow().isoformat()
        
        # Подготавливаем данные для обновления
        update_data = {
            'state': new_state,
            'updated_at': now
        }
        
        # Специальная логика для конкретных переходов
        if new_state == 'hatching':
            # Переход в режим вылупления
            update_data['hatching_start_time'] = now
            update_data['hatching_clicks'] = 0
            
        elif new_state == 'incubating':
            # Сброс к начальному состоянию (reset)
            update_data.update({
                'start_time': now,
                'last_touch_time': now,
                'temperature': 37,
                'progress': 0,
                'hatching_clicks': 0,
                'hatching_start_time': None,
                'state_data': '{}'
            })
        
        # Обновляем базу данных
        set_clause = ', '.join([f"{key} = ?" for key in update_data.keys()])
        values = list(update_data.values()) + [user_id]
        
        c.execute(f"UPDATE entities SET {set_clause} WHERE user_id = ?", values)
        conn.commit()
        
        # Возвращаем обновленные данные БЕЗ рекурсивного вызова get_entity
        return _get_entity_raw(user_id)

def update_entity_temperature(user_id: int, delta: int = 1) -> bool:
    """Обновить температуру сущности (для свайпов)"""
    with get_connection() as conn:
        c = conn.cursor()
        now = datetime.utcnow().isoformat()
        
        c.execute('''
            UPDATE entities 
            SET temperature = CASE 
                WHEN temperature + ? > 50 THEN 50
                WHEN temperature + ? < 1 THEN 1
                ELSE temperature + ?
            END,
            last_touch_time = ?,
            updated_at = ?
            WHERE user_id = ? AND state = 'incubating'
        ''', (delta, delta, delta, now, now, user_id))
        
        return c.rowcount > 0

def apply_cooling_to_entity(user_id: int) -> bool:
    """
    Применить автоматическое охлаждение к яйцу
    Работает только в состоянии incubating
    """
    from config.settings import COOLING_INTERVAL_SECONDS, COOLING_DEGREES_PER_INTERVAL
    
    with get_connection() as conn:
        c = conn.cursor()
        now = datetime.utcnow()
        
        # Получаем текущие данные яйца
        c.execute('''
            SELECT temperature, last_touch_time, state 
            FROM entities 
            WHERE user_id = ?
        ''', (user_id,))
        
        row = c.fetchone()
        if not row:
            return False
            
        temperature, last_touch_time_str, state = row
        
        # Охлаждение работает только в состоянии incubating
        if state != 'incubating':
            return False
        
        # Проверяем, прошло ли достаточно времени с последнего прикосновения
        if last_touch_time_str:
            last_touch_time = datetime.fromisoformat(last_touch_time_str)
            time_since_touch = (now - last_touch_time).total_seconds()
            
            # Если прошло больше интервала охлаждения, применяем охлаждение
            if time_since_touch >= COOLING_INTERVAL_SECONDS:
                # Применяем только одно охлаждение за раз (не накапливаем)
                new_temperature = max(1, temperature - COOLING_DEGREES_PER_INTERVAL)
                
                # Обновляем температуру и сбрасываем last_touch_time
                c.execute('''
                    UPDATE entities 
                    SET temperature = ?, last_touch_time = ?, updated_at = ?
                    WHERE user_id = ?
                ''', (new_temperature, now.isoformat(), now.isoformat(), user_id))
                
                conn.commit()
                return True
        
        return False

def increment_hatching_clicks(user_id: int) -> Dict[str, Any]:
    """Увеличить счетчик кликов при вылуплении"""
    with get_connection() as conn:
        c = conn.cursor()
        now = datetime.utcnow().isoformat()
        
        # Получаем текущее состояние без автоматических переходов
        c.execute('SELECT state, hatching_clicks FROM entities WHERE user_id = ?', (user_id,))
        row = c.fetchone()
        
        if not row:
            return {'success': False, 'error': 'Entity not found'}
            
        current_state, current_clicks = row
        if current_state != 'hatching':
            if current_state == 'hatched':
                return {'success': False, 'error': 'Pet already hatched'}
            elif current_state == 'dead':
                return {'success': False, 'error': 'Entity is dead'}
            else:
                return {'success': False, 'error': 'Entity not in hatching state'}
        
        # Увеличиваем счетчик
        new_clicks = current_clicks + 1
        
        c.execute('''
            UPDATE entities 
            SET hatching_clicks = ?, updated_at = ?
            WHERE user_id = ?
        ''', (new_clicks, now, user_id))
        
        conn.commit()
        
        # Проверяем достижение максимума
        if new_clicks >= HATCHING_CLICKS_REQUIRED:
            # Переход к следующему этапу (hatched/baby creature)
            transition_entity_state(user_id, 'hatched', auto=True)
        
        return {
            'success': True,
            'clicks': new_clicks,
            'required': HATCHING_CLICKS_REQUIRED,
            'progress': round((new_clicks / HATCHING_CLICKS_REQUIRED) * 100, 1)
        }

def set_entity_parameters(user_id: int, **params) -> bool:
    """
    Установить произвольные параметры сущности (для тестирования)
    
    Args:
        user_id: ID пользователя
        **params: temperature, time_remaining, state, etc.
    """
    with get_connection() as conn:
        c = conn.cursor()
        now = datetime.utcnow()
        
        # Получаем текущую сущность
        entity_data = get_entity(user_id)
        if not entity_data:
            return False
        
        update_fields = []
        update_values = []
        
        # Обработка параметров
        if 'temperature' in params:
            temp = max(1, min(50, int(params['temperature'])))
            update_fields.append('temperature = ?')
            update_values.append(temp)
        
        if 'state' in params:
            new_state = params['state']
            valid_states = get_valid_states(EntityType.EGG)
            if new_state in valid_states:
                update_fields.append('state = ?')
                update_values.append(new_state)
                
                # Специальная логика для состояний
                if new_state == 'hatching':
                    update_fields.append('hatching_start_time = ?')
                    update_values.append(now.isoformat())
        
        if 'time_remaining' in params:
            # Рассчитываем новое start_time на основе оставшегося времени
            remaining = max(0, int(params['time_remaining']))
            new_start_time = now - timedelta(seconds=FINAL_INCUBATION_TIME - remaining)
            update_fields.append('start_time = ?')
            update_values.append(new_start_time.isoformat())
        
        # Всегда обновляем время изменения
        update_fields.append('updated_at = ?')
        update_values.append(now.isoformat())
        
        if update_fields:
            update_values.append(user_id)
            query = f"UPDATE entities SET {', '.join(update_fields)} WHERE user_id = ?"
            c.execute(query, update_values)
            conn.commit()
            return True
        
        return False

# Функции для совместимости со старым API
def get_egg(user_id: int) -> Optional[Dict[str, Any]]:
    """Обертка для совместимости - получить данные 'яйца'"""
    entity = get_entity(user_id)
    if entity and entity['entity_type'] == 'egg':
        return entity
    return None

def reset_egg(user_id: int) -> bool:
    """Обертка для совместимости - сбросить яйцо"""
    result = transition_entity_state(user_id, 'incubating')
    return result is not None

def update_egg_temperature(user_id: int, delta: int = 1) -> bool:
    """Обертка для совместимости"""
    return update_entity_temperature(user_id, delta)

def click_hatching_egg(user_id: int) -> Dict[str, Any]:
    """Обертка для совместимости"""
    return increment_hatching_clicks(user_id) 