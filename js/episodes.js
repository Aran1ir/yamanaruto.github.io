// ============================================
// СЕРИИ — добавление, удаление, отметки
// ============================================
function setViewMode(arcId, mode) {
    const arc = arcs.find(a => a.id === arcId);
    if (arc) {
        arc.viewMode = mode;
        saveData();
        renderArcs();
    }
}

function addEpisodes(arcId, start, end) {
    const arc = arcs.find(a => a.id === arcId);
    if (!arc) return;
    const startNum = parseInt(start);
    const endNum = parseInt(end);
    if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) return;
    for (let i = startNum; i <= endNum; i++) {
        if (!arc.episodes.some(e => e.number === i)) {
            arc.episodes.push({
                number: i,
                watched: false,
                title: `Серия ${i}`,
                rating: null,
                watchDate: ''
            });
        }
    }
    arc.episodes.sort((a, b) => a.number - b.number);
    saveData();
    renderArcs();
}

function removeEpisode(arcId, episodeNumber) {
    const arc = arcs.find(a => a.id === arcId);
    if (arc) {
        arc.episodes = arc.episodes.filter(e => e.number !== episodeNumber);
        saveData();
        renderArcs();
    }
}

function toggleEpisode(arcId, episodeNumber) {
    const arc = arcs.find(a => a.id === arcId);
    if (arc) {
        const ep = arc.episodes.find(e => e.number === episodeNumber);
        if (ep) {
            ep.watched = !ep.watched;
            if (!ep.watched) {
                ep.rating = null;
                ep.watchDate = '';
            }
            saveData();
            renderArcContent(arcId);
            updateStats();
        }
    }
}

function setEpisodeRating(arcId, episodeNumber, rating) {
    const arc = arcs.find(a => a.id === arcId);
    if (arc) {
        const ep = arc.episodes.find(e => e.number === episodeNumber);
        if (ep) {
            if (ep.rating === rating) {
                ep.rating = null;
            } else {
                ep.rating = rating;
                ep.watched = true;
            }
            saveData();
            renderArcContent(arcId);
            updateStats();
        }
    }
}

function updateEpisodeTitle(arcId, episodeNumber, title) {
    const arc = arcs.find(a => a.id === arcId);
    if (arc) {
        const ep = arc.episodes.find(e => e.number === episodeNumber);
        if (ep) {
            ep.title = title;
            saveData();
        }
    }
}

function updateEpisodeDate(arcId, episodeNumber, date) {
    const arc = arcs.find(a => a.id === arcId);
    if (arc) {
        const ep = arc.episodes.find(e => e.number === episodeNumber);
        if (ep) {
            ep.watchDate = date;
            saveData();
        }
    }
}
