class CardMIDI extends ComputerCard {
    static meta = {
        id: 'midi',
        name: 'Simple MIDI',
        num: '00',
        desc: "USB MIDI to CV Interface. \nConnect USB to send MIDI. \nOut: CV 1 (Pitch), Pulse 1 (Gate), CV 2 (Vel), Pulse 2 (Clock)"
    };

    constructor(ctx, io) {
        super(ctx, io);
        // MIDI Out Analysis (Patch -> USB)
        this.gateInAnalyser = ctx.createAnalyser();
        this.gateInAnalyser.fftSize = 32;
        this.gateInData = new Float32Array(1);

        this.cvInAnalyser = ctx.createAnalyser(); // For Pitch
        this.cvInAnalyser.fftSize = 32;
        this.cvInData = new Float32Array(1);

        // CC Inputs
        this.cv2InAnalyser = ctx.createAnalyser(); // CC 1
        this.cv2InAnalyser.fftSize = 32;
        this.cv2InData = new Float32Array(1);

        this.pulse2InAnalyser = ctx.createAnalyser(); // CC 74
        this.pulse2InAnalyser.fftSize = 32;
        this.pulse2InData = new Float32Array(1);

        this.lastGateIn = false;
        this.lastNote = 60;
        this.lastCC1 = 0;
        this.lastCC74 = 0;
    }

    mount() {
        if (audioNodes) {
            // MIDI IN Connections (USB -> Synth)
            if (audioNodes['Midi_Pitch']) audioNodes['Midi_Pitch'].connect(this.io.cv1Out);
            if (audioNodes['Midi_Gate']) audioNodes['Midi_Gate'].connect(this.io.pulse1Out);
            if (audioNodes['Midi_Velocity']) audioNodes['Midi_Velocity'].connect(this.io.cv2Out);
            if (audioNodes['Midi_Clock']) audioNodes['Midi_Clock'].connect(this.io.pulse2Out);
        }

        // MIDI OUT Connections (Synth -> USB)
        this.io.pulse1In.connect(this.gateInAnalyser);
        this.io.cv1In.connect(this.cvInAnalyser);
        this.io.cv2In.connect(this.cv2InAnalyser);
        this.io.pulse2In.connect(this.pulse2InAnalyser);

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

        try { this.io.pulse1In.disconnect(this.gateInAnalyser); } catch (e) { }
        try { this.io.cv1In.disconnect(this.cvInAnalyser); } catch (e) { }
        try { this.io.cv2In.disconnect(this.cv2InAnalyser); } catch (e) { }
        try { this.io.pulse2In.disconnect(this.pulse2InAnalyser); } catch (e) { }

        this.io.inputL.disconnect();
        this.io.inputR.disconnect();
    }

    update(p, time) {
        // MIDI Out Logic (Bottom Inputs)
        this.gateInAnalyser.getFloatTimeDomainData(this.gateInData);
        const gateInHigh = this.gateInData[0] > 0.5;

        // Trigger Handling
        if (gateInHigh && !this.lastGateIn) {
            // Rising Edge -> Note On
            this.cvInAnalyser.getFloatTimeDomainData(this.cvInData);
            const cvVal = this.cvInData[0];
            const note = Math.round(60 + (cvVal * 12));

            if (typeof sendMidiMessage === 'function') sendMidiMessage(144, note, 100);
            this.lastNote = note;
        }
        else if (!gateInHigh && this.lastGateIn) {
            // Falling Edge -> Note Off
            if (typeof sendMidiMessage === 'function') sendMidiMessage(128, this.lastNote, 0);
        }

        this.lastGateIn = gateInHigh;

        // --- CC OUTPUT ---
        // CV 2 In -> CC 1 (Mod Wheel)
        this.cv2InAnalyser.getFloatTimeDomainData(this.cv2InData);
        let val1 = Math.max(0, Math.min(1, this.cv2InData[0])); // Clamp 0-1
        let cc1 = Math.floor(val1 * 127);
        if (Math.abs(cc1 - this.lastCC1) >= 1) { // Change detection
            if (typeof sendMidiMessage === 'function') sendMidiMessage(176, 1, cc1);
            this.lastCC1 = cc1;
        }

        // Pulse 2 In -> CC 74 (Brightness)
        this.pulse2InAnalyser.getFloatTimeDomainData(this.pulse2InData);
        let val2 = Math.max(0, Math.min(1, this.pulse2InData[0]));
        let cc74 = Math.floor(val2 * 127);
        if (Math.abs(cc74 - this.lastCC74) >= 1) {
            if (typeof sendMidiMessage === 'function') sendMidiMessage(176, 74, cc74);
            this.lastCC74 = cc74;
        }
    }
}

// --- REGISTER CARD ---
if (registerCard) {
    registerCard(CardMIDI);
}