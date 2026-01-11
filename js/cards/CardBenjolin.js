class CardBenjolin extends ComputerCard {
    static meta = {
        id: 'benjolin',
        name: 'BYO Benjolin',
        num: '04',
        desc: "Rungler, Chaotic VCO, Noise Source, Turing Machine, Quantizer. \nIn: Pulse 1 (Clk Fwd), Pulse 2 (Clk Back), Audio 1 (Data), Audio 2 (Prob Mod), CV 1 (Offset), CV 2 (VCA) \nKnob X: Offset \nKnob Y: VCA \nMain: Probability (Noon=Rnd, CW=Lock, CCW=Flip) \nOut: Audio 1/2 (Rungler), CV 1/2 (Pitch), Pulse 1/2 (Bit 2/5)"
    };

    constructor(ctx, io) {
        super(ctx, io);

        if (!ctx) return;

        // --- AUDIO WORKLET ---
        try {
            this.worklet = new AudioWorkletNode(ctx, 'benjolin-processor', {
                numberOfInputs: 6,
                numberOfOutputs: 6,
                outputChannelCount: [1, 1, 1, 1, 1, 1]
            });
        } catch (e) {
            console.error("Benjolin Worklet failed:", e);
            return;
        }

        // --- PORTS ---
        this.worklet.port.onmessage = (e) => {
            if (e.data.bits) {
                this.updateVisuals(e.data.bits);
            }
        };

        // --- PARAMS ---
        this.pMain = this.worklet.parameters.get('knobMain');
        this.pX = this.worklet.parameters.get('knobX');
        this.pY = this.worklet.parameters.get('knobY');
        this.pSw = this.worklet.parameters.get('switchState');
    }

    mount() {
        if (!this.ctx || !this.io || !this.worklet) return;

        // --- INPUTS ---
        // 0: Clk Fwd, 1: Clk Back, 2: Data, 3: Prob, 4: Off, 5: VCA
        this.io.pulse1In.connect(this.worklet, 0, 0);
        this.io.pulse2In.connect(this.worklet, 0, 1);
        this.io.inputL.connect(this.worklet, 0, 2);
        this.io.inputR.connect(this.worklet, 0, 3);
        this.io.cv1In.connect(this.worklet, 0, 4);
        this.io.cv2In.connect(this.worklet, 0, 5);

        // --- OUTPUTS ---
        // 0: R1, 1: R2, 2: CV1, 3: CV2, 4: P1, 5: P2
        this.worklet.connect(this.io.outputL, 0);
        this.worklet.connect(this.io.outputR, 1);
        this.worklet.connect(this.io.cv1Out, 2);
        this.worklet.connect(this.io.cv2Out, 3);
        this.worklet.connect(this.io.pulse1Out, 4);
        this.worklet.connect(this.io.pulse2Out, 5);
    }

    unmount() {
        if (!this.ctx || !this.worklet) return;

        this.worklet.disconnect();

        if (this.io) {
            this.io.pulse1In.disconnect(this.worklet, 0, 0);
            this.io.pulse2In.disconnect(this.worklet, 0, 1);
            this.io.inputL.disconnect(this.worklet, 0, 2);
            this.io.inputR.disconnect(this.worklet, 0, 3);
            this.io.cv1In.disconnect(this.worklet, 0, 4);
            this.io.cv2In.disconnect(this.worklet, 0, 5);
        }
    }

    update(p, time) {
        if (!this.worklet) return;

        // Map UI knobs to Worklet Parameters
        // Smooth transitions to avoid zipper noise? safeParam handles it
        // But safeParam works on AudioParams.

        // p.main, p.x, p.y are 0..1
        // p.switch is 0, 1, 2

        // Use setTargetAtTime for smoothing
        this.pMain.setTargetAtTime(p.main, time, 0.05);
        this.pX.setTargetAtTime(p.x, time, 0.05);
        this.pY.setTargetAtTime(p.y, time, 0.05);
        this.pSw.setValueAtTime(Math.round(p.switch), time);
    }

    updateVisuals(bits) {
        // Bits is Int32Array(6) passed from worklet
        const ledMap = [0, 2, 4, 1, 3, 5];
        for (let i = 0; i < 6; i++) {
            const val = (bits[i] & 0x3) / 3.0; // 0..3 -> 0..1
            this.setLed(ledMap[i], val);
        }
    }

    setLed(index, brightness) {
        const led = document.getElementById(`led-comp-${index}`);
        if (!led) return;

        if (brightness > 0.1) {
            led.classList.add('active');
            led.style.backgroundColor = `rgba(239, 68, 68, ${brightness})`;
            led.style.boxShadow = `0 0 ${10 * brightness}px rgba(239, 68, 68, ${brightness})`;
        } else {
            led.classList.remove('active');
            led.style.backgroundColor = '';
            led.style.boxShadow = '';
        }
    }
}

if (window.registerCard) {
    window.registerCard(CardBenjolin);
}
