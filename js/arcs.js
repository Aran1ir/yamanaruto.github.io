// ============================================
// АРКИ — создание, удаление, рендеринг
// ============================================
function addArc() {
    const newArc = {
        id: arcIdCounter++,
        title: `Арка ${arcs.length + 1}`,
        coverImage: '',
        coverImageId: '',
        episodes: [],
        characters: [],
        openings: [],
        isOpen: true,
        viewMode: 'numeric'
    };
    arcs.push(newArc);
    saveData();
    renderArcs();
}

async function deleteArc(id) {
    if (!confirm('Удалить эту арку?')) return;
    const arc = arcs.find(a => a.id === id);
    if (arc) {
        if (arc.coverImageId) await deleteImageFromDB(arc.coverImageId);
    }
    if (currentPlayingArcId === id) {
        destroyYTPlayer();
    }
    arcs = arcs.filter(a => a.id !== id);
    saveData();
    renderArcs();
}

function toggleArc(id) {
    const arc = arcs.find(a => a.id === id);
    if (arc) {
        arc.isOpen = !arc.isOpen;
        if (!arc.isOpen && currentPlayingArcId === id) {
            destroyYTPlayer();
        }
        saveData();
        renderArcs();
    }
}

function updateArcTitle(id, title) {
    const arc = arcs.find(a => a.id === id);
    if (arc) {
        arc.title = title;
        saveData();
    }
}

// ============================================
// РЕДАКТИРОВАНИЕ АРКИ (обложка + добавление серий)
// ============================================
function openArcEditModal(arcId) {
    currentEditingArcId = arcId;
    const arc = arcs.find(a => a.id === arcId);
    if (!arc) return;
    const preview = document.getElementById('arcEditCoverPreview');
    if (arc.coverImage) {
        preview.innerHTML = `<img src="${arc.coverImage}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;filter:blur(8px) brightness(0.5);"><span style="position:relative;z-index:1;">Нажмите, чтобы изменить обложку</span>`;
        preview.classList.add('has-image');
    } else {
        preview.innerHTML = `${icons.imagePlaceholderSvg}<span>Нажмите, чтобы загрузить обложку</span>`;
        preview.classList.remove('has-image');
    }
    document.getElementById('arcEditEpStart').value = '';
    document.getElementById('arcEditEpEnd').value = '';
    document.getElementById('arcEditModal').classList.add('active');
}

async function handleArcCoverUpload(input) {
    const file = input.files[0];
    if (!file || !currentEditingArcId) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const compressed = await compressImage(e.target.result, 800, 450, 0.7);
        const arc = arcs.find(a => a.id === currentEditingArcId);
        if (!arc) return;
        if (arc.coverImageId) await deleteImageFromDB(arc.coverImageId);
        const newImageId = `arc-cover-${arc.id}-${Date.now()}`;
        await saveImageToDB(newImageId, compressed);
        arc.coverImage = compressed;
        arc.coverImageId = newImageId;
        saveData();
        const preview = document.getElementById('arcEditCoverPreview');
        preview.innerHTML = `<img src="${compressed}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;filter:blur(8px) brightness(0.5);"><span style="position:relative;z-index:1;">Нажмите, чтобы изменить обложку</span>`;
        preview.classList.add('has-image');
        renderArcs();
    };
    reader.readAsDataURL(file);
    input.value = '';
}

function addEpisodesFromEdit() {
    if (!currentEditingArcId) return;
    const start = document.getElementById('arcEditEpStart').value;
    const end = document.getElementById('arcEditEpEnd').value;
    addEpisodes(currentEditingArcId, start, end);
    document.getElementById('arcEditEpStart').value = '';
    document.getElementById('arcEditEpEnd').value = '';
}

