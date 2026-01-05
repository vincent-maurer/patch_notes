// =========================================================================
// TAPE.JS
// Handles 4 Track Tape Recorder
// =========================================================================


const TAPE = {
    // Configuration
    maxBufferSeconds: 60,
    activeLoopLength: 30,
    loopEnabled: true,
    sampleRate: 44100,

    // State
    tracks: [null, null, null, null],
    sources: [null, null, null, null],
    muted: [false, false, false, false],
    gains: [1.0, 1.0, 1.0, 1.0],

    // Status
    isPlaying: false,
    isRecording: false,
    activeTrackIndex: 0,
    currentSample: 0,
    startTime: 0,
    offset: 0,
    speed: 1.0,
    tempSpeed: null,
    isReverse: false,
    sourceMode: 'mix',

    // Audio Nodes & internals
    masterGain: null,
    recorderNode: null,
    satNode: null,
    wowOsc: null,
    wowGain: null,
    monitorNode: null,
    extAttenuator: null,

    // FX Parameters
    wowAmount: 0,
    satAmount: 0,

    // Timing
    rafId: null,
    lastUiTime: 0
};

// =========================================================================
// AUDIO ENGINE INITIALIZATION
// =========================================================================

function initTape() {
    if (!audioCtx) return false;
    if (TAPE.masterGain) return true;

    TAPE.sampleRate = audioCtx.sampleRate;

    // 1. Initialize Buffers
    const len = TAPE.sampleRate * TAPE.maxBufferSeconds;
    for (let i = 0; i < 4; i++) {
        if (!TAPE.tracks[i]) {
            TAPE.tracks[i] = audioCtx.createBuffer(2, len, TAPE.sampleRate);
        }
    }

    // 2. Output Chain
    TAPE.masterGain = audioCtx.createGain();
    TAPE.satNode = audioCtx.createWaveShaper();
    TAPE.satNode.curve = createDistortionCurve(0);
    TAPE.satNode.oversample = '4x';

    TAPE.satNode.connect(TAPE.masterGain);
    TAPE.masterGain.connect(audioCtx.destination);

    // 3. Monitor Node
    TAPE.monitorNode = audioCtx.createGain();
    TAPE.monitorNode.gain.value = 0;
    TAPE.monitorNode.connect(audioCtx.destination);

    // 4. External Input Attenuator (Counteract system gain)
    TAPE.extAttenuator = audioCtx.createGain();
    TAPE.extAttenuator.gain.value = 0.1;

    // 5. FX Setup
    TAPE.wowOsc = audioCtx.createOscillator();
    TAPE.wowOsc.type = 'sine';
    TAPE.wowOsc.frequency.value = 0.5;

    TAPE.wowGain = audioCtx.createGain();
    TAPE.wowGain.gain.value = 0;

    TAPE.wowOsc.connect(TAPE.wowGain);
    TAPE.wowOsc.start();

    // 6. Worklet Setup
    if (!audioNodes['workletLoaded']) return false;
    try {
        TAPE.recorderNode = new AudioWorkletNode(audioCtx, 'recorder-processor');
        TAPE.recorderNode.port.onmessage = (e) => {
            if (e.data === 'start' || e.data === 'stop') return;
            handleTapeWrite(e.data);
        };

        if (audioNodes['Limiter']) {
            updateTapeRouting();
            const silent = audioCtx.createGain();
            silent.gain.value = 0;
            TAPE.recorderNode.connect(silent);
            silent.connect(audioCtx.destination);
        }
        return true;
    } catch (e) {
        console.error("Tape Init Error", e);
        return false;
    }
}

