// ============================================
// ГЛОБАЛЬНЫЕ ПЕРСОНАЖИ — с поддержкой ВАРИАЦИЙ
// ============================================
// Модель персонажа:
//   { id, name, variations: [ { id, imageData, caption, imageId } ] }
// Первая вариация считается «основной» (по умолчанию).
// ============================================

// Вспомогательные функции для работы с вариациями персонажа
function getCharPrimaryImage(char) {
    if (!char) return '';
    const variations = char.variations || [];
    if (variations.length === 0) return '';
    return variations[0].imageData || '';
}

// Совпадает ли имя персонажа с поисковым запросом (по началу имени, без учёта регистра).
// Пустой запрос — совпадает всё.
function isCharNameMatch(name, query) {
    if (!query) return true;
    return name.toLowerCase().startsWith(query.toLowerCase());
}

// Возвращает HTML имени с подсвеченной совпавшей частью (по запросу).
// Если запрос пуст — имя выводится как есть (с экранированием).
function highlightCharName(name, query) {
    const escapedName = escapeHtml(name);
    if (!query) return escapedName;
    const q = query.toLowerCase();
    const lower = name.toLowerCase();
    if (!lower.startsWith(q)) return escapedName;
    const matched = name.slice(0, query.length);
    const rest = name.slice(query.length);
    return `<span class="char-name-mark">${escapeHtml(matched)}</span>${escapeHtml(rest)}`;
}

function getCharVariationById(char, variationId) {
    if (!char) return null;
    return (char.variations || []).find(v => v.id === variationId) || null;
}

// Возвращает изображение персонажа для конкретной ссылки в арке.
// Если selectedVariationId не задан/не найден — берётся первая вариация.
function getCharImageForArcRef(char, charRef) {
    if (!char) return '';
    const variations = char.variations || [];
    if (variations.length === 0) return '';
    if (charRef && charRef.selectedVariationId) {
        const v = variations.find(x => x.id === charRef.selectedVariationId);
        if (v) return v.imageData || '';
    }
    return variations[0].imageData || '';
}

// ============================================
// МОДАЛЬНОЕ ОКНО ГЛОБАЛЬНЫХ ПЕРСОНАЖЕЙ
// ============================================
function openGlobalCharModal() {
    editingGlobalCharId = null;
    editingVariations = [];
    document.getElementById('globalCharModalTitle').textContent = 'Добавить персонажа';
    document.getElementById('globalCharSaveBtn').textContent = 'Добавить';
    document.getElementById('globalCharName').value = '';
    const searchInput = document.getElementById('globalCharSearch');
    if (searchInput) searchInput.value = '';
    document.getElementById('globalCharModal').classList.add('active');
    renderVariationsEditor();
    renderGlobalCharList();
}

