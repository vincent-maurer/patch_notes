class CardEuclidean extends ComputerCard {
    static meta = {
        id: 'euclid',
        name: 'Euclidean Circles',
        num: '105',
        desc: "Polyrhythmic Pulse Generator. \nKnob X: Steps (1-16) \nKnob Y: Pulses (Density) \nMain: Clock Speed \nOut: Pulse 1 (Hit), Pulse 2 (Inv), CV 1 (Progress)"
    };

    constructor(ctx, io) {
        super(ctx, io);
        this.steps = 16;
        this.pulses = 4;
        this.stepCounter = 0;
        this.lastPulseTime = 0;

        this.trig = ctx.createConstantSource(); this.trig.start();
        this.invTrig = ctx.createConstantSource(); this.invTrig.start();
    }

    mount() {
        this.trig.connect(this.io.pulse1Out);
        this.invTrig.connect(this.io.pulse2Out);
        
        this.ramp = this.ctx.createConstantSource(); this.ramp.start();
        this.ramp.connect(this.io.cv1Out);
    }

    unmount() {
        this.trig.disconnect(); this.invTrig.disconnect(); this.ramp.disconnect();
    }

    update(p, time) {
        this.steps = 1 + Math.floor(p.x * 15);
        this.pulses = Math.round(p.y * this.steps);
        const interval = 0.8 - (p.main * 0.7);

        if (time - this.lastPulseTime > interval) {
            this.lastPulseTime = time;
            this.step(time);
        }
    }

    step(time) {
        this.stepCounter++;
        if (this.stepCounter >= this.steps) this.stepCounter = 0;

        // Euclidean Algo
        const isHit = ((this.stepCounter * this.pulses) % this.steps) < this.pulses;

        if (isHit) {
            this.trig.offset.setValueAtTime(1, time);
            this.trig.offset.setTargetAtTime(0, time + 0.05, 0.05);
        } else {
            this.invTrig.offset.setValueAtTime(1, time);
            this.invTrig.offset.setTargetAtTime(0, time + 0.05, 0.05);
        }

        safeParam(this.ramp.offset, this.stepCounter / this.steps, time);
    }
}

// --- REGISTER CARD ---
if (registerCard) {
    registerCard(CardEuclidean);
}