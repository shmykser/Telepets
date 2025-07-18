#!/usr/bin/env python3
"""
Отдельный сервер для Swagger документации Telepets API
Позволяет запускать документацию независимо от основного приложения
"""

import os
import sys
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading
import time

# Добавляем корневую директорию в путь для импорта конфигурации
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

class CORSHTTPRequestHandler(SimpleHTTPRequestHandler):
    """HTTP обработчик с поддержкой CORS для Swagger UI"""
    
    def end_headers(self):
        """Добавляем CORS заголовки"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()
    
    def do_OPTIONS(self):
        """Обрабатываем preflight запросы"""
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        """Переопределяем GET для корректной работы с YAML файлами"""
        if self.path.endswith('.yaml') or self.path.endswith('.yml'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/x-yaml')
            self.end_headers()
            
            file_path = self.path.lstrip('/')
            if os.path.exists(file_path):
                with open(file_path, 'rb') as file:
                    self.wfile.write(file.read())
            else:
                self.send_error(404, "File not found")
        else:
            super().do_GET()
    
    def log_message(self, format, *args):
        """Переопределяем логирование для более чистого вывода"""
        timestamp = time.strftime('[%d/%b/%Y %H:%M:%S]')
        print(f"{timestamp} {format % args}")

def check_main_api_server():
    """Проверяем, работает ли основной API сервер"""
    try:
        import requests
        response = requests.get('http://localhost:5000/api/egg/273065571', timeout=2)
        return response.status_code == 200
    except:
        return False

def print_startup_info(port, auto_open=True):
    """Выводим информацию о запуске"""
    print("="*60)
    print("🥚 Telepets API - Swagger Documentation Server")
    print("="*60)
    print(f"📄 Документация доступна по адресу: http://localhost:{port}")
    print(f"🌐 Swagger UI: http://localhost:{port}/swagger-ui.html")
    print(f"📋 OpenAPI спецификация: http://localhost:{port}/telepets-api.yaml")
    print()
    
    # Проверяем основной API сервер
    if check_main_api_server():
        print("✅ Основной API сервер работает (localhost:5000)")
        print("🔬 Можно тестировать API запросы через Swagger UI")
    else:
        print("⚠️  Основной API сервер не запущен (localhost:5000)")
        print("💡 Запустите основное приложение командой: python run_webapp.py")
        print("   или python src/webapp.py для полного тестирования")
    
    print()
    print("🛠️  Полезные команды для тестирования:")
    print("   curl http://localhost:5000/api/egg/273065571")
    print("   curl -X POST http://localhost:5000/api/egg/273065571/warm")
    print("   curl -X POST http://localhost:5000/api/egg/273065571/fix_egg")
    print()
    print("⏹️  Для остановки нажмите Ctrl+C")
    print("="*60)

def start_server(port=8080, auto_open=True):
    """Запускаем сервер документации"""
    # Меняем рабочую директорию на каталог с документацией
    os.chdir(current_dir)
    
    # Создаем сервер
    server_address = ('', port)
    httpd = HTTPServer(server_address, CORSHTTPRequestHandler)
    
    print_startup_info(port, auto_open)
    
    # Открываем браузер через несколько секунд (в отдельном потоке)
    if auto_open:
        def open_browser():
            time.sleep(2)  # Ждем запуска сервера
            webbrowser.open(f'http://localhost:{port}/swagger-ui.html')
        
        browser_thread = threading.Thread(target=open_browser, daemon=True)
        browser_thread.start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Остановка сервера документации...")
        httpd.shutdown()
        print("✅ Сервер остановлен")

def main():
    """Главная функция"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Swagger Documentation Server для Telepets API',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:
  python swagger_server.py                    # Запуск на порту 8080 с автооткрытием браузера
  python swagger_server.py --port 9000       # Запуск на порту 9000  
  python swagger_server.py --no-browser      # Запуск без автооткрытия браузера
        """
    )
    
    parser.add_argument(
        '--port', '-p',
        type=int,
        default=8080,
        help='Порт для сервера документации (по умолчанию: 8080)'
    )
    
    parser.add_argument(
        '--no-browser', '-n',
        action='store_true',
        help='Не открывать браузер автоматически'
    )
    
    args = parser.parse_args()
    
    try:
        start_server(port=args.port, auto_open=not args.no_browser)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Ошибка: Порт {args.port} уже используется")
            print(f"💡 Попробуйте другой порт: python swagger_server.py --port {args.port + 1}")
        else:
            print(f"❌ Ошибка запуска сервера: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 