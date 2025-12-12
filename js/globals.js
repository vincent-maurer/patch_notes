// =========================================================================
// GLOBALS.JS
// Shared state, configuration, and utility functions.
// MUST BE LOADED BEFORE main.js AND ui.js
// =========================================================================

// --- CONFIGURATION VARIABLES ---

const SYSTEM_CONFIG = {
    // --- KNOBS ---
    "knob-small-x": { type: "knob-small", x: "3.25%", y: "32.50%", label: "X", short: "KX", defValue: 0 },
    "knob-large-computer": { type: "knob-large", x: "9.44%", y: "15.28%", label: "Main", short: "KC", defValue: 0 },
    "knob-small-y": { type: "knob-small", x: "9.50%", y: "32.50%", label: "Y", short: "KY", defValue: 0 },
    
    "knob-small-osc1fine": { type: "knob-small", x: "22.64%", y: "32.50%", label: "Osc 1 - Fine", short: "KF1" },
    "knob-large-osc1": { type: "knob-large", x: "28.55%", y: "15.28%", label: "Osc 1 - Freq", short: "KO1" },
    "knob-small-osc1fm": { type: "knob-small", x: "34.14%", y: "32.65%", label: "Osc 1 - FM", short: "KFM1", defValue: -150 },
    
    "knob-small-osc2fine": { type: "knob-small", x: "22.64%", y: "70.45%", label: "Osc 2 - Fine", short: "KF2" },
    "knob-large-osc2": { type: "knob-large", x: "28.40%", y: "87.75%", label: "Osc 2 - Freq", short: "KO2" },
    "knob-small-osc2fm": { type: "knob-small", x: "34.14%", y: "70.45%", label: "Osc 2 - FM", short: "KFM2", defValue: -150 },

    "knob-medium-slopes1": { type: "knob-medium", x: "78.87%", y: "13.20%", label: "Slopes 1 - Time", short: "KMS1" }, 
    "knob-medium-slopes2": { type: "knob-medium", x: "78.74%", y: "89.30%", label: "Slopes 2 - Time", short: "KMS2" }, 
    
    "knob-small-filter1fm": { type: "knob-small", x: "60.12%", y: "32.50%", label: "Filter 1 - FM", short: "KFF1", defValue: -150 },
    "knob-large-filter1": { type: "knob-large", x: "66.35%", y: "15.28%", label: "Filter 1 - Cutoff", short: "KLF1", defValue: -150 },
    "knob-small-filter1res": { type: "knob-small", x: "72.55%", y: "32.50%", label: "Filter 1 - Res", short: "KFR1", defValue: -150 },
    "knob-small-filter2fm": { type: "knob-small", x: "60.12%", y: "70.45%", label: "Filter 2 - FM", short: "KFF2", defValue: -150 },
    "knob-large-filter2": { type: "knob-large", x: "66.35%", y: "87.75%", label: "Filter 2 - Cutoff", short: "KLF2", defValue: -150 },
    "knob-small-filter2res": { type: "knob-small", x: "72.52%", y: "70.45%", label: "Filter 2 - Res", short: "KFR2", defValue: -150 },
    
    "knob-medium-amp": { type: "knob-medium", x: "51.35%", y: "16.75%", label: "Amp - Gain/Drive", short: "KMA", defValue: -150 }, 

    "knob-small-voltagesBlend": { type: "knob-small", x: "52.26%", y: "67.50%", label: "Blend", short: "KVB" },

    "knob-small-stompFeedback": { type: "knob-small", x: "40.3%", y: "76.35%", label: "Stomp Fdbk", short: "KSF", defValue: 0 },
    "knob-small-stompBlend": { type: "knob-small", x: "44.5%", y: "67.50%", label: "Stomp - Blend", short: "KSB", defValue: 0 },

    "knob-small-mix1": { type: "knob-small", x: "88.75%", y: "13.15%", label: "Mix 1", short: "KM1", defValue: 0 },
    "knob-small-mix2": { type: "knob-small", x: "88.75%", y: "23.30%", label: "Mix 2", short: "KM2", defValue: 0 },
    "knob-small-mix3": { type: "knob-small", x: "88.75%", y: "33.55%", label: "Mix 3", short: "KM3", defValue: 0 },
    "knob-small-mix4": { type: "knob-small", x: "96.42%", y: "33.55%", label: "Mix 4", short: "KM4", defValue: 0 },
    "knob-small-mix1pan": { type: "knob-small", x: "96.42%", y: "13.15%", label: "Pan 1", short: "KMP1" },
    "knob-small-mix2pan": { type: "knob-small", x: "96.42%", y: "23.30%", label: "Pan 2", short: "KMP2" },
    "knob-large-volumeMain": { type: "knob-large", x: "92.5%", y: "87.75%", label: "Main Vol", short: "KVM", defValue: 0 },

    // --- JACKS ---
    "jack-audio1in": { type: "jack", x: "2.47%", y: "46.15%", label: "Audio L In", short: "J1i" },
    "jack-cv1in": { type: "jack", x: "2.47%", y: "57.05%", label: "CV 1 In", short: "JC1i" },
    "jack-cv2in": { type: "jack", x: "7.15%", y: "57.05%", label: "CV 2 In", short: "JC2i" },
    "jack-pulse1in": { type: "jack", x: "2.45%", y: "67.95%", label: "Pulse 1 In", short: "JP1i" },
    "jack-audio2in": { type: "jack", x: "7.15%", y: "46.15%", label: "Audio R In", short: "J2i" },
    "jack-pulse2in": { type: "jack", x: "7.15%", y: "67.95%", label: "Pulse 2 In", short: "JP2i" },
    "jack-audio1out": { type: "jack", x: "11.94%", y: "46.15%", label: "Audio L Out", short: "J1o" },
    "jack-cv1out": { type: "jack", x: "11.94%", y: "57.05%", label: "CV 1 Out", short: "JC1o" },
    "jack-pulse1out": { type: "jack", x: "11.94%", y: "67.95%", label: "Pulse 1 Out", short: "JP1o" },
    "jack-audio2out": { type: "jack", x: "16.61%", y: "46.15%", label: "Audio R Out", short: "J2o" },
    "jack-cv2out": { type: "jack", x: "16.61%", y: "57.05%", label: "CV 2 Out", short: "JC2o" },
    "jack-pulse2out": { type: "jack", x: "16.61%", y: "67.95%", label: "Pulse 2 Out", short: "JP2o" },
    "jack-osc1pitchIn": { type: "jack", x: "21.40%", y: "46.15%", label: "Osc 1 Pitch", short: "JOP1i" },
    "jack-osc2pitchIn": { type: "jack", x: "21.40%", y: "57.05%", label: "Osc 2 Pitch", short: "JOP2i" },
    "jack-osc1fmIn": { type: "jack", x: "26.07%", y: "46.15%", label: "Osc 1 FM", short: "JOFM1i" },
    "jack-osc2fmIn": { type: "jack", x: "26.09%", y: "57.05%", label: "Osc 2 FM", short: "JOFM2i" },
    "jack-osc1sqrOut": { type: "jack", x: "30.87%", y: "46.15%", label: "Osc 1 Sqr", short: "JOS1q" },
    "jack-osc2sqrOut": { type: "jack", x: "30.87%", y: "57.05%", label: "Osc 2 Sqr", short: "JOS2q" },
    "jack-osc1sinOut": { type: "jack", x: "35.56%", y: "46.15%", label: "Osc 1 Sin", short: "JOS1s" },
    "jack-osc2sinOut": { type: "jack", x: "35.59%", y: "57.05%", label: "Osc 2 Sin", short: "JOS2s" },
    "jack-stereoIn": { type: "jack", x: "40.33%", y: "13.58%", label: "Stereo In", short: "JSI" },
    "jack-ring1in": { type: "jack", x: "40.43%", y: "35.15%", label: "Ring In 1", short: "JR1i" },
    "jack-ring2in": { type: "jack", x: "40.43%", y: "46.15%", label: "Ring In 2", short: "JR2i" },
    "jack-ringOut": { type: "jack", x: "45.10%", y: "46.15%", label: "Ring Out", short: "JRO" },
    "jack-stompIn": { type: "jack", x: "40.38%", y: "57.05%", label: "Stomp In", short: "JSin" },
    "jack-stompReturn": { type: "jack", x: "40.33%", y: "89.04%", label: "Stomp Ret", short: "JSR" },
    "jack-stompOut": { type: "jack", x: "45.10%", y: "57.05%", label: "Stomp Out", short: "JSout" },
    "jack-stomnpSend": { type: "jack", x: "45.03%", y: "89.04%", label: "Stomp Send", short: "JSS" },
    "jack-ampIn": { type: "jack", x: "49.79%", y: "35.15%", label: "Amp In", short: "JAI" },
    "jack-ampOut": { type: "jack", x: "54.56%", y: "35.15%", label: "Amp Out", short: "JAO" },
    "jack-volt1Out": { type: "jack", x: "49.84%", y: "46.15%", label: "Volt 1", short: "JV1o" },
    "jack-volt2Out": { type: "jack", x: "54.55%", y: "46.15%", label: "Volt 2", short: "JV2o" },
    "jack-volt3Out": { type: "jack", x: "49.89%", y: "57.05%", label: "Volt 3", short: "JV3o" },
    "jack-volt4Out": { type: "jack", x: "54.56%", y: "57.05%", label: "Volt 4", short: "JV4o" },
    "jack-filter1In": { type: "jack", x: "59.25%", y: "46.15%", label: "Filt 1 In", short: "JF1i" },
    "jack-filter2In": { type: "jack", x: "59.25%", y: "57.05%", label: "Filt 2 In", short: "JF2i" },
    "jack-filter1fmIn": { type: "jack", x: "63.97%", y: "46.15%", label: "Filt 1 FM", short: "JFFM1i" },
    "jack-filter2fmIn": { type: "jack", x: "64.02%", y: "57.05%", label: "Filt 2 FM", short: "JFFM2i" },
    "jack-filter1hpOut": { type: "jack", x: "68.79%", y: "46.15%", label: "Filt 1 HP/BP", short: "JF1ho" },
    "jack-filter2hpOut": { type: "jack", x: "68.79%", y: "57.05%", label: "Filt 2 HP/BP", short: "JF2ho" },
    "jack-filter1lpOut": { type: "jack", x: "73.49%", y: "46.15%", label: "Filt 1 LP", short: "JF1lo" },
    "jack-filter2lpOut": { type: "jack", x: "73.50%", y: "57.05%", label: "Filt 2 LP", short: "JF2lo" },
    "jack-slopes1in": { type: "jack", x: "78.28%", y: "46.15%", label: "Slopes 1 In", short: "JSL1i" },
    "jack-slopes1cvIn": { type: "jack", x: "78.25%", y: "35.15%", label: "Slopes 1 CV", short: "JSCV1i" },
    "jack-slopes1out": { type: "jack", x: "82.95%", y: "46.15%", label: "Slopes 1 Out", short: "JSL1o" },
    "jack-slopes2in": { type: "jack", x: "78.28%", y: "57.05%", label: "Slopes 2 In", short: "JSL2i" },
    "jack-slopes2cvIn": { type: "jack", x: "82.92%", y: "67.95%", label: "Slopes 2 CV", short: "JSCV2i" },
    "jack-slopes2out": { type: "jack", x: "82.95%", y: "57.05%", label: "Slopes 2 Out", short: "JSL2o" },
    "jack-mixer1in": { type: "jack", x: "87.72%", y: "46.15%", label: "Mix 1", short: "JM1i" },
    "jack-mixer2in": { type: "jack", x: "92.42%", y: "46.15%", label: "Mix 2", short: "JM2i" },
    "jack-mixer3in": { type: "jack", x: "87.72%", y: "57.05%", label: "Mix 3", short: "JM3i" },
    "jack-mixer4in": { type: "jack", x: "92.47%", y: "57.05%", label: "Mix 4", short: "JM4i" },
    "jack-mixerLout": { type: "jack", x: "97.23%", y: "46.15%", label: "Mix L", short: "JMLo" },
    "jack-mixerRout": { type: "jack", x: "97.12%", y: "57.05%", label: "Mix R", short: "JMRO" },
    "jack-phones1out": { type: "jack", x: "92.52%", y: "67.95%", label: "Phones 1", short: "JPH1o" },
    "jack-phones2out": { type: "jack", x: "97.21%", y: "67.95%", label: "Phones 2", short: "JPH2o" },
    "jack-stereoIn1Out": { type: "jack", x: "45.10%", y: "13.58%", label: "Stereo L", short: "JSI1o" },
    "jack-stereoIn2Out": { type: "jack", x: "45.10%", y: "24.60%", label: "Stereo R", short: "JSI2o" },

    // --- SWITCHES ---
    "switch-3way-computer": { type: "switch-3way", x: "15.70%", y: "31.40%", label: "Z", short: "SC" },
    "switch-2way-amp": { type: "switch-2way", x: "52.25%", y: "26.57%", label: "Amp Mode", short: "SA" },
    "switch-2way-filter1hp": { type: "switch-2way", x: "66.46%", y: "32.66%", label: "F1 HP/BP", short: "SF1h" },
    "switch-2way-filter2hp": { type: "switch-2way", x: "66.46%", y: "70.40%", label: "F2 HP/BP", short: "SF2h" },
    "switch-3way-slopes1shape": { type: "switch-3way", x: "77.90%", y: "24.60%", label: "S1 Shape", short: "SS1s" },
    "switch-3way-slopes2shape": { type: "switch-3way", x: "77.90%", y: "78.25%", label: "S2 Shape", short: "SS2s" },
    "switch-3way-slopes1loop": { type: "switch-3way", x: "83.25%", y: "24.60%", label: "S1 Mode", short: "SL1l" },
    "switch-3way-slopes2loop": { type: "switch-3way", x: "83.25%", y: "78.25%", label: "S2 Mode", short: "SL2l" },
    
    // --- BUTTONS ---
    "button-1": { type: "button", x: "50.3%", y: "79.6%", label: "Button 1", short: "B1" },
    "button-3": { type: "button", x: "50.3%", y: "89.1%", label: "Button 3", short: "B3" },
    "button-2": { type: "button", x: "55.9%", y: "79.6%", label: "Button 2", short: "B2" },
    "button-4": { type: "button", x: "55.9%", y: "89.1%", label: "Button 4", short: "B4" },
    
    // --- LEDS ---
    "led-amp-1": { type: "led", x: "49.9%", y: "10.5%", label: "Amp Lvl 1" },
    "led-amp-2": { type: "led", x: "52.4%", y: "10.13%", label: "Amp Lvl 2" },
    "led-amp-3": { type: "led", x: "54.3%", y: "11.9%", label: "Amp Lvl 3" }, 
    "led-amp-4": { type: "led", x: "55.2%", y: "15.3%", label: "Amp Lvl 4" },

    "led-comp-0": { type: "led", x: "1.4%", y: "84.8%", label: "Comp 0" },
    "led-comp-2": { type: "led", x: "1.4%", y: "88.3%", label: "Comp 2" },
    "led-comp-4": { type: "led", x: "1.4%", y: "91.8%", label: "Comp 4" },
    "led-comp-1": { type: "led", x: "3.6%", y: "84.8%", label: "Comp 1" },
    "led-comp-3": { type: "led", x: "3.6%", y: "88.3%", label: "Comp 3" },
    "led-comp-5": { type: "led", x: "3.6%", y: "91.8%", label: "Comp 5" },

    "led-slopes1-rise": { type: "led", x: "80.6%", y: "22.6%", label: "S1 Rise" },
    "led-slopes1-fall": { type: "led", x: "80.6%", y: "26.6%", label: "S1 Fall" },

    "led-slopes2-rise": { type: "led", x: "80.6%", y: "76.2%", label: "S2 Rise" },
    "led-slopes2-fall": { type: "led", x: "80.6%", y: "80.2%", label: "S2 Fall" },
};

