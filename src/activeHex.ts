import { playNote, stopNote, getMidiFromCoords } from './audioHandler.ts';
import { Point } from './geometry.ts';

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
}

interface AudioResult {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
}

let settings: Settings | undefined;
let myOutput: WebMidiOutput | null = null;

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
      myOutput.playNote(getMidiFromCoords(this.coords, settings.rSteps, settings.urSteps), [channel]);
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
        myOutput.stopNote(getMidiFromCoords(this.coords, settings.rSteps, settings.urSteps), [channel]);
        return;
      }
      stopNote(this.gainNode, this.source);
    }
  }
} 