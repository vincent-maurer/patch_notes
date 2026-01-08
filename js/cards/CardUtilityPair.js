class CardUtilityPair extends ComputerCard {
    static meta = {
        id: 'utility_pair',
        name: 'Utility Pair',
        num: '25',
        desc: "25 small utilities in pairs. Use dropdowns to select utilities for each channel independently.",
        category: 'Utility'
    };

    constructor(ctx, io) {
        super(ctx, io);
        this.ctx = ctx;
        this.io = io;

        // Separate utility selection for left (0) and right (1) channels
        this.utilityIndexL = 0; // VCA by default
        this.utilityIndexR = 0; // VCA by default

        // Audio processing nodes (created per utility as needed)
        this.nodesL = {};
        this.nodesR = {};

        // Initialize utility implementations
        this.initializeUtilities();

        // Card-specific UI elements
        this.uiElements = null;
        this.resizeHandler = null;

        // Worklet initialization
        this.workletReady = false;
        this.baseWorkletUrl = null;
        this.initWorklet();
    }

    initializeUtilities() {
        // Map of utility implementations
        this.utilities = {
            vca: this.createVCA.bind(this),
            delay: this.createDelay.bind(this),
            sandh: this.createLogicUtility.bind(this, 'sandh'),
            attenuvert: this.createAttenuverter.bind(this),
            cvmix: this.createCVMix.bind(this),
            cross: this.createCrossSwitch.bind(this),
            windowcomp: this.createLogicUtility.bind(this, 'windowcomp'),
            clockdiv: this.createLogicUtility.bind(this, 'clockdiv'),
            pulsegen: this.createLogicUtility.bind(this, 'pulsegen'),
            bernoulli: this.createLogicUtility.bind(this, 'bernoulli'),
            wavefolder: this.createLogicUtility.bind(this, 'wavefolder'),
            bitcrush: this.createBitcrusher.bind(this),
            euclidean: this.createLogicUtility.bind(this, 'euclidean'),
            quantiser: this.createLogicUtility.bind(this, 'quantiser'),
            looper: this.createLogicUtility.bind(this, 'looper'),
            glitch: this.createLogicUtility.bind(this, 'glitch'),
            turing185: this.createLogicUtility.bind(this, 'turing185'),
            slowlfo: this.createSlowLFO.bind(this),
            supersaw: this.createSupersaw.bind(this),
            chords: this.createChords.bind(this),
            lpg: this.createLogicUtility.bind(this, 'lpg'),
            chorus: this.createLogicUtility.bind(this, 'chorus'),
            vco: this.createLogicUtility.bind(this, 'vco'),
            karplusstrong: this.createLogicUtility.bind(this, 'karplusstrong'),
            maxrect: this.createLogicUtility.bind(this, 'maxrect'),
            slopesplus: this.createLogicUtility.bind(this, 'slopesplus')
        };
    }

    createSelectionUI() {
        try {
            this.removeSelectionUI();

            // Find containers
            const synthContainer = document.getElementById('synthContainer');
            const cardSlot = document.getElementById('computerCardSlot');
            if (!synthContainer || !cardSlot) return;

            // Check if library is loaded
            if (typeof UTILITY_PAIR_LIBRARY === 'undefined' || !UTILITY_PAIR_LIBRARY || UTILITY_PAIR_LIBRARY.length === 0) {
                console.error('UTILITY_PAIR_LIBRARY not loaded!');
                return;
            }

            // Create utility pair controls container
            const container = document.createElement('div');
            container.id = 'utility-pair-controls';
            container.className = 'utility-pair-controls';

            // Fixed position in bottom left
            container.style.cssText = `
                position: absolute;
                bottom: 20px;
                left: 20px;
                display: flex;
                gap: 8px;
                align-items: center;
                background: var(--bg-elevated, #2a2a2a);
                border: 1px solid var(--border-color, #444);
                border-radius: 6px;
                padding: 4px 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                z-index: 10;
                font-size: 10px;
                pointer-events: auto;
                transition: opacity 0.2s;
            `;

            // Left Channel Dropdown
            const labelL = document.createElement('span');
            labelL.textContent = 'L:';
            labelL.style.cssText = 'color: var(--text-color, #fff); font-weight: bold; font-size: 9px;';

            const selectL = document.createElement('select');
            selectL.id = 'utility-select-L';
            selectL.className = 'utility-select';
            selectL.style.cssText = `
                background: var(--input-bg, #1a1a1a);
                color: var(--text-color, #fff);
                border: 1px solid var(--border-color, #555);
                border-radius: 4px;
                padding: 2px 4px;
                font-size: 9px;
                cursor: pointer;
                min-width: 90px;
                max-width: 110px;
            `;

            // Right Channel Dropdown
            const labelR = document.createElement('span');
            labelR.textContent = 'R:';
            labelR.style.cssText = 'color: var(--text-color, #fff); font-weight: bold; font-size: 9px; margin-left: 4px;';

            const selectR = document.createElement('select');
            selectR.id = 'utility-select-R';
            selectR.className = 'utility-select';
            selectR.style.cssText = selectL.style.cssText;

            // Populate dropdowns with single list using (V) for implemented
            // Almost all are implemented now via AudioWorklet updates
            const implementedIds = [
                'vca', 'delay', 'attenuvert', 'cvmix', 'cross',
                'wavefolder', 'bitcrush', 'slowlfo', 'supersaw',
                'chords', 'lpg', 'chorus', 'maxrect',
                'turing185', 'looper', 'glitch', 'bernoulli',
                'quantiser', 'sandh', 'windowcomp', 'slopesplus',
                'clockdiv', 'euclidean', 'vco', 'karplusstrong'
            ];

            (window.UTILITY_PAIR_LIBRARY || []).forEach((util, index) => {
                const isimpl = implementedIds.includes(util.id);
                const suffix = isimpl ? '' : '';

                const optionL = document.createElement('option');
                optionL.value = index;
                optionL.textContent = util.name + suffix;
                optionL.title = util.desc || util.fullName;

                const optionR = document.createElement('option');
                optionR.value = index;
                optionR.textContent = util.name + suffix;
                optionR.title = util.desc || util.fullName;

                selectL.appendChild(optionL);
                selectR.appendChild(optionR);
            });

            // Set current values
            selectL.value = this.utilityIndexL;
            selectR.value = this.utilityIndexR;

            // Handle selection changes
            selectL.addEventListener('change', (e) => {
                e.stopPropagation();
                this.selectUtility(parseInt(e.target.value), 'L');
            });

            selectR.addEventListener('change', (e) => {
                e.stopPropagation();
                this.selectUtility(parseInt(e.target.value), 'R');
            });

            // Inject Styles for Export
            const style = document.createElement('style');
            style.textContent = `
                .utility-print-label { display: none; }
                body.exporting .utility-print-label { display: inline-block; font-size: 10px; border: 1px solid #777; padding: 2px 4px; border-radius: 4px; color: black; background: white; white-space: nowrap; }
                body.exporting .utility-select { display: none !important; }
            `;
            container.appendChild(style);

            // Print Labels
            const printLabelL = document.createElement('span');
            printLabelL.id = 'utility-print-L';
            printLabelL.className = 'utility-print-label';
            if (UTILITY_PAIR_LIBRARY[this.utilityIndexL]) {
                printLabelL.textContent = UTILITY_PAIR_LIBRARY[this.utilityIndexL].name;
            }

            const printLabelR = document.createElement('span');
            printLabelR.id = 'utility-print-R';
            printLabelR.className = 'utility-print-label';
            if (UTILITY_PAIR_LIBRARY[this.utilityIndexR]) {
                printLabelR.textContent = UTILITY_PAIR_LIBRARY[this.utilityIndexR].name;
            }

            // Assemble UI
            container.appendChild(labelL);
            container.appendChild(selectL);
            container.appendChild(printLabelL);
            container.appendChild(labelR);
            container.appendChild(selectR);
            container.appendChild(printLabelR);

            // Prevent events from bubbling to card slot
            container.addEventListener('mousedown', e => e.stopPropagation());
            container.addEventListener('click', e => e.stopPropagation());
            container.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });

            // Add to synth container
            synthContainer.appendChild(container);
            this.uiElements = container;

            // Note: Position is fixed via CSS now, no update needed.

            this.resizeHandler = () => this.updateUIPosition(); // Keep handler but it's no-op
            window.addEventListener('resize', this.resizeHandler);
        } catch (error) {
            console.error('Error creating utility pair UI:', error);
        }
    }

    removeSelectionUI() {
        // Robust removal by ID as well to prevent "ghost" menus
        const existing = document.getElementById('utility-pair-controls');
        if (existing) existing.remove();

        if (this.uiElements) {
            this.uiElements.remove();
            this.uiElements = null;
        }
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
    }

    updateUIPosition() {
        // Position is now fixed via CSS in createSelectionUI (bottom left)
        // No dynamic calculation needed.
    }

    selectUtility(index, channel) {
        console.log(`Switching ${channel} channel to: ${UTILITY_PAIR_LIBRARY[index].name}`);

        // Update index
        if (channel === 'L') {
            this.utilityIndexL = index;
            this.unmountChannel('L');
            if (this.ctx && this.io) {
                this.mountChannel('L');
            }
        } else {
            this.utilityIndexR = index;
            this.unmountChannel('R');
            if (this.ctx && this.io) {
                this.mountChannel('R');
            }
        }

        // Update dynamic labels for the instance
        this.updateLabels();

        // Update Print Labels
        const printL = document.getElementById('utility-print-L');
        const printR = document.getElementById('utility-print-R');
        if (printL && UTILITY_PAIR_LIBRARY[this.utilityIndexL]) printL.textContent = UTILITY_PAIR_LIBRARY[this.utilityIndexL].name;
        if (printR && UTILITY_PAIR_LIBRARY[this.utilityIndexR]) printR.textContent = UTILITY_PAIR_LIBRARY[this.utilityIndexR].name;

        // Save state
        if (typeof saveState === 'function') {
            saveState();
        }
    }

    unmountChannel(channel) {
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;

        // Disconnect all nodes for this channel
        Object.values(nodes).forEach(node => {
            try {
                node.disconnect();
            } catch (e) {
                // Already disconnected
            }
        });

        if (channel === 'L') {
            this.nodesL = {};
        } else {
            this.nodesR = {};
        }
    }

    mountChannel(channel) {
        const index = channel === 'L' ? this.utilityIndexL : this.utilityIndexR;
        const utilityId = UTILITY_PAIR_LIBRARY[index].id;
        const createFunc = this.utilities[utilityId];

        if (createFunc) {
            createFunc(channel);
        } else {
            console.warn(`Utility ${utilityId} not yet implemented for channel ${channel}`);
            this.createPassThrough(channel);
        }
    }

    updateLabels() {
        const utilityL = UTILITY_PAIR_LIBRARY[this.utilityIndexL];
        const utilityR = UTILITY_PAIR_LIBRARY[this.utilityIndexR];

        const newLabels = {
            'knob-large-computer': 'Main',
            'switch-3way-computer': 'Mode'
        };

        // Helper to map generic labels to channel IDs
        const mapLabels = (util, channel) => {
            if (!util || !util.labels) return;
            const suffix = channel === 'L' ? '1' : '2';
            const knobKey = channel === 'L' ? 'knob-small-x' : 'knob-small-y';

            if (util.labels.knob) newLabels[knobKey] = Array.isArray(util.labels.knob) ? util.labels.knob[channel === 'L' ? 0 : 1] : util.labels.knob;
            if (util.labels.in) newLabels[`jack-audio${suffix}in`] = (Array.isArray(util.labels.in) ? util.labels.in[channel === 'L' ? 0 : 1] : util.labels.in).replace('L ', channel + ' ');
            if (util.labels.out) newLabels[`jack-audio${suffix}out`] = (Array.isArray(util.labels.out) ? util.labels.out[channel === 'L' ? 0 : 1] : util.labels.out).replace('L ', channel + ' ');
            if (util.labels.cv) newLabels[`jack-cv${suffix}in`] = Array.isArray(util.labels.cv) ? util.labels.cv[channel === 'L' ? 0 : 1] : util.labels.cv;
            if (util.labels.sub) {
                const label = Array.isArray(util.labels.sub) ? util.labels.sub[channel === 'L' ? 0 : 1] : util.labels.sub;
                if (channel === 'L') newLabels['knob-large-computer'] = label;
                else newLabels['switch-3way-computer'] = label;
            }
            if (util.labels.pulseIn) newLabels[`jack-pulse${suffix}in`] = Array.isArray(util.labels.pulseIn) ? util.labels.pulseIn[channel === 'L' ? 0 : 1] : util.labels.pulseIn;
            if (util.labels.pulseOut) newLabels[`jack-pulse${suffix}out`] = Array.isArray(util.labels.pulseOut) ? util.labels.pulseOut[channel === 'L' ? 0 : 1] : util.labels.pulseOut;
        };

        mapLabels(utilityL, 'L');
        mapLabels(utilityR, 'R');

        // Store in instance for global renderer
        this.labels = newLabels;

        // Trigger global UI update
        if (typeof renderComponentLabels === 'function') {
            renderComponentLabels();
        }
    }

    mount() {
        try {
            super.mount();
            this.createSelectionUI();

            // Only mount channels if audio context exists
            if (this.ctx && this.io) {
                this.mountChannel('L');
                this.mountChannel('R');
            }

            this.updateLabels();
        } catch (error) {
            console.error('Error mounting Utility Pair:', error);
        }
    }

    unmount() {
        try {
            super.unmount();
            this.unmountChannel('L');
            this.unmountChannel('R');
            this.removeSelectionUI();
        } catch (error) {
            console.warn('Error unmounting Utility Pair:', error);
        }
    }

    update(params, time) {
        // Delegate to each channel's utility
        this.updateChannel('L', params, time);
        this.updateChannel('R', params, time);
    }

    updateChannel(channel, params, time) {
        const index = channel === 'L' ? this.utilityIndexL : this.utilityIndexR;
        const utilityId = UTILITY_PAIR_LIBRARY[index].id;
        const updateMethod = this[`update_${utilityId}`];

        if (updateMethod) {
            updateMethod.call(this, params, time, channel);
        }
    }

    // --- MAX / RECTIFIER ---
    createMaxRect(channel) {
        if (!this.ctx) return;
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;

        // Rectifier: Absolute value of CV Input
        nodes.cvGain = this.ctx.createGain();
        nodes.rectifier = this.ctx.createWaveShaper();
        nodes.rectifier.curve = new Float32Array([1, 0, 1]); // Simple Absolute Value curve (-1->1, 0->0, 1->1)

        // Attenuverter for CV
        nodes.attenGain = this.ctx.createGain();

        // Max Logic: Since we can't do true Max(A, B) easily with nodes without specific MaxNode (not std),
        // we can approximate or just use the Rectifier functionality described.
        // "Outputs the maximum of the Audio and CV input signals... CV input is normalised to the inverse of the audio input... turning it into rectifier"
        // If we just implement the Rectifier part as that's the main utility described for CV.

        this.io.cv1In.connect(nodes.rectifier).connect(nodes.attenGain).connect(this.io.cv1Out);

        // Pass audio through? Description says "Outputs max of Audio and CV".
        // Let's implement CV Rectifier mainly.
        this.io.inputL.connect(this.io.outputL);
    }

    update_maxrect(params, time, channel) {
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;
        if (!nodes.attenGain) return;

        // Attenuverter control
        // Knob X/Y
        let atten = (params.x - 0.5) * 2;
        if (channel === 'R') atten = (params.y - 0.5) * 2;

        safeParam(nodes.attenGain.gain, atten, time);
    }



    // --- PLACEHOLDERS ---
    // --- SLOWLFO ---
    createSlowLFO(channel) {
        if (!this.ctx) return;
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;

        nodes.osc = this.ctx.createOscillator();
        nodes.osc.type = 'sine';
        nodes.osc.start();

        nodes.gainAudio = this.ctx.createGain();
        nodes.gainCV = this.ctx.createGain();

        // Output to AudioOut and CVOut?
        // Manual: "Pair of slow... LFOs... Rate controllable... LFOs go in and out of phase"
        // Implementing simple single LFO for now
        nodes.osc.connect(nodes.gainAudio).connect(this.io.outputL);
        nodes.osc.connect(nodes.gainCV).connect(this.io.cv1Out); // Connect to CV out too?

        if (channel === 'R') {
            nodes.osc.disconnect();
            nodes.osc.connect(nodes.gainAudio).connect(this.io.outputR);
            nodes.osc.connect(nodes.gainCV).connect(this.io.cv2Out);
        }
    }

    update_slowlfo(params, time, channel) {
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;
        if (!nodes.osc) return;

        // Rate control: 0.01Hz to 1Hz?
        const rate = Math.pow(params.x, 3) * 5 + 0.01;
        safeParam(nodes.osc.frequency, rate, time);

        // Amplitude?
        safeParam(nodes.gainAudio.gain, 1, time);
        safeParam(nodes.gainCV.gain, 1, time);
    }

    // --- SUPERSAW ---
    createSupersaw(channel) {
        if (!this.ctx) return;
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;

        nodes.oscs = [];
        nodes.gain = this.ctx.createGain();
        nodes.gain.gain.value = 0.3; // Normalize volume

        // Create 3 oscs for supersaw effect
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.start();
            osc.connect(nodes.gain);
            nodes.oscs.push(osc);
        }

        if (channel === 'L') {
            nodes.gain.connect(this.io.outputL);
        } else {
            nodes.gain.connect(this.io.outputR);
        }
    }

    update_supersaw(params, time, channel) {
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;
        if (!nodes.oscs) return;

        // Pitch Control: params.x (L) or params.y (R)
        // Detune: params.main (L) or params.switch (R)

        let pitchCtrl, detuneCtrl;
        if (channel === 'L') {
            pitchCtrl = params.x;
            detuneCtrl = params.main;
        } else {
            pitchCtrl = params.y;
            // Switch Z: 0, 1, 2 -> Normalize to 0..1
            detuneCtrl = (params.switch || 0) / 2;
        }

        const baseFreq = 261.63 * Math.pow(2, (pitchCtrl - 0.5) * 4);
        const detuneSpread = detuneCtrl * 50;

        nodes.oscs.forEach((osc, i) => {
            const offset = (i - 1) * detuneSpread;
            safeParam(osc.frequency, baseFreq, time);
            safeParam(osc.detune, offset, time);
        });
    }

    // --- CHORDS ---
    createChords(channel) {
        if (!this.ctx) return;
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;
        nodes.oscs = [];
        nodes.gain = this.ctx.createGain();
        nodes.gain.gain.value = 0.3;

        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            osc.type = 'square';
            osc.start();
            osc.connect(nodes.gain);
            nodes.oscs.push(osc);
        }

        if (channel === 'L') {
            nodes.gain.connect(this.io.outputL);
        } else {
            nodes.gain.connect(this.io.outputR);
        }
    }

    update_chords(params, time, channel) {
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;
        if (!nodes.oscs) return;

        let pitchCtrl, typeCtrl;
        if (channel === 'L') {
            pitchCtrl = params.x;
            typeCtrl = params.main;
        } else {
            pitchCtrl = params.y;
            // Switch Z: 0, 1, 2 -> Normalize to 0..1
            typeCtrl = (params.switch || 0) / 2;
        }

        const rootFreq = 261.63 * Math.pow(2, (pitchCtrl - 0.5) * 4);
        // Chord Types selected by secondary
        const type = Math.floor(typeCtrl * 7.99);

        const chords = [
            [0, 300, 700], // Minor
            [0, 400, 700], // Major
            [0, 300, 600], // Dim
            [0, 400, 800], // Aug
            [0, 700, 1200], // Power 
            [0, 500, 1000], // Sus4
            [0, 200, 700], // Sus2
            [0, 1200, 2400] // Octaves
        ];
        const selectedChord = chords[type] || chords[0];

        nodes.oscs.forEach((osc, i) => {
            safeParam(osc.frequency, rootFreq, time);
            safeParam(osc.detune, selectedChord[i] || 0, time);
        });
    }

    update_chorus(p, t, c) { this.updateLogic(p, t, c, 'chorus'); }

    // --- BITCRUSHER ---
    createBitcrusher(channel) {
        if (!this.ctx) return;
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;

        nodes.shaper = this.ctx.createWaveShaper();
        // Initial curve
        nodes.shaper.curve = new Float32Array([-1, 0, 1]);

        nodes.preGain = this.ctx.createGain();

        if (channel === 'L') {
            this.io.inputL.connect(nodes.preGain).connect(nodes.shaper).connect(this.io.outputL);
        } else {
            this.io.inputR.connect(nodes.preGain).connect(nodes.shaper).connect(this.io.outputR);
        }
    }

    update_bitcrush(params, time, channel) {
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;
        if (!nodes.shaper) return;

        let rateCtrl, depthCtrl;
        if (channel === 'L') {
            rateCtrl = params.x;
            depthCtrl = params.main;
        } else {
            rateCtrl = params.y;
            depthCtrl = (params.switch || 0) / 2;
        }

        const bits = Math.floor(depthCtrl * 8) + 1;
        const steps = Math.pow(2, bits);

        if (nodes.lastBits !== bits) {
            const curve = new Float32Array(4096);
            for (let i = 0; i < 4096; i++) {
                const x = (i / 4096) * 2 - 1;
                curve[i] = Math.round(x * steps) / steps;
            }
            nodes.shaper.curve = curve;
            nodes.lastBits = bits;
        }

        // Sample Rate Logic (Knob X/Y)
        // Currently unimplemented in WaveShaper node, but label is set.
        // Ideally needs AudioWorklet or ScriptProcessor.
        // For now, we align the Bit Depth to the correct knob.
    }


    update_vco(p, t, c) { this.updateLogic(p, t, c, 'vco'); }
    update_looper(p, t, c) { this.updateLogic(p, t, c, 'looper'); }
    update_glitch(p, t, c) { this.updateLogic(p, t, c, 'glitch'); }
    update_turing185(p, t, c) { this.updateLogic(p, t, c, 'turing185'); }
    update_karplusstrong(p, t, c) { this.updateLogic(p, t, c, 'karplusstrong'); }
    update_windowcomp(p, t, c) { this.updateLogic(p, t, c, 'windowcomp'); }
    update_clockdiv(p, t, c) { this.updateLogic(p, t, c, 'clockdiv'); }
    update_pulsegen(p, t, c) { this.updateLogic(p, t, c, 'pulsegen'); }
    update_bernoulli(p, t, c) { this.updateLogic(p, t, c, 'bernoulli'); }
    update_euclidean(p, t, c) { this.updateLogic(p, t, c, 'euclidean'); }
    update_quantiser(p, t, c) { this.updateLogic(p, t, c, 'quantiser'); }
    update_slopesplus(p, t, c) { this.updateLogic(p, t, c, 'slopesplus'); }
    update_lpg(p, t, c) { this.updateLogic(p, t, c, 'lpg'); }
    update_sandh(p, t, c) { this.updateLogic(p, t, c, 'sandh'); }
    update_wavefolder(p, t, c) { this.updateLogic(p, t, c, 'wavefolder'); }

    // Save/Load State
    getState() {
        return {
            utilityIndexL: this.utilityIndexL,
            utilityIndexR: this.utilityIndexR
        };
    }

    setState(state) {
        if (state && typeof state === 'object') {
            this.utilityIndexL = state.utilityIndexL !== undefined ? state.utilityIndexL : 0;
            this.utilityIndexR = state.utilityIndexR !== undefined ? state.utilityIndexR : 0;

            // Update UI if it exists
            const selectL = document.getElementById('utility-select-L');
            const selectR = document.getElementById('utility-select-R');
            if (selectL) selectL.value = this.utilityIndexL;
            if (selectR) selectR.value = this.utilityIndexR;

            const printL = document.getElementById('utility-print-L');
            const printR = document.getElementById('utility-print-R');
            if (printL && UTILITY_PAIR_LIBRARY[this.utilityIndexL]) printL.textContent = UTILITY_PAIR_LIBRARY[this.utilityIndexL].name;
            if (printR && UTILITY_PAIR_LIBRARY[this.utilityIndexR]) printR.textContent = UTILITY_PAIR_LIBRARY[this.utilityIndexR].name;

            // Remount with new utilities
            this.unmountChannel('L');
            this.unmountChannel('R');
            if (this.ctx && this.io) {
                this.mountChannel('L');
                this.mountChannel('R');
            }
            this.updateLabels();
        }
    }

    // =========================================================================
    // UTILITY IMPLEMENTATIONS
    // =========================================================================

    createPassThrough(channel) {
        // Simple pass-through for unimplemented utilities
        if (!this.io) return;

        if (channel === 'L') {
            this.io.inputL.connect(this.io.outputL);
            this.io.cv1In.connect(this.io.cv1Out);
        } else {
            this.io.inputR.connect(this.io.outputR);
            this.io.cv2In.connect(this.io.cv2Out);
        }
    }

    // --- WORKLET LOGIC ---
    async initWorklet() {
        if (this.workletReady) return;
        try {
            const blob = new Blob([UTILITY_WORKLET_SOURCE], { type: 'application/javascript' });
            this.baseWorkletUrl = URL.createObjectURL(blob);
            await this.ctx.audioWorklet.addModule(this.baseWorkletUrl);
            this.workletReady = true;
            console.log('UtilityWorklet loaded.');
        } catch (e) {
            console.error('Failed to load UtilityWorklet:', e);
        }
    }

    createLogicUtility(id, channel) {
        if (!this.workletReady) {
            console.warn('Worklet not ready, retrying ' + id);
            setTimeout(() => { if (channel === 'L' && this.utilityIndexL >= 0) this.mountChannel(channel); else if (channel === 'R' && this.utilityIndexR >= 0) this.mountChannel(channel); }, 500);
            this.createPassThrough(channel);
            return;
        }

        const nodes = channel === 'L' ? this.nodesL : this.nodesR;

        const MODES = {
            'bernoulli': 1, 'clockdiv': 2, 'sandh': 3, 'windowcomp': 4,
            'pulsegen': 5, 'euclidean': 6, 'quantiser': 7, 'turing185': 8,
            'looper': 9, 'glitch': 10, 'slopesplus': 11, 'vco': 12,
            'karplusstrong': 13, 'lpg': 14, 'wavefolder': 15, 'maxrect': 16,
            'chorus': 17
        };
        const modeId = MODES[id] || 0;

        const workletNode = new AudioWorkletNode(this.ctx, 'utility-processor', {
            numberOfInputs: 3,
            numberOfOutputs: 3,
            outputChannelCount: [1, 1, 1],
            parameterData: { 'mode': modeId }
        });

        nodes.worklet = workletNode;

        if (channel === 'L') {
            if (this.io.pulse1In) this.io.pulse1In.connect(workletNode, 0, 0);
            this.io.inputL.connect(workletNode, 0, 1);
            this.io.cv1In.connect(workletNode, 0, 2);

            if (this.io.pulse1Out) workletNode.connect(this.io.pulse1Out, 0, 0);
            workletNode.connect(this.io.outputL, 1, 0);
            workletNode.connect(this.io.cv1Out, 2, 0);
        } else {
            if (this.io.pulse2In) this.io.pulse2In.connect(workletNode, 0, 0);
            this.io.inputR.connect(workletNode, 0, 1);
            this.io.cv2In.connect(workletNode, 0, 2);

            if (this.io.pulse2Out) workletNode.connect(workletNode, 0, 0);
            workletNode.connect(this.io.outputR, 1, 0);
            workletNode.connect(this.io.cv2Out, 2, 0);
        }
    }

    updateLogic(params, time, channel, id) {
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;
        if (!nodes.worklet) return;

        const p = nodes.worklet.parameters;

        let v1 = params.x;
        let v2 = params.y;
        let mainVal = params.main;

        // Swap for Right channel so P1 is controlled by Y (Right Knob)
        if (channel === 'R') {
            v1 = params.y;
            v2 = params.x;
            // Right Channel Secondary is Switch Z (0, 1, 2)
            // Normalize to 0.0, 0.5, 1.0 to match pMain expectations
            mainVal = (params.switch || 0) / 2;
        }

        if (p.get('p1')) p.get('p1').linearRampToValueAtTime(v1, time + 0.05);
        if (p.get('p2')) p.get('p2').linearRampToValueAtTime(v2, time + 0.05);
        if (p.get('pMain')) p.get('pMain').linearRampToValueAtTime(mainVal, time + 0.05);
    }

    update_windowcomp(p, t, c) { this.updateLogic(p, t, c, 'windowcomp'); }
    update_clockdiv(p, t, c) { this.updateLogic(p, t, c, 'clockdiv'); }
    update_pulsegen(p, t, c) { this.updateLogic(p, t, c, 'pulsegen'); }
    update_bernoulli(p, t, c) { this.updateLogic(p, t, c, 'bernoulli'); }
    update_euclidean(p, t, c) { this.updateLogic(p, t, c, 'euclidean'); }
    update_quantiser(p, t, c) { this.updateLogic(p, t, c, 'quantiser'); }
    update_looper(p, t, c) { this.updateLogic(p, t, c, 'looper'); }
    update_glitch(p, t, c) { this.updateLogic(p, t, c, 'glitch'); }
    update_turing185(p, t, c) { this.updateLogic(p, t, c, 'turing185'); }
    update_slopesplus(p, t, c) { this.updateLogic(p, t, c, 'slopesplus'); }

    // --- VCA ---
    createVCA(channel) {
        if (!this.ctx) return;
        if (channel === 'L') {
            this.nodesL.gain = this.ctx.createGain();
            this.nodesL.cvGain = this.ctx.createGain();
            this.nodesL.gain.gain.value = 0;

            this.io.inputL.connect(this.nodesL.gain).connect(this.io.outputL);
            this.io.cv1In.connect(this.nodesL.cvGain).connect(this.nodesL.gain.gain);
        } else {
            this.nodesR.gain = this.ctx.createGain();
            this.nodesR.cvGain = this.ctx.createGain();
            this.nodesR.gain.gain.value = 0;

            this.io.inputR.connect(this.nodesR.gain).connect(this.io.outputR);
            this.io.cv2In.connect(this.nodesR.cvGain).connect(this.nodesR.gain.gain);
        }
    }

    update_vca(params, time, channel) {
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;

        if (!this.ctx) return;

        if (!nodes.gain) return;

        let gainCtrl, cvAmtCtrl;
        if (channel === 'L') {
            gainCtrl = params.x;
            cvAmtCtrl = params.main;
        } else {
            gainCtrl = params.y;
            cvAmtCtrl = (params.switch || 0) / 2;
        }

        safeParam(nodes.gain.gain, gainCtrl, time);
        const cvDepth = (cvAmtCtrl - 0.5) * 2;
        nodes.cvGain.gain.setTargetAtTime(cvDepth, time, 0.05);
    }

    // --- DELAY ---
    createDelay(channel) {
        if (!this.ctx) return;
        if (channel === 'L') {
            this.nodesL.delay = this.ctx.createDelay(5.0);
            this.nodesL.feedback = this.ctx.createGain();
            this.nodesL.cvGain = this.ctx.createGain();
            this.nodesL.cvGain.gain.value = 0.5;

            this.io.inputL.connect(this.nodesL.delay).connect(this.io.outputL);
            this.nodesL.delay.connect(this.nodesL.feedback).connect(this.nodesL.delay);
            this.io.cv1In.connect(this.nodesL.cvGain).connect(this.nodesL.delay.delayTime);
        } else {
            this.nodesR.delay = this.ctx.createDelay(5.0);
            this.nodesR.feedback = this.ctx.createGain();
            this.nodesR.cvGain = this.ctx.createGain();
            this.nodesR.cvGain.gain.value = 0.5;

            this.io.inputR.connect(this.nodesR.delay).connect(this.io.outputR);
            this.nodesR.delay.connect(this.nodesR.feedback).connect(this.nodesR.delay);
            this.io.cv2In.connect(this.nodesR.cvGain).connect(this.nodesR.delay.delayTime);
        }
    }

    update_delay(params, time, channel) {
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;

        if (!this.ctx) return;

        if (!nodes.delay) return;

        let timeCtrl, fdbkCtrl;
        if (channel === 'L') {
            timeCtrl = params.x;
            fdbkCtrl = params.main;
        } else {
            timeCtrl = params.y;
            fdbkCtrl = (params.switch || 0) / 2;
        }

        const delayTime = 0.01 + (timeCtrl * 0.99);
        const fb = fdbkCtrl * 0.95;

        safeParam(nodes.delay.delayTime, delayTime, time);
        safeParam(nodes.feedback.gain, fb, time);
    }

    // --- ATTENUVERTER ---
    createAttenuverter(channel) {
        if (!this.ctx) return;
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;

        // Gain Nodes for Signal and CV
        nodes.gainAudio = this.ctx.createGain();
        nodes.gainCV = this.ctx.createGain();

        // Muting Logic: Pulse In (if present) should invert gain or drive a separate mute gain
        // "A high signal in Pulse In mutes both channels."
        // We can use a separate Gain Node for muting.
        nodes.muteAudio = this.ctx.createGain();
        nodes.muteCV = this.ctx.createGain();

        // If Pulse In is high (>0.1), Mute Gain should go to 0.
        // We can invert the Pulse signal? 
        // Or essentially: MuteGain.gain = 1 - PulseIn.
        // This requires an inverter node (WaveShaper or Gain -1 + Constant 1).

        // Setup Inverter for Muting
        nodes.inverter = this.ctx.createGain();
        nodes.inverter.gain.value = -1;
        nodes.constant = this.ctx.createConstantSource(); // Need constant 1 to subtract from
        nodes.constant.offset.value = 1;
        nodes.constant.start();

        // Logic: (1 - Pulse) -> MuteGain
        // Pulse -> Inverter -> (Pulse * -1)
        // Constant(1) -> Sum -> (1 - Pulse)
        // If Pulse=0, Out=1 (Unmuted). If Pulse=1, Out=0 (Muted).

        nodes.muteControl = this.ctx.createGain(); // Summing point
        nodes.constant.connect(nodes.muteControl);

        if (channel === 'L' && this.io.pulse1In) {
            this.io.pulse1In.connect(nodes.inverter);
        } else if (channel === 'R' && this.io.pulse2In) {
            this.io.pulse2In.connect(nodes.inverter);
        }
        nodes.inverter.connect(nodes.muteControl);

        // Connect Mute Control to Gain Params
        nodes.muteControl.connect(nodes.muteAudio.gain);
        nodes.muteControl.connect(nodes.muteCV.gain);

        // Signal Flow
        // Audio In -> Attenuverter -> Mute -> Out
        if (channel === 'L') {
            this.io.inputL.connect(nodes.gainAudio).connect(nodes.muteAudio).connect(this.io.outputL);
            this.io.cv1In.connect(nodes.gainCV).connect(nodes.muteCV).connect(this.io.cv1Out);
        } else {
            this.io.inputR.connect(nodes.gainAudio).connect(nodes.muteAudio).connect(this.io.outputR);
            this.io.cv2In.connect(nodes.gainCV).connect(nodes.muteCV).connect(this.io.cv2Out);
        }
    }

    update_attenuvert(params, time, channel) {
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;

        if (!this.ctx) return;
        if (!nodes.gainAudio) return;

        if (channel === 'L') {
            const gainL = (params.x - 0.5) * 2;
            const cvGainL = (params.main - 0.5) * 2;
            safeParam(nodes.gainAudio.gain, gainL, time);
            safeParam(nodes.gainCV.gain, cvGainL, time);
        } else {
            const gainR = (params.y - 0.5) * 2;
            // Official: "right-hand utility: x1 if switch in middle, x-1 if not"
            let cvGainR = -1;
            const switchVal = (params.switch || 0);
            if (switchVal === 1) cvGainR = 1; // Middle

            // Up (0) or Down (2) -> -1

            safeParam(nodes.gainAudio.gain, gainR, time);
            safeParam(nodes.gainCV.gain, cvGainR, time);
        }
    }

    // --- CV MIXER ---
    createCVMix(channel) {
        if (channel === 'L') {
            this.nodesL.gainA = this.ctx.createGain();
            this.nodesL.gainB = this.ctx.createGain();
            this.nodesL.gainB_inv = this.ctx.createGain();

            this.io.inputL.connect(this.nodesL.gainA).connect(this.io.outputL);
            this.io.cv1In.connect(this.nodesL.gainB).connect(this.io.outputL);

            this.io.inputL.connect(this.nodesL.gainA).connect(this.io.cv1Out);
            this.io.cv1In.connect(this.nodesL.gainB_inv).connect(this.io.cv1Out);
        } else {
            this.nodesR.gainA = this.ctx.createGain();
            this.nodesR.gainB = this.ctx.createGain();
            this.nodesR.gainB_inv = this.ctx.createGain();

            this.io.inputR.connect(this.nodesR.gainA).connect(this.io.outputR);
            this.io.cv2In.connect(this.nodesR.gainB).connect(this.io.outputR);

            this.io.inputR.connect(this.nodesR.gainA).connect(this.io.cv2Out);
            this.io.cv2In.connect(this.nodesR.gainB_inv).connect(this.io.cv2Out);
        }
    }

    update_cvmix(params, time, channel) {
        if (channel === 'L') {
            safeParam(this.nodesL.gainA.gain, params.x, time);
            const bGain = (params.main - 0.5) * 2;
            safeParam(this.nodesL.gainB.gain, bGain, time);
            safeParam(this.nodesL.gainB_inv.gain, -bGain, time);
        } else {
            safeParam(this.nodesR.gainA.gain, params.y, time);
            // Switch Z: 0, 1, 2 -> Normalize to 0..1 then map to -1..1
            // 0=Up(1), 1=Mid(0), 2=Down(-1)? Or simple attenuation?
            // "Attenuverts and mixes two CV channels."
            // "Atten B" label.
            // If switchZ is 0, 1, 2. Let's map 0->-1, 1->0, 2->1 or similar?
            // Or just use normalized value 0..1 -> -1..1

            const sw = (params.switch || 0) / 2; // 0..1
            const bGain = (sw - 0.5) * 2;

            safeParam(this.nodesR.gainB.gain, bGain, time);
            safeParam(this.nodesR.gainB_inv.gain, -bGain, time);
        }
    }

    // --- PLACEHOLDERS for remaining utilities ---
    // --- CROSS SWITCH ---
    createCrossSwitch(channel) {
        if (!this.ctx) return;
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;

        nodes.gainInToOut = this.ctx.createGain(); // Audio In -> Audio Out
        nodes.gainInToCV = this.ctx.createGain();  // Audio In -> CV Out
        nodes.gainCVToCV = this.ctx.createGain();  // CV In -> CV Out
        nodes.gainCVToAudio = this.ctx.createGain(); // CV In -> Audio Out

        // Default: Straight through
        nodes.gainInToOut.gain.value = 1;
        nodes.gainInToCV.gain.value = 0;
        nodes.gainCVToCV.gain.value = 1;
        nodes.gainCVToAudio.gain.value = 0;

        if (channel === 'L') {
            this.io.inputL.connect(nodes.gainInToOut).connect(this.io.outputL);
            this.io.inputL.connect(nodes.gainInToCV).connect(this.io.cv1Out);
            this.io.cv1In.connect(nodes.gainCVToCV).connect(this.io.cv1Out);
            this.io.cv1In.connect(nodes.gainCVToAudio).connect(this.io.outputL);
        } else {
            this.io.inputR.connect(nodes.gainInToOut).connect(this.io.outputR);
            this.io.inputR.connect(nodes.gainInToCV).connect(this.io.cv2Out);
            this.io.cv2In.connect(nodes.gainCVToCV).connect(this.io.cv2Out);
            this.io.cv2In.connect(nodes.gainCVToAudio).connect(this.io.outputR);
        }
    }

    update_cross(params, time, channel) {
        const nodes = channel === 'L' ? this.nodesL : this.nodesR;
        if (!nodes.gainInToOut) return;

        // Logic: If Switch (Right) is Down OR Main (Left) is Left -> CROSS

        let crossed = false;
        if (channel === 'L') {
            // Main knob left of center (< 0.5)
            crossed = params.main < 0.45;
        } else {
            // Switch determines state. 
            // "Pulse/Switch triggers cross-connect."
            // Let's say Switch Down (2) is Cross, Up/Mid is Straight.
            crossed = (params.switch || 0) === 2;
        }

        // Momentary vs Toggle logic from manual?
        // "If Knob X/Y is left of centre, switching is momentary. If Knob X/Y is right of centre, switching toggles."
        // We only have the current frame state, so "toggle" logic is hard without internal state.
        // Assuming the logic simply follows the control for now.

        const targetStraight = crossed ? 0 : 1;
        const targetCross = crossed ? 1 : 0;

        // slew switching slightly
        nodes.gainInToOut.gain.setTargetAtTime(targetStraight, time, 0.01);
        nodes.gainInToCV.gain.setTargetAtTime(targetCross, time, 0.01);
        nodes.gainCVToCV.gain.setTargetAtTime(targetStraight, time, 0.01);
        nodes.gainCVToAudio.gain.setTargetAtTime(targetCross, time, 0.01);
    }




    dummyBlink(params, time, channel, ledBase) {
        if (!this.ctx) return;
    }
}

