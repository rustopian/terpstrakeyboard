// Color vision types
export type ColorVisionType = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export interface CentsResult {
  cents: number;
  reducedSteps: number;
}

// Query data interface for URL parameters
export interface QueryDataInterface {
  [key: string]: any;
  instrument?: string;
  fundamental?: number;
  right?: number;
  upright?: number;
  size?: number;
  rotation?: number;
  enum?: boolean;
  equivSteps?: number;
  spectrum_colors?: boolean;
  fundamental_color?: string;
  no_labels?: boolean;
  scale?: string[];
  names?: string[];
  note_colors?: string[];
}

// Instrument interface
export interface Instrument {
  fileName: string;
  fade: number;
} 