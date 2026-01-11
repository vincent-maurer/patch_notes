// =========================================================================
// 3. GLOBAL HELPER FUNCTIONS
// These must be here so ui.js and main.js can both see them.
// =========================================================================


/* =========================================================================
   COLOR & UI UTILITIES
   ========================================================================= */

function getActiveCableColor() {
    if (isRandomColorMode) {
        return getRandomColor();
    }
    return selectedCableColor;
}

function getRandomColor() {
    const len = CABLE_PALETTE.length;
    if (len === 0) return '#ef4444'; // Fallback
    if (len === 1) return CABLE_PALETTE[0];

    let idx;
    // Keep picking a new index until it is different from the last one
    do {
        idx = Math.floor(Math.random() * len);
    } while (idx === lastRandomColorIndex);

    lastRandomColorIndex = idx;
    return CABLE_PALETTE[idx];
}

function generateRandomName() {
    return ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] + ' ' +
        ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] + ' ' +
        NOUNS[Math.floor(Math.random() * NOUNS.length)];
}

function showMessage(message, type = 'info') {
    const box = document.getElementById('messageBox');
    box.textContent = message.replace(/\*\*(.*?)\*\*/g, (match, p1) => p1);

    let baseClass = 'fixed bottom-4 right-4 p-4 rounded-lg shadow-2xl transition-opacity duration-300 opacity-100 z-50';
    let typeClass = '';

    if (type === 'success') {
        typeClass = ' bg-green-600 text-white';
    } else if (type === 'warning') {
        typeClass = ' bg-yellow-500 text-black';
    } else if (type === 'error') {
        typeClass = ' bg-red-600 text-white';
    } else {
        typeClass = ' bg-gray-800 text-white';
    }

    box.className = baseClass + typeClass;
    box.style.display = 'block';

    clearTimeout(box.timer);
    box.timer = setTimeout(() => {
        box.classList.remove('opacity-100');
        box.classList.add('opacity-0');
        setTimeout(() => box.style.display = 'none', 300);
    }, 3000);
}

/* =========================================================================
   DOM & COORDINATE UTILITIES
   ========================================================================= */

function getModuleIndexByJack(jackId) {
    if (typeof MODULES_MAP === 'undefined') return -1;
    return MODULES_MAP.findIndex(m => m.inputs.includes(jackId) || m.outputs.includes(jackId));
}

function getShortId(longId) {
    return SYSTEM_CONFIG[longId]?.short || longId;
}

function getLongId(shortId) {
    return REVERSE_ID_MAP[shortId] || shortId;
}

function getPos(id) {
    const el = document.getElementById(id);
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const container = document.getElementById('synthContainer');
    if (!container) return null;

    const contRect = container.getBoundingClientRect();
    // Use the global VIEWPORT.scale
    const currentScale = (typeof VIEWPORT !== 'undefined') ? VIEWPORT.scale : 1.0;

    // Check if this is a custom gear component (no translate transform)
    const isCustom = SYSTEM_CONFIG && SYSTEM_CONFIG[id] && SYSTEM_CONFIG[id].isCustom;

    // For custom components, the center is already at the element's center
    // For standard components, getBoundingClientRect already gives us the right bounds
    // since we want the visual center of the element
    return {
        x: ((rect.left + rect.width / 2) - contRect.left) / currentScale,
        y: ((rect.top + rect.height / 2) - contRect.top) / currentScale
    };
}


function getCableByIds(id1, id2) {
    return cableData.find(c => (c.start === id1 && c.end === id2) || (c.start === id2 && c.end === id1));
}

function getEventPos(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}

// Helper to convert Screen Mouse X/Y to Zoomed/Panned Workspace X/Y
function getWorkspacePos(clientX, clientY) {
    const rect = document.getElementById('mainContentWrapper').getBoundingClientRect();
    return {
        x: (clientX - rect.left) / VIEWPORT.scale,
        y: (clientY - rect.top) / VIEWPORT.scale
    };
}

