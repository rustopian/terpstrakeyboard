import { Point } from './geometry';
import { ActiveHex } from '../audio/activeHex';

// Color vision types
export type ColorVisionType = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export interface CentsResult {
  cents: number;
  reducedSteps: number;
}

// Query data interface for URL parameters
export interface QueryDataInterface {
  [key: string]: any;
  instrument?: string;
  fundamental?: number;
  right?: number;
  upright?: number;
  size?: number;
  rotation?: number;
  enum?: boolean;
  equivSteps?: number;
  spectrum_colors?: boolean;
  fundamental_color?: string;
  no_labels?: boolean;
  scale?: string[];
  names?: string[];
  note_colors?: string[];
}

// Main settings interface
export interface Settings {
  scale: number[];
  equivInterval: number;
  keycolors: string[];
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  centerpoint: Point;
  rotationMatrix: [number, number, number, number, number, number];
  fundamental: number;
  rSteps: number;
  urSteps: number;
  hexSize: number;
  rotation: number;
  hexHeight: number;
  hexVert: number;
  hexWidth: number;
  names: string[];
  enum: boolean;
  equivSteps: number;
  no_labels: boolean;
  spectrum_colors: boolean;
  fundamental_color: string;
  audioContext?: AudioContext;
  sustain: boolean;
  sustainedNotes: ActiveHex[];
  activeHexObjects: ActiveHex[];
  pressedKeys: number[];
  keyCodeToCoords: { [key: number]: Point };
  isMouseDown: boolean;
  isTouchDown: boolean;
  midi_enabled: boolean;
  audioBuffer?: AudioBuffer;
  activeSources: { [key: number]: { source: AudioBufferSourceNode; gainNode: GainNode } };
  fadeoutTime: number;
  sampleBuffer: (AudioBuffer | undefined)[];
  colorVisionMode: ColorVisionType;
  colorSaturation: number;
  invert_updown: boolean;
  showIntervals: boolean;
  showAllNotes: boolean;
  octaveOffset: number;
}

// Instrument interface
export interface Instrument {
  fileName: string;
  fade: number;
} 