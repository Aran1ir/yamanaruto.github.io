// ============================================
// YOUTUBE IFrame Player API — глобальный плеер
// ============================================
let ytPlayer = null;
let currentPlayingOpeningId = null;
let currentPlayingArcId = null;
let playerContainerId = null;

function onYouTubeIframeAPIReady() {
    console.log('YouTube IFrame Player API готов');
}

function createYTPlayer(containerId, videoId) {
    if (ytPlayer) {
        try {
            ytPlayer.destroy();
        } catch(e) {}
        ytPlayer = null;
    }

    playerContainerId = containerId;

    ytPlayer = new YT.Player(containerId, {
        videoId: videoId,
        playerVars: {
            autoplay: 1,
            origin: window.location.origin,
            enablejsapi: 1,
            modestbranding: 1,
            rel: 0
        },
        events: {
            onReady: function(event) {
                event.target.playVideo();
            },
            onError: function(event) {
                console.error('Ошибка плеера:', event.data);
            }
        }
    });
}

function destroyYTPlayer() {
    if (ytPlayer) {
        try {
            ytPlayer.stopVideo();
            ytPlayer.destroy();
        } catch(e) {}
        ytPlayer = null;
    }
    playerContainerId = null;
    currentPlayingOpeningId = null;
    currentPlayingArcId = null;
}

function extractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}
