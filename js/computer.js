// =========================================================================
// 3. CARD REGISTRY & STATE MANAGEMENT
// =========================================================================

// NOTE: 'AVAILABLE_CARDS' is now populated automatically in globals.js 
// by the individual card files as they load.

function swapComputerCard(typeIdOrName) {
    // 0. Safety Check for Empty Library
    if (!window.AVAILABLE_CARDS || window.AVAILABLE_CARDS.length === 0) {
        console.warn("Card Library is empty. Cannot swap.");
        // Ensure UI reflects "No Card" if we somehow got here
        const labelEl = document.getElementById('activeCardLabel');
        if (labelEl) labelEl.textContent = "No Card";
        return;
    }

    // 1. Resolve Definition
    let cardDef = AVAILABLE_CARDS.find(c => c.id === typeIdOrName || c.name === typeIdOrName);

    // Fallback logic
    if (!cardDef) {
        if (typeIdOrName === 'none') cardDef = AVAILABLE_CARDS.find(c => c.id === 'none');
        // Default to the first available real card if requested one is missing
        else cardDef = AVAILABLE_CARDS.find(c => c.id === 'reverb') || AVAILABLE_CARDS[0];
    }

    // Double check we actually found something (edge case: library only has 1 broken item)
    if (!cardDef) return;

    // 2. Unmount Old
    if (activeComputerCard) {
        if (activeComputerCard.unmount) activeComputerCard.unmount();
        activeComputerCard = null;
    }

    // 3. Mount New
    // FIX: Added 'typeof cardDef.class === "function"' to prevent trying to instantiate strings/objects
    if (cardDef && typeof cardDef.class === 'function' && audioCtx && audioNodes['Computer_IO']) {
        try {
            activeComputerCard = new cardDef.class(audioCtx, audioNodes['Computer_IO']);
            activeComputerCard.mount();
        } catch (err) {
            console.error(`Failed to mount card ${cardDef.name}:`, err);
            // Fallback to dummy if instantiation crashes
            activeComputerCard = {
                name: cardDef.name,
                fake: true,
                update: () => { }
            };
        }
    } else {
        // Dummy placeholder if loading fails or it's a "virtual" card with no audio class yet
        activeComputerCard = {
            name: cardDef ? cardDef.name : "Error",
            fake: true,
            update: () => { }
        };
    }

    // 4. Update Visuals
    const labelEl = document.getElementById('activeCardLabel');
    const digitEl = document.getElementById('activeCardDigits');
    const tooltipEl = document.getElementById('activeCardTooltip');
    const cardEl = document.querySelector('.program-card');

    if (labelEl) labelEl.textContent = cardDef.name;
    if (digitEl) digitEl.textContent = cardDef.num;
    if (tooltipEl) tooltipEl.textContent = cardDef.desc;

    if (cardEl) cardEl.style.opacity = '1';

    // Flash Effect
    if (labelEl && cardDef.id !== 'none') {
        labelEl.style.opacity = 0;
        if (digitEl) digitEl.style.opacity = 0;
        setTimeout(() => {
            labelEl.style.opacity = 1;
            if (digitEl) digitEl.style.opacity = 0.9;
        }, 50);
    }

    // Check historyIndex to ensure we are initialized before saving state
    if (typeof historyIndex !== 'undefined' && historyIndex >= 0) saveState();
}

function cycleNextCard() {
    if (!window.AVAILABLE_CARDS || window.AVAILABLE_CARDS.length === 0) return;

    const labelEl = document.getElementById('activeCardLabel');
    const currentName = labelEl ? labelEl.textContent : 'No Card';

    let currentIdx = AVAILABLE_CARDS.findIndex(c => c.name === currentName);

    // If current card isn't found (or is "No Card"), start from -1 so next is 0
    if (currentIdx === -1) currentIdx = AVAILABLE_CARDS.length - 1;

    const nextIdx = (currentIdx + 1) % AVAILABLE_CARDS.length;
    swapComputerCard(AVAILABLE_CARDS[nextIdx].id);
}

// =========================================================================
// 4. UI: CARD SELECTOR
// =========================================================================