// ============================================
// РЕНДЕРИНГ
// ============================================
function renderArcs() {
    const container = document.getElementById('arcsContainer');
    if (arcs.length === 0) {
        container.innerHTML = `
            <div class="empty-state empty-state-hero">
                <div class="empty-leaf-wrap">
                    <div class="empty-leaf-glow"></div>
                    <svg class="empty-leaf" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                        <!-- Спираль Узумаки -->
                        <path class="empty-leaf-spiral" d="M60 60
                            m -32, 0
                            a 32,32 0 1,1 64,0
                            a 26,26 0 1,1 -52,0
                            a 20,20 0 1,1 40,0
                            a 14,14 0 1,1 -28,0
                            a 8,8 0 1,1 16,0"/>
                    </svg>
                </div>
                <div class="empty-hint">
                    Нажмите <span class="empty-hint-accent">«Добавить новую арку»</span> выше,<br>
                    чтобы начать свой путь ниндзя
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = arcs.map(arc => {
        const watchedCount = arc.episodes.filter(e => e.watched).length;
        const totalCount = arc.episodes.length;
        const progressPercent = totalCount > 0 ? (watchedCount / totalCount) * 100 : 0;

        return `
            <div class="arc-card">
                ${arc.coverImage ? `<div class="arc-cover" style="background-image: url('${arc.coverImage}')"></div>` : ''}
                <div class="arc-header" onclick="toggleArc(${arc.id})">
                    <div class="arc-toggle ${arc.isOpen ? 'rotated' : ''}">${icons.chevron}</div>
                    <div class="arc-info">
                        <div class="arc-title">
                            <input type="text" class="arc-title-input" value="${escapeHtml(arc.title)}" onclick="event.stopPropagation()" onchange="updateArcTitle(${arc.id}, this.value)" placeholder="Название арки">
                        </div>
                        <div class="arc-meta">
                            <span>${totalCount} серий</span><span>•</span>
                            <span>${arc.characters.length} персонажей</span><span>•</span>
                            <span>${(arc.openings || []).length} OP/ED</span>
                        </div>
                    </div>
                    <div class="arc-progress" onclick="event.stopPropagation()">
                        <div class="progress-bar"><div class="progress-fill" style="width: ${progressPercent}%"></div></div>
                        <span style="font-size: 0.85rem; color: var(--chakra-orange); font-weight: 600; min-width: 45px;">${watchedCount}/${totalCount}</span>
                    </div>
                    <div class="arc-actions" onclick="event.stopPropagation()">
                        <button class="icon-btn" onclick="openArcEditModal(${arc.id})" data-tooltip="Редактировать">${icons.pencil}</button>
                        <button class="icon-btn delete" onclick="deleteArc(${arc.id})" data-tooltip="Удалить арку">${icons.trash}</button>
                    </div>
                </div>
                <div class="arc-content ${arc.isOpen ? 'open' : ''}" data-arc-id="${arc.id}">
                    ${arc.isOpen ? generateArcContent(arc) : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderArcContent(arcId) {
    const arc = arcs.find(a => a.id === arcId);
    if (!arc) return;
    const arcContent = document.querySelector(`.arc-content[data-arc-id="${arcId}"]`);
    if (!arcContent) return;
    const textList = arcContent.querySelector('.text-episodes-list');
    const scrollTop = textList ? textList.scrollTop : 0;
    arcContent.innerHTML = generateArcContent(arc);
    setTimeout(() => {
        const newList = arcContent.querySelector('.text-episodes-list');
        if (newList) {
            newList.scrollTop = scrollTop;
        }
        if (currentPlayingArcId === arcId && currentPlayingOpeningId) {
            restorePlayerAfterRerender(arcId, currentPlayingOpeningId);
        }
    }, 100);
}

function restorePlayerAfterRerender(arcId, openingId) {
    const arc = arcs.find(a => a.id === arcId);
    if (!arc) return;
    const opening = (arc.openings || []).find(op => op.id === openingId);
    if (!opening) return;
    const song = getArcOpeningSong(opening);
    const videoId = extractYouTubeId(song.youtubeUrl);
    if (!videoId) return;
    const containerId = `yt-player-${arcId}-${openingId}`;
    const container = document.getElementById(containerId);
    if (container) {
        createYTPlayer(containerId, videoId);
    }
}

function generateArcContent(arc) {
    const isPlayerActive = currentPlayingArcId === arc.id && currentPlayingOpeningId !== null;
    const activeOpening = isPlayerActive ? (arc.openings || []).find(op => op.id === currentPlayingOpeningId) : null;

    return `
        <!-- Серии -->
        <div class="content-section">
            <div class="section-label">Серии</div>
            <div class="view-toggle" onclick="event.stopPropagation()">
                <button class="view-toggle-btn ${arc.viewMode !== 'text' ? 'active' : ''}"
                        onclick="setViewMode(${arc.id}, 'numeric')" title="Числовой вид">Ч</button>
                <button class="view-toggle-btn ${arc.viewMode === 'text' ? 'active' : ''}"
                        onclick="setViewMode(${arc.id}, 'text')" title="Текстовый вид">Т</button>
            </div>
            ${arc.viewMode === 'text' ? `
                <div class="text-episodes-list">
                    ${arc.episodes.map(ep => `
                        <div class="text-episode-item ${ep.watched ? 'watched' : ''} ${ep.rating === 'excellent' ? 'excellent' : ''} ${ep.rating === 'bad' ? 'bad' : ''}">
                            <div class="text-ep-number">${ep.number}</div>
                            <input type="text" class="text-ep-input" value="${escapeHtml(ep.title || `Серия ${ep.number}`)}" onchange="updateEpisodeTitle(${arc.id}, ${ep.number}, this.value)" placeholder="Название серии">
                            <input type="date" class="ep-date-input" value="${ep.watchDate || ''}" onchange="updateEpisodeDate(${arc.id}, ${ep.number}, this.value)" title="Дата просмотра">
                            <div class="text-ep-actions">
                                <button class="rating-btn watch ${ep.watched ? 'active' : ''}" onclick="toggleEpisode(${arc.id}, ${ep.number})" title="Просмотрено">✓</button>
                                <button class="rating-btn gold ${ep.rating === 'excellent' ? 'active' : ''}" onclick="setEpisodeRating(${arc.id}, ${ep.number}, 'excellent')" title="Отличная">★</button>
                                <button class="rating-btn red ${ep.rating === 'bad' ? 'active' : ''}" onclick="setEpisodeRating(${arc.id}, ${ep.number}, 'bad')" title="Плохая">✕</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="episodes-grid">
                    ${arc.episodes.map(ep => `
                        <button class="episode-btn ${ep.watched ? 'watched' : ''} ${ep.rating === 'excellent' ? 'excellent' : ''} ${ep.rating === 'bad' ? 'bad' : ''}"
                                onclick="toggleEpisode(${arc.id}, ${ep.number})"
                                oncontextmenu="event.preventDefault(); removeEpisode(${arc.id}, ${ep.number})"
                                data-tooltip="ПКМ — удалить">${ep.number}</button>
                    `).join('')}
                </div>
            `}
        </div>

        <!-- Персонажи -->
        <div class="content-section">
            <div class="section-label">Персонажи</div>
            <div class="characters-grid">
                ${arc.characters
                    .map(charRef => {
                        const char = globalCharacters.find(c => c.id === charRef.globalCharId);
                        return { charRef, char };
                    })
                    .filter(({ char }) => char)
                    .sort((a, b) => a.char.name.localeCompare(b.char.name, 'ru'))
                    .map(({ charRef, char }) => {
                        const img = getCharImageForArcRef(char, charRef) || icons.personPlaceholder;
                        const variations = char.variations || [];
                        const badge = variations.length > 1
                            ? `<div class="variation-badge" title="Доступно вариаций: ${variations.length}">${variations.length}</div>`
                            : '';
                        return `
                            <div class="character-card" onclick="openEditArcCharModal(${arc.id}, ${charRef.globalCharId})" oncontextmenu="event.preventDefault(); deleteArcCharacter(${arc.id}, ${charRef.globalCharId})">
                                <div style="position:relative; width:100px;">
                                    ${badge}
                                    <img src="${img}"
                                         class="character-portrait ${charRef.isDead ? 'dead-character' : ''}" alt="${escapeHtml(char.name)}">
                                </div>
                                <div class="character-name-display">${escapeHtml(char.name)}</div>
                                ${charRef.isDead ? `<div class="character-dead-label">💀 Погиб</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                <button class="add-character-btn" onclick="event.stopPropagation(); openAddArcCharacterModal(${arc.id})">
                    ${icons.plus}
                    <span style="font-size: 0.85rem;">Добавить из списка</span>
                </button>
            </div>
        </div>

        <!-- Опенинги и Эндинги -->
        <div class="content-section">
            <div class="section-label">Опенинги и Эндинги</div>
            <div class="openings-list">
                ${(arc.openings || []).map(op => {
                    const song = getArcOpeningSong(op);
                    const playable = !!extractYouTubeId(song.youtubeUrl);
                    return `
                    <div class="opening-item ${(currentPlayingOpeningId === op.id && currentPlayingArcId === arc.id) ? 'active' : ''} ${!playable ? 'not-playable' : ''}"
                         onclick="event.stopPropagation(); ${playable ? `toggleOpeningPlay(${arc.id}, ${op.id})` : ''}">
                        <span class="opening-type-badge">${op.type === 'opening' ? 'OP' : 'ED'}</span>
                        <div class="opening-info">
                            <div class="opening-name">${escapeHtml(song.name)}</div>
                        </div>
                        <div class="opening-actions-group" onclick="event.stopPropagation()">
                            <button class="opening-action-btn opening-delete-btn" onclick="deleteOpening(${arc.id}, ${op.id})" title="Удалить из арки">✕</button>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>

            ${isPlayerActive && activeOpening ? `
                <div class="inline-player" id="inline-player-${arc.id}">
                    <button class="close-player-btn" onclick="event.stopPropagation(); closeInlinePlayer()">✕</button>
                    <div class="inline-player-inner">
                        <div id="yt-player-${arc.id}-${activeOpening.id}"></div>
                    </div>
                </div>
            ` : ''}

            <div class="add-opening-buttons">
                <button class="add-opening-btn narrow" onclick="event.stopPropagation(); openAddOpeningModal(${arc.id}, 'opening')">
                    ${icons.plus}
                    Добавить опенинг
                </button>
                <button class="add-opening-btn narrow" onclick="event.stopPropagation(); openAddOpeningModal(${arc.id}, 'ending')">
                    ${icons.plus}
                    Добавить эндинг
                </button>
            </div>
        </div>
    `;
}
