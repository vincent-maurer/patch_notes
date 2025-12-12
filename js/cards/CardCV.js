class CardCV extends ComputerCard {
    static meta = {
        id: 'cv',
        name: 'Dual CV & LFO',
        num: '102',
        desc: "CV Generator & LFO. \nKnob X: CV 1 Voltage \nKnob Y: CV 2 Voltage \nMain: LFO Rate \nSwitch: LFO Shape \nOut: CV 1, CV 2, Audio L/R (LFO)"
    };

    constructor(ctx, io) {
        super(ctx, io);
        this.cv1 = ctx.createConstantSource(); this.cv1.start();
        this.cv2 = ctx.createConstantSource(); this.cv2.start();
        this.lfo = ctx.createOscillator(); this.lfo.start();
        this.lfoGain = ctx.createGain();
    }

    mount() {
        this.cv1.connect(this.io.cv1Out);
        this.cv2.connect(this.io.cv2Out);
        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.io.outputL);
        this.lfoGain.connect(this.io.outputR);
    }

    unmount() {
        this.cv1.disconnect(); this.cv2.disconnect();
        this.lfo.disconnect(); this.lfoGain.disconnect();
    }

    update(p, time) {
        safeParam(this.cv1.offset, p.x, time);
        safeParam(this.cv2.offset, p.y, time);

        const freq = 0.1 + (p.main * 20);
        safeParam(this.lfo.frequency, freq, time);

        const types = ['sine', 'triangle', 'sawtooth'];
        this.lfo.type = types[p.switch] || 'sine';
    }
}

// --- REGISTER CARD ---
if (registerCard) {
    registerCard(CardCV);
}