/**
 * Внутренняя функция для воспроизведения звука
 * @param checkSettings - проверять ли настройки (для админов - да, для посетителей - нет)
 */
function playPrimeCoderSound(checkSettings: boolean = true): void {
  try {
    // Проверяем, включены ли звуки (настройка из localStorage) - только для админов
    if (checkSettings) {
      const soundEnabled = localStorage.getItem('notificationSoundEnabled') !== 'false';
      if (!soundEnabled) return;
    }

    // Создаем AudioContext для фоновой мелодии
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Фоновая мелодия - мягкая и элегантная
    const frequencies = [
      261.63,  // C4 - начало
      329.63,  // E4
      392.00,  // G4
      523.25   // C5 - завершение (мажорное трезвучие)
    ];
    
    // Воспроизводим фоновую мелодию
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Мягкий синусоидальный звук для фона
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        
        // Тихая фоновая мелодия, чтобы не перебивать голос
        const now = audioContext.currentTime;
        const duration = 0.3;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.08, now + 0.01); // Тише для фона
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
      }, index * 100); // Медленнее для плавности
    });
    
    // Закрываем контекст после завершения
    setTimeout(() => {
      audioContext.close().catch(() => {
        // Игнорируем ошибки закрытия
      });
    }, frequencies.length * 100 + 500);
  } catch (error) {
    // Если Web Audio API не поддерживается, используем fallback
    console.warn('Web Audio API not available, using fallback sound');
    playFallbackSound();
  }
}

/**
 * Персонализированный звук для PrimeCoder
 * Мелодичный фоновый звук уведомления
 * Для админов - проверяет настройки, для посетителей - всегда воспроизводится
 */
export function playNotificationSound(): void {
  playPrimeCoderSound(true); // Проверяем настройки для админов
}

/**
 * Звук уведомления для посетителей сайта при новом сообщении в чате
 * Использует тот же звук, что и для админов - единый брендовый звук Prime Coder
 * Всегда воспроизводится (не проверяет настройки админа)
 */
export function playChatNotificationSound(): void {
  playPrimeCoderSound(false); // Не проверяем настройки для посетителей
}

/**
 * Резервный вариант звука через HTML5 Audio
 * Использует встроенный синтезированный звук
 */
function playFallbackSound(): void {
  try {
    // Создаем простой звук через Web Audio API с одной нотой
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 440; // Ля (A4)
    
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    oscillator.start(now);
    oscillator.stop(now + 0.4);
    
    setTimeout(() => {
      audioContext.close().catch(() => {});
    }, 500);
  } catch (error) {
    // Если и это не работает, просто игнорируем
    console.warn('Could not play notification sound');
  }
}

/**
 * Включает/выключает звуковые уведомления
 */
export function setNotificationSoundEnabled(enabled: boolean): void {
  localStorage.setItem('notificationSoundEnabled', enabled.toString());
}

/**
 * Проверяет, включены ли звуковые уведомления
 */
export function isNotificationSoundEnabled(): boolean {
  return localStorage.getItem('notificationSoundEnabled') !== 'false';
}

