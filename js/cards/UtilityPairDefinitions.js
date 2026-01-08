// =========================================================================
// UTILITY PAIR DEFINITIONS
// Metadata for all utility pairs based on Chris Johnson's Utility Pair
// Source: https://github.com/chrisgjohnson/Utility-Pair
// Website: https://www.chris-j.co.uk/utility_pair/
// =========================================================================

const UTILITY_PAIR_LIBRARY = [
    {
        id: 'delay',
        name: 'Delay',
        fullName: 'Delay',
        desc: 'A simple audio delay with feedback. {knob} controls Delay Time. {sec} controls Feedback.',
        labels: {
            'knob': 'Time',
            'in': 'Input',
            'out': 'Output',
            'cv': 'CV',
            'sub': 'Fdbk',
            'pulseIn': 'G->T In',
            'pulseOut': 'G->T Out'
        }
    },
    {
        id: 'euclidean',
        name: 'Euclidean rhythms',
        fullName: 'Euclidean rhythms',
        desc: 'Euclidean rhythms. Audio In / Ext = Active Steps. CV In / {knob} = Steps per Bar.',
        labels: {
            'knob': 'Steps',
            'in': 'Active',
            'out': 'Trig',
            'cv': 'Steps',
            'sub': '+1 Step',
            'pulseIn': 'Clock',
            'pulseOut': 'Trig'
        }
    },
    {
        id: 'bitcrush',
        name: 'Bitcrusher',
        fullName: 'Bitcrusher',
        desc: 'Digital bitcrush effect. CV In and {knob} control Sample Rate. {sec} controls Bit Depth.',
        labels: {
            'knob': 'Rate',
            'in': 'Audio',
            'out': 'Audio',
            'cv': 'Rate',
            'sub': 'Depth',
            'pulseIn': 'G->T In',
            'pulseOut': 'G->T Out'
        }
    },
    {
        id: 'attenuvert',
        name: 'Dual muting attenuverter',
        fullName: 'Dual muting attenuverter',
        desc: 'Dual attenuverter. Pulse In mutes both channels. {sec} attenuverts/inverts Ch 2.',
        labels: {
            'knob': 'Gain 1',
            'in': 'In 1',
            'out': 'Out 1',
            'cv': 'In 2',
            'sub': 'Gain 2',
            'pulseIn': 'Mute',
            'pulseOut': 'Thru'
        }
    },
    {
        id: 'clockdiv',
        name: 'Clock divider',
        fullName: 'Clock divider',
        desc: 'Three-channel clock divider. Audio Out=/2(3), CV Out=/4(5), Pulse Out=/8(7). {sec} controls div mode.',
        labels: {
            'knob': 'Speed',
            'in': 'Clock',
            'out': '/2',
            'cv': '/4',
            'sub': 'Mode',
            'pulseIn': 'Trig',
            'pulseOut': '/8'
        }
    },
    {
        id: 'slopesplus',
        name: 'Slopes+',
        fullName: 'Slopes+',
        desc: 'Comparator and S&H. Audio In = Comparator Input. CV In = Max Cmp Input. Audio Out = Random S&H. {sec} = Audio S&H Control.',
        labels: {
            'knob': 'CV S&H',
            'in': 'Cmp In',
            'out': 'Rnd S&H',
            'cv': 'Max In',
            'sub': 'Aud S&H',
            'pulseIn': '',
            'pulseOut': 'FlipFlop'
        }
    },
    {
        id: 'maxrect',
        name: 'Max / rectifier',
        fullName: 'Max / rectifier',
        desc: "Outputs maximum of Audio (A) and CV (B) input signals. {knob} Attenuverts Input B.",
        labels: {
            'knob': 'Atten',
            'in': 'In A',
            'out': 'Max',
            'cv': 'In B',
            'sub': '',
            'pulseIn': '',
            'pulseOut': 'A > 0'
        }
    },
    {
        id: 'chords',
        name: 'Chords',
        fullName: 'Chords',
        desc: 'Square-wave chord generator. {knob} sets pitch (non-standard). {sec} selects chord type.',
        labels: {
            'knob': 'Pitch',
            'in': 'Pitch',
            'out': 'Audio',
            'cv': 'Voicing',
            'sub': 'Type',
            'pulseIn': 'G->T In',
            'pulseOut': 'G->T Out'
        }
    },
    {
        id: 'windowcomp',
        name: 'Window comparator',
        fullName: 'Window comparator',
        desc: "Defines a voltage 'window' centred on CV input voltage. Audio Out = Above, CV Out = Inside, Pulse Out = Below. {sec} controls Window Width.",
        labels: {
            'knob': 'Width',
            'in': 'Input',
            'out': 'Above',
            'cv': 'Center',
            'sub': 'Invert',
            'pulseIn': 'Invert',
            'pulseOut': 'Below'
        }
    },
    {
        id: 'karplusstrong',
        name: 'Karplus-Strong',
        fullName: 'Karplus-Strong',
        desc: 'Inharmonic Karplus-Strong resonator. {sec} controls timbre. Pulse In strikes resonator.',
        labels: {
            'knob': 'Pitch',
            'in': 'Strike',
            'out': 'Reson',
            'cv': 'Pitch',
            'sub': 'Timbre',
            'pulseIn': 'Strike',
            'pulseOut': ''
        }
    },
    {
        id: 'cross',
        name: 'Cross-switch',
        fullName: 'Cross-switch',
        desc: 'CV cross-connection switch. Usually Audio->Out A, CV->Out B. {sec} triggers cross-connect.',
        labels: {
            'knob': 'Mode',
            'in': 'In A',
            'out': 'Out A',
            'cv': 'In B',
            'sub': 'Trigger',
            'pulseIn': 'Trig',
            'pulseOut': ''
        }
    },
    {
        id: 'cvmix',
        name: 'CV mixer',
        fullName: 'CV mixer',
        desc: 'Attenuverts and mixes two CV channels. Audio Out = A + B. CV Out = A - B.',
        labels: {
            'knob': 'Atten A',
            'in': 'In A',
            'out': 'A+B',
            'cv': 'In B',
            'sub': 'Atten B',
            'pulseIn': 'G->T In',
            'pulseOut': 'G->T Out'
        }
    },
    {
        id: 'vco',
        name: 'VCO',
        fullName: 'VCO',
        desc: 'Three distinct wave shapes. CV In sets 1V/Oct pitch. Audio In/{sec} controls Timbre/Shape. {knob} controls Offset.',
        labels: {
            'knob': 'Offset',
            'in': 'Timbre',
            'out': 'Out',
            'cv': 'V/Oct',
            'sub': 'Timbre',
            'pulseIn': 'G->T In',
            'pulseOut': 'G->T Out'
        }
    },
    {
        id: 'chorus',
        name: 'Chorus',
        fullName: 'Chorus',
        desc: 'Chorus/flanger effect. {knob} and CV controls speed. {sec} controls tone.',
        labels: {
            'knob': 'Speed',
            'in': 'Audio',
            'out': 'Audio',
            'cv': 'Speed',
            'sub': 'Tone',
            'pulseIn': 'G->T In',
            'pulseOut': 'G->T Out'
        }
    },
    {
        id: 'wavefolder',
        name: 'Wavefolder',
        fullName: 'Wavefolder',
        desc: 'Buchla-style Wavefolder. {sec} controls number of discrete voltage outputs. Pulse In triggers random voltage.',
        labels: {
            'knob': 'Gain',
            'in': 'Audio',
            'out': 'Audio',
            'cv': 'Gain',
            'sub': 'Steps',
            'pulseIn': 'Trig',
            'pulseOut': '/2'
        }
    },
    {
        id: 'lpg',
        name: 'Lopass gate',
        fullName: 'Lopass gate',
        desc: 'Buchla-style lopass gate with bonus five-step sequencer. Pulse In pings the gate. {sec}/Ext attenuates ping.',
        labels: {
            'knob': 'Ctrl',
            'in': 'Audio',
            'out': 'Audio',
            'cv': 'Ctrl',
            'sub': 'Atten',
            'pulseIn': 'Ping',
            'pulseOut': '/5'
        }
    },
    {
        id: 'sandh',
        name: 'Sample and hold',
        fullName: 'Sample and hold',
        desc: 'Sample and hold with random generator and slew limiting. Audio in sampled on rising edge of Pulse in. {sec}/Ext controls slew rate.',
        labels: {
            'knob': 'Clock',
            'in': 'Input',
            'out': 'Output',
            'cv': 'CV',
            'sub': 'Slew',
            'pulseIn': 'Trig',
            'pulseOut': 'Slewing'
        }
    },
    {
        id: 'quantiser',
        name: 'Quantiser',
        fullName: 'Quantiser',
        desc: 'A 1V/oct pitch quantiser with eight scales. Pulse In samples input. {sec}/Ext selects scale.',
        labels: {
            'knob': 'Transp',
            'in': 'CV In',
            'out': 'CV Out',
            'cv': 'Input',
            'sub': 'Scale',
            'pulseIn': 'Sample',
            'pulseOut': 'Trig'
        }
    },
    {
        id: 'bernoulli',
        name: 'Bernoulli gate',
        fullName: 'Bernoulli gate',
        desc: 'Re-implementation of (half of) Mutable Branches. {knob} controls probability. {sec} selects option.',
        labels: {
            'knob': 'Prob',
            'in': 'Gate',
            'out': 'Gate A',
            'cv': 'Prob',
            'sub': 'Option',
            'pulseIn': 'Gate',
            'pulseOut': 'Gate A'
        }
    },
    {
        id: 'supersaw',
        name: 'Supersaw',
        fullName: 'Supersaw',
        desc: 'Stack of sawtooth waves. CV in is 1V/oct pitch. {knob} is pitch offset. {sec} is detune.',
        labels: {
            'knob': 'Offset',
            'in': 'Input',
            'out': 'Output',
            'cv': 'V/Oct',
            'sub': 'Detune',
            'pulseIn': 'G->T In',
            'pulseOut': 'G->T Out'
        }
    },
    {
        id: 'slowlfo',
        name: 'Slow LFO',
        fullName: 'Slow LFO',
        desc: 'Pair of slow sine-wave LFOs. {sec} controls phase time. Switch sets range (5m, 1h, Reset). Pulse In resets phases.',
        labels: {
            'knob': 'Freq',
            'in': 'Reset',
            'out': 'LFO 1',
            'cv': 'LFO 2',
            'sub': 'Phase',
            'pulseIn': 'Reset',
            'pulseOut': ''
        }
    },
    {
        id: 'turing185',
        name: 'Turing 185',
        fullName: 'Turing 185',
        desc: 'Tiny sequencer using ideas from the RYK M185 and Turing Machine. Control over randomness. Output quantiser controllable from single note to 12-note chromatic.',
        labels: {
            'knob': 'Rand',
            'in': 'Clock',
            'out': 'Gate',
            'cv': 'Pitch',
            'sub': 'Range',
            'pulseIn': 'Step',
            'pulseOut': 'Gate'
        }
    },
    {
        id: 'glitch',
        name: 'Glitch',
        fullName: 'Glitch',
        desc: 'Audio glitching tool. Records audio and stores history; playback head jumps around randomly. {knob} controls glitch distance/speed. {sec} controls glitch type (reverse/repeat).',
        labels: {
            'knob': 'Speed',
            'in': 'Audio',
            'out': 'Audio',
            'cv': 'Amount',
            'sub': 'Type',
            'pulseIn': 'Trig',
            'pulseOut': ''
        }
    },
    {
        id: 'vca',
        name: 'VCA',
        fullName: 'VCA',
        desc: 'A simple linear voltage controlled amplifier. The output is the input multiplied by a (positive) CV. {sec} controls CV amount.',
        labels: {
            'knob': 'Gain',
            'in': 'Input',
            'out': 'Output',
            'cv': 'CV',
            'sub': 'CV Amt',
            'pulseIn': '',
            'pulseOut': ''
        }
    },
    {
        id: 'looper',
        name: 'Loop divider',
        fullName: 'Loop divider',
        desc: "Tom's Loop Divider alternative firmware for the Radio Music. Drum loops with pulse out beats and CV control of pitch/speed. Pulse In controls bonus percussion.",
        labels: {
            'knob': 'Pitch',
            'in': 'L In',
            'out': 'L Out',
            'cv': 'Pitch',
            'sub': 'Select',
            'pulseIn': 'Perc',
            'pulseOut': 'Div'
        }
    }
];

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UTILITY_PAIR_LIBRARY = UTILITY_PAIR_LIBRARY;
}
