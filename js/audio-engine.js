// =========================================================================
// AUDIO-ENGINE.JS
// Handles the sound engine, audio routing and IO (Stereo, Midi, Speaker)
// =========================================================================

/* =========================================================================
   AUDIO WORKLETS
   ========================================================================= */
// --- SLOPES WORKLET ---
const slopesWorkletCode = `
class SlopesProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.currentVoltage = 0;
        this.loopOffset = true; // loop flip-flop state 
        
        // LED Accumulators
        this.riseSamples = 0;
        this.fallSamples = 0;
        this.totalSamples = 0;
        
        this.params = {
            mode: 1,       // 0: Loop, 1: Slew, 2: Gate
            shape: 1,      // 0: Shape A, 1: Both, 2: Shape B
            knobRate: 0.5, 
            isExponential: options.processorOptions.isExponential || false
        };

        this.port.onmessage = (e) => {
            Object.assign(this.params, e.data);
        };
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0][0];
        const inputL = inputs[0][0] || new Float32Array(128).fill(0);
        const cvIn   = inputs[0][1] || new Float32Array(128).fill(0);

        const RAIL_MAX = 1.0; 
        const LOOP_OFFSET = 0.99; 
        const BLIP_OFFSET = 0.66;
        const EXP_AMT = 0.17;
        const MAX_COEFF = 0.012;       
        const INSTANT = 0.0118;
        // LED Update Rate (~30Hz)
        const LED_UPDATE_RATE = 1600;

        for (let i = 0; i < output.length; i++) {
            // --- 1. Rise/fall rate control ---
           
            let speedCtrl = this.params.knobRate + (cvIn[i] * 0.5)
                            - this.params.isExponential*this.currentVoltage*EXP_AMT;
				
            speedCtrl = Math.max(0.0, Math.min(1.0, speedCtrl));

            let rate = MAX_COEFF * Math.exp(-4*speedCtrl*(2+speedCtrl));
            let riseCoeff = (this.params.shape === 0)?INSTANT:rate;
            let fallCoeff = (this.params.shape === 2)?INSTANT:rate;

            // --- 2. Target logic  ---
            let target = inputL[i]; // target is input, by default

            if (this.params.mode === 0 && this.loopOffset) 
                target += LOOP_OFFSET;
            else if (this.params.mode === 2)
                target += BLIP_OFFSET;

            // --- 4. Travel towards target ---

            const delta = target - this.currentVoltage;
            const incr = (delta>0) ? riseCoeff : -fallCoeff;
            this.currentVoltage = Math.min(this.currentVoltage + incr, RAIL_MAX);

            // --- 5. Behaviour upon hitting target  ---
			if (delta*(target-this.currentVoltage)<0) // if we went past the target
			{					
				this.currentVoltage = target; // clamp output to target
				if (this.params.mode === 0) // if looping, toggle flip-flop of target position
					this.loopOffset = !this.loopOffset;
			}

            output[i] = this.currentVoltage;

            // --- 6. LED accumulation ---
            let dir = Math.tanh(delta*-30);
            if (dir > 0) this.riseSamples += dir;
            else this.fallSamples -= dir;
        }

        // --- SEND LED UPDATE ---
        this.totalSamples += 128;
        if (this.totalSamples >= LED_UPDATE_RATE) {
            // Quite aggressive gamma correction on LEDs
            const rVal = Math.pow(this.riseSamples / this.totalSamples, 0.25);
            const fVal = Math.pow(this.fallSamples / this.totalSamples, 0.25);
            this.port.postMessage({ rise: rVal, fall: fVal });
            this.riseSamples = 0; this.fallSamples = 0; this.totalSamples = 0;
        }

        return true;
    }
}
registerProcessor('slopes-processor', SlopesProcessor);
`;

// --- RECORDER WORKLET ---
const recorderWorkletCode = `
class RecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.recording = false;
        this.bufferSize = 4096;
        this.bufferIdx = 0;
        this.bufferL = new Float32Array(this.bufferSize);
        this.bufferR = new Float32Array(this.bufferSize);

        this.port.onmessage = (e) => {
            if (e.data === 'start') {
                this.recording = true;
                this.bufferIdx = 0;
            } else if (e.data === 'stop') {
                this.recording = false;
                // Flush remaining data
                if (this.bufferIdx > 0) {
                    this.sendBuffers();
                }
            }
        };
    }

    sendBuffers() {
        const l = this.bufferL.slice(0, this.bufferIdx);
        const r = this.bufferR.slice(0, this.bufferIdx);
        this.port.postMessage({ l, r }, [l.buffer, r.buffer]);
        this.bufferIdx = 0;
    }

    process(inputs) {
        if (!this.recording) return true;
        
        const input = inputs[0];
        if (!input || input.length === 0) return true;

        const inputL = input[0];
        const inputR = input[1];
        
        // Safety check
        if (!inputL || !inputR) return true;

        for (let i = 0; i < inputL.length; i++) {
            this.bufferL[this.bufferIdx] = inputL[i];
            this.bufferR[this.bufferIdx] = inputR[i];
            this.bufferIdx++;

            if (this.bufferIdx >= this.bufferSize) {
                this.sendBuffers();
            }
        }
        return true;
    }
}
registerProcessor('recorder-processor', RecorderProcessor);
`;

const TWISTS_WORKLET_CODE = `
class TwistsProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [{ name: 'pitch_freq', defaultValue: 440, minValue: 10, maxValue: 20000 }];
    }

    constructor() {
        super();
        this.phase = 0;
        this.envelope = 0;
        this.gate = false;
        this.pulse = false; // <-- ADDED: State for the Pulse 1 trigger
        
        // Envelope State Machine: 0:Idle, 1:Attack, 2:Hold, 3:Release
        this.envState = 0; 
        
        this.p1 = 0; 
        this.p2 = 0; 
        this.shape = 'CSAW';
        this.lpState = 0;

        this.port.onmessage = (e) => {
            // Destructure the new 'pulse' property
            const { shape, gate, p1, p2, pulse } = e.data; 
            if (shape) this.shape = shape;
            if (gate !== undefined) this.gate = gate;
            if (p1 !== undefined) this.p1 = p1;
            if (p2 !== undefined) this.p2 = p2;
            if (pulse !== undefined) this.pulse = pulse; // <-- ADDED: Capture the incoming pulse trigger
        };
    }
    
    // --- DSP ALGORITHMS (Simplified Braids) ---

    renderCSaw(p1, p2) {
        const mix = this.p1 / 32767.0;
        const pw = 0.5 + (this.p2 / 65536.0); 
        const saw = (2.0 * this.phase) - 1.0;
        const sqr = this.phase < pw ? 1.0 : -1.0;
        return (saw * (1.0 - mix)) + (sqr * mix);
    }

    renderFold(p1, p2) {
        let tri = 0;
        if (this.phase > 0.75) tri = (this.phase - 1.0) * 4.0;
        else if (this.phase > 0.25) tri = 2.0 - (this.phase * 4.0);
        else tri = this.phase * 4.0;
        
        const gain = 1.0 + (this.p1 / 2000.0);
        let x = tri * gain;

        while (Math.abs(x) > 1.0) {
            if (x > 1.0) x = 2.0 - x;
            else if (x < -1.0) x = -2.0 - x;
        }
        const sat = 1.0 + (this.p2 / 10000);
        return Math.tanh(x * sat);
    }

    renderSuperSaw(p1, p2) {
        const detuneAmt = (this.p1 / 32767.0) * 0.05;
        const mix = this.p2 / 32767.0;
        
        const s1 = (2.0 * this.phase) - 1.0;
        const s2 = (2.0 * ((this.phase + detuneAmt) % 1.0)) - 1.0;
        const s3 = (2.0 * ((this.phase - detuneAmt) % 1.0)) - 1.0;
        
        return (s1 * 0.5) + ((s2 + s3) * 0.25 * mix);
    }
    
    renderDigitalFilter(p1, p2) {
        let noise = Math.random() * 2 - 1;
        const center = this.phaseInc * (1 + this.p1 / 32767.0);
        const cutoff = Math.min(center * 50, 0.9);
        this.lpState += (noise - this.lpState) * cutoff;
        return this.lpState;
    }

    renderVowel(p1, p2) {
        const f1 = 200 + (this.p1 * 4000 / 32767);
        const f2 = 1000 + (this.p2 * 6000 / 32767);
        const carrier = Math.sin(this.phase * 2 * Math.PI);
        const p_f1 = (this.phase * f1 / 2000.0) % 1.0;
        const p_f2 = (this.phase * f2 / 2000.0) % 1.0;

        let sample = 0;
        sample += Math.sin(p_f1 * 2 * Math.PI) * 0.5;
        sample += Math.sin(p_f2 * 2 * Math.PI) * 0.3;
        
        return sample * carrier * 1.5;
    }
    
    renderHarmonics(p1, p2) {
        let sample = 0;
        const numHarmonics = 8;
        const peak = (this.p1 / 32767.0) * numHarmonics;
        const width = 1.0 + (this.p2 / 32767.0);

        for (let h = 1; h <= numHarmonics; h++) {
            const dist = Math.abs(h - peak) / numHarmonics;
            let amp = Math.exp(-dist * dist * 10 * width); 
            sample += Math.sin(this.phase * 2 * Math.PI * h) * amp;
        }
        return sample * 0.5;
    }


    process(inputs, outputs, parameters) {
        const output = outputs[0][0];
        const freq_param = parameters.pitch_freq;
        const sampleRate = 48000;

        for (let i = 0; i < output.length; i++) {
            
            // --- AHR ENVELOPE LOGIC ---
            if (this.gate) {
                if (this.envState === 0 || this.envState === 3) {
                    this.envState = 1; 
                }
            } else {
                if (this.envState === 1 || this.envState === 2) {
                    this.envState = 3; 
                }
            }

            if (this.envState === 1) { 
                this.envelope += 0.005;
                if (this.envelope >= 1.0) { 
                    this.envelope = 1.0; 
                    this.envState = 2;
                } 
            } 
            else if (this.envState === 2) { 
                this.envelope = 1.0; 
            }
            else if (this.envState === 3) { 
                this.envelope *= 0.9995;
                if (this.envelope < 0.001) { 
                    this.envelope = 0; 
                    this.envState = 0;
                } 
            }
            
            // --- PULSE 1 (SYNC) LOGIC ---
            if (this.pulse) {
                this.phase = 0; // <-- The Fix: Reset phase on Pulse 1 trigger
                this.pulse = false; // Consume the trigger
            }

            const current_freq = freq_param.length > 1 ? freq_param[i] : freq_param[0];
            this.phaseInc = current_freq / sampleRate;
            
            this.phase += this.phaseInc;
            if (this.phase >= 1.0) this.phase -= 1.0;
            
            let sample = 0;
            switch (this.shape) {
                case 'CSAW': sample = this.renderCSaw(); break;
                case 'FOLD': sample = this.renderFold(); break;
                case 'SAWx3': sample = this.renderSuperSaw(); break;
                case 'ZLPF': sample = this.renderDigitalFilter(); break;
                case 'VOWL': sample = this.renderVowel(); break;
                case 'HARM': sample = this.renderHarmonics(); break;
                default: sample = 0;
            }

            output[i] = sample * this.envelope * 0.5;
        }
        
        this.port.postMessage({ envelope: this.envelope });
        return true;
    }
}
registerProcessor('twists-processor', TwistsProcessor);
`;


