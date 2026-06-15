// ============================================
// ТИР-ЛИСТ — состояние и логика
// ============================================
let tierListSongs = [];
let tierListAssignments = { S: [], A: [], B: [], C: [], D: [] };
let editingTierListSongId = null;
let draggedTierItem = null;
let selectedTierItem = null;

async function initTierList() {
    await loadTierList();
    renderTierList();
}

async function loadTierList() {
    const saved = localStorage.getItem(TIERLIST_STORAGE_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        tierListSongs = data.songs || [];
        tierListAssignments = data.assignments || { S: [], A: [], B: [], C: [], D: [] };
        for (const song of tierListSongs) {
            if (song.imageId) {
                song.image = await getImageFromDB(song.imageId) || '';
            }
        }
    }
}

async function saveTierList() {
    const dataToSave = {
        songs: tierListSongs.map(s => ({
            id: s.id,
            name: s.name,
            image: '',
            imageId: s.imageId || ''
        })),
        assignments: tierListAssignments
    };
    localStorage.setItem(TIERLIST_STORAGE_KEY, JSON.stringify(dataToSave));
}

function openTierListModal() {
    document.getElementById('tierListModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderTierList();
}

function closeTierListModal() {
    document.getElementById('tierListModal').classList.remove('active');
    document.body.style.overflow = '';
}

function renderTierList() {
    ['S', 'A', 'B', 'C', 'D'].forEach(tier => {
        const container = document.getElementById(`tier-${tier}`);
        if (container) container.innerHTML = '';
    });

    const pool = document.getElementById('tierListPool');
    if (pool) {
        const items = pool.querySelectorAll('.tierlist-item');
        items.forEach(item => item.remove());
    }

    ['S', 'A', 'B', 'C', 'D'].forEach(tier => {
        const container = document.getElementById(`tier-${tier}`);
        const songIds = tierListAssignments[tier] || [];
        songIds.forEach(songId => {
            const song = tierListSongs.find(s => s.id === songId);
            if (song) {
                const el = createTierListItemElement(song, tier);
                container.appendChild(el);
            }
        });
    });

    const assignedIds = new Set();
    Object.values(tierListAssignments).forEach(arr => arr.forEach(id => assignedIds.add(id)));
    const poolSongs = tierListSongs.filter(s => !assignedIds.has(s.id));

    const poolEmpty = document.getElementById('tierListPoolEmpty');
    if (poolSongs.length === 0) {
        if (poolEmpty) poolEmpty.style.display = 'block';
    } else {
        if (poolEmpty) poolEmpty.style.display = 'none';
        poolSongs.forEach(song => {
            const el = createTierListItemElement(song, 'pool');
            pool.appendChild(el);
        });
    }
}

function createTierListItemElement(song, location) {
    const div = document.createElement('div');
    div.className = 'tierlist-item';
    div.draggable = true;
    div.dataset.songId = song.id;
    div.dataset.location = location;

    const bgStyle = song.image ? `background-image: url('${song.image}')` : '';

    div.innerHTML = `
        <div class="tierlist-item-bg" style="${bgStyle}"></div>
        <div class="tierlist-item-overlay"></div>
        <div class="tierlist-item-name">${escapeHtml(song.name)}</div>
        <div class="tierlist-item-actions">
            <button class="tierlist-item-btn" onclick="event.stopPropagation(); editTierListSong(${song.id})" title="Редактировать">✎</button>
            <button class="tierlist-item-btn delete" onclick="event.stopPropagation(); deleteTierListSong(${song.id})" title="Удалить">✕</button>
        </div>
    `;

    div.addEventListener('dragstart', handleTierItemDragStart);
    div.addEventListener('dragend', handleTierItemDragEnd);
    div.addEventListener('click', (e) => handleTierItemClick(e, song.id));

    return div;
}

function handleTierItemClick(e, songId) {
    if (e.target.closest('.tierlist-item-actions')) return;

    const item = e.currentTarget;
    const allItems = document.querySelectorAll('.tierlist-item');

    if (selectedTierItem === songId) {
        selectedTierItem = null;
        allItems.forEach(i => i.classList.remove('selected-for-move'));
        return;
    }

    if (selectedTierItem !== null) {
        const targetTier = item.closest('.tierlist-row-content')?.parentElement?.dataset.tier;
        const targetPool = item.closest('.tierlist-pool');

        if (targetTier) {
            removeSongFromAllTiers(selectedTierItem);
            if (!tierListAssignments[targetTier]) tierListAssignments[targetTier] = [];
            tierListAssignments[targetTier].push(selectedTierItem);
        } else if (targetPool) {
            removeSongFromAllTiers(selectedTierItem);
        }

        saveTierList();
        renderTierList();
        selectedTierItem = null;
        allItems.forEach(i => i.classList.remove('selected-for-move'));
    } else {
        selectedTierItem = songId;
        allItems.forEach(i => i.classList.remove('selected-for-move'));
        item.classList.add('selected-for-move');
    }
}

// Drag & Drop
function handleTierItemDragStart(e) {
    draggedTierItem = {
        songId: parseInt(e.target.dataset.songId),
        fromLocation: e.target.dataset.location
    };
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.songId);
    const rect = e.target.getBoundingClientRect();
    e.dataTransfer.setDragImage(e.target, rect.width / 2, rect.height / 2);
}

function handleTierItemDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedTierItem = null;
    document.querySelectorAll('.tierlist-row-content.drag-over, .tierlist-pool.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
}

function handleTierDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const content = e.currentTarget.querySelector('.tierlist-row-content');
    if (content) content.classList.add('drag-over');
}

function handleTierDragLeave(e) {
    const content = e.currentTarget.querySelector('.tierlist-row-content');
    if (content && !e.currentTarget.contains(e.relatedTarget)) {
        content.classList.remove('drag-over');
    }
}

function handlePoolDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handlePoolDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
    }
}

function handleTierDrop(e, tier) {
    e.preventDefault();
    e.stopPropagation();
    const content = e.currentTarget.querySelector('.tierlist-row-content');
    if (content) content.classList.remove('drag-over');

    if (!draggedTierItem) return;

    const songId = draggedTierItem.songId;
    removeSongFromAllTiers(songId);

    if (!tierListAssignments[tier]) tierListAssignments[tier] = [];
    tierListAssignments[tier].push(songId);

    saveTierList();
    renderTierList();
}

function handlePoolDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    if (!draggedTierItem) return;

    const songId = draggedTierItem.songId;
    removeSongFromAllTiers(songId);

    saveTierList();
    renderTierList();
}

function removeSongFromAllTiers(songId) {
    ['S', 'A', 'B', 'C', 'D'].forEach(tier => {
        if (tierListAssignments[tier]) {
            tierListAssignments[tier] = tierListAssignments[tier].filter(id => id !== songId);
        }
    });
}

// Управление песнями
function openAddSongModal() {
    editingTierListSongId = null;
    document.getElementById('tierListSongModalTitle').textContent = 'Добавить песню';
    document.getElementById('tierListSongSaveBtn').textContent = 'Добавить';
    document.getElementById('tierListSongName').value = '';
    const preview = document.getElementById('tierListSongPreview');
    preview.innerHTML = `
        ${icons.imagePlaceholderSvg}
        <span>Нажмите, чтобы загрузить фоновое изображение</span>
    `;
    preview.classList.remove('has-image');
    preview.dataset.imageData = '';
    document.getElementById('tierListSongModal').classList.add('active');
}

function editTierListSong(songId) {
    const song = tierListSongs.find(s => s.id === songId);
    if (!song) return;

    editingTierListSongId = songId;
    document.getElementById('tierListSongModalTitle').textContent = 'Редактировать песню';
    document.getElementById('tierListSongSaveBtn').textContent = 'Сохранить';
    document.getElementById('tierListSongName').value = song.name;

    const preview = document.getElementById('tierListSongPreview');
    if (song.image) {
        preview.innerHTML = `<img src="${song.image}"><span style="position:relative;z-index:1;">Нажмите, чтобы изменить изображение</span>`;
        preview.classList.add('has-image');
        preview.dataset.imageData = song.image;
    } else {
        preview.innerHTML = `
            ${icons.imagePlaceholderSvg}
            <span>Нажмите, чтобы загрузить фоновое изображение</span>
        `;
        preview.classList.remove('has-image');
        preview.dataset.imageData = '';
    }

    document.getElementById('tierListSongModal').classList.add('active');
}

function handleTierListSongImage(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const compressed = await compressImage(e.target.result, 400, 260, 0.7);
        const preview = document.getElementById('tierListSongPreview');
        preview.innerHTML = `<img src="${compressed}"><span style="position:relative;z-index:1;">Нажмите, чтобы изменить изображение</span>`;
        preview.classList.add('has-image');
        preview.dataset.imageData = compressed;
    };
    reader.readAsDataURL(file);
    input.value = '';
}

