// Color utility functions for the Temper

interface HSVColor {
  h: number;
  s: number;
  v: number;
}

interface RGB {
  red: number;
  green: number;
  blue: number;
}

type ColorName = string;
type HexColor = string;
type RGBArray = [number, number, number];

export function nameToHex(colour: ColorName): HexColor {
  const colours: { [key: string]: string } = {
    "aliceblue": "#f0f8ff", "antiquewhite": "#faebd7", "aqua": "#00ffff",
    "aquamarine": "#7fffd4", "azure": "#f0ffff", "beige": "#f5f5dc",
    "bisque": "#ffe4c4", "black": "#000000", "blanchedalmond": "#ffebcd",
    "blue": "#0000ff", "blueviolet": "#8a2be2", "brown": "#a52a2a",
    "burlywood": "#deb887", "cadetblue": "#5f9ea0", "chartreuse": "#7fff00",
    "chocolate": "#d2691e", "coral": "#ff7f50", "cornflowerblue": "#6495ed",
    "cornsilk": "#fff8dc", "crimson": "#dc143c", "cyan": "#00ffff",
    "darkblue": "#00008b", "darkcyan": "#008b8b", "darkgoldenrod": "#b8860b",
    "darkgray": "#a9a9a9", "darkgreen": "#006400", "darkkhaki": "#bdb76b",
    "darkmagenta": "#8b008b", "darkolivegreen": "#556b2f", "darkorange": "#ff8c00",
    "darkorchid": "#9932cc", "darkred": "#8b0000", "darksalmon": "#e9967a",
    "darkseagreen": "#8fbc8f", "darkslateblue": "#483d8b", "darkslategray": "#2f4f4f",
    "darkturquoise": "#00ced1", "darkviolet": "#9400d3", "deeppink": "#ff1493",
    "deepskyblue": "#00bfff", "dimgray": "#696969", "dodgerblue": "#1e90ff",
    "firebrick": "#b22222", "floralwhite": "#fffaf0", "forestgreen": "#228b22",
    "fuchsia": "#ff00ff", "gainsboro": "#dcdcdc", "ghostwhite": "#f8f8ff",
    "gold": "#ffd700", "goldenrod": "#daa520", "gray": "#808080",
    "green": "#008000", "greenyellow": "#adff2f", "honeydew": "#f0fff0",
    "hotpink": "#ff69b4", "indianred": "#cd5c5c", "indigo": "#4b0082",
    "ivory": "#fffff0", "khaki": "#f0e68c", "lavender": "#e6e6fa",
    "lavenderblush": "#fff0f5", "lawngreen": "#7cfc00", "lemonchiffon": "#fffacd",
    "lightblue": "#add8e6", "lightcoral": "#f08080", "lightcyan": "#e0ffff",
    "lightgoldenrodyellow": "#fafad2", "lightgrey": "#d3d3d3", "lightgreen": "#90ee90",
    "lightpink": "#ffb6c1", "lightsalmon": "#ffa07a", "lightseagreen": "#20b2aa",
    "lightskyblue": "#87cefa", "lightslategray": "#778899", "lightsteelblue": "#b0c4de",
    "lightyellow": "#ffffe0", "lime": "#00ff00", "limegreen": "#32cd32",
    "linen": "#faf0e6", "magenta": "#ff00ff", "maroon": "#800000",
    "mediumaquamarine": "#66cdaa", "mediumblue": "#0000cd", "mediumorchid": "#ba55d3",
    "mediumpurple": "#9370d8", "mediumseagreen": "#3cb371", "mediumslateblue": "#7b68ee",
    "mediumspringgreen": "#00fa9a", "mediumturquoise": "#48d1cc", "mediumvioletred": "#c71585",
    "midnightblue": "#191970", "mintcream": "#f5fffa", "mistyrose": "#ffe4e1",
    "moccasin": "#ffe4b5", "navajowhite": "#ffdead", "navy": "#000080",
    "oldlace": "#fdf5e6", "olive": "#808000", "olivedrab": "#6b8e23",
    "orange": "#ffa500", "orangered": "#ff4500", "orchid": "#da70d6",
    "palegoldenrod": "#eee8aa", "palegreen": "#98fb98", "paleturquoise": "#afeeee",
    "palevioletred": "#d87093", "papayawhip": "#ffefd5", "peachpuff": "#ffdab9",
    "peru": "#cd853f", "pink": "#ffc0cb", "plum": "#dda0dd",
    "powderblue": "#b0e0e6", "purple": "#800080", "red": "#ff0000",
    "rosybrown": "#bc8f8f", "royalblue": "#4169e1", "saddlebrown": "#8b4513",
    "salmon": "#fa8072", "sandybrown": "#f4a460", "seagreen": "#2e8b57",
    "seashell": "#fff5ee", "sienna": "#a0522d", "silver": "#c0c0c0",
    "skyblue": "#87ceeb", "slateblue": "#6a5acd", "slategray": "#708090",
    "snow": "#fffafa", "springgreen": "#00ff7f", "steelblue": "#4682b4",
    "tan": "#d2b48c", "teal": "#008080", "thistle": "#d8bfd8",
    "tomato": "#ff6347", "turquoise": "#40e0d0", "violet": "#ee82ee",
    "wheat": "#f5deb3", "white": "#ffffff", "whitesmoke": "#f5f5f5",
    "yellow": "#ffff00", "yellowgreen": "#9acd32"
  };

  if (typeof colours[colour.toLowerCase()] !== 'undefined') {
    return colours[colour.toLowerCase()];
  } else if (colour.indexOf("#") === 0) {
    return colour;
  } else if (colour.length === 6 && colour.indexOf("#") === -1) {
    return "#" + colour;
  }
  return "#EDEDE4"; //default button color!
}