function findNearestJack(x, y) {
    // Ensure SYSTEM_CONFIG exists (it should be in config.js)
    if (typeof SYSTEM_CONFIG === 'undefined') return null;

    const currentScale = (typeof VIEWPORT !== 'undefined' && VIEWPORT.scale) ? VIEWPORT.scale : 1.0;
    const threshold = 25 * currentScale;
    let nearestId = null;
    let minDist = Infinity;

    for (const [id, config] of Object.entries(SYSTEM_CONFIG)) {
        // We only care about jacks
        if (!config.type.includes('jack')) continue;

        const el = document.getElementById(id);
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        const jackX = rect.left + rect.width / 2;
        const jackY = rect.top + rect.height / 2;
        const dist = Math.sqrt(Math.pow(x - jackX, 2) + Math.pow(y - jackY, 2));

        if (dist < threshold && dist < minDist) {
            minDist = dist;
            nearestId = id;
        }
    }
    return nearestId;
}

/* =========================================================================
   SVG MATH UTILITIES (Corrected)
   ========================================================================= */

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const safeAngle = isNaN(angleInDegrees) ? -150 : angleInDegrees;
    const angleInRadians = (safeAngle - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}

function describeArc(x, y, outerRadius, innerRadius, startAngle, endAngle) {
    // Calculate points for the "Bracket" shape
    // Start = Min Angle, End = Max Angle
    const startOuter = polarToCartesian(x, y, outerRadius, startAngle);
    const endOuter = polarToCartesian(x, y, outerRadius, endAngle);

    // The "corners" point inwards
    const startInner = polarToCartesian(x, y, innerRadius, startAngle);
    const endInner = polarToCartesian(x, y, innerRadius, endAngle);

    let diff = endAngle - startAngle;
    if (diff < 0) diff += 360;

    const largeArcFlag = diff <= 180 ? "0" : "1";

    // Path Logic:
    // 1. Move to Min Inner (Corner Tip)
    // 2. Line to Min Outer (Corner Edge)
    // 3. Arc to Max Outer
    // 4. Line to Max Inner (Corner Tip)
    // 5. NO CLOSING (Open path)

    const d = [
        "M", startInner.x, startInner.y,
        "L", startOuter.x, startOuter.y,
        "A", outerRadius, outerRadius, 0, largeArcFlag, 1, endOuter.x, endOuter.y,
        "L", endInner.x, endInner.y
    ].join(" ");

    return d;
}
/* =========================================================================
   AUDIO & MATH UTILITIES
   ========================================================================= */

function createDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

function safeParam(param, value, time, slew = 0.002) {
    if (isFinite(value)) {
        try {
            param.setTargetAtTime(value, time, slew);
        } catch (e) {
            // Ignore automation errors
        }
    }
}

function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

function getInterpolatedVoltage(angle, buttonIndex, outputIndex) {
    // 1. Normalize Angle (-150 to 150) to Table Index (0.0 to 6.0)
    // Range is 300 degrees total. 6 segments of 50 degrees each.
    let pos = (angle + 150) / 50;

    // Clamp to safe bounds
    if (pos < 0) pos = 0;
    if (pos > 6) pos = 6;

    // 2. Determine Lower and Upper indices for interpolation
    const idxLow = Math.floor(pos);
    const idxHigh = Math.min(idxLow + 1, 6);
    const t = pos - idxLow; // Remainder (0.0 to 1.0) for lerp

    // 3. Retrieve raw ADC values from table
    const valLow = VOLTAGE_TABLE[idxLow][outputIndex][buttonIndex];
    const valHigh = VOLTAGE_TABLE[idxHigh][outputIndex][buttonIndex];

    // 4. Interpolate to get exact ADC value for this knob position
    const rawADC = lerp(valLow, valHigh, t);

    // 5. Convert ADC (0-65535) to Web Audio (-1.0 to 1.0)
    // Center (0V) is 32768.
    return (rawADC - 32768) / 32768;
}