function updateTapeRouting() {
    const btn = document.getElementById('tapeSourceToggle');
    if (btn) {
        if (TAPE.sourceMode === 'mix') {
            btn.textContent = "MIX IN";
            btn.classList.remove('mode-ext');
            btn.classList.add('mode-mix');
            btn.title = "Source: Main Mix (System Audio Active)";
        } else {
            btn.textContent = "EXT IN";
            btn.classList.remove('mode-mix');
            btn.classList.add('mode-ext');
            btn.title = "Source: Direct Input (System Audio Muted)";
        }
    }

    if (!audioCtx || !TAPE.recorderNode) return;
    if (!TAPE.monitorNode) initTape();

    const sourceMix = audioNodes['Limiter'];
    const sourceExt = audioNodes['Stereo_Line_In'];

    // Cleanup existing connections
    try { sourceMix.disconnect(TAPE.recorderNode); } catch (e) { }
    try { sourceExt.disconnect(TAPE.extAttenuator); } catch (e) { }
    try { TAPE.extAttenuator.disconnect(); } catch (e) { }
    try { sourceExt.disconnect(TAPE.monitorNode); } catch (e) { }

    // Apply Routing
    if (TAPE.sourceMode === 'mix') {
        if (sourceMix) sourceMix.connect(TAPE.recorderNode);
        TAPE.monitorNode.gain.value = 0;
        try { sourceMix.connect(audioCtx.destination); } catch (e) { }
    } else {
        if (sourceExt) {
            sourceExt.connect(TAPE.extAttenuator);
            TAPE.extAttenuator.connect(TAPE.recorderNode);
            TAPE.extAttenuator.connect(TAPE.monitorNode);
            TAPE.monitorNode.gain.value = 1.0;
        }
        try { sourceMix.disconnect(audioCtx.destination); } catch (e) { }
    }
}

// =========================================================================
// TRANSPORT CONTROLS
// =========================================================================

function tapePlay() {
    if (!audioCtx || audioCtx.state !== 'running') {
        showMessage("Audio not running.", "error");
        return;
    }
    if (!TAPE.masterGain) initTape();

    // Auto-rewind if at end and not looping
    if (!TAPE.loopEnabled && TAPE.offset >= TAPE.activeLoopLength - 0.1) {
        TAPE.offset = 0;
        updateTapeCounter();
    }

    if (TAPE.isPlaying) tapeStop();

    TAPE.startTime = audioCtx.currentTime;
    TAPE.lastUiTime = audioCtx.currentTime;

    for (let i = 0; i < 4; i++) {
        if (!TAPE.tracks[i]) continue;

        const src = audioCtx.createBufferSource();
        src.buffer = TAPE.tracks[i];
        src.loop = TAPE.loopEnabled;
        src.loopStart = 0;
        src.loopEnd = TAPE.activeLoopLength;

        // Speed & Wow/Flutter modulation
        src.playbackRate.value = Math.abs(TAPE.speed);
        if (TAPE.wowGain) {
            TAPE.wowGain.connect(src.playbackRate);
        }

        const gain = audioCtx.createGain();
        gain.gain.value = 0; // Initialize at zero to fade in

        src.connect(gain);
        gain.connect(TAPE.satNode);

        let startOffset = TAPE.offset % TAPE.activeLoopLength;
        if (startOffset < 0) startOffset += TAPE.activeLoopLength;

        src.start(0, startOffset);

        const isMuted = TAPE.muted[i];
        const finalVol = isMuted ? 0.0 : 1.0;
        gain.gain.setTargetAtTime(finalVol, audioCtx.currentTime, 0.01);

        TAPE.sources[i] = {
            node: src,
            gain: gain,
            startTime: TAPE.startTime,
            offset: startOffset
        };
    }

    TAPE.isPlaying = true;
    updateTrackGains();
    updateTapeUI('playing');
    tapeLoopUI();
}

function tapeRecord() {
    if (!TAPE.masterGain) initTape();
    if (!TAPE.isPlaying) tapePlay();

    if (TAPE.recorderNode) {
        TAPE.recHeadSample = TAPE.currentSample;
        TAPE.recorderNode.port.postMessage('start');
        TAPE.isRecording = true;
        updateTrackGains();
        updateTapeUI('recording');
    }
}

function tapeStop() {
    if (TAPE.isRecording && TAPE.recorderNode) {
        TAPE.recorderNode.port.postMessage('stop');
        TAPE.isRecording = false;
        setTimeout(() => refreshAllWaveforms(), 100);
    }

    if (TAPE.isPlaying) {
        TAPE.sources.forEach(obj => {
            if (obj) {
                try {
                    obj.node.stop();
                    if (TAPE.wowGain) TAPE.wowGain.disconnect(obj.node.playbackRate);
                    obj.node.disconnect();
                    obj.gain.disconnect();
                } catch (e) { }
            }
        });
        TAPE.sources = [null, null, null, null];
        TAPE.isPlaying = false;
    }

    cancelAnimationFrame(TAPE.rafId);
    updateTapeUI('stopped');
}

