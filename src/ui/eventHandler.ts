// Event handling functions for the Terpstra Keyboard WebApp
import { hexCoordsToCents, getHexCoordsAt } from '../grid/hexUtils';
import { Point, applyMatrixToPoint } from '../core/geometry';
import { centsToColor, drawHex } from '../grid/displayUtils';
import { ActiveHex, initActiveHex, addActiveNote, removeActiveNote, activateNote, deactivateNote, isNoteActive, releaseAllNotes } from '../audio/activeHex';
import { getMidiFromCoords } from '../audio/audioHandler';

// Extend ActiveHex type to include touchId
interface TouchActiveHex extends ActiveHex {
  touchId?: number;
}

/**
 * Runtime state for the keyboard.
 * This interface defines all transient state that changes during keyboard operation.
 * Separating this from settings helps prevent state/configuration confusion.
 * 
 * @property activeHexObjects - Currently sounding notes
 * @property pressedKeys - Currently pressed keyboard keys
 * @property sustainedNotes - Notes held by sustain pedal
 * @property isMouseDown - Mouse button state
 * @property isTouchDown - Touch state
 * @property isSustainOn - Sustain pedal state
 */
interface KeyboardState {
  activeHexObjects: TouchActiveHex[];
  pressedKeys: number[];
  sustainedNotes: TouchActiveHex[];
  isMouseDown: boolean;
  isTouchDown: boolean;
  isSustainOn: boolean;
}

/**
 * Configuration settings for the keyboard.
 * Contains only non-transient settings that define keyboard behavior.
 * These settings should not change during normal operation.
 * 
 * @property canvas - The rendering canvas
 * @property keyCodeToCoords - Mapping of keyboard keys to grid coordinates
 * @property rSteps - Right-facing steps in the grid
 * @property urSteps - Up-right facing steps in the grid
 * @property fundamental - Base frequency for note calculation
 * @property octaveOffset - Octave shift from middle C
 * @property toggle_mode - Whether notes stay on when key is released
 */
interface Settings {
  canvas: HTMLCanvasElement;
  keyCodeToCoords: { [key: number]: Point };
  rSteps: number;
  urSteps: number;
  fundamental: number;
  octaveOffset: number;
  toggle_mode: boolean;
  [key: string]: any; // For any additional settings
}

let settings: Settings | undefined;
let state: KeyboardState = {
  activeHexObjects: [],
  pressedKeys: [],
  sustainedNotes: [],
  isMouseDown: false,
  isTouchDown: false,
  isSustainOn: false
};
let is_key_event_added: number | undefined;

/**
 * Initializes all event handlers for the keyboard application.
 * This is the main entry point for setting up user interaction.
 * @param appSettings - The application settings object containing canvas and audio configuration
 */
export function initEventHandlers(appSettings: Settings): void {
  settings = appSettings;
  
  // Get MIDI output if MIDI is enabled and an output is selected
  let midiOutput: WebMidiOutput | null = null;
  const instrumentSelect = document.getElementById("instrument") as HTMLSelectElement;
  if (instrumentSelect && instrumentSelect.querySelector(':checked')?.parentElement instanceof HTMLOptGroupElement) {
    const parentElement = instrumentSelect.querySelector(':checked')?.parentElement as HTMLOptGroupElement;
    if (parentElement.label === 'MIDI out') {
      const selectedOption = instrumentSelect.querySelector(':checked');
      if (selectedOption?.textContent) {
        midiOutput = window.WebMidi.getOutputByName(selectedOption.textContent);
      }
    }
  }

  initActiveHex(appSettings, midiOutput);
  setupKeyboardEvents();
  setupTouchEvents();
  setupMouseEvents();
  setupShakeEvents();
}

/**
 * Removes all event handlers and cleans up the application state.
 * Should be called when dismounting the keyboard component.
 */
export function removeEventHandlers(): void {
  if (!settings || !settings.canvas) return;
  
  // Remove keyboard event listeners
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  
  // Remove mouse event listeners
  settings.canvas.removeEventListener("mousedown", mouseDown);
  settings.canvas.removeEventListener("mouseup", mouseUp);
  settings.canvas.removeEventListener("mousemove", mouseActive);
  
  // Remove touch event listeners
  settings.canvas.removeEventListener("touchstart", handleTouch);
  settings.canvas.removeEventListener("touchend", handleTouch);
  settings.canvas.removeEventListener("touchmove", handleTouch);
  
  // Reset flags
  state.isMouseDown = false;
  state.isTouchDown = false;
  is_key_event_added = undefined;
}

