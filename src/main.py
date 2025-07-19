import asyncio
import logging
from aiogram import Bot, Dispatcher, Router, F
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.filters import Command
import sys
import os

# Добавляем корневую директорию в путь
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from config.config import BOT_TOKEN
from src.db import init_db, get_user, add_user, add_egg, get_egg
from config.settings import TEST_MODE, DEBUG_MODE
from config.messages import get_message

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize bot and dispatcher
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
router = Router()

@router.message(Command("start"))
async def start_handler(message: Message):
    """Handle /start command"""
    user = get_user(message.from_user.id)
    if not user:
        add_user(
            message.from_user.id,
            message.from_user.username,
            message.from_user.first_name,
            message.from_user.last_name
        )
        add_egg(message.from_user.id)
        await message.answer(get_message('TELEGRAM', 'EGG_CREATED'))
    else:
        egg = get_egg(message.from_user.id)
        if egg:
            # egg: (user_id, egg_type, start_time, status, last_touch_time, temperature, progress)
            msg = (
                f'Ваше яйцо:\n'
                f'Тип: {egg[1]}\n'
                f'Статус: {egg[3]}\n'
                f'Температура: {egg[5]}°C\n'
                f'Прогресс инкубации: {egg[6]:.1f}%'
            )
            await message.answer(msg)
        else:
            await message.answer(get_message('TELEGRAM', 'EGG_NOT_FOUND'))

@router.message(Command("egg"))
async def egg_handler(message: Message):
    """Handle /egg command"""
    user = get_user(message.from_user.id)
    if not user:
        await message.answer(get_message('TELEGRAM', 'REGISTER_FIRST'))
        return
    
    egg = get_egg(message.from_user.id)
    if not egg:
        await message.answer(get_message('TELEGRAM', 'EGG_NOT_FOUND'))
        return
    
    # Show egg information in chat
    msg = (
        f'🥚 **Ваше яйцо:**\n\n'
        f'📊 **Прогресс:** {egg[6]:.1f}%\n'
        f'🌡️ **Температура:** {egg[5]}°C\n'
        f'📝 **Статус:** {egg[3]}\n'
        f'🕐 **Создано:** {egg[2][:10]}\n\n'
        f'_Web App доступен по адресу: http://localhost:5000_'
    )
    
    await message.answer(msg, parse_mode='Markdown')

# Register router with dispatcher
dp.include_router(router)

async def main():
    """Main function to start the bot"""
    if TEST_MODE:
        logger.info('=== РЕЖИМ ТЕСТИРОВАНИЯ ===')
        logger.info('Telegram Bot запущен в тестовом режиме')
        logger.info('========================')
    
    # Initialize database
    init_db()
    
    # Start polling
    logger.info("Starting bot...")
    await dp.start_polling(bot)

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Bot stopped with error: {e}") 