function createWaveFromFunction(ctx, func) {
    const numSamples = 4096; // High resolution
    const numCoeffs = 128;   // High harmonics

    const real = new Float32Array(numCoeffs);
    const imag = new Float32Array(numCoeffs);

    // 1. Generate Raw Time Domain Data
    const data = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
        const t = i / numSamples;
        // Just capture the raw shape (0..1)
        data[i] = func(t);
    }

    // 2. Perform DFT
    for (let k = 0; k < numCoeffs; k++) {
        let sumReal = 0;
        let sumImag = 0;
        for (let i = 0; i < numSamples; i++) {
            const angle = 2 * Math.PI * k * (i / numSamples);
            sumReal += data[i] * Math.cos(angle);
            sumImag += data[i] * Math.sin(angle);
        }
        real[k] = (sumReal / numSamples) * 2;
        imag[k] = (sumImag / numSamples) * 2;
    }

    // 3. Remove DC Offset (Center the wave)
    real[0] = 0;
    imag[0] = 0;

    // 4. NORMALIZE (Critical Step)
    // Calculate the peak amplitude of the resulting AC wave to ensure it hits -1/1
    let maxAmp = 0;
    for (let i = 0; i < numSamples; i++) {
        let val = 0;
        // Reconstruct time-domain sample from coeffs
        for (let k = 1; k < numCoeffs; k++) {
            const angle = 2 * Math.PI * k * (i / numSamples);
            val += (real[k] * Math.cos(angle)) + (imag[k] * Math.sin(angle));
        }
        if (Math.abs(val) > maxAmp) maxAmp = Math.abs(val);
    }

    // Apply scaling factor
    if (maxAmp > 0) {
        const scale = 1.0 / maxAmp;
        for (let k = 1; k < numCoeffs; k++) {
            real[k] *= scale;
            imag[k] *= scale;
        }
    }

    return ctx.createPeriodicWave(real, imag);
}

function generateReverbImpulse(duration, decay) {
    const rate = audioCtx.sampleRate;
    const length = rate * duration;
    const impulse = audioCtx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
        const vol = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        left[i] = vol;
        right[i] = vol;
    }
    return impulse;
}

/* =========================================================================
   INTERFACE SCALING & INTERACTION
   ========================================================================= */

function updateInterfaceScaling() {
    const container = document.getElementById('synthContainer');
    const board = document.getElementById('pedalboard');
    const inner = document.getElementById('pedalboard-inner');
    const cardSlot = document.querySelector('.card-slot-container');

    if (!container) return;

    // We base everything on the intrinsic width of the synth panel itself (1200px baseline).
    // This ensures elements stay proportional regardless of the Zoom level.
    const synthRect = container.getBoundingClientRect();

    // Divide by VIEWPORT.scale to get the "true" internal width 
    // because getBoundingClientRect returns the zoomed size.
    const currentZoom = (typeof VIEWPORT !== 'undefined') ? VIEWPORT.scale : 1.0;
    const trueSynthWidth = synthRect.width / currentZoom;

    // Base scale factor (1.0 when synth is 1200px wide)
    const globalScale = trueSynthWidth / 1200;

    // 1. Slot Scale (Program Card)
    if (cardSlot) {
        cardSlot.style.fontSize = `${48 * globalScale}px`;
        const exactWidth = trueSynthWidth * 0.09;
        const exactHeight = exactWidth * 0.12;
        cardSlot.style.width = `${exactWidth}px`;
        cardSlot.style.height = `${exactHeight}px`;
    }

    // 2. PEDALBOARD SCALING
    if (board && inner && board.classList.contains('open')) {
        const items = inner.querySelectorAll('.pedal').length;

        // Calculate required width for pedals
        const contentWidth = (items * 156) + 120;

        // Calculate fit
        const fitScale = trueSynthWidth / contentWidth;

        // Final scale with limit
        let finalScale = Math.min(globalScale, fitScale) * 0.85;

        inner.style.transformOrigin = 'top center';
        inner.style.transform = `scale(${finalScale})`;

        // Height Fix
        const unscaledHeight = 330;
        const scaledHeight = unscaledHeight * finalScale;

        board.style.height = `${scaledHeight}px`;
        board.style.marginBottom = '0px';

        inner.classList.add('ready');

        // Update snake cables after a short delay to allow transition
        setTimeout(updatePedalCables, 50);

    } else if (board) {
        board.style.height = '0px';
    }
}

