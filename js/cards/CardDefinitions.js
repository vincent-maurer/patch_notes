// =========================================================================
// METADATA LIBRARY FOR ALL WORKSHOP SYSTEM CARDS
// Source: https://github.com/TomWhitwell/Workshop_Computer/tree/main/releases
// =========================================================================

const CARD_LIBRARY = [
    {
        id: 'midi',
        name: 'Simple MIDI',
        num: '00',
        desc: "Takes USB midi, sends it to pulse and CV outputs, also sends knob positions and CV inputs back to the computer as CC values.",
        class: 'CardNoOp',
        category: 'Utility'
    },
    {
        id: 'turing',
        name: 'Turing Machine',
        num: '03',
        desc: "Turing Machine with tap tempo clock, 2 x pulse outputs, 4 x CV outputs.",
        class: 'CardNoOp',
        category: 'Sequencer'
    },
    {
        id: 'benjolin',
        name: 'BYO Benjolin',
        num: '04',
        desc: "Rungler, Chaotic VCO, Noise Source, Turing Machine, Quantizer.",
        class: 'CardNoOp',
        category: 'Voice'
    },
    {
        id: 'chord_blimey',
        name: 'Chord Blimey',
        num: '05',
        desc: "Generates CV/Pulse arpeggios.",
        class: 'CardNoOp',
        category: 'Sequencer'
    },
    {
        id: 'usb_audio',
        name: 'USB Audio',
        num: '06',
        desc: "USB audio output.",
        class: 'CardNoOp',
        category: 'Utility'
    },
    {
        id: 'bumpers',
        name: 'Bumpers',
        num: '07',
        desc: "'Bouncing ball' style delay and trigger generators.",
        class: 'CardNoOp',
        category: 'Modulation'
    },
    {
        id: 'bytebeat',
        name: 'Bytebeat',
        num: '08',
        desc: "Generates and mangles bytebeats.",
        class: 'CardNoOp',
        category: 'Voice'
    },
    {
        id: 'twists',
        name: 'Twists',
        num: '10',
        desc: "A port of Mutable Instruments Braids with a web editor.",
        class: 'CardNoOp',
        category: 'Voice'
    },
    {
        id: 'goldfish',
        name: 'Goldfish',
        num: '11',
        desc: "Weird delay/looper for audio and CV.",
        class: 'CardNoOp',
        category: 'Audio'
    },
    {
        id: 'am_coupler',
        name: 'AM Coupler',
        num: '12',
        desc: "AM radio transmitter / coupler.",
        class: 'CardNoOp',
        category: 'Utility'
    },
    {
        id: 'noisebox',
        name: 'Noisebox',
        num: '13',
        desc: "Noise Box.",
        class: 'CardNoOp',
        category: 'Voice'
    },
    {
        id: 'cvmod',
        name: 'CVMod',
        num: '14',
        desc: "Quad CV delay inspired by Make Noise Multimod.",
        class: 'CardNoOp',
        category: 'Modulation'
    },
    {
        id: 'reverb',
        name: 'Reverb+',
        num: '20',
        desc: "Reverb effect, plus pulse/CV generators and MIDI-to-CV, configurable using web interface.",
        class: 'CardNoOp',
        category: 'Audio'
    },
    {
        id: 'sheep',
        name: 'Sheep',
        num: '22',
        desc: "A time-stretching and pitch-shifting granular processor and digital degradation playground with 2 fidelity options.",
        class: 'CardNoOp',
        category: 'Audio'
    },
    {
        id: 'slowmod',
        name: 'SlowMod',
        num: '23',
        desc: "Chaotic quad-LFO with VCAs.",
        class: 'CardNoOp',
        category: 'Modulation'
    },
    {
        id: 'crafted_volts',
        name: 'Crafted Volts',
        num: '24',
        desc: "Manually set control voltages (CV) with the input knobs and switch. It also attenuverts incoming voltages.",
        class: 'CardNoOp',
        category: 'Utility'
    },
    {
        id: 'utility',
        name: 'Utility Pair',
        num: '25',
        desc: "25 small utilities, which can be combined in pairs.",
        class: 'CardNoOp',
        category: 'Utility'
    },
    {
        id: 'eighties_bass',
        name: 'Eighties Bass',
        num: '28',
        desc: "Bass-oriented complete monosynth voice consisting of five detuned saw wave oscillators with mixable white noise.",
        class: 'CardNoOp',
        category: 'Voice'
    },
    {
        id: 'cirpy',
        name: 'Cirpy Wavetable',
        num: '30',
        desc: "Wavetable oscillator using wavetables from Plaits, Braids, and Microwave.",
        class: 'CardNoOp',
        category: 'Voice'
    },
    {
        id: 'esp',
        name: 'ESP',
        num: '31',
        desc: "A MS-20-style External Signal Processor that includes a preamp, bandpass filter, envelope follower, gate, and 1v/oct pitch outs.",
        class: 'CardNoOp',
        category: 'Utility'
    },
    {
        id: 'vink',
        name: 'Vink',
        num: '32',
        desc: "Dual delay loops with sigmoid saturation for Jaap Vink / Roland Kayn style feedback patching.",
        class: 'CardNoOp',
        category: 'Audio'
    },
    {
        id: 'compulidean',
        name: 'Compulidean',
        num: '37',
        desc: "Generative Euclidean drum + sample player.",
        class: 'CardNoOp',
        category: 'Voice'
    },
    {
        id: 'od',
        name: 'OD (Chaos)',
        num: '38',
        desc: "Loopable chaotic Lorenz attractor trajectories and zero-crossings as CV and pulses, with sensitivity to initial conditions.",
        class: 'CardNoOp',
        category: 'Modulation'
    },
    {
        id: 'blackbird',
        name: 'Blackbird',
        num: '41',
        desc: "A scriptable, live-codable, USB-serial-to-CV device implementing monome crow's protocol.",
        class: 'CardNoOp',
        category: 'Utility'
    },
    {
        id: 'rain',
        name: 'Backyard Rain',
        num: '42',
        desc: "Nature soundscape audio. A cozy rain ambience mix for background listening. You control the intensity.",
        class: 'CardNoOp',
        category: 'Audio'
    },
    {
        id: 'nzt',
        name: 'NZT',
        num: '47',
        desc: "Grain Noise and Noise Tools.",
        class: 'CardNoOp',
        category: 'Voice'
    },
    {
        id: 'glitter',
        name: 'Glitter',
        num: '53',
        desc: "Granular Looping Sampler.",
        class: 'CardNoOp',
        category: 'Audio'
    },
    {
        id: 'fifths',
        name: 'Fifths',
        num: '55',
        desc: "A quantizer/sequencer that can create harmony and nimbly traverse the circle of fifths in attempts to make jazz.",
        class: 'CardNoOp',
        category: 'Sequencer'
    },
    {
        id: 'placeholder',
        name: 'Secret Project',
        num: '77',
        desc: "Reserved for secret project.",
        class: 'CardNoOp',
        category: 'Other'
    },
    {
        id: 'talker',
        name: 'Talker',
        num: '78',
        desc: "Proof of concept speech synthesizer, based on TalkiePCM, inspired by 1970s LPC speech synths.",
        class: 'CardNoOp',
        category: 'Voice'
    },
    {
        id: 'blank',
        name: 'Blank',
        num: '88',
        desc: "Reserved for blank 88 cards.",
        class: 'CardNoOp',
        category: 'Other'
    },
    {
        id: 'toolbox',
        name: 'Toolbox',
        num: '99',
        desc: "Mixer, VCA, noise, S&H, clock generator, etc.",
        class: 'CardNoOp',
        category: 'Utility'
    },
    {
        id: 'none',
        name: 'No Card',
        num: '--',
        desc: "Slot Empty.",
        class: 'CardNoOp',
        category: 'Other'
    }
];

if (typeof window !== 'undefined') {
    window.CARD_LIBRARY = CARD_LIBRARY;
}