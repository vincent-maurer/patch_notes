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
            'audioIn': 'Signal In',
            'audioOut': 'Sgnl Out',
            'cvIn': 'Time',
            'ext': 'Fdbk',
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
            'audioIn': 'Active',
            'ext': 'Active',
            'cvIn': 'Steps',
            'pulseIn': 'Clock',
            'audioOut': 'Bar Trig',
            'cvOut': 'Gate',
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
            'audioIn': 'Signal In',
            'audioOut': 'Sgnl Out',
            'cvIn': 'Rate',
            'ext': 'Depth',
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
            'audioIn': 'In 1',
            'audioOut': 'Out 1',
            'cvIn': 'In 2',
            'cvOut': 'Out 2',
            'ext': 'Gain 2',
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
            'audioIn': 'Input',
            'cvIn': 'Input',
            'pulseIn': 'Input',
            'audioOut': '/2 /3',
            'cvOut': '/4 /5',
            'pulseOut': '/8 /7',
            'ext': 'Mode',
        }
    },
    {
        id: 'slopesplus',
        name: 'Slopes+',
        fullName: 'Slopes+',
        desc: 'Comparator and S&H. Audio In = Comparator Input. CV In = Max Cmp Input. Audio Out = Random S&H. {sec} = Audio S&H Control.',
        labels: {
            'knob': 'CV S&H',
            'audioIn': 'Cmp In',
            'cvIn': 'Max In',
            'pulseOut': 'Pulse',
            'audioOut': 'Rnd S&H',
            'cvOut': 'Rnd S&H',
            'ext': 'S&H/Pls'
        }
    },
    {
        id: 'maxrect',
        name: 'Max / rectifier',
        fullName: 'Max / rectifier',
        desc: "Outputs maximum of Audio (A) and CV (B) input signals. {knob} Attenuverts Input B.",
        labels: {
            'knob': 'Atten',
            'audioIn': 'In A',
            'cvIn': 'In B',
            'pulseOut': 'A > 0',
            'audioOut': 'max(A,B)'
        }
    },
    {
        id: 'chords',
        name: 'Chords',
        fullName: 'Chords',
        desc: 'Square-wave chord generator. {knob} sets pitch (non-standard). {sec} selects chord type.',
        labels: {
            'knob': 'Pitch',
            'cvIn': 'Pitch',
            'audioOut': 'Audio',
            'cvOut': 'V/oct',
            'ext': 'Type',
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
            'audioIn': 'Input',
            'cvIn': 'Center',
            'pulseIn': 'Invert',
            'audioOut': 'Above',
            'cvOut': 'Inside',
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
            'audioIn': 'Strike',
            'audioOut': 'Reson',
            'cvIn': 'Pitch',
            'ext': 'Timbre',
            'pulseIn': 'Strike'
        }
    },
    {
        id: 'cross',
        name: 'Cross-switch',
        fullName: 'Cross-switch',
        desc: 'CV cross-connection switch. Usually Audio->Out A, CV->Out B. {sec} triggers cross-connect.',
        labels: {
            'knob': 'Mode',
            'audioIn': 'In A',
            'audioOut': 'Out A',
            'cvIn': 'In B',
            'cvOut': 'Out B',
            'pulseIn': 'Cross'
        }
    },
    {
        id: 'cvmix',
        name: 'CV mixer',
        fullName: 'CV mixer',
        desc: 'Attenuverts and mixes two CV channels. Audio Out = A + B. CV Out = A - B.',
        labels: {
            'knob': 'Atten A',
            'audioIn': 'In A',
            'cvIn': 'In B',
            'audioOut': 'A + B',
            'cvOut': 'A - B',
            'ext': 'Atten B',
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
            'cvIn': 'V/oct',
            'audioOut': 'VCO Out',
            'audioIn': 'Timbre',
            'ext': 'Timbre',
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
            'audioIn': 'Input',
            'audioOut': 'Output',
            'cvIn': 'Speed',
            'ext': 'Tone',
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
            'audioIn': 'Input',
            'audioOut': 'Output',
            'cvIn': 'Gain',
            'pulseIn': 'Rnd/Alt',
            'pulseOut': '/2',
            'cvOut': 'Rnd',
            'ext': 'Steps'
        }
    },
    {
        id: 'lpg',
        name: 'Lopass gate',
        fullName: 'Lopass gate',
        desc: 'Buchla-style lopass gate with bonus five-step sequencer. Pulse In pings the gate. {sec}/Ext attenuates ping.',
        labels: {
            'knob': 'Ctrl',
            'audioIn': 'Input',
            'audioOut': 'Output',
            'cvIn': 'Ctrl',
            'pulseIn': 'Ping/Seq',
            'ext': 'Atten',
            'pulseOut': '/5 Trig',
            'cvOut': 'Seq Out'
        }
    },
    {
        id: 'sandh',
        name: 'Sample and hold',
        fullName: 'Sample and hold',
        desc: 'Sample and hold with random generator and slew limiting. Audio in sampled on rising edge of Pulse in. {sec}/Ext controls slew rate.',
        labels: {
            'knob': 'Clock',
            'pulseIn': 'Trig',
            'audioIn': 'Input',
            'audioOut': 'Output',
            'cvOut': 'Slew Out',
            'ext': 'Slew',
            'cvIn': 'Clk/Slew',
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
            'cvIn': 'Input',
            'cvOut': 'Output',
            'pulseIn': 'Sample',
            'ext': 'Scale',
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
            'pulseIn': 'Gate',
            'cvIn': 'Prob',
            'cvOut': 'Thru',
            'pulseOut': 'Gate A',
            'audioOut': 'Gate B',
            'ext': 'Option'
        }
    },
    {
        id: 'supersaw',
        name: 'Supersaw',
        fullName: 'Supersaw',
        desc: 'Stack of sawtooth waves. CV in is 1V/oct pitch. {knob} is pitch offset. {sec} is detune.',
        labels: {
            'knob': 'Offset',
            'audioOut': 'Output',
            'cvIn': 'V/oct',
            'ext': 'Detune',
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
            'audioOut': 'LFO 1',
            'cvOut': 'LFO 2',
            'ext': 'Phase',
            'pulseIn': 'Reset'
        }
    },
    {
        id: 'turing185',
        name: 'Turing 185',
        fullName: 'Turing 185',
        desc: 'Tiny sequencer using ideas from the RYK M185 and Turing Machine. Control over randomness. Output quantiser controllable from single note to 12-note chromatic.',
        labels: {
            'knob': 'Rand',
            'cvOut': 'V/oct',
            'pulseOut': 'Trig/Gate',
            'ext': 'Range',
            'pulseIn': 'Step'
        }
    },
    {
        id: 'glitch',
        name: 'Glitch',
        fullName: 'Glitch',
        desc: 'Audio glitching tool. Records audio and stores history; playback head jumps around randomly. {knob} controls glitch distance/speed. {sec} controls glitch type (reverse/repeat).',
        labels: {
            'knob': 'Speed',
            'audioIn': 'Input',
            'audioOut': 'Output',
            'cvIn': 'Amount',
            'pulseIn': 'Glitch',
            'ext': 'Type'
        }
    },
    {
        id: 'vca',
        name: 'VCA',
        fullName: 'VCA',
        desc: 'A simple linear voltage controlled amplifier. The output is the input multiplied by a (positive) CV. {sec} controls CV amount.',
        labels: {
            'knob': 'Gain',
            'audioIn': 'Input',
            'audioOut': 'Output',
            'cvIn': 'CV'
        }
    },
    {
        id: 'looper',
        name: 'Loop divider',
        fullName: 'Loop divider',
        desc: "Tom's Loop Divider alternative firmware for the Radio Music. Drum loops with pulse out beats and CV control of pitch/speed. Pulse In controls bonus percussion.",
        labels: {
            'knob': 'Pitch',
            'audioOut': 'Output',
            'cvIn': 'Pitch',
            'ext': 'Select',
            'pulseOut': 'Div',
            'pulseIn': 'Perc'
        }
    }
];

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UTILITY_PAIR_LIBRARY = UTILITY_PAIR_LIBRARY;
}
