// =========================================================================
// SCOPE.JS
// Handles oscilloscope UI and audio managment
// =========================================================================


/* =========================================================================
   OSCILLOSCOPE BUFFER MANAGEMENT
   ========================================================================= */

let lastTriggerIndex = 0;

function resetScopeBuffers() {
    // Clear real-time buffers
    if (scopeData1) scopeData1.fill(0);
    if (scopeData2) scopeData2.fill(0);

    // Clear history buffers (Rolling mode)
    rollingData1.fill(0);
    rollingData2.fill(0);

    // Reset pointers
    rollHead = 0;
    lastTriggerIndex = 0;
}

/* =========================================================================
   INITIALIZATION & SETUP
   ========================================================================= */

function initScope() {
    if (!audioCtx) return;

    if (!scopeAnalyser1) {
        scopeAnalyser1 = audioCtx.createAnalyser();
        scopeAnalyser1.fftSize = 8192 * 2;
        scopeAnalyser2 = audioCtx.createAnalyser();
        scopeAnalyser2.fftSize = 8192 * 2;

        // Connect to silent sink to ensure the graph processes audio 
        // even if not connected to the main output
        const silentSink = audioCtx.createGain();
        silentSink.gain.value = 0;
        scopeAnalyser1.connect(silentSink);
        scopeAnalyser2.connect(silentSink);
        silentSink.connect(audioCtx.destination);

        scopeBufferLength = scopeAnalyser1.frequencyBinCount;
        scopeData1 = new Float32Array(scopeBufferLength);
        scopeData2 = new Float32Array(scopeBufferLength);
        scopeFreq1 = new Uint8Array(scopeBufferLength);
        scopeFreq2 = new Uint8Array(scopeBufferLength);
    }

    if (!activeProbes[0] && !activeProbes[1]) {
        updateScopeConnection();
    }
}

/* =========================================================================
   ROUTING & PROBE CONNECTIONS
   ========================================================================= */

function updateScopeConnection() {
    if (!audioCtx) return;

    // Define map of Jack ID -> Audio Node
    globalJackMap = {
        // Computer IO
        'jack-audio1out': audioNodes['Computer_IO']?.outputL,
        'jack-audio2out': audioNodes['Computer_IO']?.outputR,
        'jack-cv1out': audioNodes['Computer_IO']?.cv1Out,
        'jack-cv2out': audioNodes['Computer_IO']?.cv2Out,
        'jack-pulse1out': audioNodes['Computer_IO']?.pulse1Out,
        'jack-pulse2out': audioNodes['Computer_IO']?.pulse2Out,

        // Oscillators
        'jack-osc1sqrOut': audioNodes['VCO1'].output,
        'jack-osc1sinOut': audioNodes['VCO1_Sin'].output,
        'jack-osc2sqrOut': audioNodes['VCO2'].output,
        'jack-osc2sinOut': audioNodes['VCO2_Sin'].output,

        // Processors
        'jack-slopes1out': audioNodes['Slopes1']?.output,
        'jack-slopes2out': audioNodes['Slopes2']?.output,
        'jack-ampOut': audioNodes['Amp']?.output,
        'jack-ringOut': audioNodes['RingMod']?.output,

        // Filters
        'jack-filter1hpOut': audioNodes['VCF1']?.hpBpOut,
        'jack-filter1lpOut': audioNodes['VCF1']?.filter,
        'jack-filter2hpOut': audioNodes['VCF2']?.hpBpOut,
        'jack-filter2lpOut': audioNodes['VCF2']?.filter,

        // Stereo & Mixer Nodes
        'jack-mixerLout': audioNodes['Mix_Out_L'],
        'jack-mixerRout': audioNodes['Mix_Out_R'],
        'jack-stereoIn1Out': audioNodes['Stereo_L_Pre'],
        'jack-stereoIn2Out': audioNodes['Stereo_R_Pre']
    };

    if (activeProbes[0]) {
        connectProbeToScope(activeProbes[0], 0);
    } else {
        // Default: Main Out on Ch1
        connectProbeToScope('jack-mixerLout', 0);
        document.getElementById('scopeLabel1').textContent = "CH1: Main Mix";
    }

    if (activeProbes[1]) {
        connectProbeToScope(activeProbes[1], 1);
    }
}