export function hex2rgb(col: HexColor): RGBArray {
  if (col.charAt(0) === '#') {
    col = col.substr(1);
  }
  const r = parseInt(col.charAt(0) + col.charAt(1), 16);
  const g = parseInt(col.charAt(2) + col.charAt(3), 16);
  const b = parseInt(col.charAt(4) + col.charAt(5), 16);
  return [r, g, b];
}

export function rgb2hsv(r1: number, g1: number, b1: number): HSVColor {
  const r = r1 / 255;
  const g = g1 / 255;
  const b = b1 / 255;
  const v = Math.max(r, g, b);
  const diff = v - Math.min(r, g, b);
  
  const diffc = (c: number): number => (v - c) / 6 / diff + 1 / 2;

  let h = 0;
  let s = 0;
  if (diff !== 0) {
    s = diff / v;
    const rr = diffc(r);
    const gg = diffc(g);
    const bb = diffc(b);

    if (r === v) {
      h = bb - gg;
    } else if (g === v) {
      h = (1 / 3) + rr - bb;
    } else if (b === v) {
      h = (2 / 3) + gg - rr;
    }
    
    if (h < 0) h += 1;
    else if (h > 1) h -= 1;
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
}

export function HSVtoRGB(h: number, s: number, v: number): string {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  
  let r: number, g: number, b: number;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: r = 0; g = 0; b = 0;
  }
  
  return rgb(Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255));
}

export function HSVtoRGB2(h: number, s: number, v: number): RGB {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  
  let r: number, g: number, b: number;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: r = 0; g = 0; b = 0;
  }

  return {
    red: Math.floor(r * 255),
    green: Math.floor(g * 255),
    blue: Math.floor(b * 255)
  };
}

export function getContrastYIQ(hexcolor: HexColor): 'black' | 'white' {
  hexcolor = hexcolor.replace("#", "");
  const r = parseInt(hexcolor.substr(0, 2), 16);
  const g = parseInt(hexcolor.substr(2, 2), 16);
  const b = parseInt(hexcolor.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? 'black' : 'white';
}

export function rgbToHex(r: number, g: number, b: number): HexColor {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function rgb(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`;
}

// Add color saturation adjustment function
export function adjustColorSaturation(hexColor: string, saturationFactor: number): string {
  // Remove # if present
  const hex = hexColor.charAt(0) === '#' ? hexColor.substring(1) : hexColor;
  
  // Convert hex to RGB
  const rgb = hex2rgb(`#${hex}`);
  
  // Convert RGB to HSV
  const hsv = rgb2hsv(rgb[0], rgb[1], rgb[2]);
  
  // Adjust saturation
  hsv.s = Math.min(100, Math.max(0, hsv.s * saturationFactor));
  
  // Convert back to RGB
  const rgbResult = HSVtoRGB2(hsv.h / 360, hsv.s / 100, hsv.v / 100);
  
  // Convert RGB to hex
  return rgbToHex(rgbResult.red, rgbResult.green, rgbResult.blue);
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export function getTiltVolumeColor(volume: number): string {
  // Define colors for a more pleasing gradient path
  const startColor: RGBColor = { r: 74, g: 144, b: 226 };  // #4a90e2 (blue)
  const midColor: RGBColor = { r: 82, g: 183, b: 136 };    // #52b788 (bluish-green)
  const endColor: RGBColor = { r: 247, g: 174, b: 71 };    // #f7ae47 (yellowish-orange)

  // Interpolate through midColor for a more pleasing gradient
  let r, g, b;
  if (volume < 0.5) {
    // First half: interpolate from blue to bluish-green
    const t = volume * 2;  // normalize to 0-1 for first half
    r = Math.round(startColor.r + (midColor.r - startColor.r) * t);
    g = Math.round(startColor.g + (midColor.g - startColor.g) * t);
    b = Math.round(startColor.b + (midColor.b - startColor.b) * t);
  } else {
    // Second half: interpolate from bluish-green to yellowish-orange
    const t = (volume - 0.5) * 2;  // normalize to 0-1 for second half
    r = Math.round(midColor.r + (endColor.r - midColor.r) * t);
    g = Math.round(midColor.g + (endColor.g - midColor.g) * t);
    b = Math.round(midColor.b + (endColor.b - midColor.b) * t);
  }

  return `rgb(${r}, ${g}, ${b})`;
} 