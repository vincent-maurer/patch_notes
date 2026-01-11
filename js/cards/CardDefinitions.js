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
        category: 'Utility',
        labels: {
            'knob-small-x': 'Fine',
            'knob-large-computer': 'Note',
            'switch-3way-computer': 'Calibrate',
            'jack-cv1out': 'Pitch 1',
            'jack-cv2out': 'Pitch 2',
            'jack-pulse1out': 'Gate 1',
            'jack-pulse2out': 'Gate 2'
        }
    },
    {
        id: 'turing',
        name: 'Turing Machine',
        num: '03',
        desc: "Turing Machine with tap tempo clock, 2 x pulse outputs, 4 x CV outputs.",
        class: 'CardNoOp',
        category: 'Sequencer',
        labels: {
            'knob-small-x': 'Length',
            'knob-small-y': 'Diviply',
            'knob-large-computer': 'Prob',
            'switch-3way-computer': 'Scale',
            'jack-cv1out': 'Pitch',
            'jack-cv2out': 'Volt',
            'jack-pulse1out': 'Pulse',
            'jack-pulse2out': 'Clock',
            'jack-pulse1in': 'Clock In',
            'jack-cv1in': 'Diviply',
            'jack-cv2in': 'Offset',
            'jack-audio1in': 'Reset',
            'jack-audio2in': 'Switch'
        }
    },
    {
        id: 'benjolin',
        name: 'BYO Benjolin',
        num: '04',
        desc: "Rungler, Chaotic VCO, Noise Source, Turing Machine, Quantizer.",
        class: 'CardBenjolin',
        category: 'Voice',
        labels: {
            'knob-large-computer': 'Lock',
            'knob-small-x': 'Offset',
            'knob-small-y': 'Chaos VCA',
            'switch-3way-computer': 'Loop/Run/Write',
            'jack-audio1out': 'Raw 1',
            'jack-audio2out': 'Raw 2',
            'jack-cv1out': 'Quant 1',
            'jack-cv2out': 'Quant 2',
            'jack-pulse1out': '1-Bit 1',
            'jack-pulse2out': '1-Bit 2',
            'jack-pulse1in': 'Clk Fwd',
            'jack-pulse2in': 'Clk Back',
            'jack-audio1in': 'Data',
            'jack-audio2in': 'Lock CV',
            'jack-cv1in': 'Offset CV',
            'jack-cv2in': 'VCA CV'
        }
    },
    {
        id: 'chord_blimey',
        name: 'Chord Blimey',
        num: '05',
        desc: "Generates CV/Pulse arpeggios.",
        class: 'CardNoOp',
        category: 'Sequencer',
        labels: {
            'knob-large-computer': 'Speed',
            'knob-small-x': 'Root',
            'knob-small-y': 'Chord',
            'switch-3way-computer': 'Mode',
            'jack-cv1out': 'Arp CV',
            'jack-cv2out': 'Root CV',
            'jack-pulse1out': 'Note Strobe',
            'jack-pulse2out': 'EOC',
            'jack-audio1out': 'Rnd 1',
            'jack-audio2out': 'Rnd 2',
            'jack-pulse1in': 'Trig',
            'jack-cv1in': 'Transp',
            'jack-cv2in': 'Chord CV'
        }
    },
    {
        id: 'usb_audio',
        name: 'USB Audio',
        num: '06',
        desc: "USB audio output.",
        class: 'CardNoOp',
        category: 'Utility',
        labels: {
            'knob-large-computer': 'Volume',
            'jack-audio1out': 'Audio L',
            'jack-audio2out': 'Audio R'
        }
    },
    {
        id: 'bumpers',
        name: 'Bumpers',
        num: '07',
        desc: "'Bouncing ball' style delay and trigger generators.",
        class: 'CardNoOp',
        category: 'Modulation',
        labels: {
            'knob-large-computer': 'Speed',
            'knob-small-x': 'Damping',
            'knob-small-y': 'Gravity',
            'switch-3way-computer': 'Walls',
            'jack-cv1in': 'Exciter',
            'jack-cv2in': 'Damping',
            'jack-audio1out': 'Pos 1',
            'jack-audio2out': 'Pos 2',
            'jack-pulse1out': 'Wall 1',
            'jack-pulse2out': 'Wall 2'
        }
    },
    {
        id: 'bytebeat',
        name: 'Bytebeat',
        num: '08',
        desc: "Generates and mangles bytebeats.",
        class: 'CardNoOp',
        category: 'Voice',
        labels: {
            'knob-large-computer': 'Sample Rate',
            'knob-small-x': 'Bank/Eq',
            'knob-small-y': 'P1',
            'switch-3way-computer': 'Mode/Rst',
            'jack-audio1out': 'Bytebeat',
            'jack-audio2out': 'Next Byte',
            'jack-cv1out': 'Slow Byte',
            'jack-cv2out': 'Fast Byte',
            'jack-pulse1out': 'Bitbeat',
            'jack-pulse2out': 'Clock div',
            'jack-audio1in': 'P1 Mod',
            'jack-audio2in': 'P2 Mod',
            'jack-cv1in': 'Eq Mod',
            'jack-cv2in': 'SR Mod',
            'jack-pulse1in': 'Reset',
            'jack-pulse2in': 'Reverse'
        }
    },
    {
        id: 'twists',
        name: 'Twists',
        num: '10',
        desc: "A port of Mutable Instruments Braids with a web editor.",
        class: 'CardNoOp',
        category: 'Voice',
        labels: {
            'knob-large-computer': 'Pitch',
            'knob-small-x': 'Timbre',
            'knob-small-y': 'Color',
            'switch-3way-computer': 'Shape',
            'jack-cv1in': 'Pitch',
            'jack-pulse1in': 'Trigger',
            'jack-audio1out': 'Out'
        }
    },
    {
        id: 'goldfish',
        name: 'Goldfish',
        num: '11',
        desc: "Weird delay/looper for audio and CV.",
        class: 'CardNoOp',
        category: 'Audio',
        labels: {
            'knob-large-computer': 'Speed',
            'knob-small-x': 'Start L',
            'knob-small-y': 'Start R',
            'switch-3way-computer': 'Mode',
            'jack-pulse1in': 'Trigger',
            'jack-pulse2in': 'Reset',
            'jack-cv1out': 'CV Mix',
            'jack-cv2out': 'Note',
            'jack-pulse1out': 'Pulse 1',
            'jack-pulse2out': 'Pulse 2'
        }
    },
    {
        id: 'am_coupler',
        name: 'AM Coupler',
        num: '12',
        desc: "AM radio transmitter / coupler.",
        class: 'CardNoOp',
        category: 'Utility',
        labels: {
            'knob-large-computer': 'Tune',
            'knob-small-x': 'Fine',
            'knob-small-y': 'Volume',
            'switch-3way-computer': 'RF On/Off',
            'jack-audio1in': 'Mod L',
            'jack-audio2in': 'Mod R'
        }
    },
    {
        id: 'noisebox',
        name: 'Noisebox',
        num: '13',
        desc: "Noise Box.",
        class: 'CardNoOp',
        category: 'Voice',
        labels: {
            'knob-large-computer': 'Algo',
            'knob-small-x': 'Para 1',
            'knob-small-y': 'Para 2',
            'switch-3way-computer': 'Crush',
            'jack-cv1in': 'Algo CV',
            'jack-cv2in': 'VCA',
            'jack-cv1out': 'Noise 1',
            'jack-cv2out': 'Noise 1',
            'jack-cv1in': 'P1 Mod',
            'jack-cv2in': 'P2 Mod',
            'jack-pulse1in': 'S&H',
            'jack-pulse2in': 'Crush Gate'
        }
    },
    {
        id: 'cvmod',
        name: 'CVMod',
        num: '14',
        desc: "Quad CV delay inspired by Make Noise Multimod.",
        class: 'CardNoOp',
        category: 'Modulation',
        labels: {
            'knob-large-computer': 'Speed',
            'knob-small-x': 'Duration',
            'knob-small-y': 'Phase',
            'switch-3way-computer': 'Motion',
            'jack-audio1in': 'CV Rec',
            'jack-cv1out': 'CV 1',
            'jack-cv2out': 'CV 2',
            'jack-audio1out': 'CV 3',
            'jack-audio2out': 'CV 4'
        }
    },
    {
        id: 'reverb',
        name: 'Reverb+',
        num: '20',
        desc: "Reverb effect, plus pulse/CV generators and MIDI-to-CV, configurable using web interface.",
        class: 'CardNoOp',
        category: 'Audio',
        labels: {
            'knob-small-x': 'Decay',
            'knob-small-y': 'Tone',
            'knob-large-computer': 'Mix',
            'switch-3way-computer': 'Freeze',
            'jack-audio1in': 'In L',
            'jack-audio2in': 'In R',
            'jack-audio1out': 'Out L',
            'jack-audio2out': 'Out R'
        }
    },
    {
        id: 'sheep',
        name: 'Sheep',
        num: '22',
        desc: "A time-stretching and pitch-shifting granular processor and digital degradation playground with 2 fidelity options.",
        class: 'CardNoOp',
        category: 'Audio',
        labels: {
            'knob-large-computer': 'Speed/Dir',
            'knob-small-x': 'Spread',
            'knob-small-y': 'Size',
            'switch-3way-computer': 'Mode',
            'jack-cv1in': 'Pos',
            'jack-cv2in': 'Pitch',
            'jack-pulse1in': 'Trig',
            'jack-pulse2in': 'Gate',
            'jack-cv1out': 'Rnd',
            'jack-cv2out': 'LFO',
            'jack-pulse1out': 'Loop End',
            'jack-pulse2out': 'Clock'
        }
    },
    {
        id: 'slowmod',
        name: 'SlowMod',
        num: '23',
        desc: "Chaotic quad-LFO with VCAs.",
        class: 'CardNoOp',
        category: 'Modulation',
        labels: {
            'knob-large-computer': 'Rate',
            'knob-small-x': 'Cross Mod',
            'knob-small-y': 'Crossfade',
            'switch-3way-computer': 'Pause/Rnd',
            'jack-pulse1in': 'Pause',
            'jack-pulse2in': 'Random'
        }
    },
    {
        id: 'crafted_volts',
        name: 'Crafted Volts',
        num: '24',
        desc: "Manually set control voltages (CV) with the input knobs and switch. It also attenuverts incoming voltages.",
        class: 'CardCraftedVolts',
        category: 'Utility',
        labels: {
            'knob-large-computer': 'Main Voltage',
            'knob-small-x': 'X Volt',
            'knob-small-y': 'Y Volt',
            'switch-3way-computer': 'Z gate',
            'jack-cv1in': 'X',
            'jack-cv2in': 'Y',
            'jack-cv1out': 'X',
            'jack-cv2out': 'Y',
            'jack-audio1in': 'Main',
            'jack-audio2in': 'Main',
            'jack-audio1out': 'Main',
            'jack-audio2out': 'Main (inv)',
            'jack-pulse1in': '',
            'jack-pulse2in': '',
            'jack-pulse1out': 'Z',
            'jack-pulse2out': 'Z (inv)'
        }
    },
    {
        id: 'utility_pair',
        name: 'Utility Pair',
        num: '25',
        desc: "25 small utilities, which can be combined in pairs.",
        class: 'CardUtilityPair',
        category: 'Utility',
        labels: {
            'knob-large-computer': 'Knob 1',
            'knob-small-x': 'Knob 2',
            'knob-small-y': 'Knob 3',
            'switch-3way-computer': 'Switch',
            'jack-cv1out': 'Out 1',
            'jack-cv2out': 'Out 2',
            'jack-audio1out': 'Out 3',
            'jack-audio2out': 'Out 4',
            'jack-cv1in': 'In 1',
            'jack-cv2in': 'In 2'
        }
    },
    {
        id: 'eighties_bass',
        name: 'Eighties Bass',
        num: '28',
        desc: "Bass-oriented complete monosynth voice consisting of five detuned saw wave oscillators with mixable white noise.",
        class: 'CardEightiesBass',
        category: 'Voice',
        labels: {
            'knob-large-computer': 'Cutoff',
            'knob-small-x': 'Pitch Offset',
            'knob-small-y': 'Resonance',
            'switch-3way-computer': 'Filter',
            'jack-cv1in': 'Pitch',
            'jack-cv2in': 'Cutoff CV',
            'jack-audio1in': 'Detune',
            'jack-audio2in': 'Noise Mix',
            'jack-audio1out': 'Audio Out',
            'jack-audio2out': 'Audio Out'
        }
    },
    {
        id: 'cirpy',
        name: 'Cirpy Wavetable',
        num: '30',
        desc: "Wavetable oscillator using wavetables from Plaits, Braids, and Microwave.",
        class: 'CardNoOp',
        category: 'Voice',
        labels: {
            'knob-large-computer': 'Pos',
            'knob-small-x': 'LFO Amt',
            'knob-small-y': 'LFO Rate',
            'switch-3way-computer': 'Bank/Quant',
            'jack-cv1in': 'Pitch',
            'jack-cv2in': 'Pos CV',
            'jack-pulse1out': 'Audio L',
            'jack-pulse2out': 'Audio R',
            'jack-cv1out': 'Pos Out',
            'jack-cv2out': 'LFO Out'
        }
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
        category: 'Utility',
        labels: {
            'knob-large-computer': 'Main',
            'knob-small-x': 'X',
            'knob-small-y': 'Y',
            'switch-3way-computer': 'Switch',
            'jack-cv1out': 'Out 1',
            'jack-cv2out': 'Out 2',
            'jack-audio1out': 'Out 3',
            'jack-audio2out': 'Out 4',
            'jack-cv1in': 'In 1',
            'jack-cv2in': 'In 2',
            'jack-pulse1in': 'Pulse 1',
            'jack-pulse2in': 'Pulse 2',
            'jack-pulse1out': 'Pulse 1',
            'jack-pulse2out': 'Pulse 2',
            'jack-audio1in': 'Audio L',
            'jack-audio2in': 'Audio R'
        }
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
        category: 'Voice',
        labels: {
            'knob-large-computer': 'Density',
            'knob-small-x': 'Seed',
            'knob-small-y': 'Gain',
            'jack-audio1out': 'Grain',
            'jack-audio2out': 'Inv Grain',
            'jack-cv1in': 'Dens CV',
            'jack-cv2in': 'Seed CV',
            'jack-pulse1in': 'Reset',
            'jack-audio1in': 'Ring Mod',
            'jack-audio2in': 'Audio In',
            'jack-cv1out': 'Static -6V',
            'jack-cv2out': 'S&H',
            'jack-pulse2out': 'Pulse'
        }
    },
    {
        id: 'glitter',
        name: 'Glitter',
        num: '53',
        desc: "Looping granulator.",
        class: 'CardNoOp',
        category: 'Effect',
        labels: {
            'knob-large-computer': 'Fade',
            'knob-small-x': 'Pitch/Mix',
            'knob-small-y': 'Size',
            'switch-3way-computer': 'Rec/Play',
            'jack-cv1in': 'Repeat',
            'jack-cv2in': 'Sleep',
            'jack-pulse1in': 'Quantize'
        }
    },
    {
        id: 'fifths',
        name: 'Fifths',
        num: '55',
        desc: "A quantizer/sequencer that can create harmony and nimbly traverse the circle of fifths in attempts to make jazz.",
        class: 'CardNoOp',
        category: 'Sequencer',
        labels: {
            'knob-large-computer': 'Key',
            'knob-small-x': 'Loop Len',
            'knob-small-y': 'VCA',
            'jack-cv1in': 'Transp',
            'jack-cv2in': 'Key Mod',
            'jack-cv1out': 'Root',
            'jack-cv2out': 'Third',
            'jack-pulse1in': 'Pulse',
            'jack-pulse2in': 'Loop Toggle',
            'jack-audio1in': 'VCA In',
            'jack-audio2in': 'VCA CV',
            'jack-audio1out': 'Main CV',
            'jack-audio2out': 'VCA Out'
        }
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
        category: 'Voice',
        labels: {
            'knob-large-computer': 'Pitch',
            'knob-small-x': 'Pitch Mod',
            'knob-small-y': 'Speed',
            'switch-3way-computer': 'Mode',
            'jack-audio1out': 'Speech',
            'jack-audio2out': 'Exciter',
            'jack-cv1out': 'Amp',
            'jack-cv2out': 'Pitch',
            'jack-audio1in': 'Ext Exciter',
            'jack-cv1in': 'Pitch CV',
            'jack-cv2in': 'Speed CV'
        }
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