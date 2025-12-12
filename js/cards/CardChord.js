class CardChord extends ComputerCard {
    static meta = {
        id: 'chord',
        name: 'Chord Organ',
        num: '101',
        desc: "3-Voice Chord Synth. \nIn: CV 1 (Filter Freq) \nKnob X: Root Note \nKnob Y: Chord Shape \nMain: Filter Cutoff \nOut: Audio L/R, CV 1 (Root)"
    };

    constructor(ctx, io) {
        super(ctx, io);
        this.osc1 = ctx.createOscillator(); this.osc1.type = 'sawtooth';
        this.osc2 = ctx.createOscillator(); this.osc2.type = 'sawtooth';
        this.osc3 = ctx.createOscillator(); this.osc3.type = 'square';

        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 2000;

        this.gain = ctx.createGain();
        this.gain.gain.value = 0.15;

        this.chords = [
            [0, 4, 7],     // Major
            [0, 3, 7],     // Minor
            [0, 4, 7, 11], // Maj7
            [0, 3, 7, 10], // Min7
            [0, 5, 7],     // Sus4
            [0, 7, 12],    // Power
            [0, 0, 0]      // Unison
        ];
    }

    mount() {
        this.osc1.start(); this.osc2.start(); this.osc3.start();

        this.osc1.connect(this.filter);
        this.osc2.connect(this.filter);
        this.osc3.connect(this.filter);

        this.filter.connect(this.gain);
        this.gain.connect(this.io.outputL);
        this.gain.connect(this.io.outputR);

        this.cvGain = this.ctx.createGain();
        this.cvGain.gain.value = 2000;
        this.io.cv1In.connect(this.cvGain);
        this.cvGain.connect(this.filter.frequency);
    }

    unmount() {
        this.osc1.stop(); this.osc2.stop(); this.osc3.stop();
        this.osc1.disconnect(); this.osc2.disconnect(); this.osc3.disconnect();
        this.filter.disconnect(); this.gain.disconnect();
        this.io.cv1In.disconnect(this.cvGain);
    }

    update(p, time) {
        const midiRoot = 36 + Math.floor(p.x * 36);
        const chordIdx = Math.floor(p.y * (this.chords.length - 0.01));
        const shape = this.chords[chordIdx] || this.chords[0];

        const f1 = 440 * Math.pow(2, (midiRoot + shape[0] - 69) / 12);
        const f2 = 440 * Math.pow(2, (midiRoot + shape[1] - 69) / 12);
        const f3 = 440 * Math.pow(2, (midiRoot + shape[2] - 69) / 12);

        safeParam(this.osc1.frequency, f1, time);
        safeParam(this.osc2.frequency, f2, time);
        safeParam(this.osc3.frequency, f3, time);

        const cutoff = 100 + (p.main * 7900);
        safeParam(this.filter.frequency, cutoff, time);

        safeParam(this.io.cv1Out.offset, p.x, time);
    }
}
// --- REGISTER CARD ---
if (registerCard) {
    registerCard(CardChord);
}