const REVERSE_ID_MAP = {}; for (const [id, config] of Object.entries(SYSTEM_CONFIG)) REVERSE_ID_MAP[config.short] = id;

const MODULES_MAP = [
    { 
        id: 'Computer', 
        inputs: ['jack-audio1in','jack-audio2in','jack-cv1in','jack-cv2in','jack-pulse1in','jack-pulse2in'], 
        outputs: ['jack-audio1out','jack-audio2out','jack-cv1out','jack-cv2out','jack-pulse1out','jack-pulse2out'],
        controls: ['knob-small-x', 'knob-large-computer', 'knob-small-y', 'switch-3way-computer'] 
    },
    { 
        id: 'Osc1', 
        inputs: ['jack-osc1pitchIn','jack-osc1fmIn'], 
        outputs: ['jack-osc1sqrOut','jack-osc1sinOut'], 
        controls: ['knob-small-osc1fine', 'knob-large-osc1', 'knob-small-osc1fm'] 
    },
    { 
        id: 'Osc2', 
        inputs: ['jack-osc2pitchIn','jack-osc2fmIn'], 
        outputs: ['jack-osc2sqrOut','jack-osc2sinOut'], 
        controls: ['knob-small-osc2fine', 'knob-large-osc2', 'knob-small-osc2fm'] 
    },
    { 
        id: 'StereoIn', 
        inputs: [], // It's a source, no inputs
        outputs: ['jack-stereoIn1Out','jack-stereoIn2Out'], 
        controls: [] 
    },
    { 
        id: 'RingMod', 
        inputs: ['jack-ring1in','jack-ring2in'], 
        outputs: ['jack-ringOut'], 
        controls: [] 
    },
    { 
        id: 'Stomp', 
        inputs: ['jack-stompIn','jack-stompReturn'], 
        outputs: ['jack-stompOut','jack-stomnpSend'], 
        controls: ['knob-small-stompBlend', 'knob-small-stompFeedback'] 
    },
    { 
        id: 'Amp', 
        inputs: ['jack-ampIn'], 
        outputs: ['jack-ampOut'], 
        controls: ['knob-medium-amp', 'switch-2way-amp'] 
    },
    { 
        id: 'Voltages', 
        inputs: [], 
        outputs: ['jack-volt1Out','jack-volt2Out','jack-volt3Out','jack-volt4Out'], 
        controls: ['knob-small-voltagesBlend', 'button-1', 'button-2', 'button-3', 'button-4'] 
    },
    { 
        id: 'Filter1', 
        inputs: ['jack-filter1In','jack-filter1fmIn'], 
        outputs: ['jack-filter1hpOut','jack-filter1lpOut'], 
        controls: ['knob-small-filter1fm', 'knob-large-filter1', 'knob-small-filter1res', 'switch-2way-filter1hp'] 
    },
    { 
        id: 'Filter2', 
        inputs: ['jack-filter2In','jack-filter2fmIn'], 
        outputs: ['jack-filter2hpOut','jack-filter2lpOut'], 
        controls: ['knob-small-filter2fm', 'knob-large-filter2', 'knob-small-filter2res', 'switch-2way-filter2hp'] 
    },
    { 
        id: 'Slopes1', 
        inputs: ['jack-slopes1in','jack-slopes1cvIn'], 
        outputs: ['jack-slopes1out'], 
        controls: ['knob-medium-slopes1', 'switch-3way-slopes1shape', 'switch-3way-slopes1loop'] 
    },
    { 
        id: 'Slopes2', 
        inputs: ['jack-slopes2in','jack-slopes2cvIn'], 
        outputs: ['jack-slopes2out'], 
        controls: ['knob-medium-slopes2', 'switch-3way-slopes2shape', 'switch-3way-slopes2loop'] 
    },
    { 
        id: 'Mixer', 
        inputs: ['jack-mixer1in','jack-mixer3in','jack-mixer2in','jack-mixer4in'], 
        outputs: ['jack-mixerLout','jack-mixerRout'], 
        controls: ['knob-small-mix1', 'knob-small-mix2', 'knob-small-mix3', 'knob-small-mix4', 'knob-small-mix1pan', 'knob-small-mix2pan', 'knob-large-volumeMain'] 
    }
]; 
const AUDIO_SOURCES = ['Osc1', 'Osc2', 'StereoIn', 'Computer', 'Stomp', 'Amp', 'RingMod, Slopes1', 'Slopes2'];



