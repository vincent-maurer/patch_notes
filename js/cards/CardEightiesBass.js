class CardEightiesBass extends ComputerCard {
    static meta = {
        id: 'eighties_bass',
        name: 'Eighties Bass',
        num: '28',
        desc: "Bass-oriented complete monosynth voice consisting of five detuned saw wave oscillators with mixable white noise.",
    };

    constructor(ctx, io) {
        super(ctx, io);
        if (!ctx) return;

        // --- NODES ---
        this.masterGain = ctx.createGain();
        this.filter = ctx.createBiquadFilter();
        this.oscGain = ctx.createGain();
        this.noiseGain = ctx.createGain();

        // 5 Oscillators
        this.oscs = [];
        this.numOscs = 5;
        this.baseDetune = 5; // Cents spread

        for (let i = 0; i < this.numOscs; i++) {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            // Start silent
            osc.frequency.value = 0;
            this.oscs.push(osc);
        }

        // Sub-octave is the last one? 
        // Original code:
        // for(int i=1; i<NUM_VOICES-1; i++) {
        //   aOscs[i].setFreq( f + val );
        // }
        // aOscs[NUM_VOICES-1].setFreq( f/2.0 );
        // aOscs[0] seems to be the base?
        // Actually indexes in original are 0..4.
        // Loop at line 91: for(int i=1; i<NUM_VOICES-1; i++) -> i=1,2,3
        // Line 94: aOscs[NUM_VOICES-1] (index 4) is sub octave.
        // What about index 0?
        // It's not in the loop at line 91!
        // Wait, line 91: for(int i=1; i<NUM_VOICES-1; i++)
        // This sets freq for 1, 2, 3.
        // Index 4 is sub.
        // Index 0 is NOT UPDATED in setNotes()? That seems like a bug in original or I misread.
        // Ah, checked original again:
        // `aOscs` declared line 39. `NUM_VOICES` 5.
        // `setNotes` line 89:
        // `float f = mtof(midi_note);`
        // `for(int i=1; i<NUM_VOICES-1; i++)` -> i = 1, 2, 3.
        // `aOscs[i].setFreq(...)`
        // `aOscs[NUM_VOICES-1].setFreq(...)` -> i = 4.
        // So aOscs[0] is never updated? That's weird.
        // Let's look at `aOscs[0]`.
        // Maybe it's the reference?
        // Wait, if aOscs[0] is never updated, it stays at default?
        // Maybe I should just update all of them. I'll make 0 the root, 1,2,3 detuned, 4 sub.

        // Noise
        this.noiseBuffer = this.createNoiseBuffer(ctx);
        this.noiseSrc = ctx.createBufferSource();
        this.noiseSrc.buffer = this.noiseBuffer;
        this.noiseSrc.loop = true;

        // Connections
        // Oscs -> OscGain
        this.oscs.forEach(osc => osc.connect(this.oscGain));
        // Noise -> NoiseGain
        this.noiseSrc.connect(this.noiseGain);

        // Summing: OscGain + NoiseGain -> Filter -> MasterGain -> Output
        this.oscGain.connect(this.filter);
        this.noiseGain.connect(this.filter);
        this.filter.connect(this.masterGain);

        // Analysis / Sensors for inputs
        this.createSensors(ctx);

        // State defaults
        this.filterMode = 0; // 0=LP, 1=BP, 2=HP
        this.lastSwitch = 0;
        this.filterModel = ['lowpass', 'bandpass', 'highpass'];

        // Initial gains
        this.oscGain.gain.value = 0.2; // Prevent clipping with 5 oscs
        this.noiseGain.gain.value = 0;
        this.masterGain.gain.value = 1.0;

        // Start sources
        this.oscs.forEach(o => o.start());
        this.noiseSrc.start();
    }

    createNoiseBuffer(ctx) {
        const bufferSize = ctx.sampleRate * 2; // 2 seconds
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    createSensors(ctx) {
        // We need to read audio-rate inputs for Detune (Audio1) and Noise (Audio2)
        // And CV inputs for Pitch (CV1) and Cutoff (CV2)

        // Helper to create analyser
        const make = () => {
            const a = ctx.createAnalyser();
            a.fftSize = 32; // Small buffer for fast time-domain access
            return a;
        };

        this.sensDetune = make();
        this.sensNoise = make();
        this.sensPitch = make();
        this.sensCutoff = make();

        this.bufDetune = new Uint8Array(32);
        this.bufNoise = new Uint8Array(32);
        this.bufPitch = new Uint8Array(32);
        this.bufCutoff = new Uint8Array(32);
    }

    mount() {
        super.mount(); // LEDs reset etc

        // IO connections to sensors
        this.io.inputL.connect(this.sensDetune);
        this.io.inputR.connect(this.sensNoise);
        this.io.cv1In.connect(this.sensPitch);
        this.io.cv2In.connect(this.sensCutoff);

        // Output connection
        this.masterGain.connect(this.io.outputL);
        this.masterGain.connect(this.io.outputR);

        // CV inputs are just read by sensors for control logic, 
        // they don't pass audio through.
    }

    unmount() {
        super.unmount();

        this.io.inputL.disconnect(this.sensDetune);
        this.io.inputR.disconnect(this.sensNoise);
        this.io.cv1In.disconnect(this.sensPitch);
        this.io.cv2In.disconnect(this.sensCutoff);

        this.masterGain.disconnect();

        this.oscs.forEach(o => o.stop());
        this.noiseSrc.stop();
    }

    update(p, time) {
        // --- 1. READ INPUTS ---

        // Get average levels from analysers (simplistic approximation for CV/Audio control in JS frame)
        // For CV, we want DC offset. Analyser blocks DC by default? 
        // Actually, AnalyserNode DOES pass DC if not removed, but getByteFrequencyData removes it?
        // getByteTimeDomainData returns 128 as zero. range 0-255.

        const getVal = (analyser, buffer) => {
            analyser.getByteTimeDomainData(buffer);
            // Average the buffer? Or just take first sample? 
            // Frame rate is ~60fps, buffer is small. 
            // Control rate in original is 128Hz. 60Hz is fine.
            let sum = 0;
            for (let i = 0; i < buffer.length; i++) sum += buffer[i];
            return (sum / buffer.length - 128) / 128.0; // -1 to 1
        };

        const vDetune = getVal(this.sensDetune, this.bufDetune); // Audio 1: Detune
        const vNoise = getVal(this.sensNoise, this.bufNoise);    // Audio 2: Noise Mix
        const vPitch = getVal(this.sensPitch, this.bufPitch);    // CV 1: Pitch V/Oct
        const vCutoff = getVal(this.sensCutoff, this.bufCutoff); // CV 2: Cutoff Offset

        // --- 2. LOGIC ---

        // Filter Switch
        // Logic: Tap to change. p.switch is 0, 1, 2. (Actually switch is 3-way toggle usually? No, it's momentary in firmware)
        // Firmware: "switch is filter mode... if comp.switchPos() < 500".
        // In this UI, p.switch is 0 (Up), 1 (Middle), 2 (Down). 
        // If it's a momentary button emulation, we might just use the change.
        // But CardDefinitions calls it "switch-3way-computer".
        // Let's assume user toggles it physically.
        // We'll mimic the "tap down" behavior: If switch goes to position 2 (down), trigger change.

        // Actually "switch-3way-computer" returns 0, 1, 2.
        // Let's map Position 0->LP, 1->BP, 2->HP directly? 
        // Original firmware cycles through modes on button press.
        // But we have a 3-way switch. Let's make it explicit.
        // Pos 0 (Up) = LP
        // Pos 1 (Mid) = BP
        // Pos 2 (Low) = HP
        // This is better than cycling for a 3-way switch.

        if (this.filterMode !== Math.round(p.switch)) {
            this.filterMode = Math.round(p.switch);
            // Map 0,1,2 to LP, BP, HP logic? 
            // Firmware: 0=LP, 1=BP, 2=HP.
            // UI Switch: 0=Up, 1=Mid, 2=Down.
            // Let's map 0->0, 1->1, 2->2.

            // Web Audio Filter Types:
            // 0 -> lowpass
            // 1 -> bandpass
            // 2 -> highpass
            this.filter.type = this.filterModel[this.filterMode] || 'lowpass';

            // Update LEDs
            // Firmware: LED 2,4,6 represent filter mode. (Indices 1, 3, 5 in 0-indexed?)
            // comp.setLED(filt_mode*2, HIGH); -> 0, 2, 4. (If 0-indexed LEDs).
            // Original code: `comp.setLED(filt_mode*2, HIGH)`
            // Wait, MTM LEDs are 1,2,3,4,5,6? Or 0..5?
            // In CardBenjolin loop: `ledMap = [0, 2, 4, 1, 3, 5]`
            // Let's just light up indices 0, 2, 4 corresponding to modes 0, 1, 2.
            this.updateLEDs();
        }

        // Pitch
        // Knob X (0..1) -> Offset. Firmware: map(knobX, 0, 4096, -63, 64) -> Coarse tuning?
        // CV 1 -> V/Oct.
        // Base note 60 (Middle C).
        const coarse = (p.x * 2 - 1) * 24; // +/- 2 octaves? 
        const cvPitchVal = vPitch * 5 * 12; // CV is -1..1 -> +/- 5V -> +/- 5 octaves -> +/- 60 semitones
        // Wait, typical Eurorack CV is 1V/Oct.
        // If vPitch is 1.0 (full rail 128+127), that's "loud".
        // Usually, in this system, standard CV inputs are rough.
        // Let's assume vPitch * 60 is reasonable range.

        const midiNote = 36 + coarse + cvPitchVal + (p.y * 12); // Use Y for something? 
        // Wait, Knob Y is Resonance in firmware.
        // Knob Main is Cutoff.
        // Knob X is Pitch Offset.
        // CV 1 is Pitch.
        // CV 2 is Cutoff CV.

        const note = 36 + (p.x * 48 - 24) + (vPitch * 60); // Base C2, +/- 2 oct, +CV
        const f = 440 * Math.pow(2, (note - 69) / 12);

        // Detune
        // Audio L (Detune) -> Controls spread.
        // Firmware: detune = map(audio1) ...
        // We'll use p.small_x ?? No, p.x is Pitch.
        const detuneAmt = Math.abs(vDetune * 20); // 0..20 cents? Or more? 
        // Firmware can go crazy.

        // Update Oscillators
        // Root
        safeParam(this.oscs[0].frequency, f, time);
        // Detuned 1, 2, 3
        safeParam(this.oscs[1].frequency, f * (1 + 0.005 * (1 + detuneAmt)), time);
        safeParam(this.oscs[2].frequency, f * (1 - 0.005 * (1 + detuneAmt)), time);
        safeParam(this.oscs[3].frequency, f * (1 + 0.012 * (1 + detuneAmt)), time);
        // Sub Octave
        safeParam(this.oscs[4].frequency, f / 2, time);

        // Filter Cutoff
        // Knob Main (0..1) -> Freq
        // CV2 -> Offset
        let cutoffExp = p.main * 10; // 0..10 octaves?
        // Base 20Hz
        let cutoffHz = 20 * Math.pow(2, cutoffExp);
        // Add CV
        cutoffHz *= Math.pow(2, vCutoff * 5); // CV adds +/- octaves

        // Clamp
        if (cutoffHz < 10) cutoffHz = 10;
        if (cutoffHz > 20000) cutoffHz = 20000;

        safeParam(this.filter.frequency, cutoffHz, time);

        // Resonance
        // Knob Y
        const q = p.y * 20; // 0..20 Q
        safeParam(this.filter.Q, q, time);

        // Noise Mix
        // Audio R (Noise Mix)
        // Firmware: noisey_amt controlled by Audio 2.
        // Crossfade signal vs noise?
        // " signal_amt = 1 - noisey_amt "
        // In firmware: simple mix.
        const noiseAmt = Math.abs(vNoise);
        // If nothing plugged in, vNoise is 0.
        // What if we want some noise? Firmware uses Audio2In for noise mix exclusively?
        // "audio R in -- CV controls noise mix"
        // If no input, it's 0 noise.
        // So noise is only available via external CV modulation? 
        // That's what the docs say.
        safeParam(this.noiseGain.gain, noiseAmt, time);
        const maxOscGain = 0.2; // 5 oscillators summing, so 0.2 each ideally
        safeParam(this.oscGain.gain, maxOscGain * (1.0 - (noiseAmt * 0.5)), time);
    }

    updateLEDs() {
        // Light up the correct LED for the filter mode
        // 0 -> LED 0
        // 1 -> LED 2
        // 2 -> LED 4
        const target = this.filterMode * 2;

        for (let i = 0; i < 6; i++) {
            const led = document.getElementById(`led-comp-${i}`);
            if (led) {
                if (i === target) {
                    led.classList.add('active');
                    led.style.backgroundColor = '#ff0000';
                    led.style.boxShadow = '0 0 5px #ff0000';
                } else {
                    led.classList.remove('active');
                    led.style.backgroundColor = '';
                    led.style.boxShadow = '';
                }
            }
        }
    }
}

if (window.registerCard) {
    window.registerCard(CardEightiesBass);
}
