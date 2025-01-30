// Color transformation utilities for colorblind modes
export type ColorVisionType = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

// Color transformation matrices for different types of CVD
const CVD_MATRICES = {
  protanopia: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0.242, 0.758]
  ],
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7]
  ],
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.433, 0.567],
    [0, 0.475, 0.525]
  ],
  achromatopsia: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114]
  ]
};

// Convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Transform a color for a specific type of color vision deficiency
export function transformColorForCVD(hexColor: string, cvdType: ColorVisionType): string {
  if (cvdType === 'normal' || !hexColor.startsWith('#')) {
    return hexColor;
  }

  const [r, g, b] = hexToRgb(hexColor);
  const matrix = CVD_MATRICES[cvdType];
  
  // Apply transformation
  const newR = matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b;
  const newG = matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b;
  const newB = matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b;

  return rgbToHex(newR, newG, newB);
}

// Transform an array of colors for a specific type of color vision deficiency
export function transformColorsForCVD(colors: string[], cvdType: ColorVisionType): string[] {
  return colors.map(color => transformColorForCVD(color, cvdType));
} 