// ============================================
// ЭКСПОРТ / ИМПОРТ данных (с поддержкой вариаций)
// ============================================

// Миграция старой модели персонажа ({ image, imageId }) в новую ({ variations: [] })
function migrateGlobalChar(char) {
    if (Array.isArray(char.variations) && char.variations.length > 0) {
        // Уже новая модель — приводим к каноническому виду
        char.variations = char.variations.map(v => ({
            id: v.id || ('migrated-' + char.id + '-' + Math.random().toString(36).slice(2, 8)),
            caption: v.caption || '',
            imageData: v.imageData || v.image || '',
            imageId: v.imageId || ''
        }));
        return char;
    }
    // Старая модель с одним изображением
    char.variations = [{
        id: 'migrated-' + char.id + '-' + Date.now(),
        caption: '',
        imageData: char.image || '',
        imageId: char.imageId || ''
    }];
    delete char.image;
    delete char.imageId;
    return char;
}

function exportToFile() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const dateStr = `${day}.${month}.${year}_${hours}.${minutes}`;

    // Готовим данные с base64-изображениями для портативности экспорта
    const arcsForExport = arcs.map(arc => ({ ...arc }));
    const globalCharsForExport = globalCharacters.map(c => ({
        id: c.id,
        name: c.name,
        variations: (c.variations || []).map(v => ({
            id: v.id,
            caption: v.caption,
            image: v.imageData || '',
            imageId: ''
        }))
    }));

    const exportData = {
        arcs: arcsForExport,
        globalCharacters: globalCharsForExport,
        globalCharIdCounter: globalCharIdCounter
    };
    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `naruto-tracker-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function openImportModal() {
    document.getElementById('importTextarea').value = '';
    document.getElementById('importFileInput').value = '';
    document.getElementById('importModal').classList.add('active');
}

function importFromFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            processImport(data);
        } catch (err) {
            alert('Ошибка чтения файла: ' + err.message);
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function importFromText() {
    const text = document.getElementById('importTextarea').value.trim();
    if (!text) {
        alert('Вставьте данные для импорта');
        return;
    }
    try {
        const data = JSON.parse(text);
        processImport(data);
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

async function processImport(data) {
    let importArcs, importGlobalChars, importCounter;

    if (Array.isArray(data)) {
        importArcs = data;
        importGlobalChars = [];
        importCounter = 1;
    } else if (data.arcs && Array.isArray(data.arcs)) {
        importArcs = data.arcs;
        importGlobalChars = data.globalCharacters || [];
        importCounter = data.globalCharIdCounter || 1;
    } else {
        alert('Неверный формат данных');
        return;
    }

    if (!confirm(`Импортировать ${importArcs.length} арок? Текущие данные будут заменены.`)) {
        return;
    }
    destroyYTPlayer();
    await clearImagesDB();

    arcs = importArcs;
    globalCharacters = importGlobalChars;
    globalCharIdCounter = importCounter;

    arcIdCounter = arcs.length > 0 ? Math.max(...arcs.map(a => a.id || 0)) + 1 : 1;
    if (globalCharacters.length > 0) {
        globalCharIdCounter = Math.max(globalCharIdCounter, Math.max(...globalCharacters.map(c => c.id || 0)) + 1);
    }

    // Нормализация арок
    arcs.forEach(arc => {
        if (!arc.viewMode) arc.viewMode = 'numeric';
        if (arc.coverImage === undefined) arc.coverImage = '';
        if (arc.coverImageId === undefined) arc.coverImageId = '';
        if (!arc.openings) arc.openings = [];
        arc.episodes.forEach(ep => {
            if (ep.watched === undefined) ep.watched = false;
            if (ep.rating === undefined) ep.rating = null;
            if (!ep.title) ep.title = `Серия ${ep.number}`;
            if (ep.watchDate === undefined) ep.watchDate = '';
        });
        if (!arc.characters) arc.characters = [];
        arc.characters.forEach(char => {
            if (char.isDead === undefined) char.isDead = false;
            if (char.selectedVariationId === undefined) char.selectedVariationId = null;
        });
        arc.openings.forEach(op => {
            if (!op.id) op.id = Date.now();
        });
    });

    // Сохраняем обложки арок в IndexedDB
    for (const arc of arcs) {
        if (arc.coverImage && arc.coverImage.startsWith('data:')) {
            const imgId = `arc-cover-${arc.id}-${Date.now()}`;
            await saveImageToDB(imgId, arc.coverImage);
            arc.coverImageId = imgId;
        }
    }

    // Нормализация и сохранение персонажей (с миграцией в модель вариаций)
    for (const char of globalCharacters) {
        migrateGlobalChar(char);
        for (const v of char.variations) {
            const imgData = v.imageData || v.image || '';
            if (imgData && imgData.startsWith('data:')) {
                const imgId = `global-char-img-${char.id}-${v.id}-${Date.now()}`;
                await saveImageToDB(imgId, imgData);
                v.imageId = imgId;
            }
            v.imageData = imgData;
            delete v.image;
        }
    }

    await saveData();
    renderArcs();
    closeModal('importModal');
    alert('Импорт завершён успешно!');
}
