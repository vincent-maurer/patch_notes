class CardCraftedVolts extends ComputerCard {
    static meta = {
        id: 'crafted_volts',
        name: 'Crafted Volts',
        num: '24',
        desc: "Utility Card.\nManual CV Generator & Attenuverter.\nKnobs Main/X/Y: +/- 5V or Attenuvert Input\nSwitch: Toggle Pulse Output"
    };

    constructor(ctx, io) {
        super(ctx, io);

        // --- STATE ---
        this.wasPlugged = {
            audio1: false,
            audio2: false,
            cv1: false,
            cv2: false
        };

        if (!ctx) return; // Allow dummy mode

        // --- AUDIO NODES ---
        // 1. DC Source for Manual Voltage (+1.0 = +5V approx standard, system uses -1 to 1)
        this.dc = ctx.createConstantSource();
        this.dc.offset.value = 1.0;
        this.dc.start();

        // 2. Main Channel (Audio)
        this.gainMain = ctx.createGain(); // The Attenuverter
        this.sumMain = ctx.createGain();  // The Input Mixer

        // 3. CV Channels
        this.gainCV1 = ctx.createGain();
        this.gainCV2 = ctx.createGain();

        // 4. Pulse Channels
        // We use DC -> Gate(Gain) -> Output
        this.gatePulse1 = ctx.createGain();
        this.gatePulse2 = ctx.createGain();
        this.gatePulse1.gain.value = 0;
        this.gatePulse2.gain.value = 0;
    }

    mount() {
        super.mount();
        if (!this.ctx) return; // Skip if dummy

        this.resetConnections();

        // Initial Connection State
        // Main Out (L) is Normal, (R) is Inverted
        this.inverter = this.ctx.createGain();
        this.inverter.gain.value = -1;

        try {
            this.gainMain.connect(this.io.outputL); // Audio L Out (Normal)

            this.gainMain.connect(this.inverter);
            this.inverter.connect(this.io.outputR); // Audio R Out (Inverted)

            // CV Outs
            this.gainCV1.connect(this.io.cv1Out);
            this.gainCV2.connect(this.io.cv2Out);

            // Pulse Outs (Gate Logic)
            this.dc.connect(this.gatePulse1);
            this.gatePulse1.connect(this.io.pulse1Out);

            this.dc.connect(this.gatePulse2);
            this.gatePulse2.connect(this.io.pulse2Out);
        } catch (e) {
            console.warn("CraftedVolts: Partial connection failure", e);
        }
    }

    unmount() {
        super.unmount();
        if (!this.ctx) return;

        try {
            this.dc.stop();
            this.dc.disconnect();

            this.gainMain.disconnect();
            this.sumMain.disconnect();
            this.gainCV1.disconnect();
            this.gainCV2.disconnect();
            this.gatePulse1.disconnect();
            this.gatePulse2.disconnect();

            // Disonnect IO shims just in case
            this.io.inputL.disconnect();
            this.io.inputR.disconnect();
            this.io.cv1In.disconnect();
            this.io.cv2In.disconnect();
        } catch (e) { /* Ignore disconnect errors */ }
    }

    // Helper to check connections
    isPlugged(jackId) {
        if (typeof cableData === 'undefined') return false;
        // Connections are defined by start/end points
        return cableData.some(c => c.start === jackId || c.end === jackId);
    }

    resetConnections() {
        if (!this.ctx) return;
        try {
            // Disconnect Input Sources
            this.io.inputL.disconnect();
            this.io.inputR.disconnect();
            this.io.cv1In.disconnect();
            this.io.cv2In.disconnect();
            this.dc.disconnect(this.gainMain);
            this.dc.disconnect(this.sumMain); // Just in case
            this.sumMain.disconnect();
            this.dc.disconnect(this.gainCV1);
            this.dc.disconnect(this.gainCV2);
        } catch (e) {
            // Ignore if already disconnected
        }
    }

    update(p, time) {
        // --- 1. Connection Detection & Routing ---
        const pluggedAudio1 = this.isPlugged('jack-audio1in');
        const pluggedAudio2 = this.isPlugged('jack-audio2in');
        const pluggedCV1 = this.isPlugged('jack-cv1in');
        const pluggedCV2 = this.isPlugged('jack-cv2in');

        // Helper to safely disconnect
        const safeDisconnect = (src, dest) => {
            try { src.disconnect(dest); } catch (e) { }
        };

        // A. Audio Routing (Main Knob)
        const audioChanged = (pluggedAudio1 !== this.wasPlugged.audio1) || (pluggedAudio2 !== this.wasPlugged.audio2);

        if (audioChanged) {
            // Disconnect everything first to clear state
            safeDisconnect(this.dc, this.gainMain);
            safeDisconnect(this.sumMain, this.gainMain); // Clear sum -> gain connection

            try {
                this.io.inputL.disconnect(this.sumMain);
                this.io.inputR.disconnect(this.sumMain);
            } catch (e) { }

            if (!pluggedAudio1 && !pluggedAudio2) {
                // Manual CV Mode: DC -> GainMain
                this.dc.connect(this.gainMain);
            } else {
                // Attenuvert Mode: Inputs -> Sum -> GainMain
                this.sumMain.connect(this.gainMain);

                if (pluggedAudio1) this.io.inputL.connect(this.sumMain);
                if (pluggedAudio2) this.io.inputR.connect(this.sumMain);
            }
            this.wasPlugged.audio1 = pluggedAudio1;
            this.wasPlugged.audio2 = pluggedAudio2;
        }

        // B. CV1 Routing (Knob X)
        if (pluggedCV1 !== this.wasPlugged.cv1) {
            console.log("CV1 Changed:", pluggedCV1);
            safeDisconnect(this.dc, this.gainCV1);
            try { this.io.cv1In.disconnect(this.gainCV1); } catch (e) { }

            if (pluggedCV1) {
                this.io.cv1In.connect(this.gainCV1);
            } else {
                this.dc.connect(this.gainCV1);
            }
            this.wasPlugged.cv1 = pluggedCV1;
        }

        // C. CV2 Routing (Knob Y)
        if (pluggedCV2 !== this.wasPlugged.cv2) {
            safeDisconnect(this.dc, this.gainCV2);
            try { this.io.cv2In.disconnect(this.gainCV2); } catch (e) { }

            if (pluggedCV2) {
                this.io.cv2In.connect(this.gainCV2);
            } else {
                this.dc.connect(this.gainCV2);
            }
            this.wasPlugged.cv2 = pluggedCV2;
        }

        // --- 2. Parameter Updates ---
        // Knobs are 0.0 to 1.0 (Unitpolar). We want Bipolar (-1.0 to 1.0).
        const bipolar = (val) => (val - 0.5) * 2.0;

        const mainVal = bipolar(p.main);
        const xVal = bipolar(p.x);
        const yVal = bipolar(p.y);

        // Smooth parameter updates
        // FIXME: safeParam might be globally available or need import. 
        // Start with direct setTargetAtTime
        this.gainMain.gain.setTargetAtTime(mainVal, time, 0.01);
        this.gainCV1.gain.setTargetAtTime(xVal, time, 0.01);
        this.gainCV2.gain.setTargetAtTime(yVal, time, 0.01);

        // --- 3. Pulse Logic ---
        // Switch: 0=Top, 1=Mid, 2=Bot (Depending on implementation of p.switch)
        // Usually p.switch is 0, 1, 2.
        // Rust Logic: On/Mom (Active) -> Pulse 1 Active. Off -> Pulse 2 Active.
        // Let's assume Top=On, Mid=Off, Bot=Mom.
        // Top(0) -> Pulse 1. Mid(1) -> Pulse 2. Bot(2) -> Pulse 1 (Momentary).

        let p1State = 0;
        let p2State = 0;

        // Switch Logic
        // If system uses 3-way switch: 0 (Up), 1 (Mid), 2 (Down).
        // Rust: default is Off.
        // Let's implement:
        // Switch Up (0): Pulse 1 High, Pulse 2 Low
        // Switch Mid (1): Pulse 1 Low, Pulse 2 High (Default/Off state in Rust)
        // Switch Down (2): Pulse 1 High, Pulse 2 Low (Momentary?)

        if (p.switch === 0 || p.switch === 2) {
            p1State = 1;
            p2State = 0;
        } else {
            p1State = 0;
            p2State = 1;
        }

        this.gatePulse1.gain.setTargetAtTime(p1State, time, 0.005);
        this.gatePulse2.gain.setTargetAtTime(p2State, time, 0.005);

        // --- 4. LEDs ---
        // 0: Audio 1 (Main Output absolute)
        // 1: Audio 2 (Main Output inverted? Or just copy)
        // 2: CV 1 (X)
        // 3: CV 2 (Y)
        // 4: Pulse 1
        // 5: Pulse 2

        this.updateLEDs(mainVal, xVal, yVal, p1State, p2State);
    }

    updateLEDs(main, x, y, p1, p2) {
        const setLed = (idx, level, color) => {
            const led = document.getElementById(`led-comp-${idx}`);
            if (!led) return;

            // Simple Brightness mapping
            const abs = Math.abs(level);
            if (abs > 0.1) {
                led.classList.add('active');
                led.style.boxShadow = `0 0 ${abs * 10}px ${color}`;
                led.style.opacity = 0.5 + (abs * 0.5);
            } else {
                led.classList.remove('active');
                led.style.boxShadow = 'none';
                led.style.opacity = 0.2;
            }
        };

        // Colors
        // Audio: Blue? Rust says "led_gamma(output_value)".
        // Standard Computer LEDs are single color usually.
        // globals.js doesn't define color, CSS does.
        // Usually Red/Orange.
        // I'll just toggle active class and let CSS handle color, but adjust opacity.

        setLed(0, main, '#4ade80'); // Audio L
        setLed(1, main, '#4ade80'); // Audio R
        setLed(2, x, '#facc15');    // CV 1
        setLed(3, y, '#facc15');    // CV 2
        setLed(4, p1, '#ef4444');   // Pulse 1
        setLed(5, p2, '#ef4444');   // Pulse 2
    }
}

if (window.registerCard) {
    window.registerCard(CardCraftedVolts);
}
