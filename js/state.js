// ============================================
// СОСТОЯНИЕ ПРИЛОЖЕНИЯ И КЛЮЧИ ХРАНИЛИЩА
// ============================================
const ARCS_STORAGE_KEY = 'narutoArcs';
const GLOBAL_CHAR_STORAGE_KEY = 'narutoGlobalCharacters';
const TIERLIST_STORAGE_KEY = 'narutoTierList';
const THEME_STORAGE_KEY = 'narutoTheme';

let arcs = [];
let arcIdCounter = 1;
let currentEditingArcId = null;
let currentCharArcId = null;
let currentOpeningArcId = null;
let editingOpeningId = null;

// ГЛОБАЛЬНЫЙ СПИСОК ПЕРСОНАЖЕЙ
let globalCharacters = [];
let globalCharIdCounter = 1;
let editingGlobalCharId = null;

// Рабочий буфер для редактирования вариаций в модальном окне глобального персонажа.
// Каждый элемент: { id, imageData, caption, imageId (существующий) }
let editingVariations = [];

// ============================================
// СОХРАНЕНИЕ / ОБНОВЛЕНИЕ СТАТИСТИКИ
// ============================================
async function saveData() {
    const dataToSave = arcs.map(arc => ({
        ...arc,
        coverImage: '',
        characters: arc.characters.map(char => ({
            globalCharId: char.globalCharId,
            isDead: char.isDead,
            selectedVariationId: char.selectedVariationId || null
        }))
    }));
    localStorage.setItem(ARCS_STORAGE_KEY, JSON.stringify(dataToSave));

    const globalCharsToSave = {
        characters: globalCharacters.map(c => ({
            id: c.id,
            name: c.name,
            variations: (c.variations || []).map(v => ({
                id: v.id,
                caption: v.caption,
                image: '',
                imageId: v.imageId || ''
            }))
        })),
        counter: globalCharIdCounter
    };
    localStorage.setItem(GLOBAL_CHAR_STORAGE_KEY, JSON.stringify(globalCharsToSave));

    updateStats();
}

function updateStats() {
    const totalArcs = arcs.length;
    let totalEpisodes = 0;
    let watchedEpisodes = 0;
    arcs.forEach(arc => {
        totalEpisodes += arc.episodes.length;
        watchedEpisodes += arc.episodes.filter(e => e.watched).length;
    });
    document.getElementById('totalArcs').textContent = totalArcs;
    document.getElementById('totalEpisodes').textContent = totalEpisodes;
    document.getElementById('watchedEpisodes').textContent = watchedEpisodes;
}
