import { Settings } from './Settings';
import { Point } from '../core/geometry';
import { ActiveHex } from '../audio/activeHex';

/**
 * Settings required by the event handling system.
 * Handles keyboard, mouse, and touch input.
 */
export interface EventHandlerSettings extends Pick<Settings, 
  | 'canvas'
  | 'keyCodeToCoords'
  | 'rSteps'
  | 'urSteps'
  | 'fundamental'
  | 'octaveOffset'
  | 'toggle_mode'
  | 'hexSize'
  | 'rotationMatrix'
  | 'hexWidth'
  | 'hexVert'
> {
  pressedKeys: number[];
  isMouseDown: boolean;
  isTouchDown: boolean;
  activeHexObjects: any[];
  sustainedNotes: any[];
  sustain: boolean;
}

/**
 * Settings required by the audio system.
 * Handles both MIDI and Web Audio API output.
 */
export interface AudioSettings extends Pick<Settings,
  | 'rSteps'
  | 'urSteps'
  | 'fundamental'
  | 'octaveOffset'
  | 'sustain'
  | 'sustainedNotes'
  | 'audioContext'
  | 'midi_enabled'
  | 'sampleBuffer'
  | 'fadeoutTime'
> {}

/**
 * Settings required by the display system.
 * Handles visual rendering and grid layout.
 */
export interface DisplaySettings extends Pick<Settings,
  | 'canvas'
  | 'context'
  | 'hexSize'
  | 'rotation'
  | 'colorVisionMode'
  | 'colorSaturation'
  | 'textSize'
  | 'no_labels'
  | 'names'
  | 'enum'
  | 'equivSteps'
  | 'rotationMatrix'
  | 'centerpoint'
  | 'hexWidth'
  | 'hexVert'
  | 'keycolors'
  | 'useKeyImage'
  | 'keyImage'
> {}

/**
 * Settings required by the grid system.
 * Handles coordinate systems and grid calculations.
 */
export interface GridSettings extends Pick<Settings,
  | 'rSteps'
  | 'urSteps'
  | 'hexSize'
  | 'rotation'
  | 'rotationMatrix'
  | 'centerpoint'
  | 'hexWidth'
  | 'hexVert'
  | 'scale'
  | 'equivInterval'
  | 'octaveOffset'
> {} 