function setupDrag(el, handle) {
    let isDragging = false, startX, startY, initLeft, initTop;

    const start = (e) => {
        // Ignore clicks on buttons/inputs inside the header
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;

        // Stop the event from reaching the Workspace Pan handler
        e.stopPropagation();

        // Prevent scrolling on mobile
        if (e.cancelable) e.preventDefault();

        isDragging = true;

        // Unify Mouse/Touch Coordinates
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        startX = clientX;
        startY = clientY;

        initLeft = el.offsetLeft;
        initTop = el.offsetTop;

        // Bring to front
        el.style.zIndex = '3000';
    };

    const move = (e) => {
        if (!isDragging) return;

        // Stop propagation during move too
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // --- ZOOM MATH ---
        // Get global scale (default 1.0)
        const currentScale = (typeof VIEWPORT !== 'undefined' && VIEWPORT.scale) ? VIEWPORT.scale : 1.0;

        // Calculate Delta, corrected by Zoom Scale
        const dx = (clientX - startX) / currentScale;
        const dy = (clientY - startY) / currentScale;

        el.style.left = (initLeft + dx) + 'px';
        el.style.top = (initTop + dy) + 'px';
    };

    const stop = (e) => {
        if (isDragging) {
            isDragging = false;
            el.style.zIndex = ''; // Restore z-index (or keep it high if preferred)
        }
    };

    // Mouse Events
    handle.addEventListener('mousedown', start);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);

    // Touch Events (Passive: false allows us to prevent scrolling)
    handle.addEventListener('touchstart', start, { passive: false });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', stop);
}

/* =========================================================================
   WAV ENCODING & TAPE ENGINE
   ========================================================================= */

function mergeBuffers(channelBuffer, recordingLength) {
    const result = new Float32Array(recordingLength);
    let offset = 0;
    for (let i = 0; i < channelBuffer.length; i++) {
        result.set(channelBuffer[i], offset);
        offset += channelBuffer[i].length;
    }
    return result;
}

function interleave(inputL, inputR) {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0, inputIndex = 0;
    while (index < length) {
        result[index++] = inputL[inputIndex];
        result[index++] = inputR[inputIndex];
        inputIndex++;
    }
    return result;
}

function encodeWAV(samples, metadataString = null) {
    // Basic Header: 44 bytes
    // Custom Chunk Header: 8 bytes + Data length
    let metaLength = 0;
    let metaPadding = 0;

    if (metadataString) {
        metaLength = metadataString.length;
        // Chunks must be even-aligned
        if (metaLength % 2 !== 0) metaPadding = 1;
    }

    const bufferLength = 44 + samples.length * 2 + (metadataString ? (8 + metaLength + metaPadding) : 0);
    const buffer = new ArrayBuffer(bufferLength);
    const view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * 2 + (metadataString ? (8 + metaLength + metaPadding) : 0), true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 2, true);
    /* sample rate */
    view.setUint32(24, audioCtx.sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, audioCtx.sampleRate * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 4, true);
    /* bits per sample */
    view.setUint16(34, 16, true);

    let offset = 36;

    // --- INJECT CUSTOM METADATA CHUNK ---
    if (metadataString) {
        writeString(view, offset, 'mTmP'); // Custom Chunk ID
        offset += 4;
        view.setUint32(offset, metaLength, true);
        offset += 4;
        writeString(view, offset, metadataString);
        offset += metaLength;
        if (metaPadding) {
            view.setUint8(offset, 0);
            offset += 1;
        }
    }

    /* data chunk identifier */
    writeString(view, offset, 'data');
    offset += 4;
    /* data chunk length */
    view.setUint32(offset, samples.length * 2, true);
    offset += 4;

    floatTo16BitPCM(view, offset, samples);

    return view;
}

function readWavMetadata(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    if (getString(view, 0, 4) !== 'RIFF') return null;
    if (getString(view, 8, 4) !== 'WAVE') return null;

    let offset = 12;
    while (offset < view.byteLength) {
        const chunkId = getString(view, offset, 4);
        const chunkSize = view.getUint32(offset + 4, true);
        if (chunkId === 'mTmP') return getString(view, offset + 8, chunkSize);
        offset += 8 + chunkSize + (chunkSize % 2);
    }
    return null;
}

