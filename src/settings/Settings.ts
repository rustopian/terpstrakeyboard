import { Point } from '../core/geometry';
import { ColorVisionType } from '../color/colorTransform';
import { ActiveHex } from '../audio/activeHex';

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
  minR: number;
  maxR: number;
  minUR: number;
  maxUR: number;
}

// Default settings
export const defaultSettings: Settings = {
  scale: [],
  equivInterval: 0,
  keycolors: [],
  canvas: null as unknown as HTMLCanvasElement,
  context: null as unknown as CanvasRenderingContext2D,
  centerpoint: new Point(0, 0),
  rotationMatrix: [1, 0, 0, 1, 0, 0],
  fundamental: 0,
  rSteps: 0,
  urSteps: 0,
  hexSize: 0,
  rotation: 0,
  hexHeight: 0,
  hexVert: 0,
  hexWidth: 0,
  names: [],
  enum: false,
  equivSteps: 0,
  no_labels: false,
  spectrum_colors: false,
  fundamental_color: '#55ff55',
  audioContext: undefined,
  sustain: false,
  sustainedNotes: [],
  activeHexObjects: [],
  pressedKeys: [],
  keyCodeToCoords: {},
  midi_enabled: false,
  isMouseDown: false,
  isTouchDown: false,
  audioBuffer: undefined,
  activeSources: {},
  fadeoutTime: 0,
  sampleBuffer: [undefined, undefined, undefined, undefined],
  colorVisionMode: 'normal',
  colorSaturation: 100,
  invert_updown: false,
  showIntervals: false,
  showAllNotes: false,
  octaveOffset: 0,
  minR: 0,
  maxR: 0,
  minUR: 0,
  maxUR: 0,
}; 