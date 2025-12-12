// --- computercard.js ---


// =========================================================================
// 3. CARD REGISTRY & STATE MANAGEMENT
// =========================================================================

// NOTE: 'AVAILABLE_CARDS' is now populated automatically in globals.js 
// by the individual card files as they load.

function swapComputerCard(typeIdOrName) {
    // Ensure we have at least a blank card if nothing is loaded
    if (AVAILABLE_CARDS.length === 0) {
        console.warn("No cards registered!");
        return;
    }

    // 1. Resolve Definition
    let cardDef = AVAILABLE_CARDS.find(c => c.id === typeIdOrName || c.name === typeIdOrName);

    // Fallback logic
    if (!cardDef) {
        if (typeIdOrName === 'none') cardDef = AVAILABLE_CARDS.find(c => c.id === 'none');
        // Default to the first available real card if 'reverb' is missing
        else cardDef = AVAILABLE_CARDS.find(c => c.id === 'reverb') || AVAILABLE_CARDS[0];
    }

    // 2. Unmount Old
    if (activeComputerCard) {
        if (activeComputerCard.unmount) activeComputerCard.unmount();
        activeComputerCard = null;
    }

    // 3. Mount New
    if (cardDef && cardDef.class && audioCtx && audioNodes['Computer_IO']) {
        activeComputerCard = new cardDef.class(audioCtx, audioNodes['Computer_IO']);
        activeComputerCard.mount();
    } else {
        // Dummy placeholder if loading fails
        activeComputerCard = {
            name: cardDef ? cardDef.name : "Error",
            fake: true,
            update: () => {}
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
    const labelEl = document.getElementById('activeCardLabel');
    const currentName = labelEl ? labelEl.textContent : 'No Card';

    let currentIdx = AVAILABLE_CARDS.findIndex(c => c.name === currentName);
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

    document.getElementById('closeCardModal').addEventListener('click', closeCardSelector);
    document.getElementById('cardFilterToggle').addEventListener('change', (e) => {
        showOnlyImplemented = e.target.checked;
        renderCardGrid(); // Re-render when toggled
    });

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
        grid.innerHTML = '<div style="color:#aaa; padding:20px;">No web-audio cards available yet. Uncheck "Audio Cards Only" to see library.</div>';
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
                <div class="mc-desc">${card.desc.split('\n')[0]}</div> 
            </div>
        `;

        el.onclick = () => selectCardFromMenu(card.id);
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
            cardEl.style.opacity = '1';
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
        const found = AVAILABLE_CARDS.find(c => c.name === activeComputerCard.name);
        if (found) targetId = found.id;
    } else if (typeof history !== 'undefined' && history[historyIndex] && history[historyIndex].activeCardId) {
        targetId = history[historyIndex].activeCardId;
    }

    const def = AVAILABLE_CARDS.find(c => c.id === targetId);
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

    // Left Click: Cycle
    const handleSwap = (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (e.button !== 0) return;

        slot.classList.add('insert');
        setTimeout(() => {
            cycleNextCard();
            slot.classList.remove('insert');
            slot.classList.add('eject');

            const cardEl = slot.querySelector('.program-card');
            cardEl.style.opacity = '1';

            setTimeout(() => slot.classList.remove('eject'), 150);
        }, 150);
    };

    slot.addEventListener('mousedown', handleSwap);
    slot.addEventListener('touchstart', (e) => {
        e.stopPropagation(); e.preventDefault();
        handleSwap({ button: 0, stopPropagation: () => {}, preventDefault: () => {} });
    });

    // Right Click: Menu
    slot.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCardSelector();
    });

    container.appendChild(slot);
    if (typeof updateInterfaceScaling === 'function') updateInterfaceScaling();
}