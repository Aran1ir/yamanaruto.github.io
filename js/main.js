// ============================================
// ИНИЦИАЛИЗАЦИЯ + обработчики модальных окон
// ============================================
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    if (modalId === 'arcEditModal') currentEditingArcId = null;
    if (modalId === 'charModal') currentCharArcId = null;
    if (modalId === 'openingModal') {
        currentOpeningArcId = null;
        editingOpeningId = null;
    }
    if (modalId === 'tierListSongModal') { editingTierListSongId = null; }
    if (modalId === 'addArcCharModal') { currentCharArcId = null; }
    if (modalId === 'editArcCharModal') {
        editingArcCharArcId = null;
        editingArcCharGlobalId = null;
        editingArcCharSelectedVariation = null;
    }
}

function copyExport() {
    const textarea = document.getElementById('exportTextarea');
    textarea.select();
    document.execCommand('copy');
    alert('Данные скопированы в буфер обмена!');
}

async function init() {
    initRasenganLoader();
    await openDB();

    // Загрузка глобальных персонажей ПЕРВЫМИ (до рендера арок)
    const savedGlobalChars = localStorage.getItem(GLOBAL_CHAR_STORAGE_KEY);
    if (savedGlobalChars) {
        try {
            const globalData = JSON.parse(savedGlobalChars);
            globalCharacters = globalData.characters || [];
            globalCharIdCounter = globalData.counter || 1;

            // Миграция старой модели + восстановление изображений из IndexedDB
            for (const char of globalCharacters) {
                migrateGlobalChar(char);
                for (const v of char.variations) {
                    if (v.imageId) {
                        v.imageData = await getImageFromDB(v.imageId) || '';
                    }
                    delete v.image;
                }
            }
        } catch (e) {
            console.error('Error loading global characters:', e);
            globalCharacters = [];
            globalCharIdCounter = 1;
        }
    }

    const saved = localStorage.getItem(ARCS_STORAGE_KEY);
    if (saved) {
        arcs = JSON.parse(saved);
        for (const arc of arcs) {
            if (arc.coverImageId) {
                arc.coverImage = await getImageFromDB(arc.coverImageId) || '';
            }
            if (!arc.openings) arc.openings = [];
            arc.openings.forEach(op => {
                if (!op.id) op.id = Date.now();
            });
            if (arc.characters) {
                arc.characters.forEach(c => {
                    if (c.selectedVariationId === undefined) c.selectedVariationId = null;
                });
            }
        }
    }
    arcIdCounter = arcs.length > 0 ? Math.max(...arcs.map(a => a.id)) + 1 : 1;
    renderArcs();
    updateStats();

    await initTierList();
}

// Закрытие модальных окон по клику на overlay
function setupModalOverlayHandlers() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                currentEditingArcId = null;
                currentCharArcId = null;
                currentOpeningArcId = null;
                editingOpeningId = null;
                editingTierListSongId = null;
            }
        });
    });

    // Drag & drop файла импорта
    const importLabel = document.querySelector('.file-import-label');
    if (importLabel) {
        importLabel.addEventListener('dragover', (e) => {
            e.preventDefault();
            importLabel.style.borderColor = 'var(--chakra-orange)';
            importLabel.style.background = 'rgba(255, 107, 53, 0.05)';
        });
        importLabel.addEventListener('dragleave', (e) => {
            e.preventDefault();
            importLabel.style.borderColor = '';
            importLabel.style.background = '';
        });
        importLabel.addEventListener('drop', (e) => {
            e.preventDefault();
            importLabel.style.borderColor = '';
            importLabel.style.background = '';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.name.endsWith('.json') || file.type === 'application/json') {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        try {
                            const data = JSON.parse(event.target.result);
                            processImport(data);
                        } catch (err) {
                            alert('Ошибка чтения файла: ' + err.message);
                        }
                    };
                    reader.readAsText(file);
                } else {
                    alert('Пожалуйста, выберите JSON-файл');
                }
            }
        });
    }

    // Закрытие тир-листа по клику на overlay
    const tierListModal = document.getElementById('tierListModal');
    if (tierListModal) {
        tierListModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeTierListModal();
            }
        });
    }

    // Escape для закрытия тир-листа
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (document.getElementById('tierListModal').classList.contains('active')) {
                closeTierListModal();
            }
        }
    });
}

// Запуск
createParticles();
init();
loadThemePreference();
// Эти обработчики зависят от DOM — добавляем после загрузки
document.addEventListener('DOMContentLoaded', setupModalOverlayHandlers);
// На случай если DOM уже загружен (скрипты в конце body)
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setupModalOverlayHandlers();
}
