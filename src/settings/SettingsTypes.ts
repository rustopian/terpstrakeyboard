/**
 * @file SettingsTypes.ts
 * Type definitions for the Temper settings system.
 * 
 * IMPORTANT: This file defines interface overlays that describe what properties each module requires.
 * These are NOT separate settings objects - they are type definitions that help ensure type safety
 * while maintaining a single source of truth in the main Settings object.
 * 
 * Architecture Overview:
 * - The main Settings type (from Settings.ts) is the single source of truth
 * - Each module receives the complete Settings object
 * - These interfaces describe what properties each module requires
 * - Type guards help verify required properties are present
 * 
 * Usage:
 * 1. Always pass the complete Settings object to modules
 * 2. Use these interfaces for type checking and documentation
 * 3. Use type guards when you need to verify properties exist
 * 4. DO NOT create separate settings objects based on these interfaces
 * 
 * Example:
 * ```typescript
 * function initModule(settings: Settings): void {
 *   if (!hasDisplayProps(settings)) {
 *     throw new Error('Missing required display properties');
 *   }
 *   // Now TypeScript knows the required properties exist
 *   settings.context.clearRect(0, 0, settings.canvas.width, settings.canvas.height);
 * }
 * ```
 * 
 * Musical Considerations:
 * - Properties like rSteps, urSteps, and scale are used for microtonal calculations
 * - DO NOT assume 12-tone equal temperament
 * - Grid coordinates map to arbitrary musical intervals
 * - The fundamental frequency and tuning system are user-configurable
 */

import type { Point } from '../core/geometry';
import { ActiveHex } from '../audio/activeHex';

/**
 * Type for 2D transformation matrix [a, b, c, d, tx, ty]
 */
export type RotationMatrix = [number, number, number, number, number, number];

/**
 * Type for audio buffer that may be null
 */
export type AudioBufferNullable = AudioBuffer | null;

// Forward declarations for backward compatibility
export type EventHandlerSettings = EventHandlerRequired;
export type AudioSettings = AudioRequired;
export type DisplaySettings = DisplayRequired;
export type GridSettings = GridRequired;

/**
 * Required properties for event handling functionality.
 * Used by the event handler system to process keyboard, mouse, and touch input.
 * 
 * IMPORTANT: This is an interface overlay - it describes what properties the event handler needs,
 * but doesn't actually split the settings object. The event handler should still receive
 * the complete Settings object.
 * 
 * Note: Audio properties are optional as they may not be initialized immediately
 * 
 * @property canvas - The main canvas element for input handling
 * @property keyCodeToCoords - Mapping of keyboard keys to hex grid coordinates
 * @property rSteps - Right-facing steps in the grid (affects note calculation)
 * @property urSteps - Up-right facing steps in the grid (affects note calculation)
 * @property fundamental - Base frequency for note calculation (Hz)
 * @property octaveOffset - Offset from middle octave
 * @property toggle_mode - Whether notes stay on when key is released
 * @property hexSize - Size of hexagonal cells
 * @property rotationMatrix - Current grid rotation transform
 * @property scale - Array of cents values defining the musical scale
 * @property equivInterval - Interval for octave equivalence (usually 1200 cents)
 * @property audioContext - Web Audio API context (optional until initialized)
 * @property activeHexObjects - Currently active/sounding notes
 * @property sustainedNotes - Notes held by sustain
 * @property fadeoutTime - Note release time in seconds
 */
export interface EventHandlerRequired {
  canvas: HTMLCanvasElement;
  keyCodeToCoords: Record<number, Point>;
  rSteps: number;
  urSteps: number;
  fundamental: number;
  octaveOffset: number;
  toggle_mode: boolean;
  hexSize: number;
  rotationMatrix: RotationMatrix;
  hexWidth: number;
  hexVert: number;
  scale: number[];
  equivInterval: number;
  audioContext: AudioContext | null;
  midi_enabled: boolean;
  sampleBuffer: AudioBuffer | null;
  pressedKeys: number[];
  isMouseDown: boolean;
  isTouchDown: boolean;
  activeHexObjects: ActiveHex[];
  sustainedNotes: ActiveHex[];
  sustain: boolean;
  fadeoutTime: number;
}

/**
 * Required properties for audio functionality.
 * Used by the audio system for sound generation and MIDI output.
 * 
 * IMPORTANT: Audio properties are critical for proper note playback.
 * The audio system needs accurate timing and proper sample management.
 * 
 * Note: Audio properties may be null/undefined until properly initialized
 * 
 * @property rSteps/urSteps - Grid steps used for note calculation
 * @property fundamental - Base frequency in Hz
 * @property octaveOffset - Offset from middle octave
 * @property audioContext - Web Audio API context (may be null until initialized)
 * @property sampleBuffer - Loaded instrument samples (may be null until loaded)
 * @property fadeoutTime - Note release time in seconds
 */