/**
 * Sets up keyboard event handlers and initializes the keyboard mapping.
 * The keyboard layout follows the Terpstra design, with three rows of keys
 * mapped to specific hex coordinates on the grid.
 */
function setupKeyboardEvents(): void {
  if (typeof(is_key_event_added) === 'undefined') {
    is_key_event_added = 1;
    if (!settings) {
      settings = {} as Settings;
    }
    settings.pressedKeys = [];
    settings.keyCodeToCoords = {
      49: new Point(-5, -2), // 1
      50: new Point(-4, -2), // 2
      51: new Point(-3, -2), // 3
      52: new Point(-2, -2), // 4
      53: new Point(-1, -2), // 5
      54: new Point(0, -2),  // 6
      55: new Point(1, -2),  // 7
      56: new Point(2, -2),  // 8
      57: new Point(3, -2),  // 9
      48: new Point(4, -2),  // 0
      189: new Point(5, -2), // -
      187: new Point(6, -2), // =

      81: new Point(-5, -1), // Q
      87: new Point(-4, -1), // W
      69: new Point(-3, -1), // E
      82: new Point(-2, -1), // R
      84: new Point(-1, -1), // T
      89: new Point(0, -1),  // Y
      85: new Point(1, -1),  // U
      73: new Point(2, -1),  // I
      79: new Point(3, -1),  // O
      80: new Point(4, -1),  // P
      219: new Point(5, -1), // [
      221: new Point(6, -1), // ]

      65: new Point(-5, 0),  // A
      83: new Point(-4, 0),  // S
      68: new Point(-3, 0),  // D
      70: new Point(-2, 0),  // F
      71: new Point(-1, 0),  // G
      72: new Point(0, 0),   // H
      74: new Point(1, 0),   // J
      75: new Point(2, 0),   // K
      76: new Point(3, 0),   // L
      186: new Point(4, 0),  // ;
      222: new Point(5, 0),  // '

      90: new Point(-5, 1),  // Z
      88: new Point(-4, 1),  // X
      67: new Point(-3, 1),  // C
      86: new Point(-2, 1),  // V
      66: new Point(-1, 1),  // B
      78: new Point(0, 1),   // N
      77: new Point(1, 1),   // M
      188: new Point(2, 1),  // ,
      190: new Point(3, 1),  // .
      191: new Point(4, 1),  // /
    };
    window.addEventListener("keydown", onKeyDown, false);
    window.addEventListener("keyup", onKeyUp, false);
  }
}

/**
 * Converts hex grid coordinates to screen coordinates.
 * Takes into account:
 * - Canvas position and dimensions
 * - Grid rotation
 * - Hex geometry (width, height, vertical spacing)
 * - DPI scaling (handled by canvas transform)
 * 
 * @param hexCoords - The hex grid coordinates to convert
 * @returns Screen coordinates relative to the canvas
 */
function hexCoordsToScreen(hexCoords: Point): Point {
  if (!settings?.canvas) {
    console.warn('Canvas not initialized');
    return new Point(0, 0);
  }
  
  // Convert hex coordinates to screen coordinates
  const screenPoint = settings.canvas.getBoundingClientRect();
  const centerX = screenPoint.width / 2;
  const centerY = screenPoint.height / 2;
  
  if (!settings.hexSize || !settings.rotationMatrix) {
    console.warn('Settings not fully initialized');
    return new Point(centerX, centerY);
  }

  // Calculate the actual position using hex grid geometry
  const x = hexCoords.x * settings.hexWidth * 3/4;
  const y = hexCoords.y * settings.hexVert;
  
  // Apply rotation and translation
  const rotated = applyMatrixToPoint(settings.rotationMatrix, new Point(x, y));
  return new Point(
    rotated.x + centerX,
    rotated.y + centerY
  );
}

/**
 * Handles keyboard key press events.
 * In non-toggle mode:
 * - Activates notes directly using hex coordinates
 * - Manages the pressedKeys array to track active keys
 * - Handles sustain pedal (spacebar)
 * 
 * @param e - The keyboard event
 */
function onKeyDown(e: KeyboardEvent): void {
  if (!settings) return;
  
  if (e.keyCode === 32) { // Spacebar
    state.isSustainOn = true;
  } else if (!state.isMouseDown && !state.isTouchDown
      && (e.keyCode in settings.keyCodeToCoords)
      && state.pressedKeys.indexOf(e.keyCode) === -1) {
    
    const hexCoords = settings.keyCodeToCoords[e.keyCode];
    const note = getMidiFromCoords(hexCoords, settings.rSteps, settings.urSteps, settings.octaveOffset);

    if (settings.toggle_mode) {
      // In toggle mode, just toggle the note
      handleNote(hexCoords, !isNoteActive(note));
    } else {
      // In normal mode, activate the note
      state.pressedKeys.push(e.keyCode);
      handleNote(hexCoords, true);
    }
  }
}