/* =========================================================================
   CORE AUDIO ENGINE & CONTEXT MANAGEMENT
   ========================================================================= */

function toggleAudio() {
    const btn = document.getElementById('audioToggle');

    // 1. If context does NOT exist, create it, build the graph, and RETURN.
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        buildAudioGraph();

        // Unconditionally update UI and exit to prevent the double-toggle bug.
        btn.classList.add('audio-is-running');
        btn.title = "Stop Audio Engine";
        return;
    }

    // 2. Handle state transitions for existing context
    if (audioCtx.state === 'running') {
        // Turn OFF
        audioCtx.suspend().then(() => {
            btn.classList.remove('audio-is-running');
            btn.title = "Start Audio Engine";
        });
    } else if (audioCtx.state === 'suspended') {
        // Turn ON
        audioCtx.resume().then(() => {
            btn.classList.add('audio-is-running');
            btn.title = "Stop Audio Engine";
        });
    }
}

async function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        buildAudioGraph();

        if (navigator.requestMIDIAccess) {
            initMidi();
        }

        showMessage("Audio Engine Initialized", "success");
    }
}

function updateAudioGraph() {
    if (audioCtx) buildAudioGraph();
}

/* =========================================================================
   INPUT HANDLING (MICROPHONE & MIDI)
   ========================================================================= */

async function initMic() {
    // Prevent re-initialization
    if (audioNodes['Mic_Stream']) return;

    if (!audioCtx) await initAudio();

    try {
        // 1. Request Stereo Audio if possible
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false,
                channelCount: 2 // Request stereo
            }
        });

        const mediaStreamSource = audioCtx.createMediaStreamSource(stream);

        // 2. Connect Mic to the "Stereo_Line_In" Hub
        if (audioNodes['Stereo_Line_In']) {
            mediaStreamSource.connect(audioNodes['Stereo_Line_In']);
        }

        // 3. Store references for cleanup
        audioNodes['Mic_Source'] = mediaStreamSource;
        audioNodes['Mic_Stream'] = stream;

        // 4. Create Splitter for Patch Normalization
        const splitter = audioCtx.createChannelSplitter(2);
        mediaStreamSource.connect(splitter);
        audioNodes['Mic_Splitter'] = splitter;

        // 5. Update Routing immediately
        updateTapeRouting();

        document.getElementById('micToggle').classList.add('mic-is-active');
        showMessage("Microphone Active (Routed to Ext In)", "success");

    } catch (err) {
        console.warn("Audio Input Error:", err);
        showMessage("Microphone Access Denied", "error");
        micEnabled = false;
    }
}

function initMidi() {
    if (midiAccess) {
        onMIDISuccess(midiAccess);
        return;
    }

    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
            .then(onMIDISuccess, onMIDIFailure);
    } else {
        showMessage("WebMIDI is not supported by your browser.", "error");
    }
}

function onMIDISuccess(access) {
    midiAccess = access;
    const midiBtn = document.getElementById('midiToggle');
    const vk = document.getElementById('virtualKeyboard');

    let inputCount = 0;
    const inputs = midiAccess.inputs.values();
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        input.value.onmidimessage = onMIDIMessage;
        inputCount++;
    }

    if (inputCount === 0) {
        vk.classList.add('is-visible');
        if (vk.innerHTML === '') initVirtualKeyboard();
        showMessage("No MIDI Device found. Virtual Keyboard Active.", "info");
    } else {
        vk.classList.add('is-visible');
        if (vk.innerHTML === '') initVirtualKeyboard();
        showMessage(`MIDI Connected (${inputCount} devices)`, "success");
    }

    midiAccess.onstatechange = (e) => {
        if (e.port.type === 'input') onMIDISuccess(midiAccess);
    };

    midiBtn.classList.add('btn-active-blue');
    midiEnabled = true;
}

function onMIDIFailure(e) {
    const midiBtn = document.getElementById('midiToggle');
    const vk = document.getElementById('virtualKeyboard');

    // Show Virtual Keyboard as fallback
    vk.classList.add('is-visible');
    if (vk.innerHTML === '') initVirtualKeyboard();

    midiBtn.classList.add('btn-active-blue');
    midiBtn.classList.replace('text-gray-400', 'text-white');
    midiEnabled = true;

    showMessage("WebMIDI blocked. Using Virtual Keyboard only.", "warning");
}

function onMIDIMessage(message) {
    handleMidiMessage(message);
}


function handleMidiMessage(message, isInternal = false) {
    if (!isInternal && !midiEnabled) return; 
    if (!audioNodes['Midi_Pitch']) return;
    
    const [command, note, velocity] = message.data;
    
    if (command === 144 && velocity > 0) { // Note On
        const cv = (note - 60) / 60.0;
        safeParam(audioNodes['Midi_Pitch'].offset, cv, audioCtx.currentTime);
        safeParam(audioNodes['Midi_Gate'].offset, 1.0, audioCtx.currentTime);
    }
    
    if (command === 128 || (command === 144 && velocity === 0)) { // Note Off
        safeParam(audioNodes['Midi_Gate'].offset, 0.0, audioCtx.currentTime);
    }
}

