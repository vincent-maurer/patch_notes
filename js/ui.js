// =========================================================================
// UI.JS
// Handles rendering, user interaction, drag-and-drop, and DOM manipulation.
// =========================================================================

// --- CUSTOM DIALOG HELPER (Fullscreen-safe) -----------------------------
const CustomDialog = {
    show(title, message, type = 'alert', defaultValue = '') {
        return new Promise((resolve) => {
            const overlay = document.getElementById('customDialogOverlay');
            const titleEl = document.getElementById('dialogTitle');
            const messageEl = document.getElementById('dialogMessage');
            const inputEl = document.getElementById('dialogInput');
            const cancelBtn = document.getElementById('dialogCancelBtn');
            const confirmBtn = document.getElementById('dialogConfirmBtn');

            titleEl.textContent = title;
            messageEl.textContent = message;

            // Configure based on type
            if (type === 'prompt') {
                inputEl.classList.remove('hidden');
                inputEl.value = defaultValue;
                cancelBtn.classList.remove('hidden');
                setTimeout(() => inputEl.focus(), 100);
            } else if (type === 'confirm') {
                inputEl.classList.add('hidden');
                cancelBtn.classList.remove('hidden');
            } else { // alert
                inputEl.classList.add('hidden');
                cancelBtn.classList.add('hidden');
            }

            const handleConfirm = () => {
                overlay.classList.add('hidden');
                cleanup();
                if (type === 'prompt') {
                    resolve(inputEl.value);
                } else if (type === 'confirm') {
                    resolve(true);
                } else {
                    resolve(undefined);
                }
            };

            const handleCancel = () => {
                overlay.classList.add('hidden');
                cleanup();
                if (type === 'prompt') {
                    resolve(null);
                } else {
                    resolve(false);
                }
            };

            const handleKeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                }
            };

            const cleanup = () => {
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                overlay.removeEventListener('keydown', handleKeydown);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            overlay.addEventListener('keydown', handleKeydown);

            overlay.classList.remove('hidden');
        });
    },

    alert(message) {
        return this.show('Alert', message, 'alert');
    },

    confirm(message) {
        return this.show('Confirm', message, 'confirm');
    },

    prompt(message, defaultValue = '') {
        return this.show('Input', message, 'prompt', defaultValue);
    }
};

// --- 1. COMPONENT RENDERING ----------------------------------------------

function renderComponents() {
    const container = document.getElementById('synthContainer');

    // 1. Clear Old Elements (Keep Cables/Notes/ExternalGear)
    Array.from(container.children).forEach(c => {
        if (!c.classList.contains('cable-svg') &&
            !c.classList.contains('note-element') &&
            c.id !== 'externalGearRackLeft' &&
            c.id !== 'externalGearRackRight') {
            c.remove();
        }
    });

    // Panel Background
    const panelImg = document.createElement('img');
    panelImg.className = 'panel-art-img';
    const isDark = document.body.classList.contains('dark-mode');
    panelImg.src = isDark ? 'images/panel_image_dark.svg' : 'images/panel_image.svg';
    panelImg.draggable = false;
    container.appendChild(panelImg);

    // 2. Create Components (Skip custom gear - they render in their own rack)
    for (const id in SYSTEM_CONFIG) {
        if (SYSTEM_CONFIG[id].isCustom) continue; // Skip external gear components
        createComponent(id, SYSTEM_CONFIG[id]);
    }

    if (typeof renderCardSlot === 'function') renderCardSlot();

    // --- NEW: Enforce Voltage Group Default State ---
    const vGroup = ['button-1', 'button-2', 'button-3', 'button-4'];

    // Check if any button in the group is currently active
    const anyActive = vGroup.some(id => {
        const btn = document.getElementById(id);
        return btn && parseInt(btn.getAttribute('data-state') || 0) === 1;
    });

    // If none are active, activate button-1 by default
    if (!anyActive) {
        const b1 = document.getElementById('button-1');
        if (b1) {
            b1.setAttribute('data-state', 1);
            b1.classList.add('is-touched');
            componentStates['button-1'] = { type: 'button', value: 1, isTouched: true };
        }
    }

    renderComponentLabels();
}

function toggleLabels() {
    showComponentLabels = !showComponentLabels;
    renderComponentLabels();

    // Toggle body class for note visibility (CSS handled)
    if (showComponentLabels) document.body.classList.add('show-labels');
    else document.body.classList.remove('show-labels');

    // Update button visual state
    const btn = document.getElementById('labelsToggle');
    if (btn) {
        if (showComponentLabels) btn.classList.add('btn-active');
        else btn.classList.remove('btn-active');
    }
}

function renderComponentLabels() {
    // 1. Gather all label definitions
    let labelMap = {};

    // A. From Active Computer Card
    if (activeComputerCard) {
        // Priority 1: Dynamic labels from the instance (e.g., Utility Pair)
        if (activeComputerCard.labels) {
            Object.assign(labelMap, activeComputerCard.labels);
        } else {
            // Priority 2: Static labels from library definition
            const def = (window.AVAILABLE_CARDS || []).find(c => c.name === activeComputerCard.name);
            if (def && def.labels) {
                Object.assign(labelMap, def.labels);
            }
        }
    }

    // B. From Generic/Other Modules (Extensible)
    // Could check active pedalboard or external gear here if needed in future

    // 2. Iterate components and update labels
    const components = document.querySelectorAll('.component');

    components.forEach(el => {
        let labelEl = el.querySelector('.component-label');
        const id = el.id;

        // Priority 1: User Defined Label (Editable)
        let text = null;
        if (componentStates[id] && componentStates[id].label) {
            text = componentStates[id].label;
        }

        // Priority 2: Computer Card Label (if not overridden)
        if (!text && labelMap[id]) {
            text = labelMap[id];
        }

        if (text && showComponentLabels) {
            if (!labelEl) {
                labelEl = document.createElement('div');
                labelEl.className = 'component-label';
                el.appendChild(labelEl);
            }
            labelEl.textContent = text;
            // Force reflow for transition?
            requestAnimationFrame(() => labelEl.classList.add('visible'));
        } else {
            if (labelEl) {
                labelEl.classList.remove('visible');
                // Clear text so it doesn't "ghost" if re-shown before update
                labelEl.textContent = "";
            }
        }
    });
}


function createComponent(id, config) {
    const el = document.createElement('div');
    el.className = `component ${config.type}`;
    el.id = id;
    el.style.left = config.x;
    el.style.top = config.y;
    el.setAttribute('data-type', config.type);

    const saved = componentStates[id];
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = config.label || id;
    el.appendChild(tooltip);

    // --- Jacks ---
    if (config.type.includes('jack')) {
        el.classList.add('jack');
        el.addEventListener('click', handleJackClick);
        el.addEventListener('mousedown', (e) => {
            if (typeof midiLearnMode !== 'undefined' && midiLearnMode) return; // Ignore clicks in learn mode (or maybe handle learn for jacks? No, usually knobs only)
            handleJackMouseDown(e);
        });
        el.addEventListener('touchstart', (e) => {
            if (typeof midiLearnMode !== 'undefined' && midiLearnMode) return;
            handleJackMouseDown(e);
        }, { passive: false });

        el.addEventListener('dblclick', (e) => {
            e.preventDefault(); e.stopPropagation();
            const jackId = e.currentTarget.id;
            const cablesToRemove = cableData.filter(c => c.start === jackId || c.end === jackId);
            if (cablesToRemove.length > 0) {
                cablesToRemove.forEach(c => removeCable(c.start, c.end));
                redrawCables(); saveState(); triggerHandlingNoise(); updateAudioGraph();
            }
        });
    }

    // --- Knobs ---
    if (config.type.startsWith('knob')) {
        const img = document.createElement('img');
        img.className = 'knob-img';
        const isDark = document.body.classList.contains('dark-mode');
        let src = '';
        if (config.type === 'knob-large') src = isDark ? 'images/largeKnob_dark.svg' : 'images/largeKnob.svg';
        else if (config.type === 'knob-medium') src = isDark ? 'images/mediumKnob_dark.svg' : 'images/mediumKnob.svg';
        else if (config.type === 'knob-small') src = isDark ? 'images/smallKnob_dark.svg' : 'images/smallKnob.svg';
        img.src = src;
        img.draggable = false;
        el.appendChild(img);

        el.addEventListener('mousedown', startKnobDrag);
        el.addEventListener('touchstart', startKnobDrag);
        el.addEventListener('wheel', handleKnobWheel, { passive: false });

        const initialVal = saved ? saved.value : (config.defValue || 0);
        const initialTouch = !!(saved && saved.isTouched);

        updateKnobAngle(el, initialVal, initialTouch);

        // Range Visualization
        const rangeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        rangeSvg.classList.add("knob-range-overlay");
        rangeSvg.setAttribute("viewBox", "0 0 100 100");
        const rangePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        rangePath.classList.add("knob-range-path");
        rangeSvg.appendChild(rangePath);
        el.appendChild(rangeSvg);

        if (initialTouch) el.classList.add('is-touched');
        el.addEventListener('dblclick', (e) => { e.preventDefault(); resetKnob(el); });
    }

    // --- Buttons (UPDATED) ---
    else if (config.type.startsWith('button')) {
        const voltageButtons = ['button-1', 'button-2', 'button-3', 'button-4'];

        if (voltageButtons.includes(id)) {
            // Use special handler for voltage group
            setupVoltageButtonInteraction(el);
        } else {
            // Use standard handler for other buttons
            el.addEventListener('click', handleButtonClick);
        }

        el.setAttribute('data-state', saved ? saved.value : 0);
        if (saved && saved.isTouched) el.classList.add('is-touched');
    }

    // --- Switches ---
    else if (config.type.startsWith('switch')) {
        el.addEventListener('mousedown', startSwitchDrag);
        el.addEventListener('touchstart', startSwitchDrag, { passive: false });
        const initialVal = saved ? saved.value : (config.defValue || 0);
        const initialTouch = !!(saved && saved.isTouched);
        setSwitchState(el, initialVal, initialTouch);
        if (initialTouch) el.classList.add('is-touched');
        if (initialTouch) el.classList.add('is-touched');
        el.appendChild(document.createElement('div')).className = 'switch-handle';

        // Fix for accidental double-click reset: Require Mod Key, or just make it strict?
        // User Request: "make that not a problem? maybe only fast double click?"
        // Solution: Standardize Reset to ALT + Double Click for switches to prevent conflict with rapid toggling
        el.addEventListener('dblclick', (e) => {
            if (e.altKey || e.ctrlKey || e.metaKey) {
                e.preventDefault();
                resetSwitch(el);
            }
        });
    }
    addTouchLongPress(el);
    el.addEventListener('contextmenu', showContextMenu);
    document.getElementById('synthContainer').appendChild(el);
    if (config.type.startsWith('knob')) updateKnobRangeVisuals(el);
}

// --- 2. PEDALBOARD -------------------------------------------------------

function renderPedalboard() {
    const board = document.getElementById('pedalboard');
    board.innerHTML = '';

    const inner = document.createElement('div');
    inner.id = 'pedalboard-inner';
    board.appendChild(inner);

    // OUTPUT
    const outContainer = document.createElement('div');
    outContainer.className = 'flex flex-col items-center justify-center mr-2';
    const jackOut = document.createElement('div');
    jackOut.id = 'pb_jack_out'; jackOut.className = 'pedal-jack';
    outContainer.appendChild(jackOut);
    const lblOut = document.createElement('span');
    lblOut.className = "text-[10px] text-gray-400 mt-2 uppercase font-bold";
    lblOut.textContent = "Out";
    outContainer.appendChild(lblOut);
    inner.appendChild(outContainer);

    // PEDALS
    activePedalChain.forEach((pedalId, index) => {
        const def = PEDAL_DEFINITIONS[pedalId];
        if (!def) return;

        const el = document.createElement('div');
        el.className = `pedal ${def.class}`;
        el.id = `pedal_${pedalId}`;
        el.draggable = true;
        el.dataset.index = index;

        // Drag Events
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
            el.style.opacity = '0.4';
        });
        el.addEventListener('dragend', (e) => {
            el.style.opacity = '1';
            document.querySelectorAll('.pedal').forEach(p => p.style.border = '');
        });
        el.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.style.border = '2px dashed white'; });
        el.addEventListener('dragleave', () => el.style.border = '');
        el.addEventListener('drop', (e) => {
            e.stopPropagation(); e.preventDefault();
            const oldIndex = parseInt(e.dataTransfer.getData('text/plain'));
            if (oldIndex !== index) {
                const item = activePedalChain.splice(oldIndex, 1)[0];
                activePedalChain.splice(index, 0, item);
                saveState(); renderPedalboard(); connectPedalChain(); triggerHandlingNoise();
            }
        });

        // UI
        const led = document.createElement('div'); led.className = 'pedal-led'; el.appendChild(led);
        const title = document.createElement('div'); title.className = 'pedal-title'; title.textContent = def.name; el.appendChild(title);
        const kRow = document.createElement('div'); kRow.className = 'pedal-knobs';

        def.knobs.forEach(k => {
            const wrap = document.createElement('div'); wrap.className = 'pedal-knob-wrapper';
            const knob = document.createElement('div'); knob.className = 'pedal-knob'; knob.id = k.id; knob.dataset.type = 'knob-small';
            const saved = componentStates[k.id]; const val = saved ? saved.value : k.def; knob.style.setProperty('--angle', val);
            if (!saved) componentStates[k.id] = { type: 'knob-small', value: val, isTouched: false };

            knob.addEventListener('mousedown', (e) => { e.stopPropagation(); startKnobDrag(e); });
            knob.addEventListener('touchstart', (e) => { e.stopPropagation(); startKnobDrag(e); }, { passive: false });
            knob.addEventListener('wheel', handleKnobWheel, { passive: false });
            knob.addEventListener('dblclick', (e) => { e.preventDefault(); updateKnobAngle(knob, k.def); });

            const lbl = document.createElement('div'); lbl.className = 'pedal-knob-label'; lbl.textContent = k.label;
            wrap.appendChild(knob); wrap.appendChild(lbl); kRow.appendChild(wrap);
        });
        el.appendChild(kRow);

        const sw = document.createElement('div'); sw.className = 'stomp-switch';
        sw.onclick = () => {
            const isActive = el.classList.toggle('active');
            componentStates[`pedal_${pedalId}_active`] = { value: isActive ? 1 : 0 };
            updateAudioParams(); triggerHandlingNoise();
        };
        if (componentStates[`pedal_${pedalId}_active`]?.value === 1) el.classList.add('active');
        el.appendChild(sw);

        el.addEventListener('contextmenu', (e) => { showContextMenu(e, pedalId); });
        addTouchLongPress(el, (e) => showContextMenu(e, pedalId));
        inner.appendChild(el);
    });

    // INPUT
    const inContainer = document.createElement('div');
    inContainer.className = 'flex flex-col items-center justify-center ml-2';
    const jackIn = document.createElement('div'); jackIn.id = 'pb_jack_in'; jackIn.className = 'pedal-jack';
    const lblIn = document.createElement('span'); lblIn.className = "text-[10px] text-gray-400 mt-2 uppercase font-bold"; lblIn.textContent = "In";
    inContainer.appendChild(jackIn); inContainer.appendChild(lblIn);
    inner.appendChild(inContainer);

    setTimeout(() => {
        if (typeof updateInterfaceScaling === 'function') updateInterfaceScaling();
        updatePedalCables();
    }, 0);
}

function updatePedalCables() {
    const layer = document.getElementById('cableLayer');
    layer.querySelectorAll('.snake-cable').forEach(e => e.remove());
    layer.querySelectorAll('.pedal-link-cable').forEach(e => e.remove());

    const board = document.getElementById('pedalboard');
    if (!board || !board.classList.contains('open')) return;

    const getSafeLoc = (elementId) => {
        const el = document.getElementById(elementId);
        const container = document.getElementById('synthContainer');
        if (!el || !container) return null;

        const elRect = el.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        const currentScale = (typeof VIEWPORT !== 'undefined') ? VIEWPORT.scale : 1.0;

        return {
            x: ((elRect.left + elRect.width / 2) - contRect.left) / currentScale,
            y: ((elRect.top + elRect.height / 2) - contRect.top) / currentScale
        };
    };

    const drawSnake = (id1, id2, color) => {
        const p1 = getSafeLoc(id1);
        const p2 = getSafeLoc(id2);
        if (!p1 || !p2) return;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('snake-cable');
        const drop = (p2.y - p1.y) * 0.6;
        const d = `M${p1.x},${p1.y} C${p1.x},${p1.y + drop} ${p2.x},${p2.y - drop} ${p2.x},${p2.y}`;

        path.setAttribute('d', d);
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '8');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('opacity', '0.9');
        path.style.pointerEvents = 'none';
        layer.appendChild(path);
    };

    drawSnake('jack-stomnpSend', 'pb_jack_in', '#222');
    drawSnake('pb_jack_out', 'jack-stompReturn', '#222');
}

// --- 3. CABLE VISUALIZATION ----------------------------------------------

function drawCable(startId, endId, color, isTemp, tempX, tempY, droop, label) {
    const startPos = getPos(startId);
    const container = document.getElementById('synthContainer');

    const rect = container.getBoundingClientRect();
    const currentZoom = (typeof VIEWPORT !== 'undefined') ? VIEWPORT.scale : 1.0;
    const unzoomedWidth = rect.width / currentZoom;
    const scale = unzoomedWidth / 1200;

    const endPos = isTemp
        ? { x: tempX - rect.left, y: tempY - rect.top }
        : getPos(endId);

    if (!startPos || !endPos) return;

    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const isHidden = dist < 20;

    const baseId = `cable-${startId}-${endId}`;
    const layer = document.getElementById('cableLayer');

    // Physics
    let hang = 50 + (dist * 0.15);
    const gravityScale = Math.min(1.0, Math.abs(dx) / 60);
    hang *= gravityScale;
    if (!isTemp) hang += (droop * scale);

    let xOffset = 0;
    if (Math.abs(dx) < 30) xOffset = 40 * (1 - (Math.abs(dx) / 30));

    const cp1x = startPos.x + (dx * 0.2) + xOffset;
    const cp1y = startPos.y + hang;
    const cp2x = endPos.x - (dx * 0.2) + xOffset;
    const cp2y = endPos.y + hang;

    const d = `M${startPos.x},${startPos.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endPos.x},${endPos.y}`;

    let path = document.getElementById(isTemp ? 'tempCable' : baseId);
    if (!path) {
        path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.id = isTemp ? 'tempCable' : baseId;
        path.style.fill = 'none';
        path.style.pointerEvents = 'none';
        layer.appendChild(path);
    }
    path.setAttribute('d', d);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', Math.max(4, 8 * scale));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    if (!isTemp) path.style.filter = "drop-shadow(0px 4px 2px rgba(0,0,0,0.3))";
    path.setAttribute('opacity', (isTemp && isHidden) ? '0' : (isTemp ? '0.9' : '1.0'));

    const headRadius = Math.max(6, 11 * scale);

    const drawHead = (suffix, x, y, visible = true) => {
        const headId = isTemp ? `tempCable-head-${suffix}` : `${baseId}-head-${suffix}`;
        let head = document.getElementById(headId);
        if (!head) {
            head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            head.id = headId;
            head.style.pointerEvents = 'none';
            layer.appendChild(head);
        }
        head.setAttribute('r', headRadius);
        head.setAttribute('cx', x);
        head.setAttribute('cy', y);
        head.setAttribute('fill', color);
        head.setAttribute('stroke', 'rgba(0,0,0,0.2)');
        head.setAttribute('stroke-width', 1);
        head.style.display = visible ? 'block' : 'none';
    };

    drawHead('start', startPos.x, startPos.y, !isHidden);
    drawHead('end', endPos.x, endPos.y, !isHidden);

    if (!isTemp) {
        const hitId = baseId + '-hit';
        let hitPath = document.getElementById(hitId);
        if (!hitPath) {
            hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            hitPath.id = hitId;
            hitPath.classList.add('cable-hit-zone');
            hitPath.setAttribute('stroke', '#FF0000');
            hitPath.setAttribute('stroke-width', '50');
            hitPath.setAttribute('fill', 'none');
            hitPath.style.cursor = 'grab';

            hitPath.addEventListener('mouseenter', () => { if (!isDraggingCable) highlightCable(baseId); });
            hitPath.addEventListener('mouseleave', () => { if (!isDraggingCable) unhighlightCable(baseId); });
            hitPath.addEventListener('mousedown', (e) => {
                if (isPerformanceMode) return;
                if (e.button !== 0) return;
                startCableDrag(e, startId, endId);
            });
            hitPath.addEventListener('contextmenu', (e) => {
                if (isPerformanceMode) return;
                handleCableRightClick(e, startId, endId);
            });
            hitPath.addEventListener('dblclick', (e) => {
                if (isPerformanceMode) return;
                e.preventDefault();
                removeCable(startId, endId);
            });
            hitPath.addEventListener('touchstart', (e) => {
                if (isPerformanceMode) return;
                e.preventDefault();
                highlightCable(baseId);
                startCableDrag(e, startId, endId);
            }, { passive: false });
            hitPath.addEventListener('touchend', () => unhighlightCable(baseId));
            addTouchLongPress(hitPath, (e) => {
                if (isPerformanceMode) return;
                handleCableRightClick(e, startId, endId);
            });
            layer.appendChild(hitPath);
        }
        hitPath.setAttribute('d', d);

        if (label) {
            let labelEl = document.getElementById(`${baseId}-label`);
            if (!labelEl) {
                labelEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                labelEl.id = `${baseId}-label`;
                labelEl.setAttribute('dominant-baseline', 'hanging');
                labelEl.setAttribute('text-anchor', 'middle');
                labelEl.setAttribute('font-size', '12px');
                labelEl.setAttribute('font-weight', 'bold');
                labelEl.setAttribute('fill', '#000');
                labelEl.setAttribute('stroke', '#fff');
                labelEl.setAttribute('stroke-width', '3');
                labelEl.setAttribute('paint-order', 'stroke');
                labelEl.style.pointerEvents = 'none';
                layer.appendChild(labelEl);
            }
            if (path.getTotalLength) {
                try {
                    const mid = path.getPointAtLength(path.getTotalLength() * 0.5);
                    labelEl.setAttribute('x', mid.x);
                    labelEl.setAttribute('y', mid.y + 15);
                    labelEl.textContent = label;
                } catch (e) { }
            }
        }
    }
}

