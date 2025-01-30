// Event handling functions for the Terpstra Keyboard WebApp
import { hexCoordsToCents, getHexCoordsAt } from '../grid/hexUtils';
import { Point } from '../core/geometry';
import { centsToColor, drawHex } from '../grid/displayUtils';
import { ActiveHex, initActiveHex, addActiveNote, removeActiveNote, activateNote, deactivateNote, isNoteActive } from '../audio/activeHex';
import { getMidiFromCoords } from '../audio/audioHandler';

interface Settings {
  canvas: HTMLCanvasElement;
  sustain: boolean;
  sustainedNotes: ActiveHex[];
  pressedKeys: number[];
  keyCodeToCoords: { [key: number]: Point };
  isMouseDown: boolean;
  isTouchDown: boolean;
  activeHexObjects: ActiveHex[];
  rSteps: number;
  urSteps: number;
  fundamental: number;
  octaveOffset: number;
  toggle_mode: boolean;
  [key: string]: any; // For any additional properties
}

let settings: Settings | undefined;
let is_key_event_added: number | undefined;

export function initEventHandlers(appSettings: Settings): void {
  settings = appSettings;
  initActiveHex(appSettings, null);  // Initialize ActiveHex with settings
  setupKeyboardEvents();
  setupTouchEvents();
  setupMouseEvents();
  setupShakeEvents();
}

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
  settings.isMouseDown = false;
  settings.isTouchDown = false;
  is_key_event_added = undefined;
}

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

function onKeyDown(e: KeyboardEvent): void {
  if (!settings) return;
  
  if (e.keyCode === 32) { // Spacebar
    settings.sustain = true;
  } else if (!settings.isMouseDown && !settings.isTouchDown
      && (e.keyCode in settings.keyCodeToCoords)
      && settings.pressedKeys.indexOf(e.keyCode) === -1) {
    settings.pressedKeys.push(e.keyCode);
    const coords = settings.keyCodeToCoords[e.keyCode];
    const hex = new ActiveHex(coords);
    if (!settings.activeHexObjects) {
      settings.activeHexObjects = [];
    }
    settings.activeHexObjects.push(hex);
    addActiveNote(hex);
    const centsObj = hexCoordsToCents(coords);
    drawHex(coords, centsToColor(centsObj, true));
    hex.noteOn(centsObj);
  }
}

function onKeyUp(e: KeyboardEvent): void {
  if (!settings) return;
  
  if (e.keyCode === 32) { // Spacebar
    settings.sustain = false;
    if (settings.sustainedNotes) {
      for (const note of settings.sustainedNotes) {
        note.noteOff();
        removeActiveNote(note);
      }
      settings.sustainedNotes = [];
    }
  } else if (!settings.isMouseDown && !settings.isTouchDown
      && (e.keyCode in settings.keyCodeToCoords)) {
    const keyIndex = settings.pressedKeys.indexOf(e.keyCode);
    if (keyIndex !== -1) {
      settings.pressedKeys.splice(keyIndex, 1);
      const coords = settings.keyCodeToCoords[e.keyCode];
      const centsObj = hexCoordsToCents(coords);
      drawHex(coords, centsToColor(centsObj, false));
      if (settings.activeHexObjects) {
        const hexIndex = settings.activeHexObjects.findIndex((hex) => 
          coords.equals(hex.coords)
        );
        if (hexIndex !== -1) {
          const hex = settings.activeHexObjects[hexIndex];
          hex.noteOff();
          removeActiveNote(hex);
          settings.activeHexObjects.splice(hexIndex, 1);
        }
      }
    }
  }
}

// Store mousedown and mouseup handlers as named functions so we can remove them
const mouseDown = (e: MouseEvent) => {
  if (!settings || settings.pressedKeys.length !== 0 || settings.isTouchDown) {
    return;
  }
  settings.isMouseDown = true;
  
  // Get the hex coordinates for the click
  const coords = getHexCoordsAt(getPointerPosition(e));
  
  if (settings.toggle_mode) {
    // In toggle mode, just toggle the note on click
    const hex = new ActiveHex(coords);
    const note = getMidiFromCoords(coords, settings.rSteps, settings.urSteps, settings.octaveOffset);
    
    if (isNoteActive(note)) {
      // Note is active, deactivate it
      if (settings.activeHexObjects) {
        const hexIndex = settings.activeHexObjects.findIndex((h) => coords.equals(h.coords));
        if (hexIndex !== -1) {
          const hex = settings.activeHexObjects[hexIndex];
          hex.noteOff();
          removeActiveNote(hex);
          settings.activeHexObjects.splice(hexIndex, 1);
          drawHex(coords, centsToColor(hexCoordsToCents(coords), false));
        }
      }
    } else {
      // Note is not active, activate it
      if (!settings.activeHexObjects) {
        settings.activeHexObjects = [];
      }
      settings.activeHexObjects.push(hex);
      addActiveNote(hex);
      const centsObj = hexCoordsToCents(coords);
      hex.noteOn(centsObj);
      drawHex(coords, centsToColor(centsObj, true));
    }
  } else {
    // In normal mode, use the original behavior
    settings.canvas.addEventListener("mousemove", mouseActive, false);
    mouseActive(e);
  }
};

const mouseUp = (_e: MouseEvent) => {
  if (!settings) return;
  
  settings.isMouseDown = false;
  if (settings.pressedKeys.length !== 0 || settings.isTouchDown || settings.toggle_mode) {
    return;
  }
  
  settings.canvas.removeEventListener("mousemove", mouseActive);
  if (settings.activeHexObjects && settings.activeHexObjects.length > 0) {
    for (const hex of settings.activeHexObjects) {
      hex.noteOff();
      removeActiveNote(hex);
      const coords = hex.coords;
      drawHex(coords, centsToColor(hexCoordsToCents(coords), false));
    }
    settings.activeHexObjects = [];
  }
};