// --- PEDALBOARD LIBRARY ---

const PEDAL_DEFINITIONS = {
    dist: { 
        name: 'Distortion', class: 'pedal-dist', 
        knobs: [
            { id: 'p_dist_drive', label: 'Drive', def: 0 },
            { id: 'p_dist_tone', label: 'Tone', def: 50 },
            { id: 'p_dist_level', label: 'Level', def: 0 }
        ]
    },
    phaser: { 
        name: 'Phaser', class: 'pedal-phaser', 
        knobs: [
            { id: 'p_phaser_rate', label: 'Rate', def: -50 },
            { id: 'p_phaser_depth', label: 'Depth', def: 50 },
            { id: 'p_phaser_mix', label: 'Mix', def: 0 }
        ]
    },
    chorus: { 
        name: 'Chorus', class: 'pedal-chorus', 
        knobs: [
            { id: 'p_chorus_rate', label: 'Rate', def: -50 },
            { id: 'p_chorus_depth', label: 'Depth', def: 0 },
            { id: 'p_chorus_mix', label: 'Mix', def: 0 }
        ]
    },
    delay: { 
        name: 'Delay', class: 'pedal-delay', 
        knobs: [
            { id: 'p_delay_time', label: 'Time', def: 0 },
            { id: 'p_delay_fb', label: 'F.Back', def: -50 },
            { id: 'p_delay_mix', label: 'Mix', def: 0 }
        ]
    },
    reverb: { 
        name: 'Reverb', class: 'pedal-reverb', 
        knobs: [
            { id: 'p_rev_size', label: 'Size', def: 0 },
            { id: 'p_rev_mix', label: 'Mix', def: -50 }
        ]
    }
};