function tapeReturnToZero() {
    TAPE.offset = 0;
    TAPE.currentSample = 0;
    updateTapeCounter();

    if (TAPE.isPlaying) {
        tapeStop();
        tapePlay();
    }
}

// =========================================================================
// AUDIO PROCESSING & FX
// =========================================================================

function handleTapeWrite(data) {
    if (!TAPE.isRecording || !TAPE.isPlaying) return;

    const { l, r } = data;
    const track = TAPE.tracks[TAPE.activeTrackIndex];
    if (!track) return;

    const ch0 = track.getChannelData(0);
    const ch1 = track.getChannelData(1);

    const currentSpeed = (TAPE.tempSpeed !== null) ? TAPE.tempSpeed : TAPE.speed;
    const step = TAPE.isReverse ? -1 : 1;
    const rate = Math.abs(currentSpeed);

    let writeCursor = TAPE.recHeadSample;
    const loopLimitSamples = Math.floor(TAPE.activeLoopLength * TAPE.sampleRate);

    for (let i = 0; i < l.length; i++) {
        let idx = Math.floor(writeCursor) % loopLimitSamples;
        if (idx < 0) idx += loopLimitSamples;

        ch0[idx] = l[i];
        ch1[idx] = r[i];

        writeCursor += (step * rate);
    }

    TAPE.recHeadSample = writeCursor % loopLimitSamples;
    if (TAPE.recHeadSample < 0) TAPE.recHeadSample += loopLimitSamples;

    const btn = document.querySelector(`.track-btn[data-track="${TAPE.activeTrackIndex}"]`);
    if (btn && !btn.classList.contains('track-has-data')) btn.classList.add('track-has-data');

    requestAnimationFrame(() => {
        drawWaveform(TAPE.activeTrackIndex);
    });
}

function updateTapeFX() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    // Saturation (0-100 -> Curve 0-400)
    const satVal = TAPE.satAmount * 120;
    if (TAPE.satNode) {
        TAPE.satNode.curve = createDistortionCurve(satVal);
    }

    // Wow / Flutter
    const wowDepth = TAPE.wowAmount * 0.05;
    const wowFreq = 0.2 + (TAPE.wowAmount * 3.8);

    if (TAPE.wowOsc && TAPE.wowGain) {
        TAPE.wowOsc.frequency.setTargetAtTime(wowFreq, now, 0.1);
        TAPE.wowGain.gain.setTargetAtTime(wowDepth, now, 0.1);
    }
}

function updateTrackGains() {
    if (!TAPE.isPlaying) return;

    TAPE.sources.forEach((srcObj, i) => {
        if (srcObj && srcObj.gain) {
            // Mute logic: Global mute OR actively recording on this track
            const isRecTarget = (TAPE.isRecording && TAPE.activeTrackIndex === i);
            const isMuted = TAPE.muted[i];

            // Fader Logic
            const faderLevel = (TAPE.gains && TAPE.gains[i] !== undefined) ? TAPE.gains[i] : 1.0;
            const targetVol = (isMuted || isRecTarget) ? 0.0 : faderLevel;

            try {
                srcObj.gain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);
            } catch (e) {
                console.error(e);
            }
        }
    });
}

function declickBuffer(buffer) {
    if (!buffer) return;
    const fadeLen = 500;
    const len = buffer.length;

    for (let c = 0; c < buffer.numberOfChannels; c++) {
        const data = buffer.getChannelData(c);

        // Fade In
        for (let i = 0; i < fadeLen; i++) {
            data[i] *= (i / fadeLen);
        }
        // Fade Out
        for (let i = 0; i < fadeLen; i++) {
            const idx = len - 1 - i;
            data[idx] *= (i / fadeLen);
        }
    }
}

// =========================================================================
// SEEKING, SCRUBBING & LOOP UI
// =========================================================================