let showOnlyImplemented = true; // Default to showing only working cards

function initCardSelector() {
    if (document.getElementById('cardSelectorModal')) return;

    const modal = document.createElement('div');
    modal.id = 'cardSelectorModal';
    modal.innerHTML = `
        <div class="card-modal-content">
            <div class="card-modal-header">
                <span class="card-modal-title">PROGRAM LIBRARY</span>
                
                <div class="card-modal-controls">
                     <label class="toggle-label">
                        <input type="checkbox" id="cardFilterToggle" ${showOnlyImplemented ? 'checked' : ''}>
                        <span class="toggle-text">Virtual Cards Only</span>
                    </label>
                    <button class="card-modal-close" id="closeCardModal">&times;</button>
                </div>
            </div>
            <div id="cardGrid" class="card-grid"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close Button
    const closeBtn = document.getElementById('closeCardModal');
    closeBtn.addEventListener('click', closeCardSelector);
    closeBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        closeCardSelector();
    });

    // Toggle Checkbox
    document.getElementById('cardFilterToggle').addEventListener('change', (e) => {
        showOnlyImplemented = e.target.checked;
        renderCardGrid();
    });

    // Backdrop Click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeCardSelector();
    });
}

function closeCardSelector() {
    const modal = document.getElementById('cardSelectorModal');
    if (modal) modal.classList.remove('open');
}

function renderCardGrid() {
    const grid = document.getElementById('cardGrid');
    grid.innerHTML = '';

    if (!window.AVAILABLE_CARDS || window.AVAILABLE_CARDS.length === 0) {
        grid.innerHTML = '<div style="color:#aaa; padding:20px; text-align:center;">Library is empty.</div>';
        return;
    }

    let currentId = 'none';
    if (activeComputerCard) {
        const found = AVAILABLE_CARDS.find(c => c.name === activeComputerCard.name);
        if (found) currentId = found.id;
    }

    // Filter Logic
    const cardsToShow = AVAILABLE_CARDS.filter(card => {
        if (card.id === 'none') return true; // Always show "No Card"
        if (showOnlyImplemented) return card.hasImplementation;
        return true;
    });

    if (cardsToShow.length === 0) {
        grid.innerHTML = '<div style="color:#aaa; padding:20px;">No web-audio cards available yet. Uncheck "Virtual Cards Only" to see full library.</div>';
        return;
    }

    cardsToShow.forEach(card => {
        const el = document.createElement('div');
        el.className = 'mini-card';
        if (card.id === currentId) el.classList.add('active-card');

        // Visual distinction for Dummy cards
        if (!card.hasImplementation && card.id !== 'none') {
            el.classList.add('dummy-card');
        }

        el.innerHTML = `
            <div class="mc-header">
                <span class="mc-num">${card.num}</span>
                ${card.hasImplementation ? '<span class="mc-badge">AUDIO</span>' : ''}
            </div>
            <div>
                <div class="mc-label">${card.name}</div>
                <div class="mc-desc">${card.desc ? card.desc.split('\n')[0] : ''}</div> 
            </div>
        `;

        // Handle both Click and Touch for selection
        const selectAction = (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectCardFromMenu(card.id);
        };

        el.addEventListener('click', selectAction);
        el.addEventListener('touchend', selectAction);

        grid.appendChild(el);
    });
}

function openCardSelector() {
    initCardSelector();
    renderCardGrid();
    document.getElementById('cardSelectorModal').classList.add('open');
}

function selectCardFromMenu(cardId) {
    const slot = document.querySelector('.card-slot-container');
    closeCardSelector();

    if (slot) {
        slot.classList.add('insert');
        setTimeout(() => {
            swapComputerCard(cardId);
            slot.classList.remove('insert');
            slot.classList.add('eject');

            const cardEl = slot.querySelector('.program-card');
            if (cardEl) cardEl.style.opacity = '1';

            setTimeout(() => slot.classList.remove('eject'), 150);
        }, 150);
    } else {
        swapComputerCard(cardId);
    }
}

// =========================================================================
// 5. UI: SLOT RENDERING
// =========================================================================

function renderCardSlot() {
    const container = document.getElementById('synthContainer');
    const old = document.getElementById('computerCardSlot');
    if (old) old.remove();

    const slot = document.createElement('div');
    slot.className = 'card-slot-container';
    slot.id = 'computerCardSlot';
    slot.title = "Left-Click: Cycle | Right-Click: Select Menu";

    const tooltip = document.createElement('div');
    tooltip.className = 'card-tooltip';
    tooltip.id = 'activeCardTooltip';

    const card = document.createElement('div');
    card.className = 'program-card';
    card.style.pointerEvents = 'none';

    // Initial State
    let labelText = "No Card";
    let numText = "--";
    let targetId = 'none';

    if (activeComputerCard) {
        // Try to find the active card in the library
        const found = (window.AVAILABLE_CARDS || []).find(c => c.name === activeComputerCard.name);
        if (found) targetId = found.id;
    } else if (typeof history !== 'undefined' && history[historyIndex] && history[historyIndex].activeCardId) {
        targetId = history[historyIndex].activeCardId;
    }

    const def = (window.AVAILABLE_CARDS || []).find(c => c.id === targetId);
    if (def) {
        labelText = def.name;
        numText = def.num;
    }

    // Build DOM
    const label = document.createElement('div');
    label.className = 'card-label';
    label.id = 'activeCardLabel';
    label.textContent = labelText;

    const logo = document.createElement('div');
    logo.className = 'card-decoration';
    logo.innerHTML = "Music<br>Thing<br>Modular";

    const digits = document.createElement('div');
    digits.className = 'card-digits';
    digits.id = 'activeCardDigits';
    digits.textContent = numText;

    card.appendChild(label);
    card.appendChild(logo);
    card.appendChild(digits);
    slot.appendChild(card);
    card.style.opacity = '1';

    let descText = "";
    if (def) descText = def.desc;
    tooltip.textContent = descText;
    slot.appendChild(tooltip);

    // Add a dedicated Menu/Library button for easier mobile access
    const libBtn = document.createElement('div');
    libBtn.className = 'card-lib-btn';
    libBtn.textContent = 'LIBRARY';
    slot.appendChild(libBtn);
    libBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openCardSelector();
    });
    libBtn.addEventListener('touchstart', (e) => {
        // Stop propagation so it doesn't trigger the slot's touchstart cycle logic
        e.stopPropagation();
        openCardSelector();
    }, { passive: false });

    // --- INTERACTION LOGIC ---

    const handleSwap = (e) => {
        // Prevent default browser zooming/scrolling if on touch
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();

        // On Mouse, only allow Left Click (button 0).
        if (e.type === 'mousedown' && e.button !== 0) return;

        slot.classList.add('insert');
        setTimeout(() => {
            cycleNextCard();
            slot.classList.remove('insert');
            slot.classList.add('eject');

            const cardEl = slot.querySelector('.program-card');
            if (cardEl) cardEl.style.opacity = '1';

            setTimeout(() => slot.classList.remove('eject'), 150);
        }, 150);
    };

    // Add listeners for both Mouse and Touch
    slot.addEventListener('mousedown', (e) => {
        if (e.button === 0) handleSwap(e);
    });

    // Touch Handling (Tap vs Long Press)
    let touchTimer = null;
    let longPressOccurred = false;

    slot.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        longPressOccurred = false;
        touchTimer = setTimeout(() => {
            longPressOccurred = true;
            openCardSelector();
        }, 500); // 500ms for long press
    }, { passive: true });

    slot.addEventListener('touchend', (e) => {
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
        if (!longPressOccurred) {
            handleSwap(e);
        }
        longPressOccurred = false;
    });

    slot.addEventListener('touchmove', (e) => {
        // If finger moves significantly, cancel the potential long press
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
    }, { passive: true });

    // Right Click (Still supported for desktop)
    slot.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCardSelector();
    });

    container.appendChild(slot);
    if (typeof updateInterfaceScaling === 'function') updateInterfaceScaling();
}