function initVirtualKeyboard() {
    const container = document.getElementById('virtualKeyboard');
    if (!container) return;

    container.innerHTML = ''; 

    const startNote = 48; // C2
    const octaves = 3;

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.gap = '2px';
    container.appendChild(wrapper);

    for (let o = 0; o < octaves; o++) {
        const octaveDiv = document.createElement('div');
        octaveDiv.className = 'vk-octave';

        // White Keys
        ['C', 'D', 'E', 'F', 'G', 'A', 'B'].forEach((note, i) => {
            const wk = document.createElement('div');
            wk.className = 'vk-key-white';
            const noteOffset = [0, 2, 4, 5, 7, 9, 11][i];
            const midiNote = startNote + (o * 12) + noteOffset;
            setupKeyEvents(wk, midiNote);
            octaveDiv.appendChild(wk);
        });

        // Black Keys
        const blacks = [
            { cls: 'vk-b-cs', offset: 1 },
            { cls: 'vk-b-ds', offset: 3 },
            { cls: 'vk-b-fs', offset: 6 },
            { cls: 'vk-b-gs', offset: 8 },
            { cls: 'vk-b-as', offset: 10 }
        ];

        blacks.forEach(b => {
            const bk = document.createElement('div');
            bk.className = `vk-key-black ${b.cls}`;
            const midiNote = startNote + (o * 12) + b.offset;
            setupKeyEvents(bk, midiNote);
            octaveDiv.appendChild(bk);
        });

        wrapper.appendChild(octaveDiv);
    }
}


function setupKeyEvents(el, note) {
    const triggerOn = (e) => {
        e.preventDefault();
        // FIX: Pass 'true' to indicate this is an internal UI event
        handleMidiMessage({ data: [144, note, 127] }, true);
        el.classList.add('active');
    };

    const triggerOff = (e) => {
        e.preventDefault();
        // FIX: Pass 'true' here as well
        handleMidiMessage({ data: [128, note, 0] }, true);
        el.classList.remove('active');
    };

    el.addEventListener('mousedown', triggerOn);
    el.addEventListener('mouseup', triggerOff);
    el.addEventListener('mouseleave', triggerOff);

    el.addEventListener('touchstart', triggerOn, { passive: false });
    el.addEventListener('touchend', triggerOff);
}

/* =========================================================================
   MODULE & NODE FACTORIES
   ========================================================================= */

function createLimiter(ctx) {
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.0;
    limiter.knee.value = 0.0;
    limiter.ratio.value = 20.0;
    limiter.attack.value = 0.005;
    limiter.release.value = 0.1;
    return limiter;
}

function createComputerIO(ctx) {
    return {
        // --- INPUTS (The 6 Jacks on Left) ---
        inputL: ctx.createGain(),
        inputR: ctx.createGain(),
        cv1In: ctx.createGain(),
        cv2In: ctx.createGain(),
        pulse1In: ctx.createGain(),
        pulse2In: ctx.createGain(),

        // --- OUTPUTS (The 6 Jacks on Right) ---
        outputL: ctx.createGain(),
        outputR: ctx.createGain(),
        cv1Out: ctx.createGain(),
        cv2Out: ctx.createGain(),
        pulse1Out: ctx.createGain(),
        pulse2Out: ctx.createGain()
    };
}

function createVCO(type = 'sawtooth') {
    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.start();
    
    const fmGain = audioCtx.createGain();
    fmGain.connect(osc.frequency);

    // 1.0 Unit now equals 5 Octaves (6000 cents)
    const pitchSum = audioCtx.createGain();
    pitchSum.gain.value = 6000;
    pitchSum.connect(osc.detune);

    return { osc, fmGain, pitchSum };
}

function createVCF() {
    const input = audioCtx.createGain();

    // 3 Parallel Topologies for "Multimode" behavior
    const filter = audioCtx.createBiquadFilter(); // Low Pass (Fixed Output)
    filter.type = 'lowpass';

    const hpFilter = audioCtx.createBiquadFilter(); // High Pass (Switchable)
    hpFilter.type = 'highpass';

    const bpFilter = audioCtx.createBiquadFilter(); // Band Pass (Switchable)
    bpFilter.type = 'bandpass';

    // Connect Input to All Filters
    input.connect(filter);
    input.connect(hpFilter);
    input.connect(bpFilter);

    // Outputs
    const hpBpOut = audioCtx.createGain(); // The Switchable Output

    // FM Logic
    const fmGain = audioCtx.createGain();
    fmGain.connect(filter.frequency);
    fmGain.connect(hpFilter.frequency);
    fmGain.connect(bpFilter.frequency);

    return { input, filter, hpFilter, bpFilter, hpBpOut, fmGain };
}

function createSlopes(isExponential = false) {
    const node = new AudioWorkletNode(audioCtx, 'slopes-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: { isExponential: isExponential }
    });

    const inputGain = audioCtx.createGain();
    const cvGain = audioCtx.createGain();
    const merger = audioCtx.createChannelMerger(2);

    inputGain.connect(merger, 0, 0);
    cvGain.connect(merger, 0, 1);
    merger.connect(node);

    // Store the brightness values (0.0 - 1.0)
    node.ledValues = { rise: 0, fall: 0 };

    node.port.onmessage = (e) => {
        if (e.data.rise !== undefined) {
            node.ledValues = {
                rise: e.data.rise,
                fall: e.data.fall
            };
        }
    };

    return {
        input: inputGain,
        cvInput: cvGain,
        output: node,
        processor: node
    };
}

function createAmp() {
    const input = audioCtx.createGain();
    const drive = audioCtx.createGain();
    const shaper = audioCtx.createWaveShaper();
    shaper.curve = createDistortionCurve(0);

    const output = audioCtx.createGain();
    output.gain.value = 2.5;

    input.connect(drive);
    drive.connect(shaper);
    shaper.connect(output);

    return { input, drive, shaper, output };
}

function createRingMod() {
    const gain = audioCtx.createGain();
    gain.gain.value = 0; // Base gain MUST be 0 so only Input B modulates it.

    const inputA = audioCtx.createGain();
    const inputB = audioCtx.createGain();
    const output = audioCtx.createGain();
    output.gain.value = 1.0;

    // Connection Logic: Output = A * B
    inputA.connect(gain);      // Carrier enters the audio path
    inputB.connect(gain.gain); // Modulator enters the gain parameter
    gain.connect(output);

    return { inputA, inputB, output };
}

function createStomp() {
    const input = audioCtx.createGain();
    const dryGain = audioCtx.createGain();
    const wetGain = audioCtx.createGain();
    const output = audioCtx.createGain();
    const sendOut = audioCtx.createGain();
    const returnIn = audioCtx.createGain();
    const feedbackGain = audioCtx.createGain();
    const feedbackLimiter = audioCtx.createDynamicsCompressor();

    input.connect(dryGain);
    input.connect(sendOut);
    returnIn.connect(wetGain);
    dryGain.connect(output);
    wetGain.connect(output);
    
    returnIn.connect(feedbackGain);
    feedbackGain.connect(feedbackLimiter);
    feedbackLimiter.connect(sendOut);

    return { input, sendOut, returnIn, output, dryGain, wetGain, feedbackGain };
}

