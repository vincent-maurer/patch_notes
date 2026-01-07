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
    }

    initializeUtilities() {
        // Map of utility implementations
        this.utilities = {
            vca: this.createVCA.bind(this),
            delay: this.createDelay.bind(this),
            sandh: this.createSampleHold.bind(this),
            attenuvert: this.createAttenuverter.bind(this),
            cvmix: this.createCVMix.bind(this),
            cross: this.createCrossSwitch.bind(this),
            windowcomp: this.createWindowComparator.bind(this),
            clockdiv: this.createClockDivider.bind(this),
            pulsegen: this.createPulseGenerator.bind(this),
            bernoulli: this.createBernoulliGate.bind(this),
            wavefolder: this.createWavefolder.bind(this),
            bitcrush: this.createBitcrusher.bind(this),
            euclidean: this.createEuclidean.bind(this),
            quantiser: this.createQuantiser.bind(this)
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

            // Initial position (will be updated by updateUIPosition)
            container.style.cssText = `
                position: absolute;
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
                transform: translateX(-50%);
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

            // Populate both dropdowns
            (window.UTILITY_PAIR_LIBRARY || []).forEach((util, index) => {
                const optionL = document.createElement('option');
                optionL.value = index;
                optionL.textContent = util.name;
                selectL.appendChild(optionL);

                const optionR = document.createElement('option');
                optionR.value = index;
                optionR.textContent = util.name;
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

            // Update position
            requestAnimationFrame(() => this.updateUIPosition());

            this.resizeHandler = () => this.updateUIPosition();
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
        try {
            if (!this.uiElements) return;

            const synthContainer = document.getElementById('synthContainer');
            const cardSlot = document.getElementById('computerCardSlot');
            if (!synthContainer || !cardSlot) return;

            const cardRect = cardSlot.getBoundingClientRect();
            const synthRect = synthContainer.getBoundingClientRect();

            // Position below card slot
            const left = (cardRect.left - synthRect.left + (cardRect.width / 2)) - 20; // Moved left 20px
            const top = (cardRect.bottom - synthRect.top - 80) + 20; // Moved down 20px

            this.uiElements.style.left = `${left}px`;
            this.uiElements.style.top = `${top}px`;
        } catch (error) {
            console.warn('Error updating utility pair position:', error);
        }
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

            if (util.labels.knob) newLabels[knobKey] = util.labels.knob;
            if (util.labels.in) newLabels[`jack-audio${suffix}in`] = util.labels.in.replace('L ', channel + ' ');
            if (util.labels.out) newLabels[`jack-audio${suffix}out`] = util.labels.out.replace('L ', channel + ' ');
            if (util.labels.cv) newLabels[`jack-cv${suffix}in`] = util.labels.cv;
            if (util.labels.sub) {
                if (channel === 'L') newLabels['knob-large-computer'] = util.labels.sub;
                else newLabels['switch-3way-computer'] = util.labels.sub;
            }
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

        if (channel === 'L') {
            safeParam(nodes.gain.gain, params.x, time);
            const cvDepth = (params.main - 0.5) * 2;
            nodes.cvGain.gain.setTargetAtTime(cvDepth, time, 0.05);
        } else {
            safeParam(nodes.gain.gain, params.y, time);
            const cvDepth = (params.main - 0.5) * 2;
            nodes.cvGain.gain.setTargetAtTime(cvDepth, time, 0.05);
        }
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

        if (channel === 'L') {
            const timeL = 0.01 + (params.x * 0.99);
            const fb = params.main * 0.95;
            safeParam(nodes.delay.delayTime, timeL, time);
            safeParam(nodes.feedback.gain, fb, time);
        } else {
            const timeR = 0.01 + (params.y * 0.99);
            const fb = params.main * 0.95;
            safeParam(nodes.delay.delayTime, timeR, time);
            safeParam(nodes.feedback.gain, fb, time);
        }
    }

    // --- SAMPLE & HOLD ---
    createSampleHold(channel) {
        this.createPassThrough(channel);
        console.warn('Sample &Hold requires AudioWorklet - using pass-through');
    }

    // --- ATTENUVERTER ---
    createAttenuverter(channel) {
        if (!this.ctx) return;
        if (channel === 'L') {
            this.nodesL.gainAudio = this.ctx.createGain();
            this.nodesL.gainCV = this.ctx.createGain();

            this.io.inputL.connect(this.nodesL.gainAudio).connect(this.io.outputL);
            this.io.cv1In.connect(this.nodesL.gainCV).connect(this.io.cv1Out);
        } else {
            this.nodesR.gainAudio = this.ctx.createGain();
            this.nodesR.gainCV = this.ctx.createGain();

            this.io.inputR.connect(this.nodesR.gainAudio).connect(this.io.outputR);
            this.io.cv2In.connect(this.nodesR.gainCV).connect(this.io.cv2Out);
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
            const cvGainR = params.switch3way === 0 ? -1 : (params.switch3way === 1 ? 0 : 1);
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
            const bGain = (params.main - 0.5) * 2;
            safeParam(this.nodesR.gainB.gain, bGain, time);
            safeParam(this.nodesR.gainB_inv.gain, -bGain, time);
        }
    }

    // --- PLACEHOLDERS for remaining utilities ---
    createCrossSwitch(channel) { this.createPassThrough(channel); }
    createWindowComparator(channel) { this.createPassThrough(channel); }
    createClockDivider(channel) { this.createPassThrough(channel); }
    createPulseGenerator(channel) { this.createPassThrough(channel); }
    createBernoulliGate(channel) { this.createPassThrough(channel); }
    createWavefolder(channel) { this.createPassThrough(channel); }
    createBitcrusher(channel) { this.createPassThrough(channel); }
    createEuclidean(channel) { this.createPassThrough(channel); }
    createQuantiser(channel) { this.createPassThrough(channel); }

    // Generic dummy update for unimplemented ones
    update_cross(p, t, c) { this.dummyBlink(p, t, c, 5); }
    update_windowcomp(p, t, c) { this.dummyBlink(p, t, c, 5); }
    update_clockdiv(p, t, c) { this.dummyBlink(p, t, c, 5); }
    update_pulsegen(p, t, c) { this.dummyBlink(p, t, c, 5); }
    update_bernoulli(p, t, c) { this.dummyBlink(p, t, c, 5); }
    update_wavefolder(p, t, c) { this.dummyBlink(p, t, c, 5); }
    update_bitcrush(p, t, c) { this.dummyBlink(p, t, c, 5); }
    update_euclidean(p, t, c) { this.dummyBlink(p, t, c, 5); }
    update_quantiser(p, t, c) { this.dummyBlink(p, t, c, 5); }

    dummyBlink(params, time, channel, ledBase) {
        if (!this.ctx) return;
    }
}

// --- REGISTER CARD ---
if (typeof registerCard !== 'undefined') {
    registerCard(CardUtilityPair);
}