function getString(view, offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) str += String.fromCharCode(view.getUint8(offset + i));
    return str;
}

function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
}

/* =========================================================================
   STATE OPTIMIZATION & SERIALIZATION
   ========================================================================= */

function optimizeState(raw) {
    const minComponents = {};
    const minLabels = {};

    if (raw.componentStates) {
        for (const [longKey, data] of Object.entries(raw.componentStates)) {
            // Capture Label
            if (data.label) {
                minLabels[getShortId(longKey)] = data.label;
            }

            // Save if touched OR if a custom range is set
            if (!data.isTouched && !data.range) continue;

            // Short ID key
            const k = getShortId(longKey);

            // Value is always saved as integer (x1000)
            const val = Math.round(data.value * 1000);

            // If we have a range, save as array: [value, min, max]
            if (data.range) {
                minComponents[k] = [val, data.range[0], data.range[1]];
            } else {
                // Otherwise just save the value (legacy format compatible)
                minComponents[k] = val;
            }
        }
    }

    // ... (rest of the function remains the same) ...
    const minCables = (raw.cables || []).map(c => ({
        s: getShortId(c.start),
        e: getShortId(c.end),
        c: c.color,
        d: Math.round(c.droopOffset),
        l: c.label
    }));

    const minNotes = (raw.notes || []).map(n => ({
        x: n.x, y: n.y, t: n.text, c: n.color, b: n.backgroundColor, br: n.border, ts: n.textShadow
    }));

    return {
        n: raw.patchName,
        gn: raw.globalNotes,
        cs: minComponents,
        cl: Object.keys(minLabels).length > 0 ? minLabels : undefined,
        c: minCables,
        nt: minNotes,
        aci: raw.activeCardId,
        po: raw.pedalOrder,
        cm: raw.customModules,
        ups: raw.utilityPairState ? [raw.utilityPairState.utilityIndexL, raw.utilityPairState.utilityIndexR] : undefined
    };
}

function expandOptimizedState(min) {
    const components = {};
    if (min.cs) {
        for (const [shortKey, rawVal] of Object.entries(min.cs)) {
            const longKey = getLongId(shortKey);
            let value, range = null;

            // Check if it's an array [value, min, max] (New Format)
            if (Array.isArray(rawVal)) {
                value = rawVal[0] / 1000;
                range = [rawVal[1], rawVal[2]];
            }
            // Check for legacy object format { v: 123 }
            else if (typeof rawVal === 'object' && rawVal !== null && rawVal.v !== undefined) {
                value = rawVal.v / 1000;
            }
            // Standard number format
            else {
                value = rawVal / 1000;
            }

            components[longKey] = {
                type: SYSTEM_CONFIG[longKey]?.type || 'knob',
                value: value,
                isTouched: true,
                range: range // Restore the range
            };
        }
    }

    // Restore Labels
    if (min.cl) {
        for (const [shortKey, label] of Object.entries(min.cl)) {
            const longKey = getLongId(shortKey);
            if (!components[longKey]) {
                components[longKey] = {
                    type: SYSTEM_CONFIG[longKey]?.type || 'knob',
                    value: SYSTEM_CONFIG[longKey]?.defValue || 0,
                    isTouched: false
                };
            }
            components[longKey].label = label;
        }
    }

    // ... (rest of the function remains the same) ...
    const cables = (min.c || []).map(c => ({
        start: getLongId(c.s), end: getLongId(c.e), color: c.c, droopOffset: c.d, label: c.l
    }));

    const notes = (min.nt || []).map(n => ({
        id: 'note-' + Math.random().toString(36).substr(2, 9),
        x: n.x, y: n.y, text: n.t, color: n.c, backgroundColor: n.b, border: n.br, textShadow: n.ts
    }));

    return {
        patchName: min.n || "Untitled Patch",
        globalNotes: min.gn || "",
        componentStates: components,
        cables: cables,
        notes: notes,
        activeCardId: min.aci || 'none',
        pedalOrder: min.po || [],
        customModules: min.cm || [],
        utilityPairState: min.ups ? { utilityIndexL: min.ups[0], utilityIndexR: min.ups[1] } : null
    };
}