function createPedalboard(ctx) {
    const input = ctx.createGain();
    const output = ctx.createGain();

    // --- 1. DISTORTION ---
    const distIn = ctx.createGain(); const distOut = ctx.createGain();
    const shaper = ctx.createWaveShaper(); shaper.curve = createDistortionCurve(0);
    const distFilter = ctx.createBiquadFilter(); distFilter.type = 'lowpass'; distFilter.frequency.value = 5000;
    distIn.connect(shaper); shaper.connect(distFilter); distFilter.connect(distOut);

    // --- 2. PHASER ---
    const phaserIn = ctx.createGain(); const phaserOut = ctx.createGain();
    const phaserDry = ctx.createGain(); const phaserWet = ctx.createGain();
    const ap1 = ctx.createBiquadFilter(); ap1.type = 'allpass'; ap1.frequency.value = 1000;
    const ap2 = ctx.createBiquadFilter(); ap2.type = 'allpass'; ap2.frequency.value = 1000;
    const ap3 = ctx.createBiquadFilter(); ap3.type = 'allpass'; ap3.frequency.value = 1000;
    const phaserLFO = ctx.createOscillator(); phaserLFO.type = 'sine'; phaserLFO.frequency.value = 0.5; phaserLFO.start();
    const phaserDepth = ctx.createGain(); phaserDepth.gain.value = 500;
    phaserIn.connect(phaserDry); phaserDry.connect(phaserOut);
    phaserIn.connect(ap1); ap1.connect(ap2); ap2.connect(ap3); ap3.connect(phaserWet); phaserWet.connect(phaserOut);
    phaserLFO.connect(phaserDepth); phaserDepth.connect(ap1.frequency); phaserDepth.connect(ap2.frequency); phaserDepth.connect(ap3.frequency);

    // --- 3. CHORUS ---
    const chorusIn = ctx.createGain(); const chorusOut = ctx.createGain();
    const chorusSplit = ctx.createGain(); const chorusDelay = ctx.createDelay(); chorusDelay.delayTime.value = 0.03;
    const chorusLFO = ctx.createOscillator(); chorusLFO.type = 'sine'; chorusLFO.frequency.value = 1.5; chorusLFO.start();
    const chorusDepth = ctx.createGain(); chorusDepth.gain.value = 0.002;
    const chorusMix = ctx.createGain();
    chorusIn.connect(chorusSplit); chorusIn.connect(chorusDelay);
    chorusLFO.connect(chorusDepth); chorusDepth.connect(chorusDelay.delayTime);
    chorusSplit.connect(chorusOut); chorusDelay.connect(chorusMix); chorusMix.connect(chorusOut);

    // --- 4. DELAY ---
    const delayIn = ctx.createGain(); const delayOut = ctx.createGain();
    const dDelay = ctx.createDelay(); dDelay.delayTime.value = 0.4;
    const dFeedback = ctx.createGain(); dFeedback.gain.value = 0.4;
    const dFilter = ctx.createBiquadFilter(); dFilter.frequency.value = 2000;
    const dMix = ctx.createGain();
    delayIn.connect(delayOut); delayIn.connect(dDelay);
    dDelay.connect(dFilter); dFilter.connect(dFeedback); dFeedback.connect(dDelay); dFilter.connect(dMix); dMix.connect(delayOut);

    // --- 5. REVERB ---
    const revIn = ctx.createGain(); const revOut = ctx.createGain();
    const revConv = ctx.createConvolver();
    const rate = ctx.sampleRate; const len = rate * 2.0; const buff = ctx.createBuffer(2, len, rate);
    for (let i = 0; i < len; i++) {
        const dec = Math.pow(1 - i / len, 3);
        buff.getChannelData(0)[i] = (Math.random() * 2 - 1) * dec;
        buff.getChannelData(1)[i] = (Math.random() * 2 - 1) * dec;
    }
    revConv.buffer = buff;
    const revMix = ctx.createGain();
    revIn.connect(revOut); revIn.connect(revConv); revConv.connect(revMix); revMix.connect(revOut);

    // Store nodes
    const nodes = {
        dist: { in: distIn, out: distOut, effect: shaper, tone: distFilter },
        phaser: { in: phaserIn, out: phaserOut, wet: phaserWet, lfo: phaserLFO, depth: phaserDepth },
        chorus: { in: chorusIn, out: chorusOut, lfo: chorusLFO, depth: chorusDepth, mix: chorusMix },
        delay: { in: delayIn, out: delayOut, time: dDelay, feed: dFeedback, mix: dMix },
        reverb: { in: revIn, out: revOut, mix: revMix }
    };

    // Note: Connections are handled by connectPedalChain()
    return { input, output, nodes };
}

/* =========================================================================
   AUDIO GRAPH BUILDING & ROUTING
   ========================================================================= */

function buildAudioGraph() {
    if (!audioCtx) return;
    if (isBuildingAudioGraph) return;
    isBuildingAudioGraph = true;

    // Load Worklet Logic
    if (!audioNodes['workletLoaded']) {
        // 1. Slopes Worklet
        const blobSlopes = new Blob([slopesWorkletCode], { type: 'application/javascript' });
        const urlSlopes = URL.createObjectURL(blobSlopes);

        // 2. Recorder Worklet
        const blobRec = new Blob([recorderWorkletCode], { type: 'application/javascript' });
        const urlRec = URL.createObjectURL(blobRec);

        // 3. Twists Worklet Blob/URL definition
        const blobTwists = new Blob([TWISTS_WORKLET_CODE], { type: 'application/javascript' });
        const urlTwists = URL.createObjectURL(blobTwists);

        Promise.all([
            audioCtx.audioWorklet.addModule(urlSlopes),
            audioCtx.audioWorklet.addModule(urlRec),
            audioCtx.audioWorklet.addModule(urlTwists)
        ]).then(() => {
            audioNodes['workletLoaded'] = true;
            finishBuild();
        }).catch(err => {
            console.error("Worklet Load Failed", err);
        });

        return;
    } else {
        finishBuild();
    }
}