export interface AudioRequired {
  rSteps: number;
  urSteps: number;
  fundamental: number;
  octaveOffset: number;
  sustain: boolean;
  sustainedNotes: ActiveHex[];
  audioContext: AudioContext | null;
  midi_enabled: boolean;
  sampleBuffer: AudioBuffer | null;
  fadeoutTime: number;
  scale: number[];
  toggle_mode: boolean;
}

/**
 * Required properties for display functionality.
 * Used by the display system for visual rendering of the keyboard grid.
 * 
 * IMPORTANT: The display system handles both the grid layout and visual styling.
 * It needs access to both geometric properties and visual style properties.
 * Color handling must account for color vision deficiency modes.
 * 
 * @property canvas/context - Canvas rendering context
 * @property hexSize/Width/Vert - Hex cell geometry
 * @property rotation/rotationMatrix - Grid orientation
 * @property colorVisionMode - Color vision deficiency accommodation
 * @property spectrum_colors - Whether to use spectrum-based coloring
 * @property activeHexObjects - Currently active notes for highlighting
 * @property minR/maxR/minUR/maxUR - Grid boundaries
 */
export interface DisplayRequired {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  hexSize: number;
  rotation: number;
  colorVisionMode: string;
  colorSaturation: number;
  textSize: number;
  no_labels: boolean;
  names: string[];
  enum: boolean;
  equivSteps: number;
  rotationMatrix: RotationMatrix;
  centerpoint: Point;
  hexWidth: number;
  hexVert: number;
  keycolors: string[];
  useKeyImage: boolean;
  keyImage: string;
  rSteps: number;
  urSteps: number;
  scale: number[];
  octaveOffset: number;
  invert_updown: boolean;
  spectrum_colors: boolean;
  fundamental_color: string;
  activeHexObjects: ActiveHex[];
  minR: number;
  maxR: number;
  minUR: number;
  maxUR: number;
  numberRoot: number;
}

/**
 * Required properties for grid functionality.
 * Used by the grid system for coordinate calculations and layout.
 * 
 * IMPORTANT: The grid system is the foundation for note mapping and layout.
 * It must maintain precise coordinate calculations for proper note mapping.
 * Grid boundaries must be properly maintained for scrolling and display.
 * 
 * @property rSteps/urSteps - Grid step sizes
 * @property hexSize/Width/Vert - Cell geometry
 * @property rotation/rotationMatrix - Grid orientation
 * @property scale/equivInterval - Musical scale definition
 * @property minR/maxR/minUR/maxUR - Grid boundaries
 */
export interface GridRequired {
  rSteps: number;
  urSteps: number;
  hexSize: number;
  rotation: number;
  rotationMatrix: RotationMatrix;
  centerpoint: Point;
  hexWidth: number;
  hexVert: number;
  scale: number[];
  equivInterval: number;
  octaveOffset: number;
  minR: number;
  maxR: number;
  minUR: number;
  maxUR: number;
  fundamental: number;
}

/**
 * Type guards for safely checking if a settings object has required properties.
 * These should be used before accessing properties to ensure type safety.
 * 
 * IMPORTANT: These are minimal checks - they verify only a few key properties.
 * They are meant for basic type safety, not full validation.
 * Always ensure the complete Settings object is passed to modules.
 */

/**
 * Checks if a settings object has the minimum required properties for event handling.
 * @param settings - Settings object to check
 * @returns True if object has basic event handling properties
 */
export function hasEventHandlerProps(settings: unknown): settings is EventHandlerRequired {
  return !!settings && 
         typeof settings === 'object' &&
         'canvas' in settings &&
         'keyCodeToCoords' in settings &&
         'rSteps' in settings;
}

/**
 * Checks if a settings object has the minimum required properties for audio.
 * @param settings - Settings object to check
 * @returns True if object has basic audio properties
 */
export function hasAudioProps(settings: unknown): settings is AudioRequired {
  return !!settings &&
         typeof settings === 'object' &&
         'audioContext' in settings &&
         'fundamental' in settings &&
         'rSteps' in settings;
}

/**
 * Checks if a settings object has the minimum required properties for display.
 * @param settings - Settings object to check
 * @returns True if object has basic display properties
 */
export function hasDisplayProps(settings: unknown): settings is DisplayRequired {
  return !!settings &&
         typeof settings === 'object' &&
         'canvas' in settings &&
         'context' in settings &&
         'hexSize' in settings;
}

/**
 * Checks if a settings object has the minimum required properties for grid calculations.
 * @param settings - Settings object to check
 * @returns True if object has basic grid properties
 */
export function hasGridProps(settings: unknown): settings is GridRequired {
  return !!settings &&
         typeof settings === 'object' &&
         'rSteps' in settings &&
         'hexSize' in settings &&
         'rotationMatrix' in settings;
} 