function connectProbeToScope(jackId, channel) {
    if (!audioCtx || !scopeAnalyser1) return;

    const source = globalJackMap[jackId];
    const targetAnalyser = channel === 0 ? scopeAnalyser1 : scopeAnalyser2;
    const gainProp = channel === 0 ? 'ch1' : 'ch2';
    const labelId = channel === 0 ? 'scopeLabel1' : 'scopeLabel2';

    if (source) {
        const node = Array.isArray(source) ? source[0] : source;
        try {
            if (scopeProbes[gainProp]) {
                try { scopeProbes[gainProp].disconnect(); } catch (e) { }
            }

            scopeProbes[gainProp] = audioCtx.createGain();
            scopeProbes[gainProp].connect(targetAnalyser);
            node.connect(scopeProbes[gainProp]);

            activeProbes[channel] = jackId;
            const name = SYSTEM_CONFIG[jackId]?.label || "Signal";
            document.getElementById(labelId).textContent = `CH${channel + 1}: ${name}`;

            if (!isBuildingAudioGraph) {
                showMessage(`Scope Ch${channel + 1}: ${name}`, "success");
            }
        } catch (e) {
            console.error(`Scope connect Ch${channel} failed:`, e);
        }
    }
}

/* =========================================================================
   VISUALIZATION LOOP (CANVAS DRAWING)
   ========================================================================= */