function finishBuild() {
    // 1. INITIALIZATION
    if (!audioNodes['Computer_IO']) {

        // --- GENERATE CUSTOM WAVES ---
        if (!slopesWaves.log) {
            slopesWaves.log = createWaveFromFunction(audioCtx, (t) => Math.pow(t, 4));
            slopesWaves.exp = createWaveFromFunction(audioCtx, (t) => Math.pow(1 - t, 4));
            slopesWaves.bentTri = createWaveFromFunction(audioCtx, (t) => {
                if (t < 0.5) return Math.pow(t * 2, 2);
                else return Math.pow((1 - t) * 2, 2);
            });
        }

        const compIO = createComputerIO(audioCtx);
        audioNodes['Computer_IO'] = compIO;
        audioNodes['Comp_L_Out'] = compIO.outputL;
        audioNodes['Comp_R_Out'] = compIO.outputR;
        audioNodes['Comp_CV1_Out'] = compIO.cv1Out;
        audioNodes['Comp_CV2_Out'] = compIO.cv2Out;
        audioNodes['Comp_P1_Out'] = compIO.pulse1Out;

        if (!audioNodes['Midi_Pitch']) {
            audioNodes['Midi_Pitch'] = audioCtx.createConstantSource(); 
            audioNodes['Midi_Pitch'].offset.value = 0.0; // <--- Set Default to C3 (0V)
            audioNodes['Midi_Pitch'].start();
            
            audioNodes['Midi_Gate'] = audioCtx.createConstantSource(); 
            audioNodes['Midi_Gate'].offset.value = 0.0; // <--- Set Default to Gate Off
            audioNodes['Midi_Gate'].start();
        }
        if (!audioNodes['Global_Noise']) {
            const bSize = audioCtx.sampleRate * 2;
            const b = audioCtx.createBuffer(1, bSize, audioCtx.sampleRate);
            const d = b.getChannelData(0);
            for (let i = 0; i < bSize; i++) d[i] = Math.random() * 2 - 1;
            const gn = audioCtx.createBufferSource(); gn.buffer = b; gn.loop = true; gn.start();
            audioNodes['Global_Noise'] = gn;
        }

        let targetCardId = 'reverb';
        const labelEl = document.getElementById('activeCardLabel');
        if (labelEl && labelEl.textContent) {
            const def = AVAILABLE_CARDS.find(c => c.name === labelEl.textContent);
            if (def) targetCardId = def.id;
        }
        activeComputerCard = null;
        swapComputerCard(targetCardId);

        // --- Standard Synth Modules ---
        audioNodes['VCO1'] = createVCO('square');
        audioNodes['VCO1_Sin'] = createVCO('sine');
        audioNodes['VCO2'] = createVCO('square');
        audioNodes['VCO2_Sin'] = createVCO('sine');

        audioNodes['VCF1'] = createVCF(); audioNodes['VCF2'] = createVCF();
        audioNodes['Slopes1'] = createSlopes(false); audioNodes['Slopes2'] = createSlopes(true);
        audioNodes['RingMod'] = createRingMod(); audioNodes['Stomp'] = createStomp();
        audioNodes['Pedalboard'] = createPedalboard(audioCtx);
        audioNodes['Amp'] = createAmp();

        // --- Chassis & Mixer ---
        audioNodes['Chassis_Filter'] = audioCtx.createBiquadFilter();
        audioNodes['Chassis_Filter'].type = 'lowpass'; audioNodes['Chassis_Filter'].frequency.value = 200; audioNodes['Chassis_Filter'].Q.value = 2;
        audioNodes['Chassis_Gain'] = audioCtx.createGain(); audioNodes['Chassis_Gain'].gain.value = 0;
        
        audioNodes['Scratch_Filter'] = audioCtx.createBiquadFilter();
        audioNodes['Scratch_Filter'].type = 'bandpass'; audioNodes['Scratch_Filter'].frequency.value = 5000; audioNodes['Scratch_Filter'].Q.value = 0.0;
        audioNodes['Scratch_Gain'] = audioCtx.createGain(); audioNodes['Scratch_Gain'].gain.value = 0;

        const gNoise = audioNodes['Global_Noise'];
        if (gNoise) {
            if (audioNodes['Chassis_Filter']) gNoise.connect(audioNodes['Chassis_Filter']);
            if (audioNodes['Scratch_Filter']) gNoise.connect(audioNodes['Scratch_Filter']);
        }
        audioNodes['Chassis_Filter'].connect(audioNodes['Chassis_Gain']);
        audioNodes['Scratch_Filter'].connect(audioNodes['Scratch_Gain']);

        // --- Mixer Output ---
        audioNodes['Mixer_Ch1'] = audioCtx.createGain(); audioNodes['Mixer_Ch2'] = audioCtx.createGain();
        audioNodes['Mixer_Ch3'] = audioCtx.createGain(); audioNodes['Mixer_Ch4'] = audioCtx.createGain();
        audioNodes['Mixer_Pan1'] = audioCtx.createStereoPanner(); audioNodes['Mixer_Pan2'] = audioCtx.createStereoPanner();
        audioNodes['Mixer_Sum'] = audioCtx.createGain();
        audioNodes['Master_Vol'] = audioCtx.createGain();
        audioNodes['Limiter'] = createLimiter(audioCtx);

        // Connections
        audioNodes['Mixer_Ch1'].connect(audioNodes['Mixer_Pan1']); audioNodes['Mixer_Ch2'].connect(audioNodes['Mixer_Pan2']);
        audioNodes['Mixer_Pan1'].connect(audioNodes['Mixer_Sum']); audioNodes['Mixer_Pan2'].connect(audioNodes['Mixer_Sum']);
        audioNodes['Mixer_Ch3'].connect(audioNodes['Mixer_Sum']); audioNodes['Mixer_Ch4'].connect(audioNodes['Mixer_Sum']);
        audioNodes['Mixer_Sum'].connect(audioNodes['Master_Vol']);
        audioNodes['Master_Vol'].connect(audioNodes['Limiter']);
        audioNodes['Limiter'].connect(audioCtx.destination); // To Speakers

        // Mixer Patchable Outputs (Split L/R)
        audioNodes['Main_Splitter'] = audioCtx.createChannelSplitter(2);
        audioNodes['Mix_Out_L'] = audioCtx.createGain();
        audioNodes['Mix_Out_R'] = audioCtx.createGain();

        audioNodes['Limiter'].connect(audioNodes['Main_Splitter']);
        audioNodes['Main_Splitter'].connect(audioNodes['Mix_Out_L'], 0);
        audioNodes['Main_Splitter'].connect(audioNodes['Mix_Out_R'], 1);

        audioNodes['Volt1'] = audioCtx.createConstantSource(); audioNodes['Volt1'].start();
        audioNodes['Volt2'] = audioCtx.createConstantSource(); audioNodes['Volt2'].start();
        audioNodes['Volt3'] = audioCtx.createConstantSource(); audioNodes['Volt3'].start();
        audioNodes['Volt4'] = audioCtx.createConstantSource(); audioNodes['Volt4'].start();
        audioNodes['Silence'] = audioCtx.createConstantSource(); audioNodes['Silence'].offset.value = 0; audioNodes['Silence'].start();
        
        audioNodes['Stereo_Line_In'] = audioCtx.createGain(); audioNodes['Stereo_Line_In'].gain.value = 10.0;
        audioNodes['Stereo_L_Pre'] = audioCtx.createGain(); audioNodes['Stereo_R_Pre'] = audioCtx.createGain();

        if (!audioNodes['Amp_Analyser']) {
            audioNodes['Amp_Analyser'] = audioCtx.createAnalyser();
            audioNodes['Amp_Analyser'].fftSize = 32;
            audioNodes['Amp_Meter_Data'] = new Uint8Array(audioNodes['Amp_Analyser'].frequencyBinCount);
        }
    }

    // 2. DISCONNECT
    const disconnectNode = (n) => { try { if (n) n.disconnect(); } catch (e) { } };

    disconnectNode(audioNodes['Stereo_Line_In']);
    disconnectNode(audioNodes['Stereo_L_Pre']);
    disconnectNode(audioNodes['Stereo_R_Pre']);
    if (audioNodes['Mic_Splitter']) disconnectNode(audioNodes['Mic_Splitter']);

    if (audioNodes['VCO1']) { disconnectNode(audioNodes['VCO1'].osc); disconnectNode(audioNodes['VCO1_Sin'].osc); }
    if (audioNodes['VCO2']) { disconnectNode(audioNodes['VCO2'].osc); disconnectNode(audioNodes['VCO2_Sin'].osc); }
    if (audioNodes['VCF1']) { disconnectNode(audioNodes['VCF1'].filter); disconnectNode(audioNodes['VCF1'].hpBpOut); }
    if (audioNodes['VCF2']) { disconnectNode(audioNodes['VCF2'].filter); disconnectNode(audioNodes['VCF2'].hpBpOut); }
    if (audioNodes['Slopes1']) disconnectNode(audioNodes['Slopes1'].output);
    if (audioNodes['Slopes2']) disconnectNode(audioNodes['Slopes2'].output);
    if (audioNodes['RingMod']) disconnectNode(audioNodes['RingMod'].output);
    if (audioNodes['Stomp']) { disconnectNode(audioNodes['Stomp'].internalOutput); disconnectNode(audioNodes['Stomp'].sendOut); }
    if (audioNodes['Amp']) disconnectNode(audioNodes['Amp'].output);

    if (audioNodes['Computer_IO']) {
        const cio = audioNodes['Computer_IO'];
        disconnectNode(cio.outputL); disconnectNode(cio.outputR); disconnectNode(cio.cv1Out); disconnectNode(cio.cv2Out); disconnectNode(cio.pulse1Out); disconnectNode(cio.pulse2Out);
    }
    disconnectNode(audioNodes['Volt1']); disconnectNode(audioNodes['Volt2']); disconnectNode(audioNodes['Volt3']); disconnectNode(audioNodes['Volt4']);
    disconnectNode(audioNodes['Silence']); disconnectNode(audioNodes['Chassis_Gain']); disconnectNode(audioNodes['Scratch_Gain']);

    // 3. MAP JACKS
    const jackMap = {
        'jack-audio1ou': audioNodes['Computer_IO'].outputL,
        'jack-audio1out': audioNodes['Computer_IO'].outputL,
        'jack-audio2out': audioNodes['Computer_IO'].outputR,
        'jack-cv1out': audioNodes['Computer_IO'].cv1Out,
        'jack-cv2out': audioNodes['Computer_IO'].cv2Out,
        'jack-pulse1out': audioNodes['Computer_IO'].pulse1Out,
        'jack-pulse2out': audioNodes['Computer_IO'].pulse2Out,

        'jack-audio1in': audioNodes['Computer_IO'].inputL,
        'jack-audio2in': audioNodes['Computer_IO'].inputR,
        'jack-cv1in': audioNodes['Computer_IO'].cv1In,
        'jack-cv2in': audioNodes['Computer_IO'].cv2In,
        'jack-pulse1in': audioNodes['Computer_IO'].pulse1In,
        'jack-pulse2in': audioNodes['Computer_IO'].pulse2In,

        'jack-osc1sqrOut': audioNodes['VCO1'].osc, 'jack-osc1sinOut': audioNodes['VCO1_Sin'].osc,
        'jack-osc1pitchIn': [audioNodes['VCO1'].pitchSum, audioNodes['VCO1_Sin'].pitchSum], 'jack-osc1fmIn': [audioNodes['VCO1'].fmGain, audioNodes['VCO1_Sin'].fmGain],
        'jack-osc2sqrOut': audioNodes['VCO2'].osc, 'jack-osc2sinOut': audioNodes['VCO2_Sin'].osc,
        'jack-osc2pitchIn': [audioNodes['VCO2'].pitchSum, audioNodes['VCO2_Sin'].pitchSum], 'jack-osc2fmIn': [audioNodes['VCO2'].fmGain, audioNodes['VCO2_Sin'].fmGain],
        
        'jack-filter1In': audioNodes['VCF1'].input,
        'jack-filter1lpOut': audioNodes['VCF1'].filter,
        'jack-filter1hpOut': audioNodes['VCF1'].hpBpOut,
        'jack-filter1fmIn': audioNodes['VCF1'].fmGain,
        'jack-filter2In': audioNodes['VCF2'].input,
        'jack-filter2lpOut': audioNodes['VCF2'].filter,
        'jack-filter2hpOut': audioNodes['VCF2'].hpBpOut,
        'jack-filter2fmIn': audioNodes['VCF2'].fmGain,
        
        'jack-slopes1in': audioNodes['Slopes1'].input, 'jack-slopes1out': audioNodes['Slopes1'].output, 'jack-slopes1cvIn': audioNodes['Slopes1'].cvInput,
        'jack-slopes2in': audioNodes['Slopes2'].input, 'jack-slopes2out': audioNodes['Slopes2'].output, 'jack-slopes2cvIn': audioNodes['Slopes2'].cvInput,
        'jack-ring1in': audioNodes['RingMod'].inputA, 'jack-ring2in': audioNodes['RingMod'].inputB, 'jack-ringOut': audioNodes['RingMod'].output,
        'jack-stompIn': audioNodes['Stomp'].input, 'jack-stomnpSend': audioNodes['Stomp'].sendOut, 'jack-stompReturn': audioNodes['Stomp'].returnIn, 'jack-stompOut': audioNodes['Stomp'].output,
        'jack-ampIn': audioNodes['Amp'].input, 'jack-ampOut': audioNodes['Amp'].output,
        'jack-mixer1in': audioNodes['Mixer_Ch1'], 'jack-mixer2in': audioNodes['Mixer_Ch2'], 'jack-mixer3in': audioNodes['Mixer_Ch3'], 'jack-mixer4in': audioNodes['Mixer_Ch4'],
        'jack-volt1Out': audioNodes['Volt1'], 'jack-volt2Out': audioNodes['Volt2'], 'jack-volt3Out': audioNodes['Volt3'], 'jack-volt4Out': audioNodes['Volt4'],
        'jack-stereoIn': audioNodes['Stereo_Line_In'],
        'jack-stereoIn1Out': audioNodes['Stereo_L_Pre'],
        'jack-stereoIn2Out': audioNodes['Stereo_R_Pre'],
        'jack-mixerLout': audioNodes['Mix_Out_L'],
        'jack-mixerRout': audioNodes['Mix_Out_R'],
    };
    
    connectPedalChain();

    cableData.forEach(cable => {
        const sMap = jackMap[cable.start]; const eMap = jackMap[cable.end];
        const isOutput = (id) => /out|volt|send/i.test(id); const isInput = (id) => /in|fm|return/i.test(id);
        let source = null, dest = null;
        if (isOutput(cable.start) && isInput(cable.end)) { source = sMap; dest = eMap; }
        else if (isOutput(cable.end) && isInput(cable.start)) { source = eMap; dest = sMap; }
        if (source && dest) {
            const sources = Array.isArray(source) ? source : [source]; const dests = Array.isArray(dest) ? dest : [dest];
            sources.forEach(src => { dests.forEach(dst => { try { if (dst instanceof AudioParam) src.connect(dst); else src.connect(dst); } catch (e) { } }); });
        }
    });

    const isConnected = (jackId) => cableData.some(c => c.start === jackId || c.end === jackId);
    
    if (!isConnected('jack-ring1in')) audioNodes['VCO1_Sin'].osc.connect(audioNodes['RingMod'].inputA);
    if (!isConnected('jack-ring2in')) audioNodes['VCO2_Sin'].osc.connect(audioNodes['RingMod'].inputB);
    if (!isConnected('jack-osc1fmIn')) audioNodes['VCO2_Sin'].osc.connect(audioNodes['VCO1'].fmGain);
    if (!isConnected('jack-osc1fmIn')) audioNodes['VCO2_Sin'].osc.connect(audioNodes['VCO1_Sin'].fmGain);
    if (!isConnected('jack-osc2fmIn')) audioNodes['VCO1_Sin'].osc.connect(audioNodes['VCO2'].fmGain);
    if (!isConnected('jack-osc2fmIn')) audioNodes['VCO1_Sin'].osc.connect(audioNodes['VCO2_Sin'].fmGain);
    if (!isConnected('jack-slopes1in')) audioNodes['Silence'].connect(audioNodes['Slopes1'].input);
    if (!isConnected('jack-slopes2in')) audioNodes['Silence'].connect(audioNodes['Slopes2'].input);
    
    if (isConnected('jack-stereoIn')) {
        audioNodes['Stereo_Line_In'].connect(audioNodes['Stereo_L_Pre']);
        audioNodes['Stereo_Line_In'].connect(audioNodes['Stereo_R_Pre']);
    } else {
        if (audioNodes['Mic_Splitter'] && micEnabled) {
            audioNodes['Mic_Splitter'].connect(audioNodes['Stereo_L_Pre'], 0);
            audioNodes['Mic_Splitter'].connect(audioNodes['Stereo_R_Pre'], 1);
        }
    }
    
    if (!isConnected('jack-ampIn')) {
        if (audioNodes['Chassis_Gain']) audioNodes['Chassis_Gain'].connect(audioNodes['Amp'].input);
        if (audioNodes['Scratch_Gain']) audioNodes['Scratch_Gain'].connect(audioNodes['Amp'].input);
    }
    
    // Humpback Filter Normalization
    if (!isConnected('jack-filter2In')) {
        audioNodes['VCF1'].filter.connect(audioNodes['VCF2'].input);
    }
    
    const stomp = audioNodes['Stomp'];
    const pedals = audioNodes['Pedalboard'];
    try { stomp.sendOut.connect(pedals.input); } catch (e) { }
    if (!isConnected('jack-stompReturn')) {
        pedals.output.connect(stomp.returnIn);
    } else {
        try { pedals.output.disconnect(stomp.returnIn); } catch (e) { }
    }
    audioNodes['Amp'].output.connect(audioNodes['Amp_Analyser']);

    updateAudioParams();

    // Scope Logic
    globalJackMap = {
        // Computer / Main
        'jack-audio1out': audioNodes['Computer_IO'].outputL,
        'jack-audio2out': audioNodes['Computer_IO'].outputR,
        'jack-cv1out': audioNodes['Computer_IO'].cv1Out,
        'jack-cv2out': audioNodes['Computer_IO'].cv2Out,
        'jack-pulse1out': audioNodes['Computer_IO'].pulse1Out,
        'jack-pulse2out': audioNodes['Computer_IO'].pulse2Out,

        // Oscillators
        'jack-osc1sqrOut': audioNodes['VCO1'].osc,
        'jack-osc1sinOut': audioNodes['VCO1_Sin'].osc,
        'jack-osc2sqrOut': audioNodes['VCO2'].osc,
        'jack-osc2sinOut': audioNodes['VCO2_Sin'].osc,

        // Processors
        'jack-slopes1out': audioNodes['Slopes1'].output,
        'jack-slopes2out': audioNodes['Slopes2'].output,
        'jack-ampOut': audioNodes['Amp'].output,
        'jack-ringOut': audioNodes['RingMod'].output,

        // Filters
        'jack-filter1hpOut': audioNodes['VCF1'].hpBpOut,
        'jack-filter1lpOut': audioNodes['VCF1'].filter,
        'jack-filter2hpOut': audioNodes['VCF2'].hpBpOut,
        'jack-filter2lpOut': audioNodes['VCF2'].filter,

        // Mixer & Stereo
        'jack-mixerLout': audioNodes['Mix_Out_L'],
        'jack-mixerRout': audioNodes['Mix_Out_R'],
        'jack-stereoIn1Out': audioNodes['Stereo_L_Pre'],
        'jack-stereoIn2Out': audioNodes['Stereo_R_Pre'],

        // Voltages
        'jack-volt1Out': audioNodes['Volt1'],
        'jack-volt2Out': audioNodes['Volt2'],
        'jack-volt3Out': audioNodes['Volt3'],
        'jack-volt4Out': audioNodes['Volt4']
    };
    initScope();
    updateScopeConnection();
    isBuildingAudioGraph = false;
}