// --- REGISTER CARD ---
if (typeof registerCard !== 'undefined') {
    registerCard(CardUtilityPair);
}

// --- WORKLET SOURCE CODE ---
const UTILITY_WORKLET_SOURCE = `
class UtilityProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.phase = 0;
        this.count = 0;
        this.lastPulse = 0;
        
        // Internal State
        this.state = { 
            // Shared / General
            val: 0, 
            lastCV: 0,
            reg: Math.floor(Math.random() * 65535), 
            history: new Float32Array(48000), 
            histWrite: 0,
            playHead: 0,
            
            // Utility Specific
            karplusVal: 0,
            vcoPhase: 0,
            envelope: 0,
            lpgSeqValues: Array.from({length: 5}, () => Math.random()),
            
            // VCO
            vcoQuantize: false,
            vcoInitialized: false,
            vcoNoiseState: 0,
            
            
            // Bernoulli
            bgState: 0,
            
            // S&H
            shTarget: 0, 
            shOut: 0, 
            shTimer: 0, 
            shSampleTimer: 0,
            
            // MaxRect
            mrLastDiff: 0,
            
            // Euclidean
            eucStep: 0, eucBucket: 0, eucPulses: 1, 
            eucLastSwitch: 0, eucMetronome: 1, eucInputCounter: 0,
            eucPulseCounter: 0,
            
            // PulseGen
            pgTime: 0, pgTime2: 0, pgCount: 0, pgPeriod: 0, pgPeriod2: 0, 
            pgPulseCounter: 0, pgPulseCounter2: 0,
            
            // ClockDiv
            cdCounters: [0, 0, 0],
            cdPulseCounters: [0, 0, 0],
            cdClock: 0,
            cdTriggerMode: true,
            cdSavedK: 3000,
            cdLastK: -1,
            cdLastSwitch: 0,
            cdLastInPulse: false,
            cdLastAudioHigh: false,
            
            // Turing 185
            turingStates: Array(6).fill().map(() => ({ 
                steps: 0, type: 0, pitch: 0, pitchmask: 0xFF 
            })),
            tStepInState: 0, tCurrentState: 0, tBarStepIndex: 0, 
            tActiveLed: 0, tPulseCount: 0,
            tClockCount: 0, tClockIncr: 0,
            
            // Scales
            scales: [
                [0,1,2,3,4,5,6,7,8,9,10,11], // 0: Chromatic
                [0,2,4,5,7,9,11],            // 1: Major
                [0,2,3,5,7,8,10],            // 2: Minor
                [0,3,5,7,9],                 // 3: Major Pentatonic
                [0,3,5,7,10],                // 4: Minor Pentatonic
                [0,2,4,6,8,10],              // 5: Whole Tone
                [0,2,3,4,7,9],               // 6: Blues? Custom
                [0,4,7]                      // 7: Chord?
            ]
        }; 
        
        // Initialize Turing States Randomly
        for(let s of this.state.turingStates) {
            this.setTuringState(s, Math.floor(Math.random() * 0xFFFFFFFF));
        }
    }

    static get parameterDescriptors() {
        return [
            { name: 'mode', defaultValue: 0 },
            { name: 'p1', defaultValue: 0 },   // Knob X
            { name: 'p2', defaultValue: 0 },   // Knob Y
            { name: 'pMain', defaultValue: 0 } // Main Knob
        ];
    }
    
    // Helpers
    exp4000(inVal) {
        return 256 * Math.pow(2, inVal / 170);
    }
    
    expVoct(inVal) {
        return Math.pow(2, inVal / 341); 
    }
    
    intfn(n) {
        return (n > 0) ? ((n * (n + 1)) / 2) : 0;
    }
    
    // Turing Helpers
    randBit(prob) { 
        return (Math.random() * 1024) < prob;
    }
    
    setTuringState(s, v) {
        s.steps = v & 7;
        v >>= 3;
        s.type = v & 7;
        v >>= 3;
        s.pitch = v & 0x1F;
    }
    
    updateTuringProbs(s, prob) {
        // prob 0..1023 mapping
        const p = 1023 - Math.floor((prob*prob*3/1024) - (prob*prob*prob/524288));
        
        let mask = 0;
        if(this.randBit(p)) s.steps ^= 1;
        if(this.randBit(p)) s.steps ^= 2;
        if(this.randBit(p)) s.steps ^= 4;
        
        if(this.randBit(p)) s.type ^= 1;
        if(this.randBit(p)) s.type ^= 2;
        if(this.randBit(p)) s.type ^= 4;
        
        if(this.randBit(p)) s.pitch ^= 1;
        if(this.randBit(p)) s.pitch ^= 2;
        if(this.randBit(p)) s.pitch ^= 4;
        if(this.randBit(p)) s.pitch ^= 8;
        if(this.randBit(p)) s.pitch ^= 16;
    }
    
    updateTuringMask(s, modeknob) {
        if (modeknob < 500) s.pitchmask = 0x10;
        else if (modeknob < 1000) s.pitchmask = 0x18;
        else if (modeknob < 2000) s.pitchmask = 0x1C;
        else if (modeknob < 3000) s.pitchmask = 0x1E;
        else s.pitchmask = 0x1F;
    }
    
    getTuringPitch(s) {
        const pitchArray = [0,1,2,3,3,4,5,6,7,9,8,9,10,10,11,12];
        const pitchMasked = s.pitch & s.pitchmask;
        return 12 * (s.pitch >> 4) + pitchArray[pitchMasked & 0x0F];
    }

    process(inputs, outputs, parameters) {
        const pulseOut = outputs[0];
        const audioOut = outputs[1];
        const cvOut    = outputs[2];
        
        const pulseIn = inputs[0];
        const audioIn = inputs[1];
        const cvIn    = inputs[2];

        const mode = parameters.mode[0];
        const p1 = parameters.p1[0];
        const p2 = parameters.p2[0];       
        const pMain = parameters.pMain[0]; 

        if (!pulseOut || !pulseOut[0]) return true;

        const len = pulseOut[0].length;

        const pInL = pulseIn && pulseIn[0] ? pulseIn[0] : null; 
        const aInL = audioIn && audioIn[0] ? audioIn[0] : null; 
        const cInL = cvIn    && cvIn[0]    ? cvIn[0]    : null;

        const pOut = pulseOut[0];
        const aOut = audioOut ? audioOut[0] : null;
        const cOut = cvOut    ? cvOut[0]    : null;

        for (let i = 0; i < len; i++) {
            const rawTrig = pInL ? pInL[i] : 0;
            const trigRise = (rawTrig > 0.5 && this.lastPulse <= 0.5);
            const trigFall = (rawTrig <= 0.5 && this.lastPulse > 0.5);
            
            const cv = cInL ? cInL[i] : 0; 
            const cvInt = cv * 4095;
            const aud = aInL ? aInL[i] : 0; 
            const audInt = aud * 2048;

            if (pInL) this.lastPulse = rawTrig;

            // --- BERNOULLI (1) ---
            if (mode === 1) {
                const kex = Math.floor(pMain * 3.99);
                const toggle = (kex & 1);
                const awi = (kex & 2);

                if (trigRise) {
                     if (Math.random() < p1) {
                         if (toggle) this.state.bgState = 1 - this.state.bgState;
                         else this.state.bgState = 1;
                     } else {
                         if (!toggle) this.state.bgState = 0;
                     }
                }
                
                let out = this.state.bgState;
                if (trigFall && awi) out = 0;
                
                pOut[i] = out;
                if(cOut) cOut[i] = cv; 
            }
            
            // --- CLOCK DIV (2) ---
            else if (mode === 2) {
                let k = 0;
                if (Math.floor(pMain * 3.99) === 0 || Math.floor(pMain * 3.99) === 3) {
                    k = pMain * 4095;
                    this.state.cdTriggerMode = (k > 1000 && k < 3000);
                } else {
                    const sw = Math.floor(pMain * 2.1); 
                    if (sw === 0 && this.state.cdLastSwitch !== 0) this.state.cdSavedK = 4000 - this.state.cdSavedK;
                    if (sw === 2 && this.state.cdLastSwitch !== 2) this.state.cdTriggerMode = !this.state.cdTriggerMode;
                    this.state.cdLastSwitch = sw;
                    k = this.state.cdSavedK;
                }
                
                const useOdd = !(k < 2048);
                const divs = useOdd ? [3,5,7] : [2,4,8];
                const pk = (p1 * 2048) + (p1 * 1024) + (cvInt / 2);
                let inpulse = false;
                
                if (!pInL) {
                    this.state.cdClock -= this.expVoct(pk); 
                    if (this.state.cdClock <= 0) {
                        this.state.cdClock += 200; 
                        inpulse = true;
                    }
                } else {
                    inpulse = trigRise; 
                }
                
                if (inpulse) {
                    for(let d=0; d<3; d++) {
                        this.state.cdCounters[d]++;
                        if (this.state.cdCounters[d] >= divs[d]) {
                            this.state.cdCounters[d] = 0;
                            this.state.cdPulseCounters[d] = 100;
                        }
                    }
                }
                
                for(let d=0; d<3; d++) {
                    if (this.state.cdPulseCounters[d] > 0) this.state.cdPulseCounters[d]--;
                }
                
                if (aOut) aOut[i] = (this.state.cdPulseCounters[0] > 0) ? 1 : 0;
                if (cOut) cOut[i] = (this.state.cdPulseCounters[1] > 0) ? 1 : 0;
                pOut[i] = (this.state.cdPulseCounters[2] > 0) ? 1 : 0;
            }
            
            // --- S&H (3) ---
            else if (mode === 3) {
                 let kex = 0;
                 if (pMain < 0.3) kex = 0;
                 else if (pMain < 0.7) kex = 1000;
                 else kex = 2700;

                 let doSample = false;
                 if (pInL) {
                     kex += (cvInt); 
                     if (trigRise) doSample = true;
                 } else {
                     const k = (p1 * 2048); 
                     let rateCV = cvInt + k;
                     if (rateCV > 2047) rateCV = 2047;
                     if (rateCV < 0) rateCV = 0;
                     
                     this.state.shTimer += this.exp4000(rateCV); 
                     if (this.state.shTimer > 2000000) { 
                         this.state.shTimer = 0;
                         doSample = true;
                     }
                 }
                 
                 if (doSample) {
                     if (aInL) { 
                         this.state.shTarget = audInt;
                     } else { 
                         let newR = 0;
                         do { newR = Math.floor(Math.random() * 4096) - 2048; } while (newR === this.state.shTarget);
                         this.state.shTarget = newR;
                     }
                 }
                 
                 const slewspeed = this.exp4000(170 + (kex >> 1));
                 const diff = this.state.shTarget - this.state.shOut;
                 const step = Math.min(slewspeed * 0.1, Math.abs(diff));
                 
                 if (diff > 0) this.state.shOut += step;
                 else this.state.shOut -= step;
                 
                 const eoc = Math.abs(this.state.shOut - this.state.shTarget) < 1;
                 
                 pOut[i] = eoc ? 1 : 0;
                 if (aOut) aOut[i] = this.state.shTarget / 2048; 
                 if (cOut) cOut[i] = this.state.shOut / 2048;    
            }

            // --- WINDOW COMP (4) ---
            else if (mode === 4) {
                 const kxy = (p1 - 0.5) * 2048; 
                 const width = p1 * 2048; 
                 const pi = (rawTrig > 0.5);
                 
                 const above = (audInt > cvInt + width) !== pi; 
                 const below = (audInt < cvInt - width) !== pi;
                 const mid = (!(above || below)) !== pi; 
                 
                 if (aOut) aOut[i] = above ? 1 : 0;
                 if (cOut) cOut[i] = mid ? 1 : 0;
                 pOut[i] = below ? 1 : 0;
            }
            
            // --- PULSE GEN (5) ---
            else if (mode === 5) {
                let kex = 0;
                if (pMain > 0.8) kex = 3000;
                else if (pMain > 0.4) kex = 1200;
                else kex = 0;
                
                kex += audInt;
                if(kex > 4095) kex = 4095; if(kex < 0) kex = 0;
                
                if (pInL) {
                    this.state.pgPeriod = (cvInt * 4) + 1000;
                    if (trigRise) {
                        this.state.pgTime = 0;
                        this.state.pgCount = (kex >> 9);
                    }
                    if (this.state.pgTime === 0 && this.state.pgCount > 0) {
                        this.state.pgPulseCounter = 100;
                        this.state.pgTime = this.state.pgPeriod;
                        this.state.pgCount--;
                    }
                } else {
                    this.state.pgPeriod = (cvInt * cvInt / 256) + 200;
                    this.state.pgPeriod2 = (kex * kex / 256) + 200;
                    if (this.state.pgTime === 0) {
                        this.state.pgPulseCounter = 100;
                        this.state.pgTime = this.state.pgPeriod;
                    }
                    if (this.state.pgTime2 === 0) {
                        this.state.pgPulseCounter2 = 100; 
                        this.state.pgTime2 = this.state.pgPeriod2;
                    }
                }
                
                if (this.state.pgTime > 0) this.state.pgTime--;
                if (this.state.pgTime2 > 0) this.state.pgTime2--;
                if (this.state.pgPulseCounter > 0) this.state.pgPulseCounter--;
                if (this.state.pgPulseCounter2 > 0) this.state.pgPulseCounter2--;
                
                pOut[i] = (this.state.pgPulseCounter > 0) ? 1 : 0;
                if (cOut) cOut[i] = (this.state.pgPulseCounter2 > 0) ? 1 : 0; 
                if (aOut) aOut[i] = 0;
            }

            // --- EUCLIDEAN (6) ---
            else if (mode === 6) {
                let k = (p1 * 4095) + cvInt;
                if (k > 4095) k = 4095; if (k < 0) k = 0;
                const nSteps = (k >> 8) + 1;
                
                let nPulses = Math.floor(pMain * 16) + 1;
                
                let nPulsesWithCV = nPulses + (audInt / 128);
                if (nPulsesWithCV > nSteps) nPulsesWithCV = nSteps;
                if (nPulsesWithCV < 1) nPulsesWithCV = 1;
                
                const connected = !!pInL;
                let trigger = trigRise;
                
                if (!connected) {
                    if (this.state.eucMetronome === 0) { 
                       trigger = true;
                       this.state.eucMetronome = 10000; 
                    } else {
                        this.state.eucMetronome--;
                    }
                }
                
                if (trigger) {
                    this.state.eucStep++;
                    if (this.state.eucStep >= nSteps) {
                        this.state.eucStep = 0;
                        this.state.eucBucket = nSteps - nPulsesWithCV;
                        this.state.eucInputCounter = 100; 
                    }
                    this.state.eucBucket += nPulsesWithCV;
                    if (this.state.eucBucket >= nSteps) {
                        this.state.eucBucket -= nSteps;
                        this.state.eucPulseCounter = 100;
                    }
                }
                
                if (this.state.eucPulseCounter > 0) this.state.eucPulseCounter--;
                if (this.state.eucInputCounter > 0) this.state.eucInputCounter--;
                
                pOut[i] = (this.state.eucPulseCounter > 0) ? 1 : 0;
                if(cOut) cOut[i] = (this.state.eucPulseCounter > 0) ? 1 : 0; 
                if(aOut) aOut[i] = (this.state.eucInputCounter > 0) ? 1 : 0; 
            }

            // --- QUANTISER (7) ---
            else if (mode === 7) {
                if (trigRise) this.state.val = cv; 
                let inputCV = cv + (parameters.p2[0]); 
                const scaleIdx = Math.floor(p1 * 7.99);
                const scale = this.state.scales[scaleIdx] || this.state.scales[0];
                const octave = Math.floor(inputCV);
                const noteVal = (inputCV - octave) * 12.0;
                const noteInt = Math.round(noteVal);
                let minDiff = 100;
                let bestNote = 0;
                for (let n of scale) {
                    let diff = Math.abs(n - noteInt);
                    if (diff < minDiff) { minDiff = diff; bestNote = n; }
                }
                const outCV = octave + (bestNote / 12.0);
                if (cOut) cOut[i] = outCV;
                if (Math.abs(outCV - this.state.lastCV) > 0.001) pOut[i] = 1;
                else pOut[i] = 0;
                this.state.lastCV = outCV;
            }
            
            // --- TURING 185 (8) ---
            else if (mode === 8) {
                 let clockTick = false;
                 if (pInL) {
                     clockTick = trigRise || trigFall; 
                 } else {
                     this.state.tClockIncr = 200; 
                     this.state.tClockCount += this.state.tClockIncr;
                     if (this.state.tClockCount > 65535) {
                         this.state.tClockCount -= 65535;
                         clockTick = true;
                     }
                 }
                 
                 if (clockTick) {
                     let kex = 0;
                     if (pMain < 0.3) kex = 0;
                     else if (pMain < 0.7) kex = 1500;
                     else kex = 4000;
                     for(let s of this.state.turingStates) this.updateTuringMask(s, kex);
                     const rising = trigRise || (!pInL && clockTick); 
                     
                     if (rising) {
                         this.state.tStepInState++;
                         this.state.tBarStepIndex++;
                         const curr = this.state.turingStates[this.state.tCurrentState];
                         
                         if (this.state.tStepInState >= curr.steps) {
                             this.state.tStepInState = 0;
                             this.state.tCurrentState = (this.state.tCurrentState + 1) % 6;
                             const km = p1 * 1023; 
                             this.updateTuringProbs(this.state.turingStates[this.state.tCurrentState], km);
                         }
                         if (curr.type !== 0) { 
                             this.state.tPulseCount = 100;
                             if (cOut) cOut[i] = (this.getTuringPitch(curr) + 60) / 120; 
                         }
                     }
                 }
                 
                 if (this.state.tPulseCount > 0) {
                     this.state.tPulseCount--;
                     pOut[i] = 1;
                 } else {
                     pOut[i] = 0;
                 }
            }
            
            // --- LOOPER (9) ---
            else if (mode === 9) {
                if (trigRise) this.count++;
                pOut[i] = (this.count % 16 === 0) ? 1 : 0; 
            }
            // --- GLITCH (10) ---
            else if (mode === 10) {
                const bufSize = this.state.history.length;
                this.state.history[this.state.histWrite] = aud;
                this.state.histWrite = (this.state.histWrite + 1) % bufSize;
                if (trigRise || Math.random() < 0.0001) this.state.playHead = Math.floor(Math.random() * bufSize);
                this.state.playHead = (this.state.playHead + 1) % bufSize;
                if (aOut) aOut[i] = this.state.history[this.state.playHead];
            }
            // --- SLOPES+ (11) ---
            else if (mode === 11) {
                const target = cv + aud; 
                const slewRate = 0.001 + (p1 * 0.1); 
                let curr = this.state.val; 
                if (target > curr) curr += slewRate;
                else curr -= slewRate;
                if (Math.abs(target - curr) < slewRate) curr = target;
                this.state.val = curr;
                if (aOut) aOut[i] = curr;
                if (cOut) cOut[i] = (Math.abs(curr - target) < 0.01) ? 1 : 0; 
            }
            // --- VCO (12) ---
            else if (mode === 12) {
                // Startup Check for Quantize Mode
                // "Reboot ... holding switch down"
                if (!this.state.vcoInitialized) {
                    // Check if switch (pMain) is high/down (> 0.9)
                    if (pMain > 0.9) {
                         this.state.vcoQuantize = true;
                    }
                    this.state.vcoInitialized = true;
                }
                
                // Pitch Calculation
                // Knob X (p1): Offset. 
                // CV In: 1V/Oct.
                // Base Freq: approx C1 to C6?
                // p1 0..1 map to roughly 0..5 (5 octaves)
                
                let vOct = (p1 * 5) + cv; 
                if (this.state.vcoQuantize) {
                    // Round to nearest 1/12
                    vOct = Math.round(vOct * 12) / 12;
                }
                
                // Freq = 55Hz * 2^vOct
                const freq = 55.0 * Math.pow(2, vOct);
                const inc = freq / sampleRate; 
                this.state.vcoPhase += inc;
                if (this.state.vcoPhase > 1) this.state.vcoPhase -= 1;
                
                const ph = this.state.vcoPhase;
                
                // Timbre Control (Audio In)
                // Range -1..1 (aud) -> mapped to 0..1 for internal use
                const timbre = (aud + 1) * 0.5;
                
                // Waveshape Selector (pMain)
                // 3 Zones: 0..0.33 (Pulse), 0.33..0.66 (Tri-Saw), 0.66..1.0 (Resonant Noise)
                
                let out = 0;
                
                if (pMain < 0.33) {
                    // Pulse Wave
                    // Timbre controls Pulse Width
                    // Center (timbre=0.5) -> Square (0.5)
                    // Range: 0.05 to 0.95
                    const pw = 0.05 + (timbre * 0.9);
                    out = (ph < pw) ? 1 : -1;
                } 
                else if (pMain < 0.66) {
                    // Tri-Saw
                    // Timbre controls ramp.
                    // 0.0 (Saw Down) -> 0.5 (Tri) -> 1.0 (Saw Up)
                    // Variable slope
                    let slope = timbre; 
                    if (slope < 0.01) slope = 0.01; if (slope > 0.99) slope = 0.99;
                    
                    if (ph < slope) {
                        // Rising
                        out = (ph / slope) * 2 - 1;
                    } else {
                        // Falling
                        out = ((ph - slope) / (1 - slope)) * -2 + 1;
                    }
                } 
                else {
                    // Resonant Noise
                    // "Morphing between filtered noise and sine wave"
                    // Sine is pure. Noise is... noise.
                    // Timbre: 0 = Noise, 1 = Sine? Or frequency of filter?
                    
                    // Sine Comp
                    const sine = Math.sin(ph * 2 * Math.PI);
                    
                    // Noise Comp (Filtered)
                    // Simple white noise
                    let noise = (Math.random() * 2) - 1;
                    
                    // Perhaps Timbre = Crossfade?
                    // Let's implement crossfade from Filtered Noise (Low) to Sine (High).
                    // Filter noise at pitch frequency?
                    // If Resonant, implies bandpass at pitch.
                    
                    // Simple Resonator on Noise
                    // y[n] = x[n] + r*y[n-1] ... roughly
                    // Use Karplus-like feedback for resonance?
                    // Let's keep it simple: Crossfade Sine and Noise.
                    // Timbre 0-> Noise, 1-> Sine.
                    
                    out = (sine * timbre) + (noise * (1-timbre));
                }
                
                if (aOut) aOut[i] = out;
                
                // Gate-to-Trigger Converter
                // Pulse In -> Pulse Out
                // Trigger on rising edge
                const isTrig = (rawTrig > 0.5 && this.lastPulse <= 0.5);
                pOut[i] = isTrig ? 1 : 0;
            }
            // --- KARPLUS (13) ---
            else if (mode === 13) {
                const noise = (Math.random() * 2) - 1;
                const excite = trigRise ? noise : 0;
                const delayTime = 0.002 + (cv * 0.01); 
                const delaySamps = Math.floor(delayTime * 48000);
                const readIdx = (this.state.histWrite - delaySamps + 48000) % 48000;
                const prev = this.state.history[readIdx];
                const damping = p1; 
                const filtered = (prev * (1-damping)) + (this.state.karplusVal * damping);
                this.state.karplusVal = filtered;
                const input = excite + (filtered * 0.99);
                this.state.history[this.state.histWrite] = input;
                this.state.histWrite = (this.state.histWrite + 1) % 48000;
                if (aOut) aOut[i] = input;
            }
            // --- LPG (14) ---
            // --- LPG (14) ---
            else if (mode === 14) {
                 // Logic:
                 // Pulse In connected?
                 //   Yes: Pulse 'pings' LPG. Main Knob attenuates Ping. Pulse advances Seq.
                 //   No: Main Knob attenuates CV In. 
                 
                 // Sequencer Logic
                 // Advance on Ping (Pulse In)
                 // Or separate? "Pulse in triggers the next step"
                 let trigger = trigRise; // If passed from pInL
                 if (!pInL && trigRise) trigger = true; // Still handle rise if manually triggered or repurposed?
                 // But manual says "If a jack is not patched into Pulse in... CV in...". It implies Pulse In is the clock.
                 
                 if (pInL && trigRise) {
                     this.count = (this.count + 1) % 5;
                 }
                 
                 // Pulse Out: Every 5th input pulse.
                 // Assuming count resets to 0 at start modulo 5.
                 // Trigger output on the transition to 0? Or just when count is 0 and we had a trigger?
                 const isFifth = (this.count === 0 && (pInL && trigRise));
                 pOut[i] = isFifth ? 1 : 0;
                 
                 // CV Out: Sequencer Output
                 if (cOut) cOut[i] = this.state.lpgSeqValues[this.count];

                 // LPG Physics
                 // Excitation
                 let excite = 0;
                 
                 // Attenuation Control from Main Knob / Switch
                 // Switch Z (mapped to pMain in update_lpg, 0, 0.5, 1) or Main Knob (0..1)
                 // User says "Main knob or switch ... attenuates"
                 // pMain is 0..1. Let's assume linear attenuation.
                 const atten = pMain; 
                 
                 if (pInL) {
                     // Ping Mode
                     if (trigRise) {
                         // Ping amplitude attenuated by Main
                         excite = 1.0 * atten;
                     }
                 } else {
                     // CV Mode
                     // Gate control voltage set by CV in and Knob X/Y
                     // "Main knob ... attenuates CV in signal"
                     // So effective CV = CV_In * Main
                     // Knob X acts as Offset or Base? "Gate control voltage set by CV in and Knob X/Y"
                     // Usually Knob is offset.
                     const cvVal = cv * atten;
                     excite = cvVal + p1; // Simple summing
                 }
                 
                 // Vactrol Simulation
                 // Simple 1-pole filter on the control signal to simulate vactrol lag
                 const vactrolTime = pInL ? 0.002 : 0.005; // Fast attack
                 // Decay is inherent to the vactrol memory.
                 // If excite is high, envelope goes up. If excite is 0, envelope decays.
                 // "Ping" acts as impulse.
                 
                 if (excite > this.state.envelope) {
                     // Attack
                     this.state.envelope += (excite - this.state.envelope) * 0.1; // Fast-ish
                 } else {
                     // Sustain/Decay
                     // If CV mode, we follow. If Ping mode, we decay.
                     // Natural decay of vactrol:
                     this.state.envelope *= 0.999; // 48k exp decay
                 }
                 
                 // Hard clip Envelope
                 if (this.state.envelope > 1) this.state.envelope = 1;
                 
                 // Apply Envelope to Audio
                 // LPG creates a Lowpass + VCA effect.
                 // Simple approximation: Audio * Envelope (VCA) + Tone shaping?
                 // Or: y[n] = y[n-1] + Fc * (x[n] - y[n-1])
                 // Where Fc is proportional to Envelope.
                 
                 const fc = this.state.envelope * 0.5; // Max 0.5 (Nyquist)
                 // One pole Lowpass
                 const last = this.state.val; // State for filter
                 const lpOut = last + fc * (aud - last);
                 this.state.val = lpOut;
                 
                 // Often LPGs also have VCA character (amplitude drops with cutoff).
                 // The LP filter naturally reduces amplitude for high freq, but we also want silence at 0.
                 // Scale output by envelope squared?
                 // Classic "Buchla" sound is both VCA and VCF closing together.
                 
                 // Simple VCF + VCA
                 const vcaOut = lpOut * this.state.envelope;
                 
                 if (aOut) aOut[i] = vcaOut;
            }
             // --- WAVEFOLDER (15) ---
            else if (mode === 15) {
                let sig = aud * ((p1 * 10) + 1); 
                const folded = Math.sin(sig);
                if (aOut) aOut[i] = folded;
                if (trigRise) {
                     this.count++;
                     this.state.reg = Math.random(); 
                }
                const div = (this.count % 4) < 2;
                pOut[i] = div ? 1 : 0;
                if (cOut) cOut[i] = this.state.reg; 
            }
            
            // --- CHORUS (17) ---
            else if (mode === 17) {
                 // Chorus / Flanger
                 // Knob X/Y (p1) + CV: Speed
                 // Main Knob (pMain): Tone (LPF Cutoff on wet path)
                 
                 // LFO Speed
                 const speed = (p1 * 4) + (cvInt / 1024); // 0..5Hz approx
                 const lfoInc = speed / 48000.0;
                 this.phase += lfoInc;
                 if (this.phase > 1) this.phase -= 1;
                 
                 // LFO Shape (Sine)
                 const lfoVal = Math.sin(this.phase * 2 * Math.PI);
                 
                 // Delay Time Modulation
                 // Center 15ms, Depth +/- 5ms
                 const baseDelay = 0.015; 
                 const depth = 0.005;
                 const delayTime = baseDelay + (lfoVal * depth);
                 const delaySamps = delayTime * 48000;
                 
                 // Write Input to History
                 this.state.history[this.state.histWrite] = aud;
                 
                 // Read from History (Interpolated)
                 let rIdx = this.state.histWrite - delaySamps;
                 if (rIdx < 0) rIdx += 48000;
                 const rInt = Math.floor(rIdx);
                 const rFrac = rIdx - rInt;
                 const nextIdx = (rInt + 1) % 48000;
                 const rawWet = this.state.history[rInt] * (1 - rFrac) + this.state.history[nextIdx] * rFrac;
                 
                 this.state.histWrite = (this.state.histWrite + 1) % 48000;
                 
                 // Tone Control (pMain)
                 // Simple One-Pole Lowpass
                 // pMain 1.0 -> Open, 0.0 -> Closed (Dark)
                 // Map pMain to Coefficient
                 const cutoff = pMain * 0.9 + 0.01; 
                 const lastF = this.state.val; // Reuse val
                 const filteredWet = lastF + cutoff * (rawWet - lastF);
                 this.state.val = filteredWet;
                 
                 // Output: Dry + Wet
                 // Fixed 50/50 mix for now or just add?
                 const out = (aud + filteredWet) * 0.7; // Normalize slightly
                 
                 if (aOut) aOut[i] = out;
                 
                 // Gate-to-Trigger
                 const isTrig = (rawTrig > 0.5 && this.lastPulse <= 0.5);
                 pOut[i] = isTrig ? 1 : 0;
            }

            // --- MAX / RECT (16) ---
            else if (mode === 16) {
                let effCV = cvInt;
                if (!cInL) effCV = -audInt;
                const scale = (p1 - 0.5) * 2 * 2048; 
                effCV = (effCV * scale) / 2048;
                pOut[i] = (audInt < 0) ? 1 : 0;
                const diff = effCV - audInt;
                const idiff = this.intfn(diff);
                const ilast = this.intfn(this.state.mrLastDiff);
                let funcDiff = 0;
                if (diff !== this.state.mrLastDiff) {
                    funcDiff = (idiff - ilast) / (diff - this.state.mrLastDiff);
                } else {
                    funcDiff = (diff > 0) ? diff : 0;
                }
                this.state.mrLastDiff = diff;
                let final = audInt + funcDiff;
                if (final > 2047) final = 2047;
                if (final < -2047) final = -2047;
                if (aOut) aOut[i] = final / 2048;
                if (cOut) cOut[i] = 0; 
            }

            // --- DEFAULT ---
            else {
                 if(aOut) aOut[i] = aud;
            }
        }
        return true;
    }
}
registerProcessor('utility-processor', UtilityProcessor);
`;