// --- 4 VOLTAGES LOOKUP TABLE ---
// Structure: [KnobPos 0-6][Output 0-3][ButtonState 0-15]
// Outputs: 0=Volt1, 1=Volt2, 2=Volt3, 3=Volt4
const VOLTAGE_TABLE = [
    // Position 0 (-150 deg)
    [
        [0, 31969, 33097, 31410, 21151, 19514, 20628, 18985, 28991, 27354, 28477, 26822, 16568, 14900, 16017, 14380], // V1
        [0, 29718, 32783, 28266, 29750, 25233, 28297, 23920, 21813, 17320, 20358, 15841, 17335, 12803, 15873, 11381], // V2
        [0, 24182, 33130, 20104, 35417, 22508, 31317, 18457, 32541, 19555, 28079, 15478, 30700, 17905, 26350, 13851], // V3
        [0, 39635, 33261, 28796, 42890, 39128, 32694, 28254, 41965, 38250, 31638, 27242, 41439, 37761, 31041, 26700]  // V4
    ],
    // Position 1 (-100 deg)
    [
        [0, 32463, 33585, 31898, 21768, 20128, 21191, 19559, 29535, 27922, 28960, 27324, 17207, 15539, 16662, 14972],
        [0, 29616, 32611, 28093, 29689, 25158, 28169, 23767, 21718, 17200, 20215, 15676, 17279, 12741, 15737, 11223],
        [0, 23312, 32053, 19040, 34700, 21649, 30213, 17398, 31628, 18667, 27031, 14420, 29797, 17021, 25318, 12788],
        [0, 37298, 30103, 25656, 40725, 36811, 29480, 25064, 39769, 35929, 28433, 24209, 39251, 35431, 27845, 23656]
    ],
    // Position 2 (-50 deg)
    [
        [0, 33453, 34522, 32877, 22880, 21224, 22285, 20657, 30519, 28896, 29936, 28516, 18354, 16713, 17768, 16141],
        [0, 29767, 32741, 28208, 29905, 25361, 28332, 23941, 21901, 17368, 20356, 16289, 17488, 12935, 15923, 11410],
        [0, 22850, 31463, 18466, 34335, 21196, 29633, 16834, 31168, 18197, 26452, 13969, 29354, 16581, 24769, 12229],
        [0, 35938, 28199, 23852, 39363, 35419, 27586, 23273, 38395, 34486, 26516, 22291, 37851, 33988, 25930, 21677]
    ],
    // Position 3 (0 deg)
    [
        [0, 34700, 35742, 34105, 24269, 22645, 23681, 22063, 31827, 30204, 31233, 29627, 19810, 18198, 19236, 17621],
        [0, 30073, 33068, 28495, 30294, 25743, 28681, 24279, 22225, 17711, 20652, 16107, 17899, 13351, 16299, 11785],
        [0, 22617, 31125, 18137, 34164, 20976, 29343, 16540, 30934, 17957, 26146, 13510, 29148, 16347, 24579, 11930],
        [0, 34990, 26947, 22558, 38458, 34467, 26335, 21975, 37490, 33489, 25261, 20934, 36972, 32888, 24672, 20390]
    ],
    // Position 4 (50 deg)
    [
        [0, 36467, 37476, 35910, 26119, 24575, 25538, 24108, 33705, 32081, 33116, 31487, 21900, 20322, 21317, 19748],
        [0, 30614, 33592, 28990, 30925, 26357, 29278, 24737, 22824, 18254, 21191, 16666, 18566, 13990, 16950, 12387],
        [0, 22534, 31002, 18003, 34138, 20937, 29244, 16418, 30884, 17889, 26031, 13364, 29119, 16297, 24534, 11813],
        [0, 34292, 26014, 21591, 37808, 33763, 25423, 21014, 36834, 32652, 24478, 19955, 36339, 32003, 23903, 19399]
    ],
    // Position 5 (100 deg)
    [
        [0, 39156, 40132, 38588, 29119, 27596, 28578, 27043, 36475, 34946, 35910, 34343, 24918, 23509, 24481, 22941],
        [0, 31508, 34424, 29863, 31915, 27383, 30267, 25753, 23730, 19202, 22096, 17582, 19613, 15071, 17981, 13438],
        [0, 22631, 31070, 18043, 34294, 21082, 29349, 16517, 31020, 17988, 26089, 13422, 29297, 16468, 24581, 11918],
        [0, 33775, 25303, 20859, 37329, 33197, 24740, 20314, 36366, 31994, 23776, 19217, 35852, 31345, 23203, 18666]
    ],
    // Position 6 (150 deg)
    [
        [0, 42362, 43308, 41810, 32862, 31371, 32311, 30833, 39890, 38411, 39357, 37854, 28772, 27316, 28263, 26777],
        [0, 32679, 35582, 31035, 33252, 28693, 31577, 27065, 24791, 20414, 23293, 18809, 20948, 16466, 19356, 14832],
        [0, 22995, 31432, 18383, 34668, 21499, 29795, 16908, 31441, 18366, 26460, 13778, 29784, 16892, 24949, 12317],
        [0, 33692, 25183, 20719, 37317, 33132, 24660, 20196, 36313, 31912, 23654, 19076, 35866, 31333, 23117, 18560]
    ]
];