function redrawCables() {
    const layer = document.getElementById('cableLayer');
    const elementsToRemove = [];

    for (let i = layer.children.length - 1; i >= 0; i--) {
        const child = layer.children[i];
        if (child.classList.contains('snake-cable')) continue;
        if (child.id && (child.id.startsWith('cable-') || child.id.startsWith('tempCable'))) {
            elementsToRemove.push(child);
        }
    }

    elementsToRemove.forEach(el => el.remove());
    cableData.forEach(c => drawCable(c.start, c.end, c.color, false, 0, 0, c.droopOffset, c.label));
    updatePedalCables();
    updateFocusState();
}

function removeCable(s, e, preserveHitBox = false) {
    cableData = cableData.filter(c => !(c.start === s && c.end === e) && !(c.start === e && c.end === s));

    const id1 = `cable-${s}-${e}`;
    const id2 = `cable-${e}-${s}`;
    const kill = (id) => document.getElementById(id)?.remove();

    kill(id1); kill(id2);
    kill(`${id1}-label`); kill(`${id2}-label`);
    kill(`${id1}-head-start`); kill(`${id1}-head-end`);
    kill(`${id2}-head-start`); kill(`${id2}-head-end`);

    const hit1 = document.getElementById(`${id1}-hit`);
    const hit2 = document.getElementById(`${id2}-hit`);
    const targetHit = hit1 || hit2;

    if (targetHit) {
        if (preserveHitBox) {
            zombieHitPath = targetHit;
            zombieHitPath.style.pointerEvents = 'none';
        } else {
            targetHit.remove();
        }
    }
    saveState();
}

function highlightCable(baseId) {
    const layer = document.getElementById('cableLayer');
    const visualPath = document.getElementById(baseId);
    layer.classList.add('cable-layer-dimmed');

    if (visualPath) {
        visualPath.classList.add('cable-focus');
        visualPath.parentNode.appendChild(visualPath);
        const headStart = document.getElementById(`${baseId}-head-start`);
        const headEnd = document.getElementById(`${baseId}-head-end`);
        if (headStart) visualPath.parentNode.appendChild(headStart);
        if (headEnd) visualPath.parentNode.appendChild(headEnd);
    }
}

function unhighlightCable(baseId) {
    const layer = document.getElementById('cableLayer');
    const visualPath = document.getElementById(baseId);
    layer.classList.remove('cable-layer-dimmed');
    if (visualPath) visualPath.classList.remove('cable-focus');
}

function disableGhostMode() {
    const layer = document.getElementById('cableLayer');
    if (layer) {
        layer.classList.remove('cable-layer-dimmed');
        layer.querySelectorAll('.cable-focus').forEach(el => el.classList.remove('cable-focus'));
    }
}

function removeTempCableVisuals() {
    const temps = document.querySelectorAll('[id^="tempCable"]');
    temps.forEach(el => el.remove());
}

function getZoomedCablePos(e) {
    const container = document.getElementById('synthContainer');
    const rect = container.getBoundingClientRect();
    const currentScale = (typeof VIEWPORT !== 'undefined') ? VIEWPORT.scale : 1.0;
    const pos = getEventPos(e);

    const internalX = (pos.x - rect.left) / currentScale;
    const internalY = (pos.y - rect.top) / currentScale;

    return {
        x: internalX + rect.left,
        y: internalY + rect.top
    };
}

// --- 4. INPUT HANDLING (CABLES & LOGIC) ----------------------------------

function addTouchLongPress(element, callback) {
    let timer;
    let touchStartX, touchStartY;
    const PRESS_DELAY = 600; // ms to trigger context menu
    const MOVE_TOLERANCE = 10; // pixels

    const onTouchStart = (e) => {
        if (e.touches.length !== 1) return;

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        timer = setTimeout(() => {
            // 1. Create a fake event object compatible with showContextMenu logic
            const fakeEvent = {
                preventDefault: () => { },
                stopPropagation: () => { },
                currentTarget: element,
                target: e.target,
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY,
                pageX: e.touches[0].pageX,
                pageY: e.touches[0].pageY,
                touches: e.touches, // Pass touches through
            };

            // 2. Kill any active drags that started on touchstart
            // (This prevents the knob/cable from moving while the menu is open)
            if (typeof isDraggingKnob !== 'undefined' && isDraggingKnob) {
                isDraggingKnob = false;
                if (typeof stopKnobDrag === 'function') stopKnobDrag();
            }
            if (typeof isDraggingCable !== 'undefined' && isDraggingCable) {
                isDraggingCable = false;
                if (typeof stopCableDrag === 'function') stopCableDrag();
                // Clean up ghost cable if needed
                if (typeof removeTempCableVisuals === 'function') removeTempCableVisuals();
                if (typeof disableGhostMode === 'function') disableGhostMode();
            }
            if (typeof isDraggingSwitch !== 'undefined' && isDraggingSwitch) {
                isDraggingSwitch = false;
                if (typeof stopSwitchDrag === 'function') stopSwitchDrag(fakeEvent);
            }

            // 3. Fire the specific callback (usually showContextMenu)
            if (callback) {
                callback(fakeEvent);
            } else {
                // Default fallback
                showContextMenu(fakeEvent);
            }
        }, PRESS_DELAY);
    };

    const onTouchEnd = () => {
        clearTimeout(timer);
    };

    const onTouchMove = (e) => {
        const dx = Math.abs(e.touches[0].clientX - touchStartX);
        const dy = Math.abs(e.touches[0].clientY - touchStartY);
        // If finger moves too much, cancel the long press (it's a drag)
        if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) {
            clearTimeout(timer);
        }
    };

    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchend', onTouchEnd, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: true });
}



function handleGlobalMouseUp(e) {
    if (zombieHitPath) { zombieHitPath.remove(); zombieHitPath = null; }

    // 1. DROOP DRAG CLEANUP
    if (isDroopDrag) {
        disableGhostMode();
        isDraggingCable = false;
        currentDraggedCable = null;
        isDroopDrag = false;
        saveState();
        removeTempCableVisuals();

        document.removeEventListener('mousemove', dragCable);
        document.removeEventListener('touchmove', dragCable);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchend', handleGlobalMouseUp);
        return;
    }

    // 2. CONNECTION LOGIC
    if (currentCableStart) {
        const pos = getEventPos(e);
        const timeDiff = Date.now() - dragStartTime;
        const distDiff = Math.sqrt(Math.pow(pos.x - dragStartX, 2) + Math.pow(pos.y - dragStartY, 2));

        if (timeDiff < 200 && distDiff < 5) {
            isCablePickupMode = true;
        }

        if (isCablePickupMode) return;

        // Uses findNearestJack from GLOBALS
        const nearest = findNearestJack(pos.x, pos.y);

        if (nearest && nearest !== currentCableStart && currentDraggedCable) {
            const isDup = cableData.some(c => (c.start === currentCableStart && c.end === nearest) || (c.start === nearest && c.end === currentCableStart));

            if (!isDup) {
                const color = currentDraggedCable.color;
                cableData.push({ start: currentCableStart, end: nearest, color: color, droopOffset: (Math.random() * 20 - 10) });
                redrawCables();
                saveState();

                const targetEl = document.getElementById(nearest);
                targetEl.classList.add('active-target');
                setTimeout(() => targetEl.classList.remove('active-target'), 200);
                updateAudioGraph();
            }
        }

        disableGhostMode();
        const startEl = document.getElementById(currentCableStart);
        if (startEl) startEl.classList.remove('active');

        currentCableStart = null;
        currentDraggedCable = null;
        isDraggingCable = false;
        isCablePickupMode = false;

        removeTempCableVisuals();

        document.removeEventListener('mousemove', dragCable);
        document.removeEventListener('touchmove', dragCable);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchend', handleGlobalMouseUp);
    }
}

function handleGlobalMouseDown(e) {
    if (isCablePickupMode && isDraggingCable) {
        const target = e.target;
        if (target.classList.contains('jack') || target.closest('.jack') || target.classList.contains('cable-hit-zone')) {
            return;
        }

        disableGhostMode();
        const startEl = document.getElementById(currentCableStart);
        if (startEl) startEl.classList.remove('active');

        currentCableStart = null;
        currentDraggedCable = null;
        isDraggingCable = false;
        isCablePickupMode = false;
        removeTempCableVisuals();

        document.removeEventListener('mousemove', dragCable);
        document.removeEventListener('touchmove', dragCable);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchend', handleGlobalMouseUp);
    }
}

function handleJackMouseDown(e) {
    if (isPerformanceMode) return;

    if (e.button === 2) return;

    if (e.type === 'touchstart') {
        e.preventDefault();
        e.stopPropagation();
    } else {
        e.stopPropagation();
        e.preventDefault();
    }

    const id = e.currentTarget.id;
    lastJackActionTime = Date.now();

    // --- SCENARIO 1: COMPLETING A CONNECTION ---
    if (currentCableStart && isDraggingCable) {

        if (currentCableStart === id) {
            disableGhostMode();
            const startEl = document.getElementById(currentCableStart);
            if (startEl) startEl.classList.remove('active');

            isDraggingCable = false;
            isCablePickupMode = false;
            currentCableStart = null;
            currentDraggedCable = null;
            removeTempCableVisuals();

            document.removeEventListener('mousemove', dragCable);
            document.removeEventListener('touchmove', dragCable);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
            document.removeEventListener('touchend', handleGlobalMouseUp);
            return;
        }

        const color = currentDraggedCable.color;
        const isDup = cableData.some(c => (c.start === currentCableStart && c.end === id) || (c.start === id && c.end === currentCableStart));

        if (!isDup) {
            cableData.push({ start: currentCableStart, end: id, color: color, droopOffset: (Math.random() * 20 - 10) });
            redrawCables();
            saveState();

            const targetEl = document.getElementById(id);
            targetEl.classList.add('active-target');
            setTimeout(() => targetEl.classList.remove('active-target'), 200);
            updateAudioGraph();
        }

        disableGhostMode();
        const startEl = document.getElementById(currentCableStart);
        if (startEl) startEl.classList.remove('active');

        isDraggingCable = false;
        isCablePickupMode = false;
        currentCableStart = null;
        currentDraggedCable = null;
        removeTempCableVisuals();

        document.removeEventListener('mousemove', dragCable);
        document.removeEventListener('touchmove', dragCable);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchend', handleGlobalMouseUp);

        return;
    }

    // --- SCENARIO 2: UNPLUGGING OR CREATING ---
    const stack = cableData.filter(c => c.start === id || c.end === id);

    // A. Unplug Top Cable
    if (stack.length > 0 && !e.shiftKey) {
        const cableToUnplug = stack[stack.length - 1];

        removeCable(cableToUnplug.start, cableToUnplug.end);
        triggerHandlingNoise();

        const anchorJack = (cableToUnplug.start === id) ? cableToUnplug.end : cableToUnplug.start;

        isDraggingCable = true;
        isCablePickupMode = false;
        currentCableStart = anchorJack;

        const pos = getEventPos(e);
        dragStartX = pos.x;
        dragStartY = pos.y;
        dragStartTime = Date.now();

        document.getElementById(anchorJack).classList.add('active');

        currentDraggedCable = {
            start: anchorJack,
            end: null,
            droopOffset: 0,
            color: cableToUnplug.color
        };

        const layer = document.getElementById('cableLayer');
        layer.classList.add('cable-layer-dimmed');

        const container = document.getElementById('synthContainer');
        const rect = container.getBoundingClientRect();

        drawCable(
            anchorJack,
            null,
            currentDraggedCable.color,
            true,
            (pos.x - rect.left) + rect.left,
            (pos.y - rect.top) + rect.top,
            0
        );

    }
    // B. Create New Cable
    else {
        const color = getActiveCableColor();

        isDraggingCable = true;
        isCablePickupMode = false;
        currentCableStart = id;

        const pos = getEventPos(e);
        dragStartX = pos.x;
        dragStartY = pos.y;
        dragStartTime = Date.now();

        document.getElementById(id).classList.add('active');

        const layer = document.getElementById('cableLayer');
        layer.classList.add('cable-layer-dimmed');

        currentDraggedCable = { start: id, end: null, droopOffset: 0, color: color };

        const container = document.getElementById('synthContainer');
        const rect = container.getBoundingClientRect();

        drawCable(
            id,
            null,
            color,
            true,
            (pos.x - rect.left) + rect.left,
            (pos.y - rect.top) + rect.top,
            0
        );
    }

    document.addEventListener('mousemove', dragCable);
    document.addEventListener('touchmove', dragCable, { passive: false });
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);
}

function handleJackClick(e) {
    e.preventDefault();
    e.stopPropagation();
    return;
}

function startCableDrag(e, s, end) {
    if (isPerformanceMode) return;
    if (e.button === 2) return;

    e.stopPropagation();
    if (e.cancelable) e.preventDefault();

    isDraggingCable = true;
    dragStartTime = Date.now();

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    dragStartX = clientX;
    dragStartY = clientY;
    initialCableDragY = clientY;

    const container = document.getElementById('synthContainer');
    const rect = container.getBoundingClientRect();
    const currentScale = (typeof VIEWPORT !== 'undefined' && VIEWPORT.scale) ? VIEWPORT.scale : 1.0;

    const internalX = (clientX - rect.left) / currentScale;
    const internalY = (clientY - rect.top) / currentScale;

    const layer = document.getElementById('cableLayer');
    let activeColor = getActiveCableColor();

    if (end) {
        isDroopDrag = true;
        currentDraggedCable = getCableByIds(s, end);
        initialDroopOffset = currentDraggedCable ? currentDraggedCable.droopOffset : 0;
        if (currentDraggedCable) {
            layer.classList.add('cable-layer-dimmed');
            highlightCable(`cable-${currentDraggedCable.start}-${currentDraggedCable.end}`);
        }
    }
    else {
        isDroopDrag = false;
        currentDraggedCable = { start: s, end: null, droopOffset: 0, color: activeColor };
        initialDroopOffset = 0;
        layer.classList.add('cable-layer-dimmed');
        drawCable(s, null, activeColor, true, internalX + rect.left, internalY + rect.top, 0);
    }

    document.addEventListener('mousemove', dragCable);
    document.addEventListener('touchmove', dragCable, { passive: false });
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);
}

function dragCable(e) {
    if (!isDraggingCable || !currentDraggedCable) return;

    if (e.cancelable) e.preventDefault();

    if (!isCableFramePending) {
        isCableFramePending = true;

        requestAnimationFrame(() => {
            if (!currentDraggedCable) {
                isCableFramePending = false;
                return;
            }

            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            const currentScale = (typeof VIEWPORT !== 'undefined' && VIEWPORT.scale) ? VIEWPORT.scale : 1.0;
            const container = document.getElementById('synthContainer');
            const rect = container.getBoundingClientRect();

            // --- PATH A: DROOP DRAG ---
            if (isDroopDrag) {
                const designWidth = 1200;
                const uiScale = (rect.width / currentScale) / designWidth;
                const deltaY = clientY - initialCableDragY;
                const scaledDelta = (deltaY / currentScale) / uiScale;

                currentDraggedCable.droopOffset = Math.max(-500, Math.min(400, initialDroopOffset + scaledDelta));

                const cableObj = cableData.find(c => c === currentDraggedCable);
                if (cableObj) {
                    drawCable(cableObj.start, cableObj.end, cableObj.color, false, 0, 0, currentDraggedCable.droopOffset, cableObj.label);
                }
            }

            // --- PATH B: CONNECTION DRAG ---
            else {
                const rawInternalX = (clientX - rect.left) / currentScale;
                const rawInternalY = (clientY - rect.top) / currentScale;

                const snapId = findNearestJack(clientX, clientY);
                document.querySelectorAll('.jack.active-target').forEach(el => el.classList.remove('active-target'));

                let targetX, targetY;

                if (snapId && snapId !== currentDraggedCable.start) {
                    const snapPos = getPos(snapId);
                    targetX = snapPos.x + rect.left;
                    targetY = snapPos.y + rect.top;
                    document.getElementById(snapId).classList.add('active-target');
                } else {
                    targetX = rawInternalX + rect.left;
                    targetY = rawInternalY + rect.top;
                }

                if (currentDraggedCable.start) {
                    const colorToDraw = currentDraggedCable.color || getActiveCableColor();
                    drawCable(
                        currentDraggedCable.start,
                        null,
                        colorToDraw,
                        true,
                        targetX,
                        targetY,
                        0
                    );
                }
            }

            isCableFramePending = false;
        });
    }
}

function stopCableDrag() {
    isDraggingCable = false;
    currentDraggedCable = null;
    isCableFramePending = false;
    saveState();
    document.removeEventListener('mousemove', dragCable);
    document.removeEventListener('mouseup', stopCableDrag);
    document.removeEventListener('touchmove', dragCable, { passive: false });
    document.removeEventListener('touchend', stopCableDrag);
}

// --- 5. INTERACTION (KNOBS, SWITCHES, NOTES) ----------------------------
// knobDragLastAngle removed (now tracked per-touch in activeKnobTouches)

function updateKnobAngle(el, val, isTouched = true) {
    el.style.setProperty('--angle', val);

    if (isTouched) el.classList.add('is-touched');
    else el.classList.remove('is-touched');

    const existingState = componentStates[el.id] || {};
    componentStates[el.id] = {
        ...existingState,
        type: el.dataset.type,
        value: val,
        isTouched: isTouched
    };
    updateAudioParams();
    updateFocusState();
}

function resetKnob(el) {
    updateKnobAngle(el, SYSTEM_CONFIG[el.id]?.defValue || 0, false);
    el.classList.remove('is-touched');
    saveState();
}
function startKnobDrag(e) {
    // --- MIDI LEARN INTERCEPT ---
    console.log("startKnobDrag: Learn Mode?", (typeof midiLearnMode !== 'undefined' ? midiLearnMode : 'undefined'));
    if (typeof midiLearnMode !== 'undefined' && midiLearnMode) {
        e.preventDefault(); e.stopPropagation();

        let target = e.target;
        while (target && !target.id && !target.classList.contains('component')) {
            target = target.parentElement;
        }
        if (!target || !target.id) return;

        // Visual Feedback
        document.querySelectorAll('.learn-active').forEach(el => el.classList.remove('learn-active'));

        pendingLearnTarget = target.id;
        target.classList.add('learn-active');

        showMessage(`Listening for MIDI to map to: ${target.id}...`, "info");
        return;
    }
    // -----------------------------
    if (e.target.tagName === 'INPUT') return;

    // PREVENT viewport pan/zoom from seeing this touch
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    // Identify touch identifier or use 'mouse'
    const identifier = (e.touches && e.touches.length > 0) ? e.touches[e.touches.length - 1].identifier : 'mouse';
    const touch = (e.touches && e.touches.length > 0) ? e.touches[e.touches.length - 1] : e;

    isDraggingKnob = true;
    const el = e.currentTarget;
    el.classList.add('is-touched');
    triggerHandlingNoise(false);

    // NEW: Initialize the angle tracker for this specific touch
    const rect = el.getBoundingClientRect();
    const cx = touch.clientX;
    const cy = touch.clientY;

    // Calculate initial raw angle (-180 to 180)
    let deg = (Math.atan2(cy - (rect.top + rect.height / 2), cx - (rect.left + rect.width / 2)) * 180 / Math.PI) + 90;
    if (deg > 180) deg -= 360;

    activeKnobTouches[identifier] = {
        el: el,
        lastAngle: deg
    };

    // For biological feedback or other single-point logic:
    currentKnobElement = el;

    if (identifier === 'mouse') {
        document.addEventListener('mousemove', dragKnob);
        document.addEventListener('mouseup', stopKnobDrag);
    } else {
        document.addEventListener('touchmove', dragKnob, { passive: false });
        document.addEventListener('touchend', stopKnobDrag);
        document.addEventListener('touchcancel', stopKnobDrag);
    }
}
function stopKnobDrag(e) {
    if (e.type.startsWith('touch')) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const id = e.changedTouches[i].identifier;
            delete activeKnobTouches[id];
        }
    } else {
        delete activeKnobTouches['mouse'];
    }

    if (Object.keys(activeKnobTouches).length === 0) {
        isDraggingKnob = false;
        document.removeEventListener('mousemove', dragKnob);
        document.removeEventListener('mouseup', stopKnobDrag);
        document.removeEventListener('touchmove', dragKnob);
        document.removeEventListener('touchend', stopKnobDrag);
        document.removeEventListener('touchcancel', stopKnobDrag);
        saveState();
    }
}
function dragKnob(e) {
    if (!isDraggingKnob) return;

    const touchesToProcess = e.changedTouches ? e.changedTouches : [e];

    for (let i = 0; i < touchesToProcess.length; i++) {
        const t = touchesToProcess[i];
        const identifier = t.identifier !== undefined ? t.identifier : 'mouse';
        const data = activeKnobTouches[identifier];

        if (!data) continue;

        e.preventDefault();
        const el = data.el;
        const rect = el.getBoundingClientRect();
        const cx = t.clientX;
        const cy = t.clientY;

        // 1. Calculate current raw angle
        let deg = (Math.atan2(cy - (rect.top + rect.height / 2), cx - (rect.left + rect.width / 2)) * 180 / Math.PI) + 90;
        if (deg > 180) deg -= 360;

        // 2. Calculate Delta (Change since last frame)
        let delta = deg - data.lastAngle;

        // 3. Fix Wrap-Around
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        data.lastAngle = deg; // Update for next frame

        // 4. Apply Delta to Current Value
        const state = componentStates[el.id];
        const currentVal = state ? state.value : 0;
        let newVal = currentVal + delta;

        // 5. Apply Limits
        let minLimit = -150;
        let maxLimit = 150;

        if (el.dataset.type === 'knob-small') {
            minLimit = -135;
            maxLimit = 135;
        }

        if (state && state.range) {
            minLimit = state.range[0];
            maxLimit = state.range[1];
        }

        newVal = Math.max(minLimit, Math.min(maxLimit, newVal));

        // 6. Audio Feedback & Update
        if (Math.abs(newVal - lastScratchAngle) > 3) {
            triggerHandlingNoise(true);
            lastScratchAngle = newVal;
        }

        updateKnobAngle(el, newVal);
    }
}

