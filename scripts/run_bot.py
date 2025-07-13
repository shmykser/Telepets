import os
import subprocess
import time
import signal
import sys

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
        print("✅ Предыдущие процессы Python завершены")
    except Exception as e:
        print(f"⚠️ Ошибка при завершении процессов: {e}")

def run_bot():
    """Запускает бота"""
    try:
        print("🚀 Запускаю Telegram бота...")
        # Переходим в корневую папку проекта
        os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        subprocess.run([sys.executable, 'main.py'])
    except KeyboardInterrupt:
        print("\n⏹️ Бот остановлен пользователем")
    except Exception as e:
        print(f"❌ Ошибка при запуске бота: {e}")

if __name__ == "__main__":
    print("🤖 Telepets Bot Launcher")
    print("=" * 30)
    
    # Завершаем предыдущие процессы
    kill_python_processes()
    
    # Небольшая пауза
    time.sleep(2)
    
    # Запускаем бота
    run_bot() 