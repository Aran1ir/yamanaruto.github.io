// ============================================
// ПЕРСОНАЖИ В АРКЕ — ссылки на глобальный список +
// выбор конкретной вариации для конкретной арки
// ============================================
// Ссылка персонажа в арке:
//   { globalCharId, isDead, selectedVariationId }
// selectedVariationId === null  -> используется первая (основная) вариация
// ============================================
let editingArcCharArcId = null;
let editingArcCharGlobalId = null;
let editingArcCharSelectedVariation = null; // id выбранной вариации в модальном окне

function deleteArcCharacter(arcId, globalCharId) {
    const arc = arcs.find(a => a.id === arcId);
    if (arc) {
        arc.characters = arc.characters.filter(c => c.globalCharId !== globalCharId);
        saveData();
        renderArcs();
    }
}

// При добавлении персонажа в арку берётся ПЕРВОЕ изображение из вариаций
// (selectedVariationId = null означает «основная/первая вариация»).
function openAddArcCharacterModal(arcId) {
    currentCharArcId = arcId;
    renderArcCharacterSelector();
    document.getElementById('addArcCharModal').classList.add('active');
}

function renderArcCharacterSelector() {
    const container = document.getElementById('addArcCharList');
    const arc = arcs.find(a => a.id === currentCharArcId);
    if (!arc) return;

    const query = (document.getElementById('addArcCharSearch').value || '').trim();

    const existingIds = new Set(arc.characters.map(c => c.globalCharId));
    const available = globalCharacters
        .filter(c => !existingIds.has(c.id))
        .filter(c => isCharNameMatch(c.name, query));

    if (available.length === 0) {
        const message = query
            ? `Ничего не найдено.`
            : `Все персонажи из списка уже добавлены.<br>Добавьте новых в разделе «Персонажи».`;
        container.innerHTML = `<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.3);">${message}</div>`;
        return;
    }

    // Сортировка по имени
    available.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    // Группировка по первой букве
    const groups = {};
    available.forEach(char => {
        const firstLetter = char.name.charAt(0).toUpperCase();
        if (!groups[firstLetter]) groups[firstLetter] = [];
        groups[firstLetter].push(char);
    });

    const sortedLetters = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'ru'));

    container.innerHTML = sortedLetters.map(letter => `
        <div class="char-group">
            <div class="char-group-label">${escapeHtml(letter)}</div>
            <div class="char-group-grid">
                ${groups[letter].map(char => `
                    <div class="global-char-select-item" onclick="addGlobalCharToArc(${char.id})">
                        <img src="${getCharPrimaryImage(char) || icons.personPlaceholder}" alt="${escapeHtml(char.name)}">
                        <span>${highlightCharName(char.name, query)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function addGlobalCharToArc(globalCharId) {
    if (!currentCharArcId) return;
    const arc = arcs.find(a => a.id === currentCharArcId);
    if (!arc) return;
    if (arc.characters.some(c => c.globalCharId === globalCharId)) return;
    arc.characters.push({
        globalCharId: globalCharId,
        isDead: false,
        selectedVariationId: null
    });
    saveData();
    renderArcs();
    renderArcCharacterSelector();
}

// ============================================
// МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ПЕРСОНАЖА В АРКЕ
// (выбор вариации, отметка о гибели)
// ============================================
function openEditArcCharModal(arcId, globalCharId) {
    editingArcCharArcId = arcId;
    editingArcCharGlobalId = globalCharId;
    const arc = arcs.find(a => a.id === arcId);
    if (!arc) return;
    const charRef = arc.characters.find(c => c.globalCharId === globalCharId);
    if (!charRef) return;
    const char = globalCharacters.find(c => c.id === globalCharId);

    const portraitImg = document.getElementById('editArcCharPortraitImg');
    const portraitContainer = document.getElementById('editArcCharPortrait');

    // Текущее выбранное изображение для этой арки
    editingArcCharSelectedVariation = charRef.selectedVariationId || null;
    const currentImage = getCharImageForArcRef(char, charRef) || icons.personPlaceholder;
    portraitImg.src = currentImage;
    portraitImg.style.display = 'block';

    if (charRef.isDead) {
        portraitContainer.classList.add('dead');
    } else {
        portraitContainer.classList.remove('dead');
    }

    document.getElementById('editArcCharName').textContent = char ? char.name : 'Персонаж';
    document.getElementById('editArcCharDead').checked = charRef.isDead;

    renderVariationPicker(char);
    document.getElementById('editArcCharModal').classList.add('active');
}

function renderVariationPicker(char) {
    const container = document.getElementById('editArcCharVariations');
    if (!container) return;
    const variations = (char && char.variations) || [];

    if (variations.length === 0) {
        container.innerHTML = `<div style="text-align:center;color:rgba(255,255,255,0.3);padding:10px;">У персонажа нет вариаций.</div>`;
        return;
    }

    if (variations.length === 1) {
        // Только одна вариация — выбор не нужен
        container.innerHTML = '';
        return;
    }

    // active если выбрана (или если это первая и выбрана "по умолчанию")
    const isActive = (v) => (editingArcCharSelectedVariation === null && variations.indexOf(v) === 0) || editingArcCharSelectedVariation === v.id;

    container.innerHTML = variations.map(v => {
        const activeClass = isActive(v) ? 'active' : '';
        const caption = v.caption ? escapeHtml(v.caption) : `<span style="opacity:0.4">без подписи</span>`;
        return `
            <div class="variation-option ${activeClass}" onclick="selectArcCharVariation('${v.id}')">
                <img src="${v.imageData || icons.personPlaceholder}" alt="">
                <div class="variation-option-caption">${caption}</div>
            </div>
        `;
    }).join('');
}

function selectArcCharVariation(variationId) {
    editingArcCharSelectedVariation = variationId;
    const char = globalCharacters.find(c => c.id === editingArcCharGlobalId);

    // Обновляем превью в шапке модального окна
    const v = getCharVariationById(char, variationId);
    if (v) {
        const portraitImg = document.getElementById('editArcCharPortraitImg');
        if (portraitImg) portraitImg.src = v.imageData || icons.personPlaceholder;
    }
    renderVariationPicker(char);
}

function saveEditArcChar() {
    if (!editingArcCharArcId || !editingArcCharGlobalId) return;
    const arc = arcs.find(a => a.id === editingArcCharArcId);
    if (!arc) return;
    const charRef = arc.characters.find(c => c.globalCharId === editingArcCharGlobalId);
    if (!charRef) return;

    charRef.isDead = document.getElementById('editArcCharDead').checked;

    const char = globalCharacters.find(c => c.id === editingArcCharGlobalId);
    const variations = (char && char.variations) || [];
    // Если выбрана первая вариация — сохраняем как null (значение по умолчанию),
    // чтобы при изменении порядка/удалении первой сохранялась корректность.
    if (editingArcCharSelectedVariation !== null && variations.length > 0 && variations[0].id === editingArcCharSelectedVariation) {
        charRef.selectedVariationId = null;
    } else {
        charRef.selectedVariationId = editingArcCharSelectedVariation;
    }

    saveData();
    renderArcs();
    closeModal('editArcCharModal');
    editingArcCharArcId = null;
    editingArcCharGlobalId = null;
    editingArcCharSelectedVariation = null;
}