function updateKnobRangeVisuals(el) {
    const state = componentStates[el.id];
    const path = el.querySelector('.knob-range-path');
    if (!path) return;

    let radius = 46;
    let min = -150;
    let max = 150;
    switch (el.dataset.type) {
        case 'knob-large':
            radius = 49; // Tighter on large knobs
            min = -150;
            max = 150;
            break;
        case 'knob-medium':
            radius = 54;
            min = -150;
            max = 150;
            break;
        case 'knob-small':
            radius = 68;
            min = -135;
            max = 135;
            break;
        default:
            radius = 46;
    }

    if (state && state.range && Array.isArray(state.range)) {
        min = (typeof state.range[0] === 'number' && !isNaN(state.range[0])) ? state.range[0] : -150;
        max = (typeof state.range[1] === 'number' && !isNaN(state.range[1])) ? state.range[1] : 150;
        path.style.display = 'block';
    } else {
        path.style.display = 'none';

        return;
    }


    const startPoint = polarToCartesian(50, 50, radius, min);
    const endPoint = polarToCartesian(50, 50, radius, max);

    let diff = max - min;
    if (diff < 0) diff += 360;
    const largeArcFlag = diff <= 180 ? "0" : "1";

    const d = describeArc(50, 50, radius, radius - 4, min, max);

    path.setAttribute('d', d);
}




function handleKnobWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    const el = e.currentTarget;
    const isFine = e.shiftKey || e.ctrlKey;

    // Improved sensitivity for trackpads: use deltaY directly but scaled
    // Standard mouse wheel usually gives +/- 100, trackpads vary.
    // We'll use a sensitivity factor to smooth it out.
    const sensitivity = isFine ? 0.2 : 0.5;

    // Invert deltaY so scrolling up increases value
    const change = -e.deltaY * sensitivity;

    let currentVal = componentStates[el.id] ? parseFloat(componentStates[el.id].value) : (SYSTEM_CONFIG[el.id]?.defValue || 0);
    let newVal = currentVal + change;
    newVal = Math.max(-150, Math.min(150, newVal));

    updateKnobAngle(el, newVal);
    triggerHandlingNoise(false);
}
function setSwitchState(el, state, isTouched = true) {
    el.setAttribute('data-state', state);
    const existing = componentStates[el.id] || {};
    componentStates[el.id] = { ...existing, type: el.dataset.type, value: state, isTouched: isTouched };
    if (isTouched) {
        el.classList.add('is-touched');
    } else {
        el.classList.remove('is-touched');
    }
    updateAudioParams();
    updateFocusState();
}
function handleSwitchClick(e) { const el = e.currentTarget; const states = el.dataset.type.includes('3way') ? 3 : 2; setSwitchState(el, (parseInt(el.getAttribute('data-state') || 0) + 1) % states); el.classList.add('is-touched'); saveState(); }
function resetSwitch(el) {
    const def = SYSTEM_CONFIG[el.id]?.defValue || 0;
    setSwitchState(el, def, false);
    saveState();
}
function handleButtonClick(e) {
    const el = e.currentTarget;
    const val = parseInt(el.getAttribute('data-state') || 0) === 0 ? 1 : 0;
    el.setAttribute('data-state', val);
    el.classList.add('is-touched');
    const existing = componentStates[el.id] || {};
    componentStates[el.id] = { ...existing, type: 'button', value: val, isTouched: true };
    updateAudioParams();
    updateFocusState();
    saveState();
}

function createNoteElement(d) {
    // Auto-show labels/notes if hidden
    if (!showComponentLabels) toggleLabels();

    const el = document.createElement('div'); el.className = 'note-element'; el.id = d.id; el.style.left = d.x; el.style.top = d.y; el.textContent = d.text; el.contentEditable = true;
    if (d.color) el.style.color = d.color; if (d.backgroundColor) el.style.backgroundColor = d.backgroundColor; if (d.border) el.style.border = d.border; if (!d.color) el.classList.add('default-style');
    el.addEventListener('mousedown', startDragNote); el.addEventListener('touchstart', startDragNote); el.addEventListener('blur', saveState); el.addEventListener('contextmenu', showContextMenu);
    addTouchLongPress(el);
    return el;
}
function startDragNote(e) {
    e.stopPropagation();
    currentNoteElement = e.currentTarget;
    isNoteDragging = false;
    currentNoteElement.style.transition = 'none';
    const rect = currentNoteElement.getBoundingClientRect();
    const cont = document.getElementById('synthContainer').getBoundingClientRect();
    startNoteDragX = (rect.left + rect.width / 2 - cont.left) - ((e.clientX || e.touches[0].clientX) - cont.left);
    startNoteDragY = (rect.top + rect.height / 2 - cont.top) - ((e.clientY || e.touches[0].clientY) - cont.top);
    document.addEventListener('mousemove', dragNote);
    document.addEventListener('mouseup', stopDragNote);
    document.addEventListener('touchmove', dragNote, { passive: false });
    document.addEventListener('touchend', stopDragNote);
}
function dragNote(e) { if (!currentNoteElement) return; if (!isNoteDragging) { isNoteDragging = true; currentNoteElement.style.cursor = 'grabbing'; document.activeElement.blur(); } const cont = document.getElementById('synthContainer').getBoundingClientRect(); const x = ((e.clientX || e.touches[0].clientX) - cont.left + startNoteDragX) / cont.width * 100; const y = ((e.clientY || e.touches[0].clientY) - cont.top + startNoteDragY) / cont.height * 100; currentNoteElement.style.left = x + '%'; currentNoteElement.style.top = y + '%'; }
function stopDragNote() {
    if (currentNoteElement) {
        currentNoteElement.style.cursor = 'grab';
        currentNoteElement.style.transition = '';
        if (isNoteDragging) saveState();
        else currentNoteElement.focus();
    }
    isNoteDragging = false;
    currentNoteElement = null;
    document.removeEventListener('mousemove', dragNote);
    document.removeEventListener('mouseup', stopDragNote);
    document.removeEventListener('touchmove', dragNote);
    document.removeEventListener('touchend', stopDragNote);
}
function saveNotePositions() { noteData = Array.from(document.querySelectorAll('.note-element')).map(el => ({ id: el.id, text: el.textContent, x: el.style.left, y: el.style.top, color: el.style.color, backgroundColor: el.style.backgroundColor, border: el.style.border })); return noteData; }

function startChassisDrag(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.component') || e.target.tagName === 'path' || e.target.tagName === 'text' || e.target.classList.contains('note-element') || e.target.tagName === 'INPUT') return;
    e.preventDefault();
    isDraggingChassis = true;
    const cx = e.clientX || e.touches[0].clientX;
    const cy = e.clientY || e.touches[0].clientY;
    lastChassisPos = { x: cx, y: cy };
    triggerHandlingNoise(false);
    document.addEventListener('mousemove', dragChassis);
    document.addEventListener('mouseup', stopChassisDrag);
    document.addEventListener('touchmove', dragChassis, { passive: false });
    document.addEventListener('touchend', stopChassisDrag);
}
function dragChassis(e) {
    if (!isDraggingChassis) return;
    e.preventDefault();
    const cx = e.clientX || e.touches[0].clientX;
    const cy = e.clientY || e.touches[0].clientY;
    const dx = cx - lastChassisPos.x;
    const dy = cy - lastChassisPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 2) {
        triggerHandlingNoise(true);
        lastChassisPos = { x: cx, y: cy };
    }
}
function stopChassisDrag() {
    isDraggingChassis = false;
    document.removeEventListener('mousemove', dragChassis);
    document.removeEventListener('mouseup', stopChassisDrag);
    document.removeEventListener('touchmove', dragChassis);
    document.removeEventListener('touchend', stopChassisDrag);
}

function startSwitchDrag(e) {
    // --- MIDI LEARN INTERCEPT ---
    if (typeof midiLearnMode !== 'undefined' && midiLearnMode) {
        e.preventDefault(); e.stopPropagation();
        // Similar to Knob logic, define target
        let target = e.currentTarget;
        if (!target || !target.id) return;

        // Visual Feedback
        document.querySelectorAll('.learn-active').forEach(el => el.classList.remove('learn-active'));

        pendingLearnTarget = target.id;
        target.classList.add('learn-active');

        showMessage(`Listening for MIDI to map to: ${target.id}...`, "info");
        return;
    }
    // -----------------------------

    // --- MOMENTARY SWITCH LOGIC (Shift + Click) ---
    if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();

        const is3Way = currentSwitchEl.dataset.type.includes('3way');
        // Define "Momentary Down" as the last state (2 for 3-way, 1 for 2-way)
        const downState = is3Way ? 2 : 1;
        // Define "Return" state (Middle for 3-way, Top/0 for 2-way)
        const returnState = is3Way ? 1 : 0;

        setSwitchState(currentSwitchEl, downState);
        triggerHandlingNoise();

        const onUp = () => {
            setSwitchState(currentSwitchEl, returnState);
            triggerHandlingNoise();
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchend', onUp);
        };

        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);
        return; // Skip drag logic
    }

    e.preventDefault();
    e.stopPropagation();
    isDraggingSwitch = true;
    currentSwitchEl = e.currentTarget;
    hasSwitchMoved = false;
    triggerHandlingNoise();
    switchStartY = e.clientY || e.touches[0].clientY;
    switchStartX = e.clientX || e.touches[0].clientX;
    switchStartVal = parseInt(currentSwitchEl.getAttribute('data-state') || 0);
    if (currentSwitchEl.id === 'switch-2way-amp') {
        document.body.style.cursor = 'ew-resize';
    } else {
        document.body.style.cursor = 'ns-resize';
    }
    document.addEventListener('mousemove', dragSwitch);
    document.addEventListener('mouseup', stopSwitchDrag);
    document.addEventListener('touchmove', dragSwitch, { passive: false });
    document.addEventListener('touchend', stopSwitchDrag);
}

function dragSwitch(e) {
    if (!isDraggingSwitch || !currentSwitchEl) return;
    e.preventDefault();
    const currentScale = (typeof VIEWPORT !== 'undefined' && VIEWPORT.scale) ? VIEWPORT.scale : 1.0;
    const clientY = e.clientY || e.touches[0].clientY;
    const clientX = e.clientX || e.touches[0].clientX;
    let delta = 0;
    if (currentSwitchEl.id === 'switch-2way-amp') {
        delta = (clientX - switchStartX) / currentScale;
    } else {
        delta = (clientY - switchStartY) / currentScale;
    }
    if (Math.abs(delta) > 5) {
        hasSwitchMoved = true;
    } else {
        return;
    }
    const stepDistance = 20;
    const stepsMoved = Math.round(delta / stepDistance);
    let newState = switchStartVal + stepsMoved;
    const maxStates = currentSwitchEl.dataset.type.includes('3way') ? 3 : 2;
    if (newState < 0) newState = 0;
    if (newState >= maxStates) newState = maxStates - 1;
    const currentState = parseInt(currentSwitchEl.getAttribute('data-state'));
    if (newState !== currentState) {
        setSwitchState(currentSwitchEl, newState);
        currentSwitchEl.classList.add('is-touched');
        triggerHandlingNoise(true);
    }
}
function stopSwitchDrag(e) {
    if (!isDraggingSwitch) return;
    document.removeEventListener('mousemove', dragSwitch);
    document.removeEventListener('mouseup', stopSwitchDrag);
    document.removeEventListener('touchmove', dragSwitch);
    document.removeEventListener('touchend', stopSwitchDrag);
    document.body.style.cursor = '';
    isDraggingSwitch = false;
    if (!hasSwitchMoved && currentSwitchEl) {
        const maxStates = currentSwitchEl.dataset.type.includes('3way') ? 3 : 2;
        const current = parseInt(currentSwitchEl.getAttribute('data-state') || 0);
        setSwitchState(currentSwitchEl, (current + 1) % maxStates);
        currentSwitchEl.classList.add('is-touched');
    }
    saveState();
    currentSwitchEl = null;
}

// --- 6. MENUS & TOOLS ----------------------------------------------------

function showContextMenu(e, pedalId = null) {
    e.preventDefault();
    e.stopPropagation();
    const menu = document.getElementById('contextMenu');
    const el = e.currentTarget;
    contextTarget = el.id === 'synthContainer' ? null : el;
    contextPedalId = pedalId;

    Array.from(menu.children).forEach(l => l.style.display = 'none');

    if (pedalId) {
        const rmv = menu.querySelector('[data-action="removePedal"]');
        rmv.style.display = 'block';
        rmv.textContent = `Remove ${PEDAL_DEFINITIONS[pedalId].name}`;
    }
    else if (el.classList.contains('jack')) {
        const id = el.id;
        let createBtn = menu.querySelector('[data-action="createStack"]');
        if (!createBtn) {
            createBtn = document.createElement('li');
            createBtn.dataset.action = 'createStack';
            createBtn.textContent = 'Create Cable';
            menu.appendChild(createBtn);
        }
        createBtn.style.display = 'block';
        const isOutput = /out|sqr|sin|send|volt/i.test(id);
        if (isOutput) {
            let probe1 = menu.querySelector('[data-action="probe1"]');
            if (!probe1) {
                probe1 = document.createElement('li'); probe1.dataset.action = 'probe1';
                probe1.className = "px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-green-500 font-bold";
                menu.insertBefore(probe1, menu.firstChild);
            }
            probe1.style.display = 'block';
            probe1.textContent = `Scope CH1: ${SYSTEM_CONFIG[id]?.label}`;

            let probe2 = menu.querySelector('[data-action="probe2"]');
            if (!probe2) {
                probe2 = document.createElement('li'); probe2.dataset.action = 'probe2';
                probe2.className = "px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-pink-500 font-bold";
                menu.insertBefore(probe2, probe1.nextSibling);
            }
            probe2.style.display = 'block';
            probe2.textContent = `Scope CH2: ${SYSTEM_CONFIG[id]?.label}`;
        }
        const r = menu.querySelector('[data-action="reset"]');
        r.style.display = 'block'; r.textContent = 'Remove Patch';
    }
    else if (el.id === 'pedalboard') {
        menu.querySelector('[data-action="addPedal"]').style.display = 'block';
    }
    if (el.dataset.type && el.dataset.type.startsWith('knob')) {
        menu.querySelector('[data-action="setValue"]').style.display = 'block';

        let rangeBtn = menu.querySelector('[data-action="setRange"]');
        if (!rangeBtn) {
            rangeBtn = document.createElement('li');
            rangeBtn.dataset.action = 'setRange';
            rangeBtn.textContent = 'Set Limits';
            menu.appendChild(rangeBtn);
        }
        rangeBtn.style.display = 'block';
    }
    else if (contextTarget === null || contextTarget.classList.contains('card-slot-container') || contextTarget.classList.contains('program-card')) {
        let cardBtn = menu.querySelector('[data-action="changeCard"]');
        if (!cardBtn) {
            cardBtn = document.createElement('li'); cardBtn.dataset.action = 'changeCard';
            cardBtn.textContent = 'Select Program Card...';
            menu.appendChild(cardBtn);
        }
        cardBtn.style.display = 'block';
        if (contextTarget === null) menu.querySelector('[data-action="addNote"]').style.display = 'block';
    }
    else if (el.classList.contains('note-element')) {
        menu.querySelector('[data-action="styleNote"]').style.display = 'block';
        menu.querySelector('[data-action="removeNote"]').style.display = 'block';
    }
    else {
        const r = menu.querySelector('[data-action="reset"]');
        r.style.display = 'block'; r.textContent = 'Reset Default';
        if (el.dataset.type && el.dataset.type.startsWith('knob')) {
            menu.querySelector('[data-action="setValue"]').style.display = 'block';
        }
    }

    // Add generic Edit Label for any component or switch
    if (contextTarget && (contextTarget.classList.contains('component') || contextTarget.dataset.type)) {
        let lblBtn = menu.querySelector('[data-action="editLabel"]');
        if (!lblBtn) {
            lblBtn = document.createElement('li');
            lblBtn.dataset.action = 'editLabel';
            lblBtn.textContent = 'Edit Label...';
            menu.appendChild(lblBtn);
        }
        lblBtn.classList.remove('hidden');
        lblBtn.style.display = 'block';
    }
    menu.style.display = 'block';
    let x = e.pageX;
    let y = e.pageY;
    if (x + menu.offsetWidth > window.innerWidth + window.scrollX) {
        x -= menu.offsetWidth;
    }
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    document.addEventListener('click', () => menu.style.display = 'none', { once: true });
}

function handleCableRightClick(e, s, end) {
    e.preventDefault();
    e.stopPropagation();

    contextCable = getCableByIds(s, end);
    const menu = document.getElementById('contextMenu');

    Array.from(menu.children).forEach(l => l.style.display = 'none');
    menu.querySelector('[data-action="labelCable"]').style.display = 'block';
    menu.querySelector('[data-action="removeCable"]').style.display = 'block';

    menu.style.display = 'block';

    let x = e.pageX;
    let y = e.pageY;
    if (x + menu.offsetWidth > window.innerWidth + window.scrollX) {
        x -= menu.offsetWidth;
    }
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    document.addEventListener('click', () => menu.style.display = 'none', { once: true });
}

function initColorPicker() {
    const menu = document.getElementById('colorPaletteMenu');
    const swatch = document.getElementById('activeColorSwatch');
    menu.innerHTML = '';

    const rndBtn = document.createElement('div');
    rndBtn.className = 'palette-option is-random';
    rndBtn.title = "Random Color";
    rndBtn.onclick = (e) => {
        e.stopPropagation();
        isRandomColorMode = true;
        swatch.classList.add('random-active');
        swatch.style.backgroundColor = '';
        menu.classList.remove('open');
    };
    menu.appendChild(rndBtn);

    CABLE_PALETTE.forEach(color => {
        const dot = document.createElement('div');
        dot.className = 'palette-option';
        dot.style.backgroundColor = color;
        dot.onclick = (e) => {
            e.stopPropagation();
            isRandomColorMode = false;
            selectedCableColor = color;
            swatch.classList.remove('random-active');
            swatch.style.backgroundColor = color;
            menu.classList.remove('open');
        };
        menu.appendChild(dot);
    });

    swatch.onclick = (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
    };
    document.addEventListener('click', () => menu.classList.remove('open'));
}

/* =========================================================================
   RANGE EDIT MODE (Complete & Optimized)
   ========================================================================= */

let isEditingRange = false;
let currentRangeKnob = null;
let rangeHandleMin = null;
let rangeHandleMax = null;

function initRangeEditMode(knobEl) {
    // Prevent double-init
    if (isEditingRange) exitRangeEditMode();

    isEditingRange = true;
    currentRangeKnob = knobEl;
    knobEl.classList.add('range-edit-active');

    // 1. Ensure component state exists
    if (!componentStates[knobEl.id]) {
        componentStates[knobEl.id] = {
            type: knobEl.dataset.type,
            value: SYSTEM_CONFIG[knobEl.id]?.defValue || 0,
            isTouched: false
        };
    }

    // 2. Initialize range in state immediately if missing
    if (!componentStates[knobEl.id].range) {
        componentStates[knobEl.id].range = [-150, 150];
    }

    // 3. Now it is safe to read
    let [min, max] = componentStates[knobEl.id].range;

    // Show the visual path
    const path = knobEl.querySelector('.knob-range-path');
    if (path) path.style.display = 'block';
    updateKnobRangeVisuals(knobEl);

    // Helper to position handles
    const placeHandle = (angle, cls) => {
        const h = document.createElement('div');
        h.className = `range-edit-handle ${cls}`;

        const rect = knobEl.getBoundingClientRect();
        const rad = (angle - 90) * Math.PI / 180;
        const radius = rect.width * 0.65;

        const x = (rect.width / 2) + (radius * Math.cos(rad));
        const y = (rect.height / 2) + (radius * Math.sin(rad));

        h.style.left = `${x}px`;
        h.style.top = `${y}px`;

        // Add listeners for both Mouse and Touch
        h.addEventListener('mousedown', (e) => startRangeHandleDrag(e, cls.includes('min-handle')));
        h.addEventListener('touchstart', (e) => startRangeHandleDrag(e, cls.includes('min-handle')), { passive: false });

        knobEl.appendChild(h);
        return h;
    };

    rangeHandleMin = placeHandle(min, 'min-handle');
    rangeHandleMax = placeHandle(max, 'max-handle');

    setTimeout(() => {
        document.addEventListener('mousedown', checkRangeEditClickOutside, { capture: true });
        document.addEventListener('touchstart', checkRangeEditClickOutside, { capture: true, passive: false });
    }, 50);
}