/**
 * Handles keyboard key release events.
 * In non-toggle mode:
 * - Deactivates notes directly
 * - Cleans up pressedKeys array
 * - Handles sustain pedal release
 * 
 * @param e - The keyboard event
 */
function onKeyUp(e: KeyboardEvent): void {
  if (!settings) return;
  
  if (e.keyCode === 32) { // Spacebar
    state.isSustainOn = false;
    if (state.sustainedNotes.length > 0) {
      for (const note of state.sustainedNotes) {
        note.noteOff();
        removeActiveNote(note);
      }
      state.sustainedNotes = [];
    }
  } else if (!state.isMouseDown && !state.isTouchDown
      && (e.keyCode in settings.keyCodeToCoords)
      && !settings.toggle_mode) { // Only handle key up in non-toggle mode
    
    const keyIndex = state.pressedKeys.indexOf(e.keyCode);
    if (keyIndex !== -1) {
      state.pressedKeys.splice(keyIndex, 1);
      const hexCoords = settings.keyCodeToCoords[e.keyCode];
      
      if (state.isSustainOn) {
        // Move the note to sustained notes instead of releasing it
        const hex = state.activeHexObjects.find(h => hexCoords.equals(h.coords));
        if (hex) {
          state.sustainedNotes.push(hex);
        }
      } else {
        // Normal note release
        handleNote(hexCoords, false);
      }
    }
  }
}

/**
 * Interface for note activation/deactivation actions.
 * Used to standardize note interaction across different input methods.
 * 
 * @property coords - The grid coordinates where the action occurs
 * @property isActive - The desired state of the note (true = on, false = off)
 */
interface NoteAction {
  coords: Point;
  isActive: boolean;
}

/**
 * Centralized function for activating/deactivating notes.
 * This is the core function for all note interactions in the keyboard.
 * 
 * Features:
 * - Handles both MIDI and audio output
 * - Manages visual feedback (hex colors)
 * - Tracks note state
 * - Supports touch input with individual touch tracking
 * - Works in both toggle and non-toggle modes
 * - Maintains sustain functionality
 * 
 * @param coords - The hex grid coordinates of the note
 * @param isActive - Whether to activate (true) or deactivate (false) the note
 * @param touchId - Optional touch identifier for multi-touch support
 * @returns The created or removed ActiveHex object, or null if operation failed
 */
function handleNote(coords: Point, isActive: boolean, touchId?: number): ActiveHex | null {
  if (!settings) return null;

  if (isActive) {
    const hex = new ActiveHex(coords) as TouchActiveHex;
    if (touchId !== undefined) {
      hex.touchId = touchId;
    }
    state.activeHexObjects.push(hex);
    addActiveNote(hex);
    const centsObj = hexCoordsToCents(coords);
    hex.noteOn(centsObj);
    drawHex(coords, centsToColor(centsObj, true));
    return hex;
  } else {
    const hexIndex = state.activeHexObjects.findIndex((h: TouchActiveHex) => 
      coords.equals(h.coords) && (touchId === undefined || h.touchId === touchId)
    );
    if (hexIndex !== -1) {
      const hex = state.activeHexObjects[hexIndex];
      hex.noteOff();
      removeActiveNote(hex);
      state.activeHexObjects.splice(hexIndex, 1);
      const centsObj = hexCoordsToCents(coords);
      drawHex(coords, centsToColor(centsObj, false));
      return hex;
    }
  }
  return null;
}

/**
 * Handles note activation/deactivation from coordinates.
 * This is a wrapper around handleNote that provides backward compatibility
 * and simpler interface for basic note actions.
 * 
 * Used primarily by:
 * - Toggle mode interactions
 * - Initial note activation
 * - External note triggers
 * 
 * @param action - Object containing coordinates and desired note state
 */
function handleNoteAction(action: NoteAction): void {
  if (!settings) return;
  handleNote(action.coords, action.isActive);
}

/**
 * Handles mouse button press events.
 * Behavior differs between toggle and non-toggle mode:
 * - Toggle mode: Toggles notes on/off
 * - Non-toggle mode: Activates notes and enables mousemove tracking
 */
