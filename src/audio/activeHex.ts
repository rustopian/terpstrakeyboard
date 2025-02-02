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
  note: number;  // Raw note number from grid coordinates
  midiNote: number;  // Only used for MIDI output
  nodeId?: string;

  constructor(coords: Point) {
    if (!settings) {
      throw new Error('Settings not initialized for ActiveHex');
    }
    this.coords = coords;
    const centsObj = hexCoordsToCents(coords);
    this.frequency = settings.fundamental * Math.pow(2, centsObj.cents / 1200);
    
    // Calculate raw note number from coordinates using the same logic as hexCoordsToCents
    const distance = coords.x * settings.rSteps + coords.y * settings.urSteps;
    const equivSteps = settings.scale.length;
    const octs = Math.floor(distance / equivSteps);
    
    // Calculate reduced steps with proper handling of negative values
    let reducedSteps = distance % equivSteps;
    if (reducedSteps < 0) {
      reducedSteps += equivSteps;
    }
    
    // Store the reduced note number for chord display
    this.note = reducedSteps;
    
    // Calculate MIDI note only for MIDI output
    this.midiNote = getMidiFromCoords(coords, settings.rSteps, settings.urSteps, settings.octaveOffset, settings.scale.length);
    
    console.log(`[DEBUG] Note created: coords(${coords.x},${coords.y}), distance=${distance}, octs=${octs}, reducedSteps=${reducedSteps}, note=${this.note}, cents=${centsObj.cents.toFixed(1)}`);
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

    console.log(`[DEBUG] Note ON: coords(${this.coords.x},${this.coords.y}), raw note=${this.note}`);
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

    console.log(`[DEBUG] Note OFF: coords(${this.coords.x},${this.coords.y}), raw note=${this.note}`);
    removeActiveNote(this);
  }
}

// Track both held and toggled notes using raw note numbers
const activeNotes = new Set<number>();
const toggledNotes = new Set<number>();

export function addActiveNote(hex: ActiveHex): void {
  if (!settings) return;
  activeNotes.add(hex.note);  // Use raw note number
  console.log(`[DEBUG] Active notes after add: [${Array.from(activeNotes).join(', ')}]`);
  updateChordDisplay(getActiveNotes());
}

export function removeActiveNote(hex: ActiveHex): void {
  if (!settings) return;
  activeNotes.delete(hex.note);  // Use raw note number
  console.log(`[DEBUG] Active notes after remove: [${Array.from(activeNotes).join(', ')}]`);
  updateChordDisplay(getActiveNotes());
}

export function releaseAllNotes(): void {
  if (!settings) return;
  
  console.log(`[DEBUG] Releasing all notes: [${Array.from(activeNotes).join(', ')}]`);
  
  // Release all notes through the note event manager
  for (const note of activeNotes) {
    // Convert note number back to coordinates
    const coords = new Point(
      Math.floor(note / settings.rSteps),
      note % settings.rSteps
    );
    
    console.log(`[DEBUG] Release note ${note} -> coords(${coords.x},${coords.y})`);
    
    // Calculate frequency from coordinates
    const centsObj = hexCoordsToCents(coords);
    const frequency = settings.fundamental * Math.pow(2, centsObj.cents / 1200);
    
    // Calculate MIDI note only for MIDI output
    const midiNote = getMidiFromCoords(coords, settings.rSteps, settings.urSteps, settings.octaveOffset, settings.scale.length);
    
    noteEventManager.handleNoteEvent({
      type: 'noteOff',
      coords,
      frequency,
      midiNote
    });
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
  const notes = Array.from(new Set([...activeNotes, ...toggledNotes]));
  console.log(`[DEBUG] Getting active notes: [${notes.join(', ')}]`);
  return notes;
}

export function activateNote(note: number): void {
  if (!settings) return;
  console.log(`[DEBUG] Activating note: ${note}`);
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
  console.log(`[DEBUG] Deactivating note: ${note}`);
  activeNotes.delete(note);
  updateChordDisplay(getActiveNotes());
}

// Initialize release all button handler
document.addEventListener('DOMContentLoaded', () => {
  const releaseAllButton = document.getElementById('release-all');
  if (releaseAllButton) {
    releaseAllButton.addEventListener('click', releaseAllNotes);
  }
}); 