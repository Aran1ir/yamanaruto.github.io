// ============================================
// ОПЕНИНГИ / ЭНДИНГИ
// ============================================
function openAddOpeningModal(arcId) {
    currentOpeningArcId = arcId;
    editingOpeningId = null;
    document.getElementById('openingModalTitle').textContent = 'Добавить опенинг/эндинг';
    document.getElementById('openingSaveBtn').textContent = 'Добавить';
    document.getElementById('openingType').value = 'opening';
    document.getElementById('openingName').value = '';
    document.getElementById('openingUrl').value = '';
    document.getElementById('openingModal').classList.add('active');
}

function openEditOpeningModal(arcId, openingId) {
    const arc = arcs.find(a => a.id === arcId);
    if (!arc || !arc.openings) return;
    const opening = arc.openings.find(op => op.id === openingId);
    if (!opening) return;

    currentOpeningArcId = arcId;
    editingOpeningId = openingId;
    document.getElementById('openingModalTitle').textContent = 'Редактировать опенинг/эндинг';
    document.getElementById('openingSaveBtn').textContent = 'Сохранить';
    document.getElementById('openingType').value = opening.type;
    document.getElementById('openingName').value = opening.name;
    document.getElementById('openingUrl').value = opening.url;
    document.getElementById('openingModal').classList.add('active');
}

function saveOpeningFromModal() {
    if (!currentOpeningArcId) return;
    const arc = arcs.find(a => a.id === currentOpeningArcId);
    if (!arc) return;
    const type = document.getElementById('openingType').value;
    const name = document.getElementById('openingName').value.trim();
    const url = document.getElementById('openingUrl').value.trim();
    if (!name || !url) {
        alert('Заполните название и ссылку');
        return;
    }
    const videoId = extractYouTubeId(url);
    if (!videoId) {
        alert('Введите корректную ссылку на YouTube (watch?v=... или youtu.be/...)');
        return;
    }

    if (!arc.openings) arc.openings = [];

    if (editingOpeningId) {
        const opening = arc.openings.find(op => op.id === editingOpeningId);
        if (opening) {
            opening.type = type;
            opening.name = name;
            opening.url = url;

            if (currentPlayingOpeningId === editingOpeningId && currentPlayingArcId === currentOpeningArcId) {
                destroyYTPlayer();
                currentPlayingOpeningId = editingOpeningId;
                renderArcs();
                setTimeout(() => {
                    const containerId = `yt-player-${currentOpeningArcId}-${editingOpeningId}`;
                    if (document.getElementById(containerId)) {
                        createYTPlayer(containerId, videoId);
                    }
                }, 200);
            }
        }
    } else {
        arc.openings.push({
            id: Date.now(),
            type: type,
            name: name,
            url: url
        });
    }

    saveData();
    renderArcs();
    closeModal('openingModal');
}

function deleteOpening(arcId, openingId) {
    if (currentPlayingOpeningId === openingId && currentPlayingArcId === arcId) {
        destroyYTPlayer();
    }
    const arc = arcs.find(a => a.id === arcId);
    if (arc && arc.openings) {
        arc.openings = arc.openings.filter(op => op.id !== openingId);
        saveData();
        renderArcs();
    }
}

function toggleOpeningPlay(arcId, openingId, url) {
    if (currentPlayingOpeningId === openingId && currentPlayingArcId === arcId) {
        destroyYTPlayer();
        renderArcs();
        return;
    }

    destroyYTPlayer();

    const videoId = extractYouTubeId(url);
    if (!videoId) {
        alert('Не удалось извлечь ID видео из ссылки');
        return;
    }

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
    renderArcs();
}
