import { playNote, stopNote, getMidiFromCoords } from './audioHandler';
import { Point } from '../core/geometry';
import { updateChordDisplay } from './chordRecognition';
import { centsToColor } from '../grid/displayUtils';
import { drawHex } from '../grid/displayUtils';
import { hexCoordsToCents } from '../grid/hexUtils';

declare global {
  interface WebMidiOutput {
    playNote: (note: number, channels: number[]) => void;
    stopNote: (note: number, channels: number[]) => void;
  }
  interface WebMidi {
    Output: WebMidiOutput;
  }
  var WebMidi: WebMidi;
}

interface Settings {
  sustain: boolean;
  sustainedNotes: ActiveHex[];
  rSteps: number;
  urSteps: number;
  fundamental: number;
  octaveOffset: number;
  activeHexObjects: ActiveHex[];
}

interface AudioResult {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
}

let settings: Settings | undefined;
let myOutput: WebMidiOutput | null = null;

// Track both held and toggled notes
const activeNotes = new Set<number>();
const toggledNotes = new Set<number>();

export function initActiveHex(appSettings: Settings, output: WebMidiOutput | null): void {
  settings = appSettings;
  myOutput = output;
}

export class ActiveHex {
  coords: Point;
  release: boolean;
  freq: number;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode | null;

  constructor(coords: Point) {
    this.coords = coords;
    this.release = false;
    this.freq = 440;
    this.source = null;
    this.gainNode = null;
  }

  noteOn(centsObj: number | { cents: number; reducedSteps: number }, channel: number = 1): void {
    if (!settings) {
      console.warn('Settings not initialized for ActiveHex');
      return;
    }

    if (myOutput) {
      myOutput.playNote(getMidiFromCoords(this.coords, settings.rSteps, settings.urSteps, settings.octaveOffset), [channel]);
      return;
    }

    const centsValue = typeof centsObj === 'object' 
      ? parseFloat(centsObj.cents.toString()) 
      : typeof centsObj === 'number' 
        ? centsObj 
        : parseFloat(centsObj);
        
    if (isNaN(centsValue)) {
      console.warn('Invalid cents value:', centsObj);
      return;
    }

    const freq = parseFloat(settings.fundamental.toString()) * Math.pow(2, centsValue / 1200);
    if (!isFinite(freq)) {
      console.warn('Invalid frequency calculated:', freq, 'using fundamental:', settings.fundamental, 'cents:', centsValue);
      return;
    }

    const result = playNote(freq) as AudioResult | null;
    if (result) {
      this.source = result.source;
      this.gainNode = result.gainNode;
    }
  }

  noteOff(channel: number = 1): void {
    if (!settings) {
      console.warn('Settings not initialized for ActiveHex');
      return;
    }

    if (settings.sustain && settings.sustainedNotes) {
      settings.sustainedNotes.push(this);
    } else {
      if (myOutput) {
        myOutput.stopNote(getMidiFromCoords(this.coords, settings.rSteps, settings.urSteps, settings.octaveOffset), [channel]);
        return;
      }
      stopNote(this.gainNode, this.source);
    }
  }
}

export function addActiveNote(hex: ActiveHex): void {
  activeNotes.add(getMidiFromCoords(hex.coords, settings!.rSteps, settings!.urSteps, settings!.octaveOffset));
  updateChordDisplay(getActiveNotes());
}

export function removeActiveNote(hex: ActiveHex): void {
  activeNotes.delete(getMidiFromCoords(hex.coords, settings!.rSteps, settings!.urSteps, settings!.octaveOffset));
  updateChordDisplay(getActiveNotes());
}

export function releaseAllNotes(): void {
  if (!settings) return;

  // Release all active hex objects
  if (settings.activeHexObjects) {
    for (const hex of settings.activeHexObjects) {
      hex.noteOff();
      const coords = hex.coords;
      drawHex(coords, centsToColor(hexCoordsToCents(coords), false));
    }
    settings.activeHexObjects = [];
  }

  // Clear all note tracking sets
  activeNotes.clear();
  toggledNotes.clear();

  // Clear any sustained notes
  if (settings.sustainedNotes) {
    for (const note of settings.sustainedNotes) {
      note.noteOff();
    }
    settings.sustainedNotes = [];
  }

  // Update the chord display
  updateChordDisplay([]);
}

export function isNoteActive(note: number): boolean {
  return activeNotes.has(note) || toggledNotes.has(note);
}

export function getActiveNotes(): number[] {
  // Combine held and toggled notes
  return Array.from(new Set([...activeNotes, ...toggledNotes]));
}

export function activateNote(note: number): void {
  const settings = (window as any).settings;
  if (settings.toggle_mode) {
    // In toggle mode, clicking toggles the note on/off
    if (toggledNotes.has(note)) {
      toggledNotes.delete(note);
    } else {
      toggledNotes.add(note);
    }
  } else {
    // Normal mode - just add to active notes
    activeNotes.add(note);
  }
  updateChordDisplay(getActiveNotes());
}

export function deactivateNote(note: number): void {
  // Only remove from activeNotes, not toggledNotes
  activeNotes.delete(note);
  updateChordDisplay(getActiveNotes());
}

// Initialize release all button handler
document.addEventListener('DOMContentLoaded', () => {
  const releaseAllButton = document.getElementById('release-all');
  if (releaseAllButton) {
    releaseAllButton.addEventListener('click', () => {
      releaseAllNotes();
    });
  }
}); 