/* =========================================================================
   PNG METADATA & PRINTING
   ========================================================================= */

// CRC32 Table for PNG Checksums
const crcTable = [];
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    crcTable[n] = c;
}

function crc32(str) {
    let crc = -1;
    for (let i = 0; i < str.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
    return crc ^ -1;
}

function injectPngMetadata(pngDataURL, keyword, text) {
    const b64 = pngDataURL.split(',')[1];
    const bin = atob(b64);
    const textData = keyword + String.fromCharCode(0) + text;
    const len = String.fromCharCode((textData.length >>> 24) & 0xFF, (textData.length >>> 16) & 0xFF, (textData.length >>> 8) & 0xFF, textData.length & 0xFF);
    const crcVal = crc32('tEXt' + textData);
    const crc = String.fromCharCode((crcVal >>> 24) & 0xFF, (crcVal >>> 16) & 0xFF, (crcVal >>> 8) & 0xFF, crcVal & 0xFF);
    const chunk = len + 'tEXt' + textData + crc;
    return 'data:image/png;base64,' + btoa(bin.substring(0, 33) + chunk + bin.substring(33));
}

function extractPngData(binaryString) {
    let ptr = 8;
    while (ptr < binaryString.length) {
        const len = (binaryString.charCodeAt(ptr) << 24) + (binaryString.charCodeAt(ptr + 1) << 16) + (binaryString.charCodeAt(ptr + 2) << 8) + binaryString.charCodeAt(ptr + 3);
        ptr += 4;
        const type = binaryString.substring(ptr, ptr + 4);
        ptr += 4;
        if (type === 'tEXt') {
            const data = binaryString.substring(ptr, ptr + len);
            const nullIdx = data.indexOf(String.fromCharCode(0));
            if (data.substring(0, nullIdx) === PNG_KEYWORD) return LZString.decompressFromBase64(data.substring(nullIdx + 1));
        }
        ptr += len + 4;
    }
    return null;
}

function injectPrintStyles() {
    const oldStyle = document.getElementById('mtm-print-styles');
    if (oldStyle) oldStyle.remove();

    // Calculate total width including external gear racks
    const synthContainer = document.getElementById('synthContainer');
    const synthW = synthContainer.offsetWidth;
    let contentW = synthW;

    const leftRack = document.getElementById('externalGearRackLeft');
    const rightRack = document.getElementById('externalGearRackRight');

    let leftExtra = 0;
    let rightExtra = 0;

    if (leftRack && leftRack.children.length > 0) {
        leftExtra = leftRack.offsetWidth + 40;
        contentW += leftExtra;
    }
    if (rightRack && rightRack.children.length > 0) {
        rightExtra = rightRack.offsetWidth + 40;
        contentW += rightExtra;
    }

    const pedals = document.getElementById('pedalboard');
    const isPedalOpen = pedals && pedals.classList.contains('open');

    let totalHeight = synthContainer.offsetHeight;
    if (isPedalOpen) totalHeight += 350;
    totalHeight += 250;

    const a4W = 1100;
    const a4H = 750;
    let scale = Math.min(a4W / contentW, a4H / totalHeight);

    // Allow scaling up for small patches, but cap reasonable max
    if (scale > 2.5) scale = 2.5;

    const SCALED_BOARD_HEIGHT = 800 * scale;
    // Base left offset for page + shift needed for left rack
    const pageMarginMm = 10;

    // We want to center the whole assembly (ContentW) on the page
    // margin-left for synthContainer needs to be large enough to show left rack
    // Plus any extra to center the whole thing if it's smaller than the page
    // BUT simply: adding margin-left = leftExtra to synthContainer puts it in the right visual spot relative to wrapper
    // Then we center the wrapper.

    const css = `
    @media print {
        @page { size: A4 landscape; margin: 0; }
        html, body {
            width: 100%; height: 100%; margin: 0 !important; padding: 0 !important;
            background-color: #ffffff !important; overflow: hidden !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
        }

        #mainToolbar, #appHeader, #virtualKeyboard, #scopeWindow, #themeToggle, #contextMenu,
        .jack.active-target, #messageBox, .card-tooltip, #patchNameInput, #globalNotesArea, .themed-box,
        #mainContentWrapper > div:not(#synthContainer):not(#pedalboard):not(.print-header):not(.print-notes) {
            display: none !important;
        }
        
        #mainContentWrapper {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important; padding: 0 !important;
            display: flex !important; 
            flex-direction: column;
            align-items: center; /* Centers horizontally */
            justify-content: flex-start;
            position: relative;
            top: 10mm; 
            transform: scale(${scale}); 
            transform-origin: top center;
            background-color: white !important;
            overflow: visible !important;
        }

        /* DARK MODE PRINT FIX: Invert white knobs to black so they show on white paper */
        ${document.body.classList.contains('dark-mode') ? `
        .knob-img {
            filter: invert(1) !important;
        }
        ` : ''}

        #synthContainer {
            position: relative !important;
            border: 1px solid #000 !important; box-shadow: none !important;
            background-color: #fff !important;
            border-radius: 0px;
            margin: 0 !important;
            margin-left: ${leftExtra}px !important; 
            margin-right: ${rightExtra}px !important;
            overflow: visible !important;
        }

        /* FORCE VISIBILITY & RESET COLORS */
        .panel-art-img, .component, .cable-svg {
            opacity: 1.0 !important;
            filter: none !important;
        }
        
        .cable-svg path {
            fill: none !important;       /* No blob fills */
            opacity: 1.0 !important;     /* Force opaque */
            stroke-opacity: 1.0 !important; /* Force visible stroke */
        }
        
        /* Exception for cables having their own colors */
        .cable-svg path {
            color: auto !important;
            fill: none !important;
        }

        /* FIX: Ensure Knob Range Overlays do NOT fill and cover the knob */
        .knob-range-path {
            fill: none !important;
            stroke: #000 !important; /* Make range visible */
            opacity: 1.0 !important;
        }

        /* FIX: Ensure Knob Images are visible */
        .knob-img {
            opacity: 1.0 !important;
            display: block !important;
            z-index: 20 !important;
        }
        
        #pedalboard.open {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            height: ${SCALED_BOARD_HEIGHT}px !important;
            width: 100% !important; 
            max-width: none !important;
            display: flex !important;
            justify-content: center !important; 
            padding: 0 !important;
            margin: 0 !important;
        }

        #pedalboard-inner {
            opacity: 1 !important;
            width: max-content !important; 
            margin: 0 !important;
            display: flex !important;
            flex-wrap: nowrap !important;
            padding: 1.5rem !important;
        }
        
        /* Ensure external gear racks are visible and properly positioned */
        #externalGearRackLeft, #externalGearRackRight {
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
        
        /* Keep Colors (Removed 'stroke: #000') */
        .cable-svg path { 
            stroke-width: 6px !important; 
            opacity: 1.0 !important; 
            filter: none !important;
        }

        /* Keep Circle Colors (Removed 'fill: #000') */
        .cable-svg circle {
            opacity: 1.0 !important;
            stroke: none !important;
        }

        .print-header { display: block !important; text-align: center; width: 100%; margin-bottom: 20px; }
        .print-notes { display: block !important; margin-top: 20px; padding-top: 15px; font-family: 'Courier New', monospace; font-size: 18px; white-space: pre-wrap; color: #000; text-align: left; width: 100%; }
    }
    
    .print-header, .print-notes { display: none; }
    `;

    const style = document.createElement('style');
    style.id = 'mtm-print-styles';
    style.innerHTML = css;
    document.head.appendChild(style);
}

// Global exports
window.getRandomColor = getRandomColor;
window.getActiveCableColor = getActiveCableColor;
window.safeParam = safeParam;
window.lerp = lerp;
window.createDistortionCurve = createDistortionCurve;
window.createWaveFromFunction = createWaveFromFunction;
window.generateReverbImpulse = generateReverbImpulse;
window.getPos = getPos;
window.findNearestJack = findNearestJack;
window.updateInterfaceScaling = updateInterfaceScaling;
window.showMessage = showMessage;
// Only ONE instance of exports