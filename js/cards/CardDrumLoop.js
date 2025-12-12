class CardDrumLoop extends ComputerCard {
    static meta = {
        id: 'drums',
        name: 'DrumLoop',
        num: '106',
        desc: "Drum Loop Generator. \nIn: Pulse 1 (Clock) \nKnob X: Select Pattern \nKnob Y: Clock Speed \nOut: Left (Kick), Right (Snare)"
    };

    constructor(ctx, io) {
        super(ctx, io);
        // Kick
        this.kickOsc = ctx.createOscillator();
        this.kickOsc.start();
        this.kickGain = ctx.createGain();
        this.kickGain.gain.value = 0;
        this.kickOsc.connect(this.kickGain);

        // Snare/Noise
        const bSize = ctx.sampleRate * 2;
        const b = ctx.createBuffer(1, bSize, ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < bSize; i++) d[i] = Math.random() * 2 - 1;
        
        this.noise = ctx.createBufferSource();
        this.noise.buffer = b;
        this.noise.loop = true;
        this.noise.start();
        this.snareGain = ctx.createGain();
        this.snareGain.gain.value = 0;
        this.noise.connect(this.snareGain);

        this.stepCounter = 0;
        this.lastPulseTime = 0;
        this.clockSensor = ctx.createAnalyser();
        this.clockSensor.fftSize = 32;
        this.clockData = new Uint8Array(32);
        this.lastClockState = false;
    }

    mount() {
        this.kickGain.connect(this.io.outputL);
        this.snareGain.connect(this.io.outputR);
        this.io.pulse1In.connect(this.clockSensor);
    }

    unmount() {
        this.kickOsc.stop(); this.noise.stop();
        this.kickGain.disconnect(); this.snareGain.disconnect();
        this.io.pulse1In.disconnect();
    }

    update(p, time) {
        this.clockSensor.getByteTimeDomainData(this.clockData);
        const isHigh = this.clockData[0] > 140;
        let trigger = false;

        if (isHigh && !this.lastClockState) trigger = true;
        this.lastClockState = isHigh;

        const speed = 0.1 + (1.0 - p.y) * 0.5;
        if (time - this.lastPulseTime > speed && this.clockData[0] < 130 && this.clockData[0] > 120) {
            trigger = true;
            this.lastPulseTime = time;
        }

        if (trigger) {
            this.stepCounter++;
            const patternIdx = Math.floor(p.x * 3.99);
            const patterns = [
                [1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0], // Basic
                [1, 0, 2, 0, 1, 0, 2, 0, 1, 1, 2, 0, 1, 0, 2, 2], // Techno
                [1, 0, 0, 1, 2, 0, 1, 0, 1, 0, 0, 0, 2, 1, 0, 0], // Break
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]  // Roll
            ];

            const pat = patterns[patternIdx] || patterns[0];
            const step = pat[this.stepCounter % 16];

            if (step & 1) this.triggerKick(time);
            if (step & 2) this.triggerSnare(time);
        }
    }

    triggerKick(time) {
        this.kickOsc.frequency.setValueAtTime(150, time);
        this.kickOsc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        this.kickGain.gain.setValueAtTime(1, time);
        this.kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    }

    triggerSnare(time) {
        this.snareGain.gain.setValueAtTime(0.8, time);
        this.snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    }
}

// --- REGISTER CARD ---
if (registerCard) {
    registerCard(CardDrumLoop);
}