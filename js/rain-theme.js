// ============================================
// ДОЖДЕВАЯ ТЕМА
// ============================================
let isRainTheme = false;
let rainInterval = null;

function toggleRainTheme() {
    isRainTheme = !isRainTheme;
    document.body.classList.toggle('rain-theme', isRainTheme);

    if (isRainTheme) {
        startRain();
        playRainThemeMusic();
        localStorage.setItem(THEME_STORAGE_KEY, 'rain');
    } else {
        stopRain();
        stopRainThemeMusic();
        localStorage.setItem(THEME_STORAGE_KEY, 'default');
    }
}

function playRainThemeMusic() {
    const audio = document.getElementById('rainThemeAudio');
    if (audio) {
        audio.volume = 0.4;
        audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.log('Audio autoplay blocked, waiting for user interaction');
            });
        }
    }
}

function stopRainThemeMusic() {
    const audio = document.getElementById('rainThemeAudio');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

function startRain() {
    const container = document.getElementById('rainContainer');
    if (!container) return;

    container.innerHTML = '';

    const dropCount = 200;
    for (let i = 0; i < dropCount; i++) {
        const drop = createRainDrop(container, i);
        if (drop && Math.random() > 0.3) {
            const randomTop = Math.random() * window.innerHeight;
            drop.style.top = randomTop + 'px';
            drop.style.animationDelay = '0s';
        }
    }

    rainInterval = setInterval(() => {
        if (!isRainTheme) return;
        for (let i = 0; i < 5; i++) {
            createRainDrop(container, Date.now() + i);
        }
        const drops = container.querySelectorAll('.rain-drop');
        if (drops.length > 400) {
            for (let i = 0; i < 10; i++) {
                if (drops[i]) drops[i].remove();
            }
        }
    }, 100);
}

function createRainDrop(container, index) {
    const drop = document.createElement('div');
    drop.className = 'rain-drop';

    const left = Math.random() * 100;
    const height = 15 + Math.random() * 25;
    const duration = 0.5 + Math.random() * 0.8;
    const opacity = 0.3 + Math.random() * 0.5;

    const startTop = -(height + Math.random() * 100);

    drop.style.left = left + '%';
    drop.style.height = height + 'px';
    drop.style.top = startTop + 'px';
    drop.style.animationDuration = duration + 's';
    drop.style.animationDelay = '0s';
    drop.style.opacity = opacity;

    container.appendChild(drop);

    setTimeout(() => {
        if (drop.parentNode) {
            drop.remove();
        }
    }, duration * 1000 + 200);

    return drop;
}

function stopRain() {
    const container = document.getElementById('rainContainer');
    if (container) {
        container.innerHTML = '';
    }
    if (rainInterval) {
        clearInterval(rainInterval);
        rainInterval = null;
    }
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'rain') {
        isRainTheme = true;
        document.body.classList.add('rain-theme');
        startRain();
    }
}
