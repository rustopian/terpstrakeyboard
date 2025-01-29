import { Point } from './geometry';
import { ActiveHex } from './activeHex';

export type ColorVisionType = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface Settings {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  centerpoint: Point;
  rotationMatrix: [number, number, number, number, number, number];
  scale: number[];
  equivInterval: number;
  keycolors: string[];
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
  colorVisionMode: ColorVisionType;
  colorSaturation: number;
  invert_updown: boolean;
  hexSize: number;
  rotation: number;
  midi_enabled: boolean;
  activeSources: { [key: number]: { source: AudioBufferSourceNode; gainNode: GainNode } };
  fadeoutTime: number;
  sampleBuffer: (AudioBuffer | undefined)[];
  showIntervals: boolean;
  showAllNotes: boolean;
} 