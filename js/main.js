// =========================================================================
// MAIN.JS
// Core application loop, initialization, and global input handling.
// =========================================================================

// --- 1. MAIN ANIMATION LOOP ----------------------------------------------

/**
 * The main clock loop running via requestAnimationFrame.
 * Handles audio visualization updates and hardware component logic.
 */
function runClockLoop() {
    // Only run if Audio Context exists and is active
    if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'running') {
        const now = audioCtx.currentTime;

        // A. Update Computer Card Logic
        if (typeof activeComputerCard !== 'undefined' && activeComputerCard) {
            // Helper to normalize knob values (-150 to 150 -> 0 to 1)
            const getNorm = (id) => {
                const s = componentStates[id];
                const val = s ? parseFloat(s.value) : 0;
                return (val + 150) / 300;
            };

            const params = {
                x: getNorm('knob-small-x'),
                y: getNorm('knob-small-y'),
                main: getNorm('knob-large-computer'),
                switch: componentStates['switch-3way-computer']?.value || 0
            };

            activeComputerCard.update(params, now);
        }

        // B. Update Amp Meter
        if (typeof updateAmpMeter === 'function') {
            updateAmpMeter();
        }

        // C. Update Slopes LEDs
        // Forces UI to check LFO state 60fps
        if (typeof updateSlopes === 'function') {
            updateSlopes(
                'Slopes1',
                'knob-medium-slopes1',
                'switch-3way-slopes1shape',
                'switch-3way-slopes1loop',
                'led-slopes1-rise',
                'led-slopes1-fall'
            );
            updateSlopes(
                'Slopes2',
                'knob-medium-slopes2',
                'switch-3way-slopes2shape',
                'switch-3way-slopes2loop',
                'led-slopes2-rise',
                'led-slopes2-fall'
            );
        }
    }

    requestAnimationFrame(runClockLoop);
}

// --- 2. INPUT EVENT HANDLERS ---------------------------------------------

/**
 * Handles Global Undo/Redo shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
 */
function handleUndoRedo(e) {
    // Check for Ctrl (Windows/Linux) or Cmd (Mac)
    const isModifier = e.ctrlKey || e.metaKey;

    if (!isModifier) return;

    if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        // Shift check for Redo
        if (e.shiftKey) {
            redo();
        } else {
            undo();
        }
    } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        // Standard Ctrl+Y Redo
        redo();
    }
}

/**
 * Handles the "Escape" key to close menus, panels, and cancel drag operations.
 */
function handleEscapeSequence(e) {
    if (e.key !== "Escape") return;

    // 1. Close Context Menu
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu) contextMenu.style.display = 'none';

    // 2. Close Card Selector
    if (typeof closeCardSelector === 'function') closeCardSelector();

    // 3. Close Export Menu
    if (typeof hideExportMenu === 'function') hideExportMenu();

    // 4. Close Pedalboard
    const board = document.getElementById('pedalboard');
    if (board && board.classList.contains('open')) {
        const toggleBtn = document.getElementById('pedalToggle');
        if (toggleBtn) toggleBtn.click();
    }

    // 5. Close Recorder
    const rec = document.getElementById('recorderWindow');
    if (rec && rec.style.display !== 'none' && rec.style.display !== '') {
        const recBtn = document.getElementById('recorderToggle');
        if (recBtn) recBtn.click();
    }

    // 6. Close Scope
    const scope = document.getElementById('scopeWindow');
    if (scope && scope.style.display !== 'none' && scope.style.display !== '') {
        if (typeof closeScope === 'function') closeScope();
    }

    // 5. Cancel Cable Drag (if active)
    if (typeof isDraggingCable !== 'undefined' && isDraggingCable) {
        // Reset Global Flag
        isDraggingCable = false;

        // Clean up visual elements
        if (typeof currentDraggedCable !== 'undefined') currentDraggedCable = null;
        if (typeof disableGhostMode === 'function') disableGhostMode();

        document.getElementById('tempCable')?.remove();

        if (typeof currentCableStart !== 'undefined' && currentCableStart) {
            document.getElementById(currentCableStart)?.classList.remove('active');
            currentCableStart = null;
        }

        // Remove listeners attached during drag
        if (typeof dragCable === 'function') {
            document.removeEventListener('mousemove', dragCable);
        }
        if (typeof handleGlobalMouseUp === 'function') {
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        }
    }
}

// --- 3. INITIALIZATION ---------------------------------------------------

window.addEventListener('load', () => {
    // Start the animation loop
    runClockLoop();

    // Initialize Virtual Keyboard if function exists
    if (typeof initVirtualKeyboard === 'function') {
        initVirtualKeyboard();
    }

    // Initialize External Gear UI
    if (typeof initExternalGearUI === 'function') {
        initExternalGearUI();
    }
});

// Attach Global Input Listeners
document.addEventListener('keydown', handleUndoRedo);
document.addEventListener('keydown', handleEscapeSequence);