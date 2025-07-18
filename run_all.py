#!/usr/bin/env python3
"""
Запуск всех сервисов Telepets одновременно
"""

import subprocess
import threading
import time
import sys
import os

def run_webapp():
    """Запуск веб-приложения"""
    print("🌐 Запускаю веб-приложение...")
    subprocess.run([sys.executable, "run_webapp.py"])

def run_swagger():
    """Запуск Swagger документации"""
    print("📚 Запускаю Swagger документацию...")
    os.chdir("api-docs")
    subprocess.run([sys.executable, "swagger_server.py", "--no-browser"])

if __name__ == "__main__":
    print("🚀 Telepets Full Stack Launcher")
    print("=" * 40)
    
    try:
        # Запускаем веб-приложение в отдельном потоке
        webapp_thread = threading.Thread(target=run_webapp, daemon=True)
        webapp_thread.start()
        
        # Запускаем Swagger документацию в отдельном потоке
        swagger_thread = threading.Thread(target=run_swagger, daemon=True)
        swagger_thread.start()
        
        # Небольшая пауза для запуска сервисов
        time.sleep(3)
        
        print("✅ Сервисы запущены:")
        print("   🌐 Web App: http://localhost:5000")
        print("   📚 Swagger: http://localhost:8080/swagger-ui.html")
        print()
        
        
    except KeyboardInterrupt:
        print("\n⏹️ Все сервисы остановлены пользователем")
    except Exception as e:
        print(f"❌ Ошибка: {e}") 