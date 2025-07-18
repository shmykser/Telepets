#!/usr/bin/env python3
"""
Запуск веб-приложения с новой entity-based архитектурой
Поддерживает масштабируемое управление состояниями
"""

import os
import sys

# Добавляем корневую директорию в путь
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.entity_db import init_entity_db
from src.webapp import app
from config.config import BOT_TOKEN
from config.settings import TEST_MODE, DEBUG_MODE

# Автоматическая генерация settings.js из settings.py
try:
    from scripts.generate_settings_js import generate_settings_js
    generate_settings_js()
    print("✅ settings.js сгенерирован автоматически")
except Exception as e:
    print(f"⚠️ Ошибка генерации settings.js: {e}")

if __name__ == '__main__':
    try:
        # Инициализация новой entity-based базы данных
        init_entity_db()
        
        if TEST_MODE:
            print('=== ENTITY-BASED АРХИТЕКТУРА ===')
            print('✅ Поддержка состояний: incubating, hatching, dead')
            print('✅ Автоматические переходы состояний')
            print('✅ UI конфигурация на основе состояний')
            print('✅ Масштабируемость для будущих типов существ')
            print('=== РЕЖИМ ТЕСТИРОВАНИЯ АКТИВЕН ===')
            print('💡 Доступные API эндпоинты:')
            print('   📊 GET /api/egg/{user_id} - получить данные сущности')
            print('   🔥 POST /api/egg/{user_id}/warm - нагреть (только incubating)')
            print('   👆 POST /api/egg/{user_id}/click - кликнуть (только hatching)')
            print('   🔄 POST /api/egg/{user_id}/fix_egg - сбросить (только dead)')
            print('   ⚙️ PUT /api/egg/{user_id}/set-parameters - тестирование')
            print('   📡 GET /api/egg/{user_id}/updates - real-time обновления')
            print('================================')
        
        print('🚀 Web App доступен по адресу: http://localhost:5000')
        print('📋 Swagger UI доступен по адресу: http://localhost:8080/swagger-ui.html')
        app.run(debug=DEBUG_MODE, host='0.0.0.0', port=5000)
        
    except Exception as e:
        print(f"❌ Ошибка запуска приложения: {e}")
        sys.exit(1) 