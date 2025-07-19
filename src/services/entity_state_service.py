"""
Сервис управления состояниями сущностей
Реализует паттерн State Machine для яйца и будущих особей
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
import logging

from config.entity_states import (
    EntityType, EggState, CreatureState, 
    get_state_config, get_valid_states, can_transition
)
from config.settings import (
    HATCHING_CLICKS_REQUIRED, HATCHING_TIME_LIMIT, FINAL_INCUBATION_TIME,
    # Температурные настройки
    CRITICAL_LOW_TEMP, CRITICAL_HIGH_TEMP,
    DEAD_LOW_TEMP, DEAD_HIGH_TEMP,
    NORMAL_TEMP_MIN, NORMAL_TEMP_MAX,
    MIN_TEMP, MAX_TEMP
)
from config.messages import get_entity_state_message

logger = logging.getLogger(__name__)

class EntityStateService:
    """Сервис для управления состояниями сущностей"""
    
    @staticmethod
    def get_entity_ui_config(entity_type: str, state: str) -> Dict[str, Any]:
        """
        Получить конфигурацию UI для текущего состояния сущности
        
        Returns:
            Dict с параметрами отображения UI компонентов
        """
        try:
            entity_enum = EntityType(entity_type)
            config = get_state_config(entity_enum, state)
            
            if not config:
                logger.error(f"No config found for {entity_type}/{state}")
                return {}
                
            return {
                # UI компоненты
                'show_temperature': config.show_temperature,
                'show_swipe_controls': config.show_swipe_controls,
                'show_click_controls': config.show_click_controls,
                'show_progress_bar': config.show_progress_bar,
                'show_timer': config.show_timer,
                'show_reset_button': config.show_reset_button,
                
                # Игровая механика
                'can_warm': config.can_warm,
                'can_click': config.can_click,
                'can_die_from_temperature': config.can_die_from_temperature,
                'has_animation': config.has_animation,
                
                # Текст и сообщения (заполняются из NotificationService)
                'notification_message': EntityStateService._get_notification_message(entity_type, state),
                'progress_label': config.progress_label,
                'timer_label': config.timer_label,
                
                # Доступные действия
                'available_actions': EntityStateService._get_available_actions(config)
            }
        except ValueError as e:
            logger.error(f"Invalid entity type or state: {e}")
            return {}
    
    @staticmethod
    def _get_available_actions(config) -> list:
        """Определить доступные действия для текущего состояния"""
        actions = []
        if config.can_warm:
            actions.append('swipe_warm')
        if config.can_click:
            actions.append('click_hatch')
        if config.show_reset_button:
            actions.append('reset')
        return actions
    
    @staticmethod
    def _get_notification_message(entity_type: str, state: str) -> str:
        """Получить сообщение уведомления для состояния"""
        # Используем централизованные сообщения из config/messages.py
        return get_entity_state_message(entity_type, state)
    
    @staticmethod
    def check_auto_transitions(entity_data: Dict[str, Any]) -> Optional[str]:
        """
        Проверить необходимость автоматических переходов состояний
        
        Args:
            entity_data: Данные сущности из БД
            
        Returns:
            Новое состояние если нужен переход, иначе None
        """
        entity_type = entity_data.get('entity_type', 'egg')
        current_state = entity_data.get('state', 'incubating')
        
        try:
            entity_enum = EntityType(entity_type)
            config = get_state_config(entity_enum, current_state)
            
            if not config or not config.auto_transitions:
                return None
                
            # Проверка переходов для яйца
            if entity_type == 'egg':
                return EntityStateService._check_egg_transitions(entity_data, config)
                
        except ValueError:
            logger.error(f"Invalid entity type: {entity_type}")
            
        return None
    
    @staticmethod
    def _check_egg_transitions(entity_data: Dict[str, Any], config) -> Optional[str]:
        """Проверить переходы состояний для яйца"""
        current_state = entity_data.get('state', 'incubating')
        temperature = entity_data.get('temperature', 37)
        
        # Проверка смерти от температуры (только в состоянии инкубации)
        if current_state == 'incubating':
            # Смертельные температуры - мгновенный переход в dead
            if temperature <= DEAD_LOW_TEMP:  # Заморозка
                logger.warning(f"🥶 Яйцо погибло от холода! Температура: {temperature}°C")
                return config.auto_transitions.get('freeze')
            elif temperature >= DEAD_HIGH_TEMP:  # Перегрев
                logger.warning(f"🔥 Яйцо погибло от перегрева! Температура: {temperature}°C")
                return config.auto_transitions.get('overheat')
                
            # Проверка завершения инкубации
            if EntityStateService._is_incubation_complete(entity_data):
                return config.auto_transitions.get('timer_zero')
                
        # Проверка завершения вылупления
        elif current_state == 'hatching':
            # Проверка тайм-аута вылупления
            if EntityStateService._is_hatching_timeout(entity_data):
                return config.auto_transitions.get('timeout')
                
            # Проверка достижения максимального числа кликов
            hatching_clicks = entity_data.get('hatching_clicks', 0)
            if hatching_clicks >= HATCHING_CLICKS_REQUIRED:
                return config.auto_transitions.get('max_clicks')  # "hatched"
                
        return None
    
    @staticmethod
    def _is_incubation_complete(entity_data: Dict[str, Any]) -> bool:
        """Проверить завершение инкубации"""
        start_time = entity_data.get('start_time')
        if not start_time:
            return False
            
        try:
            start_dt = datetime.fromisoformat(start_time)
            now = datetime.utcnow()
            elapsed = (now - start_dt).total_seconds()
            return elapsed >= FINAL_INCUBATION_TIME
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def _is_hatching_timeout(entity_data: Dict[str, Any]) -> bool:
        """Проверить тайм-аут вылупления"""
        hatching_start_time = entity_data.get('hatching_start_time')
        if not hatching_start_time:
            return False
            
        try:
            start_dt = datetime.fromisoformat(hatching_start_time)
            now = datetime.utcnow()
            elapsed = (now - start_dt).total_seconds()
            return elapsed >= HATCHING_TIME_LIMIT
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def calculate_progress_data(entity_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Рассчитать данные прогресса для текущего состояния
        
        Returns:
            Dict с данными прогресса (progress, time_remaining, etc.)
        """
        entity_type = entity_data.get('entity_type', 'egg')
        state = entity_data.get('state', 'incubating')
        
        if entity_type == 'egg':
            return EntityStateService._calculate_egg_progress(entity_data, state)
        elif entity_type == 'creature':
            return EntityStateService._calculate_creature_progress(entity_data, state)
            
        return {}
    
    @staticmethod
    def _calculate_egg_progress(entity_data: Dict[str, Any], state: str) -> Dict[str, Any]:
        """Рассчитать прогресс для яйца"""
        if state == 'incubating':
            return EntityStateService._calculate_incubation_progress(entity_data)
        elif state == 'hatching':
            return EntityStateService._calculate_hatching_progress(entity_data)
        elif state == 'dead':
            return {'progress': 0, 'time_remaining': 0}
            
        return {}
    
    @staticmethod
    def _calculate_incubation_progress(entity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Рассчитать прогресс инкубации"""
        start_time = entity_data.get('start_time')
        if not start_time:
            return {'progress': 0, 'time_remaining': FINAL_INCUBATION_TIME}
            
        try:
            start_dt = datetime.fromisoformat(start_time)
            now = datetime.utcnow()
            elapsed = (now - start_dt).total_seconds()
            
            progress = min(100.0, (elapsed / FINAL_INCUBATION_TIME) * 100)
            time_remaining = max(0, FINAL_INCUBATION_TIME - elapsed)
            
            return {
                'progress': round(progress, 1),
                'time_remaining': time_remaining,
                'formatted_time': EntityStateService._format_time(time_remaining)
            }
        except (ValueError, TypeError):
            return {'progress': 0, 'time_remaining': FINAL_INCUBATION_TIME}
    
    @staticmethod
    def _calculate_hatching_progress(entity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Рассчитать прогресс вылупления"""
        hatching_clicks = entity_data.get('hatching_clicks', 0)
        hatching_start_time = entity_data.get('hatching_start_time')
        
        # Прогресс по кликам
        click_progress = min(100.0, (hatching_clicks / HATCHING_CLICKS_REQUIRED) * 100)
        clicks_remaining = max(0, HATCHING_CLICKS_REQUIRED - hatching_clicks)
        
        # Оставшееся время на вылупление
        time_remaining = HATCHING_TIME_LIMIT
        if hatching_start_time:
            try:
                start_dt = datetime.fromisoformat(hatching_start_time)
                now = datetime.utcnow()
                elapsed = (now - start_dt).total_seconds()
                time_remaining = max(0, HATCHING_TIME_LIMIT - elapsed)
            except (ValueError, TypeError):
                pass
        
        # Определение стадии трещин
        crack_stage = EntityStateService._get_crack_stage(hatching_clicks)
        
        return {
            'progress': round(click_progress, 1),
            'time_remaining': time_remaining,
            'formatted_time': EntityStateService._format_time(time_remaining),
            'hatching_clicks': hatching_clicks,
            'required_clicks': HATCHING_CLICKS_REQUIRED,
            'clicks_remaining': clicks_remaining,
            'crack_stage': crack_stage
        }
    
    @staticmethod
    def _calculate_creature_progress(entity_data: Dict[str, Any], state: str) -> Dict[str, Any]:
        """Рассчитать прогресс для особи (заготовка для будущего)"""
        # TODO: Реализовать когда появятся особи
        return {'progress': 100, 'time_remaining': 0}
    
    @staticmethod
    def _get_crack_stage(clicks: int) -> Optional[str]:
        """Определить стадию трещин на яйце"""
        if clicks >= 900:
            return 'breaking'
        elif clicks >= 600:
            return 'large_crack'
        elif clicks >= 300:
            return 'medium_crack'
        elif clicks >= 100:
            return 'small_crack'
        return None
    
    @staticmethod
    def _format_time(seconds: float) -> str:
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
    
    @staticmethod
    def validate_action(entity_data: Dict[str, Any], action: str) -> Tuple[bool, str]:
        """
        Валидировать возможность выполнения действия
        
        Returns:
            (is_valid, error_message)
        """
        entity_type = entity_data.get('entity_type', 'egg')
        state = entity_data.get('state', 'incubating')
        
        try:
            entity_enum = EntityType(entity_type)
            config = get_state_config(entity_enum, state)
            
            if not config:
                return False, f"Invalid state: {state}"
                
            # Проверка конкретных действий
            if action == 'swipe_warm' and not config.can_warm:
                return False, "Warming not allowed in current state"
            elif action == 'click_hatch' and not config.can_click:
                return False, "Clicking not allowed in current state"
            elif action == 'reset' and not config.show_reset_button:
                return False, "Reset not allowed in current state"
                
            return True, ""
            
        except ValueError:
            return False, f"Invalid entity type: {entity_type}" 

    @staticmethod
    def check_temperature_status(entity_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Проверить статус температуры и вернуть информацию для уведомлений
        
        Returns:
            Dict с информацией о статусе температуры
        """
        temperature = entity_data.get('temperature', 37)
        current_state = entity_data.get('state', 'incubating')
        
        status = {
            'temperature': temperature,
            'status': 'normal',
            'message': None,
            'is_critical': False,
            'is_deadly': False,
            'requires_action': False
        }
        
        # Проверка смертельных температур
        if temperature <= DEAD_LOW_TEMP:
            status.update({
                'status': 'deadly_cold',
                'message': f'🥶 КРИТИЧЕСКИ ХОЛОДНО! Температура: {temperature}°C',
                'is_deadly': True,
                'requires_action': True
            })
        elif temperature >= DEAD_HIGH_TEMP:
            status.update({
                'status': 'deadly_hot',
                'message': f'🔥 КРИТИЧЕСКИ ГОРЯЧО! Температура: {temperature}°C',
                'is_deadly': True,
                'requires_action': True
            })
        
        # Проверка критических температур (только если не смертельные)
        elif temperature <= CRITICAL_LOW_TEMP:
            status.update({
                'status': 'critical_cold',
                'message': f'❄️ Очень холодно! Температура: {temperature}°C. Свайпайте для нагрева!',
                'is_critical': True,
                'requires_action': True
            })
        elif temperature >= CRITICAL_HIGH_TEMP:
            status.update({
                'status': 'critical_hot',
                'message': f'🌡️ Очень горячо! Температура: {temperature}°C',
                'is_critical': True,
                'requires_action': True
            })
        
        # Проверка нормальных температур
        elif NORMAL_TEMP_MIN <= temperature <= NORMAL_TEMP_MAX:
            status.update({
                'status': 'normal',
                'message': f'✅ Нормальная температура: {temperature}°C',
                'is_critical': False,
                'is_deadly': False,
                'requires_action': False
            })
        
        # Проверка граничных температур (между нормальной и критической)
        elif temperature < NORMAL_TEMP_MIN:
            status.update({
                'status': 'low',
                'message': f'🌡️ Прохладно: {temperature}°C',
                'is_critical': False,
                'requires_action': False
            })
        elif temperature > NORMAL_TEMP_MAX:
            status.update({
                'status': 'high',
                'message': f'🌡️ Тепло: {temperature}°C',
                'is_critical': False,
                'requires_action': False
            })
        
        return status 