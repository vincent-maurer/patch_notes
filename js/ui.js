// =========================================================================
// UI.JS
// Handles rendering, user interaction, drag-and-drop, and DOM manipulation.
// =========================================================================

// --- 1. COMPONENT RENDERING ----------------------------------------------

function renderComponents() {
    const container = document.getElementById('synthContainer');
    
    // 1. Clear Old Elements (Keep Cables/Notes)
    Array.from(container.children).forEach(c => { 
        if(!c.classList.contains('cable-svg') && !c.classList.contains('note-element')) c.remove(); 
    });

    // Panel Background
    const panelImg = document.createElement('img');
    panelImg.className = 'panel-art-img';
    const isDark = document.body.classList.contains('dark-mode');
    panelImg.src = isDark ? 'images/panel_image_dark.svg' : 'images/panel_image.svg';
    panelImg.draggable = false;
    container.appendChild(panelImg);

    // 2. Create Components
    for(const id in SYSTEM_CONFIG) createComponent(id, SYSTEM_CONFIG[id]);
    
    if(typeof renderCardSlot === 'function') renderCardSlot(); 

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
        el.addEventListener('mousedown', handleJackMouseDown);
        el.addEventListener('touchstart', handleJackMouseDown, {passive: false});

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

        if(initialTouch) el.classList.add('is-touched'); 
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
        if(saved && saved.isTouched) el.classList.add('is-touched');
    } 
    
    // --- Switches ---
    else if (config.type.startsWith('switch')) {
        el.addEventListener('mousedown', startSwitchDrag);
        el.addEventListener('touchstart', startSwitchDrag, { passive: false });
        const initialVal = saved ? saved.value : (config.defValue || 0);
        const initialTouch = !!(saved && saved.isTouched);
        setSwitchState(el, initialVal, initialTouch);
        if(initialTouch) el.classList.add('is-touched');
        el.appendChild(document.createElement('div')).className = 'switch-handle';
        el.addEventListener('dblclick', (e) => { e.preventDefault(); resetSwitch(el); });
    }
    addTouchLongPress(el);
    el.addEventListener('contextmenu', showContextMenu); 
    document.getElementById('synthContainer').appendChild(el);
    if(config.type.startsWith('knob')) updateKnobRangeVisuals(el);
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
            if(!saved) componentStates[k.id] = { type: 'knob-small', value: val, isTouched: false };
            
            knob.addEventListener('mousedown', (e) => { e.stopPropagation(); startKnobDrag(e); });
            knob.addEventListener('touchstart', (e) => { e.stopPropagation(); startKnobDrag(e); }, {passive: false});
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
        if(typeof updateInterfaceScaling === 'function') updateInterfaceScaling();
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
            x: ((elRect.left + elRect.width/2) - contRect.left) / currentScale,
            y: ((elRect.top + elRect.height/2) - contRect.top) / currentScale
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
    const dist = Math.sqrt(dx*dx + dy*dy);
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
    if(!isTemp) path.style.filter = "drop-shadow(0px 4px 2px rgba(0,0,0,0.3))";
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
            }, {passive: false});
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
                } catch(e) {}
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
}

function removeCable(s, e, preserveHitBox = false) { 
    cableData = cableData.filter(c => !(c.start===s && c.end===e) && !(c.start===e && c.end===s)); 
    
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
        if(headStart) visualPath.parentNode.appendChild(headStart);
        if(headEnd) visualPath.parentNode.appendChild(headEnd);
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
                preventDefault: () => {},
                stopPropagation: () => {},
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
                if(typeof stopKnobDrag === 'function') stopKnobDrag();
            }
            if (typeof isDraggingCable !== 'undefined' && isDraggingCable) {
                isDraggingCable = false;
                if(typeof stopCableDrag === 'function') stopCableDrag();
                // Clean up ghost cable if needed
                if(typeof removeTempCableVisuals === 'function') removeTempCableVisuals();
                if(typeof disableGhostMode === 'function') disableGhostMode();
            }
            if (typeof isDraggingSwitch !== 'undefined' && isDraggingSwitch) {
                isDraggingSwitch = false;
                if(typeof stopSwitchDrag === 'function') stopSwitchDrag(fakeEvent);
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
            const isDup = cableData.some(c => (c.start===currentCableStart && c.end===nearest) || (c.start===nearest && c.end===currentCableStart));
            
            if (!isDup) {
                const color = currentDraggedCable.color;
                cableData.push({ start: currentCableStart, end: nearest, color: color, droopOffset: (Math.random()*20-10) });
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
            if(startEl) startEl.classList.remove('active');
            
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
        const isDup = cableData.some(c => (c.start===currentCableStart && c.end===id) || (c.start===id && c.end===currentCableStart));
        
        if (!isDup) {
            cableData.push({ start: currentCableStart, end: id, color: color, droopOffset: (Math.random()*20-10) });
            redrawCables(); 
            saveState();
            
            const targetEl = document.getElementById(id);
            targetEl.classList.add('active-target');
            setTimeout(() => targetEl.classList.remove('active-target'), 200);
            updateAudioGraph();
        }
        
        disableGhostMode();
        const startEl = document.getElementById(currentCableStart);
        if(startEl) startEl.classList.remove('active');
        
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
    document.addEventListener('touchmove', dragCable, {passive:false});
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
    if(e.cancelable) e.preventDefault(); 
    
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
    document.addEventListener('touchmove', dragCable, {passive:false});
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);
}

