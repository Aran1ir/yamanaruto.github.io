// ============================================
// РАССЕНГАН — логика загрузочного экрана
// ============================================
function initRasenganLoader() {
    const loader = document.getElementById('rasengan-loader');
    const text = document.getElementById('rasenganText');
    const particlesContainer = document.getElementById('chakraParticles');

    if (!loader) return;

    // Создание частиц чакры
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'chakra-particle';
        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.random() * 100;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');
        particle.style.left = '50%';
        particle.style.top = '50%';
        particle.style.animationDuration = (1 + Math.random() * 2) + 's';
        particle.style.animationDelay = Math.random() * 2 + 's';
        particlesContainer.appendChild(particle);
    }

    const texts = ['', '', '', ''];

    let textIndex = 0;
    const textInterval = setInterval(() => {
        textIndex++;
        if (textIndex < texts.length) {
            text.style.opacity = '0';
            text.style.transform = 'translateY(10px)';
            setTimeout(() => {
                text.textContent = texts[textIndex];
                text.style.transition = 'all 0.5s ease';
                text.style.opacity = '1';
                text.style.transform = 'translateY(0)';
            }, 300);
        }
    }, 900);

    setTimeout(() => {
        clearInterval(textInterval);
        loader.classList.add('exploding');

        setTimeout(() => {
            loader.classList.add('hidden');
            setTimeout(() => {
                loader.remove();
            }, 1500);
        }, 1000);
    }, 4200);
}

function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.opacity = Math.random() * 0.5 + 0.2;
        container.appendChild(particle);
    }
}
