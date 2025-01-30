// Display utility functions for the Terpstra Keyboard WebApp
import { Point } from '../core/geometry';
import { hexCoordsToScreen, getHexVertices, getOuterHexVertices, hexCoordsToCents } from './hexUtils';
import { nameToHex, hex2rgb, rgb2hsv, HSVtoRGB, rgb } from '../color/colorUtils';
import { Settings, CentsResult } from '../core/types';

let settings: Settings;
export let current_text_color = "#000000";

export function initDisplayUtils(appSettings: Settings): void {
  settings = appSettings;
}

export function drawHex(coords: Point, color?: string): void {
  const hexCenter = hexCoordsToScreen(coords);

  // Calculate hex vertices
  const { x, y } = getHexVertices(hexCenter, settings.hexSize);

  // Draw filled hex
  settings.context.beginPath();
  settings.context.moveTo(x[0], y[0]);
  for (let i = 1; i < 6; i++) {
    settings.context.lineTo(x[i], y[i]);
  }
  settings.context.closePath();
  settings.context.fillStyle = color || settings.keycolors[coords.x * settings.rSteps + coords.y * settings.urSteps];
  settings.context.fill();

  // Save context and create a hex shaped clip
  settings.context.save();
  settings.context.beginPath();
  settings.context.moveTo(x[0], y[0]);
  for (let i = 1; i < 6; i++) {
    settings.context.lineTo(x[i], y[i]);
  }
  settings.context.closePath();
  settings.context.clip();

  // Calculate hex vertices outside clipped path
  const { x: x2, y: y2 } = getOuterHexVertices(hexCenter, settings.hexSize);

  // Draw shadowed stroke outside clip to create pseudo-3d effect
  settings.context.beginPath();
  settings.context.moveTo(x2[0], y2[0]);
  for (let i = 1; i < 6; i++) {
    settings.context.lineTo(x2[i], y2[i]);
  }
  settings.context.closePath();
  settings.context.strokeStyle = 'black';
  settings.context.lineWidth = 5;
  settings.context.shadowBlur = 15;
  settings.context.shadowColor = 'black';
  settings.context.shadowOffsetX = 0;
  settings.context.shadowOffsetY = 0;
  settings.context.stroke();
  settings.context.restore();

  // Add a clean stroke around hex
  settings.context.beginPath();
  settings.context.moveTo(x[0], y[0]);
  for (let i = 1; i < 6; i++) {
    settings.context.lineTo(x[i], y[i]);
  }
  settings.context.closePath();
  settings.context.lineWidth = 2;
  settings.context.lineJoin = 'round';
  settings.context.strokeStyle = 'black';
  settings.context.stroke();

  drawHexLabel(coords, hexCenter);
}

function drawHexLabel(p: Point, hexCenter: Point): void {
  // Add note name and equivalence interval multiple
  settings.context.save();
  settings.context.translate(hexCenter.x, hexCenter.y);
  settings.context.rotate(-settings.rotation);

  // Use current_text_color directly instead of getting contrast
  settings.context.fillStyle = current_text_color;
  settings.context.font = "22pt Arial";
  settings.context.textAlign = "center";
  settings.context.textBaseline = "middle";

  const note = p.x * settings.rSteps + p.y * settings.urSteps;
  const equivSteps = settings.enum ? settings.equivSteps : settings.scale.length;
  const equivMultiple = Math.floor(note / equivSteps);
  let reducedNote = note % equivSteps;
  if (reducedNote < 0) {
    reducedNote = equivSteps + reducedNote;
  }

  if (!settings.no_labels) {
    const name = settings.enum ? "" + reducedNote : settings.names[reducedNote];
    if (name) {
      settings.context.save();
      let scaleFactor = name.length > 3 ? 3 / name.length : 1;
      scaleFactor *= settings.hexSize / 50;
      settings.context.scale(scaleFactor, scaleFactor);
      settings.context.fillText(name, 0, 0);
      settings.context.restore();
    }

    const scaleFactor = settings.hexSize / 50;
    settings.context.scale(scaleFactor, scaleFactor);
    settings.context.translate(10, -25);
    settings.context.fillStyle = current_text_color;
    settings.context.font = "12pt Arial";
    settings.context.textAlign = "center";
    settings.context.textBaseline = "middle";
    settings.context.fillText((equivMultiple + (settings.octaveOffset || 0) + 4).toString(), 0, 0);
  }

  settings.context.restore();
}