function tapeSeek(direction) {
    if (!TAPE.isPlaying) {
        const jump = 2.0;
        TAPE.offset = (TAPE.offset + (jump * direction)) % TAPE.activeLoopLength;
        if (TAPE.offset < 0) TAPE.offset += TAPE.activeLoopLength;
        TAPE.currentSample = Math.floor(TAPE.offset * TAPE.sampleRate);
        updateTapeCounter();
        return;
    }

    const scrubSpeed = 4.0;
    TAPE.tempSpeed = scrubSpeed * direction;

    TAPE.sources.forEach(obj => {
        if (obj && obj.node) {
            obj.node.playbackRate.setTargetAtTime(scrubSpeed, audioCtx.currentTime, 0.05);
        }
    });
}

function tapeSeekEnd() {
    TAPE.tempSpeed = null;
    if (TAPE.isPlaying) {
        TAPE.sources.forEach(obj => {
            if (obj && obj.node) {
                obj.node.playbackRate.setTargetAtTime(Math.abs(TAPE.speed), audioCtx.currentTime, 0.05);
            }
        });
    }
}

function tapeLoopUI() {
    if (!TAPE.isPlaying) return;

    const now = audioCtx.currentTime;
    if (!TAPE.lastUiTime) TAPE.lastUiTime = now;
    const dt = now - TAPE.lastUiTime;
    TAPE.lastUiTime = now;

    const currentSpeed = (TAPE.tempSpeed !== null) ? TAPE.tempSpeed : TAPE.speed;
    const speedVal = Math.abs(currentSpeed);

    let direction = TAPE.isReverse ? -1 : 1;
    if (TAPE.tempSpeed !== null && TAPE.tempSpeed < 0) direction *= -1;

    TAPE.offset += (dt * speedVal * direction);

    if (TAPE.loopEnabled) {
        if (TAPE.offset >= TAPE.activeLoopLength) TAPE.offset -= TAPE.activeLoopLength;
        if (TAPE.offset < 0) TAPE.offset += TAPE.activeLoopLength;
    } else {
        if (TAPE.offset >= TAPE.activeLoopLength || TAPE.offset < 0) {
            TAPE.offset = Math.max(0, Math.min(TAPE.offset, TAPE.activeLoopLength));
            tapeStop();
            updateTapeCounter();
            return;
        }
    }

    TAPE.currentSample = Math.floor(TAPE.offset * TAPE.sampleRate);
    updateTapeCounter(TAPE.offset);
    TAPE.rafId = requestAnimationFrame(tapeLoopUI);
}

function updateTapeCounter(seconds) {
    if (seconds === undefined) seconds = TAPE.offset;

    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const ms = Math.floor((seconds % 1) * 100).toString().padStart(2, '0');

    const counterEl = document.getElementById('tapeCounter');
    if (counterEl) counterEl.textContent = `${m}:${s}:${ms}`;

    // Update Scrub Bar Head
    const pct = (seconds / TAPE.activeLoopLength) * 100;
    const headEl = document.getElementById('tapeHeadIndicator');
    if (headEl) headEl.style.left = `${pct}%`;

    // Rotate Reels
    const reelL = document.getElementById('reelL');
    const reelR = document.getElementById('reelR');

    if (reelL && reelR) {
        const rotation = seconds * 45;
        reelL.style.transform = `rotate(-${rotation}deg)`;
        reelR.style.transform = `rotate(-${rotation}deg)`;
    }
}

