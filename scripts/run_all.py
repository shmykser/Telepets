import os
import subprocess
import time
import signal
import sys
import threading

# Добавляем корневую папку в путь для импорта модулей
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def kill_python_processes():
    """Завершает все процессы Python"""
    try:
        if os.name == 'nt':  # Windows
            subprocess.run(['taskkill', '/f', '/im', 'python.exe'], 
                         capture_output=True, check=False)
        else:  # Linux/Mac
            subprocess.run(['pkill', '-f', 'python.*main.py'], 
                         capture_output=True, check=False)
            subprocess.run(['pkill', '-f', 'python.*webapp.py'], 
                         capture_output=True, check=False)
        print("✅ Предыдущие процессы Python завершены")
    except Exception as e:
        print(f"⚠️ Ошибка при завершении процессов: {e}")

def run_bot():
    """Запускает бота в отдельном потоке"""
    try:
        print("🚀 Запускаю Telegram бота...")
        # Переходим в корневую папку проекта
        os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        subprocess.run([sys.executable, 'main.py'])
    except Exception as e:
        print(f"❌ Ошибка при запуске бота: {e}")

def run_webapp():
    """Запускает Web App в отдельном потоке"""
    try:
        print("🌐 Запускаю Web App...")
        # Переходим в корневую папку проекта
        os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        subprocess.run([sys.executable, 'webapp.py'])
    except Exception as e:
        print(f"❌ Ошибка при запуске Web App: {e}")

if __name__ == "__main__":
    print("🤖 Telepets Full Stack Launcher")
    print("=" * 40)
    
    # Завершаем предыдущие процессы
    kill_python_processes()
    
    # Небольшая пауза
    time.sleep(2)
    
    try:
        # Запускаем Web App в отдельном потоке
        webapp_thread = threading.Thread(target=run_webapp, daemon=True)
        webapp_thread.start()
        
        # Небольшая пауза для запуска Web App
        time.sleep(3)
        
        # Запускаем бота в основном потоке
        run_bot()
        
    except KeyboardInterrupt:
        print("\n⏹️ Все сервисы остановлены пользователем")
    except Exception as e:
        print(f"❌ Ошибка: {e}") 