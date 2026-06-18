// ============================================
// КНОПКИ ПРОКРУТКИ СТРАНИЦЫ (вверх / вниз)
// ============================================
(function () {
    const SCROLL_THRESHOLD = 300; // px от края, после которого кнопка появляется

    let topBtn, bottomBtn;

    // Плавная прокрутка к началу или концу страницы
    function scrollPageTo(target) {
        const position = target === 'top' ? 0 : getDocumentHeight();
        window.scrollTo({ top: position, behavior: 'smooth' });
    }

    // Полная высота документа с учётом прокрутки
    function getDocumentHeight() {
        return Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight,
            document.body.clientHeight,
            document.documentElement.clientHeight
        ) - window.innerHeight;
    }

    function updateButtons() {
        if (!topBtn || !bottomBtn) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const maxScroll = getDocumentHeight();

        // Кнопка "вверх" — видна, если прокручено больше порога
        if (scrollTop > SCROLL_THRESHOLD) {
            topBtn.classList.add('visible');
        } else {
            topBtn.classList.remove('visible');
        }

        // Кнопка "вниз" — видна, если есть куда прокручивать и не в самом низу
        if (maxScroll - scrollTop > SCROLL_THRESHOLD) {
            bottomBtn.classList.add('visible');
        } else {
            bottomBtn.classList.remove('visible');
        }
    }

    function init() {
        topBtn = document.getElementById('scrollTopBtn');
        bottomBtn = document.getElementById('scrollBottomBtn');
        if (!topBtn || !bottomBtn) return;

        window.addEventListener('scroll', updateButtons, { passive: true });
        window.addEventListener('resize', updateButtons);
        updateButtons();
    }

    // Экспорт в глобальную область (используется в onclick в HTML)
    window.scrollPageTo = scrollPageTo;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
