import logging
from aiogram import Bot, Dispatcher, types
from aiogram.utils import executor
from config import BOT_TOKEN
from db import init_db, get_user, add_user, add_egg, get_egg
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from settings import MESSAGES, TEST_MODE, DEBUG_MODE

logging.basicConfig(level=logging.INFO)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(bot)

@dp.message_handler(commands=['start'])
async def start_handler(message: types.Message):
    user = get_user(message.from_user.id)
    if not user:
        add_user(
            message.from_user.id,
            message.from_user.username,
            message.from_user.first_name,
            message.from_user.last_name
        )
        add_egg(message.from_user.id)
        await message.answer(MESSAGES['EGG_CREATED'])
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
            await message.answer(MESSAGES['EGG_NOT_FOUND'])

@dp.message_handler(commands=['egg'])
async def egg_handler(message: types.Message):
    user = get_user(message.from_user.id)
    if not user:
        await message.answer(MESSAGES['REGISTER_FIRST'])
        return
    
    egg = get_egg(message.from_user.id)
    if not egg:
        await message.answer(MESSAGES['EGG_NOT_FOUND'])
        return
    
    # Показываем информацию о яйце в чате
    msg = (
        f'🥚 **Ваше яйцо:**\n\n'
        f'📊 **Прогресс:** {egg[6]:.1f}%\n'
        f'🌡️ **Температура:** {egg[5]}°C\n'
        f'📝 **Статус:** {egg[3]}\n'
        f'🕐 **Создано:** {egg[2][:10]}\n\n'
        f'_Web App доступен по адресу: http://localhost:5000_'
    )
    
    await message.answer(msg, parse_mode='Markdown')

if __name__ == '__main__':
    if TEST_MODE:
        print('=== РЕЖИМ ТЕСТИРОВАНИЯ ===')
        print('Telegram Bot запущен в тестовом режиме')
        print('========================')
    
    init_db()
    executor.start_polling(dp, skip_updates=True) 