function startRangeHandleDrag(e, isMin) {
    e.stopPropagation();
    e.preventDefault();

    const rect = currentRangeKnob.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width * 0.55;

    // Initialize Tracker
    let cx = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    let cy = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    let lastDeg = (Math.atan2(cy - centerY, cx - centerX) * 180 / Math.PI) + 90;
    if (lastDeg > 180) lastDeg -= 360;

    let currentX, currentY;
    let isFramePending = false;

    const onMove = (em) => {
        if (!currentRangeKnob) return;

        if (em.touches && em.touches.length > 0) {
            currentX = em.touches[0].clientX;
            currentY = em.touches[0].clientY;
        } else {
            currentX = em.clientX;
            currentY = em.clientY;
        }

        if (!isFramePending) {
            isFramePending = true;
            requestAnimationFrame(updateLoop);
        }
    };

    const updateLoop = () => {
        if (!currentRangeKnob) {
            isFramePending = false;
            return;
        }

        const compState = componentStates[currentRangeKnob.id];
        if (!compState || !compState.range) {
            isFramePending = false;
            return;
        }

        // 1. Current Angle
        let deg = (Math.atan2(currentY - centerY, currentX - centerX) * 180 / Math.PI) + 90;
        if (deg > 180) deg -= 360;

        if (isNaN(deg)) { isFramePending = false; return; }

        // 2. Delta & Wrap
        let delta = deg - lastDeg;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        lastDeg = deg;

        // 3. Apply Delta to target Handle
        // We read the *current* state value and add the delta
        let currentVal = isMin ? compState.range[0] : compState.range[1];
        let newVal = currentVal + delta;

        // 4. Hard Limits
        newVal = Math.max(-150, Math.min(150, newVal));

        // 5. Min/Max Collision Logic
        if (isMin) {
            // Don't let Min cross Max
            const curMax = compState.range[1];
            if (newVal >= curMax) newVal = curMax - 1; // Keep 1 degree gap
            compState.range[0] = newVal;
        } else {
            // Don't let Max cross Min
            const curMin = compState.range[0];
            if (newVal <= curMin) newVal = curMin + 1;
            compState.range[1] = newVal;
        }

        // 6. Visual Updates
        updateKnobRangeVisuals(currentRangeKnob);

        const rad = (newVal - 90) * Math.PI / 180;
        const h = isMin ? rangeHandleMin : rangeHandleMax;

        if (h) {
            h.style.left = `${(rect.width / 2) + radius * Math.cos(rad)}px`;
            h.style.top = `${(rect.height / 2) + radius * Math.sin(rad)}px`;
        }

        // Push knob value if range overtook it
        const kVal = compState.value;
        if (kVal < compState.range[0]) updateKnobAngle(currentRangeKnob, compState.range[0]);
        if (kVal > compState.range[1]) updateKnobAngle(currentRangeKnob, compState.range[1]);

        isFramePending = false;
    };

    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
        saveState();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
}

function checkRangeEditClickOutside(e) {
    // Close edit mode if clicking anywhere other than the active knob or its handles
    if (currentRangeKnob && !currentRangeKnob.contains(e.target)) {
        exitRangeEditMode();
    }
}

function exitRangeEditMode() {
    if (!currentRangeKnob) return;

    currentRangeKnob.classList.remove('range-edit-active');

    if (rangeHandleMin) rangeHandleMin.remove();
    if (rangeHandleMax) rangeHandleMax.remove();

    document.removeEventListener('mousedown', checkRangeEditClickOutside, { capture: true });
    document.removeEventListener('touchstart', checkRangeEditClickOutside, { capture: true });

    // (Cleaning up empty range logic)
    const r = componentStates[currentRangeKnob.id].range;
    if (r && r[0] <= -148 && r[1] >= 148) {
        delete componentStates[currentRangeKnob.id].range;
        const path = currentRangeKnob.querySelector('.knob-range-path');
        if (path) path.style.display = 'none';
    }

    isEditingRange = false;
    currentRangeKnob = null;
    saveState();
}

/* =========================================================================
   VOLTAGE BUTTON GROUP LOGIC
   ========================================================================= */

function setupVoltageButtonInteraction(el) {
    let pressTimer;
    let isLongPress = false;

    // Mouse Events
    el.addEventListener('mousedown', () => {
        isLongPress = false;
        pressTimer = setTimeout(() => { isLongPress = true; }, 600); // 600ms hold
    });

    el.addEventListener('click', (e) => {
        clearTimeout(pressTimer);
        // Trigger Multi if Shift key OR Long Press was detected
        const isMulti = e.shiftKey || isLongPress;
        handleVoltageGroupLogic(el, isMulti);
    });

    // Touch Events
    el.addEventListener('touchstart', (e) => {
        isLongPress = false;
        pressTimer = setTimeout(() => { isLongPress = true; }, 600);
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
        clearTimeout(pressTimer);
        if (isLongPress) {
            e.preventDefault(); // Prevent standard click if long press handled
            handleVoltageGroupLogic(el, true);
        }
    });
}

function handleVoltageGroupLogic(targetEl, isMulti) {
    const groupIds = ['button-1', 'button-2', 'button-3', 'button-4'];
    const isActive = parseInt(targetEl.getAttribute('data-state') || 0) === 1;

    // Helper to update button state (DOM + Component State)
    const setBtnState = (id, state) => {
        const btn = document.getElementById(id);
        if (btn) {
            const val = state ? 1 : 0;
            btn.setAttribute('data-state', val);
            btn.classList.add('is-touched');
            componentStates[id] = { type: 'button', value: val, isTouched: true };
        }
    };

    if (!isMulti) {
        // MODE 1: RADIO (Exclusive)
        // Turn target ON, turn all others OFF
        groupIds.forEach(id => {
            setBtnState(id, id === targetEl.id);
        });
    } else {
        // MODE 2: MULTI (Toggle)
        setBtnState(targetEl.id, !isActive);

        // Rule: At least one must be active
        const anyActive = groupIds.some(id => {
            const b = document.getElementById(id);
            return b && parseInt(b.getAttribute('data-state') || 0) === 1;
        });

    }

    updateAudioParams();
    updateFocusState();
    saveState();
}



// --- 7. EXPORT & SAVING --------------------------------------------------

function showExportMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    const menu = document.getElementById('exportMenu');
    const toggleBtn = document.getElementById('exportMenuToggle');
    const wrapper = document.getElementById('mainContentWrapper');

    if (wrapper.style.position !== 'relative') {
        wrapper.style.position = 'relative';
    }

    const currentScale = (typeof VIEWPORT !== 'undefined' && VIEWPORT.scale) ? VIEWPORT.scale : 1.0;
    menu.style.visibility = 'hidden';
    menu.style.display = 'flex';
    const realMenuWidth = menu.offsetWidth;

    const wrapperRect = wrapper.getBoundingClientRect();
    const btnRect = toggleBtn.getBoundingClientRect();

    const offsetTop = (btnRect.bottom - wrapperRect.top) / currentScale;
    const offsetLeft = (btnRect.right - wrapperRect.left) / currentScale - realMenuWidth;

    menu.style.top = (offsetTop + 5) + 'px';
    menu.style.left = offsetLeft + 'px';
    menu.style.visibility = 'visible';

    setTimeout(() => {
        document.addEventListener('click', hideExportMenu, { once: true });
    }, 10);
}
function hideExportMenu() {
    document.getElementById('exportMenu').style.display = 'none';
}

function setupExportHandlers() {
    const menu = document.getElementById('exportMenu');

    // NEW: Left Click = Download PNG, Right Click = Show Menu
    const exportBtn = document.getElementById('exportMenuToggle');
    if (exportBtn) {
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            savePatchAsPng();
        });
        exportBtn.addEventListener('contextmenu', (e) => {
            showExportMenu(e);
        });
    }

    // System Menu
    const sysBtn = document.getElementById('systemMenuToggle');
    if (sysBtn) {
        sysBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = document.getElementById('systemMenu');
            const expMenu = document.getElementById('exportMenu');

            if (menu) {
                // Close others
                if (expMenu) expMenu.classList.remove('visible');

                const isVisible = menu.classList.contains('visible');
                if (isVisible) {
                    menu.classList.remove('visible');
                } else {
                    // POSITIONING LOGIC
                    const wrapper = document.getElementById('mainContentWrapper');
                    if (wrapper.style.position !== 'relative') wrapper.style.position = 'relative';

                    const currentScale = (typeof VIEWPORT !== 'undefined' && VIEWPORT.scale) ? VIEWPORT.scale : 1.0;

                    // Temp show to measure
                    // Note: We use .visible class which rules display:flex. 
                    // But we want to measure before showing? .visible sets display:flex.
                    // visibility:hidden trick from showExportMenu is safer.
                    menu.classList.add('visible'); // make it flex so we can measure
                    menu.style.visibility = 'hidden';

                    const realMenuWidth = menu.offsetWidth;
                    const wrapperRect = wrapper.getBoundingClientRect();
                    const btnRect = sysBtn.getBoundingClientRect();



                    const offsetTop = (btnRect.bottom - wrapperRect.top) / currentScale;
                    // Align right edge of menu with right edge of button
                    const offsetLeft = (btnRect.right - wrapperRect.left) / currentScale - realMenuWidth;

                    // Allow simple left-alignment if preferred, but right-align is standard for end-toolbar items.
                    // If you want left-align: (btnRect.left - wrapperRect.left) / currentScale;

                    menu.style.top = (offsetTop + 5) + 'px';
                    menu.style.left = offsetLeft + 'px';
                    menu.style.visibility = 'visible';
                }
            }
        });
    }

    // Close menus on outside click
    document.addEventListener('click', (e) => {
        const sysMenu = document.getElementById('systemMenu');
        const sysBtn = document.getElementById('systemMenuToggle');
        if (sysMenu && sysMenu.classList.contains('visible') && !sysMenu.contains(e.target) && e.target !== sysBtn && !sysBtn.contains(e.target)) {
            sysMenu.classList.remove('visible');
        }
    });

    // NEW Share Button Handler
    const shareBtn = document.getElementById('shareUrlBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            // Reusing logic from menu
            const optimized = optimizeState(getCurrentPatchState());
            const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(optimized));
            let baseUrl = window.location.href.split('#')[0];
            try { if (window.self !== window.top) baseUrl = window.top.location.href.split('#')[0]; } catch (e) { }
            const u = `${baseUrl}#p=${compressed}`;
            navigator.clipboard.writeText(u).then(() => {
                showMessage("URL Copied!", "success");

                // Visual Button Feedback
                const originalHtml = shareBtn.innerHTML;
                const originalWidth = shareBtn.style.width;

                shareBtn.innerHTML = '<span style="font-size: 0.75rem; font-weight: bold;">Copied!</span>';
                shareBtn.style.color = 'var(--text-main)'; // Ensure visibility against yellow active state if stuck

                setTimeout(() => {
                    shareBtn.innerHTML = originalHtml;
                    shareBtn.style.width = originalWidth;
                    shareBtn.style.color = '';
                }, 1500);
            });
        });
    }

    menu.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        if (!action) return;
        hideExportMenu();

        switch (action) {
            case 'savePatchButton':
                const state = getCurrentPatchState();
                const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = (state.patchName || 'patch').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
                a.click(); showMessage("Saved JSON!", "success");
                break;
            case 'savePngButton':
                savePatchAsPng();
                break;

            case 'shareUrlButton':
                const optimized = optimizeState(getCurrentPatchState());
                const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(optimized));
                let baseUrl = window.location.href.split('#')[0];
                try { if (window.self !== window.top) baseUrl = window.top.location.href.split('#')[0]; } catch (e) { }
                const u = `${baseUrl}#p=${compressed}`;
                navigator.clipboard.writeText(u).then(() => showMessage("URL Copied!", "success"));
                break;
            case 'savePdfButton':
                // 1. Capture Current State
                const wrapper = document.getElementById('mainContentWrapper');
                const toolbar = document.getElementById('mainToolbar');
                const nameInputBox = document.getElementById('patchNameInput')?.parentElement;
                const notesAreaBox = document.getElementById('globalNotesArea')?.parentElement;
                const appHeader = document.getElementById('appHeader');
                const pedalboard = document.getElementById('pedalboard');
                const savedViewport = { ...VIEWPORT };

                // 2. Hide UI Elements
                if (toolbar) toolbar.style.display = 'none';
                if (nameInputBox) nameInputBox.style.display = 'none';
                if (notesAreaBox) notesAreaBox.style.display = 'none';
                if (appHeader) appHeader.style.display = 'none';

                let wasPbOpen = false;
                if (pedalboard) {
                    wasPbOpen = pedalboard.classList.contains('open');
                    if (!wasPbOpen) {
                        pedalboard.style.display = 'none';
                    } else {
                        pedalboard.style.border = 'none';
                        pedalboard.style.boxShadow = 'none';
                        // Keep background transparent or styled as needed for print
                    }
                }

                document.body.classList.add('exporting');

                // 3. Reset Transform & Setup Print View
                wrapper.style.transform = 'none';
                wrapper.style.transformOrigin = 'top left';
                VIEWPORT.scale = 1.0;
                VIEWPORT.x = 0;
                VIEWPORT.y = 0;
                updateInterfaceScaling();

                // 4. Inject Title & Notes (Print Header)
                const patchName = document.getElementById('patchNameInput').value || "Untitled Patch";
                const notes = document.getElementById('globalNotesArea').value;
                const isDark = document.body.classList.contains('dark-mode');
                const textColor = isDark ? '#fbbf24' : '#000000'; // Match PNG logic

                const printHeader = document.createElement('div');
                printHeader.className = 'print-header-temp';
                printHeader.style.cssText = `text-align: center; margin: 20px 0; font-family: Helvetica, Arial, sans-serif; color: ${textColor};`;
                printHeader.innerHTML = `<h1 style="font-size: 2.5rem; font-weight: bold; margin: 0;">${patchName}</h1>`;
                wrapper.insertBefore(printHeader, document.getElementById('synthContainer'));

                const printNotes = document.createElement('div');
                printNotes.className = 'print-notes-temp';
                if (notes && notes.trim() !== "") {
                    printNotes.style.cssText = `
                        text-align: left; margin: 30px 40px; font-family: 'Courier New', monospace; 
                        white-space: pre-wrap; color: ${textColor}; font-size: 1.2rem; line-height: 1.5;
                        border-top: 1px solid ${isDark ? '#3f3f46' : '#e5e7eb'}; padding-top: 20px;
                    `;
                    printNotes.textContent = notes;
                    wrapper.appendChild(printNotes);
                }

                // 5. Layout Calculation (Center Content + External Gear)
                const synthContainer = document.getElementById('synthContainer');
                const leftRack = document.getElementById('externalGearRackLeft');
                const rightRack = document.getElementById('externalGearRackRight');

                const originalWrapperWidth = wrapper.style.width;
                const originalWrapperDisplay = wrapper.style.display;
                const originalWrapperJustify = wrapper.style.justifyContent;

                // Determine widths to ensure everything fits
                let totalWidth = synthContainer.offsetWidth;
                const hasLeft = leftRack && leftRack.children.length > 0;
                const hasRight = rightRack && rightRack.children.length > 0;

                if (hasLeft || hasRight) {
                    const rackSpace = 300; // Est rack width + margins
                    totalWidth += (rackSpace * 2); // Symmetric spacing usually
                }
                totalWidth += 100; // Safety padding

                // Apply Print Container Styles (Centering)
                wrapper.style.width = `${totalWidth}px`;
                wrapper.style.display = 'flex';
                wrapper.style.flexDirection = 'column';
                wrapper.style.alignItems = 'center';

                // 6. Fix Knob Rotation (Move rotation from container to img to avoid clipping/issues)
                const knobs = wrapper.querySelectorAll('.knob-large, .knob-medium, .knob-small, .pedal-knob');
                knobs.forEach(k => {
                    const angle = k.style.getPropertyValue('--angle') || 0;
                    if (k.classList.contains('component') && !k.classList.contains('custom-knob-bg')) {
                        // It's a standard component knob
                        k.style.transform = `translate(-50%, -50%)`; // Remove container rotation
                        const innerImg = k.querySelector('.knob-img');
                        if (innerImg) {
                            innerImg.style.transform = `rotate(${angle}deg)`;
                            innerImg.dataset.wasRotated = 'true'; // Marker for cleanup
                        }
                    } else {
                        // Pedal knobs or custom knobs might rotate the container itself
                        // Ensure backgroundImage is set correctly if needed (usually is)
                    }
                });

                // 7. Fix SVG Cable Scaling
                const cableLayer = document.getElementById('cableLayer');
                if (cableLayer && synthContainer) {
                    const w = synthContainer.offsetWidth;
                    const h = synthContainer.offsetHeight;
                    cableLayer.setAttribute('viewBox', `0 0 ${w} ${h}`);
                }

                updatePedalCables();
                redrawCables();

                // 8. Print (Delayed to ensure repaint)
                setTimeout(() => {
                    window.print();

                    // 9. Cleanup / Restore
                    // Restore UI Visibility
                    if (toolbar) toolbar.style.display = '';
                    if (nameInputBox) nameInputBox.style.display = '';
                    if (notesAreaBox) notesAreaBox.style.display = '';
                    if (appHeader) appHeader.style.display = '';
                    document.body.classList.remove('exporting');

                    // Restore Wrapper
                    wrapper.style.width = originalWrapperWidth;
                    wrapper.style.display = originalWrapperDisplay;
                    wrapper.style.justifyContent = originalWrapperJustify;
                    if (printHeader) printHeader.remove();
                    if (printNotes) printNotes.remove();

                    // Restore Viewport
                    Object.assign(VIEWPORT, savedViewport);
                    updateViewport();
                    updateInterfaceScaling();

                    // Restore Pedalboard
                    if (pedalboard) {
                        if (!wasPbOpen) pedalboard.style.display = ''; // or default from CSS
                        pedalboard.style.border = '';
                        pedalboard.style.boxShadow = '';
                        pedalboard.style.background = '';
                    }

                    // Restore Knobs
                    knobs.forEach(k => {
                        const angle = k.style.getPropertyValue('--angle') || 0;
                        if (k.classList.contains('component') && !k.classList.contains('custom-knob-bg')) {
                            // Restore container rotation
                            k.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
                            const innerImg = k.querySelector('.knob-img');
                            if (innerImg) {
                                innerImg.style.transform = '';
                                delete innerImg.dataset.wasRotated;
                            }
                        }
                    });

                    // Restore SVG ViewBox
                    if (cableLayer) cableLayer.removeAttribute('viewBox');

                    // Final Redraw to be sure
                    updatePedalCables();
                    redrawCables();

                }, 500);
                break;

            case 'saveGearButton':
                const gearState = { customModules: CUSTOM_MODULES || [] };
                const gearBlob = new Blob([JSON.stringify(gearState, null, 2)], { type: 'application/json' });
                const gearA = document.createElement('a'); gearA.href = URL.createObjectURL(gearBlob);
                gearA.download = 'external_gear_config.json';
                gearA.click(); showMessage("Saved Gear Config!", "success");
                break;

            case 'loadGearButton':
                document.getElementById('loadGearInput').click();
                break;
        }
    });

    // Load Gear Handler
    const gearInput = document.getElementById('loadGearInput');
    if (gearInput) {
        gearInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (data.customModules && Array.isArray(data.customModules)) {
                        data.customModules.forEach(mod => {
                            if (CUSTOM_MODULES.some(m => m.id === mod.id)) {
                                mod.id = mod.id + '_' + Date.now();
                            }
                            CUSTOM_MODULES.push(mod);
                            renderCustomModuleToDOM(mod);
                        });
                        saveState();
                        showMessage("Imported Gear!", "success");
                    } else {
                        showMessage("Invalid Gear File", "error");
                    }
                } catch (err) {
                    console.error(err);
                    showMessage("Import Failed", "error");
                }
                e.target.value = '';
            };
            reader.readAsText(file);
        });
    }
}

