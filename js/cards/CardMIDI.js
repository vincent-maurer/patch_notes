class CardMIDI extends ComputerCard {
    static meta = {
        id: 'midi',
        name: 'Simple MIDI',
        num: '00',
        desc: "USB MIDI to CV Interface. \nConnect USB to send MIDI. \nOut: CV 1 (Pitch), Pulse 1 (Gate), CV 2 (Vel), Pulse 2 (Clock)"
    };

    constructor(ctx, io) {
        super(ctx, io);
        // Visualizer for Gate
        this.gateAnalyser = ctx.createAnalyser();
        this.gateAnalyser.fftSize = 32;
        this.gateData = new Float32Array(1);
    }

    mount() {
        if (audioNodes) {
            if (audioNodes['Midi_Pitch']) audioNodes['Midi_Pitch'].connect(this.io.cv1Out);
            if (audioNodes['Midi_Gate']) audioNodes['Midi_Gate'].connect(this.io.pulse1Out);
            if (audioNodes['Midi_Velocity']) audioNodes['Midi_Velocity'].connect(this.io.cv2Out);
            if (audioNodes['Midi_Clock']) audioNodes['Midi_Clock'].connect(this.io.pulse2Out);
        }

        // Connect visualizer
        this.io.pulse1Out.connect(this.gateAnalyser);

        // Passthrough Audio
        this.io.inputL.connect(this.io.outputL);
        this.io.inputR.connect(this.io.outputR);
    }

    unmount() {
        if (audioNodes) {
            try {
                if (audioNodes['Midi_Pitch']) audioNodes['Midi_Pitch'].disconnect(this.io.cv1Out);
                if (audioNodes['Midi_Gate']) audioNodes['Midi_Gate'].disconnect(this.io.pulse1Out);
                if (audioNodes['Midi_Velocity']) audioNodes['Midi_Velocity'].disconnect(this.io.cv2Out);
                if (audioNodes['Midi_Clock']) audioNodes['Midi_Clock'].disconnect(this.io.pulse2Out);
            } catch (e) { }
        }

        try { this.io.pulse1Out.disconnect(this.gateAnalyser); } catch (e) { }

        // Reset LED
        const jack = document.getElementById('jack-pulse1out');
        if (jack) jack.style.backgroundColor = '';

        this.io.inputL.disconnect();
        this.io.inputR.disconnect();
    }

    update(p, time) {
        // Visual Update for Gate
        this.gateAnalyser.getFloatTimeDomainData(this.gateData);
        const isHigh = this.gateData[0] > 0.5;
        const jack = document.getElementById('jack-pulse1out');

        if (jack) {
            jack.style.backgroundColor = isHigh ? '#ffff00' : '';
        }
    }
}

// --- REGISTER CARD ---
if (registerCard) {
    registerCard(CardMIDI);
}