function connectPedalChain() {
    if (!audioNodes['Pedalboard']) return;

    const pb = audioNodes['Pedalboard'];
    const nodes = pb.nodes;

    // 1. Disconnect everything first
    try { pb.input.disconnect(); } catch (e) { }
    Object.values(nodes).forEach(n => {
        try { n.out.disconnect(); } catch (e) { }
    });

    // 2. Build the chain based on activePedalChain array
    const signalChain = [...activePedalChain].reverse();

    let currentSource = pb.input;

    signalChain.forEach(pedalId => {
        const pedalNode = nodes[pedalId];
        if (pedalNode) {
            currentSource.connect(pedalNode.in);
            currentSource = pedalNode.out;
        }
    });

    // 3. Connect final pedal to Output
    currentSource.connect(pb.output);
}

/* =========================================================================
   RUNTIME PARAMETERS & UTILITIES
   ========================================================================= */

function getKnobValue(id, min, max, type = 'linear') {
    const state = componentStates[id];
    let deg = state ? parseFloat(state.value) : (SYSTEM_CONFIG[id]?.defValue || 0);

    // Normalize degrees (-150 to 150) to 0.0 to 1.0
    let norm = (deg + 150) / 300;
    if (norm < 0) norm = 0; if (norm > 1) norm = 1;

    if (type === 'exp') {
        if (min === 0 || Math.abs(min) < 0.001) {
            return max * Math.pow(norm, 2);
        }
        return min * Math.pow(max / min, norm);
    }
    return min + (max - min) * norm;
}