// --- RANDOM NAME GENERATOR WORDS---
const ADJECTIVES = ['Chthonic', 'Ethereal', 'Nocturnal', 'Solarized', 'Fragmented', 'Subliminal', 'Prismatic', 'Dissonant', 'Liminal', 'Iridescent', 'Phantasmal', 'Cyclopean', 'Arcane', 'Transient', 'Baroque', 'Inevitable', 'Labyrinthine', 'Hypnotic', 'Profane', 'Ancestral', 'Mercurial', 'Pneumatic', 'Vorticose', 'Oblique', 'Inchoate', 'Antediluvian', 'Oracular', 'Sepulchral', 'Nebulous', 'Visceral', 'Fugitive', 'Incandescent', 'Apocalyptic', 'Monolithic', 'Cimmerian', 'Elegiac', 'Atemporal', 'Iconoclastic', 'Tectonic', 'Cacophonic', 'Feral', 'Empyrean', 'Synesthetic', 'Spectral', 'Voluptuous', 'Celestial', 'Somatic', 'Mythic', 'Penumbral', 'Zephyric', 'Eonian', 'Synthetic', 'Fragmentary', 'Ephemeral', 'Cinematic', 'Alchemical', 'Hermetic', 'Resonant', 'Anthropic', 'Dystopian', 'Byzantine', 'Uncanny', 'Mesmerizing', 'Primordial', 'Exquisite', 'Vitreous', 'Dramatic', 'Epiphanic', 'Ornamental', 'Stygian', 'Archaic', 'Elliptical', 'Vibratory', 'Omniscient', 'Verdant', 'Transcendent', 'Ebullient', 'Multivalent', 'Postmodern', 'Psychedelic', 'Esoteric', 'Subterranean', 'Effervescent', 'Phosphorescent', 'Cataclysmic', 'Mnemonic', 'Kaleidoscopic', 'Inscrutable'];
const NOUNS = ['Resonance', 'Abyss', 'Continuum', 'Palimpsest', 'Ritual', 'Obelisk', 'Cipher', 'Emanation', 'Labyrinth', 'Monad', 'Epiphany', 'Gnosis', 'Mythos', 'Cathedral', 'Phantasm', 'Paradox', 'Eidolon', 'Chimera', 'Pantheon', 'Omphalos', 'Threshold', 'Sanctum', 'Totem', 'Eclipse', 'Archipelago', 'Coven', 'Sigil', 'Mandala', 'Nebula', 'Omen', 'Artifact', 'Oblivion', 'Shrine', 'Dome', 'Seance', 'Hieroglyph', 'Anthem', 'Conduit', 'Sarcophagus', 'Shard', 'Talisman', 'Horizon', 'Fragment', 'Cairn', 'Rapture', 'Cascade', 'Aperture', 'Helix', 'Mosaic', 'Specter', 'Vortex', 'Pyramid', 'Obfuscation', 'Carnival', 'Lattice', 'Beacon', 'Ascension', 'Echo', 'Shadow', 'Fissure', 'Enigma', 'Maelstrom', 'Silhouette', 'Chord', 'Memento', 'Oracle', 'Hymn', 'Pathos', 'Monolith', 'Amulet', 'Tapestry', 'Entropic', 'Quasar', 'Verge', 'Cenotaph', 'Vision', 'Reverie', 'Halcyon', 'Interval', 'Phalanx', 'Etherea', 'Chorus', 'Dissonance', 'Phenomenon', 'Corpus', 'Interstice', 'Frequency', 'Synthesis', 'Glyph', 'Antiphony', 'Timbre', 'Aether'];