function savePatchAsPng() {
    const wrapper = document.getElementById('mainContentWrapper');
    const toolbar = document.getElementById('mainToolbar');
    const nameInputBox = document.getElementById('patchNameInput').parentElement;
    const notesAreaBox = document.getElementById('globalNotesArea').parentElement;
    const header = document.getElementById('appHeader');
    const pedalboard = document.getElementById('pedalboard');

    const patchName = document.getElementById('patchNameInput').value || 'Untitled Patch';
    const patchNotes = document.getElementById('globalNotesArea').value;
    const originalBg = wrapper.style.backgroundColor;
    const originalTransform = wrapper.style.transform;
    const originalOrigin = wrapper.style.transformOrigin;

    document.body.classList.add('exporting');
    wrapper.style.transform = 'none';
    wrapper.style.transformOrigin = 'top left';

    if (toolbar) toolbar.style.display = 'none';
    if (nameInputBox) nameInputBox.style.display = 'none';
    if (notesAreaBox) notesAreaBox.style.display = 'none';
    if (header) header.style.display = 'none';

    let originalPbStyle = "";
    let wasPbOpen = false;

    if (pedalboard) {
        originalPbStyle = pedalboard.style.cssText;
        wasPbOpen = pedalboard.classList.contains('open');

        if (!wasPbOpen) {
            pedalboard.style.display = 'none';
        } else {
            pedalboard.style.background = 'transparent';
            pedalboard.style.border = 'none';
            pedalboard.style.boxShadow = 'none';
        }
    }

    const computedStyle = getComputedStyle(document.body);
    const currentBgColor = computedStyle.getPropertyValue('--page-bg').trim();
    wrapper.style.backgroundColor = currentBgColor;

    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#fbbf24' : '#000000';

    const headerContainer = document.createElement('div');
    headerContainer.style.cssText = `text-align: center; margin: 20px 0; font-family: Helvetica, Arial, sans-serif; color: ${textColor};`;
    headerContainer.innerHTML = `<h1 style="font-size: 2.5rem; font-weight: bold; margin: 0;">${patchName}</h1>`;
    wrapper.insertBefore(headerContainer, document.getElementById('synthContainer'));

    const notesContainer = document.createElement('div');
    if (patchNotes && patchNotes.trim() !== "") {
        notesContainer.style.cssText = `
            text-align: left; margin: 30px 40px; font-family: 'Courier New', monospace; 
            white-space: pre-wrap; color: ${textColor}; font-size: 1.2rem; line-height: 1.5;
            border-top: 1px solid ${isDark ? '#3f3f46' : '#e5e7eb'}; padding-top: 20px;
        `;
        notesContainer.textContent = patchNotes;
        wrapper.appendChild(notesContainer);
    }

    const knobs = wrapper.querySelectorAll('.knob-large, .knob-medium, .knob-small, .pedal-knob');
    const originalStyles = [];
    knobs.forEach(k => {
        originalStyles.push({
            el: k, bg: k.style.backgroundImage, rot: k.style.transform,
            size: k.style.backgroundSize, pos: k.style.backgroundPosition
        });
        let imgUrl = '';
        if (k.classList.contains('knob-large')) imgUrl = isDark ? 'url("images/largeKnob_dark.svg")' : 'url("images/largeKnob.svg")';
        else if (k.classList.contains('knob-medium')) imgUrl = isDark ? 'url("images/mediumKnob_dark.svg")' : 'url("images/mediumKnob.svg")';
        else if (k.classList.contains('knob-small') || k.classList.contains('pedal-knob')) imgUrl = isDark ? 'url("images/smallKnob_dark.svg")' : 'url("images/smallKnob.svg")';

        const angle = k.style.getPropertyValue('--angle') || 0;

        // FIX: For main components, rotate the child IMG, not the container (to avoid rotating labels)
        if (k.classList.contains('component') && !k.classList.contains('custom-knob-bg')) {
            // Reset container transform (maintain position)
            k.style.transform = `translate(-50%, -50%)`;

            // Rotate the inner image explicitly (bypassing CSS var issues in export)
            const innerImg = k.querySelector('.knob-img');
            if (innerImg) {
                innerImg.style.transform = `rotate(${angle}deg)`;
            }

            // NOTE: We do NOT set backgroundImage on k here because it would be behind the img anyway,
            // or if we did, we'd need to ensure it doesn't conflict. 
            // The original code set background which implies it wanted to replace the img or ensure it renders.
            // If we trust innerImg, we don't need background on k.
        } else {
            // For pedals or non-componenets, rotate the element itself (label is likely a sibling)
            k.style.backgroundImage = imgUrl;
            k.style.backgroundRepeat = 'no-repeat';
            k.style.backgroundPosition = 'center';
            k.style.backgroundSize = 'contain';
            k.style.transform = `rotate(${angle}deg)`;
        }
    });

    // Calculate dimensions including external gear racks
    const synthContainer = document.getElementById('synthContainer');
    const leftRack = document.getElementById('externalGearRackLeft');
    const rightRack = document.getElementById('externalGearRackRight');

    // Store original widths to restore later
    const originalWrapperWidth = wrapper.style.width;
    const originalSynthMargin = synthContainer.style.marginLeft;
    const originalSynthWidth = synthContainer.style.width;

    // We need to capture the full visual width.
    // Lock synth dimensions to ensure layout (and rack positioning) doesn't shift
    let synthWidth = synthContainer.offsetWidth;
    synthContainer.style.width = `${synthWidth}px`;

    // Calculate total layout width
    let totalWidth = synthWidth;
    let leftExt = 0;

    // Check if any racks exist to enable symmetric spacing
    const hasLeft = leftRack && leftRack.children.length > 0;
    const hasRight = rightRack && rightRack.children.length > 0;

    if (hasLeft || hasRight) {
        // Calculate max rack width for symmetry
        const leftW = hasLeft ? leftRack.offsetWidth + 40 : 0;
        const rightW = hasRight ? rightRack.offsetWidth + 40 : 0;
        const rackSpace = Math.max(leftW, rightW, 300); // Minimum 300px spacing if racks exist

        // Add symmetric space to both sides
        totalWidth += (rackSpace * 2);
        leftExt = rackSpace; // Shift synth by this amount
    }
    leftExt = 0;
    // Add some padding
    totalWidth += 60; // 30px padding each side
    let fullHeight = wrapper.scrollHeight + 40;

    const scale = 2; // Reduced from 3 to decrease file size

    const options = {
        width: totalWidth * scale,
        height: fullHeight * scale,
        style: {
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${totalWidth}px`,
            height: `${fullHeight}px`,
            backgroundColor: currentBgColor,
            maxWidth: 'none', minWidth: 'none', margin: '0',
            // Important: We need to center the content visually in this new box
            // The synth is currently centered in wrapper.
            // We force flex layout to center everything
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '20px',

            // To incorporate the left rack which is absolutely positioned to the left of synth,
            // we need to push the synth to the right by leftExt.
            // Effectively, we are creating a new view where margin-left on synth reveals the left rack.
        },
        cacheBust: false,
        filter: (node) => (node.id !== 'messageBox')
    };

    // Temporarily apply margin to synthContainer during capture to reveal left rack w/o negative coordinates
    if (leftExt > 0) {
        synthContainer.style.marginLeft = `${leftExt}px`;
    }

    domtoimage.toPng(wrapper, options)
        .then((dataUrl) => {
            const optimized = optimizeState(getCurrentPatchState());
            const compressed = LZString.compressToBase64(JSON.stringify(optimized));
            const finalUrl = injectPngMetadata(dataUrl, PNG_KEYWORD, compressed);
            const link = document.createElement('a');
            link.download = (patchName || 'patch') + '.png';
            link.href = finalUrl;
            link.click();
            showMessage("Saved High-Res PNG!", "success");
        })
        .catch((error) => {
            console.error(error);
            showMessage("Export Failed.", "error");
            // Restore synth margins/width on error too
            synthContainer.style.marginLeft = originalSynthMargin;
            synthContainer.style.width = originalSynthWidth;
        })
        .finally(() => {
            document.body.classList.remove('exporting');
            wrapper.style.transform = originalTransform;
            wrapper.style.transformOrigin = originalOrigin;

            knobs.forEach((k, i) => {
                const s = originalStyles[i];
                k.style.backgroundImage = s.bg; k.style.transform = s.rot;
                k.style.backgroundSize = s.size; k.style.backgroundPosition = s.pos;
            });
            if (toolbar) toolbar.style.display = '';
            if (nameInputBox) nameInputBox.style.display = '';
            if (notesAreaBox) notesAreaBox.style.display = '';
            if (header) header.style.display = '';

            if (wasPbOpen) {
                pedalboard.style.cssText = originalPbStyle;
            } else if (pedalboard) {
                pedalboard.style.display = ''; // Restore default display if it was hidden
            }

            // Restore synth margins and width
            synthContainer.style.marginLeft = originalSynthMargin;
            synthContainer.style.width = originalSynthWidth;

            wrapper.style.backgroundColor = originalBg;
            headerContainer.remove();
            if (notesContainer.parentElement) notesContainer.remove();
        });
}

function loadPatchFromFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.png')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const json = extractPngData(ev.target.result);
            if (json) {
                try {
                    const parsed = JSON.parse(json);
                    const state = parsed.cs ? expandOptimizedState(parsed) : parsed;
                    resetHistory(state); // Clean load
                    showMessage("Loaded from PNG!", "success");
                } catch (err) { showMessage("Error parsing PNG data", "error"); }
            } else { showMessage("No patch data in PNG.", "warning"); }
        };
        reader.readAsBinaryString(file);
    }
    else if (file.name.endsWith('.wav')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const rawString = readWavMetadata(ev.target.result);
            if (rawString) {
                try {
                    const json = LZString.decompressFromEncodedURIComponent(rawString);
                    const parsed = JSON.parse(json);
                    const state = parsed.cs ? expandOptimizedState(parsed) : parsed;
                    resetHistory(state); // Clean load
                    showMessage("Loaded from WAV!", "success");
                } catch (err) {
                    console.error(err);
                    showMessage("Corrupt WAV metadata", "error");
                }
            } else {
                showMessage("No MTM data found in WAV.", "warning");
            }
        };
        reader.readAsArrayBuffer(file);
    }
    else {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                resetHistory(JSON.parse(ev.target.result));
                showMessage("Loaded JSON!", "success");
            } catch (err) { showMessage("Invalid JSON file", "error"); }
        };
        reader.readAsText(file);
    }
    e.target.value = '';
}

// --- 8. STATE MANAGEMENT -------------------------------------------------

function generateRandomPatch() {
    cableData = [];

    for (const id in componentStates) {
        const el = document.getElementById(id);
        if (el) {
            if (el.dataset.type.startsWith('knob')) resetKnob(el);
            else if (el.dataset.type.startsWith('switch')) resetSwitch(el);
            else if (el.dataset.type.startsWith('button')) {
                el.setAttribute('data-state', 0);
                el.classList.remove('is-touched');
                componentStates[id] = { type: 'button', value: 0, isTouched: false };
            }
        }
    }

    const mixerIdx = MODULES_MAP.findIndex(m => m.id === 'Mixer');
    let bestConnections = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 5000;

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        const connections = [];
        const numConnections = Math.floor(Math.random() * 7) + 3; // Min 3 cables

        const usedInputs = new Set();
        const usedOutputs = new Set();
        let genAttempts = 0;

        while (connections.length < numConnections && genAttempts < 100) {
            genAttempts++;

            const fromMod = MODULES_MAP[Math.floor(Math.random() * MODULES_MAP.length)];
            const toMod = MODULES_MAP[Math.floor(Math.random() * MODULES_MAP.length)];

            if (!fromMod.outputs.length || !toMod.inputs.length) continue;
            if (fromMod === toMod) continue;

            const availOuts = fromMod.outputs.filter(o => !usedOutputs.has(o));
            const availIns = toMod.inputs.filter(i => !usedInputs.has(i));

            if (!availOuts.length || !availIns.length) continue;

            const outJack = availOuts[Math.floor(Math.random() * availOuts.length)];
            const inJack = availIns[Math.floor(Math.random() * availIns.length)];

            connections.push({
                start: outJack,
                end: inJack,
                color: getRandomColor(),
                droopOffset: (Math.random() * 20 - 10)
            });

            usedOutputs.add(outJack);
            usedInputs.add(inJack);
        }

        if (connections.length >= 3 && isValidPatch(connections, mixerIdx)) {
            bestConnections = connections;
            break;
        }
    }

    if (bestConnections) {
        cableData = bestConnections;

        cableData.forEach(c => {
            randomizeModuleControls(getModuleIndexByJack(c.start));
            randomizeModuleControls(getModuleIndexByJack(c.end));
        });
        randomizeModuleControls(mixerIdx);

        const possibleCards = AVAILABLE_CARDS.filter(c => c.id !== 'none');
        if (possibleCards.length > 0) {
            const randomIndex = Math.floor(Math.random() * possibleCards.length);
            const cardId = possibleCards[randomIndex].id;
            swapComputerCard(cardId);
            const cardEl = document.querySelector('.program-card');
            if (cardEl) {
                cardEl.style.opacity = '1';
            }
        }

        ensureAudibleParams(cableData);

        document.getElementById('patchNameInput').value = generateRandomName();
        redrawCables();
        saveState();
        updateAudioGraph();
        showMessage(`Generated: "${document.getElementById('patchNameInput').value}"`, 'success');
    } else {
        showMessage("Could not generate valid patch. Try again.", "warning");
    }
}

function randomizeModuleControls(modIdx) {
    const controls = MODULES_MAP[modIdx].controls; if (!controls) return;
    controls.forEach(controlId => {
        const el = document.getElementById(controlId); if (!el) return;
        const type = el.dataset.type;
        if (type.startsWith('knob')) { updateKnobAngle(el, Math.floor(Math.random() * 301) - 150); el.classList.add('is-touched'); }
        else if (type.startsWith('switch')) { const states = type.includes('3way') ? 3 : 2; setSwitchState(el, Math.floor(Math.random() * states)); el.classList.add('is-touched'); }
        else if (type.startsWith('button')) { const val = Math.floor(Math.random() * 2); el.setAttribute('data-state', val); el.classList.add('is-touched'); componentStates[controlId] = { type: 'button', value: val, isTouched: true }; }
    });
}

function isValidPatch(connections, mixerIdx) {
    const graph = {};
    connections.forEach(c => {
        const fromIdx = getModuleIndexByJack(c.start);
        const toIdx = getModuleIndexByJack(c.end);
        if (fromIdx !== -1 && toIdx !== -1) {
            if (!graph[fromIdx]) graph[fromIdx] = [];
            graph[fromIdx].push(toIdx);
        }
    });

    const modulesWithOutputs = new Set(connections.map(c => getModuleIndexByJack(c.start)));

    for (let startModIdx of modulesWithOutputs) {
        if (startModIdx === mixerIdx) continue;
        if (!canReachMixer(startModIdx, mixerIdx, graph)) return false;
    }

    const hasAudioSource = AUDIO_SOURCES.some(sourceId => {
        const sourceIdx = MODULES_MAP.findIndex(m => m.id === sourceId);
        return modulesWithOutputs.has(sourceIdx);
    });

    return hasAudioSource;
}

function canReachMixer(startNode, targetNode, graph) {
    const queue = [startNode];
    const visited = new Set([startNode]);
    while (queue.length > 0) {
        const node = queue.shift();
        if (node === targetNode) return true;
        const neighbors = graph[node] || [];
        for (let neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    return false;
}

function ensureAudibleParams(cables) {
    const masterVol = document.getElementById('knob-large-volumeMain');
    updateKnobAngle(masterVol, 50);

    const mixInputs = [
        { jack: 'jack-mixer1in', knob: 'knob-small-mix1' },
        { jack: 'jack-mixer2in', knob: 'knob-small-mix2' },
        { jack: 'jack-mixer3in', knob: 'knob-small-mix3' },
        { jack: 'jack-mixer4in', knob: 'knob-small-mix4' }
    ];

    mixInputs.forEach(ch => {
        const isPlugged = cables.some(c => c.end === ch.jack);
        if (isPlugged) {
            const el = document.getElementById(ch.knob);
            const safeVol = Math.floor(Math.random() * 100) + 50;
            updateKnobAngle(el, safeVol);
        }
    });

    ['knob-large-filter1', 'knob-large-filter2'].forEach(id => {
        const el = document.getElementById(id);
        const currentVal = parseFloat(el.style.getPropertyValue('--angle') || 0);
        if (currentVal < -50) {
            updateKnobAngle(el, Math.floor(Math.random() * 100) - 50);
        }
    });

    const ampInPlugged = cables.some(c => c.end === 'jack-ampIn');
    if (ampInPlugged) {
        updateKnobAngle(document.getElementById('knob-medium-amp'), 0);
    }
}

function getCurrentPatchState() {
    const nameInput = document.getElementById('patchNameInput');
    const notesArea = document.getElementById('globalNotesArea');

    let currentCardId = 'none';
    if (activeComputerCard) {
        const def = AVAILABLE_CARDS.find(c => c.name === activeComputerCard.name);
        if (def) currentCardId = def.id;
    }

    // Get utility pair state if active
    let utilityPairState = null;
    if (activeComputerCard && activeComputerCard.getState && typeof activeComputerCard.getState === 'function') {
        utilityPairState = activeComputerCard.getState();
    }

    return {
        patchName: nameInput ? nameInput.value : "Untitled Patch",
        globalNotes: notesArea ? notesArea.value : "",
        componentStates: componentStates,
        cables: cableData,
        notes: saveNotePositions(),
        pedalOrder: activePedalChain,
        activeCardId: currentCardId,
        customModules: CUSTOM_MODULES,
        utilityPairState: utilityPairState
    };
}

function saveState() {
    const s = JSON.stringify(getCurrentPatchState());
    history = history.slice(0, historyIndex + 1);
    history.push(JSON.parse(s));
    if (history.length > MAX_HISTORY) {
        history.shift();
        historyIndex--;
    }
    historyIndex++;
    updateAudioGraph();
}

function loadState(state) {
    cableData = state.cables || [];
    noteData = state.notes || [];
    componentStates = state.componentStates || {};

    // --- RESTORE EXTERNAL GEAR ---
    // 1. Cleanup existing custom modules from SYSTEM_CONFIG and DOM
    if (typeof CUSTOM_MODULES !== 'undefined') {
        CUSTOM_MODULES.forEach(mod => {
            // Remove jacks from SYSTEM_CONFIG
            const inputs = mod.config.inputs || 0;
            const outputs = mod.config.outputs || 0;
            const knobs = mod.config.knobs || 0;

            for (let i = 0; i < inputs; i++) delete SYSTEM_CONFIG[`${mod.id}_in_${i}`];
            for (let i = 0; i < outputs; i++) delete SYSTEM_CONFIG[`${mod.id}_out_${i}`];
            for (let i = 0; i < knobs; i++) delete SYSTEM_CONFIG[`${mod.id}_knob_${i}`];
        });
        CUSTOM_MODULES = []; // Reset registry
    }
    const leftRack = document.getElementById('externalGearRackLeft');
    const rightRack = document.getElementById('externalGearRackRight');
    if (leftRack) leftRack.innerHTML = '';
    if (rightRack) rightRack.innerHTML = '';

    // 2. Load from State
    if (state.customModules && Array.isArray(state.customModules)) {
        state.customModules.forEach(mod => {
            CUSTOM_MODULES.push(mod);
            // Render will handle SYSTEM_CONFIG registration
            try {
                renderCustomModuleToDOM(mod);
            } catch (e) {
                console.error("Failed to render custom module:", mod, e);
            }
        });
    }

    if (state.pedalOrder) {
        activePedalChain = state.pedalOrder;
    } else {
        activePedalChain = ['reverb', 'delay', 'chorus', 'phaser', 'dist'];
    }

    const nameInput = document.getElementById('patchNameInput');
    const notesArea = document.getElementById('globalNotesArea');
    if (nameInput) nameInput.value = state.patchName || "";
    if (notesArea) notesArea.value = state.globalNotes || "";

    renderComponents();

    document.querySelectorAll('.note-element').forEach(el => el.remove());
    noteData.forEach(n => document.getElementById('synthContainer').appendChild(createNoteElement(n)));
    renderPedalboard();
    document.querySelectorAll('.component[data-type^="knob"]').forEach(el => {
        if (componentStates[el.id] && componentStates[el.id].range) {
            updateKnobRangeVisuals(el);
        }
    });
    const targetCardId = state.activeCardId || 'reverb';
    swapComputerCard(targetCardId);

    // RESTORE UTILITY PAIR STATE
    if (state.utilityPairState && activeComputerCard && activeComputerCard.setState && typeof activeComputerCard.setState === 'function') {
        activeComputerCard.setState(state.utilityPairState);
    }

    // RESTORE LABELS
    renderComponentLabels();

    requestAnimationFrame(() => {
        redrawCables();
        if (audioCtx) {
            buildAudioGraph();
            connectPedalChain();
        }
    });
}
function resetHistory(newState) {
    history = [];
    historyIndex = -1;
    loadState(newState);
    saveState();
}
function undo() { if (historyIndex > 0) { historyIndex--; loadState(history[historyIndex]); showMessage('Undo', 'info'); } }
function redo() { if (historyIndex < history.length - 1) { historyIndex++; loadState(history[historyIndex]); showMessage('Redo', 'info'); } }

// --- 9. VIEWPORT ZOOM ----------------------------------------------------

function initZoomPan() {
    const container = document.body;

    container.addEventListener('wheel', (e) => {
        // IGNORE panning/zooming if over specific scrollable elements
        if (e.target.tagName === 'TEXTAREA' ||
            e.target.closest('.preset-select') ||
            e.target.closest('#presetsDropdown') ||
            e.target.closest('.card-grid') ||
            e.target.closest('.card-selector-modal')) {
            return;
        }

        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
            // ZOOM
            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;
            const oldScale = VIEWPORT.scale;
            let newScale = oldScale + delta;
            newScale = Math.min(Math.max(0.2, newScale), 4.0);

            const mouseX = e.clientX;
            const mouseY = e.clientY;

            VIEWPORT.x = mouseX - (mouseX - VIEWPORT.x) * (newScale / oldScale);
            VIEWPORT.y = mouseY - (mouseY - VIEWPORT.y) * (newScale / oldScale);
            VIEWPORT.scale = newScale;

            updateViewport();
            if (window.updateInterfaceScaling) window.updateInterfaceScaling();

            clearTimeout(window.zoomDebounce);
            window.zoomDebounce = setTimeout(() => {
                const wrapper = document.getElementById('mainContentWrapper');
                wrapper.style.opacity = '0.99';
                setTimeout(() => wrapper.style.opacity = '1', 10);
            }, 150);
        } else {
            // PAN (Trackpad / Mouse Wheel)
            VIEWPORT.x -= e.deltaX;
            VIEWPORT.y -= e.deltaY;
            updateViewport();
        }
    }, { passive: false });

    container.addEventListener('mousedown', (e) => {
        if (['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

        if (e.button === 1 || (e.button === 0 && e.code === 'Space')) {
            e.preventDefault();
            VIEWPORT.isPanning = true;
            VIEWPORT.lastX = e.clientX;
            VIEWPORT.lastY = e.clientY;
            container.style.cursor = 'grabbing';
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!VIEWPORT.isPanning) return;
        e.preventDefault();
        const dx = e.clientX - VIEWPORT.lastX;
        const dy = e.clientY - VIEWPORT.lastY;
        VIEWPORT.x += dx;
        VIEWPORT.y += dy;
        VIEWPORT.lastX = e.clientX;
        VIEWPORT.lastY = e.clientY;
        updateViewport();
    });

    window.addEventListener('mouseup', () => {
        VIEWPORT.isPanning = false;
        container.style.cursor = 'default';
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !['TEXTAREA', 'INPUT'].includes(e.target.tagName)) {
            container.style.cursor = 'grab';
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') container.style.cursor = 'default';
    });

    let initialPinchDistance = null;
    let lastScale = 1.0;

    const getDistance = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const getMidpoint = (touches) => {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    };

    container.addEventListener('touchstart', (e) => {
        if (['INPUT', 'BUTTON', 'SELECT', 'LABEL', 'TEXTAREA'].includes(e.target.tagName) ||
            e.target.closest('.knob-img') ||
            e.target.closest('.pedal-knob') ||
            e.target.closest('.preset-select') ||
            e.target.closest('#presetsDropdown') ||
            e.target.closest('.card-grid') ||
            e.target.closest('.card-selector-modal')) {
            return;
        }

        if (e.touches.length === 1) {
            // Check if this specific touch is already a knob drag
            if (activeKnobTouches[e.touches[0].identifier]) return;

            if (!isDraggingCable && !isDraggingKnob && !isDraggingSwitch) {
                VIEWPORT.isPanning = true;
                VIEWPORT.lastX = e.touches[0].clientX;
                VIEWPORT.lastY = e.touches[0].clientY;
            }
        }
        else if (e.touches.length === 2) {
            // Safety: If either touch is a known knob touch, don't start zooming
            if (activeKnobTouches[e.touches[0].identifier] || activeKnobTouches[e.touches[1].identifier]) {
                initialPinchDistance = null;
                return;
            }
            VIEWPORT.isPanning = false;
            initialPinchDistance = getDistance(e.touches);
            lastScale = VIEWPORT.scale;
        }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
        if (e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.closest('.card-grid') ||
            e.target.closest('.card-selector-modal')) return;

        if (e.cancelable) e.preventDefault();

        if (e.touches.length === 1 && VIEWPORT.isPanning) {
            // Check if this touch has been "taken" by a knob drag since it started
            if (activeKnobTouches[e.touches[0].identifier]) {
                VIEWPORT.isPanning = false;
                return;
            }
            const dx = e.touches[0].clientX - VIEWPORT.lastX;
            const dy = e.touches[0].clientY - VIEWPORT.lastY;
            VIEWPORT.x += dx;
            VIEWPORT.y += dy;
            VIEWPORT.lastX = e.touches[0].clientX;
            VIEWPORT.lastY = e.touches[0].clientY;
            updateViewport();
        }
        else if (e.touches.length === 2 && initialPinchDistance) {
            // Safety: If any finger is currently adjusting a knob, cancel the zoom
            if (activeKnobTouches[e.touches[0].identifier] || activeKnobTouches[e.touches[1].identifier]) {
                initialPinchDistance = null;
                return;
            }
            const newDistance = getDistance(e.touches);
            const center = getMidpoint(e.touches);
            const pinchRatio = newDistance / initialPinchDistance;
            let newScale = lastScale * pinchRatio;
            newScale = Math.min(Math.max(0.2, newScale), 4.0);

            const oldScale = VIEWPORT.scale;
            VIEWPORT.x = center.x - (center.x - VIEWPORT.x) * (newScale / oldScale);
            VIEWPORT.y = center.y - (center.y - VIEWPORT.y) * (newScale / oldScale);
            VIEWPORT.scale = newScale;

            initialPinchDistance = newDistance;
            lastScale = newScale;

            updateViewport();
            if (window.updateInterfaceScaling) window.updateInterfaceScaling();
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) initialPinchDistance = null;
        if (e.touches.length === 0) VIEWPORT.isPanning = false;
        if (e.touches.length === 1 && !['INPUT', 'BUTTON'].includes(e.target.tagName)) {
            VIEWPORT.isPanning = true;
            VIEWPORT.lastX = e.touches[0].clientX;
            VIEWPORT.lastY = e.touches[0].clientY;
        }
    });
}

function updateViewport() {
    const wrapper = document.getElementById('mainContentWrapper');
    // Centering: If scale < 1, we might need to adjust translate to stay centered visually
    wrapper.style.transform = `translate(${VIEWPORT.x}px, ${VIEWPORT.y}px) scale(${VIEWPORT.scale})`;
    if (window.updateInterfaceScaling) window.updateInterfaceScaling();
}

function fitWorkspaceToScreen() {
    const wrapper = document.getElementById('mainContentWrapper');
    if (!wrapper) return;

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const workspaceW = 1200;
    const workspaceH = 1100;

    const scaleW = (winW - 80) / workspaceW;
    const scaleH = (winH - 80) / workspaceH;

    let scale = Math.min(scaleW, scaleH);
    if (scale > 1.0) scale = 1.0;
    if (scale < 0.2) scale = 0.2;

    VIEWPORT.scale = scale;

    // Center horizontally
    VIEWPORT.x = (winW - (workspaceW * scale)) / 2;
    // Center vertically
    VIEWPORT.y = Math.max(20, (winH - (workspaceH * scale)) / 2);

    updateViewport();
}

function integrateFloatingWindows() {
    const wrapper = document.getElementById('mainContentWrapper');
    const scope = document.getElementById('scopeWindow');
    const recorder = document.getElementById('recorderWindow');

    if (scope && scope.parentNode !== wrapper) {
        wrapper.appendChild(scope);
        scope.style.position = 'absolute';
        scope.style.top = '150px';
        scope.style.left = '50px';
    }

    if (recorder && recorder.parentNode !== wrapper) {
        wrapper.appendChild(recorder);
        recorder.style.position = 'absolute';
        recorder.style.top = '150px';
        recorder.style.left = '450px';
    }
}

// --- 10. INITIALIZATION --------------------------------------------------

window.onload = function () {
    // 1. Theme
    const savedTheme = localStorage.getItem('mtm_theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.body.classList.add('dark-mode');
    }

    // 2. Render Interface
    renderComponents();
    renderPedalboard();
    if (typeof setupScopeUI === 'function') setupScopeUI();
    if (typeof setupRecorderUI === 'function') setupRecorderUI();

    // 3. Initialize Visuals & Scaling
    fitWorkspaceToScreen();

    if (typeof updateInterfaceScaling === 'function') updateInterfaceScaling();
    initColorPicker();
    setupExportHandlers();
    integrateFloatingWindows();

    // 3. Initialize Visuals & Tools
    if (typeof initWaveforms === 'function') initWaveforms();
    initZoomPan();

    // 4. Load from URL
    const params = new URLSearchParams(window.location.search);
    let d = params.get('p');
    if (!d && window.location.hash.startsWith('#p=')) d = window.location.hash.substring(3);

    if (d) {
        try {
            const raw = JSON.parse(LZString.decompressFromEncodedURIComponent(d));
            const state = raw.cs ? expandOptimizedState(raw) : raw;
            resetHistory(state);
        } catch (e) { showMessage("Error loading URL patch", "error"); }
    } else { saveState(); }

    // 5. Setup Presets
    function refreshPresetsDropdown(selectedName = "") {
        const presets = JSON.parse(localStorage.getItem('mtm_patches') || '{}');
        const drop = document.getElementById('presetsDropdown');
        drop.innerHTML = '<option value="">- Local Library -</option>';
        Object.keys(presets).sort().forEach(k => {
            const o = document.createElement('option');
            o.value = k; o.textContent = k;
            if (k === selectedName) o.selected = true;
            drop.appendChild(o);
        });
        document.getElementById('deletePresetButton').disabled = !drop.value;
    }
    refreshPresetsDropdown();

    // 6. Global Listeners
    const container = document.getElementById('synthContainer');
    const board = document.getElementById('pedalboard');
    const pedalBtn = document.getElementById('pedalToggle');

    let rafPending = false;
    container.addEventListener('mousemove', (e) => {
        if (currentCableStart && !isDraggingCable) {
            if (!rafPending) {
                rafPending = true;
                requestAnimationFrame(() => {
                    const color = isRandomColorMode ? '#000' : selectedCableColor;
                    const drawPos = getZoomedCablePos(e);

                    drawCable(
                        currentCableStart,
                        null,
                        color,
                        true,
                        drawPos.x,
                        drawPos.y,
                        0
                    );
                    rafPending = false;
                });
            }
        }
    });

    document.getElementById('contextMenu').addEventListener('click', async (e) => {
        const act = e.target.dataset.action;

        if (act === 'createStack' && contextTarget) {
            const id = contextTarget.id;
            const color = getActiveCableColor();

            isDraggingCable = true;
            isCablePickupMode = true;
            currentCableStart = id;

            const layer = document.getElementById('cableLayer');
            layer.classList.add('cable-layer-dimmed');

            currentDraggedCable = { start: id, end: null, droopOffset: 0, color: color };

            const container = document.getElementById('synthContainer');
            const rect = container.getBoundingClientRect();

            const mouseX = (e.pageX - window.scrollX) - rect.left;
            const mouseY = (e.pageY - window.scrollY) - rect.top;

            drawCable(id, null, color, true, mouseX + rect.left, mouseY + rect.top, 0);

            document.addEventListener('mousemove', dragCable);
            document.addEventListener('touchmove', dragCable, { passive: false });
            document.addEventListener('mouseup', handleGlobalMouseUp);
            document.addEventListener('touchend', handleGlobalMouseUp);

            document.getElementById(id).classList.add('active');
        }

        if ((act === 'probe1' || act === 'probe2') && contextTarget) {
            const ch = act === 'probe1' ? 0 : 1;
            connectProbeToScope(contextTarget.id, ch);
            const win = document.getElementById('scopeWindow');
            if (win.style.display !== 'flex') {
                openScope();
            }
        }
        if (act === 'addNote') {
            const rect = document.getElementById('synthContainer').getBoundingClientRect();
            const n = { id: 'note-' + Date.now(), x: ((parseInt(document.getElementById('contextMenu').style.left) - rect.left) / rect.width * 100) + '%', y: ((parseInt(document.getElementById('contextMenu').style.top) - rect.top) / rect.height * 100) + '%', text: 'Note' };
            noteData.push(n); document.getElementById('synthContainer').appendChild(createNoteElement(n)); saveState();
        }
        else if (act === 'removeNote' && contextTarget) { contextTarget.remove(); saveNotePositions(); saveState(); }
        else if (act === 'styleNote' && contextTarget) {
            const c = await CustomDialog.prompt("Text Color:", contextTarget.style.color);
            if (c) contextTarget.style.color = c;
            const b = await CustomDialog.prompt("Background Color:", contextTarget.style.backgroundColor);
            if (b) contextTarget.style.backgroundColor = b;
            saveNotePositions(); saveState();
        }
        else if (act === 'removeCable' && contextCable) { removeCable(contextCable.start, contextCable.end); }
        else if (act === 'labelCable' && contextCable) {
            const l = await CustomDialog.prompt("Cable Label:", contextCable.label || '');
            if (l !== null) { contextCable.label = l; redrawCables(); saveState(); }
        }
        else if (act === 'setValue' && contextTarget) {
            const v = await CustomDialog.prompt("Value (-150 to 150):", '0');
            if (v !== null && !isNaN(v)) { updateKnobAngle(contextTarget, parseFloat(v)); contextTarget.classList.add('is-touched'); saveState(); }
        }
        else if (act === 'reset' && contextTarget) {
            if (contextTarget.classList.contains('jack')) {
                cableData.filter(c => c.start === contextTarget.id || c.end === contextTarget.id).forEach(c => removeCable(c.start, c.end));
            } else {
                if (contextTarget.dataset.type.startsWith('knob')) resetKnob(contextTarget);
                else if (contextTarget.dataset.type.startsWith('switch')) resetSwitch(contextTarget);
                else {
                    contextTarget.setAttribute('data-state', 0);
                    contextTarget.classList.remove('is-touched');
                    const existing = componentStates[contextTarget.id] || {};
                    componentStates[contextTarget.id] = { ...existing, type: contextTarget.dataset.type || 'button', value: 0, isTouched: false };
                    saveState();
                }
            }
        } else if (act === 'changeCard') {
            openCardSelector();
        }
        if (act === 'removePedal' && contextPedalId) {
            activePedalChain = activePedalChain.filter(p => p !== contextPedalId);
            saveState();
            renderPedalboard();
            connectPedalChain();
        }
        else if (act === 'editLabel' && contextTarget) {
            const current = componentStates[contextTarget.id]?.label || '';
            const newVal = await CustomDialog.prompt("Edit Label:", current);
            if (newVal !== null) {
                // Initialize state object if missing
                if (!componentStates[contextTarget.id]) {
                    componentStates[contextTarget.id] = {
                        type: contextTarget.dataset.type || 'unknown',
                        value: 0,
                        isTouched: false
                    };
                }
                componentStates[contextTarget.id].label = newVal;
                saveState();
                renderComponentLabels();
            }
        }
        else if (act === 'addPedal') {
            const allTypes = Object.keys(PEDAL_DEFINITIONS);
            const available = allTypes.filter(t => !activePedalChain.includes(t));
            if (available.length === 0) { await CustomDialog.alert("Board Full!"); return; }

            let msg = "Type name to add:\n"; available.forEach(t => msg += `- ${t}\n`);
            const choice = await CustomDialog.prompt(msg);

            if (choice && PEDAL_DEFINITIONS[choice.toLowerCase()] && !activePedalChain.includes(choice.toLowerCase())) {
                activePedalChain.push(choice.toLowerCase());
                saveState();
                renderPedalboard();
                connectPedalChain();
            }
        } else if (act === 'setRange' && contextTarget) {
            initRangeEditMode(contextTarget);
        }
    });

    // --- 10. TOOLBAR HELPERS --------------------------------------------------

    function flashButtonActive(id) {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.classList.add('btn-active');
        setTimeout(() => {
            btn.classList.remove('btn-active');
        }, 150);
    }

    document.getElementById('audioToggle').addEventListener('click', toggleAudio);
    const labelsBtn = document.getElementById('labelsToggle');
    if (labelsBtn) labelsBtn.addEventListener('click', toggleLabels);

    document.getElementById('themeToggle').addEventListener('click', () => {
        flashButtonActive('themeToggle');
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('mtm_theme', isDark ? 'dark' : 'light');
        const panelImg = document.querySelector('.panel-art-img');
        if (panelImg) panelImg.src = isDark ? 'images/panel_image_dark.svg' : 'images/panel_image.svg';
        document.querySelectorAll('.knob-img').forEach(img => {
            let src = img.src;
            if (isDark) {
                src = src.replace('.svg', '_dark.svg').replace('_dark_dark', '_dark');
            } else {
                src = src.replace('_dark.svg', '.svg');
            }
            img.src = src;
        });
    });

    document.getElementById('randomPatchButton').addEventListener('click', () => {
        flashButtonActive('randomPatchButton');
        generateRandomPatch();
    });

    document.getElementById('clearButton').addEventListener('click', async () => {
        flashButtonActive('clearButton');
        if (await CustomDialog.confirm("Clear Patch? This will reset cables, knobs, notes, and pedal order.")) {
            cableData = [];
            noteData = [];
            componentStates = {};
            activePedalChain = ['reverb', 'delay', 'chorus', 'phaser', 'dist'];
            const nameInput = document.getElementById('patchNameInput');
            const notesArea = document.getElementById('globalNotesArea');
            if (nameInput) nameInput.value = "";
            if (notesArea) notesArea.value = "";
            const cleanState = {
                patchName: "",
                globalNotes: "",
                componentStates: {},
                cables: [],
                notes: [],
                pedalOrder: activePedalChain,
                activeCardId: 'reverb'
            };
            loadState(cleanState);
            saveState();

            // Allow clearing the dropdown
            const dd = document.getElementById('presetsDropdown');
            if (dd) dd.value = "";
            document.getElementById('deletePresetButton').disabled = true;

            showMessage("Patch Cleared", "warning");
        }
    });

    const micBtn = document.getElementById('micToggle');
    const midiBtn = document.getElementById('midiToggle');

    micBtn.addEventListener('click', toggleMic);
    midiBtn.addEventListener('click', toggleMIDI);

    const gearBtn = document.getElementById('addGearBtn');
    if (gearBtn) {
        gearBtn.addEventListener('click', () => flashButtonActive('addGearBtn'));
    }

    container.addEventListener('mousedown', startChassisDrag);
    container.addEventListener('touchstart', startChassisDrag, { passive: false });
    container.addEventListener('contextmenu', showContextMenu);
    document.addEventListener('mousedown', handleGlobalMouseDown);

    pedalBtn.addEventListener('click', () => {
        const isOpen = board.classList.contains('open');
        if (isOpen) {
            board.classList.remove('open');
            pedalBtn.classList.remove('btn-active'); // Updated class
            board.style.height = '0px';
            board.style.marginBottom = '-1rem';
            updatePedalCables();
        } else {
            board.classList.add('open');
            pedalBtn.classList.add('btn-active'); // Updated class
            updateInterfaceScaling();
            setTimeout(() => {
                board.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 300);
            setTimeout(updatePedalCables, 350);
        }
    });

    window.addEventListener('resize', () => {
        if (board.classList.contains('open')) updatePedalCables();
        updateInterfaceScaling();
        setTimeout(redrawCables, 100);
    });

    window.addEventListener('scroll', () => {
        if (board.classList.contains('open')) updatePedalCables();
    });

    document.getElementById('savePresetButton').addEventListener('click', () => {
        flashButtonActive('savePresetButton');
        const n = document.getElementById('patchNameInput').value.trim();
        if (!n) return showMessage("Please enter a patch name.", "warning");
        const p = JSON.parse(localStorage.getItem('mtm_patches') || '{}');
        p[n] = getCurrentPatchState();
        localStorage.setItem('mtm_patches', JSON.stringify(p));
        refreshPresetsDropdown(n);
        showMessage(`Preset "${n}" Saved!`, "success");
    });

    document.getElementById('deletePresetButton').addEventListener('click', async () => {
        const n = document.getElementById('presetsDropdown').value;
        if (n && await CustomDialog.confirm(`Delete preset "${n}"?`)) {
            const p = JSON.parse(localStorage.getItem('mtm_patches') || '{}');
            delete p[n];
            localStorage.setItem('mtm_patches', JSON.stringify(p));
            flashButtonActive('deletePresetButton');
            refreshPresetsDropdown("");
            showMessage("Preset Deleted.", "success");
        }
    });

    const fsBtn = document.getElementById('fullscreenToggle');
    fsBtn.addEventListener('click', toggleFullScreen);
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fsBtn.classList.add('btn-active'); // Updated class logic
            if (screen.orientation && screen.orientation.lock) {
                try { screen.orientation.lock('landscape'); } catch (e) { }
            }
        } else {
            fsBtn.classList.remove('btn-active'); // Updated class logic
        }
    });

    document.getElementById('presetsDropdown').addEventListener('change', (e) => {
        const val = e.target.value;
        document.getElementById('deletePresetButton').disabled = !val;
        if (val) {
            const p = JSON.parse(localStorage.getItem('mtm_patches') || '{}');
            if (p[val]) {
                resetHistory(p[val]);
                showMessage(`Loaded "${val}"`, "success");
            }
        }
    });

    const perfBtn = document.getElementById('perfToggle');
    perfBtn.addEventListener('click', togglePerfMode);

    document.getElementById('loadPatchButton').addEventListener('click', () => {
        flashButtonActive('loadPatchButton');
        document.getElementById('loadPatchInput').click();
    });
    document.getElementById('loadPatchInput').addEventListener('change', loadPatchFromFile);

    // Global click handler to blur custom label/name inputs when clicking elsewhere
    document.addEventListener('click', (e) => {
        const target = e.target;
        // Check if click is NOT on a custom input field
        if (!target.classList.contains('custom-knob-label') &&
            !target.classList.contains('custom-jack-label') &&
            !target.classList.contains('custom-module-title')) {
            // Blur any focused custom inputs
            const focusedInput = document.activeElement;
            if (focusedInput && (
                focusedInput.classList.contains('custom-knob-label') ||
                focusedInput.classList.contains('custom-jack-label') ||
                focusedInput.classList.contains('custom-module-title')
            )) {
                focusedInput.blur();
            }
        }
    });

    // TAPE INIT FIX
    if (typeof TAPE !== 'undefined' && !TAPE.gains) {
        TAPE.gains = [1.0, 1.0, 1.0, 1.0];
        console.log("Fixed: TAPE.gains initialized");
    }
};
// =========================================================================
// EXTERNAL GEAR LOGIC
// =========================================================================

function addDockedScopeModule() {
    // Check if already exists to avoid duplicates
    if (CUSTOM_MODULES.find(m => m.id === 'dockedScope')) return;

    // Create a special module config
    const config = {
        name: "OSCILLOSCOPE",
        type: "scope",
        inputs: 2,  // Ch1, Ch2
        outputs: 0,
        knobs: 0,
        position: 'right', // Default to right rack
        docked: true
    };

    const moduleDef = {
        id: 'dockedScope',
        config: config
    };

    CUSTOM_MODULES.push(moduleDef);
    renderCustomModuleToDOM(moduleDef);

    // We don't save state here necessarily, or maybe we do?
    // If we save, we need to handle restoration.
    // Let's assume manual toggle for now, but saving is safer.
    saveState();

    // Trigger audio graph update to connect the new inputs
    if (typeof updateAudioGraph === 'function') updateAudioGraph();
}

function removeDockedScopeModule() {
    const idx = CUSTOM_MODULES.findIndex(m => m.id === 'dockedScope');
    if (idx > -1) {
        CUSTOM_MODULES.splice(idx, 1);
        const el = document.getElementById('dockedScope');
        if (el) el.remove();
        saveState();

        // Disconnect audio nodes
        if (audioNodes['dockedScope']) {
            // Basic cleanup, full cleanup happens in buildAudioGraph or we let it linger until next rebuild
            delete audioNodes['dockedScope'];
        }
        if (typeof updateAudioGraph === 'function') updateAudioGraph();
    }
}

function initExternalGearUI() {
    const btn = document.getElementById('addGearBtn');
    const modal = document.getElementById('gearModal');
    const closeBtn = document.getElementById('closeGearModal');
    const confirmBtn = document.getElementById('addGearConfirm');
    const typeSelect = document.getElementById('gearType');

    if (!btn || !modal) return;

    // Open Modal
    btn.addEventListener('click', () => {
        modal.classList.add('visible');
    });

    // Close Modal
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('visible');
    });

    // Handle Type Selection
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            const nameInput = document.getElementById('gearName');
            const inputs = document.getElementById('gearInputs');
            const outputs = document.getElementById('gearOutputs');
            const knobs = document.getElementById('gearKnobs');

            const customConfig = document.getElementById('customGearConfig');

            // Helper to set and disable
            const set = (n, i, o, k) => {
                if (nameInput) nameInput.value = n;
                if (inputs) { inputs.value = i; }
                if (outputs) { outputs.value = o; }
                if (knobs) { knobs.value = k; }
                if (customConfig) customConfig.style.display = 'none';
            };

            switch (type) {
                case 'mult':
                    set('Mult', 1, 3, 0);
                    break;
                case 'attenuator':
                    set('Attenuator', 1, 1, 1);
                    break;
                case 'vca':
                    set('VCA', 2, 1, 2);
                    break;
                case 'midi':
                    set('MIDI Interface', 0, 4, 0);
                    break;
                case 'mixer':
                    set('Mixer', 3, 1, 3);
                    break;
                case 'noise':
                    set('Noise', 0, 2, 1);
                    break;
                case 'scope': // Scope
                    set('Oscilloscope', 2, 0, 0);
                    break;
                case 'sequencer':
                    set('Step Sequencer', 1, 3, 10);
                    break;
                default: // Custom
                    if (customConfig) customConfig.style.display = 'block';
                    if (inputs) inputs.disabled = false;
                    if (outputs) outputs.disabled = false;
                    if (knobs) knobs.disabled = false;
                    nameInput.value = "";
                    break;
            }
        });

        // Trigger generic change to set initial state
        typeSelect.dispatchEvent(new Event('change'));
    }

    // Confirm Add
    confirmBtn.addEventListener('click', () => {
        const type = document.getElementById('gearType') ? document.getElementById('gearType').value : 'custom';
        const name = document.getElementById('gearName').value || "Module";

        let inputs = parseInt(document.getElementById('gearInputs').value) || 0;
        let outputs = parseInt(document.getElementById('gearOutputs').value) || 0;
        let knobs = parseInt(document.getElementById('gearKnobs').value) || 0;

        let jackLabels = {};
        let knobLabels = {};

        // Apply Preset Labels
        if (type === 'mult') {
            jackLabels[`_in_0`] = "In";
            jackLabels[`_out_0`] = "Out 1";
            jackLabels[`_out_1`] = "Out 2";
            jackLabels[`_out_2`] = "Out 3";
        } else if (type === 'attenuator') {
            jackLabels[`_in_0`] = "In";
            jackLabels[`_out_0`] = "Out";
            knobLabels[`_knob_0`] = "Level";
        } else if (type === 'vca') {
            jackLabels[`_in_0`] = "Signal";
            jackLabels[`_in_1`] = "CV";
            jackLabels[`_out_0`] = "Out";
            knobLabels[`_knob_0`] = "Gain";
            knobLabels[`_knob_1`] = "CV Amt";
        } else if (type === 'midi') {
            jackLabels[`_out_0`] = "Pitch";
            jackLabels[`_out_1`] = "Gate";
            jackLabels[`_out_2`] = "Vel";
            jackLabels[`_out_3`] = "Clock";
        } else if (type === 'mixer') {
            jackLabels[`_in_0`] = "In 1";
            jackLabels[`_in_1`] = "In 2";
            jackLabels[`_in_2`] = "In 3";
            jackLabels[`_out_0`] = "Mix Out";
            knobLabels[`_knob_0`] = "Vol 1";
            knobLabels[`_knob_1`] = "Vol 2";
            knobLabels[`_knob_2`] = "Vol 3";
        } else if (type === 'noise') {
            jackLabels[`_out_0`] = "White";
            jackLabels[`_out_1`] = "Pink";
            knobLabels[`_knob_0`] = "Level";
        } else if (type === 'sequencer') {
            jackLabels[`_in_0`] = "Clock";
            jackLabels[`_out_0`] = "CV";
            jackLabels[`_out_1`] = "Gate";
            jackLabels[`_out_2`] = "Q.CV";
            for (let i = 0; i < 8; i++) knobLabels[`_knob_${i}`] = `${i + 1}`;
            knobLabels[`_knob_8`] = "Rate";
            knobLabels[`_knob_9`] = "Scale";
        }

        // We pass a "labels" object wrapper or pre-generate IDs? 
        // The addCustomModule function generates IDs based on the module name/UUID. 
        // We need to pass these labels in a way that addCustomModule can apply them.
        // Let's pass a `presetLabels` object in the config.

        if (type === 'scope') {
            if (typeof addDockedScopeModule === 'function') addDockedScopeModule();
            modal.classList.remove('visible');
            return;
        }

        addCustomModule({ name, type, inputs, outputs, knobs, presetLabels: { jacks: jackLabels, knobs: knobLabels } });
        modal.classList.remove('visible');
    });
}

// renderColorPicker removed

function addCustomModule(config) {
    const idBase = config.name.replace(/[^a-zA-Z0-9]/g, '');
    const moduleUUID = "ext_" + idBase + "_" + Date.now();

    // 1. Register in CUSTOM_MODULES
    const moduleDef = {
        id: moduleUUID,
        config: config
    };
    CUSTOM_MODULES.push(moduleDef);

    // 2. Add to SYSTEM_CONFIG & Render
    renderCustomModuleToDOM(moduleDef);

    // 3. Save State implicitly
    showMessage("Added " + config.name, "success");
    if (typeof updateAudioGraph === 'function') updateAudioGraph();

    return moduleUUID;
}

function renderCustomModuleToDOM(moduleDef) {
    const id = moduleDef.id;
    const config = moduleDef.config;
    const name = config.name;
    const inputs = config.inputs;
    const outputs = config.outputs;
    const knobs = config.knobs || 0;
    const knobLabels = config.labels || [];
    // Color logic removed in favor of CSS theme

    // Determine position (default to right)
    const position = config.position || 'right';
    const rackId = position === 'left' ? 'externalGearRackLeft' : 'externalGearRackRight';

    // Create or get Container
    let sidecar = document.getElementById(rackId);
    if (!sidecar) {
        sidecar = document.createElement('div');
        sidecar.id = rackId;
        sidecar.style.position = 'absolute';
        sidecar.style.top = '0';
        sidecar.style.display = 'flex';
        sidecar.style.flexDirection = 'column';
        sidecar.style.gap = '20px';

        if (position === 'left') {
            sidecar.style.right = '102%'; // Position to the left
        } else {
            sidecar.style.left = '102%'; // Position to the right
        }

        // Drop Zone for Rack
        sidecar.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            sidecar.style.backgroundColor = 'rgba(255,255,255,0.05)';
        });
        sidecar.addEventListener('dragleave', () => {
            sidecar.style.backgroundColor = 'transparent';
        });
        sidecar.addEventListener('drop', (e) => {
            e.preventDefault();
            sidecar.style.backgroundColor = 'transparent';
            const srcId = e.dataTransfer.getData('text/plain');
            if (srcId) {
                // If dropped directly on the rack (not on a module), append to that rack
                // We know which rack this IS because of 'position' variable in this scope?
                // Wait, 'position' is from the *rendered module's* config, so this is creating a rack FOR that module.
                // We need to ensure we only add the listener ONCE per rack? 
                // renderCustomModuleToDOM is called for each module.
                // If the rack already exists, 'sidecar' is returned by getElementById.
                // We should check if we already added listeners? Or just add them idempotently.
                // Better: The rack creation block only runs if !sidecar. Perfect.

                // Update position for the dropped module
                const mod = CUSTOM_MODULES.find(m => m.id === srcId);
                if (mod && mod.config.position !== position) {
                    mod.config.position = position; // 'left' or 'right'
                    rerenderGearRacks();
                    saveState();
                }
            }
        });

        document.getElementById('synthContainer').appendChild(sidecar);
    }

    const modEl = document.createElement('div');
    modEl.className = 'external-module';
    modEl.id = id;
    modEl.draggable = true; // Enable Drag

    // Drag & Drop Events
    modEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        modEl.style.opacity = '0.4';
    });
    modEl.addEventListener('dragend', () => {
        modEl.style.opacity = '1';
        document.querySelectorAll('.external-module').forEach(m => m.style.border = '2px solid rgba(255,255,255,0.2)');
    });
    modEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        modEl.style.border = '2px dashed #fff';
    });
    modEl.addEventListener('dragleave', () => {
        modEl.style.border = '2px solid rgba(255,255,255,0.2)';
    });
    modEl.addEventListener('drop', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const srcId = e.dataTransfer.getData('text/plain');
        if (srcId && srcId !== id) {
            const srcIdx = CUSTOM_MODULES.findIndex(m => m.id === srcId);
            const targetIdx = CUSTOM_MODULES.findIndex(m => m.id === id);

            if (srcIdx > -1) {
                // Check if we are moving to a different rack (implicitly handled by target's position)
                // But we need to update source item's position to match target item's position
                const targetMod = CUSTOM_MODULES[targetIdx];
                const srcMod = CUSTOM_MODULES[srcIdx];

                if (targetMod && srcMod) {
                    srcMod.config.position = targetMod.config.position; // Adopt target's side
                }

                const item = CUSTOM_MODULES.splice(srcIdx, 1)[0];
                CUSTOM_MODULES.splice(targetIdx, 0, item);

                rerenderGearRacks();
                saveState();
            }
        }
    });

    // Style adjustments for Theme and Dynamic Width
    modEl.style.padding = '10px'; // Compact padding
    modEl.style.borderRadius = '6px';
    modEl.style.minWidth = 'fit-content'; // Allow to shrink
    modEl.style.width = 'fit-content';
    modEl.style.border = '2px solid rgba(255,255,255,0.2)';
    modEl.style.position = 'relative';
    modEl.style.boxShadow = 'none';
    modEl.style.display = 'flex';
    modEl.style.flexDirection = 'column';
    modEl.style.gap = '8px'; // Tighter gap

    // Theme Colors
    modEl.style.backgroundColor = 'var(--panel-bg)';
    modEl.style.color = 'var(--text-main)';
    modEl.style.borderColor = 'var(--toolbar-border)';

    // --- Window-Like Header (Drag Handle) ---
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.padding = '4px 8px';
    header.style.marginBottom = '8px';
    header.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; // Highlighted header
    header.style.borderRadius = '4px';
    header.style.cursor = 'grab'; // Visual affordance
    header.style.minHeight = '28px';
    header.title = "Drag to Move";

    // Stop drag propagation on inputs (so you can type)
    // Actually, draggable=true on parent might prevent clicking input?
    // We need to ensure inputs override opacity or drag start? 
    // Usually browser handles text selection vs drag well, but let's see.

    const title = document.createElement('input');
    title.type = 'text';
    title.value = name;
    title.className = 'custom-module-title';
    title.style.margin = '0 8px'; // Spacing
    title.style.flexGrow = '1';
    title.style.width = 'auto';
    title.style.fontSize = '15px'; // Reduced slightly
    title.style.color = 'inherit';
    title.style.textTransform = 'uppercase';
    title.style.fontFamily = 'monospace';
    title.style.letterSpacing = '1px';
    title.style.fontWeight = 'bold';
    title.style.whiteSpace = 'nowrap';
    // Removed specific paddings for absolute buttons
    title.style.padding = '0';
    title.style.background = 'transparent';
    title.style.border = '1px solid transparent';
    title.style.textAlign = 'center';
    title.style.outline = 'none';
    title.style.cursor = 'text';

    title.addEventListener('mousedown', (e) => e.stopPropagation());
    title.addEventListener('focus', () => {
        title.style.borderBottom = '1px solid var(--text-main)';
    });
    title.addEventListener('blur', () => {
        title.style.borderBottom = '1px solid transparent';
    });
    title.addEventListener('change', (e) => {
        const newName = e.target.value || 'Module';
        const mod = CUSTOM_MODULES.find(m => m.id === id);
        if (mod) {
            mod.config.name = newName;
            saveState();
        }
    });

    // Controls Container (Left side) - Restore L/R Button
    const leftControls = document.createElement('div');
    leftControls.style.display = 'flex';
    leftControls.style.alignItems = 'center';
    leftControls.style.gap = '8px';

    // Position Toggle Button (L/R)
    const posBtn = document.createElement('div');
    const currentPos = config.position || 'right';
    posBtn.textContent = currentPos === 'left' ? '→' : '←';
    posBtn.title = 'Move to other rack';
    posBtn.style.color = 'var(--text-muted)';
    posBtn.style.fontSize = '12px';
    posBtn.style.cursor = 'pointer';
    posBtn.style.fontWeight = 'bold';
    posBtn.style.padding = '2px 6px';
    posBtn.style.border = '1px solid var(--text-muted)';
    posBtn.style.borderRadius = '3px';
    posBtn.style.backgroundColor = 'rgba(0,0,0,0.2)';

    posBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mod = CUSTOM_MODULES.find(m => m.id === id);
        if (mod) {
            mod.config.position = mod.config.position === 'left' ? 'right' : 'left';
            rerenderGearRacks();
            saveState();
        }
    });
    posBtn.addEventListener('mouseenter', () => posBtn.style.borderColor = 'var(--text-main)');
    posBtn.addEventListener('mouseleave', () => posBtn.style.borderColor = 'var(--text-muted)');

    leftControls.appendChild(posBtn);

    // Delete Button (X) - Right side
    const deleteBtn = document.createElement('div');
    deleteBtn.textContent = '×';
    deleteBtn.style.color = 'var(--text-muted)';
    deleteBtn.style.fontSize = '28px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.fontWeight = 'bold';
    deleteBtn.style.lineHeight = '1';
    deleteBtn.title = "Remove Module";
    // deleteBtn.style.position = 'absolute'; // Removed
    // deleteBtn.style.right = '0';
    // deleteBtn.style.top = '50%';
    // deleteBtn.style.transform = 'translateY(-50%)';

    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        if (config.type === 'scope') {
            // Special handling for scope undock
            if (typeof toggleDockMode === 'function') toggleDockMode();
        } else {
            if (await CustomDialog.confirm(`Remove ${name}?`)) {
                removeCustomModule(id);
            }
        }
    });

    deleteBtn.addEventListener('mouseenter', () => deleteBtn.style.color = '#ef4444');
    deleteBtn.addEventListener('mouseleave', () => deleteBtn.style.color = 'var(--text-muted)');

    header.appendChild(leftControls);
    // Use a container for the title to push close button to the end
    const titleContainer = document.createElement('div');
    titleContainer.style.flex = '1';
    titleContainer.style.background = 'transparent';
    titleContainer.style.display = 'flex';
    titleContainer.style.justifyContent = 'center';
    titleContainer.appendChild(title);
    header.appendChild(titleContainer);

    header.appendChild(deleteBtn);
    modEl.appendChild(header);

    // --- BODY CONTENT ---
    const body = document.createElement('div');
    body.style.display = 'flex';
    body.style.flexDirection = 'column'; // Stack rows
    body.style.gap = '8px';
    body.style.alignItems = 'center';
    modEl.appendChild(body);

    // --- SCOPE CANVAS (Special Case) ---
    if (config.type === 'scope') {
        const canContainer = document.createElement('div');
        canContainer.style.width = '180px'; // Matched to standard module width
        canContainer.style.height = '120px'; // Adjusted aspect ratio
        canContainer.style.backgroundColor = '#111';
        canContainer.style.border = '1px solid #444';
        canContainer.style.marginBottom = '4px';
        canContainer.style.position = 'relative';

        const cvs = document.createElement('canvas');
        cvs.id = 'dockedScopeCanvas';
        cvs.style.width = '100%';
        cvs.style.height = '100%';
        canContainer.appendChild(cvs);

        body.appendChild(canContainer);

        // Control Row
        const ctrlRow = document.createElement('div');
        ctrlRow.style.display = 'flex';
        ctrlRow.style.gap = '8px';
        ctrlRow.style.width = '100%';
        ctrlRow.style.justifyContent = 'center';
        ctrlRow.style.alignItems = 'center';

        // Freeze Button
        const freezeBtn = document.createElement('button');
        freezeBtn.className = 'scope-btn';
        freezeBtn.textContent = '❄';
        freezeBtn.title = 'Freeze';
        freezeBtn.style.padding = '0px 8px';
        freezeBtn.style.height = '20px';
        freezeBtn.style.minWidth = '24px';
        freezeBtn.onclick = () => {
            scopeFrozen = !scopeFrozen;
            freezeBtn.classList.toggle('active-mode', scopeFrozen);
        };
        ctrlRow.appendChild(freezeBtn);

        // Timescale Slider
        const sliderContainer = document.createElement('div');
        sliderContainer.style.display = 'flex';
        sliderContainer.style.alignItems = 'center';
        sliderContainer.style.gap = '4px';

        const sliderLabel = document.createElement('span');
        sliderLabel.textContent = 'Time:';
        sliderLabel.style.color = '#aaa';
        sliderLabel.style.fontFamily = 'monospace';
        sliderLabel.style.fontSize = '10px';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.step = '1';
        slider.value = '50';
        slider.id = 'dockedScopeZoom';
        slider.style.display = 'none';

        const btnMinus = document.createElement('button');
        btnMinus.textContent = '-';
        btnMinus.className = 'scope-btn';
        btnMinus.style.width = '20px';
        btnMinus.style.height = '20px';
        btnMinus.style.padding = '0';

        const btnPlus = document.createElement('button');
        btnPlus.textContent = '+';
        btnPlus.className = 'scope-btn';
        btnPlus.style.width = '20px';
        btnPlus.style.height = '20px';
        btnPlus.style.padding = '0';

        const valDisplay = document.createElement('span');
        valDisplay.textContent = '50';
        valDisplay.style.color = '#ccc';
        valDisplay.style.fontSize = '10px';
        valDisplay.style.minWidth = '24px';
        valDisplay.style.textAlign = 'center';

        const updateZoom = (delta) => {
            let val = parseInt(slider.value);
            val += delta;
            if (val < 0) val = 0;
            if (val > 100) val = 100;
            slider.value = val;

            if (val > 80) valDisplay.textContent = "Roll";
            else valDisplay.textContent = val;

            // Trigger update just like the slider did
            if (typeof setScopeZoom === 'function') setScopeZoom(val);
        };

        btnMinus.onclick = () => updateZoom(-5); // Step by 5
        btnPlus.onclick = () => updateZoom(5);

        sliderContainer.appendChild(sliderLabel);
        sliderContainer.appendChild(btnMinus);
        sliderContainer.appendChild(valDisplay);
        sliderContainer.appendChild(btnPlus);
        sliderContainer.appendChild(slider);
        ctrlRow.appendChild(sliderContainer);

        body.appendChild(ctrlRow);
    }


    // Unified Logic for Small Modules ( <= 4 Components )
    const totalComponents = knobs + inputs + outputs;

    if (totalComponents <= 4) {
        // ONE ROW LAYOUT
        const unifiedContainer = document.createElement('div');
        unifiedContainer.style.display = 'grid';
        unifiedContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
        unifiedContainer.style.gap = '6px';
        unifiedContainer.style.justifyItems = 'center';
        unifiedContainer.style.alignItems = 'start'; // Important for knobs
        unifiedContainer.style.padding = '4px';
        unifiedContainer.style.borderRadius = '6px';

        // 1. Knobs
        for (let i = 0; i < knobs; i++) {
            const knobId = `${id}_knob_${i}`;
            let currentLabel = `P${i + 1}`;
            if (config.presetLabels && config.presetLabels.knobs) {
                const suffix = `_knob_${i}`;
                if (config.presetLabels.knobs[suffix]) currentLabel = config.presetLabels.knobs[suffix];
            }
            if (config.knobLabels && config.knobLabels[knobId]) {
                currentLabel = config.knobLabels[knobId];
            }
            if (!SYSTEM_CONFIG[knobId]) {
                SYSTEM_CONFIG[knobId] = { type: 'knob-small', x: '0', y: '0', label: currentLabel, isCustom: true, defValue: 0 };
            }
            if (!componentStates[knobId]) {
                componentStates[knobId] = { type: 'knob-small', value: 0, isTouched: false };
            }
            const knobWrapper = createCustomKnob(knobId, currentLabel, moduleDef);
            unifiedContainer.appendChild(knobWrapper);
        }

        // 2. Inputs
        for (let i = 0; i < inputs; i++) {
            const jackId = `${id}_in_${i}`;
            let currentLabel = `In ${i + 1}`;
            if (config.presetLabels && config.presetLabels.jacks) {
                const suffix = `_in_${i}`;
                if (config.presetLabels.jacks[suffix]) currentLabel = config.presetLabels.jacks[suffix];
            }
            if (config.jackLabels && config.jackLabels[jackId]) currentLabel = config.jackLabels[jackId];
            SYSTEM_CONFIG[jackId] = { type: 'jack', x: '0', y: '0', label: currentLabel, isCustom: true };
            const jack = createCustomJack(jackId, currentLabel, moduleDef, 'in');
            unifiedContainer.appendChild(jack);
        }

        // 3. Outputs
        for (let i = 0; i < outputs; i++) {
            const jackId = `${id}_out_${i}`;
            let currentLabel = `Out ${i + 1}`;
            if (config.presetLabels && config.presetLabels.jacks) {
                const suffix = `_out_${i}`;
                if (config.presetLabels.jacks[suffix]) currentLabel = config.presetLabels.jacks[suffix];
            }
            if (config.jackLabels && config.jackLabels[jackId]) currentLabel = config.jackLabels[jackId];
            SYSTEM_CONFIG[jackId] = { type: 'jack', x: '0', y: '0', label: currentLabel, isCustom: true };
            const jack = createCustomJack(jackId, currentLabel, moduleDef, 'out');
            unifiedContainer.appendChild(jack);
        }

        modEl.appendChild(unifiedContainer);

    } else {
        // ORIGINAL SEPARATE ROW LAYOUT (For > 4 Components)

        // Controls Container (Knobs) - Use Grid for alignment
        if (knobs > 0) {
            const knobContainer = document.createElement('div');
            knobContainer.style.display = 'grid';
            knobContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
            knobContainer.style.gap = '6px'; // Consistent gap with jacks
            knobContainer.style.justifyItems = 'center'; // Center items in grid cells
            knobContainer.style.alignItems = 'start'; // Align top
            knobContainer.style.marginBottom = '2px';
            knobContainer.style.padding = '4px';
            knobContainer.style.borderRadius = '6px';

            for (let i = 0; i < knobs; i++) {
                const knobId = `${id}_knob_${i}`;

                // Priority: Existing Config > Preset Label > Default
                let currentLabel = `P${i + 1}`;

                // Check Preset Labels passed during creation (suffix match)
                if (config.presetLabels && config.presetLabels.knobs) {
                    const suffix = `_knob_${i}`;
                    if (config.presetLabels.knobs[suffix]) currentLabel = config.presetLabels.knobs[suffix];
                }

                // Check Persisted Labels (specific ID match)
                if (config.knobLabels && config.knobLabels[knobId]) {
                    currentLabel = config.knobLabels[knobId];
                }

                if (!SYSTEM_CONFIG[knobId]) {
                    SYSTEM_CONFIG[knobId] = { type: 'knob-small', x: '0', y: '0', label: currentLabel, isCustom: true, defValue: 0 };
                }
                if (!componentStates[knobId]) {
                    componentStates[knobId] = { type: 'knob-small', value: 0, isTouched: false };
                }

                const knobWrapper = createCustomKnob(knobId, currentLabel, moduleDef);
                knobContainer.appendChild(knobWrapper);
            }
            modEl.appendChild(knobContainer);
        }

        // Jacks Container - Improved Layout with Grid

        // Jacks Container - Single Row (Flex)
        if (inputs > 0 || outputs > 0) {
            const jackContainer = document.createElement('div');
            jackContainer.style.display = 'grid';
            jackContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
            jackContainer.style.gap = '6px';
            jackContainer.style.justifyItems = 'center';
            jackContainer.style.alignItems = 'center';

            if (knobs > 0) {
                jackContainer.style.borderTop = '1px solid rgba(127,127,127,0.2)';
                jackContainer.style.paddingTop = '10px';
            }

            // INPUTS
            for (let i = 0; i < inputs; i++) {
                const jackId = `${id}_in_${i}`;
                let currentLabel = `In ${i + 1}`;
                if (config.presetLabels && config.presetLabels.jacks) {
                    const suffix = `_in_${i}`;
                    if (config.presetLabels.jacks[suffix]) currentLabel = config.presetLabels.jacks[suffix];
                }
                if (config.jackLabels && config.jackLabels[jackId]) currentLabel = config.jackLabels[jackId];

                SYSTEM_CONFIG[jackId] = { type: 'jack', x: '0', y: '0', label: currentLabel, isCustom: true };
                const jack = createCustomJack(jackId, currentLabel, moduleDef, 'in');
                jackContainer.appendChild(jack);
            }

            // OUTPUTS
            for (let i = 0; i < outputs; i++) {
                const jackId = `${id}_out_${i}`;
                let currentLabel = `Out ${i + 1}`;
                if (config.presetLabels && config.presetLabels.jacks) {
                    const suffix = `_out_${i}`;
                    if (config.presetLabels.jacks[suffix]) currentLabel = config.presetLabels.jacks[suffix];
                }
                if (config.jackLabels && config.jackLabels[jackId]) currentLabel = config.jackLabels[jackId];

                SYSTEM_CONFIG[jackId] = { type: 'jack', x: '0', y: '0', label: currentLabel, isCustom: true };
                const jack = createCustomJack(jackId, currentLabel, moduleDef, 'out');
                jackContainer.appendChild(jack);
            }

            modEl.appendChild(jackContainer);
        }
    }

    sidecar.appendChild(modEl);
}

function removeCustomModule(moduleId) {
    // 1. Remove from DOM
    const el = document.getElementById(moduleId);
    if (el) el.remove();

    // 2. Remove from CUSTOM_MODULES
    const idx = CUSTOM_MODULES.findIndex(m => m.id === moduleId);
    if (idx > -1) {
        const mod = CUSTOM_MODULES[idx];

        // 3. Cleanup SYSTEM_CONFIG & Cables
        // Jacks
        if (mod.config) {
            for (let i = 0; i < (mod.config.inputs || 0); i++) {
                const jId = `${moduleId}_in_${i}`;
                delete SYSTEM_CONFIG[jId];
                removeCablesConnectedTo(jId);
            }
            for (let i = 0; i < (mod.config.outputs || 0); i++) {
                const jId = `${moduleId}_out_${i}`;
                delete SYSTEM_CONFIG[jId];
                removeCablesConnectedTo(jId);
            }
            // Knobs
            for (let i = 0; i < (mod.config.knobs || 0); i++) {
                const kId = `${moduleId}_knob_${i}`;
                delete SYSTEM_CONFIG[kId];
            }
        }

        CUSTOM_MODULES.splice(idx, 1);
    }

    redrawCables();
    saveState();
    showMessage("Module Removed", "info");
}

function removeCablesConnectedTo(jackId) {
    const cablesToRemove = cableData.filter(c => c.start === jackId || c.end === jackId);
    cablesToRemove.forEach(c => removeCable(c.start, c.end));
}



function rerenderGearRacks() {
    // Clear both racks
    const leftRack = document.getElementById('externalGearRackLeft');
    const rightRack = document.getElementById('externalGearRackRight');
    if (leftRack) leftRack.remove();
    if (rightRack) rightRack.remove();

    // Re-render all modules
    CUSTOM_MODULES.forEach(mod => renderCustomModuleToDOM(mod));

    // Redraw cables to update positions
    redrawCables();
}

function createCustomKnob(id, label, moduleDef) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.width = '60px'; // Reduced from 80px

    const el = document.createElement('div');
    el.className = 'component knob-small';
    el.id = id;
    el.dataset.type = 'knob-small';
    el.style.position = 'relative';
    el.style.left = 'auto';
    el.style.top = 'auto';

    el.style.width = '32px'; // Reduced from 40px
    el.style.height = '32px'; // Reduced from 40px
    el.style.paddingBottom = '0';

    el.style.zIndex = '200';

    // Knob Visibility Fix
    const knobBg = document.createElement('div');
    knobBg.style.position = 'absolute';
    knobBg.style.width = '28px'; // Adjusted from 36px
    knobBg.style.height = '28px'; // Adjusted from 36px
    knobBg.style.background = 'rgba(180,180,180,0.3)';
    knobBg.style.borderRadius = '50%';
    knobBg.style.top = '2px';
    knobBg.style.left = '2px';
    knobBg.style.pointerEvents = 'none';
    el.appendChild(knobBg);

    // Set Background Image using CSS Class for Theme Support
    el.classList.add('custom-knob-bg');

    // Rotation logic
    const state = componentStates[id] || { value: 0 };
    let angle = state.value !== undefined ? state.value : -135;
    el.style.setProperty('--angle', angle);
    // Use calc to bind to the variable, overriding the translate(-50%, -50%) from .component
    el.style.transform = `rotate(calc(var(--angle) * 1deg))`;

    // Attach Interactivity - Use Global Handler
    el.addEventListener('mousedown', startKnobDrag);
    el.addEventListener('touchstart', startKnobDrag, { passive: false });
    el.addEventListener('wheel', handleKnobWheel, { passive: false });

    // Editable Label
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = label;
    inp.className = 'custom-knob-label';
    inp.style.fontSize = '14px'; // Increased from 12px
    inp.style.color = 'var(--text-muted)';
    inp.style.fontWeight = '600'; // Increased from 500
    inp.style.marginTop = '6px'; // Reduced from 8px
    inp.style.background = 'transparent';
    inp.style.border = '1px solid transparent';
    inp.style.textAlign = 'center';
    inp.style.width = '100%';
    inp.style.outline = 'none';
    inp.style.padding = '2px';
    inp.style.cursor = 'text';
    inp.style.fontFamily = 'Helvetica, Arial, sans-serif';

    inp.addEventListener('mousedown', (e) => e.stopPropagation());
    inp.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });

    inp.addEventListener('focus', () => {
        inp.style.borderBottom = '1px solid var(--text-main)';
        inp.style.color = 'var(--text-main)';
    });
    inp.addEventListener('blur', () => {
        inp.style.borderBottom = '1px solid transparent';
        inp.style.color = 'var(--text-muted)';
    });

    inp.addEventListener('change', (e) => {
        const newLabel = e.target.value;
        if (SYSTEM_CONFIG[id]) SYSTEM_CONFIG[id].label = newLabel;
        const mod = CUSTOM_MODULES.find(m => m.id === moduleDef.id);
        if (mod) {
            if (!mod.config.knobLabels) mod.config.knobLabels = {};
            mod.config.knobLabels[id] = newLabel;
            saveState();
        }
    });

    wrapper.appendChild(el);
    wrapper.appendChild(inp);
    return wrapper;
}

function createCustomJack(id, label, moduleDef, type = 'any') {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.width = '60px'; // Reduced from 80px

    const el = document.createElement('div');
    el.className = 'component jack';
    el.id = id;
    el.style.position = 'relative';
    el.style.left = 'auto';
    el.style.top = 'auto';
    el.style.zIndex = '200';
    el.style.transform = 'none'; // Fix: Remove -50% offset from .component class
    el.setAttribute('data-type', 'jack');

    el.style.width = '28px'; // Reduced from 32px
    el.style.height = '28px'; // Reduced from 32px
    el.style.paddingBottom = '0';

    // Visual Distinction based on Type
    if (type === 'in') {
        el.classList.add('custom-jack-in');
    } else if (type === 'out') {
        el.classList.add('custom-jack-out');
    }


    el.addEventListener('mousedown', handleJackMouseDown);
    el.addEventListener('touchstart', handleJackMouseDown, { passive: false });

    el.addEventListener('dblclick', (e) => {
        e.preventDefault(); e.stopPropagation();
        const cablesToRemove = cableData.filter(c => c.start === id || c.end === id);
        if (cablesToRemove.length > 0) {
            cablesToRemove.forEach(c => removeCable(c.start, c.end));
            redrawCables(); saveState();
            triggerHandlingNoise();
        }
    });

    // Editable Label
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = label;
    inp.className = 'custom-jack-label';
    inp.style.fontSize = '14px'; // Increased from 12px
    inp.style.color = 'var(--text-muted)';
    inp.style.fontWeight = '600'; // Increased from 500
    inp.style.marginTop = '6px'; // Reduced from 8px
    inp.style.background = 'transparent';
    inp.style.border = '1px solid transparent';
    inp.style.textAlign = 'center'; // Center text
    inp.style.width = '100%';
    inp.style.outline = 'none';
    inp.style.padding = '2px';
    inp.style.cursor = 'text';
    inp.style.fontFamily = 'Helvetica, Arial, sans-serif';

    inp.addEventListener('mousedown', (e) => e.stopPropagation());
    inp.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });

    inp.addEventListener('focus', () => {
        inp.style.borderBottom = '1px solid var(--text-main)';
        inp.style.color = 'var(--text-main)';
    });
    inp.addEventListener('blur', () => {
        inp.style.borderBottom = '1px solid transparent';
        inp.style.color = 'var(--text-muted)';
    });

    inp.addEventListener('change', (e) => {
        const newLabel = e.target.value;
        // 1. Update SYSTEM_CONFIG
        if (SYSTEM_CONFIG[id]) SYSTEM_CONFIG[id].label = newLabel;

        // 2. Update Persisted Module Definition
        const mod = CUSTOM_MODULES.find(m => m.id === moduleDef.id);
        if (mod) {
            if (!mod.config.jackLabels) mod.config.jackLabels = {};
            mod.config.jackLabels[id] = newLabel;
            saveState();
        }
    });

    wrapper.appendChild(el);
    wrapper.appendChild(inp);
    return wrapper;
}

// --- GLOBAL TOGGLE FUNCTIONS ---



function toggleMic() {
    micEnabled = !micEnabled;
    const btn = document.getElementById('micToggle');

    if (micEnabled) {
        // initMic is async but we don't await it here to avoid blocking UI
        initMic().catch(e => console.error(e));
        btn?.classList.add('mic-is-active');
        btn?.classList.add('btn-active');
        showMessage("Microphone Active", "success");
    } else {
        if (audioNodes['Mic_Stream']) {
            try {
                audioNodes['Mic_Stream'].getTracks().forEach(track => track.stop());
            } catch (e) { }
            delete audioNodes['Mic_Stream'];
            delete audioNodes['Mic_Splitter'];
        }
        btn?.classList.remove('mic-is-active');
        btn?.classList.remove('btn-active');
        showMessage("Microphone Muted", "neutral");
    }
    updateAudioGraph();
}

function togglePerfMode() {
    isPerformanceMode = !isPerformanceMode;
    const btn = document.getElementById('perfToggle');

    if (isPerformanceMode) {
        document.body.classList.add('performance-mode');
        btn?.classList.add('perf-locked');
        btn?.classList.add('btn-active');
        if (btn) {
            btn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> <span class="hidden sm:inline">Perf</span>';
            btn.title = "Performance Mode";
        }
        showMessage("Performance Mode: Cables Locked", "warning");
        if (screen.orientation && screen.orientation.lock) {
            try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { }
        }
    } else {
        document.body.classList.remove('performance-mode');
        btn?.classList.remove('perf-locked');
        btn?.classList.remove('btn-active');
        if (btn) {
            btn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> <span class="hidden sm:inline">Edit</span>';
            btn.title = "Editing Enabled";
        }
        showMessage("Edit Mode: Cables Unlocked", "success");
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    }
    // Resize handling for canvas
    window.dispatchEvent(new Event('resize'));
}

function toggleFullScreen() {
    const btn = document.getElementById('fullscreenToggle');
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable full-screen mode: ${err.message}`);
        });
        btn?.classList.add('btn-active');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        btn?.classList.remove('btn-active');
    }
}

