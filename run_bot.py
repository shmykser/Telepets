#!/usr/bin/env python3
"""
Запуск Telegram бота Telepets
"""

import sys
import os

# Добавляем текущую директорию в путь
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Импортируем и запускаем бот
if __name__ == "__main__":
    from src.main import main
    import asyncio
    asyncio.run(main()) 