function setupScrubInteraction() {
    const scrubBar = document.getElementById('tapeScrubBar');
    let isScrubbing = false;
    let wasPlaying = false;

    const handleScrub = (e) => {
        const rect = scrubBar.getBoundingClientRect();
        const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        let x = clientX - rect.left;

        let pct = x / rect.width;
        if (pct < 0) pct = 0;
        if (pct > 1) pct = 1;

        TAPE.offset = pct * TAPE.activeLoopLength;
        TAPE.currentSample = Math.floor(TAPE.offset * TAPE.sampleRate);
        updateTapeCounter(TAPE.offset);
    };

    const startScrub = (e) => {
        if (e.cancelable) e.preventDefault();
        isScrubbing = true;

        if (TAPE.isPlaying) {
            wasPlaying = true;
            tapeStop();
        } else {
            wasPlaying = false;
        }

        handleScrub(e);

        document.addEventListener('mousemove', moveScrub);
        document.addEventListener('touchmove', moveScrub, { passive: false });
        document.addEventListener('mouseup', endScrub);
        document.addEventListener('touchend', endScrub);
    };

    const moveScrub = (e) => {
        if (!isScrubbing) return;
        if (e.cancelable) e.preventDefault();
        handleScrub(e);
    };

    const endScrub = (e) => {
        isScrubbing = false;
        document.removeEventListener('mousemove', moveScrub);
        document.removeEventListener('touchmove', moveScrub);
        document.removeEventListener('mouseup', endScrub);
        document.removeEventListener('touchend', endScrub);

        if (wasPlaying) {
            tapePlay();
        }
    };

    scrubBar.addEventListener('mousedown', startScrub);
    scrubBar.addEventListener('touchstart', startScrub, { passive: false });
}

// =========================================================================
// VISUALIZATION
// =========================================================================

function initWaveforms() {
    const strips = document.querySelectorAll('.track-strip');
    strips.forEach((strip, i) => {
        if (strip.querySelector('.track-waveform')) return;

        const canvas = document.createElement('canvas');
        canvas.className = 'track-waveform';
        canvas.id = `waveform-${i}`;
        strip.insertBefore(canvas, strip.querySelector('.mixer-fader'));
    });
}