function toggleMIDI() {
    const btn = document.getElementById('midiToggle');
    const vk = document.getElementById('virtualKeyboard');
    if (midiEnabled) {
        midiEnabled = false;
        btn?.classList.remove('midi-is-active');
        btn?.classList.remove('btn-active');
        vk?.classList.remove('is-visible');
        vk?.classList.remove('is-visible'); // remove duplicate if exists or just ensure it's gone
        showMessage("MIDI Input Disabled", "warning");

        // Hide Learn Button & Disable Mode
        const learnBtn = document.getElementById('midiLearnBtn');
        if (learnBtn) learnBtn.classList.add('hidden');
        if (btn) btn.classList.add('btn-group-last'); // Make MIDI toggle round
        if (typeof disableMidiLearnMode === 'function') disableMidiLearnMode();
    } else {
        midiEnabled = true;
        btn?.classList.add('midi-is-active');
        btn?.classList.add('btn-active');
        vk?.classList.add('is-visible');
        if (window.initMidi) window.initMidi();
        if (window.initMidi) window.initMidi();
        showMessage("MIDI Enabled (Virtual + External)", "success");

        // Show Learn Button
        const learnBtn = document.getElementById('midiLearnBtn');
        if (learnBtn) learnBtn.classList.remove('hidden');
        if (btn) btn.classList.remove('btn-group-last'); // Restore square edge
    }
    updateAudioGraph();
}

