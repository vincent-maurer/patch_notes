// =========================================================================
// UTILITY PAIR DEFINITIONS
// Metadata for all utility pairs based on Chris Johnson's Utility Pair
// Source: https://github.com/chrisgjohnson/Utility-Pair
// Website: https://www.chris-j.co.uk/utility_pair/
// =========================================================================

const UTILITY_PAIR_LIBRARY = [
    {
        id: 'looper',
        name: 'Loop Div',
        fullName: 'Loop Divider',
        desc: "Tom's Loop Divider alternative firmware for the Radio Music. Drum loops with pulse out beats and CV control of pitch/speed.",
        labels: {
            'knob': 'Speed',
            'in': 'L In',
            'out': 'L Out',
            'cv': 'CV Spd',
            'sub': 'Select'
        }
    },
    {
        id: 'vca',
        name: 'VCA',
        fullName: 'Voltage Controlled Amplifier',
        desc: 'A simple linear voltage controlled amplifier. The output is the input multiplied by a (positive) CV.',
        labels: {
            'knob': 'Gain',
            'in': 'Input',
            'out': 'Output',
            'cv': 'CV Gain',
            'sub': 'CV Amt'
        }
    },
    {
        id: 'glitch',
        name: 'Glitch',
        fullName: 'Glitch',
        desc: 'Audio glitching tool. Records audio and stores ~1 second of history; playback head jumps around randomly.',
        labels: {
            'knob': 'Hist',
            'in': 'Audio',
            'out': 'Audio',
            'cv': 'CV',
            'sub': 'Chaos'
        }
    },
    {
        id: 'turing185',
        name: 'Turing',
        fullName: 'Turing 185',
        desc: 'Tiny sequencer using ideas from the RYK M185 and the Music Thing Modular Turing Machine.',
        labels: {
            'knob': 'Prob',
            'in': 'Clock',
            'out': 'Gate',
            'cv': 'CV Note',
            'sub': 'Steps'
        }
    },
    {
        id: 'slowlfo',
        name: 'SlowLFO',
        fullName: 'Slow LFO',
        desc: 'Slow phasing LFO. Pair of slow (~2 second to ~5 hour) sine-wave LFOs.',
        labels: {
            'knob': 'Rate',
            'in': 'Reset',
            'out': 'LFO 1',
            'cv': 'LFO 2',
            'sub': 'Phase'
        }
    },
    {
        id: 'supersaw',
        name: 'SuperSaw',
        fullName: 'Supersaw VCO',
        desc: 'Stack of 8 sawtooth waves. Detune and 1V/oct pitch control.',
        labels: {
            'knob': 'Detune',
            'in': 'Input',
            'out': 'Output',
            'cv': 'V/Oct',
            'sub': 'Mix'
        }
    },
    {
        id: 'bernoulli',
        name: 'Bernoulli',
        fullName: 'Bernoulli gate',
        desc: 'Bernoulli gate. Re-implementation of (half of) Mutable Branches.',
        labels: {
            'knob': 'Prob',
            'in': 'Input',
            'out': 'Output',
            'cv': 'CV Prob',
            'sub': 'Mode'
        }
    },
    {
        id: 'quantiser',
        name: 'Quant',
        fullName: 'Quantiser',
        desc: 'A 1V/oct pitch quantiser with eight scales. Built-in sample and hold.',
        labels: {
            'knob': 'Scale',
            'in': 'CV In',
            'out': 'CV Out',
            'cv': 'Transp',
            'sub': 'Octave'
        }
    },
    {
        id: 'sandh',
        name: 'S&H',
        fullName: 'Sample and hold',
        desc: 'A sample and hold, with random generator and slew limiting.',
        labels: {
            'knob': 'Slew',
            'in': 'Input',
            'out': 'Output',
            'cv': 'Trigger',
            'sub': 'Source'
        }
    },
    {
        id: 'lpg',
        name: 'LPG',
        fullName: 'Lopass gate',
        desc: 'Buchla-style lopass gate, with bonus five-step sequencer.',
        labels: {
            'knob': 'Filter',
            'in': 'Audio',
            'out': 'Audio',
            'cv': 'CV Freq',
            'sub': 'Atten'
        }
    },
    {
        id: 'wavefolder',
        name: 'WaveFold',
        fullName: 'Wavefolder',
        desc: 'Buchla-style Wavefolder, with bonus discrete random voltage generation and clock divider.',
        labels: {
            'knob': 'Fold',
            'in': 'Audio',
            'out': 'Audio',
            'cv': 'CV Fold',
            'sub': 'Steps'
        }
    },
    {
        id: 'chorus',
        name: 'Chorus',
        fullName: 'Chorus',
        desc: 'A hastily written chorus/flanger effect. Knob X/Y and CV controls speed. Main knob controls tone.',
        labels: {
            'knob': 'Speed',
            'in': 'Audio',
            'out': 'Audio',
            'cv': 'CV Spd',
            'sub': 'Tone'
        }
    },
    {
        id: 'vco',
        name: 'VCO',
        fullName: 'VCO',
        desc: 'A VCO with three distinct wave shapes that each smoothly transform over a range of timbres.',
        labels: {
            'knob': 'Offset',
            'in': 'Timbre',
            'out': 'Out',
            'cv': 'V/Oct',
            'sub': 'Shape'
        }
    },
    {
        id: 'cvmix',
        name: 'CVMix',
        fullName: 'CV mixer',
        desc: 'Attenuverts and mixes two CV channels. Audio Out = (Knob X)×(Audio In) + (Main Knob)×(CV In).',
        labels: {
            'knob': 'Amt A',
            'in': 'In A',
            'out': 'Sum',
            'cv': 'In B',
            'sub': 'Amt B'
        }
    },
    {
        id: 'cross',
        name: 'Cross',
        fullName: 'Cross-switch',
        desc: 'CV cross-connection switch. Usually Audio->AudioOut, CV->CVOut, unless triggered.',
        labels: {
            'knob': 'Mode',
            'in': 'Audio',
            'out': 'Out A',
            'cv': 'CV In',
            'sub': 'Trigger'
        }
    },
    {
        id: 'karplusstrong',
        name: 'Karplus',
        fullName: 'Karplus-Strong',
        desc: 'Inharmonic Karplus-Strong resonator. Extends Karplus-Strong synthesis to two delay lines.',
        labels: {
            'knob': 'Damp',
            'in': 'Strike',
            'out': 'Out',
            'cv': 'CV Damp',
            'sub': 'Model'
        }
    },
    {
        id: 'windowcomp',
        name: 'WinComp',
        fullName: 'Window comparator',
        desc: 'Defines a voltage \'window\' centred on CV input voltage, with size controlled by X/Y knob.',
        labels: {
            'knob': 'Width',
            'in': 'Audio',
            'out': 'Gate',
            'cv': 'Center',
            'sub': 'Mode'
        }
    },
    {
        id: 'chords',
        name: 'Chords',
        fullName: 'Chords',
        desc: 'Square-wave chord generator. Eight chord types, some diatonic.',
        labels: {
            'knob': 'Chord',
            'in': 'Root',
            'out': 'Audio',
            'cv': 'Voicing',
            'sub': 'Invert'
        }
    },
    {
        id: 'maxrect',
        name: 'MaxRect',
        fullName: 'Max / rectifier',
        desc: 'Outputs the maximum of the Audio and CV input signals (Analogue OR). CV input can be rectifier.',
        labels: {
            'knob': 'Atten',
            'in': 'Audio',
            'out': 'Max',
            'cv': 'CV',
            'sub': 'Mode'
        }
    },
    {
        id: 'slopesplus',
        name: 'Slopes+',
        fullName: 'Slopes+',
        desc: 'Adds more flexible patching to Slopes. Replaces loop parts, adds random voltages.',
        labels: {
            'knob': 'Rnd Amt',
            'in': 'In',
            'out': 'Out',
            'cv': 'Thresh',
            'sub': 'Mode'
        }
    },
    {
        id: 'clockdiv',
        name: 'ClkDiv',
        fullName: 'Clock divider',
        desc: 'Three-channel clock divider. Divides input clock by 2/4/8 or 3/5/7.',
        labels: {
            'knob': 'Speed',
            'in': 'Clock',
            'out': '/2',
            'cv': '/4',
            'sub': 'Divs'
        }
    },
    {
        id: 'attenuvert',
        name: 'Attenuv',
        fullName: 'Dual muting attenuverter',
        desc: 'Two channels of attenuverter. A high signal in pulse input mutes both channels.',
        labels: {
            'knob': 'Atten',
            'in': 'In',
            'out': 'Out',
            'cv': 'CV',
            'sub': 'CV Amt'
        }
    },
    {
        id: 'bitcrush',
        name: 'BitCrush',
        fullName: 'Bitcrusher',
        desc: 'Digital bitcrush effect. Control over bit depth and sample rate.',
        labels: {
            'knob': 'Crush',
            'in': 'Audio',
            'out': 'Audio',
            'cv': 'CV',
            'sub': 'Mix'
        }
    },
    {
        id: 'euclidean',
        name: 'Euclid',
        fullName: 'Euclidean rhythms',
        desc: '16-step Euclidean rhythms generator. CV control over steps and pulses.',
        labels: {
            'knob': 'Pulses',
            'in': 'Clock',
            'out': 'Gate',
            'cv': 'Steps',
            'sub': 'Rot'
        }
    },
    {
        id: 'delay',
        name: 'Delay',
        fullName: 'Delay',
        desc: 'A simple audio delay with feedback. Good for delay times up to a second.',
        labels: {
            'knob': 'Time',
            'in': 'Input',
            'out': 'Output',
            'cv': 'CV Time',
            'sub': 'Fdbk'
        }
    }
];

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UTILITY_PAIR_LIBRARY = UTILITY_PAIR_LIBRARY;
}