function dragCable(e) { 
    if (!isDraggingCable || !currentDraggedCable) return; 
    
    if(e.cancelable) e.preventDefault(); 
    
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
                if(cableObj) {
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
    document.removeEventListener('touchmove', dragCable, {passive:false});
    document.removeEventListener('touchend', stopCableDrag);
}

// --- 5. INTERACTION (KNOBS, SWITCHES, NOTES) ----------------------------
let knobDragLastAngle = 0; 

function updateKnobAngle(el, val, isTouched = true) { 
    el.style.setProperty('--angle', val); 
    const existingState = componentStates[el.id] || {};
    componentStates[el.id] = { 
        ...existingState, 
        type: el.dataset.type, 
        value: val, 
        isTouched: isTouched 
    }; 
    updateAudioParams(); 
}

function resetKnob(el) { 
    updateKnobAngle(el, SYSTEM_CONFIG[el.id]?.defValue || 0, false); 
    el.classList.remove('is-touched');
    saveState(); 
}    
function startKnobDrag(e) { 
    e.preventDefault(); 
    isDraggingKnob = true; 
    currentKnobElement = e.currentTarget; 
    currentKnobElement.classList.add('is-touched'); 
    triggerHandlingNoise(false); 
    
    // NEW: Initialize the angle tracker
    const rect = currentKnobElement.getBoundingClientRect(); 
    const cx = e.clientX || e.touches[0].clientX;
    const cy = e.clientY || e.touches[0].clientY; 
    
    // Calculate initial raw angle (-180 to 180)
    let deg = (Math.atan2(cy - (rect.top+rect.height/2), cx - (rect.left+rect.width/2)) * 180 / Math.PI) + 90; 
    if(deg > 180) deg -= 360; 
    knobDragLastAngle = deg;

    document.addEventListener('mousemove', dragKnob); 
    document.addEventListener('mouseup', stopKnobDrag); 
    document.addEventListener('touchmove', dragKnob, {passive:false}); 
    document.addEventListener('touchend', stopKnobDrag); 
}
function stopKnobDrag() { isDraggingKnob = false; saveState(); document.removeEventListener('mousemove', dragKnob); document.removeEventListener('mouseup', stopKnobDrag); }
function dragKnob(e) { 
    if (!isDraggingKnob) return; 
    e.preventDefault(); 
    
    const rect = currentKnobElement.getBoundingClientRect(); 
    const cx = e.clientX || e.touches[0].clientX;
    const cy = e.clientY || e.touches[0].clientY; 
    
    // 1. Calculate current raw angle
    let deg = (Math.atan2(cy - (rect.top+rect.height/2), cx - (rect.left+rect.width/2)) * 180 / Math.PI) + 90; 
    if(deg > 180) deg -= 360; 
    
    // 2. Calculate Delta (Change since last frame)
    let delta = deg - knobDragLastAngle;
    
    // 3. Fix Wrap-Around (crossing the bottom gap)
    // If we jumped from 179 to -179, delta is -358. We want +2.
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    
    knobDragLastAngle = deg; // Update for next frame

    // 4. Apply Delta to Current Value
    const state = componentStates[currentKnobElement.id];
    const currentVal = state ? state.value : 0;
    
    let newVal = currentVal + delta;

    // 5. Apply Limits
    let minLimit = -150;
    let maxLimit = 150;
    
    if (state && state.range) {
        minLimit = state.range[0];
        maxLimit = state.range[1];
    }
    
    // Clamp
    newVal = Math.max(minLimit, Math.min(maxLimit, newVal));
    
    // 6. Audio Feedback & Update
    if (Math.abs(newVal - lastScratchAngle) > 3) {
        triggerHandlingNoise(true); 
        lastScratchAngle = newVal; 
    }

    updateKnobAngle(currentKnobElement, newVal); 
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

    const d = describeArc(50, 50, radius, radius-4, min, max);
    
    path.setAttribute('d', d);
}

    


function handleKnobWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    const el = e.currentTarget;
    const isFine = e.shiftKey || e.ctrlKey;
    const step = isFine ? 1 : 10;
    const dir = Math.sign(e.deltaY) * -1; 
    
    let currentVal = componentStates[el.id] ? parseFloat(componentStates[el.id].value) : (SYSTEM_CONFIG[el.id]?.defValue || 0);
    let newVal = currentVal + (dir * step);
    newVal = Math.max(-150, Math.min(150, newVal));
    
    updateKnobAngle(el, newVal);
    triggerHandlingNoise(false); 
}
function setSwitchState(el, state, isTouched = true) { 
    el.setAttribute('data-state', state); 
    componentStates[el.id] = { type: el.dataset.type, value: state, isTouched: isTouched }; 
    if (isTouched) {
        el.classList.add('is-touched');
    } else {
        el.classList.remove('is-touched');
    }
    updateAudioParams(); 
}
function handleSwitchClick(e) { const el = e.currentTarget; const states = el.dataset.type.includes('3way') ? 3 : 2; setSwitchState(el, (parseInt(el.getAttribute('data-state')||0) + 1) % states); el.classList.add('is-touched'); saveState(); }
function resetSwitch(el) { 
    const def = SYSTEM_CONFIG[el.id]?.defValue || 0;
    setSwitchState(el, def, false); 
    saveState(); 
}
function handleButtonClick(e) { const el = e.currentTarget; const val = parseInt(el.getAttribute('data-state')||0) === 0 ? 1 : 0; el.setAttribute('data-state', val); el.classList.add('is-touched'); componentStates[el.id] = { type: 'button', value: val, isTouched: true }; updateAudioParams(); saveState(); }