async function saveTierListSong() {
    const name = document.getElementById('tierListSongName').value.trim() || 'Без названия';
    const preview = document.getElementById('tierListSongPreview');
    const imageData = preview.dataset.imageData || '';

    if (editingTierListSongId) {
        const song = tierListSongs.find(s => s.id === editingTierListSongId);
        if (song) {
            song.name = name;
            if (imageData && imageData !== song.image) {
                if (song.imageId) await deleteImageFromDB(song.imageId);
                const newImageId = `tier-img-${editingTierListSongId}-${Date.now()}`;
                await saveImageToDB(newImageId, imageData);
                song.image = imageData;
                song.imageId = newImageId;
            } else if (!imageData && song.imageId) {
                await deleteImageFromDB(song.imageId);
                song.image = '';
                song.imageId = '';
            }
        }
    } else {
        const songId = Date.now();
        const imageId = imageData ? `tier-img-${songId}` : '';
        if (imageData) {
            await saveImageToDB(imageId, imageData);
        }
        tierListSongs.push({
            id: songId,
            name: name,
            image: imageData,
            imageId: imageId
        });
    }

    await saveTierList();
    renderTierList();
    closeModal('tierListSongModal');
}

async function deleteTierListSong(songId) {
    if (!confirm('Удалить эту песню? Она будет удалена из всех тиров.')) return;

    const song = tierListSongs.find(s => s.id === songId);
    if (song && song.imageId) {
        await deleteImageFromDB(song.imageId);
    }

    tierListSongs = tierListSongs.filter(s => s.id !== songId);
    removeSongFromAllTiers(songId);

    await saveTierList();
    renderTierList();
}

// Экспорт / Импорт тир-листа
async function exportTierList() {
    const songsForExport = [];
    for (const song of tierListSongs) {
        let imageData = song.image || '';
        if (!imageData && song.imageId) {
            imageData = await getImageFromDB(song.imageId) || '';
        }
        songsForExport.push({
            id: song.id,
            name: song.name,
            image: imageData,
            imageId: ''
        });
    }

    const data = {
        songs: songsForExport,
        assignments: tierListAssignments
    };

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}_${String(now.getHours()).padStart(2,'0')}.${String(now.getMinutes()).padStart(2,'0')}`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `naruto-tierlist-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importTierList() {
    document.getElementById('tierListImportFile').click();
}

async function handleTierListImport(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.songs || !Array.isArray(data.songs)) {
                alert('Неверный формат файла');
                return;
            }
            if (!confirm(`Импортировать ${data.songs.length} песен? Текущий тир-лист будет заменён.`)) return;

            for (const song of tierListSongs) {
                if (song.imageId) await deleteImageFromDB(song.imageId);
            }

            tierListSongs = [];
            tierListAssignments = data.assignments || { S: [], A: [], B: [], C: [], D: [] };

            for (const importedSong of data.songs) {
                const newSongId = Date.now() + Math.floor(Math.random() * 1000);
                let imageData = importedSong.image || '';
                let imageId = '';

                if (imageData && imageData.startsWith('data:')) {
                    imageId = `tier-img-${newSongId}`;
                    await saveImageToDB(imageId, imageData);
                }

                tierListSongs.push({
                    id: newSongId,
                    name: importedSong.name || 'Без названия',
                    image: imageData,
                    imageId: imageId
                });
            }

            const idMapping = {};
            const oldIds = data.songs.map(s => s.id);
            const newIds = tierListSongs.map(s => s.id);
            oldIds.forEach((oldId, index) => {
                idMapping[oldId] = newIds[index];
            });

            const newAssignments = { S: [], A: [], B: [], C: [], D: [] };
            for (const tier of ['S', 'A', 'B', 'C', 'D']) {
                const tierSongs = tierListAssignments[tier] || [];
                newAssignments[tier] = tierSongs.map(oldId => idMapping[oldId] || oldId).filter(id =>
                    tierListSongs.some(s => s.id === id)
                );
            }
            tierListAssignments = newAssignments;

            await saveTierList();
            renderTierList();
            alert('Импорт завершён!');
        } catch (err) {
            alert('Ошибка импорта: ' + err.message);
        }
    };
    reader.readAsText(file);
    input.value = '';
}