function drawWaveform(trackIndex) {
    const canvas = document.getElementById(`waveform-${trackIndex}`);
    const buffer = TAPE.tracks[trackIndex];

    if (!canvas || !buffer) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // Color logic
    ctx.fillStyle = TAPE.muted[trackIndex] ? '#444' : '#10b981';
    if (TAPE.activeTrackIndex === trackIndex && TAPE.isRecording) ctx.fillStyle = '#ef4444';

    const dataL = buffer.getChannelData(0);
    const loopSamples = Math.floor(TAPE.activeLoopLength * TAPE.sampleRate);
    const step = Math.ceil(loopSamples / h);

    ctx.beginPath();
    for (let i = 0; i < h; i++) {
        let min = 1.0;
        let max = -1.0;

        const sampleIdx = i * step;

        if (sampleIdx < loopSamples) {
            for (let j = 0; j < step; j++) {
                const datum = dataL[sampleIdx + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            const x = (w / 2) + (min * (w / 2));
            const width = Math.max(1, (max - min) * (w / 2));
            ctx.fillRect(x, i, width, 1);
        }
    }
}

function refreshAllWaveforms() {
    for (let i = 0; i < 4; i++) drawWaveform(i);
}

function updateTapeUI(state) {
    const win = document.getElementById('recorderWindow');
    const btnPlay = document.getElementById('tapeBtnPlay');
    const btnRec = document.getElementById('tapeBtnRec');

    win.classList.remove('is-active-tape', 'is-recording');
    btnPlay.classList.remove('active');
    btnRec.classList.remove('active');

    if (state === 'playing') {
        win.classList.add('is-active-tape');
        btnPlay.classList.add('active');
    } else if (state === 'recording') {
        win.classList.add('is-active-tape', 'is-recording');
        btnPlay.classList.add('active');
        btnRec.classList.add('active');
    }
}

// =========================================================================
// EXPORT & HELPERS
// =========================================================================

function getEffectiveTapeEnd() {
    let maxFrame = 0;
    const threshold = 0.001;

    for (let t = 0; t < 4; t++) {
        const buffer = TAPE.tracks[t];
        if (!buffer) continue;

        const dataL = buffer.getChannelData(0);
        const dataR = buffer.getChannelData(1);

        for (let i = buffer.length - 1; i >= 0; i -= 100) {
            if (Math.abs(dataL[i]) > threshold || Math.abs(dataR[i]) > threshold) {
                let exactEnd = Math.min(buffer.length, i + 100);
                if (exactEnd > maxFrame) maxFrame = exactEnd;
                break;
            }
        }
    }

    const loopSamples = Math.floor(TAPE.activeLoopLength * TAPE.sampleRate);
    if (TAPE.loopEnabled) {
        return loopSamples;
    }

    const padding = TAPE.sampleRate * 0.5;
    return Math.min(maxFrame + padding, TAPE.tracks[0].length);
}

async function tapeExportStems() {
    if (typeof JSZip === 'undefined') {
        showMessage("JSZip library missing.", "error");
        return;
    }

    const zip = new JSZip();
    const patchName = (document.getElementById('patchNameInput').value || "Session").replace(/[^a-z0-9]/gi, '_');
    const folder = zip.folder(`${patchName}_Stems`);

    const effectiveLen = getEffectiveTapeEnd();
    if (effectiveLen < 1000) {
        showMessage("Tape appears empty.", "warning");
        return;
    }

    let hasData = false;

    for (let i = 0; i < 4; i++) {
        const trackBuffer = TAPE.tracks[i];
        if (!trackBuffer) continue;

        const chData = trackBuffer.getChannelData(0);
        let isSilent = true;
        for (let k = 0; k < effectiveLen; k += 1000) {
            if (Math.abs(chData[k]) > 0.001) {
                isSilent = false;
                break;
            }
        }

        if (!isSilent) {
            hasData = true;
            const leftSlice = trackBuffer.getChannelData(0).slice(0, effectiveLen);
            const rightSlice = trackBuffer.getChannelData(1).slice(0, effectiveLen);

            const interleaved = interleave(leftSlice, rightSlice);
            const wavDataView = encodeWAV(interleaved, null);
            folder.file(`Track_${i + 1}.wav`, wavDataView.buffer);
        }
    }

    if (!hasData) {
        showMessage("Nothing to export.", "warning");
        return;
    }

    showMessage("Zipping Stems...", "info");

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${patchName}_Stems.zip`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 1000);
        showMessage("Stems Exported!", "success");
    } catch (e) {
        console.error(e);
        showMessage("Export Failed.", "error");
    }
}

function tapeMixdown() {
    const effectiveLen = getEffectiveTapeEnd();

    if (effectiveLen === 0) {
        showMessage("Tape is empty (Silence).", "warning");
        return;
    }

    const mixL = new Float32Array(effectiveLen);
    const mixR = new Float32Array(effectiveLen);

    for (let t = 0; t < 4; t++) {
        if (TAPE.muted[t]) continue;
        const vol = TAPE.gains[t];
        const l = TAPE.tracks[t].getChannelData(0);
        const r = TAPE.tracks[t].getChannelData(1);

        for (let i = 0; i < effectiveLen; i++) {
            mixL[i] += (l[i] * vol);
            mixR[i] += (r[i] * vol);
        }
    }

    // Soft Limiter
    for (let i = 0; i < effectiveLen; i++) {
        mixL[i] = Math.max(-1, Math.min(1, mixL[i]));
        mixR[i] = Math.max(-1, Math.min(1, mixR[i]));
    }

    const interleaved = interleave(mixL, mixR);

    // Embed Metadata
    const patchState = getCurrentPatchState();
    const optimized = optimizeState(patchState);
    const metaString = JSON.stringify(optimized);
    const compressedMeta = LZString.compressToEncodedURIComponent(metaString);

    const dataview = encodeWAV(interleaved, compressedMeta);

    const blob = new Blob([dataview], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;

    const name = (document.getElementById('patchNameInput').value || "Tape_Mix").replace(/[^a-z0-9]/gi, '_');
    a.download = `${name}_Mixdown.wav`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
    showMessage("Mixdown Exported (Trimmed)!", "success");
}

async function tapeClearTrack() {
    if (!await CustomDialog.confirm(`Erase Track ${TAPE.activeTrackIndex + 1}?`)) return;
    const track = TAPE.tracks[TAPE.activeTrackIndex];
    if (track) {
        track.getChannelData(0).fill(0);
        track.getChannelData(1).fill(0);
        const btn = document.querySelector(`.track-btn[data-track="${TAPE.activeTrackIndex}"]`);
        btn.classList.remove('track-has-data');
        showMessage(`Track ${TAPE.activeTrackIndex + 1} Erased.`, "info");
        drawWaveform(TAPE.activeTrackIndex);
    }
}

function toggleTrackMute(idx) {
    TAPE.muted[idx] = !TAPE.muted[idx];
    const btn = document.querySelector(`.track-btn[data-track="${idx}"]`);
    if (TAPE.muted[idx]) btn.classList.add('muted');
    else btn.classList.remove('muted');
    updateTrackGains();
}

// =========================================================================
// UI SETUP & EVENT BINDINGS
// =========================================================================

function setupRecorderUI() {
    initTape();
    const win = document.getElementById('recorderWindow');
    setupDrag(win, document.getElementById('recorderHeader'));

    // 1. Visibility & Window Logic
    document.getElementById('recorderToggle').addEventListener('click', () => {
        const isHidden = win.style.display === 'none' || win.style.display === '';
        win.style.display = isHidden ? 'flex' : 'none';
        if (isHidden && !TAPE.masterGain) initTape();
    });
    document.getElementById('closeRecorder').addEventListener('click', () => win.style.display = 'none');

    // 2. Settings Menu
    const settingsOverlay = document.getElementById('tapeSettingsOverlay');
    document.getElementById('tapeSettingsBtn').addEventListener('click', () => settingsOverlay.classList.add('open'));
    document.getElementById('tapeCloseSettings').addEventListener('click', () => settingsOverlay.classList.remove('open'));

    document.getElementById('tapeLoopLength').addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 60) val = 60;
        TAPE.activeLoopLength = val;
        if (TAPE.isPlaying) {
            tapeStop();
            tapePlay();
        }
    });

    document.getElementById('tapeClearAll').addEventListener('click', async () => {
        if (await CustomDialog.confirm("Erase ENTIRE tape (all 4 tracks)?")) {
            for (let i = 0; i < 4; i++) {
                if (TAPE.tracks[i]) {
                    TAPE.tracks[i].getChannelData(0).fill(0);
                    TAPE.tracks[i].getChannelData(1).fill(0);
                }
            }
            document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('track-has-data'));
            settingsOverlay.classList.remove('open');
            showMessage("Tape Formatted.", "success");
        }
    });

    // 3. Transport Controls
    document.getElementById('tapeBtnPlay').addEventListener('click', () => {
        if (TAPE.isPlaying && !TAPE.isRecording) tapeStop();
        else tapePlay();
    });

    document.getElementById('tapeBtnStop').addEventListener('click', tapeStop);
    document.getElementById('tapeBtnRTZ').addEventListener('click', tapeReturnToZero);

    document.getElementById('tapeBtnRec').addEventListener('click', () => {
        if (TAPE.isRecording) {
            if (TAPE.tracks[TAPE.activeTrackIndex]) {
                declickBuffer(TAPE.tracks[TAPE.activeTrackIndex]);
            }
            TAPE.isRecording = false;
            if (TAPE.recorderNode) TAPE.recorderNode.port.postMessage('stop');
            updateTrackGains();
            updateTapeUI('playing');
        } else {
            tapeRecord();
        }
    });

    const btnLoop = document.getElementById('tapeBtnLoop');
    btnLoop.addEventListener('click', () => {
        TAPE.loopEnabled = !TAPE.loopEnabled;
        if (TAPE.loopEnabled) btnLoop.classList.add('active');
        else btnLoop.classList.remove('active');

        if (TAPE.isPlaying) {
            TAPE.sources.forEach(obj => {
                if (obj && obj.node) obj.node.loop = TAPE.loopEnabled;
            });
        }
    });

    // 4. Track Selection
    document.querySelectorAll('.track-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.track);
            if (TAPE.activeTrackIndex === idx) {
                toggleTrackMute(idx);
            } else {
                document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                TAPE.activeTrackIndex = idx;
                updateTrackGains();
            }
        });
    });

    // 5. Source Toggle (Mix vs Ext)
    const srcBtn = document.getElementById('tapeSourceToggle');
    if (srcBtn) {
        const newSrcBtn = srcBtn.cloneNode(true);
        srcBtn.parentNode.replaceChild(newSrcBtn, srcBtn);

        newSrcBtn.addEventListener('click', () => {
            TAPE.sourceMode = (TAPE.sourceMode === 'mix') ? 'ext' : 'mix';
            updateTapeRouting();
        });
        updateTapeRouting();
    }

    // 6. Faders
    document.querySelectorAll('.mixer-fader').forEach(fader => {
        // Clone to wipe old listeners
        const newFader = fader.cloneNode(true);
        fader.parentNode.replaceChild(newFader, fader);

        newFader.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.track);
            const val = parseFloat(e.target.value);
            TAPE.gains[idx] = val;
            updateTrackGains();
        });

        newFader.addEventListener('dblclick', (e) => {
            e.target.value = 1.0;
            const idx = parseInt(e.target.dataset.track);
            TAPE.gains[idx] = 1.0;
            updateTrackGains();
        });
    });

    // 7. Seek Buttons
    const btnRew = document.getElementById('tapeBtnRew');
    const btnFwd = document.getElementById('tapeBtnFwd');

    const startRew = (e) => { e.preventDefault(); tapeSeek(-1); };
    const startFwd = (e) => { e.preventDefault(); tapeSeek(1); };
    const endSeek = (e) => { e.preventDefault(); tapeSeekEnd(); };

    btnRew.addEventListener('mousedown', startRew);
    btnRew.addEventListener('touchstart', startRew, { passive: false });
    btnRew.addEventListener('mouseup', endSeek);
    btnRew.addEventListener('touchend', endSeek);
    btnRew.addEventListener('mouseleave', endSeek);

    btnFwd.addEventListener('mousedown', startFwd);
    btnFwd.addEventListener('touchstart', startFwd, { passive: false });
    btnFwd.addEventListener('mouseup', endSeek);
    btnFwd.addEventListener('touchend', endSeek);
    btnFwd.addEventListener('mouseleave', endSeek);

    // 8. Actions (Clear, Save, Speed)
    document.getElementById('tapeBtnClear').addEventListener('click', tapeClearTrack);
    document.getElementById('tapeBtnSave').addEventListener('click', tapeMixdown);

    const speedSlider = document.getElementById('tapeSpeed');
    speedSlider.addEventListener('input', (e) => {
        TAPE.speed = parseInt(e.target.value) / 100.0;
        if (TAPE.isPlaying && TAPE.tempSpeed === null) {
            TAPE.sources.forEach(obj => {
                if (obj && obj.node) obj.node.playbackRate.setTargetAtTime(Math.abs(TAPE.speed), audioCtx.currentTime, 0.1);
            });
        }
    });

    speedSlider.addEventListener('dblclick', (e) => {
        e.target.value = 100;
        TAPE.speed = 1.0;
        if (TAPE.isPlaying && TAPE.tempSpeed === null) {
            TAPE.sources.forEach(obj => {
                if (obj && obj.node) obj.node.playbackRate.setTargetAtTime(1.0, audioCtx.currentTime, 0.1);
            });
        }
    });

    document.getElementById('tapeReverseBtn').addEventListener('click', (e) => {
        TAPE.isReverse = !TAPE.isReverse;
        e.target.style.color = TAPE.isReverse ? '#ef4444' : '#666';
    });

    // 9. FX Controls
    const wowSlider = document.getElementById('tapeWowSlider');
    const satSlider = document.getElementById('tapeSatSlider');

    if (wowSlider) {
        wowSlider.addEventListener('input', (e) => {
            TAPE.wowAmount = parseInt(e.target.value) / 100;
            updateTapeFX();
        });
        wowSlider.addEventListener('dblclick', (e) => {
            e.target.value = 0;
            TAPE.wowAmount = 0;
            updateTapeFX();
        });
    }

    if (satSlider) {
        satSlider.addEventListener('input', (e) => {
            TAPE.satAmount = parseInt(e.target.value) / 100;
            updateTapeFX();
        });
        satSlider.addEventListener('dblclick', (e) => {
            e.target.value = 0;
            TAPE.satAmount = 0;
            updateTapeFX();
        });
    }

    const stemsBtn = document.getElementById('tapeExportStems');
    if (stemsBtn) {
        stemsBtn.addEventListener('click', tapeExportStems);
    }

    // 10. Initialize Helper Systems
    setupScrubInteraction();
}