// --- CABLES COLOR PALETTE ---
const CABLE_PALETTE = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#fbbf24', // Amber (Visible on dark)
    '#facc15', // Yellow
    '#84cc16', // Lime
    '#22c55e', // Green
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#9ca3af', // Grey
    '#1f2937', // Dark (Not pure black)
    '#bbbbbb'  // Light (Not pure white)
];


// --- DYNAMIC VARIABLES ---


// --- 1. VIEWPORT & CONFIGURATION ---
var VIEWPORT = {
    scale: 1.0,
    x: 0,
    y: 0,
    isPanning: false,
    lastX: 0,
    lastY: 0
};

// Signal Flow: Right to Left
let activePedalChain = ['reverb', 'delay', 'chorus', 'phaser', 'dist'];

// Palette
let isRandomColorMode = true; 
let selectedCableColor = '#ef4444';
let lastRandomColorIndex = -1;

const PNG_KEYWORD = "MTM_PATCH_DATA";
const MAX_HISTORY = 50;

// =========================================================================
// 2. GLOBAL STATE VARIABLES
// =========================================================================

// --- Data Stores ---
let cableData = [];
let noteData = [];
let componentStates = {};
let history = [];
let historyIndex = -1;

// --- Interaction State ---
let currentCableStart = null;
let isDraggingCable = false;
let currentDraggedCable = null;
let isCableFramePending = false; // <--- ADDED: Fixes your "ReferenceError"
let isCablePickupMode = false;
let isDroopDrag = false;
let initialCableDragY = 0;
let initialDroopOffset = 0;
let zombieHitPath = null;
let dragStartTime = 0;
let dragStartX = 0;
let dragStartY = 0;