export function centsToColor(centsObj: CentsResult, isActive: boolean = false): string {
  let returnColor: string | number[];
  const centsValue = centsObj.cents;
  const reducedSteps = centsObj.reducedSteps;

  // Set text color based on invert setting, regardless of other conditions
  current_text_color = settings?.invert_updown ? "#ffffff" : "#000000";

  // Default color if settings is not initialized
  if (!settings || typeof settings.spectrum_colors === 'undefined') {
    return "#EDEDE4";
  }

  if (!settings.spectrum_colors) {
    if (typeof(settings.keycolors[reducedSteps as number]) === 'undefined') {
      returnColor = "#EDEDE4";
    } else {
      returnColor = settings.keycolors[reducedSteps as number];
    }

    //convert color name to hex
    returnColor = nameToHex(returnColor);
    
    //convert the hex to rgb
    returnColor = hex2rgb(returnColor);

    // First apply inversion if needed
    if (settings.invert_updown) {
      returnColor[0] = Math.max(0, returnColor[0] - 90);
      returnColor[1] = Math.max(0, returnColor[1] - 90);
      returnColor[2] = Math.max(0, returnColor[2] - 90);
    }

    // Handle pressed state
    if (isActive) {
      if (settings.invert_updown) {
        // In inverted mode, lighten when pressed
        returnColor[0] = Math.min(255, returnColor[0] + 90);
        returnColor[1] = Math.min(255, returnColor[1] + 90);
        returnColor[2] = Math.min(255, returnColor[2] + 90);
      } else {
        // In normal mode, darken when pressed (original behavior)
        returnColor[0] = Math.max(0, returnColor[0] - 90);
        returnColor[1] = Math.max(0, returnColor[1] - 90);
        returnColor[2] = Math.max(0, returnColor[2] - 90);
      }
    }

    return rgb(returnColor[0], returnColor[1], returnColor[2]);
  }

  // Handle spectrum colors
  const fcolor = hex2rgb("#" + settings.fundamental_color);
  const hsv = rgb2hsv(fcolor[0], fcolor[1], fcolor[2]);

  let h = hsv.h / 360;
  const s = hsv.s / 100;
  const v = hsv.v / 100;

  let reduced = (centsValue / 1200) % 1;
  if (reduced < 0) reduced += 1;
  h = (reduced + h) % 1;

  // Start with base value and apply inversion first
  let baseV = settings.invert_updown ? v * 0.5 : v;

  // Handle pressed state
  if (isActive) {
    if (settings.invert_updown) {
      // In inverted mode, increase value when pressed
      baseV = baseV * 2;
    } else {
      // In normal mode, decrease value when pressed (original behavior)
      baseV = baseV * 0.5;
    }
  }

  return HSVtoRGB(h, s, baseV);
}

export function drawGrid(): void {
  if (!settings.centerpoint || !settings.hexSize) return;

  // Calculate visible area bounds with generous padding
  const padding = 20; // More hexes beyond visible area
  const width = window.innerWidth;
  const height = window.innerHeight - 50;
  
  // Calculate how many hexes fit in view (plus padding)
  const hexesAcrossHalf = Math.ceil((width / settings.hexWidth)) + padding;
  const hexesVerticalHalf = Math.ceil((height / settings.hexVert)) + padding;
  
  // Calculate grid bounds relative to centerpoint
  const viewCenterX = settings.centerpoint.x;
  const viewCenterY = settings.centerpoint.y;
  
  // Calculate hex coordinates range with offset based on view center
  const centerOffsetX = Math.floor(viewCenterX / settings.hexWidth);
  const centerOffsetY = Math.floor(viewCenterY / settings.hexVert);
  
  const minR = -hexesAcrossHalf + centerOffsetX;
  const maxR = hexesAcrossHalf + centerOffsetX;
  const minUR = -hexesVerticalHalf + centerOffsetY;
  const maxUR = hexesVerticalHalf + centerOffsetY;
  
  // Draw the grid
  for (let r = minR; r <= maxR; r++) {
    for (let ur = minUR; ur <= maxUR; ur++) {
      const coords = new Point(r, ur);
      const centsObj = hexCoordsToCents(coords);
      const color = centsToColor(centsObj, false);
      drawHex(coords, color);
    }
  }
} 