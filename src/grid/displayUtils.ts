// Display utility functions for the Temper
import { Point } from '../core/geometry';
import { hexCoordsToScreen, getHexVertices, hexCoordsToCents } from './hexUtils';
import { nameToHex, hex2rgb, rgb2hsv, HSVtoRGB, rgb } from '../color/colorUtils';
import { CentsResult } from '../core/types';
import type { DisplaySettings } from '../settings/SettingsTypes';
import { hasDisplayProps } from '../settings/SettingsTypes';
import { convertNoteNameToSystem } from '../utils/accidentalUtils';

let settings: DisplaySettings;
export let current_text_color = "#000000";

export function initDisplayUtils(displaySettings: unknown): void {
  if (!hasDisplayProps(displaySettings)) {
    throw new Error('Missing required display properties');
  }
  settings = displaySettings;
}

export function drawHex(coords: Point, color?: string): void {
  const hexCenter = hexCoordsToScreen(coords);
  const { x, y } = getHexVertices(hexCenter, settings.hexSize);

  settings.context.save();

  // Create clipping path with slightly larger expansion
  settings.context.beginPath();
  const expand = 0.75; // Increased expansion for smoother edges
  for (let i = 0; i < 6; i++) {
    const curr = i;
    const next = (i + 1) % 6;
    const dx = x[next] - x[curr];
    const dy = y[next] - y[curr];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (i === 0) {
      settings.context.moveTo(x[curr] + (dx/len) * expand, y[curr] + (dy/len) * expand);
    }
    settings.context.lineTo(x[next] + (dx/len) * expand, y[next] + (dy/len) * expand);
  }
  settings.context.closePath();
  settings.context.clip();

  // Draw the base hex
  settings.context.fillStyle = color || settings.keycolors[coords.x * settings.rSteps + coords.y * settings.urSteps];
  settings.context.fill();

  // Draw shadows on left edges
  settings.context.globalCompositeOperation = 'source-atop';
  settings.context.lineWidth = 2;
  settings.context.filter = 'blur(2px)';
  settings.context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  
  // Draw all three left edges in one path
  settings.context.beginPath();
  settings.context.moveTo(x[0], y[0]);
  settings.context.lineTo(x[5], y[5]);
  settings.context.lineTo(x[4], y[4]);
  settings.context.lineTo(x[3], y[3]);
  settings.context.stroke();

  // Reset context for hexagon outline
  settings.context.filter = 'none';
  settings.context.globalCompositeOperation = 'source-over';

  // Draw key image if enabled (after shadows, with normal blending)
  if (settings.useKeyImage && settings.keyImage === 'hexagon') {
    settings.context.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    settings.context.lineWidth = 1.5;
    settings.context.beginPath();
    for (let i = 0; i < 6; i++) {
      const curr = i;
      const next = (i + 1) % 6;
      if (i === 0) {
        settings.context.moveTo(x[curr], y[curr]);
      }
      settings.context.lineTo(x[next], y[next]);
    }
    settings.context.closePath();
    settings.context.stroke();
  }

  settings.context.restore();

  drawHexLabel(coords, hexCenter);
}

function drawHexLabel(coords: Point, hexCenter: Point): void {
  // Add note name and equivalence interval multiple
  settings.context.save();
  
  // Reset shadow properties for clear text
  settings.context.shadowBlur = 0;
  settings.context.shadowColor = 'transparent';
  settings.context.shadowOffsetX = 0;
  settings.context.shadowOffsetY = 0;
  
  settings.context.translate(hexCenter.x, hexCenter.y);
  settings.context.rotate(-settings.rotation);

  settings.context.fillStyle = current_text_color;
  const baseSize = 22 * (settings.textSize || 1); // textSize ranges from 0.2 to 1.0
  settings.context.font = `${baseSize}pt "Ekmelos", "Bravura Text", "Noto Music", Arial`;
  settings.context.textAlign = "center";
  settings.context.textBaseline = "middle";

  const note = coords.x * settings.rSteps + coords.y * settings.urSteps;
  const equivSteps = settings.enum ? settings.equivSteps : settings.scale.length;
  const equivMultiple = Math.floor(note / equivSteps);
  let reducedNote = note % equivSteps;
  if (reducedNote < 0) {
    reducedNote = equivSteps + reducedNote;
  }

  if (!settings.no_labels) {
    // When using numbers, apply the numberRoot offset
    let displayNote = reducedNote;
    if (settings.enum && typeof settings.numberRoot === 'number') {
      displayNote = ((reducedNote - (settings.numberRoot || 0) + equivSteps) % equivSteps);
    }
    let name = settings.enum ? "" + displayNote : settings.names[reducedNote];
    name = convertNoteNameToSystem(name, settings.notationSystem);
    
    if (!settings.enum && name) {
      settings.context.save();
      let scaleFactor = name.length > 3 ? 3 / name.length : 1;
      scaleFactor *= settings.hexSize / 50;
      settings.context.scale(scaleFactor, scaleFactor);
      
      // Handle special character kerning
      const specialChars = ['♭', '♯', '↑', '↓', '⟊', '⟋', '𝄢', '𝄣', '𝄲', '𝄳', '𝄱'];
      if (specialChars.some(char => name.includes(char))) {
        // Split name into parts around special characters
        let parts = [];
        let currentPart = '';
        for (let i = 0; i < name.length; i++) {
          const char = name[i];
          if (specialChars.includes(char)) {
            if (currentPart) parts.push(currentPart);
            parts.push(char);
            currentPart = '';
          } else {
            currentPart += char;
          }
        }
        if (currentPart) parts.push(currentPart);

        // Calculate total width with kerning
        const kerningAmount = -0.3;
        let totalWidth = 0;
        parts.forEach((part, i) => {
          totalWidth += settings.context.measureText(part).width;
          if (specialChars.includes(part) && i < parts.length - 1) {
            totalWidth += kerningAmount * settings.context.measureText(part).width;
          }
        });

        // Draw each part with kerning
        let x = -totalWidth / 2;
        parts.forEach((part, i) => {
          settings.context.textAlign = "left";
          settings.context.fillText(part, x, 0);
          x += settings.context.measureText(part).width;
          if (specialChars.includes(part) && i < parts.length - 1) {
            x += kerningAmount * settings.context.measureText(part).width;
          }
        });
      } else {
        settings.context.textAlign = "center";
        settings.context.fillText(name, 0, 0);
      }
      settings.context.restore();
    }

    const scaleFactor = settings.hexSize / 50;
    settings.context.scale(scaleFactor, scaleFactor);
    settings.context.translate(10, -25);
    settings.context.fillStyle = current_text_color;
    settings.context.font = `${baseSize * 0.55}pt Arial`;
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
  settings.context.clearRect(0, 0, settings.canvas.width, settings.canvas.height);
  
  for (let r = settings.minR; r <= settings.maxR; r++) {
    for (let ur = settings.minUR; ur <= settings.maxUR; ur++) {
      const coords = new Point(r, ur);
      const isActive = settings.activeHexObjects?.some(hex => hex.coords.equals(coords)) ?? false;
      const centsObj = hexCoordsToCents(coords);
      drawHex(coords, centsToColor(centsObj, isActive));
    }
  }
}