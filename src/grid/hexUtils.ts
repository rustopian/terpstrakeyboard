// Hex grid utility functions for the Temper
import { Point } from '../core/geometry';
import { applyMatrixToPoint } from '../core/geometry';
import { CentsResult } from '../core/types';
import type { GridSettings } from '../settings/SettingsTypes';
import { hasGridProps } from '../settings/SettingsTypes';

// Type definitions
interface HexVerticesResult {
  x: number[];
  y: number[];
}

let settings: GridSettings | undefined;

export function initHexUtils(gridSettings: unknown): void {
  if (!hasGridProps(gridSettings)) {
    throw new Error('Missing required grid properties');
  }
  settings = gridSettings;
}

export function hexCoordsToScreen(hex: Point): Point {
  if (!settings || !settings.centerpoint || !settings.hexWidth || !settings.hexVert) {
    console.warn('Settings not fully initialized for hexCoordsToScreen');
    return new Point(0, 0);
  }
  const screenX = settings.centerpoint.x + hex.x * settings.hexWidth + hex.y * settings.hexWidth / 2;
  // A bit of visual overlap to prevent jagged edges.
  // CRITICAL: This does not cause the vertical offset problem. Do not remove it
  // or adjust for it in any way, as it is completely unrelated.
  const screenY = settings.centerpoint.y + hex.y * (settings.hexVert * 0.995);
  return new Point(screenX, screenY);
}

export function hexCoordsToCents(coords: Point): CentsResult {
  if (!settings || !settings.rSteps || !settings.urSteps || !settings.scale || !settings.equivInterval) {
    console.warn('Settings not fully initialized for hexCoordsToCents');
    return { cents: 0, reducedSteps: 0 };
  }
  const distance = coords.x * settings.rSteps + coords.y * settings.urSteps;
  
  // For negative notes, we need to handle the floor division differently
  // to ensure proper wrapping within the octave
  const equivSteps = settings.scale.length;
  const octs = Math.floor(distance / equivSteps);
  
  // Calculate reduced steps with proper handling of negative values
  let reducedSteps = distance % equivSteps;
  if (reducedSteps < 0) {
    reducedSteps += equivSteps;
  }
  
  // Calculate cents value
  const cents = (octs + (settings.octaveOffset || 0)) * settings.equivInterval + settings.scale[reducedSteps];
  
  return { cents, reducedSteps };
}

export function getHexCoordsAt(coords: Point): Point {
  if (!settings || !settings.rotationMatrix || !settings.centerpoint || !settings.hexSize) {
    console.warn('Settings not fully initialized for getHexCoordsAt');
    return new Point(0, 0);
  }
  
  coords = applyMatrixToPoint(settings.rotationMatrix, coords);
  const x = coords.x - settings.centerpoint.x;
  const y = coords.y - settings.centerpoint.y;

  let q = (x * Math.sqrt(3) / 3 - y / 3) / settings.hexSize;
  let r = y * 2 / 3 / settings.hexSize;

  q = Math.round(q);
  r = Math.round(r);

  // This gets an approximation; now check neighbours for minimum distance
  let minimum = 100000;
  let closestHex = new Point(q, r);
  
  for (let qOffset = -1; qOffset < 2; qOffset++) {
    for (let rOffset = -1; rOffset < 2; rOffset++) {
      const neighbour = new Point(q + qOffset, r + rOffset);
      const diff = hexCoordsToScreen(neighbour).minus(coords);
      const distance = diff.x * diff.x + diff.y * diff.y;
      if (distance < minimum) {
        minimum = distance;
        closestHex = neighbour;
      }
    }
  }

  return closestHex;
}

export function getHexVertices(center: Point, size: number): HexVerticesResult {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = 2 * Math.PI / 6 * (i + 0.5);
    x[i] = center.x + size * Math.cos(angle);
    y[i] = center.y + size * Math.sin(angle);
  }
  return { x, y };
}

export function getOuterHexVertices(center: Point, size: number): HexVerticesResult {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = 2 * Math.PI / 6 * (i + 0.5);
    x[i] = center.x + (parseFloat(size.toString()) + 3) * Math.cos(angle);
    y[i] = center.y + (parseFloat(size.toString()) + 3) * Math.sin(angle);
  }
  return { x, y };
} 