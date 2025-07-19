"""
Обновленное веб-приложение с поддержкой entity-based архитектуры
Поддерживает масштабируемое управление состояниями яиц и будущих особей
"""

from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import logging
import json

# Импорт новой entity-based системы
from src.entity_db import (
    get_entity, get_egg, transition_entity_state, 
    update_entity_temperature, increment_hatching_clicks, set_entity_parameters
)
from src.services.entity_state_service import EntityStateService
from config.entity_states import get_valid_states, EntityType
import os

# Получаем корневую директорию проекта
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__, 
           template_folder=os.path.join(ROOT_DIR, 'templates'),
           static_folder=os.path.join(ROOT_DIR, 'static'))
# Полная конфигурация CORS для разработки  
CORS(app, 
     origins="*",
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Accept", "Accept-Encoding", "Accept-Language", "X-Requested-With"],
     supports_credentials=False,
     send_wildcard=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validate_user_id(user_id):
    """Валидация user_id"""
    try:
        return isinstance(user_id, int) and user_id > 0
    except (ValueError, TypeError):
        return False

def format_time(seconds):
    """Форматировать время в читаемый вид"""
    if seconds <= 0:
        return "0:00:00"
    
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    else:
        return f"{minutes}:{secs:02d}"

def format_entity_response(entity):
    """Форматирует данные сущности для ответа API"""
    ui_config = entity.get('ui_config', {})
    return {
        # Основные данные
        'user_id': entity['user_id'],
        'entity_type': entity['entity_type'],
        'state': entity['state'],
        'temperature': entity.get('temperature', 37),
        'progress': entity.get('progress', 0),
        'time_remaining': entity.get('time_remaining', 0),
        'formatted_time_remaining': entity.get('formatted_time', '0:00'),
        'last_updated': entity.get('updated_at', ''),
        
        # UI конфигурация (что показывать/скрывать)
        'ui_config': ui_config,
        
        # Сообщение пользователю
        'message': ui_config.get('notification_message', ''),
        
        # Специфичные данные для состояния вылупления
        'hatching_clicks': entity.get('hatching_clicks', 0),
        'required_clicks': entity.get('required_clicks', 1000),
        'clicks_remaining': entity.get('clicks_remaining', 1000),
        'crack_stage': entity.get('crack_stage', None),
        'hatching_time_remaining': entity.get('time_remaining', 0) if entity['state'] == 'hatching' else None,
        'hatching_start_time': entity.get('hatching_start_time', None)
    }

@app.route('/api/egg/<int:user_id>', methods=['GET'])
def get_egg_data(user_id):
    """
    Получить данные сущности (совместимость с egg API)
    Теперь возвращает полную информацию о состоянии и UI конфигурации
    """
    if not validate_user_id(user_id):
        return jsonify({'error': 'Invalid user_id'}), 400
    
    try:
        # Получаем данные сущности с новой архитектурой
        entity = get_entity(user_id)
        if not entity:
            return jsonify({'error': 'Entity not found'}), 404
        
        # Используем общую функцию форматирования
        response_data = format_entity_response(entity)
        
        # Совместимость со старым API
        response_data['status'] = entity['state']  # Псевдоним для state
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error getting egg data: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/egg/<int:user_id>/warm', methods=['POST'])
def warm_egg(user_id):
    """
    Нагреть яйцо (свайп) - работает только в состоянии incubating
    """
    if not validate_user_id(user_id):
        return jsonify({'error': 'Invalid user_id'}), 400
    
    try:
        # Проверяем возможность действия
        entity = get_entity(user_id)
        if not entity:
            return jsonify({'error': 'Entity not found'}), 404
            
        is_valid, error_msg = EntityStateService.validate_action(entity, 'swipe_warm')
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Выполняем нагрев
        success = update_entity_temperature(user_id, delta=3)
        
        if success:
            # Получаем обновленные данные
            updated_entity = get_entity(user_id)
            return jsonify({
                'success': True, 
                'message': 'Яйцо нагрето!',
                'temperature': updated_entity['temperature'],
                'state': updated_entity['state'],
                'ui_config': updated_entity.get('ui_config', {})
            })
        else:
            return jsonify({'error': 'Failed to warm egg'}), 500
            
    except Exception as e:
        logger.error(f"Error warming egg: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/egg/<int:user_id>/click', methods=['POST'])
def click_egg(user_id):
    """
    Кликнуть по яйцу для вылупления - работает только в состоянии hatching
    """
    if not validate_user_id(user_id):
        return jsonify({'error': 'Invalid user_id'}), 400
    
    try:
        # Проверяем возможность действия
        entity = get_entity(user_id)
        if not entity:
            return jsonify({'error': 'Entity not found'}), 404
            
        is_valid, error_msg = EntityStateService.validate_action(entity, 'click_hatch')
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Выполняем клик
        click_result = increment_hatching_clicks(user_id)
        
        # Получаем обновленные данные
        updated_entity = get_entity(user_id)
        
        return jsonify({
            'success': True,
            'click_result': click_result,
            'egg_data': {
                'state': updated_entity['state'],
                'hatching_clicks': updated_entity.get('hatching_clicks', 0),
                'required_clicks': updated_entity.get('required_clicks', 1000),
                'crack_stage': updated_entity.get('crack_stage'),
                'progress': updated_entity.get('progress', 0),
                'time_remaining': updated_entity.get('time_remaining', 0),
                'ui_config': updated_entity.get('ui_config', {})
            }
        })
        
    except Exception as e:
        logger.error(f"Error clicking egg: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/egg/<int:user_id>/fix_egg', methods=['POST'])
def fix_egg(user_id):
    """
    Сбросить яйцо к начальному состоянию - работает только для dead состояния
    """
    if not validate_user_id(user_id):
        return jsonify({'error': 'Invalid user_id'}), 400
        
    try:
        # Проверяем возможность действия
        entity = get_entity(user_id)
        if not entity:
            return jsonify({'error': 'Entity not found'}), 404
            
        is_valid, error_msg = EntityStateService.validate_action(entity, 'reset')
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Выполняем сброс
        updated_entity = transition_entity_state(user_id, 'incubating')
        
        if updated_entity:
            return jsonify({
                'success': True, 
                'message': 'Яйцо сброшено к начальному состоянию',
                'entity_data': {
                    'state': updated_entity['state'],
                    'temperature': updated_entity['temperature'],
                    'progress': updated_entity.get('progress', 0),
                    'ui_config': updated_entity.get('ui_config', {})
                }
            })
        else:
            return jsonify({'success': False, 'error': 'Failed to reset egg'}), 500
            
    except Exception as e:
        logger.error(f"Error resetting egg: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/egg/<int:user_id>/set-parameters', methods=['PUT'])
def set_egg_test_parameters(user_id):
    """
    API для установки произвольных параметров сущности для тестирования
    Обновлен для работы с новой архитектурой состояний
    """
    if not validate_user_id(user_id):
        return jsonify({'error': 'Invalid user_id'}), 400
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Валидация параметров
        valid_params = {}
        
        if 'temperature' in data:
            try:
                temp = int(data['temperature'])
                if 1 <= temp <= 50:
                    valid_params['temperature'] = temp
                else:
                    return jsonify({'error': 'Temperature must be between 1 and 50'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid temperature value'}), 400
        
        if 'time_remaining' in data:
            try:
                time_rem = int(data['time_remaining'])
                if time_rem >= 0:
                    valid_params['time_remaining'] = time_rem
                else:
                    return jsonify({'error': 'Time remaining must be non-negative'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid time_remaining value'}), 400
        
        if 'state' in data:
            state = data['state']
            valid_states = get_valid_states(EntityType.EGG)
            if state in valid_states:
                valid_params['state'] = state
            else:
                return jsonify({'error': f'Invalid state. Must be one of: {valid_states}'}), 400
        
        # Применяем параметры
        if valid_params:
            success = set_entity_parameters(user_id, **valid_params)
            if success:
                # Получаем обновленные данные
                updated_entity = get_entity(user_id)
                return jsonify({
                    'success': True,
                    'message': 'Параметры сущности успешно обновлены',
                    'entity_data': {
                        'user_id': updated_entity['user_id'],
                        'entity_type': updated_entity['entity_type'],
                        'state': updated_entity['state'],
                        'temperature': updated_entity['temperature'],
                        'progress': updated_entity.get('progress', 0),
                        'time_remaining': updated_entity.get('time_remaining', 0),
                        'formatted_time': updated_entity.get('formatted_time', '0:00'),
                        'ui_config': updated_entity.get('ui_config', {}),
                        'hatching_clicks': updated_entity.get('hatching_clicks', 0),
                        'crack_stage': updated_entity.get('crack_stage')
                    }
                })
            else:
                return jsonify({'error': 'Failed to update entity parameters'}), 500
        else:
            return jsonify({'error': 'No valid parameters provided'}), 400
            
    except Exception as e:
        logger.error(f"Error setting entity parameters: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/egg/<int:user_id>/updates', methods=['GET'])
def get_egg_updates(user_id):
    """
    Server-Sent Events для реального времени
    Обновлен для работы с новой архитектурой
    """
    if not validate_user_id(user_id):
        return jsonify({'error': 'Invalid user_id'}), 400
    
    def generate():
        import time
        last_state = None
        last_temperature = None
        last_progress = None
        
        while True:
            try:
                # Получаем полные данные сущности
                entity = get_entity(user_id)
                if entity:
                    # Формируем полные данные в том же формате что и основной API
                    data = format_entity_response(entity)
                    
                    # Проверяем изменения для оптимизации
                    current_state = entity.get('state')
                    current_temp = entity.get('temperature')
                    current_progress = entity.get('progress', 0)
                    
                    # Отправляем данные если что-то изменилось или это первый запрос
                    if (last_state != current_state or 
                        last_temperature != current_temp or 
                        abs((last_progress or 0) - current_progress) > 0.1 or
                        last_state is None):
                        
                        yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
                        
                        last_state = current_state
                        last_temperature = current_temp
                        last_progress = current_progress
                
                time.sleep(2)  # Обновление каждые 2 секунды
                
            except Exception as e:
                logger.error(f"SSE error: {e}")
                yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
                break
    
    return app.response_class(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        }
    )

@app.route('/')
def index():
    """Главная страница"""
    return render_template('modern-index.html')


# Обработчик CORS preflight запросов
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response

@app.after_request
def after_request(response):
    """Добавляем CORS заголовки к каждому ответу"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 