function drawScope() {
    if (!isScopeRunning) return;

    const canvas = document.getElementById('scopeCanvas');
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (width === 0 || height === 0) {
        requestAnimationFrame(drawScope);
        return;
    }

    const ctx = canvas.getContext('2d');

    if (!scopeAnalyser1) {
        requestAnimationFrame(drawScope);
        return;
    }

    // High DPI Scaling
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // --- 1. DATA ACQUISITION ---
    if (!scopeFrozen) {
        if (scopeSpecMode) {
            scopeAnalyser1.getByteFrequencyData(scopeFreq1);
            scopeAnalyser2.getByteFrequencyData(scopeFreq2);
        } else {
            scopeAnalyser1.getFloatTimeDomainData(scopeData1);
            scopeAnalyser2.getFloatTimeDomainData(scopeData2);
            rollingData1[rollHead] = scopeData1[0];
            rollingData2[rollHead] = scopeData2[0];
            rollHead = (rollHead + 1) % MAX_ROLL_HISTORY;
        }
    }

    // --- 2. CLEAR & GRID ---
    const computedStyle = getComputedStyle(document.body);
    const bgColor = computedStyle.getPropertyValue('--scope-bg').trim() || '#111';
    const gridMajor = computedStyle.getPropertyValue('--scope-grid').trim() || '#333';
    const gridMinor = '#2a2a2a';
    const labelColor = computedStyle.getPropertyValue('--text-muted').trim() || '#666';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 1;

    // X-Axis Grid (Time) - 8 Divisions
    ctx.strokeStyle = gridMajor;
    ctx.beginPath();
    for (let i = 1; i < 8; i++) {
        const x = (width / 8) * i;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    ctx.stroke();

    // Y-Axis Grid (Voltage) - +/- 12V scale (3V steps)
    const voltageSteps = [12, 9, 6, 3, 0, -3, -6, -9, -12];

    ctx.beginPath();
    voltageSteps.forEach(v => {
        const unit = v / 12.0;
        const y = (height / 2) - (unit * (height * 0.45));

        // 0V is brighter, others are dim
        ctx.strokeStyle = (v === 0) ? '#555' : gridMinor;

        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    });
    ctx.stroke();

    // --- LABELS (Voltage & Time) ---
    if (!scopeSpecMode && !scopeXYMode) {
        ctx.fillStyle = labelColor;
        ctx.font = '9px monospace';

        // 1. Voltage Labels (Left)
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const labelVoltages = [12, 6, 0, -6, -12];
        labelVoltages.forEach(v => {
            const unit = v / 12.0;
            const y = (height / 2) - (unit * (height * 0.45));
            const text = (v > 0 ? "+" : "") + v + "V";
            ctx.fillText(text, 4, y);
        });

        // 2. Time/Div Label (Bottom Right)
        // We replicate the zoom logic here to calculate the exact time scale
        const slider = document.getElementById('scopeTime');
        const sliderVal = slider ? parseInt(slider.value) : 50;
        let samplesOnScreen = 0;

        if (sliderVal > 80) {
            // Rolling Mode Logic
            samplesOnScreen = 256 + ((sliderVal - 80) * 100);
        } else {
            // Triggered Snapshot Logic
            const minSamples = 32;
            const maxSamples = 8192;
            const logScale = Math.pow(maxSamples / minSamples, sliderVal / 80);
            samplesOnScreen = Math.floor(minSamples * logScale);
        }

        if (audioCtx) {
            const totalMs = (samplesOnScreen / audioCtx.sampleRate) * 1000;
            const msPerDiv = totalMs / 8; // 8 Horizontal Divisions

            let timeText = "";
            if (msPerDiv >= 1000) timeText = (msPerDiv / 1000).toFixed(2) + "s";
            else if (msPerDiv >= 1) timeText = msPerDiv.toFixed(1) + "ms";
            else timeText = (msPerDiv * 1000).toFixed(0) + "us";

            ctx.textAlign = "right";
            ctx.textBaseline = "bottom";
            ctx.fillText(timeText + "/div", width - 4, height - 2);
        }
    }

    // --- 3. TRIGGER LEVEL UI ---
    const trigInput = document.getElementById('scopeTrigger');
    const triggerLevel = trigInput ? parseFloat(trigInput.value) : 0;

    if (!scopeSpecMode && !scopeXYMode) {
        const trigY = (height / 2) - (triggerLevel * (height * 0.45));

        ctx.beginPath();
        ctx.strokeStyle = '#555';
        ctx.setLineDash([4, 4]);
        ctx.moveTo(0, trigY);
        ctx.lineTo(width, trigY);
        ctx.stroke();
        ctx.setLineDash([]);

        if (Math.abs(triggerLevel) > 0.05) {
            ctx.fillStyle = labelColor;
            ctx.textAlign = "right";
            ctx.font = `10px monospace`;
            ctx.fillText(`${triggerLevel.toFixed(2)}V`, width - 5, trigY - 4);
        }
    }

    // --- 4A. SPECTRUM MODE ---
    if (scopeSpecMode) {
        const drawFFT = (data, color) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba');
            const bufferLength = data.length;
            const minLog = Math.log10(1);
            const maxLog = Math.log10(bufferLength / 2);

            ctx.moveTo(0, height);
            for (let i = 1; i < bufferLength / 2; i++) {
                const logPos = (Math.log10(i) - minLog) / (maxLog - minLog);
                const x = logPos * width;
                const val = data[i] / 255.0;
                const y = height - (val * height);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.fill();
        };

        drawFFT(scopeFreq1, 'rgb(74, 222, 128)');
        if (activeProbes[1]) drawFFT(scopeFreq2, 'rgb(244, 114, 182)');

        ctx.fillStyle = labelColor;
        ctx.textAlign = "center";
        ctx.font = `10px monospace`;
        ctx.fillText("100Hz", width * 0.35, height - 5);
        ctx.fillText("1kHz", width * 0.68, height - 5);
        ctx.fillText("10kHz", width * 0.95, height - 5);
    }

    // --- 4B. X-Y MODE ---
    else if (scopeXYMode) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        const xySamples = 2048;
        const centerX = width / 2;
        const centerY = height / 2;
        const scaleX = width * 0.45;
        const scaleY = height * 0.45;

        for (let i = 0; i < xySamples; i += 2) {
            const x = centerX + (scopeData1[i] * scaleX);
            const y = centerY - (scopeData2[i] * scaleY);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = "right";
        ctx.font = `10px monospace`;
        ctx.fillText("X-Y MODE", width - 10, 20);
    }

    // --- 4C. TIME DOMAIN (Standard) ---
    else {
        const slider = document.getElementById('scopeTime');
        const sliderVal = slider ? parseInt(slider.value) : 50;
        const isRollingMode = sliderVal > 80;

        // --- Measurements (Vpp & Hz) ---
        if (!scopeFrozen && audioCtx) {
            // 1. Calculate Vpp (Peak-to-Peak)
            let min = 1.0, max = -1.0;
            const len = scopeData1.length;

            // Scan buffer to find min/max
            for (let i = 0; i < len; i += 4) {
                const v = scopeData1[i];
                if (v < min) min = v;
                if (v > max) max = v;
            }

            const rawVpp = max - min;

            // Display Vpp (Scaled to +/- 12V system)
            const scaledVpp = rawVpp * 12.0;
            const elVpp = document.getElementById('measVpp');
            if (elVpp) elVpp.textContent = `Vpp:${scaledVpp.toFixed(2)}V`;

            // 2. Calculate Frequency (Schmitt Trigger)
            const elFreq = document.getElementById('measFreq');
            if (elFreq) {
                // Only calculate if signal is strong enough (> 0.5V scaled)
                if (rawVpp > 0.04) {
                    const highThresh = max - (rawVpp * 0.3); // Top 70%
                    const lowThresh = min + (rawVpp * 0.3);  // Bottom 30%

                    let state = -1; // -1: Init, 0: Low, 1: High
                    let periodCount = 0;
                    let firstCrossingIndex = -1;
                    let lastCrossingIndex = -1;

                    for (let i = 0; i < len; i++) {
                        const val = scopeData1[i];

                        if (state === 1) {
                            // Currently High, look for Low
                            if (val < lowThresh) state = 0;
                        } else {
                            // Currently Low (or Init), look for High
                            if (val > highThresh) {
                                if (state !== -1) {
                                    // Found a cycle start
                                    if (firstCrossingIndex === -1) firstCrossingIndex = i;
                                    lastCrossingIndex = i;
                                    periodCount++;
                                }
                                state = 1;
                            }
                        }
                    }

                    if (periodCount > 0) {
                        const totalSamples = lastCrossingIndex - firstCrossingIndex;
                        const avgSamples = totalSamples / periodCount;
                        const hz = audioCtx.sampleRate / avgSamples;

                        // Display if valid (Note: Buffer size limits low freq detection to ~6Hz)
                        if (hz > 5 && hz < 24000) {
                            elFreq.textContent = `Hz:${Math.round(hz)}`;
                        } else {
                            elFreq.textContent = `Hz:--`;
                        }
                    } else {
                        elFreq.textContent = `Hz:--`;
                    }
                } else {
                    elFreq.textContent = `Hz:--`;
                }
            }
        }
        if (isRollingMode) {
            const now = performance.now();
            if (!window.lastScopeDrawTime) window.lastScopeDrawTime = now;
            const dt = now - window.lastScopeDrawTime;
            window.lastScopeDrawTime = now;

            let pointsToAdd = Math.round(dt / 16.66);
            if (pointsToAdd < 1) pointsToAdd = 1;
            if (pointsToAdd > 10) pointsToAdd = 10;
            const stride = 735;

            for (let i = 0; i < pointsToAdd; i++) {
                let readIndex = (pointsToAdd - 1 - i) * stride;
                if (readIndex >= scopeData1.length) readIndex = scopeData1.length - 1;
                rollingData1[rollHead] = scopeData1[readIndex];
                if (activeProbes[1]) rollingData2[rollHead] = scopeData2[readIndex];
                rollHead = (rollHead + 1) % MAX_ROLL_HISTORY;
            }

            const windowSize = 256 + ((sliderVal - 80) * 100);
            const drawRoll = (buf, color) => {
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                const step = width / windowSize;
                for (let i = 0; i < windowSize; i++) {
                    let rIdx = rollHead - windowSize + i;
                    while (rIdx < 0) rIdx += MAX_ROLL_HISTORY;
                    while (rIdx >= MAX_ROLL_HISTORY) rIdx -= MAX_ROLL_HISTORY;
                    const y = (height / 2) - (buf[rIdx] * (height * 0.45));
                    const x = i * step;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            };
            drawRoll(rollingData1, '#4ade80');
            if (activeProbes[1]) drawRoll(rollingData2, '#f472b6');
        } else {
            // Triggered Snapshot Mode
            const minSamples = 32;
            const maxSamples = 8192;
            const logScale = Math.pow(maxSamples / minSamples, sliderVal / 80);
            const samplesToDraw = Math.floor(minSamples * logScale);

            let triggerOffset = lastTriggerIndex;

            // Trigger Search Logic
            if (!scopeFrozen && sliderVal < 75) {
                const searchLim = Math.min(scopeBufferLength - samplesToDraw, 4096);
                let found = false;
                const window = 100;
                let start = Math.max(0, lastTriggerIndex - window);
                let end = Math.min(searchLim, lastTriggerIndex + window);

                for (let i = start; i < end; i++) {
                    if (scopeData1[i] <= triggerLevel && scopeData1[i + 1] > triggerLevel) {
                        triggerOffset = i;
                        lastTriggerIndex = i;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    for (let i = 0; i < searchLim; i++) {
                        if (scopeData1[i] <= triggerLevel && scopeData1[i + 1] > triggerLevel) {
                            triggerOffset = i;
                            lastTriggerIndex = i;
                            break;
                        }
                    }
                }
            }

            const drawSnap = (data, color) => {
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                const step = width / samplesToDraw;
                for (let i = 0; i < samplesToDraw; i++) {
                    let idx = triggerOffset + i;
                    if (idx >= data.length) break;
                    const y = (height / 2) - (data[idx] * (height * 0.45));
                    const x = i * step;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            };

            drawSnap(scopeData1, '#4ade80');
            if (activeProbes[1]) drawSnap(scopeData2, '#f472b6');
        }
    }

    requestAnimationFrame(drawScope);
}

/* =========================================================================
   UI CONTROLS & EVENT LISTENERS
   ========================================================================= */

function openScope() {
    const win = document.getElementById('scopeWindow');
    const toggleBtn = document.getElementById('scopeToggle');

    win.style.display = 'flex';
    toggleBtn.classList.add('active');

    if (!scopeAnalyser1) initScope();
    resetScopeBuffers();

    if (!isScopeRunning) {
        isScopeRunning = true;
        drawScope();
    }
}

function closeScope() {
    const win = document.getElementById('scopeWindow');
    const toggleBtn = document.getElementById('scopeToggle');

    win.style.display = 'none';
    toggleBtn.classList.remove('active');

    // Stop the RAF Loop to save CPU
    isScopeRunning = false;
}

function setupScopeUI() {
    const win = document.getElementById('scopeWindow');
    const header = document.getElementById('scopeHeader');
    const toggleBtn = document.getElementById('scopeToggle');

    // 1. Window Toggle Logic
    toggleBtn.addEventListener('click', () => {
        const isHidden = win.style.display === 'none' || win.style.display === '';
        if (isHidden) openScope();
        else closeScope();
    });

    document.getElementById('closeScope').addEventListener('click', closeScope);

    // 2. Control Buttons
    document.getElementById('scopeFreeze').addEventListener('click', (e) => {
        scopeFrozen = !scopeFrozen;
        e.currentTarget.classList.toggle('active-mode', scopeFrozen);
    });

    // XY Mode
    const xyBtn = document.getElementById('scopeXY');
    const specBtn = document.getElementById('scopeSpec');

    xyBtn.addEventListener('click', (e) => {
        scopeXYMode = !scopeXYMode;
        scopeSpecMode = false;
        xyBtn.classList.toggle('active-mode', scopeXYMode);
        specBtn.classList.remove('active-mode');
        const controls = document.getElementById('scopeControls');
        if (controls) controls.style.opacity = scopeXYMode ? '0.3' : '1';
    });

    // Spectrum Mode
    specBtn.addEventListener('click', (e) => {
        scopeSpecMode = !scopeSpecMode;
        scopeXYMode = false;
        specBtn.classList.toggle('active-mode', scopeSpecMode);
        xyBtn.classList.remove('active-mode');
        const controls = document.getElementById('scopeControls');
        if (controls) controls.style.opacity = '1';
    });

    // Use global drag helper
    setupDrag(win, header);
}