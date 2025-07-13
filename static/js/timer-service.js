// Сервис таймера - логика нагрева яйца и API запросов

// Нагрев яйца
async function warmEgg() {
    if (!currentEggData || !userId || currentEggData.status === 'dead') return;
    
    try {
        const response = await fetch(`/api/egg/${userId}/warm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Анимация нагрева
            const egg = document.getElementById('egg');
            egg.classList.add('warming');
            setTimeout(() => egg.classList.remove('warming'), WARMING_ANIMATION_DURATION);
            
            // Обновляем данные
            currentEggData.temperature = result.temperature;
            currentEggData.status = result.status;
            
            if (result.status === 'dead') {
                alert(result.message);
                renderEgg(currentEggData); // Перерисовываем с новым статусом
            } else {
                // Обновляем отображение температуры
                const tempElement = document.querySelector('.temperature');
                if (tempElement) {
                    tempElement.textContent = `🌡️ ${result.temperature > 0 ? '+' : ''}${result.temperature}°C`;
                }
                // Перезагружаем данные яйца для обновления статуса таймера
                loadEggData();
            }
        }
    } catch (error) {
        console.error('Error warming egg:', error);
    }
} 