const updateSlopes = (id, knobId, shapeSwId, loopSwId, ledTopId, ledBotId) => {
    const mod = audioNodes[id];
    if (!mod || !mod.processor) return;
    const node = mod.processor;

    // 1. Sync Controls
    const kVal = componentStates[knobId] ? parseFloat(componentStates[knobId].value) : 0;
    const normKnob = (kVal + 150) / 300;

    const loopVal = componentStates[loopSwId]?.value;
    const mode = (loopVal === undefined) ? 1 : parseInt(loopVal);

    const rawShape = componentStates[shapeSwId]?.value;
    const shape = (rawShape === undefined) ? 1 : parseInt(rawShape);

    node.port.postMessage({ mode: mode, shape: shape, knobRate: normKnob });

    // 2. LED PWM Visualization
    const topLed = document.getElementById(ledTopId);
    const botLed = document.getElementById(ledBotId);

    if (topLed && botLed && node.ledValues) {
        topLed.classList.remove('active');
        botLed.classList.remove('active');

        const redColor = '239, 68, 68';

        if (node.ledValues.rise > 0.01) {
            topLed.classList.add('active');
            topLed.style.backgroundColor = `rgba(${redColor}, ${node.ledValues.rise})`;
            topLed.style.boxShadow = `0 0 ${8 * node.ledValues.rise}px rgba(${redColor}, ${node.ledValues.rise})`;
        } else {
            topLed.style.backgroundColor = '';
            topLed.style.boxShadow = '';
        }

        if (node.ledValues.fall > 0.01) {
            botLed.classList.add('active');
            botLed.style.backgroundColor = `rgba(${redColor}, ${node.ledValues.fall})`;
            botLed.style.boxShadow = `0 0 ${8 * node.ledValues.fall}px rgba(${redColor}, ${node.ledValues.fall})`;
        } else {
            botLed.style.backgroundColor = '';
            botLed.style.boxShadow = '';
        }
    }
};

function triggerHandlingNoise(isDrag = false) {
    if (!audioCtx || !audioNodes['Chassis_Gain'] || !audioNodes['Scratch_Gain']) return;

    const now = audioCtx.currentTime;
    const thump = audioNodes['Chassis_Gain'].gain;
    const scratch = audioNodes['Scratch_Gain'].gain;
    const scratchFilter = audioNodes['Scratch_Filter'];

    const knobId = 'knob-medium-amp';
    const savedState = componentStates[knobId];
    const currentAngle = savedState ? parseFloat(savedState.value) : -100;

    let gainFactor = (currentAngle + 150) / 300;
    if (gainFactor < 0) gainFactor = 0;
    if (gainFactor > 1) gainFactor = 1;

    if (gainFactor < 0.01) {
        thump.cancelScheduledValues(now);
        scratch.cancelScheduledValues(now);
        thump.setValueAtTime(0, now);
        scratch.setValueAtTime(0, now);
        return;
    }

    thump.cancelScheduledValues(now);
    scratch.cancelScheduledValues(now);

    const thumpVol = 1.5 * isDrag ? 0.5 : 3.0 * gainFactor;
    const scratchVol = 0.0005 * isDrag ? (1.5 + Math.random()) : 2.0 * gainFactor;
    const duration = 10 * isDrag ? 0.04 : 0.15;

    thump.setValueAtTime(0, now);
    thump.linearRampToValueAtTime(thumpVol, now + 0.005);
    thump.exponentialRampToValueAtTime(0.001, now + duration);

    const baseFreq = isDrag ? (2500 + Math.random() * 3000) : 2500;
    scratchFilter.frequency.setValueAtTime(baseFreq, now);

    scratch.setValueAtTime(0, now);
    scratch.linearRampToValueAtTime(0.01 * scratchVol, now + 0.001);
    scratch.exponentialRampToValueAtTime(0.001, now + (duration / 2));
}

function updateAmpMeter() {
    if (!audioCtx || audioCtx.state !== 'running' || !audioNodes['Amp_Analyser']) return;

    const ana = audioNodes['Amp_Analyser'];
    const data = audioNodes['Amp_Meter_Data'];

    ana.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        const amplitude = (data[i] - 128) / 128.0;
        sum += amplitude * amplitude;
    }
    const rms = Math.sqrt(sum / data.length);
    const db = 20 * Math.log10(Math.max(0.001, rms));

    let targetLevel = (db + 40) / 38;
    if (targetLevel < 0) targetLevel = 0;
    if (targetLevel > 1) targetLevel = 1;

    if (targetLevel > smoothAmpLevel) {
        smoothAmpLevel += (targetLevel - smoothAmpLevel) * 0.6;
    } else {
        smoothAmpLevel += (targetLevel - smoothAmpLevel) * 0.05;
    }

    const displayLevel = smoothAmpLevel * 4.5;

    for (let i = 1; i <= 4; i++) {
        const led = document.getElementById(`led-amp-${i}`);
        if (led) {
            if (i <= displayLevel) {
                led.classList.add('active');
                led.style.backgroundColor = '#ef4444';
                led.style.boxShadow = '0 0 8px #ef4444, inset 0 0 2px rgba(255,255,255,0.5)';
            } else {
                led.classList.remove('active');
                led.style.backgroundColor = '';
                led.style.boxShadow = '';
            }
        }
    }
}

