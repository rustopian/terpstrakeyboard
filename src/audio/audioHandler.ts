import { Instrument } from '../core/types';
import type { AudioRequired } from '../settings/SettingsTypes';
import { hasAudioProps } from '../settings/SettingsTypes';
import { audioNodeManager } from './AudioNodeManager';
import { sampleManager } from './SampleManager';
import { noteEventManager } from './NoteEventManager';
import { Point } from '../core/geometry';

export const instruments: Instrument[] = [
  { fileName: "piano", fade: 0.1 },
  { fileName: "harpsichord", fade: 0.2 },
  { fileName: "rhodes", fade: 0.1 },
  { fileName: "harp", fade: 0.2 },
  { fileName: "choir", fade: 0.5 },
  { fileName: "strings", fade: 0.9 },
  { fileName: "sawtooth", fade: 0.2 },
  { fileName: "gayageum", fade: 1 },
  { fileName: "qanun", fade: 1 },
  { fileName: "organ", fade: 0.1 },
  { fileName: "organleslie", fade: 0.1 },
  { fileName: "marimba", fade: 0.1 },
  { fileName: "musicbox", fade: 0.1 },
  { fileName: "WMRI3LST", fade: 0.1 },
  { fileName: "WMRI5LST", fade: 0.1 },
  { fileName: "WMRI5Lpike", fade: 0.1 },
  { fileName: "WMRI7LST", fade: 0.1 },
  { fileName: "WMRI11LST", fade: 0.1 },
  { fileName: "WMRI13LST", fade: 0.1 },
  { fileName: "WMRInLST", fade: 0.1 },
  { fileName: "WMRIByzantineST", fade: 0.1 },
  { fileName: "WMRI-in6-har7-", fade: 0.1 },
  { fileName: "WMRI-in7-har6-", fade: 0.1 }
];

let settings: AudioRequired;

export function initAudioHandler(appSettings: unknown): void {
  if (!hasAudioProps(appSettings)) {
    throw new Error('Missing required audio properties');
  }
  settings = appSettings;
}

export function initAudio(): AudioContext | null {
  try {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) {
      console.error('AudioContext not supported in this browser');
      return null;
    }

    const ctx = new AudioContextConstructor();
    if (ctx.state === 'suspended') {
      console.log("[DEBUG] AudioContext created in suspended state - waiting for user interaction");
    }
    return ctx;
  } catch (e) {
    console.error('Web Audio API error:', e);
    return null;
  }
}

export function stopNote(gainNode: GainNode | null, source: AudioBufferSourceNode | null): void {
  if (!settings?.audioContext || settings.sustain) return;
  
  if (gainNode?.gain) {
    const currentTime = settings.audioContext.currentTime;
    const currentGain = gainNode.gain.value;
    
    // Preserve current gain value and use exponential ramp for natural decay
    gainNode.gain.setValueAtTime(currentGain, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, currentTime + settings.fadeoutTime);
  }
  if (source) {
    const releaseTime = settings.audioContext.currentTime + settings.fadeoutTime;
    source.stop(releaseTime + 0.2);
  }
}

export function getMidiFromCoords(coords: Point, rSteps: number, urSteps: number, octaveOffset: number = 0, equivSteps: number): number {
  const note = coords.x * rSteps + coords.y * urSteps;
  
  // For negative notes, we need to handle the floor division differently
  // to ensure proper wrapping within the octave
  const equivMultiple = Math.floor(note / equivSteps);
  const baseOctave = equivMultiple + octaveOffset + 4;
  
  // For negative notes, we need to adjust the modulo to wrap correctly
  let reducedNote = note % equivSteps;
  if (reducedNote < 0) {
    reducedNote += equivSteps;
  }
  
  // Calculate MIDI note number
  const midiNote = 60 + reducedNote + ((baseOctave - 4) * 12);
  
  return midiNote;
}

export async function loadInstrumentSamples(): Promise<void> {
  const instrumentSelect = document.getElementById("instrument") as HTMLSelectElement;
  if (!instrumentSelect) return;

  const selectedOption = instrumentSelect.querySelector(':checked');
  if (!selectedOption) return;

  const parentElement = selectedOption.parentElement;
  if (parentElement instanceof HTMLOptGroupElement && parentElement.label === 'MIDI out') {
    if (selectedOption.textContent) {
      const midiOutput = window.WebMidi.getOutputByName(selectedOption.textContent);
      noteEventManager.setMidiOutput(midiOutput);
      return;
    }
  }

  // Load regular instrument samples
  const instrumentOption = instrumentSelect.selectedIndex;
  const instrumentToLoad = instruments[instrumentOption] || instruments[0]; // Default to piano
  
  try {
    await sampleManager.loadInstrument(instrumentToLoad);
    noteEventManager.setMidiOutput(null); // Disable MIDI when using samples
  } catch (error) {
    console.error("[DEBUG] Error loading instrument:", error);
    // Try loading piano as fallback
    if (instrumentToLoad.fileName !== 'piano') {
      await sampleManager.loadInstrument(instruments[0]);
    }
  }
}

function getBaseFrequency(sampleRate: number): number {
  return sampleRate === 44100 ? 440 : 880;
} 