const mouseDown = (e: MouseEvent) => {
  if (!settings || state.pressedKeys.length !== 0 || state.isTouchDown) return;
  
  state.isMouseDown = true;
  const screenCoords = getUnifiedPointerPosition(e);
  const hexCoords = getHexCoordsAt(screenCoords);
  
  if (settings.toggle_mode) {
    // In toggle mode, just toggle the note
    const note = getMidiFromCoords(hexCoords, settings.rSteps, settings.urSteps, settings.octaveOffset);
    handleNote(hexCoords, !isNoteActive(note));
  } else {
    // In normal mode, activate the note
    handleNote(hexCoords, true);
    settings.canvas.addEventListener("mousemove", mouseActive, false);
  }
};

/**
 * Handles mouse button release events.
 * In non-toggle mode:
 * - Deactivates all active notes
 * - Removes mousemove tracking
 * - Cleans up activeHexObjects
 */
const mouseUp = (_e: MouseEvent) => {
  if (!settings) return;
  
  state.isMouseDown = false;
  if (state.pressedKeys.length !== 0 || state.isTouchDown || settings.toggle_mode) {
    return;
  }
  
  settings.canvas.removeEventListener("mousemove", mouseActive);
  if (state.activeHexObjects && state.activeHexObjects.length > 0) {
    for (const hex of state.activeHexObjects) {
      hex.noteOff();
      removeActiveNote(hex);
      const coords = hex.coords;
      drawHex(coords, centsToColor(hexCoordsToCents(coords), false));
    }
    state.activeHexObjects = [];
  }
};

/**
 * Sets up mouse event listeners on the canvas.
 * Initializes mouse state and attaches event handlers.
 */
function setupMouseEvents(): void {
  if (!settings) return;
  
  state.isMouseDown = false;
  settings.canvas.addEventListener("mousedown", mouseDown, false);
  settings.canvas.addEventListener("mouseup", mouseUp, false);
}

/**
 * Handles mouse movement for glissando behavior.
 * In non-toggle mode:
 * - Tracks mouse movement across hexes
 * - Deactivates old notes and activates new ones
 * - Provides smooth note transitions
 * 
 * @param e - The mouse event
 */
function mouseActive(e: MouseEvent): void {
  if (!settings || settings.toggle_mode) return;
  
  const screenCoords = getUnifiedPointerPosition(e);
  const hexCoords = getHexCoordsAt(screenCoords);
  
  if (!state.activeHexObjects?.length) {
    handleNote(hexCoords, true);
  } else {
    // Always deactivate the previous note in non-toggle mode for glissando behavior
    const oldHex = state.activeHexObjects[0];
    if (!hexCoords.equals(oldHex.coords)) {
      handleNote(oldHex.coords, false);
      handleNote(hexCoords, true);
    }
  }
}

/**
 * Provides a unified way to get pointer coordinates from both mouse and touch events.
 * Takes into account:
 * - Canvas position
 * - DPI scaling (handled by canvas transform)
 * 
 * @param e - Either a mouse event or touch object
 * @returns Point coordinates relative to the canvas
 */
function getUnifiedPointerPosition(e: MouseEvent | Touch): Point {
  const canvas = settings?.canvas;
  if (!canvas) {
    console.warn('Canvas not initialized');
    return new Point(0, 0);
  }
  
  const rect = canvas.getBoundingClientRect();
  
  // Don't multiply by DPI here - the canvas context transform already handles the scaling
  return new Point(
    e.clientX - rect.left,
    e.clientY - rect.top
  );
}

/**
 * Sets up touch event listeners on the canvas.
 * Initializes touch state and attaches event handlers.
 */
function setupTouchEvents(): void {
  if (!settings) return;
  
  state.isTouchDown = false;
  settings.canvas.addEventListener("touchstart", handleTouch, false);
  settings.canvas.addEventListener("touchend", handleTouch, false);
  settings.canvas.addEventListener("touchmove", handleTouch, false);
}

/**
 * Handles all touch events (start, move, end).
 * Supports both toggle and non-toggle modes:
 * - Toggle mode: Simple note toggling
 * - Non-toggle mode: Multi-touch support with individual note tracking
 * 
 * Features:
 * - Multi-touch support
 * - Touch point tracking
 * - Glissando behavior
 * - Independent note control per touch
 * 
 * @param e - The touch event
 */