function renderGlobalCharList() {
    const container = document.getElementById('globalCharList');
    const query = (document.getElementById('globalCharSearch').value || '').trim();

    if (globalCharacters.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.2);">Список пуст. Добавьте персонажей выше.</div>`;
        return;
    }

    const filtered = globalCharacters.filter(char => isCharNameMatch(char.name, query));

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.2);">Ничего не найдено.</div>`;
        return;
    }

    container.innerHTML = filtered.map(char => {
        const img = getCharPrimaryImage(char) || icons.personPlaceholder;
        const count = (char.variations || []).length;
        const countLabel = count > 1 ? `<span class="global-char-list-variation-count">${count} вар.</span>` : '';
        return `
            <div class="global-char-list-item">
                <img src="${img}" alt="${escapeHtml(char.name)}">
                <span class="global-char-list-name">${highlightCharName(char.name, query)}</span>
                ${countLabel}
                <div class="global-char-list-actions">
                    <button class="icon-btn" onclick="editGlobalChar(${char.id})" title="Редактировать">${icons.pencil}</button>
                    <button class="icon-btn delete" onclick="deleteGlobalChar(${char.id})" title="Удалить">${icons.trash}</button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// РЕДАКТОР ВАРИАЦИЙ (внутри модального окна)
// ============================================
function renderVariationsEditor() {
    const container = document.getElementById('variationsList');
    if (!container) return;

    if (editingVariations.length === 0) {
        container.innerHTML = `<div class="variations-empty">Нет вариаций. Нажмите «Добавить вариацию», чтобы загрузить фото.</div>`;
        return;
    }

    container.innerHTML = editingVariations.map(v => {
        const thumb = v.imageData
            ? `<img class="variation-thumb" src="${v.imageData}" onclick="document.getElementById('var-file-${v.id}').click()" title="Изменить фото">`
            : `<div class="variation-thumb placeholder" onclick="document.getElementById('var-file-${v.id}').click()" title="Загрузить фото">${icons.personPlaceholderSvg}</div>`;

        return `
            <div class="variation-row" data-variation-id="${v.id}">
                ${thumb}
                <input type="file" id="var-file-${v.id}" class="file-input-hidden" accept="image/*" onchange="handleVariationImage('${v.id}', this)">
                <input type="text" class="variation-caption-input" placeholder="Подпись (например: детство, шиппуден...)" value="${escapeHtml(v.caption || '')}" oninput="updateVariationCaption('${v.id}', this.value)">
                <button class="variation-delete-btn" onclick="removeVariation('${v.id}')" title="Удалить вариацию">✕</button>
            </div>
        `;
    }).join('');
}

function addVariation() {
    const newVar = {
        id: 'tmpvar-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        imageData: '',
        caption: '',
        imageId: ''
    };
    editingVariations.push(newVar);
    renderVariationsEditor();
}

function removeVariation(varId) {
    editingVariations = editingVariations.filter(v => v.id !== varId);
    renderVariationsEditor();
}

function updateVariationCaption(varId, value) {
    const v = editingVariations.find(x => x.id === varId);
    if (v) v.caption = value;
}

function handleVariationImage(varId, input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const compressed = await compressImage(e.target.result, 300, 300, 0.6);
        const v = editingVariations.find(x => x.id === varId);
        if (v) {
            v.imageData = compressed;
            v._imageChanged = true;
        }
        renderVariationsEditor();
    };
    reader.readAsDataURL(file);
    input.value = '';
}

// ============================================
// СОХРАНЕНИЕ / РЕДАКТИРОВАНИЕ ПЕРСОНАЖА
// ============================================
async function saveGlobalCharFromModal() {
    const name = document.getElementById('globalCharName').value.trim() || 'Без имени';

    if (editingVariations.length === 0) {
        if (!confirm('У персонажа нет ни одного изображения. Сохранить без фото?')) return;
    }

    if (editingGlobalCharId) {
        // Редактирование
        const char = globalCharacters.find(c => c.id === editingGlobalCharId);
        if (char) {
            char.name = name;
            char.variations = await persistVariations(editingVariations, char.id);
        }
    } else {
        // Новый персонаж
        const charId = globalCharIdCounter++;
        globalCharacters.push({
            id: charId,
            name: name,
            variations: await persistVariations(editingVariations, charId)
        });
    }

    editingVariations = [];
    await saveData();
    renderGlobalCharList();
    document.getElementById('globalCharName').value = '';
    document.getElementById('globalCharModalTitle').textContent = 'Добавить персонажа';
    document.getElementById('globalCharSaveBtn').textContent = 'Добавить';
    editingGlobalCharId = null;
    renderVariationsEditor();
}

// Сохраняет массив вариаций в IndexedDB и возвращает чистую модель.
// oldCharId — id персонажа (для генерации imageId).
async function persistVariations(variations, charId) {
    const result = [];
    for (const v of variations) {
        const newImageId = `global-char-img-${charId}-${v.id}-${Date.now()}`;
        // Если есть данные изображения — сохраняем в IndexedDB
        if (v.imageData) {
            await saveImageToDB(newImageId, v.imageData);
        }
        result.push({
            id: v.id,
            caption: v.caption || '',
            imageData: v.imageData || '',
            imageId: v.imageData ? newImageId : ''
        });
    }
    return result;
}

function editGlobalChar(charId) {
    const char = globalCharacters.find(c => c.id === charId);
    if (!char) return;
    editingGlobalCharId = charId;
    document.getElementById('globalCharModalTitle').textContent = 'Редактировать персонажа';
    document.getElementById('globalCharSaveBtn').textContent = 'Сохранить';
    document.getElementById('globalCharName').value = char.name;

    // Загружаем существующие вариации в рабочий буфер
    editingVariations = (char.variations || []).map(v => ({
        id: v.id,
        imageData: v.imageData || '',
        caption: v.caption || '',
        imageId: v.imageId || ''
    }));

    renderVariationsEditor();
}

async function deleteGlobalChar(charId) {
    if (!confirm('Удалить этого персонажа из глобального списка? Он будет удалён из всех арок.')) return;

    const char = globalCharacters.find(c => c.id === charId);
    if (char) {
        for (const v of (char.variations || [])) {
            if (v.imageId) await deleteImageFromDB(v.imageId);
        }
    }

    globalCharacters = globalCharacters.filter(c => c.id !== charId);
    arcs.forEach(arc => {
        arc.characters = arc.characters.filter(c => c.globalCharId !== charId);
    });

    await saveData();
    renderGlobalCharList();
    renderArcs();
}

// Утилита экранирования HTML
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}
