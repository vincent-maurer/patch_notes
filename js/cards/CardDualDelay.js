class CardDualDelay extends ComputerCard {
    static meta = {
        id: 'delay',
        name: 'Dual Delay',
        num: '103',
        desc: "Two separate delay lines. \nIn: Audio L/R, CV 1 (Left Time), CV 2 (Right Time) \nKnob X: Left Time \nKnob Y: Right Time \nMain: Feedback Amount \nOut: Audio L/R"
    };

    constructor(ctx, io) {
        super(ctx, io);
        // Left Channel
        this.delayL = ctx.createDelay(5.0);
        this.feedbackL = ctx.createGain();

        // Right Channel
        this.delayR = ctx.createDelay(5.0);
        this.feedbackR = ctx.createGain();

        // CV Mod Gains
        this.cv1Gain = ctx.createGain();
        this.cv2Gain = ctx.createGain();
    }

    mount() {
        // Left Path
        this.io.inputL.connect(this.delayL).connect(this.io.outputL);
        this.delayL.connect(this.feedbackL).connect(this.delayL);

        // Right Path
        this.io.inputR.connect(this.delayR).connect(this.io.outputR);
        this.delayR.connect(this.feedbackR).connect(this.delayR);

        // CV Control
        this.io.cv1In.connect(this.cv1Gain).connect(this.delayL.delayTime);
        this.cv1Gain.gain.value = 0.5;

        this.io.cv2In.connect(this.cv2Gain).connect(this.delayR.delayTime);
        this.cv2Gain.gain.value = 0.5;
    }

    unmount() {
        this.io.inputL.disconnect(this.delayL);
        this.io.inputR.disconnect(this.delayR);
        this.delayL.disconnect(); this.feedbackL.disconnect();
        this.delayR.disconnect(); this.feedbackR.disconnect();
        this.io.cv1In.disconnect(this.cv1Gain);
        this.io.cv2In.disconnect(this.cv2Gain);
        this.cv1Gain.disconnect();
        this.cv2Gain.disconnect();
    }

    update(p, time) {
        const timeL = 0.01 + (p.x * 0.99);
        safeParam(this.delayL.delayTime, timeL, time);

        const timeR = 0.01 + (p.y * 0.99);
        safeParam(this.delayR.delayTime, timeR, time);

        const fb = p.main * 0.95;
        safeParam(this.feedbackL.gain, fb, time);
        safeParam(this.feedbackR.gain, fb, time);
    }
}

// --- REGISTER CARD ---
if (registerCard) {
    registerCard(CardDualDelay);
}