// --- FOCUS MODE ---
let isFocusMode = false;
function toggleFocusMode() {
    isFocusMode = !isFocusMode;
    const btn = document.getElementById('focusToggle');

    if (isFocusMode) {
        document.body.classList.add('patch-focus-mode');
        btn?.classList.add('focus-active');
        btn?.classList.add('btn-active');
        updateFocusState(); // Calculate connected jacks
        showMessage("Focus Mode: Unused Jacks Dimmed", "success");
    } else {
        document.body.classList.remove('patch-focus-mode');
        btn?.classList.remove('focus-active');
        btn?.classList.remove('btn-active');
        // Cleanup classes
        document.querySelectorAll('.focus-connected').forEach(el => el.classList.remove('focus-connected'));
        showMessage("Focus Mode Disabled", "neutral");
    }
}

function updateFocusState() {
    if (!isFocusMode) return;

    // 1. Reset all focus classes
    document.querySelectorAll('.focus-connected').forEach(el => el.classList.remove('focus-connected'));
    document.querySelectorAll('.focus-edited').forEach(el => el.classList.remove('focus-edited'));

    // 2. Find connected jacks from cableData
    const connectedIds = new Set();
    cableData.forEach(cable => {
        connectedIds.add(cable.start);
        connectedIds.add(cable.end);
    });

    // 3. Highlight connected jacks
    connectedIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('focus-connected');
    });

    // 4. Highlight Edited Controls (Knobs, Switches, Buttons)
    for (const [id, state] of Object.entries(componentStates)) {
        const config = SYSTEM_CONFIG[id];
        const el = document.getElementById(id);
        if (!el || !config) continue;

        let isEdited = false;

        // -- Knobs --
        if (config.type.startsWith('knob')) {
            const currentVal = state.value || 0;
            const defVal = config.defValue !== undefined ? config.defValue : 0;
            // Tolerance for float comparison if needed, but usually exact for defaults
            if (Math.abs(currentVal - defVal) > 1.0) isEdited = true;
        }
        // -- Switches --
        else if (config.type.startsWith('switch')) {
            const currentVal = state.value || 0;
            const defVal = config.defValue !== undefined ? config.defValue : 0;
            if (currentVal !== defVal) isEdited = true;
        }
        // -- Buttons (Active State) --
        else if (config.type.startsWith('button')) {
            // If button is active (state 1), it's "interesting"
            // Special handling for 4 Voltages defaults could go here if needed,
            // but generally active = relevant.
            if (state.value == 1) isEdited = true;
        }

        if (isEdited) {
            el.classList.add('focus-edited');
        }
    }
}

