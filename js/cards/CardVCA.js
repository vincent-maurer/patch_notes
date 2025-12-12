class CardVCA extends ComputerCard {
    static meta = {
        id: 'vca',
        name: 'Dual VCA',
        num: '104',
        desc: "Voltage Controlled Amplifier. \nIn: Audio L/R, CV 1/2 \nKnob X: Left Gain \nKnob Y: Right Gain \nMain: CV Depth \nOut: Audio L/R"
    };

    constructor(ctx, io) {
        super(ctx, io);
        this.gainL = ctx.createGain();
        this.gainR = ctx.createGain();
        this.gainL.gain.value = 0;
        this.gainR.gain.value = 0;

        this.cv1Gain = ctx.createGain();
        this.cv2Gain = ctx.createGain();
    }

    mount() {
        this.io.inputL.connect(this.gainL).connect(this.io.outputL);
        this.io.inputR.connect(this.gainR).connect(this.io.outputR);

        this.io.cv1In.connect(this.cv1Gain).connect(this.gainL.gain);
        this.io.cv2In.connect(this.cv2Gain).connect(this.gainR.gain);
    }

    unmount() {
        this.io.inputL.disconnect(); this.io.inputR.disconnect();
        this.gainL.disconnect(); this.gainR.disconnect();
        this.io.cv1In.disconnect(); this.io.cv2In.disconnect();
        this.cv1Gain.disconnect(); this.cv2Gain.disconnect();
    }

    update(p, time) {
        const gainL = p.x;
        const gainR = p.y;

        safeParam(this.gainL.gain, gainL, time);
        safeParam(this.gainR.gain, gainR, time);

        const cvDepth = (p.main - 0.5) * 2;
        this.cv1Gain.gain.setTargetAtTime(cvDepth, time, 0.05);
        this.cv2Gain.gain.setTargetAtTime(cvDepth, time, 0.05);
    }
}

// --- REGISTER CARD ---
if (registerCard) {
    registerCard(CardVCA);
}