// --- Knobs & Notes ---
let isDraggingKnob = false;
let currentKnobElement = null;
let isNoteDragging = false;
let currentNoteElement = null;
let startNoteDragX;
let startNoteDragY;

// --- Switches & Chassis ---
let isDraggingSwitch = false;
let currentSwitchEl = null;
let switchStartY = 0;
let switchStartX = 0;
let switchStartVal = 0;
let hasSwitchMoved = false;
let lastScratchAngle = 0;
let isDraggingChassis = false;
let lastChassisPos = { x: 0, y: 0 };
let lastJackActionTime = 0;

// --- Context Menus ---
let contextTarget = null;
let contextCable = null;
let contextPedalId = null;

// --- Audio / System State ---
let micEnabled = false; 
let midiEnabled = false; 
let micSource = null; 
let isBuildingAudioGraph = false;
let isPerformanceMode = false;
let smoothAmpLevel = 0;
let activeComputerCard = null;

// --- Audio Context & Scope ---
let audioCtx = null;
let audioNodes = {}; 
let midiAccess = null;
let selectedMidiInput = null;

let scopeAnalyser1 = null, scopeAnalyser2 = null;
let scopeFreq1 = null, scopeFreq2 = null;
let scopeData1 = null, scopeData2 = null;
let scopeBufferLength = 0;
let scopeSpecMode = false;
let scopeXYMode = false;
let scopeFrozen = false;
let isScopeRunning = false;

