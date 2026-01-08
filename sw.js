const CACHE_NAME = 'patchnotes-v1';
const ASSETS_TO_CACHE = [
    'patchnotes.html',
    'style.css',
    'manifest.json',

    // Images
    'images/largeKnob.svg',
    'images/largeKnob_dark.svg',
    'images/mediumKnob.svg',
    'images/mediumKnob_dark.svg',
    'images/panel_image.svg',
    'images/panel_image_dark.svg',
    'images/smallKnob.svg',
    'images/smallKnob_dark.svg',

    // External Libraries
    'js/ext/dom-to-image.min.js',
    'js/ext/jszip.min.js',
    'js/ext/lz-string.min.js',

    // Core JS
    'js/audio-engine.js',
    'js/computer.js',
    'js/globals.js',
    'js/main.js',
    'js/scope.js',
    'js/tape.js',
    'js/ui.js',
    'js/utils.js',

    // Cards
    'js/cards/CardCV.js',
    'js/cards/CardChord.js',
    'js/cards/CardDefinitions.js',
    'js/cards/CardDrumLoop.js',
    'js/cards/CardDualDelay.js',
    'js/cards/CardEuclidean.js',
    'js/cards/CardMIDI.js',
    'js/cards/CardNoOp.js',
    'js/cards/CardReverb.js',
    'js/cards/CardTuring.js',
    'js/cards/CardTwists.js',
    'js/cards/CardUtilityPair.js',
    'js/cards/CardVCA.js',
    'js/cards/ComputerCard.js',
    'js/cards/UtilityPairDefinitions.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching all assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache Hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