function createNoteElement(d) {
    const el = document.createElement('div'); el.className = 'note-element'; el.id = d.id; el.style.left = d.x; el.style.top = d.y; el.textContent = d.text; el.contentEditable = true;
    if(d.color) el.style.color = d.color; if(d.backgroundColor) el.style.backgroundColor = d.backgroundColor; if(d.border) el.style.border = d.border; if(!d.color) el.classList.add('default-style');
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
    startNoteDragX = (rect.left + rect.width/2 - cont.left) - ((e.clientX||e.touches[0].clientX) - cont.left); 
    startNoteDragY = (rect.top + rect.height/2 - cont.top) - ((e.clientY||e.touches[0].clientY) - cont.top); 
    document.addEventListener('mousemove', dragNote); 
    document.addEventListener('mouseup', stopDragNote); 
    document.addEventListener('touchmove', dragNote, {passive:false}); 
    document.addEventListener('touchend', stopDragNote); 
}
function dragNote(e) { if(!currentNoteElement) return; if(!isNoteDragging) { isNoteDragging=true; currentNoteElement.style.cursor='grabbing'; document.activeElement.blur(); } const cont = document.getElementById('synthContainer').getBoundingClientRect(); const x = ((e.clientX||e.touches[0].clientX) - cont.left + startNoteDragX) / cont.width * 100; const y = ((e.clientY||e.touches[0].clientY) - cont.top + startNoteDragY) / cont.height * 100; currentNoteElement.style.left = x+'%'; currentNoteElement.style.top = y+'%'; }
function stopDragNote() { 
    if(currentNoteElement) { 
        currentNoteElement.style.cursor='grab'; 
        currentNoteElement.style.transition = '';
        if(isNoteDragging) saveState(); 
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
    if (e.target.closest('.component') || e.target.tagName === 'path' || e.target.tagName === 'text' || e.target.classList.contains('note-element')) return; 
    e.preventDefault(); 
    isDraggingChassis = true;
    const cx = e.clientX || e.touches[0].clientX;
    const cy = e.clientY || e.touches[0].clientY;
    lastChassisPos = { x: cx, y: cy };
    triggerHandlingNoise(false); 
    document.addEventListener('mousemove', dragChassis);
    document.addEventListener('mouseup', stopChassisDrag);
    document.addEventListener('touchmove', dragChassis, {passive:false});
    document.addEventListener('touchend', stopChassisDrag);
}
function dragChassis(e) {
    if (!isDraggingChassis) return;
    e.preventDefault();
    const cx = e.clientX || e.touches[0].clientX;
    const cy = e.clientY || e.touches[0].clientY;
    const dx = cx - lastChassisPos.x;
    const dy = cy - lastChassisPos.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
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

    Array.from(menu.children).forEach(l => l.style.display='none');

    if (pedalId) {
        const rmv = menu.querySelector('[data-action="removePedal"]');
        rmv.style.display = 'block';
        rmv.textContent = `Remove ${PEDAL_DEFINITIONS[pedalId].name}`;
    }
    else if (el.classList.contains('jack')) {
            const id = el.id;
            let createBtn = menu.querySelector('[data-action="createStack"]');
            if(!createBtn) {
                createBtn = document.createElement('li'); 
                createBtn.dataset.action = 'createStack';
                createBtn.textContent = 'Create Cable';
                menu.appendChild(createBtn);
            }
            createBtn.style.display = 'block';
            const isOutput = /out|sqr|sin|send|volt/i.test(id);
            if (isOutput) {
            let probe1 = menu.querySelector('[data-action="probe1"]');
            if(!probe1) {
                probe1 = document.createElement('li'); probe1.dataset.action = 'probe1';
                probe1.className = "px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-green-500 font-bold";
                menu.insertBefore(probe1, menu.firstChild);
            }
            probe1.style.display = 'block';
            probe1.textContent = `Scope CH1: ${SYSTEM_CONFIG[id]?.label}`;

            let probe2 = menu.querySelector('[data-action="probe2"]');
            if(!probe2) {
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
    if(el.dataset.type && el.dataset.type.startsWith('knob')) {
            menu.querySelector('[data-action="setValue"]').style.display = 'block'; 
            
            let rangeBtn = menu.querySelector('[data-action="setRange"]');
            if(!rangeBtn) {
                rangeBtn = document.createElement('li'); 
                rangeBtn.dataset.action = 'setRange';
                rangeBtn.textContent = 'Set Limits';
                menu.appendChild(rangeBtn);
            }
            rangeBtn.style.display = 'block';
        }
    else if (contextTarget === null || contextTarget.classList.contains('card-slot-container') || contextTarget.classList.contains('program-card')) {
        let cardBtn = menu.querySelector('[data-action="changeCard"]');
        if(!cardBtn) {
            cardBtn = document.createElement('li'); cardBtn.dataset.action = 'changeCard';
            cardBtn.textContent = 'Select Program Card...';
            menu.appendChild(cardBtn);
        }
        cardBtn.style.display = 'block';
        if (contextTarget === null) menu.querySelector('[data-action="addNote"]').style.display = 'block';
    }
    else if(el.classList.contains('note-element')) { 
        menu.querySelector('[data-action="styleNote"]').style.display = 'block'; 
        menu.querySelector('[data-action="removeNote"]').style.display = 'block'; 
    }
    else { 
        const r = menu.querySelector('[data-action="reset"]'); 
        r.style.display = 'block'; r.textContent = 'Reset Default'; 
        if(el.dataset.type && el.dataset.type.startsWith('knob')) {
            menu.querySelector('[data-action="setValue"]').style.display = 'block'; 
        }
    }
    menu.style.display = 'block'; 
    let x = e.pageX;
    let y = e.pageY;
    if (x + menu.offsetWidth > window.innerWidth + window.scrollX) {
        x -= menu.offsetWidth; 
    }
    menu.style.left = x + 'px'; 
    menu.style.top = y + 'px';
    document.addEventListener('click', () => menu.style.display = 'none', {once:true});
}

function handleCableRightClick(e, s, end) { 
    e.preventDefault(); 
    e.stopPropagation(); 
    
    contextCable = getCableByIds(s, end); 
    const menu = document.getElementById('contextMenu'); 
    
    Array.from(menu.children).forEach(l => l.style.display='none'); 
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
    
    document.addEventListener('click', () => menu.style.display = 'none', {once:true}); 
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
        h.addEventListener('touchstart', (e) => startRangeHandleDrag(e, cls.includes('min-handle')), {passive: false});
        
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
    if(lastDeg > 180) lastDeg -= 360;

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
            h.style.left = `${(rect.width/2) + radius * Math.cos(rad)}px`;
            h.style.top = `${(rect.height/2) + radius * Math.sin(rad)}px`;
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
        if(btn) {
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
        
        if (!anyActive) {
            // If we just turned off the last one, force it back on
            setBtnState(targetEl.id, true); 
        }
    }

    updateAudioParams();
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
    document.getElementById('exportMenuToggle').addEventListener('click', showExportMenu);

    menu.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        if (!action) return;
        hideExportMenu();

        switch (action) {
            case 'savePatchButton': 
                const state = getCurrentPatchState(); 
                const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
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
                try { if (window.self !== window.top) baseUrl = window.top.location.href.split('#')[0]; } catch (e) {}
                const u = `${baseUrl}#p=${compressed}`; 
                navigator.clipboard.writeText(u).then(() => showMessage("URL Copied!", "success")); 
                break;
            case 'savePdfButton': 
                const patchName = document.getElementById('patchNameInput').value || "Untitled Patch";
                const notes = document.getElementById('globalNotesArea').value;
                const wrapper = document.getElementById('mainContentWrapper');
                const savedViewport = { ...VIEWPORT };
                wrapper.style.removeProperty('transform');
                wrapper.style.removeProperty('transform-origin');
                VIEWPORT.scale = 1.0;
                VIEWPORT.x = 0;
                VIEWPORT.y = 0;
                updateInterfaceScaling(); 
                let header = document.querySelector('.print-header');
                if (!header) {
                    header = document.createElement('div');
                    header.className = 'print-header';
                    wrapper.prepend(header);
                }
                header.innerHTML = `<h1>${patchName}</h1>`;
                let notesDiv = document.querySelector('.print-notes');
                if (!notesDiv) {
                    notesDiv = document.createElement('div');
                    notesDiv.className = 'print-notes';
                    wrapper.appendChild(notesDiv);
                }
                notesDiv.textContent = notes;
                injectPrintStyles();
                const wasDark = document.body.classList.contains('dark-mode');
                if (wasDark) {
                    document.body.classList.remove('dark-mode');
                    const panelImg = document.querySelector('.panel-art-img');
                    if(panelImg) panelImg.src = 'images/panel_image.svg';
                    document.querySelectorAll('.knob-img').forEach(img => {
                        img.src = img.src.replace('_dark.svg', '.svg');
                    });
                }
                await new Promise(r => setTimeout(r, 150)); 
                updatePedalCables();
                redrawCables();
                window.print();
                Object.assign(VIEWPORT, savedViewport);
                if (wasDark) {
                    document.body.classList.add('dark-mode');
                    const panelImg = document.querySelector('.panel-art-img');
                    if(panelImg) panelImg.src = 'images/panel_image_dark.svg';
                    document.querySelectorAll('.knob-img').forEach(img => {
                        img.src = img.src.replace('.svg', '_dark.svg');
                    });
                }
                updateViewport();
                updateInterfaceScaling();
                setTimeout(() => {
                    updatePedalCables();
                    redrawCables();
                }, 100);
                break;
        }
    });
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
        else if (k.classList.contains('knob-small') || k.classList.contains('pedal-knob')) imgUrl = isDark ? 'url("images/smallKnob_dark.svg")' : 'url("images/images/smallKnob.svg")';
        
        const angle = k.style.getPropertyValue('--angle') || 0;
        k.style.backgroundImage = imgUrl;
        k.style.backgroundRepeat = 'no-repeat';
        k.style.backgroundPosition = 'center';
        k.style.backgroundSize = 'contain';
        
        if (k.classList.contains('component')) k.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        else k.style.transform = `rotate(${angle}deg)`;
    });

    const fullWidth = wrapper.scrollWidth + 20; 
    const fullHeight = wrapper.scrollHeight + 20;
    const scale = 3; 
    
    const options = {
        width: fullWidth * scale,
        height: fullHeight * scale,
        style: {
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${fullWidth}px`,
            height: `${fullHeight}px`,
            backgroundColor: currentBgColor, 
            maxWidth: 'none', minWidth: 'none', margin: '0', padding: '25px'
        },
        cacheBust: false,
        filter: (node) => (node.id !== 'messageBox')
    };

    domtoimage.toPng(wrapper, options)
    .then((dataUrl) => {
        const optimized = optimizeState(getCurrentPatchState());
        const compressed = LZString.compressToBase64(JSON.stringify(optimized));
        const finalUrl = injectPngMetadata(dataUrl, PNG_KEYWORD, compressed);
        const link = document.createElement('a');
        link.download = patchName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
        link.href = finalUrl;
        link.click();
        showMessage("Saved High-Res PNG!", "success");
    })
    .catch((error) => { console.error(error); showMessage("Export Failed.", "error"); })
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
        
        if (pedalboard) {
            pedalboard.style.cssText = originalPbStyle;
            if (!originalPbStyle) {
                pedalboard.style.background = '';
                pedalboard.style.border = '';
                pedalboard.style.boxShadow = '';
                pedalboard.style.display = '';
            }
        }
        
        wrapper.style.backgroundColor = originalBg; 
        headerContainer.remove(); 
        if (notesContainer) notesContainer.remove();
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
                } catch(err) { showMessage("Error parsing PNG data", "error"); }
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
                } catch(err) { 
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
            } catch(err) { showMessage("Invalid JSON file", "error"); }
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
        if(el) {
            if(el.dataset.type.startsWith('knob')) resetKnob(el);
            else if(el.dataset.type.startsWith('switch')) resetSwitch(el);
            else if(el.dataset.type.startsWith('button')) {
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

    while(attempts < MAX_ATTEMPTS) {
        attempts++;
        const connections = [];
        const numConnections = Math.floor(Math.random() * 7) + 3; // Min 3 cables
        
        const usedInputs = new Set();
        const usedOutputs = new Set();
        let genAttempts = 0;

        while(connections.length < numConnections && genAttempts < 100) {
            genAttempts++;
            
            const fromMod = MODULES_MAP[Math.floor(Math.random() * MODULES_MAP.length)];
            const toMod = MODULES_MAP[Math.floor(Math.random() * MODULES_MAP.length)];
            
            if(!fromMod.outputs.length || !toMod.inputs.length) continue;
            if(fromMod === toMod) continue; 

            const availOuts = fromMod.outputs.filter(o => !usedOutputs.has(o));
            const availIns = toMod.inputs.filter(i => !usedInputs.has(i));

            if(!availOuts.length || !availIns.length) continue;

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

        if(connections.length >= 3 && isValidPatch(connections, mixerIdx)) {
            bestConnections = connections;
            break; 
        }
    }

    if(bestConnections) {
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

    return { 
        patchName: nameInput ? nameInput.value : "Untitled Patch", 
        globalNotes: notesArea ? notesArea.value : "", 
        componentStates: componentStates, 
        cables: cableData, 
        notes: saveNotePositions(),
        pedalOrder: activePedalChain,
        activeCardId: currentCardId 
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

    requestAnimationFrame(() => {
        redrawCables(); 
        if(audioCtx) {
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
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
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
            if(window.updateInterfaceScaling) window.updateInterfaceScaling();
            
            clearTimeout(window.zoomDebounce);
            window.zoomDebounce = setTimeout(() => {
                const wrapper = document.getElementById('mainContentWrapper');
                wrapper.style.opacity = '0.99'; 
                setTimeout(() => wrapper.style.opacity = '1', 10);
            }, 150);
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
        if (['INPUT', 'BUTTON', 'SELECT', 'LABEL'].includes(e.target.tagName) || 
            e.target.closest('.knob-img') || 
            e.target.closest('.pedal-knob')) {
            return;
        }

        if (e.touches.length === 1) {
            if (!isDraggingCable && !isDraggingKnob && !isDraggingSwitch) {
                VIEWPORT.isPanning = true;
                VIEWPORT.lastX = e.touches[0].clientX;
                VIEWPORT.lastY = e.touches[0].clientY;
            }
        } 
        else if (e.touches.length === 2) {
            VIEWPORT.isPanning = false; 
            initialPinchDistance = getDistance(e.touches);
            lastScale = VIEWPORT.scale;
        }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if(e.cancelable) e.preventDefault(); 

        if (e.touches.length === 1 && VIEWPORT.isPanning) {
            const dx = e.touches[0].clientX - VIEWPORT.lastX;
            const dy = e.touches[0].clientY - VIEWPORT.lastY;
            VIEWPORT.x += dx;
            VIEWPORT.y += dy;
            VIEWPORT.lastX = e.touches[0].clientX;
            VIEWPORT.lastY = e.touches[0].clientY;
            updateViewport();
        } 
        else if (e.touches.length === 2 && initialPinchDistance) {
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
            if(window.updateInterfaceScaling) window.updateInterfaceScaling();
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) initialPinchDistance = null;
        if (e.touches.length === 0) VIEWPORT.isPanning = false;
        if (e.touches.length === 1 && !['INPUT','BUTTON'].includes(e.target.tagName)) {
            VIEWPORT.isPanning = true;
            VIEWPORT.lastX = e.touches[0].clientX;
            VIEWPORT.lastY = e.touches[0].clientY;
        }
    });
}

function updateViewport() {
    const wrapper = document.getElementById('mainContentWrapper');
    wrapper.style.transform = `translate(${VIEWPORT.x}px, ${VIEWPORT.y}px) scale(${VIEWPORT.scale})`;
    if(window.updateInterfaceScaling) window.updateInterfaceScaling();
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

window.onload = function() {
    // 1. Theme
    const savedTheme = localStorage.getItem('mtm_theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.body.classList.add('dark-mode');
    }

    // 2. Render Interface
    renderComponents();
    renderPedalboard();
    if(typeof setupScopeUI === 'function') setupScopeUI();
    if(typeof setupRecorderUI === 'function') setupRecorderUI();
    if(typeof updateInterfaceScaling === 'function') updateInterfaceScaling();
    initColorPicker();
    setupExportHandlers(); 
    integrateFloatingWindows();

    // 3. Initialize Visuals & Tools
    if(typeof initWaveforms === 'function') initWaveforms(); 
    initZoomPan();

    // 4. Load from URL
    const params = new URLSearchParams(window.location.search);
    let d = params.get('p');
    if(!d && window.location.hash.startsWith('#p=')) d = window.location.hash.substring(3);
    
    if(d) {
        try {
            const raw = JSON.parse(LZString.decompressFromEncodedURIComponent(d));
            const state = raw.cs ? expandOptimizedState(raw) : raw; 
            resetHistory(state); 
        } catch(e){ showMessage("Error loading URL patch", "error"); }
    } else { saveState(); } 

    // 5. Setup Presets
    function refreshPresetsDropdown(selectedName = "") {
        const presets = JSON.parse(localStorage.getItem('mtm_patches')||'{}'); 
        const drop = document.getElementById('presetsDropdown'); 
        drop.innerHTML = '<option value="">- Local Library -</option>';
        Object.keys(presets).sort().forEach(k => { 
            const o = document.createElement('option'); 
            o.value = k; o.textContent = k; 
            if(k === selectedName) o.selected = true;
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

    document.getElementById('contextMenu').addEventListener('click', (e) => {
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
            document.addEventListener('touchmove', dragCable, {passive:false});
            document.addEventListener('mouseup', handleGlobalMouseUp);
            document.addEventListener('touchend', handleGlobalMouseUp);
            
            document.getElementById(id).classList.add('active');
        }

        if ((act === 'probe1' || act === 'probe2') && contextTarget) {
            const ch = act === 'probe1' ? 0 : 1;
            connectProbeToScope(contextTarget.id, ch);
            const win = document.getElementById('scopeWindow');
            if(win.style.display !== 'flex') {
                openScope(); 
            }
        }
        if(act === 'addNote') { 
            const rect = document.getElementById('synthContainer').getBoundingClientRect(); 
            const n = { id: 'note-'+Date.now(), x: ((parseInt(document.getElementById('contextMenu').style.left)-rect.left)/rect.width*100)+'%', y: ((parseInt(document.getElementById('contextMenu').style.top)-rect.top)/rect.height*100)+'%', text: 'Note' }; 
            noteData.push(n); document.getElementById('synthContainer').appendChild(createNoteElement(n)); saveState(); 
        }
        else if(act === 'removeNote' && contextTarget) { contextTarget.remove(); saveNotePositions(); saveState(); }
        else if(act === 'styleNote' && contextTarget) { const c = prompt("Text Color:", contextTarget.style.color); if(c) contextTarget.style.color = c; const b = prompt("Bg Color:", contextTarget.style.backgroundColor); if(b) contextTarget.style.backgroundColor = b; saveNotePositions(); saveState(); }
        else if(act === 'removeCable' && contextCable) { removeCable(contextCable.start, contextCable.end); }
        else if(act === 'labelCable' && contextCable) { const l = prompt("Label:", contextCable.label); if(l!==null) { contextCable.label = l; redrawCables(); saveState(); } }
        else if(act === 'setValue' && contextTarget) { const v = prompt("Value (-150 to 150):", 0); if(v!==null && !isNaN(v)) { updateKnobAngle(contextTarget, parseFloat(v)); contextTarget.classList.add('is-touched'); saveState(); } }
        else if(act === 'reset' && contextTarget) { 
            if(contextTarget.classList.contains('jack')) { 
                cableData.filter(c => c.start===contextTarget.id || c.end===contextTarget.id).forEach(c => removeCable(c.start, c.end)); 
            } else { 
                if(contextTarget.dataset.type.startsWith('knob')) resetKnob(contextTarget); 
                else if(contextTarget.dataset.type.startsWith('switch')) resetSwitch(contextTarget); 
                else { 
                    contextTarget.setAttribute('data-state', 0); 
                    contextTarget.classList.remove('is-touched'); 
                    componentStates[contextTarget.id] = { type: contextTarget.dataset.type || 'button', value: 0, isTouched: false }; 
                    saveState(); 
                } 
            } 
        }else if (act === 'changeCard') {
            openCardSelector();
        }        
        if (act === 'removePedal' && contextPedalId) {
            activePedalChain = activePedalChain.filter(p => p !== contextPedalId);
            saveState();
            renderPedalboard(); 
            connectPedalChain(); 
        }
        else if (act === 'addPedal') {
            const allTypes = Object.keys(PEDAL_DEFINITIONS);
            const available = allTypes.filter(t => !activePedalChain.includes(t));
            if (available.length === 0) { alert("Board Full!"); return; }

            let msg = "Type name to add:\n"; available.forEach(t => msg += `- ${t}\n`);
            const choice = prompt(msg);
            
            if (choice && PEDAL_DEFINITIONS[choice.toLowerCase()] && !activePedalChain.includes(choice.toLowerCase())) {
                activePedalChain.push(choice.toLowerCase());
                saveState();
                renderPedalboard(); 
                connectPedalChain();
            }
        }else if(act === 'setRange' && contextTarget) {
            initRangeEditMode(contextTarget);
        }
    });

    document.getElementById('audioToggle').addEventListener('click', toggleAudio);
    
    document.getElementById('themeToggle').addEventListener('click', () => { 
        document.body.classList.toggle('dark-mode'); 
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('mtm_theme', isDark ? 'dark' : 'light'); 
        const panelImg = document.querySelector('.panel-art-img');
        if(panelImg) panelImg.src = isDark ? 'images/panel_image_dark.svg' : 'images/panel_image.svg';
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
    
    document.getElementById('randomPatchButton').addEventListener('click', generateRandomPatch);
    
    document.getElementById('clearButton').addEventListener('click', () => { 
        if(confirm("Clear Patch? This will reset cables, knobs, notes, and pedal order.")) { 
            cableData = []; 
            noteData = []; 
            componentStates = {}; 
            activePedalChain = ['reverb', 'delay', 'chorus', 'phaser', 'dist'];
            const nameInput = document.getElementById('patchNameInput');
            const notesArea = document.getElementById('globalNotesArea');
            if(nameInput) nameInput.value = "";
            if(notesArea) notesArea.value = "";
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
            showMessage("Patch Cleared", "warning");
        } 
    });

    const micBtn = document.getElementById('micToggle');
    const midiBtn = document.getElementById('midiToggle');

    micBtn.addEventListener('click', async () => {
        const micToggleBtn = document.getElementById('micToggle');
        micEnabled = !micEnabled;
        if(micEnabled) {
            micToggleBtn.classList.add('mic-is-active');
            await initMic(); 
        } else {
            micToggleBtn.classList.remove('mic-is-active');
            if (audioNodes['Mic_Stream']) {
                audioNodes['Mic_Stream'].getTracks().forEach(track => track.stop());
                delete audioNodes['Mic_Stream'];
                delete audioNodes['Mic_Splitter']; 
            }
        }
        updateAudioGraph(); 
    });
    
    midiBtn.addEventListener('click', () => {
        const vk = document.getElementById('virtualKeyboard');
        if (midiEnabled) {
            midiEnabled = false;
            midiBtn.classList.remove('midi-is-active');
            midiBtn.classList.remove('btn-active-blue');
            vk.classList.remove('is-visible'); 
            showMessage("MIDI Input Disabled", "warning");
        } else {
            midiEnabled = true;
            midiBtn.classList.add('midi-is-active');
            vk.classList.add('is-visible');
            initMidi(); 
            showMessage("MIDI Enabled (Virtual + External)", "success");
        }
        updateAudioGraph(); 
    });

    container.addEventListener('mousedown', startChassisDrag);
    container.addEventListener('touchstart', startChassisDrag, { passive: false });
    container.addEventListener('contextmenu', showContextMenu);
    document.addEventListener('mousedown', handleGlobalMouseDown);

    pedalBtn.addEventListener('click', () => {
        const isOpen = board.classList.contains('open');
        if (isOpen) {
            board.classList.remove('open');
            pedalBtn.classList.remove('btn-active-green');
            board.style.height = '0px';
            board.style.marginBottom = '-1rem'; 
            updatePedalCables(); 
        } else {
            board.classList.add('open');
            pedalBtn.classList.add('btn-active-green');
            updateInterfaceScaling(); 
            setTimeout(() => { 
                board.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); 
            }, 300);
            setTimeout(updatePedalCables, 350);
        }
    });

    window.addEventListener('resize', () => {
        if(board.classList.contains('open')) updatePedalCables();
        updateInterfaceScaling();
        setTimeout(redrawCables, 100);
    });
    
    window.addEventListener('scroll', () => {
        if(board.classList.contains('open')) updatePedalCables();
    });

    document.getElementById('savePresetButton').addEventListener('click', () => { 
        const n = document.getElementById('patchNameInput').value.trim(); 
        if(!n) return showMessage("Please enter a patch name.", "warning"); 
        const p = JSON.parse(localStorage.getItem('mtm_patches')||'{}'); 
        p[n] = getCurrentPatchState(); 
        localStorage.setItem('mtm_patches', JSON.stringify(p)); 
        refreshPresetsDropdown(n);
        showMessage(`Preset "${n}" Saved!`, "success");
    });

    document.getElementById('deletePresetButton').addEventListener('click', () => { 
        const n = document.getElementById('presetsDropdown').value; 
        if(n && confirm(`Delete preset "${n}"?`)) { 
            const p = JSON.parse(localStorage.getItem('mtm_patches')||'{}'); 
            delete p[n]; 
            localStorage.setItem('mtm_patches', JSON.stringify(p)); 
            refreshPresetsDropdown(""); 
            showMessage("Preset Deleted.", "success");
        } 
    });

    const fsBtn = document.getElementById('fullscreenToggle');
    fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fsBtn.classList.add('btn-active-green');
            if (screen.orientation && screen.orientation.lock) {
                try { screen.orientation.lock('landscape'); } catch(e){}
            }
        } else {
            fsBtn.classList.remove('btn-active-green');
        }
    });

    document.getElementById('presetsDropdown').addEventListener('change', (e) => { 
        const val = e.target.value;
        document.getElementById('deletePresetButton').disabled = !val;
        if(val) { 
            const p = JSON.parse(localStorage.getItem('mtm_patches')||'{}');
            if(p[val]) { 
                resetHistory(p[val]); 
                showMessage(`Loaded "${val}"`, "success"); 
            }
        } 
    });

    const perfBtn = document.getElementById('perfToggle');
    perfBtn.addEventListener('click', () => {
        isPerformanceMode = !isPerformanceMode;
        if (isPerformanceMode) {
            document.body.classList.add('performance-mode');
            perfBtn.classList.add('perf-locked');
            perfBtn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> <span class="hidden sm:inline">Perf</span>';
            perfBtn.title = "Performance Mode";
            showMessage("Performance Mode: Cables Locked", "warning");
            if (screen.orientation && screen.orientation.lock) {
                try { 
                    screen.orientation.lock('landscape').catch(err => {});
                } catch(e){}
            }
        } else {
            document.body.classList.remove('performance-mode');
            perfBtn.classList.remove('perf-locked');
            perfBtn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> <span class="hidden sm:inline">Edit</span>';
            perfBtn.title = "Editing Enabled";
            showMessage("Edit Mode: Cables Unlocked", "success");
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        }
    });

    document.getElementById('loadPatchButton').addEventListener('click', () => document.getElementById('loadPatchInput').click());
    document.getElementById('loadPatchInput').addEventListener('change', loadPatchFromFile);
    
    // TAPE INIT FIX
    if (typeof TAPE !== 'undefined' && !TAPE.gains) {
        TAPE.gains = [1.0, 1.0, 1.0, 1.0];
        console.log("Fixed: TAPE.gains initialized");
    }
};