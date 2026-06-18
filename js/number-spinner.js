// ============================================
// КАСТОМНЫЕ СТРЕЛОЧКИ ЧИСЛОВОГО ПОЛЯ (number-spinner)
// ============================================
(function () {
    function applyStep(input, step) {
        if (!input) return;
        const min = input.min !== '' ? parseFloat(input.min) : null;
        const max = input.max !== '' ? parseFloat(input.max) : null;
        const current = input.value === '' ? (step > 0 ? (min !== null ? min - 1 : 0) : 0) : parseFloat(input.value);
        let next = isNaN(current) ? 0 : current + step;

        if (min !== null && next < min) next = min;
        if (max !== null && next > max) next = max;

        input.value = next;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function setup() {
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.number-spinner-btn');
            if (!btn) return;
            const targetId = btn.getAttribute('data-target');
            if (!targetId) return;
            const step = parseFloat(btn.getAttribute('data-step') || '1');
            const input = document.getElementById(targetId);
            applyStep(input, step);
        });

        // Долгое нажатие / удержание — повтор с ускорением
        let holdTimer = null;
        let holdInterval = null;

        function startHold(btn) {
            stopHold();
            holdTimer = setTimeout(() => {
                holdInterval = setInterval(() => {
                    const targetId = btn.getAttribute('data-target');
                    const step = parseFloat(btn.getAttribute('data-step') || '1');
                    const input = document.getElementById(targetId);
                    if (input) applyStep(input, step);
                }, 80);
            }, 400);
        }

        function stopHold() {
            if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
            if (holdInterval) { clearInterval(holdInterval); holdInterval = null; }
        }

        document.addEventListener('mousedown', function (e) {
            const btn = e.target.closest('.number-spinner-btn');
            if (!btn) return;
            startHold(btn);
        });
        document.addEventListener('mouseup', stopHold);
        document.addEventListener('mouseleave', stopHold);

        // Сенсорные устройства
        document.addEventListener('touchstart', function (e) {
            const btn = e.target.closest('.number-spinner-btn');
            if (!btn) return;
            startHold(btn);
        }, { passive: true });
        document.addEventListener('touchend', stopHold);
        document.addEventListener('touchcancel', stopHold);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
})();