function focusView() {
    const container = document.getElementById('synthContainer');
    const wrapper = document.getElementById('mainContentWrapper');
    if (!container || !wrapper) return;

    // Default Zoom
    VIEWPORT.scale = 0.85;

    // Center Logic
    const wrapperRect = wrapper.getBoundingClientRect();
    const synthRect = container.getBoundingClientRect(); // This is effectively 1200 * scale

    // We want the SYNTH centered in the WRAPPER
    // VIEWPORT.x/y is the translation applied to the container
    // If x=0, y=0, the container is at top-left

    // Desired Center X of Wrapper
    const centerX = wrapperRect.width / 2;
    const centerY = wrapperRect.height / 2;

    // --- 5. MIDI HELPERS (Added) ---

    // Center of Synth (unscaled)
    const synthCenterX = (1200 * VIEWPORT.scale) / 2;
    const synthCenterY = (800 * VIEWPORT.scale) / 2;

    VIEWPORT.x = centerX - synthCenterX;
    VIEWPORT.y = centerY - synthCenterY; // Slightly shift up for better visibility? Maybe not.

    updateTransform();
}

window.updateKnobFromMidi = function (id, normValue) {
    const el = document.getElementById(id);
    if (!el) return;

    // Knob Logic
    if (el.dataset.type && el.dataset.type.startsWith('knob')) {
        // Map 0-1 to -150 to +150 (300 range)
        const angle = (normValue * 300) - 150;

        if (!componentStates[id]) componentStates[id] = { type: el.dataset.type, value: 0 };
        componentStates[id].value = angle;

        // Update Visuals
        el.style.setProperty('--angle', angle);

        // Update Audio Params
        if (typeof updateAudioParams === 'function') updateAudioParams();
    }
};