// Circular Scope History
const MAX_ROLL_HISTORY = 4096; 
let rollingData1 = new Float32Array(MAX_ROLL_HISTORY).fill(0);
let rollingData2 = new Float32Array(MAX_ROLL_HISTORY).fill(0);
let rollHead = 0; 

let globalJackMap = {}; 
let activeProbes = [null, null]; 
let scopeProbes = { ch1: null, ch2: null }; 
let resizeObserver = null;

let slopesWaves = { log: null, exp: null, bentTri: null };

// =========================================================================
// 3. GLOBAL HELPER FUNCTIONS
// These must be here so ui.js and main.js can both see them.
// =========================================================================

function getRandomColor() {
    return CABLE_PALETTE[Math.floor(Math.random() * CABLE_PALETTE.length)];
}

function getActiveCableColor() {
    if (isRandomColorMode) return getRandomColor();
    return selectedCableColor;
}

// Helper to find connections
function getCableByIds(s, e) {
    return cableData.find(c => (c.start === s && c.end === e) || (c.start === e && c.end === s));
}

// Helper to get mouse position relative to the synth container (accounting for zoom)
function getPos(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    
    const rect = el.getBoundingClientRect();
    const container = document.getElementById('synthContainer');
    if (!container) return null;
    
    const contRect = container.getBoundingClientRect();
    // Use the global VIEWPORT.scale
    const currentScale = (typeof VIEWPORT !== 'undefined') ? VIEWPORT.scale : 1.0;

    return {
        x: ((rect.left + rect.width / 2) - contRect.left) / currentScale,
        y: ((rect.top + rect.height / 2) - contRect.top) / currentScale
    };
}

// Helper to normalize touch/mouse events
function getEventPos(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}

// *** THE MISSING FUNCTION THAT CAUSED YOUR ERROR ***
function findNearestJack(x, y) {
    // Ensure SYSTEM_CONFIG exists (it should be in config.js)
    if (typeof SYSTEM_CONFIG === 'undefined') return null;

    const currentScale = (typeof VIEWPORT !== 'undefined' && VIEWPORT.scale) ? VIEWPORT.scale : 1.0;
    const threshold = 25 * currentScale;
    let nearestId = null;
    let minDist = Infinity;

    for (const [id, config] of Object.entries(SYSTEM_CONFIG)) {
        // We only care about jacks
        if (!config.type.includes('jack')) continue;

        const el = document.getElementById(id);
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        const jackX = rect.left + rect.width / 2;
        const jackY = rect.top + rect.height / 2;
        const dist = Math.sqrt(Math.pow(x - jackX, 2) + Math.pow(y - jackY, 2));

        if (dist < threshold && dist < minDist) {
            minDist = dist;
            nearestId = id;
        }
    }
    return nearestId;
}

function getModuleIndexByJack(jackId) {
    // Requires MODULES_MAP from config.js
    if (typeof MODULES_MAP === 'undefined') return -1;
    return MODULES_MAP.findIndex(m => m.inputs.includes(jackId) || m.outputs.includes(jackId));
}


// =========================================================================
// 4. CARD REGISTRY SYSTEM
// =========================================================================

// Initialize the global registry array
window.AVAILABLE_CARDS = [];

// Define the registration function
window.registerCard = function(cardClass) {
    if (!cardClass || !cardClass.meta) {
        console.warn("Attempted to register invalid card:", cardClass);
        return;
    }

    // Prevent duplicates
    if (window.AVAILABLE_CARDS.some(c => c.id === cardClass.meta.id)) return;

    // Add to registry
    window.AVAILABLE_CARDS.push({
        ...cardClass.meta, // Spread static meta (id, name, num, desc)
        class: cardClass   // Attach the class constructor
    });

    // Optional: Sort by number (if 'num' exists) to keep the list tidy
    window.AVAILABLE_CARDS.sort((a, b) => {
        if (!a.num) return 1;
        if (!b.num) return -1;
        return parseInt(a.num) - parseInt(b.num);
    });
    
    console.log(`Registered Card: ${cardClass.meta.name}`);
};