function handleTouch(e: TouchEvent): void {
  if (!settings) return;
  
  e.preventDefault();
  if (state.pressedKeys.length !== 0 || state.isMouseDown) {
    state.isTouchDown = false;
    return;
  }

  if (settings.toggle_mode) {
    if (e.type === 'touchstart') {
      const screenCoords = getUnifiedPointerPosition(e.touches[0]);
      const hexCoords = getHexCoordsAt(screenCoords);
      const note = getMidiFromCoords(hexCoords, settings.rSteps, settings.urSteps, settings.octaveOffset);
      handleNote(hexCoords, !isNoteActive(note));
    }
    return;
  }

  // Normal mode
  state.isTouchDown = e.targetTouches.length !== 0;
  
  // Create a map of currently active touches
  const currentTouches = new Map();
  for (let i = 0; i < e.targetTouches.length; i++) {
    const screenCoords = getUnifiedPointerPosition(e.targetTouches[i]);
    const hexCoords = getHexCoordsAt(screenCoords);
    currentTouches.set(e.targetTouches[i].identifier, hexCoords);
  }

  // First, handle existing notes that have moved
  for (let i = state.activeHexObjects.length - 1; i >= 0; i--) {
    const hex = state.activeHexObjects[i] as TouchActiveHex;
    let found = false;

    // Check if this note's touch still exists and if it moved
    for (const [identifier, hexCoords] of currentTouches) {
      if (hex.touchId === identifier) {
        found = true;
        if (!hexCoords.equals(hex.coords)) {
          handleNote(hex.coords, false, hex.touchId);
          handleNote(hexCoords, true, identifier);
        }
        break;
      }
    }

    // If touch no longer exists, remove the note
    if (!found) {
      handleNote(hex.coords, false, hex.touchId);
    }
  }

  // Then add any new touches
  for (let i = 0; i < e.targetTouches.length; i++) {
    const touch = e.targetTouches[i];
    let found = false;
    for (const hex of state.activeHexObjects) {
      if ((hex as TouchActiveHex).touchId === touch.identifier) {
        found = true;
        break;
      }
    }

    if (!found) {
      const screenCoords = getUnifiedPointerPosition(touch);
      const hexCoords = getHexCoordsAt(screenCoords);
      handleNote(hexCoords, true, touch.identifier);
    }
  }
}

/**
 * Releases all active notes and resets the keyboard state.
 * This is a critical function for cleanup and state reset.
 * 
 * Handles:
 * - MIDI note-off messages
 * - Audio note release
 * - Visual state cleanup
 * - State reset for all tracking variables
 * - Sustain release
 * 
 * Used by:
 * - Release All button
 * - Page unload
 * - Error recovery
 * - Mode switching
 */
function handleReleaseAll(): void {
  if (!settings) return;

  // First release all notes (handles MIDI and audio)
  releaseAllNotes();

  // Clean up visual state
  if (state.activeHexObjects.length > 0) {
    for (const hex of state.activeHexObjects) {
      const coords = hex.coords;
      drawHex(coords, centsToColor(hexCoordsToCents(coords), false));
    }
    state.activeHexObjects = [];
  }

  // Reset all state
  state.pressedKeys = [];
  state.sustainedNotes = [];
  state.isMouseDown = false;
  state.isTouchDown = false;
  state.isSustainOn = false;
}

// Initialize release all button handler
document.addEventListener('DOMContentLoaded', () => {
  const releaseAllButton = document.getElementById('release-all');
  if (releaseAllButton) {
    releaseAllButton.addEventListener('click', handleReleaseAll);
  }
});

// This function is referenced but not defined in the original file
// Adding a placeholder implementation
function setupShakeEvents(): void {
  // Implementation needed
}

/**
 * External API for handling hex clicks/touches.
 * Used by external components to trigger notes.
 * Supports both toggle and non-toggle modes.
 * 
 * @param event - The triggering event
 * @param hexCoords - The hex coordinates to activate/deactivate
 */
export function handleHexClick(event: MouseEvent | TouchEvent, hexCoords: { x: number, y: number }): void {
  const settings = (window as any).settings;
  if (!settings) return;

  const note = getMidiFromCoords(hexCoords, settings.rSteps, settings.urSteps, settings.octaveOffset);
  
  if (settings.toggle_mode) {
    // In toggle mode, just toggle the note
    if (isNoteActive(note)) {
      deactivateNote(note);
    } else {
      activateNote(note);
    }
  } else {
    // In normal mode, activate on mouse/touch down
    if (event.type === 'mousedown' || event.type === 'touchstart') {
      activateNote(note);
    } else if (event.type === 'mouseup' || event.type === 'touchend') {
      deactivateNote(note);
    }
  }
} 