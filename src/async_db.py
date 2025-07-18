#!/usr/bin/env python3
"""
Asynchronous database operations for Flask 3.x
Modern async/await support for better performance
"""

import aiosqlite
import asyncio
from datetime import datetime, timedelta
import sys
import os
from typing import Optional, Dict, Any

# Добавляем корневую директорию в путь
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from config.settings import DATABASE_PATH, FINAL_INCUBATION_TIME


async def get_async_connection():
    """Get async database connection"""
    return await aiosqlite.connect(DATABASE_PATH)


async def get_user_async(user_id: int) -> Optional[Dict[str, Any]]:
    """Get user data asynchronously"""
    async with aiosqlite.connect(DATABASE_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT * FROM users WHERE user_id = ?", (user_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def get_egg_async(user_id: int) -> Optional[Dict[str, Any]]:
    """Get egg data asynchronously with calculated time and progress"""
    async with aiosqlite.connect(DATABASE_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT * FROM eggs WHERE user_id = ?", (user_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            
            # Конвертируем Row в dict
            egg_data = dict(row)
            
            # Рассчитываем актуальное время и прогресс
            start_time = datetime.fromisoformat(egg_data['start_time'])
            now = datetime.utcnow()
            time_passed = (now - start_time).total_seconds()
            time_remaining = max(0, FINAL_INCUBATION_TIME - time_passed)
            
            if time_remaining > 0:
                progress = max(0, min(100, ((FINAL_INCUBATION_TIME - time_remaining) / FINAL_INCUBATION_TIME) * 100))
            else:
                progress = 100
                time_remaining = 0
                # Если время истекло, но статус не обновлен, обновляем его
                if egg_data['status'] != 'hatched':
                    egg_data['status'] = 'hatched'
            
            # Обновляем вычисленные значения
            egg_data['time_remaining'] = int(time_remaining)
            egg_data['progress'] = round(progress, 1)
            
            return egg_data


async def update_egg_temperature_async(user_id: int, new_temp: float) -> bool:
    """Update egg temperature asynchronously"""
    try:
        async with aiosqlite.connect(DATABASE_PATH) as conn:
            await conn.execute(
                """UPDATE eggs 
                   SET temperature = ?, last_touch_time = ? 
                   WHERE user_id = ?""",
                (new_temp, datetime.utcnow().isoformat(), user_id)
            )
            await conn.commit()
            return True
    except Exception as e:
        print(f"Error updating temperature: {e}")
        return False


async def update_egg_progress_async(user_id: int, progress: float, time_remaining: int) -> bool:
    """Update egg progress asynchronously"""
    try:
        async with aiosqlite.connect(DATABASE_PATH) as conn:
            await conn.execute(
                """UPDATE eggs 
                   SET progress = ?, time_remaining = ?, last_touch_time = ? 
                   WHERE user_id = ?""",
                (progress, time_remaining, datetime.utcnow().isoformat(), user_id)
            )
            await conn.commit()
            return True
    except Exception as e:
        print(f"Error updating progress: {e}")
        return False


async def reset_egg_async(user_id: int) -> bool:
    """Reset egg to initial state asynchronously"""
    try:
        async with aiosqlite.connect(DATABASE_PATH) as conn:
            await conn.execute(
                """UPDATE eggs 
                   SET temperature = 20, 
                       progress = 0.0, 
                       time_remaining = ?, 
                       status = 'инкубация',
                       start_time = ?,
                       last_touch_time = ?
                   WHERE user_id = ?""",
                (FINAL_INCUBATION_TIME, datetime.utcnow().isoformat(), datetime.utcnow().isoformat(), user_id)
            )
            await conn.commit()
            return True
    except Exception as e:
        print(f"Error resetting egg: {e}")
        return False


async def add_user_async(user_id: int, username: str, first_name: str) -> bool:
    """Add new user asynchronously"""
    try:
        async with aiosqlite.connect(DATABASE_PATH) as conn:
            await conn.execute(
                """INSERT OR IGNORE INTO users 
                   (user_id, username, first_name, created_at) 
                   VALUES (?, ?, ?, ?)""",
                (user_id, username, first_name, datetime.utcnow().isoformat())
            )
            await conn.commit()
            return True
    except Exception as e:
        print(f"Error adding user: {e}")
        return False


async def add_egg_async(user_id: int) -> bool:
    """Add new egg asynchronously"""
    try:
        async with aiosqlite.connect(DATABASE_PATH) as conn:
            await conn.execute(
                """INSERT OR IGNORE INTO eggs 
                   (user_id, temperature, progress, time_remaining, status, last_touch_time) 
                   VALUES (?, 20, 0.0, ?, 'инкубация', ?)""",
                (user_id, FINAL_INCUBATION_TIME, datetime.utcnow().isoformat())
            )
            await conn.commit()
            return True
    except Exception as e:
        print(f"Error adding egg: {e}")
        return False


# Connection pool for better performance
class AsyncConnectionPool:
    """Simple async connection pool"""
    
    def __init__(self, max_connections: int = 10):
        self.max_connections = max_connections
        self._pool = asyncio.Queue(maxsize=max_connections)
        self._initialized = False
    
    async def _initialize(self):
        """Initialize connection pool"""
        if not self._initialized:
            for _ in range(self.max_connections):
                conn = await aiosqlite.connect(DATABASE_PATH)
                conn.row_factory = aiosqlite.Row
                await self._pool.put(conn)
            self._initialized = True
    
    async def get_connection(self):
        """Get connection from pool"""
        if not self._initialized:
            await self._initialize()
        return await self._pool.get()
    
    async def return_connection(self, conn):
        """Return connection to pool"""
        await self._pool.put(conn)
    
    async def close_all(self):
        """Close all connections"""
        while not self._pool.empty():
            conn = await self._pool.get()
            await conn.close()


# Global connection pool instance
connection_pool = AsyncConnectionPool() 