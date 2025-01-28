// Display utility functions for the Terpstra Keyboard WebApp
import { Point } from './geometry.ts';
import { hexCoordsToScreen, getHexVertices, getOuterHexVertices } from './hexUtils.ts';
import { getContrastYIQ, nameToHex, hex2rgb, rgb2hsv, HSVtoRGB, HSVtoRGB2, rgbToHex, rgb } from './colorUtils.ts';

interface Settings {
  context: CanvasRenderingContext2D;
  hexSize: number;
  rotation: number;
  spectrum_colors: boolean;
  keycolors: { [key: number]: string };
  fundamental_color: string;
  rSteps: number;
  urSteps: number;
  enum: boolean;
  equivSteps: number;
  scale: number[];
  names: string[];
  no_labels: boolean;
  invert_updown: boolean;
}

let settings: Settings;
export let current_text_color = "#000000";

export function initDisplayUtils(appSettings: Settings): void {
  settings = appSettings;
}

export function drawHex(p: Point, c: string): void {
  const hexCenter = hexCoordsToScreen(p);

  // Calculate hex vertices
  const { x, y } = getHexVertices(hexCenter, settings.hexSize);

  // Draw filled hex
  settings.context.beginPath();
  settings.context.moveTo(x[0], y[0]);
  for (let i = 1; i < 6; i++) {
    settings.context.lineTo(x[i], y[i]);
  }
  settings.context.closePath();
  settings.context.fillStyle = c;
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

  drawHexLabel(p, hexCenter);
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
    settings.context.fillStyle = current_text_color; // Use current_text_color here too
    settings.context.font = "12pt Arial";
    settings.context.textAlign = "center";
    settings.context.textBaseline = "middle";
    settings.context.fillText(equivMultiple.toString(), 0, 0);
  }

  settings.context.restore();
}

interface CentsObj {
  cents: number;
  reducedSteps: number;
}

export function centsToColor(centsObj: number | CentsObj, pressed: boolean): string {
  let returnColor: string | number[];
  const centsValue = typeof centsObj === 'object' ? centsObj.cents : centsObj;
  const reducedSteps = typeof centsObj === 'object' ? centsObj.reducedSteps : undefined;

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

    // If invert_updown is true, darken all colors by default
    if (settings.invert_updown) {
      returnColor[0] = Math.max(0, returnColor[0] - 90);
      returnColor[1] = Math.max(0, returnColor[1] - 90);
      returnColor[2] = Math.max(0, returnColor[2] - 90);
    }

    // Then handle pressed state, but maintain darkness if inverted
    if (pressed) {
      const darkenAmount = settings.invert_updown ? 45 : 90; // Less darkening if already dark
      returnColor[0] = Math.max(0, returnColor[0] - darkenAmount);
      returnColor[1] = Math.max(0, returnColor[1] - darkenAmount);
      returnColor[2] = Math.max(0, returnColor[2] - darkenAmount);
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

  // If invert_updown is true, use a darker base value
  let baseV = settings.invert_updown ? v * 0.5 : v;

  // Then handle pressed state with less darkening if already inverted
  const pressedV = settings.invert_updown ? baseV * 0.75 : baseV * 0.5;
  const finalV = pressed ? pressedV : baseV;

  returnColor = HSVtoRGB(h, s, finalV);
  return returnColor;
} 