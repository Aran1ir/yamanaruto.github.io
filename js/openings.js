// ============================================
// ОПЕНИНГИ / ЭНДИНГИ в арке
// Теперь это ссылки на песни из «Списка» тир-листа.
// Модель записи: { id, type: 'opening'|'ending', songId }
// (обратная совместимость: старые записи без songId хранят name/url напрямую)
// ============================================
let currentOpeningType = 'opening'; // 'opening' | 'ending' — для какого типа открыт селектор

// Резолв записи опенинга арки в конкретную песню тир-листа.
// Возвращает { name, youtubeUrl } (с фолбэком для старых данных).
function getArcOpeningSong(opening) {
    if (opening.songId != null) {
        const song = tierListSongs.find(s => s.id === opening.songId);
        if (song) {
            return { name: song.name, youtubeUrl: song.youtubeUrl || '' };
        }
        // песню удалили из тир-листа — показываем заглушку, не ломаем отображение
        return { name: opening.name || '«удалено из списка»', youtubeUrl: '' };
    }
    // Старая модель данных (до рефакторинга)
    return { name: opening.name || 'Без названия', youtubeUrl: opening.url || '' };
}

// ============================================
// МОДАЛЬНОЕ ОКНО ВЫБОРА ОПЕНИНГОВ/ЭНДИНГОВ ИЗ СПИСКА
// (множественный выбор)
// ============================================
function openAddOpeningModal(arcId, type) {
    currentOpeningArcId = arcId;
    currentOpeningType = type === 'ending' ? 'ending' : 'opening';

    const searchInput = document.getElementById('openingSelectorSearch');
    if (searchInput) searchInput.value = '';

    document.getElementById('openingSelectorTitle').textContent =
        currentOpeningType === 'opening' ? 'Добавить опенинги' : 'Добавить эндинги';

    renderOpeningSelector();
    document.getElementById('openingSelectorModal').classList.add('active');
}

function renderOpeningSelector() {
    const container = document.getElementById('openingSelectorList');
    if (!container) return;
    const arc = arcs.find(a => a.id === currentOpeningArcId);
    if (!arc) return;
    if (!arc.openings) arc.openings = [];

    const query = (document.getElementById('openingSelectorSearch').value || '').trim().toLowerCase();

    // Песни этого типа, уже добавленные в арку
    const existingSongIds = new Set(
        arc.openings.filter(o => o.type === currentOpeningType).map(o => o.songId)
    );

    let available = tierListSongs.filter(s => {
        const name = (s.name || '').toLowerCase();
        const url = (s.youtubeUrl || '').toLowerCase();
        return !query || name.includes(query) || url.includes(query);
    });

    if (available.length === 0) {
        const message = query
            ? 'Ничего не найдено.'
            : 'Список пуст. Добавьте опенинги и эндинги в разделе «Тир-лист» → «Список».';
        container.innerHTML = `<div class="opening-selector-empty">${message}</div>`;
        return;
    }

    available.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));

    container.innerHTML = available.map(song => {
        const alreadyAdded = existingSongIds.has(song.id);
        return `
            <label class="opening-selector-item ${alreadyAdded ? 'added' : ''}">
                <input type="checkbox" value="${song.id}" ${alreadyAdded ? 'disabled' : ''}>
                <span class="opening-selector-checkbox"></span>
                <span class="opening-selector-name">${escapeHtml(song.name)}</span>
                ${alreadyAdded ? '<span class="opening-selector-badge">добавлено</span>' : ''}
            </label>
        `;
    }).join('');
}