function updateAudioParams() {
    if (!audioCtx || Object.keys(audioNodes).length === 0) return;
    const now = audioCtx.currentTime;

    if (activeComputerCard) {
        const getNorm = (id) => {
            const val = componentStates[id] ? parseFloat(componentStates[id].value) : 0;
            return (val + 150) / 300;
        };

        const params = {
            x: getNorm('knob-small-x'),
            y: getNorm('knob-small-y'),
            main: getNorm('knob-large-computer'),
            switch: componentStates['switch-3way-computer']?.value || 0
        };

        activeComputerCard.update(params, now);
    }

    // Oscillators
    const getOscFreq = (knobId) => {
        const kVal = componentStates[knobId] ? parseFloat(componentStates[knobId].value) : 0;
        const center = 130.0; 

        if (Math.abs(kVal) < 0.1) return center;

        if (kVal > 0) {
            return center * Math.pow(3000 / center, kVal / 90);
        } else {
            const targetLow = 70 / 60;
            return center * Math.pow(targetLow / center, Math.abs(kVal) / 150);
        }
    };

    const osc1Freq = getOscFreq('knob-large-osc1');
    const kFine1 = componentStates['knob-small-osc1fine'] ? parseFloat(componentStates['knob-small-osc1fine'].value) : 0;
    const fine1 = (kFine1 / 150.0) * 100;

    safeParam(audioNodes['VCO1'].osc.frequency, osc1Freq, now);
    safeParam(audioNodes['VCO1'].osc.detune, fine1, now);
    safeParam(audioNodes['VCO1_Sin'].osc.frequency, osc1Freq, now);
    safeParam(audioNodes['VCO1_Sin'].osc.detune, fine1, now);
    const fm1 = getKnobValue('knob-small-osc1fm', 0, 3000, 'exp');
    safeParam(audioNodes['VCO1'].fmGain.gain, fm1, now); safeParam(audioNodes['VCO1_Sin'].fmGain.gain, fm1, now);

    const osc2Freq = getOscFreq('knob-large-osc2');
    const kFine2 = componentStates['knob-small-osc2fine'] ? parseFloat(componentStates['knob-small-osc2fine'].value) : 0;
    const fine2 = (kFine2 / 150.0) * 100;

    safeParam(audioNodes['VCO2'].osc.frequency, osc2Freq, now);
    safeParam(audioNodes['VCO2'].osc.detune, fine2, now);
    safeParam(audioNodes['VCO2_Sin'].osc.frequency, osc2Freq, now);
    safeParam(audioNodes['VCO2_Sin'].osc.detune, fine2, now);
    const fm2 = getKnobValue('knob-small-osc2fm', 0, 3000, 'exp');
    safeParam(audioNodes['VCO2'].fmGain.gain, fm2, now); safeParam(audioNodes['VCO2_Sin'].fmGain.gain, fm2, now);

    // Filters
    const getRes = (kId) => {
        const raw = getKnobValue(kId, 0, 1, 'linear');
        return 0.5 + (Math.pow(raw, 2) * 40) * 2;
    };

    const updateFilter = (mod, f, res, fm, swId) => {
        safeParam(mod.filter.frequency, f, now);
        safeParam(mod.hpFilter.frequency, f, now);
        safeParam(mod.bpFilter.frequency, f, now);
        safeParam(mod.filter.Q, res, now);
        safeParam(mod.hpFilter.Q, res, now);
        safeParam(mod.bpFilter.Q, res, now);
        safeParam(mod.fmGain.gain, fm, now);

        const sw = componentStates[swId]?.value || 0;
        try { mod.hpFilter.disconnect(mod.hpBpOut); } catch (e) { }
        try { mod.bpFilter.disconnect(mod.hpBpOut); } catch (e) { }

        if (sw === 1) {
            mod.hpFilter.connect(mod.hpBpOut);
        } else {
            mod.bpFilter.connect(mod.hpBpOut);
        }
    };

    updateFilter(
        audioNodes['VCF1'],
        getKnobValue('knob-large-filter1', 20, 12000, 'exp'),
        getRes('knob-small-filter1res'),
        getKnobValue('knob-small-filter1fm', 0, 4000, 'exp'),
        'switch-2way-filter1hp'
    );

    updateFilter(
        audioNodes['VCF2'],
        getKnobValue('knob-large-filter2', 20, 12000, 'exp'),
        getRes('knob-small-filter2res'),
        getKnobValue('knob-small-filter2fm', 0, 4000, 'exp'),
        'switch-2way-filter2hp'
    );

    updateSlopes('Slopes1', 'knob-medium-slopes1', 'switch-3way-slopes1shape', 'switch-3way-slopes1loop', 'led-slopes1-rise', 'led-slopes1-fall');
    updateSlopes('Slopes2', 'knob-medium-slopes2', 'switch-3way-slopes2shape', 'switch-3way-slopes2loop', 'led-slopes2-rise', 'led-slopes2-fall');

    // Amp & Mixer
    const ampGain = getKnobValue('knob-medium-amp', 0, 7.0, 'exp');
    const ampMode = componentStates['switch-2way-amp']?.value || 0;
    audioNodes['Amp'].shaper.curve = createDistortionCurve(ampMode === 1 ? 400 : 20);
    safeParam(audioNodes['Amp'].drive.gain, ampGain, now);
    
    safeParam(audioNodes['Mixer_Ch1'].gain, getKnobValue('knob-small-mix1', 0, 1), now);
    safeParam(audioNodes['Mixer_Ch2'].gain, getKnobValue('knob-small-mix2', 0, 1), now);
    safeParam(audioNodes['Mixer_Ch3'].gain, getKnobValue('knob-small-mix3', 0, 1), now);
    safeParam(audioNodes['Mixer_Ch4'].gain, getKnobValue('knob-small-mix4', 0, 1), now);
    safeParam(audioNodes['Mixer_Pan1'].pan, getKnobValue('knob-small-mix1pan', -1, 1), now);
    safeParam(audioNodes['Mixer_Pan2'].pan, getKnobValue('knob-small-mix2pan', -1, 1), now);
    safeParam(audioNodes['Master_Vol'].gain, getKnobValue('knob-large-volumeMain', 0, 2), now);

    // Voltage Outputs
    const b1 = componentStates['button-1']?.value || 0;
    const b2 = componentStates['button-2']?.value || 0;
    const b3 = componentStates['button-3']?.value || 0;
    const b4 = componentStates['button-4']?.value || 0;
    const btnIndex = b1 | (b2 << 1) | (b3 << 2) | (b4 << 3);
    const voltKnobAngle = componentStates['knob-small-voltagesBlend'] ? parseFloat(componentStates['knob-small-voltagesBlend'].value) : 0;

    safeParam(audioNodes['Volt1'].offset, getInterpolatedVoltage(voltKnobAngle, btnIndex, 0), now);
    safeParam(audioNodes['Volt2'].offset, getInterpolatedVoltage(voltKnobAngle, btnIndex, 1), now);
    safeParam(audioNodes['Volt3'].offset, getInterpolatedVoltage(voltKnobAngle, btnIndex, 2), now);
    safeParam(audioNodes['Volt4'].offset, getInterpolatedVoltage(voltKnobAngle, btnIndex, 3), now);

    // Stompbox
    const stomp = audioNodes['Stomp'];
    const stompBlend = getKnobValue('knob-small-stompBlend', 0, 1);
    safeParam(stomp.dryGain.gain, 1.0 - stompBlend, now);
    safeParam(stomp.wetGain.gain, stompBlend, now);

    const fbKnob = componentStates['knob-small-stompFeedback'];
    const fbAngle = fbKnob ? parseFloat(fbKnob.value) : -150;
    let fbGain = 0;
    if (Math.abs(fbAngle) > 10) {
        fbGain = (fbAngle / 150.0) * 1.2;
    }
    safeParam(stomp.feedbackGain.gain, fbGain, now);

    // Pedalboard
    const pb = audioNodes['Pedalboard'].nodes;

    // Distortion
    const distActive = componentStates['pedal_dist_active']?.value === 1;
    if (distActive) {
        const drive = getKnobValue('p_dist_drive', 0, 100);
        pb.dist.effect.curve = createDistortionCurve(drive);
        const tone = getKnobValue('p_dist_tone', 1000, 10000);
        safeParam(pb.dist.tone.frequency, tone, now);
    } else {
        pb.dist.effect.curve = createDistortionCurve(0);
    }

    // Phaser
    const phaserActive = componentStates['pedal_phaser_active']?.value === 1;
    const pMix = phaserActive ? getKnobValue('p_phaser_mix', 0, 1) : 0;
    safeParam(pb.phaser.wet.gain, pMix, now);
    const pRate = getKnobValue('p_phaser_rate', 0.1, 10);
    safeParam(pb.phaser.lfo.frequency, pRate, now);
    const pDepth = getKnobValue('p_phaser_depth', 0, 1000);
    safeParam(pb.phaser.depth.gain, pDepth, now);

    // Chorus
    const chorusActive = componentStates['pedal_chorus_active']?.value === 1;
    const cMix = chorusActive ? getKnobValue('p_chorus_mix', 0, 1) : 0;
    safeParam(pb.chorus.mix.gain, cMix, now);
    const cRate = getKnobValue('p_chorus_rate', 0.1, 5);
    safeParam(pb.chorus.lfo.frequency, cRate, now);
    const cDepth = getKnobValue('p_chorus_depth', 0, 0.005);
    safeParam(pb.chorus.depth.gain, cDepth, now);

    // Delay
    const delayActive = componentStates['pedal_delay_active']?.value === 1;
    const dMix = delayActive ? getKnobValue('p_delay_mix', 0, 1) : 0;
    safeParam(pb.delay.mix.gain, dMix, now);
    const dTime = getKnobValue('p_delay_time', 0.001, 1.0);
    safeParam(pb.delay.time.delayTime, dTime, now);
    const dFb = getKnobValue('p_delay_fb', 0, 0.9);
    safeParam(pb.delay.feed.gain, dFb, now);

    // Reverb
    const revActive = componentStates['pedal_reverb_active']?.value === 1;
    const rMix = revActive ? getKnobValue('p_rev_mix', 0, 1) : 0;
    safeParam(pb.reverb.mix.gain, rMix, now);
}
