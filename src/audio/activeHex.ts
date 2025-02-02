import { Point } from '../core/geometry';
import { hexCoordsToCents } from '../grid/hexUtils';
import { updateChordDisplay } from './chordRecognition';
import type { AudioSettings } from '../settings/SettingsTypes';
import { noteEventManager } from './NoteEventManager';
import { getMidiFromCoords } from './audioHandler';

let settings: AudioSettings | undefined;

export function initActiveHex(appSettings: AudioSettings): void {
  settings = appSettings;
}

export class ActiveHex {
  coords: Point;
  frequency: number;
  midiNote: number;
  nodeId?: string;

  constructor(coords: Point) {
    if (!settings) {
      throw new Error('Settings not initialized for ActiveHex');
    }
    this.coords = coords;
    const centsObj = hexCoordsToCents(coords);
    this.frequency = settings.fundamental * Math.pow(2, centsObj.cents / 1200);
    console.log(`[DEBUG] Note frequency: ${this.frequency.toFixed(3)} Hz (coords: ${coords.x},${coords.y}, cents: ${centsObj.cents.toFixed(1)})`);
    this.midiNote = getMidiFromCoords(coords, settings.rSteps, settings.urSteps, settings.octaveOffset, settings.scale.length);
  }

  async noteOn(): Promise<void> {
    if (!settings) {
      console.warn('Settings not initialized for ActiveHex');
      return;
    }

    await noteEventManager.handleNoteEvent({
      type: 'noteOn',
      coords: this.coords,
      frequency: this.frequency,
      midiNote: this.midiNote
    });

    addActiveNote(this);
  }

  async noteOff(): Promise<void> {
    if (!settings) {
      console.warn('Settings not initialized for ActiveHex');
      return;
    }

    await noteEventManager.handleNoteEvent({
      type: 'noteOff',
      coords: this.coords,
      frequency: this.frequency,
      midiNote: this.midiNote,
      nodeId: this.nodeId
    });

    removeActiveNote(this);
  }
}

// Track both held and toggled notes
const activeNotes = new Set<number>();
const toggledNotes = new Set<number>();

export function addActiveNote(hex: ActiveHex): void {
  if (!settings) return;
  activeNotes.add(hex.midiNote);
  updateChordDisplay(getActiveNotes());
}

export function removeActiveNote(hex: ActiveHex): void {
  if (!settings) return;
  activeNotes.delete(hex.midiNote);
  updateChordDisplay(getActiveNotes());
}

export function releaseAllNotes(): void {
  if (!settings) return;
  
  // Release all notes through the note event manager
  for (const note of activeNotes) {
    const coords = getMidiCoords(note);
    if (coords) {
      noteEventManager.handleNoteEvent({
        type: 'noteOff',
        coords,
        frequency: getFrequencyForNote(note),
        midiNote: note
      });
    }
  }

  // Clear tracking sets
  activeNotes.clear();
  toggledNotes.clear();
  
  // Update chord display
  updateChordDisplay([]);
}

export function isNoteActive(note: number): boolean {
  return activeNotes.has(note) || toggledNotes.has(note);
}

export function getActiveNotes(): number[] {
  return Array.from(new Set([...activeNotes, ...toggledNotes]));
}

export function activateNote(note: number): void {
  const settings = (window as any).settings;
  if (settings.toggle_mode) {
    if (toggledNotes.has(note)) {
      toggledNotes.delete(note);
    } else {
      toggledNotes.add(note);
    }
  } else {
    activeNotes.add(note);
  }
  updateChordDisplay(getActiveNotes());
}

export function deactivateNote(note: number): void {
  activeNotes.delete(note);
  updateChordDisplay(getActiveNotes());
}

// Helper functions
function getMidiCoords(midiNote: number): Point | null {
  if (!settings) return null;
  const octave = Math.floor((midiNote - 60) / 12);
  const remainder = (midiNote - 60) % 12;
  return new Point(
    Math.floor(remainder / settings.rSteps),
    Math.floor(remainder / settings.urSteps)
  );
}

function getFrequencyForNote(midiNote: number): number {
  if (!settings) {
    console.warn('Settings not initialized for frequency calculation');
    return 0;
  }
  // Use the fundamental from settings and calculate relative to C4 (MIDI 60)
  return settings.fundamental * Math.pow(2, (midiNote - 60) / 12);
}

// Initialize release all button handler
document.addEventListener('DOMContentLoaded', () => {
  const releaseAllButton = document.getElementById('release-all');
  if (releaseAllButton) {
    releaseAllButton.addEventListener('click', releaseAllNotes);
  }
}); 