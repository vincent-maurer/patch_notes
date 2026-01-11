class CardToolbox extends ComputerCard {
    static meta = {
        id: 'toolbox',
        name: 'Toolbox',
        num: '99',
        desc: "Mixer, VCA, Noise, S&H, Clock.\nSwitch Up: Ring Mod (A*B*C*D)\nSwitch Down: Mixer (AB + CD)\nOut: Mix, Noise, CV Mix, S&H, Clock, Logic\nAudio 2/Right is Noise-Decimation control."
    };

    constructor(ctx, io) {
        super(ctx, io);
        if (!ctx) return;

        try {
            this.worklet = new AudioWorkletNode(ctx, 'toolbox-processor', {
                numberOfInputs: 6,
                numberOfOutputs: 6,
                outputChannelCount: [1, 1, 1, 1, 1, 1],
                parameterData: {
                    main: 0.5,
                    x: 0,
                    y: 0,
                    mode: 0,
                    connectedP1: 0,
                    connectedCV1: 0
                }
            });
        } catch (e) {
            console.error("Toolbox Worklet Error:", e);
            return;
        }

        this.worklet.port.onmessage = (e) => {
            this.updateLEDs(e.data);
        };

        // Params
        this.pMain = this.worklet.parameters.get('main');
        this.pX = this.worklet.parameters.get('x');
        this.pY = this.worklet.parameters.get('y');
        this.pMode = this.worklet.parameters.get('mode');
        this.pConnP1 = this.worklet.parameters.get('connectedP1');
        this.pConnCV1 = this.worklet.parameters.get('connectedCV1');
    }

    mount() {
        super.mount();
        if (!this.worklet) return;

        // IO Mapping
        // Inputs: 0:A1, 1:A2, 2:CV1, 3:CV2, 4:P1, 5:P2
        this.io.inputL.connect(this.worklet, 0, 0);
        this.io.inputR.connect(this.worklet, 0, 1);
        this.io.cv1In.connect(this.worklet, 0, 2);
        this.io.cv2In.connect(this.worklet, 0, 3);
        this.io.pulse1In.connect(this.worklet, 0, 4);
        this.io.pulse2In.connect(this.worklet, 0, 5);

        // Outputs
        // 0:A1(Mix), 1:A2(Noise), 2:CV1, 3:CV2(S&H), 4:P1, 5:P2
        this.worklet.connect(this.io.outputL, 0);
        this.worklet.connect(this.io.outputR, 1);
        this.worklet.connect(this.io.cv1Out, 2);
        this.worklet.connect(this.io.cv2Out, 3);
        this.worklet.connect(this.io.pulse1Out, 4);
        this.worklet.connect(this.io.pulse2Out, 5);
    }

    unmount() {
        super.unmount();
        if (!this.worklet) return;

        this.worklet.disconnect();
        // Disconnect inputs
        this.io.inputL.disconnect(this.worklet, 0, 0);
        this.io.inputR.disconnect(this.worklet, 0, 1);
        this.io.cv1In.disconnect(this.worklet, 0, 2);
        this.io.cv2In.disconnect(this.worklet, 0, 3);
        this.io.pulse1In.disconnect(this.worklet, 0, 4);
        this.io.pulse2In.disconnect(this.worklet, 0, 5);
    }

    // Helper to check connection
    isPlugged(jackId) {
        if (typeof cableData === 'undefined') return false;
        return cableData.some(c => c.start === jackId || c.end === jackId);
    }

    update(p, time) {
        if (!this.worklet) return;

        this.pMain.setTargetAtTime(p.main, time, 0.02);
        // Swap X and Y to match docs (Panel X = Tempo/LogicY, Panel Y = VCA/LogicX)
        // Logic X (VCA) gets Physical Y
        this.pX.setTargetAtTime(p.y, time, 0.02);
        // Logic Y (Tempo) gets Physical X
        this.pY.setTargetAtTime(p.x, time, 0.02);

        // Map Switch:
        // p.switch is typically 0, 1, 2. But varies by implementation. 
        // 3-way switch: 0 (Up), 1 (Mid), 2 (Down).
        // Let's pass it directly.
        // Actually, toolbox.cpp says Down -> noiseType++.
        // We'll trust p.switch logic is 0=Up, 1=Mid, 2=Down.
        this.pMode.setValueAtTime(p.switch, time);

        // Check Connections
        const p1Plugged = this.isPlugged('jack-pulse1in');
        const cv1Plugged = this.isPlugged('jack-cv1in');

        // Update Params
        this.pConnP1.setValueAtTime(p1Plugged ? 1 : 0, time);
        this.pConnCV1.setValueAtTime(cv1Plugged ? 1 : 0, time);
    }

    updateLEDs(data) {
        const set = (i, val, color) => {
            const led = document.getElementById(`led-comp-${i}`);
            if (!led) return;
            if (val > 0.05) {
                led.classList.add('active');
                led.style.boxShadow = `0 0 ${val * 10}px ${color}`;
                led.style.opacity = 0.4 + (val * 0.6);
            } else {
                led.classList.remove('active');
                led.style.boxShadow = '';
                led.style.opacity = 0.2;
            }
        };

        // 0: Audio 1 (Mix) - Green
        set(0, data.audio1, '#4ade80');
        // 1: Audio 2 (Noise) - White/Blue
        set(1, data.audio2, '#60a5fa');
        // 2: CV 1 - Yellow
        set(2, data.cv1, '#facc15');
        // 3: CV 2 (S&H) - Yellow
        set(3, data.cv2, '#facc15');
        // 4: Pulse 1 - Red
        set(4, data.p1, '#ef4444');
        // 5: Pulse 2 - Red
        set(5, data.p2, '#ef4444');
    }
}

if (window.registerCard) {
    window.registerCard(CardToolbox);
}