function setupMouseEvents(): void {
  if (!settings) return;
  
  settings.isMouseDown = false;
  settings.canvas.addEventListener("mousedown", mouseDown, false);
  settings.canvas.addEventListener("mouseup", mouseUp, false);
}

interface Position {
  x: number;
  y: number;
}

function mouseActive(e: MouseEvent): void {
  if (!settings || settings.toggle_mode) return;
  
  let coords = getPointerPosition(e);
  coords = getHexCoordsAt(coords);

  if (!settings.activeHexObjects) {
    settings.activeHexObjects = [];
  }

  if (settings.activeHexObjects.length === 0) {
    const hex = new ActiveHex(coords);
    settings.activeHexObjects[0] = hex;
    addActiveNote(hex);
    const centsObj = hexCoordsToCents(coords);
    hex.noteOn(centsObj);
    drawHex(coords, centsToColor(centsObj, true));
  } else {
    if (!(coords.equals(settings.activeHexObjects[0].coords))) {
      const oldHex = settings.activeHexObjects[0];
      oldHex.noteOff();
      removeActiveNote(oldHex);
      const oldCentsObj = hexCoordsToCents(oldHex.coords);
      drawHex(oldHex.coords, centsToColor(oldCentsObj, false));

      const newHex = new ActiveHex(coords);
      settings.activeHexObjects[0] = newHex;
      addActiveNote(newHex);
      const centsObj = hexCoordsToCents(coords);
      newHex.noteOn(centsObj);
      drawHex(coords, centsToColor(centsObj, true));
    }
  }
}

function getPointerPosition(e: MouseEvent): Point {
  const parentPosition = getPosition(e.currentTarget as HTMLElement);
  const xPosition = e.clientX - parentPosition.x;
  const yPosition = e.clientY - parentPosition.y;
  return new Point(xPosition, yPosition);
}

function getPosition(element: HTMLElement): Position {
  let xPosition = 0;
  let yPosition = 0;

  while (element) {
    xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
    yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
    element = element.offsetParent as HTMLElement;
  }
  return {
    x: xPosition,
    y: yPosition
  };
}

function setupTouchEvents(): void {
  if (!settings) return;
  
  settings.isTouchDown = false;
  settings.canvas.addEventListener("touchstart", handleTouch, false);
  settings.canvas.addEventListener("touchend", handleTouch, false);
  settings.canvas.addEventListener("touchmove", handleTouch, false);
}

function handleTouch(e: TouchEvent): void {
  if (!settings) return;
  
  e.preventDefault();
  if (settings.pressedKeys.length !== 0 || settings.isMouseDown) {
    settings.isTouchDown = false;
    return;
  }

  if (settings.toggle_mode) {
    // Only handle touchstart events in toggle mode
    if (e.type === 'touchstart') {
      const touch = e.touches[0];
      const coords = getHexCoordsAt(new Point(
        touch.pageX - settings.canvas.offsetLeft,
        touch.pageY - settings.canvas.offsetTop
      ));
      
      const note = getMidiFromCoords(coords, settings.rSteps, settings.urSteps, settings.octaveOffset);
      
      if (isNoteActive(note)) {
        // Note is active, deactivate it
        if (settings.activeHexObjects) {
          const hexIndex = settings.activeHexObjects.findIndex((h) => coords.equals(h.coords));
          if (hexIndex !== -1) {
            const hex = settings.activeHexObjects[hexIndex];
            hex.noteOff();
            removeActiveNote(hex);
            settings.activeHexObjects.splice(hexIndex, 1);
            drawHex(coords, centsToColor(hexCoordsToCents(coords), false));
          }
        }
      } else {
        // Note is not active, activate it
        const hex = new ActiveHex(coords);
        if (!settings.activeHexObjects) {
          settings.activeHexObjects = [];
        }
        settings.activeHexObjects.push(hex);
        addActiveNote(hex);
        const centsObj = hexCoordsToCents(coords);
        hex.noteOn(centsObj);
        drawHex(coords, centsToColor(centsObj, true));
      }
    }
    return;
  }

  // Original behavior for non-toggle mode
  settings.isTouchDown = e.targetTouches.length !== 0;

  if (!settings.activeHexObjects) {
    settings.activeHexObjects = [];
  }

  for (const hex of settings.activeHexObjects) {
    hex.release = true;
  }

  for (let i = 0; i < e.targetTouches.length; i++) {
    const coords = getHexCoordsAt(new Point(
      e.targetTouches[i].pageX - settings.canvas.offsetLeft,
      e.targetTouches[i].pageY - settings.canvas.offsetTop
    ));
    let found = false;

    for (const hex of settings.activeHexObjects) {
      if (coords.equals(hex.coords)) {
        hex.release = false;
        found = true;
        break;
      }
    }

    if (!found) {
      const hex = new ActiveHex(coords);
      settings.activeHexObjects.push(hex);
      const centsObj = hexCoordsToCents(coords);
      hex.noteOn(centsObj);
      drawHex(coords, centsToColor(centsObj, true));
    }
  }

  for (let i = settings.activeHexObjects.length - 1; i >= 0; i--) {
    if (settings.activeHexObjects[i].release) {
      const hex = settings.activeHexObjects[i];
      const coords = hex.coords;
      hex.noteOff();
      removeActiveNote(hex);
      drawHex(coords, centsToColor(hexCoordsToCents(coords), false));
      settings.activeHexObjects.splice(i, 1);
    }
  }
}

// This function is referenced but not defined in the original file
// Adding a placeholder implementation
function setupShakeEvents(): void {
  // Implementation needed
}

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