function addSelectedOpenings() {
    if (!currentOpeningArcId) return;
    const arc = arcs.find(a => a.id === currentOpeningArcId);
    if (!arc) return;
    if (!arc.openings) arc.openings = [];

    const existingSongIds = new Set(
        arc.openings.filter(o => o.type === currentOpeningType).map(o => o.songId)
    );

    const checked = document.querySelectorAll('#openingSelectorList input[type="checkbox"]:checked');
    let added = 0;
    checked.forEach(cb => {
        const songId = parseInt(cb.value);
        if (isNaN(songId) || existingSongIds.has(songId)) return;
        arc.openings.push({
            id: Date.now() + Math.floor(Math.random() * 10000),
            type: currentOpeningType,
            songId: songId
        });
        added++;
    });

    if (added > 0) {
        saveData();
        renderArcs();
    }
    closeModal('openingSelectorModal');
}

// ============================================
// УДАЛЕНИЕ ОПЕНИНГА ИЗ АРКИ (не из глобального списка)
// ============================================
function deleteOpening(arcId, openingId) {
    if (currentPlayingOpeningId === openingId && currentPlayingArcId === arcId) {
        destroyYTPlayer();
        currentPlayingOpeningId = null;
        currentPlayingArcId = null;
    }
    const arc = arcs.find(a => a.id === arcId);
    if (arc && arc.openings) {
        arc.openings = arc.openings.filter(op => op.id !== openingId);
        saveData();
        renderArcs();
    }
}

// ============================================
// ВОСПРОИЗВЕДЕНИЕ (встроенный плеер)
// ============================================
function toggleOpeningPlay(arcId, openingId) {
    if (currentPlayingOpeningId === openingId && currentPlayingArcId === arcId) {
        destroyYTPlayer();
        currentPlayingOpeningId = null;
        currentPlayingArcId = null;
        renderArcs();
        return;
    }

    const arc = arcs.find(a => a.id === arcId);
    if (!arc || !arc.openings) return;
    const opening = arc.openings.find(op => op.id === openingId);
    if (!opening) return;

    const song = getArcOpeningSong(opening);
    const videoId = extractYouTubeId(song.youtubeUrl);
    if (!videoId) return;

    destroyYTPlayer();
    currentPlayingArcId = arcId;
    currentPlayingOpeningId = openingId;

    renderArcs();

    setTimeout(() => {
        const containerId = `yt-player-${arcId}-${openingId}`;
        if (document.getElementById(containerId)) {
            createYTPlayer(containerId, videoId);
        }
    }, 200);
}

function closeInlinePlayer() {
    destroyYTPlayer();
    currentPlayingOpeningId = null;
    currentPlayingArcId = null;
    renderArcs();
}

// ============================================
// МИГРАЦИЯ СТАРЫХ ЗАПИСЕЙ ОПЕНИНГОВ ({name,url})
// в ссылки на песни тир-листа.
// Вызывается после загрузки тир-листа.
// ============================================
async function migrateArcOpeningsToTierList() {
    if (!Array.isArray(tierListSongs)) tierListSongs = [];

    let modified = false;
    let createdSongs = false;

    for (const arc of arcs) {
        if (!arc.openings) arc.openings = [];
        for (const op of arc.openings) {
            if (op.songId != null) continue;
            if (!op.name && !op.url) continue;

            const url = op.url || '';
            const videoId = url ? extractYouTubeId(url) : null;

            // Ищем существующую песню по совпадению ссылки
            let song = null;
            if (videoId) {
                song = tierListSongs.find(s => extractYouTubeId(s.youtubeUrl || '') === videoId);
            }
            if (!song) {
                // Создаём новую песню в «Списке» тир-листа
                const newId = Date.now() + Math.floor(Math.random() * 10000);
                tierListSongs.push({
                    id: newId,
                    name: op.name || 'Без названия',
                    image: '',
                    imageId: '',
                    youtubeUrl: url
                });
                createdSongs = true;
                song = tierListSongs[tierListSongs.length - 1];
            }
            op.songId = song.id;
            // Чистим поля старой модели (не нужны больше)
            delete op.name;
            delete op.url;
            modified = true;
        }
    }

    if (createdSongs) {
        await saveTierList();
    }
    return modified;
}
