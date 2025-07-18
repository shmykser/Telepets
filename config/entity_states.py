"""
Конфигурация состояний сущностей (яйца, особи)
Архитектура State Machine для масштабируемого управления состояниями
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from enum import Enum

class EntityType(Enum):
    EGG = "egg"
    CREATURE = "creature"

class EggState(Enum):
    INCUBATING = "incubating"
    HATCHING = "hatching" 
    HATCHED = "hatched"
    DEAD = "dead"

class CreatureState(Enum):
    BABY = "baby"
    TEEN = "teen"
    ADULT = "adult"

@dataclass
class StateConfig:
    """Конфигурация для конкретного состояния"""
    # UI компоненты
    show_temperature: bool = False
    show_swipe_controls: bool = False
    show_click_controls: bool = False
    show_progress_bar: bool = False
    show_timer: bool = False
    show_reset_button: bool = False
    
    # Игровая механика
    can_warm: bool = False
    can_click: bool = False
    can_die_from_temperature: bool = False
    has_animation: bool = True
    
    # Сообщения и текст
    notification_message: str = ""
    progress_label: str = ""
    timer_label: str = ""
    
    # Переходы состояний
    auto_transitions: Dict[str, str] = None
    manual_transitions: List[str] = None
    
    def __post_init__(self):
        if self.auto_transitions is None:
            self.auto_transitions = {}
        if self.manual_transitions is None:
            self.manual_transitions = []

# ========================================
# КОНФИГУРАЦИЯ СОСТОЯНИЙ ЯЙЦА
# ========================================

EGG_STATES = {
    EggState.INCUBATING: StateConfig(
        # UI
        show_temperature=True,
        show_swipe_controls=True,
        show_progress_bar=True,
        show_timer=True,
        show_reset_button=True,  # Разрешаем сброс в состоянии инкубации
        
        # Механика
        can_warm=True,
        can_die_from_temperature=True,
        has_animation=True,
        
        # Текст
        notification_message="Поддерживайте температуру свайпами!",
        progress_label="Прогресс инкубации",
        timer_label="До вылупления",
        
        # Переходы
        auto_transitions={
            "timer_zero": EggState.HATCHING.value,
            "overheat": EggState.DEAD.value,
            "freeze": EggState.DEAD.value
        },
        
        # Ручные переходы
        manual_transitions=[EggState.INCUBATING.value]  # Разрешаем сброс к инкубации
    ),
    
    EggState.HATCHING: StateConfig(
        # UI
        show_click_controls=True,
        show_progress_bar=True, 
        show_timer=True,
        show_reset_button=True,  # Разрешаем сброс в состоянии вылупления
        
        # Механика
        can_click=True,
        has_animation=True,
        
        # Текст
        notification_message="Кликайте по яйцу для вылупления!",
        progress_label="Прогресс вылупления",
        timer_label="Время на вылупление",
        
        # Переходы
        auto_transitions={
            "max_clicks": "hatched",  # Переход к существу
            "timeout": EggState.DEAD.value
        },
        
        # Ручные переходы
        manual_transitions=[EggState.INCUBATING.value]  # Разрешаем сброс к инкубации
    ),
    
    EggState.HATCHED: StateConfig(
        # UI
        show_reset_button=True,
        
        # Механика
        has_animation=True,
        
        # Текст
        notification_message="Питомец вылупился! Начните новый цикл.",
        
        # Переходы
        manual_transitions=[EggState.INCUBATING.value]
    ),
    
    EggState.DEAD: StateConfig(
        # UI
        show_reset_button=True,
        
        # Механика
        has_animation=False,
        
        # Текст
        notification_message="Яйцо погибло. Начните заново.",
        
        # Переходы
        manual_transitions=[EggState.INCUBATING.value]
    )
}

# ========================================
# КОНФИГУРАЦИЯ СОСТОЯНИЙ ОСОБИ (будущее)
# ========================================

CREATURE_STATES = {
    CreatureState.BABY: StateConfig(
        show_progress_bar=True,
        show_timer=True,
        has_animation=True,
        notification_message="Ваш питомец родился! Ухаживайте за ним.",
        progress_label="Рост детеныша",
        timer_label="До подросткового возраста"
    ),
    
    CreatureState.TEEN: StateConfig(
        show_progress_bar=True,
        show_timer=True, 
        has_animation=True,
        notification_message="Питомец растет! Тренируйте его способности.",
        progress_label="Развитие подростка",
        timer_label="До взрослого возраста"
    ),
    
    CreatureState.ADULT: StateConfig(
        has_animation=True,
        notification_message="Поздравляем! Ваш питомец полностью вырос!",
        # Взрослая особь не имеет таймеров развития
    )
}

# ========================================
# СЛУЖЕБНЫЕ ФУНКЦИИ
# ========================================

def get_state_config(entity_type: EntityType, state: str) -> StateConfig:
    """Получить конфигурацию для конкретного состояния"""
    if entity_type == EntityType.EGG:
        return EGG_STATES.get(EggState(state))
    elif entity_type == EntityType.CREATURE:
        return CREATURE_STATES.get(CreatureState(state))
    return None

def get_valid_states(entity_type: EntityType) -> List[str]:
    """Получить список валидных состояний для типа сущности"""
    if entity_type == EntityType.EGG:
        return [state.value for state in EggState]
    elif entity_type == EntityType.CREATURE:
        return [state.value for state in CreatureState]
    return []

def can_transition(entity_type: EntityType, from_state: str, to_state: str, transition_type: str = "manual") -> bool:
    """Проверить возможность перехода между состояниями"""
    config = get_state_config(entity_type, from_state)
    if not config:
        return False
        
    if transition_type == "auto":
        return to_state in config.auto_transitions.values()
    else:
        return to_state in config.manual_transitions

# Импортируем константы из основного файла настроек
from config.settings import HATCHING_CLICKS_REQUIRED, HATCHING_TIME_LIMIT 