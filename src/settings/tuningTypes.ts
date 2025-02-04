// Type definitions for tuning systems in the Temper

interface IntervalData {
  intervalName: string;
  justRatio?: string;
  errorCents?: number;
  sizeCents?: number;
  justCents?: number;
  limit?: number;
  intervalSymbol?: string;
}

export interface TuningSystem {
  NATURAL_NOTE_STEPS: { [key: string]: number };
  MODIFIER_STEPS: { [key: string]: number };
  INTERVAL_DICT: { [key: number]: IntervalData[] };
  CHORD_SPELLINGS: { [key: string]: string[] } | { [key: string]: { symbol: string; spelling: string[] } };
}

// 12-TET System
export const SETTINGS_12_TET: TuningSystem = {
  NATURAL_NOTE_STEPS: {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11
  },
  MODIFIER_STEPS: {
    '#': 1,
    'b': -1,
    '##': 2,
    'bb': -2,
  },
  INTERVAL_DICT: {
    0: [{ intervalName: 'Perfect Unison', justRatio: '1:1', errorCents: 0 }],
    1: [{ intervalName: 'Minor Second', justRatio: '16:15', errorCents: 11.73 }],
    2: [{ intervalName: 'Major Second', justRatio: '9:8', errorCents: -3.91 }],
    3: [{ intervalName: 'Minor Third', justRatio: '6:5', errorCents: 15.64 }],
    4: [{ intervalName: 'Major Third', justRatio: '5:4', errorCents: -13.69 }],
    5: [{ intervalName: 'Perfect Fourth', justRatio: '4:3', errorCents: -1.96 }],
    6: [{ intervalName: 'Tritone', justRatio: '45:32', errorCents: -9.78 }],
    7: [{ intervalName: 'Perfect Fifth', justRatio: '3:2', errorCents: 1.96 }],
    8: [{ intervalName: 'Minor Sixth', justRatio: '8:5', errorCents: 13.69 }],
    9: [{ intervalName: 'Major Sixth', justRatio: '5:3', errorCents: -15.64 }],
    10: [{ intervalName: 'Minor Seventh', justRatio: '9:5', errorCents: 17.60 }],
    11: [{ intervalName: 'Major Seventh', justRatio: '15:8', errorCents: -11.73 }],
    12: [{ intervalName: 'Perfect Octave', justRatio: '2:1', errorCents: 0 }]
  },
  CHORD_SPELLINGS: {
    'Major': ['C', 'E', 'G'],
    'Minor': ['C', 'Eb', 'G'],
    'Diminished': ['C', 'Eb', 'Gb'],
    'Augmented': ['C', 'E', 'G#'],
    'Suspended 4th': ['C', 'F', 'G'],
    'Major 7th': ['C', 'E', 'G', 'B'],
    'Major 6th': ['C', 'E', 'G', 'A'],
    'Minor 6th': ['C', 'Eb', 'G', 'A'],
    'Dominant 7th': ['C', 'E', 'G', 'Bb'],
    'Minor 7th': ['C', 'Eb', 'G', 'Bb'],
    'Half Diminished 7th': ['C', 'Eb', 'Gb', 'Bb'],
    'Fully Diminished 7th': ['C', 'Eb', 'Gb', 'A']
  }
};

// 31-EDO System
export const SETTINGS_31_EDO: TuningSystem = {
  NATURAL_NOTE_STEPS: {
    C: 0,
    D: 5,
    E: 10,
    F: 13,
    G: 18,
    A: 23,
    B: 28
  },
  MODIFIER_STEPS: {
    '↑': 1,
    '#': 2,
    'b': -2,
    '↓': -1,
    '♯': 2,  // Unicode sharp
    '♭': -2  // Unicode flat
  },
  INTERVAL_DICT: {
    0: [{
        intervalName: 'Perfect Unison',
        intervalSymbol: 'P1',
        sizeCents: 0
      }],
    1: [{
        intervalName: 'Super Unison',
        intervalSymbol: 'S1',
        sizeCents: 38.71
      }],
    2: [{
        intervalName: 'Augmented Unison',
        intervalSymbol: 'A1',
        sizeCents: 77.42
      }],
    3: [{
        intervalName: 'Minor Second',
        intervalSymbol: 'm2',
        sizeCents: 116.13
      }],
    4: [{
        intervalName: 'Neutral Second',
        intervalSymbol: 'n2',
        sizeCents: 154.84
      }],
    5: [{
        intervalName: 'Major Second',
        intervalSymbol: 'M2',
        sizeCents: 193.55
      }],
    6: [{
        intervalName: 'Supermajor Second',
        intervalSymbol: 'S2',
        sizeCents: 232.26
      }],
    7: [{
        intervalName: 'Subminor Third',
        intervalSymbol: 's3',
        sizeCents: 270.97
      }],
    8: [{
        intervalName: 'Minor Third',
        intervalSymbol: 'm3',
        sizeCents: 309.68
      }],
    9: [{
        intervalName: 'Neutral Third',
        intervalSymbol: 'n3',
        sizeCents: 348.39
      }],
    10: [{
        intervalName: 'Major Third',
        intervalSymbol: 'M3',
        sizeCents: 387.1
      }],
    11: [{
        intervalName: 'Supermajor Third',
        intervalSymbol: 'S3',
        sizeCents: 425.81
      }],
    12: [{
        intervalName: 'Sub Fourth',
        intervalSymbol: 's4',
        sizeCents: 464.52
      }],
    13: [{
        intervalName: 'Perfect Fourth',
        intervalSymbol: 'P4',
        sizeCents: 503.23
      }],
    14: [{
        intervalName: 'Super Fourth',
        intervalSymbol: 'S4',
        sizeCents: 541.94
      }],
    15: [{
        intervalName: 'Augmented Fourth',
        intervalSymbol: 'A4',
        sizeCents: 580.65
      }],
    16: [{
        intervalName: 'Diminished Fifth',
        intervalSymbol: 'd5',
        sizeCents: 619.35
      }],
    17: [{
        intervalName: 'Sub Fifth',
        intervalSymbol: 's5',
        sizeCents: 658.06
      }],
    18: [{
        intervalName: 'Perfect Fifth',
        intervalSymbol: 'P5',
        sizeCents: 696.77
      }],
    19: [{
        intervalName: 'Super Fifth',
        intervalSymbol: 'S5',
        sizeCents: 735.48
      }],
    20: [{
        intervalName: 'Subminor Sixth',
        intervalSymbol: 's6',
        sizeCents: 774.19
      }],
    21: [{
        intervalName: 'Minor Sixth',
        intervalSymbol: 'm6',
        sizeCents: 812.9
      }],
    22: [{
        intervalName: 'Neutral Sixth',
        intervalSymbol: 'n6',
        sizeCents: 851.61
      }],
    23: [{
        intervalName: 'Major Sixth',
        intervalSymbol: 'M6',
        sizeCents: 890.32
      }],
    24: [{
        intervalName: 'Supermajor Sixth',
        intervalSymbol: 'S6',
        sizeCents: 929.03
      }],
    25: [{
        intervalName: 'Subminor Seventh',
        intervalSymbol: 's7',
        sizeCents: 967.74
      }],
    26: [{
        intervalName: 'Minor Seventh',
        intervalSymbol: 'm7',
        sizeCents: 1006.45
      }],
    27: [{
        intervalName: 'Neutral Seventh',
        intervalSymbol: 'n7',
        sizeCents: 1045.16
      }],
    28: [{
        intervalName: 'Major Seventh',
        intervalSymbol: 'M7',
        sizeCents: 1083.87
      }],
    29: [{
        intervalName: 'Supermajor Seventh',
        intervalSymbol: 'S7',
        sizeCents: 1122.58
      }],
    30: [{
        intervalName: 'Sub Octave',
        intervalSymbol: 's8',
        sizeCents: 1161.29
      }],
    31: [{
        intervalName: 'Perfect Octave',
        intervalSymbol: 'P8',
        sizeCents: 1200
      }]
  },
  CHORD_SPELLINGS: {
      // Standard Triads
      'Major': { symbol: 'C', spelling: ['C4', 'E4', 'G4'] },
      'Minor': { symbol: 'Cm', spelling: ['C4', 'E♭4', 'G4'] },
      'Subminor': { symbol: 'Cs', spelling: ['C4', '↓E4', 'G4'] },
      'Supermajor': { symbol: 'CS', spelling: ['C4', '↑E4', 'G4'] },
      'Neutral': { symbol: 'Cn', spelling: ['C4', '↓E4', 'G4'] },
      'Augmented': { symbol: 'C+', spelling: ['C4', 'E4', 'G♯4'] },
      'Diminished': { symbol: 'Co', spelling: ['C4', 'E♭4', 'G♭4'] },
      'Harmonic Diminished': { symbol: 'Cm(♭♭5)', spelling: ['C4', 'E♭4', '↓↓G4'] },
      'Subminor Diminished': { symbol: 'Cs(♭♭5)', spelling: ['C4', '↓E4', '↓↓G4'] },
      'Septimal Wolf Major': { symbol: 'CS(↑5)', spelling: ['C4', '↑E4', '↑G4'] },
      'Septimal Wolf Minor': { symbol: 'Cm(↑5)', spelling: ['C4', 'E♭4', '↑G4'] },
      'Subfifth Minor': { symbol: 'Cm(↓5)', spelling: ['C4', 'E♭4', '↓G4'] },
      'Subfifth Neutral': { symbol: 'Cn(↓5)', spelling: ['C4', '↓E4', '↓G4'] },
      'DRmaj': { symbol: 'C(↓5)', spelling: ['C4', 'E4', '↓G4'] },
      'DRmindim': { symbol: 'Cs(↓5)', spelling: ['C4', '↓E4', '↓G4'] },
      'Orwell': { symbol: 'Cs(♭♭5)', spelling: ['C4', 'D♯4', '↑F4'] },
      'Squares': { symbol: 'CS(×5)', spelling: ['C4', '↑E4', '↓A4'] },
    
      // Basic Tetrads
      'Major Seven': { symbol: 'CM7', spelling: ['C4', 'E4', 'G4', 'B4'] },
      'Harmonic Seven': { symbol: 'Ch7', spelling: ['C4', 'E4', 'G4', '↓B♭4'] },
      'Minor Seven': { symbol: 'Cm7', spelling: ['C4', 'E♭4', 'G4', 'B♭4'] },
      'Utonal Tetrad': { symbol: 'CmS6', spelling: ['C4', 'E♭4', 'G4', '↑A4'] },
      'Subminor Seven': { symbol: 'Cs7', spelling: ['C4', '↓E4', 'G4', '↓B♭4'] },
      'Undecimal Tetrad': { symbol: 'Csn7', spelling: ['C4', '↓E4', 'G4', '↓B4'] },
      'Supermajor Seven': { symbol: 'CS7', spelling: ['C4', '↑E4', 'G4', '↑B4'] },
      '9-Over Tetrad': { symbol: 'CSm7', spelling: ['C4', '↑E4', 'G4', 'B♭4'] },
      'Neutral Tetrad': { symbol: 'Cn7', spelling: ['C4', '↓E4', 'G4', '↓B4'] },
    
      // Split Chords
      'Split Chord': { symbol: 'CMm3', spelling: ['C4', 'E♭4', 'E4', 'G4'] },
      'Septimal Split Chord': { symbol: 'CSs3', spelling: ['C4', '↓E4', '↑E4', 'G4'] },
      'YB Split Chord': { symbol: 'CMs3', spelling: ['C4', '↓E4', 'E4', 'G4'] },
      'GR Split Chord': { symbol: 'CSm3', spelling: ['C4', 'E♭4', '↑E4', 'G4'] },
      'Wolf Split Chord': { symbol: 'CSm3(↑5)', spelling: ['C4', 'E♭4', '↑E4', '↑G4'] },
      'Squares Split Chord': { symbol: 'CSn3(♯5)', spelling: ['C4', '↓E4', '↑E4', 'G♯4'] },
      'DR Split Chord': { symbol: 'CMs3(↓5)', spelling: ['C4', '↓E4', 'E4', '↓G4'] },
    
      // Dominant and Extended Chords
      'Dominant Seven': { symbol: 'C7', spelling: ['C4', 'E4', 'G4', 'B♭4'] },
      'Major Nine': { symbol: 'CM9', spelling: ['C4', 'E4', 'G4', 'B4', 'D4'] },
      'Harmonic Nine': { symbol: 'Ch9', spelling: ['C4', 'E4', 'G4', '↓B♭4', 'D4'] },
      'Minor Nine': { symbol: 'Cm9', spelling: ['C4', 'E♭4', 'G4', 'B♭4', 'D4'] },
      'Subminor Nine': { symbol: 'Cs9', spelling: ['C4', '↓E4', 'G4', '↓B♭4', 'D4'] },
      'Supermajor Nine': { symbol: 'CS9', spelling: ['C4', '↑E4', 'G4', '↑B4', 'D4'] },
    
      // Sus Chords
      'Sus4': { symbol: 'Csus', spelling: ['C4', 'F4', 'G4'] },
      'Sus2': { symbol: 'Csus2', spelling: ['C4', 'D4', 'G4'] },
      'Sus^4': { symbol: 'Csus(↑4)', spelling: ['C4', '↑F4', 'G4'] },
      'Susv4': { symbol: 'Csus(↓4)', spelling: ['C4', '↓F4', 'G4'] },
      'Sus^2': { symbol: 'Csus(↑2)', spelling: ['C4', '↑D4', 'G4'] },
      'DRsus4': { symbol: 'Csus(↓4,↓5)', spelling: ['C4', '↓F4', '↓G4'] },
      'DRsus2': { symbol: 'Csus2(↓5)', spelling: ['C4', 'D4', '↓G4'] },
    
      // Other Extended Chords
      'Major 6/9': { symbol: 'C6/9', spelling: ['C4', 'E4', 'G4', 'A4', 'D4'] },
      'Harmonic #9': { symbol: 'Ch7♯9', spelling: ['C4', 'E4', 'G4', '↓B♭4', 'D♯4'] },
      'Harmonic ♭♭9': { symbol: 'Ch7♭♭9', spelling: ['C4', 'E4', 'G4', '↓B♭4', '↓↓D4'] }
  }
};

// 53-EDO System
export const SETTINGS_53_EDO: TuningSystem = {
  NATURAL_NOTE_STEPS: {
    C: 0,
    D: 9,
    E: 18,
    F: 22,
    G: 31,
    A: 40,
    B: 49
  },
  MODIFIER_STEPS: {
    '↑': 1,
    '↑↑': 2,
    '↓': -1,
    '↓↓': -2,
    'b': -5,
    '#': 5,
    '♭': -5, // Accept Unicode flat
    '♯': 5   // Accept Unicode sharp
  },
  INTERVAL_DICT: {
    0: [
      {
        sizeCents: 0,
        intervalName: 'perfect unison',
        justRatio: '1/1',
        justCents: 0,
        errorCents: 0,
        limit: 1
      }
    ],
    1: [
      {
        sizeCents: 22.64,
        intervalName: 'syntonic comma',
        justRatio: '81/80',
        justCents: 21.51,
        errorCents: +1.14,
        limit: 5
      }
    ],
    2: [
      {
        sizeCents: 45.28,
        intervalName: 'just diesis',
        justRatio: '128/125',
        justCents: 41.06,
        errorCents: +4.22,
        limit: 5
      }
    ],
    3: [
      {
        sizeCents: 67.92,
        intervalName: 'just chromatic semitone',
        justRatio: '25/24',
        justCents: 70.67,
        errorCents: -2.75,
        limit: 5
      },
      {
        sizeCents: 67.92,
        intervalName: 'greater diesis',
        justRatio: '648/625',
        justCents: 62.57,
        errorCents: +5.35,
        limit: 5
      }
    ],
    4: [
      {
        sizeCents: 90.57,
        intervalName: 'major limma',
        justRatio: '135/128',
        justCents: 92.18,
        errorCents: -1.61,
        limit: 5
      },
      {
        sizeCents: 90.57,
        intervalName: 'lesser Pythagorean semitone',
        justRatio: '256/243',
        justCents: 90.22,
        errorCents: +0.35,
        limit: 3
      }
    ],
    5: [
      {
        sizeCents: 113.21,
        intervalName: 'greater Pythagorean semitone',
        justRatio: '2187/2048',
        justCents: 113.69,
        errorCents: -0.48,
        limit: 3
      },
      {
        sizeCents: 113.21,
        intervalName: 'just diatonic semitone (just minor second)',
        justRatio: '16/15',
        justCents: 111.73,
        errorCents: +1.48,
        limit: 5
      }
    ],
    6: [
      {
        sizeCents: 135.85,
        intervalName: 'accute diatonic semitone',
        justRatio: '27/25',
        justCents: 133.24,
        errorCents: +2.61,
        limit: 5
      }
    ],
    7: [
      {
        sizeCents: 158.49,
        intervalName: 'neutral second (greater undecimal)',
        justRatio: '11/10',
        justCents: 165.00,
        errorCents: -6.51,
        limit: 11
      },
      {
        sizeCents: 158.49,
        intervalName: 'doubly grave whole tone',
        justRatio: '800/729',
        justCents: 160.90,
        errorCents: -2.41,
        limit: 5
      },
      {
        sizeCents: 158.49,
        intervalName: 'neutral second (lesser undecimal)',
        justRatio: '12/11',
        justCents: 150.64,
        errorCents: +7.85,
        limit: 11
      }
    ],
    8: [
      {
        sizeCents: 181.13,
        intervalName: 'grave whole tone (minor tone, lesser tone, grave second)',
        justRatio: '10/9',
        justCents: 182.40,
        errorCents: -1.27,
        limit: 5
      }
    ],
    9: [
      {
        sizeCents: 203.77,
        intervalName: 'whole tone (major tone, just second)',
        justRatio: '9/8',
        justCents: 203.91,
        errorCents: -0.14,
        limit: 3
      }
    ],
    10: [
      {
        sizeCents: 226.41,
        intervalName: 'septimal whole tone',
        justRatio: '8/7',
        justCents: 231.17,
        errorCents: -4.76,
        limit: 7
      },
      {
        sizeCents: 226.41,
        intervalName: 'diminished third',
        justRatio: '256/225',
        justCents: 223.46,
        errorCents: +2.95,
        limit: 5
      }
    ],
    11: [
      {
        sizeCents: 249.06,
        intervalName: 'just diminished third',
        justRatio: '144/125',
        justCents: 244.97,
        errorCents: +4.09,
        limit: 5
      }
    ],
    12: [
      {
        sizeCents: 271.70,
        intervalName: 'just augmented second',
        justRatio: '75/64',
        justCents: 274.58,
        errorCents: -2.88,
        limit: 5
      },
      {
        sizeCents: 271.70,
        intervalName: 'septimal minor third',
        justRatio: '7/6',
        justCents: 266.87,
        errorCents: +4.83,
        limit: 7
      }
    ],
    13: [
      {
        sizeCents: 294.34,
        intervalName: 'Pythagorean semiditone',
        justRatio: '32/27',
        justCents: 294.13,
        errorCents: +0.21,
        limit: 3
      }
    ],
    14: [
      {
        sizeCents: 316.98,
        intervalName: 'just minor third',
        justRatio: '6/5',
        justCents: 315.64,
        errorCents: +1.34,
        limit: 5
      }
    ],
    15: [
      {
        sizeCents: 339.62,
        intervalName: 'neutral third (undecimal)',
        justRatio: '11/9',
        justCents: 347.41,
        errorCents: -7.79,
        limit: 11
      },
      {
        sizeCents: 339.62,
        intervalName: 'acute minor third',
        justRatio: '243/200',
        justCents: 337.15,
        errorCents: +2.47,
        limit: 5
      }
    ],
    16: [
      {
        sizeCents: 362.26,
        intervalName: 'grave major third',
        justRatio: '100/81',
        justCents: 364.80,
        errorCents: -2.54,
        limit: 5
      },
      {
        sizeCents: 362.26,
        intervalName: 'neutral third (tridecimal)',
        justRatio: '16/13',
        justCents: 359.47,
        errorCents: +2.79,
        limit: 13
      }
    ],
    17: [
      {
        sizeCents: 384.91,
        intervalName: 'just major third',
        justRatio: '5/4',
        justCents: 386.31,
        errorCents: -1.40,
        limit: 5
      }
    ],
    18: [
      {
        sizeCents: 407.54,
        intervalName: 'Pythagorean ditone',
        justRatio: '81/64',
        justCents: 407.82,
        errorCents: -0.28,
        limit: 3
      }
    ],
    19: [
      {
        sizeCents: 430.19,
        intervalName: 'septimal major third',
        justRatio: '9/7',
        justCents: 435.08,
        errorCents: -4.90,
        limit: 7
      },
      {
        sizeCents: 430.19,
        intervalName: 'just diminished fourth',
        justRatio: '32/25',
        justCents: 427.37,
        errorCents: +2.82,
        limit: 5
      }
    ],
    20: [
      {
        sizeCents: 452.83,
        intervalName: 'just augmented third',
        justRatio: '125/96',
        justCents: 456.99,
        errorCents: -4.16,
        limit: 5
      },
      {
        sizeCents: 452.83,
        intervalName: 'tridecimal augmented third',
        justRatio: '13/10',
        justCents: 454.21,
        errorCents: -1.38,
        limit: 13
      }
    ],
    21: [
      {
        sizeCents: 475.47,
        intervalName: 'grave fourth',
        justRatio: '320/243',
        justCents: 476.54,
        errorCents: -1.07,
        limit: 5
      },
      {
        sizeCents: 475.47,
        intervalName: 'septimal narrow fourth',
        justRatio: '21/16',
        justCents: 470.78,
        errorCents: +4.69,
        limit: 7
      }
    ],
    22: [
      {
        sizeCents: 498.11,
        intervalName: 'perfect fourth',
        justRatio: '4/3',
        justCents: 498.04,
        errorCents: +0.07,
        limit: 3
      }
    ],
    23: [
      {
        sizeCents: 520.76,
        intervalName: 'acute fourth',
        justRatio: '27/20',
        justCents: 519.55,
        errorCents: +1.21,
        limit: 5
      }
    ],
    24: [
      {
        sizeCents: 543.40,
        intervalName: 'undecimal major fourth',
        justRatio: '11/8',
        justCents: 551.32,
        errorCents: -7.92,
        limit: 11
      },
      {
        sizeCents: 543.40,
        intervalName: 'double diminished fifth',
        justRatio: '512/375',
        justCents: 539.10,
        errorCents: +4.30,
        limit: 5
      },
      {
        sizeCents: 543.40,
        intervalName: 'undecimal augmented fourth',
        justRatio: '15/11',
        justCents: 536.95,
        errorCents: +6.45,
        limit: 11
      }
    ],
    25: [
      {
        sizeCents: 566.04,
        intervalName: 'just augmented fourth (lesser tritone)',
        justRatio: '25/18',
        justCents: 568.72,
        errorCents: -2.68,
        limit: 5
      }
    ],
    26: [
      {
        sizeCents: 588.68,
        intervalName: 'lesser "classic" tritone',
        justRatio: '45/32',
        justCents: 590.22,
        errorCents: -1.54,
        limit: 5
      },
      {
        sizeCents: 588.68,
        intervalName: 'septimal tritone',
        justRatio: '7/5',
        justCents: 582.51,
        errorCents: +6.17,
        limit: 7
      }
    ],
    27: [
      {
        sizeCents: 611.32,
        intervalName: 'Pythagorean augmented fourth',
        justRatio: '729/512',
        justCents: 611.73,
        errorCents: -0.41,
        limit: 3
      },
      {
        sizeCents: 611.32,
        intervalName: 'greater "classic" tritone',
        justRatio: '64/45',
        justCents: 609.78,
        errorCents: +1.54,
        limit: 5
      }
    ],
    28: [
      {
        sizeCents: 633.96,
        intervalName: 'just diminished fifth (greater tritone)',
        justRatio: '36/25',
        justCents: 631.28,
        errorCents: +2.68,
        limit: 5
      }
    ],
    30: [
      {
        sizeCents: 679.25,
        intervalName: 'grave fifth',
        justRatio: '40/27',
        justCents: 680.45,
        errorCents: -1.20,
        limit: 5
      }
    ],
    31: [
      {
        sizeCents: 701.89,
        intervalName: 'perfect fifth',
        justRatio: '3/2',
        justCents: 701.96,
        errorCents: -0.07,
        limit: 3
      }
    ],
    36: [
      {
        sizeCents: 815.09,
        intervalName: 'minor sixth',
        justRatio: '8/5',
        justCents: 813.69,
        errorCents: +1.40,
        limit: 5
      }
    ],
    37: [
      {
        sizeCents: 837.73,
        intervalName: 'tridecimal neutral sixth',
        justRatio: '13/8',
        justCents: 840.53,
        errorCents: -2.80,
        limit: 13
      }
    ],
    39: [
      {
        sizeCents: 883.02,
        intervalName: 'major sixth',
        justRatio: '5/3',
        justCents: 884.36,
        errorCents: -1.34,
        limit: 5
      }
    ],
    42: [
      {
        sizeCents: 950.94,
        intervalName: 'just augmented sixth',
        justRatio: '125/72',
        justCents: 955.03,
        errorCents: -4.09,
        limit: 5
      },
      {
        sizeCents: 950.94,
        intervalName: 'just diminished seventh',
        justRatio: '216/125',
        justCents: 946.92,
        errorCents: +4.02,
        limit: 5
      }
    ],
    43: [
      {
        sizeCents: 973.59,
        intervalName: 'accute augmented sixth',
        justRatio: '225/128',
        justCents: 976.54,
        errorCents: -2.95,
        limit: 5
      },
      {
        sizeCents: 973.59,
        intervalName: 'harmonic seventh',
        justRatio: '7/4',
        justCents: 968.83,
        errorCents: +4.76,
        limit: 7
      },
      {
        sizeCents: 973.59,
        intervalName: 'accute diminished seventh',
        justRatio: '17496/10000',
        justCents: 968.43,
        errorCents: +5.16,
        limit: 5
      }
    ],
    44: [
      {
        sizeCents: 996.23,
        intervalName: 'Pythagorean minor seventh',
        justRatio: '16/9',
        justCents: 996.09,
        errorCents: +0.14,
        limit: 3
      }
    ],
    45: [
      {
        sizeCents: 1018.87,
        intervalName: 'just minor seventh',
        justRatio: '9/5',
        justCents: 1017.60,
        errorCents: +1.27,
        limit: 5
      }
    ],
    48: [
      {
        sizeCents: 1086.79,
        intervalName: 'just major seventh',
        justRatio: '15/8',
        justCents: 1088.27,
        errorCents: -1.48,
        limit: 5
      }
    ],
    50: [
      {
        sizeCents: 1132.08,
        intervalName: 'diminished octave',
        justRatio: '48/25',
        justCents: 1129.33,
        errorCents: +2.75,
        limit: 5
      }
    ],
    51: [
      {
        sizeCents: 1154.72,
        intervalName: 'just augmented seventh',
        justRatio: '125/64',
        justCents: 1158.94,
        errorCents: -4.22,
        limit: 5
      }
    ],
    52: [
      {
        sizeCents: 1177.36,
        intervalName: 'grave octave',
        justRatio: '160/81',
        justCents: 1178.49,
        errorCents: -1.14,
        limit: 5
      }
    ],
    53: [
      {
        sizeCents: 1200,
        intervalName: 'perfect octave',
        justRatio: '2/1',
        justCents: 1200,
        errorCents: 0,
        limit: 2
      }
    ]
  },
  CHORD_SPELLINGS: {
    'Pythagorean major':      ['C4', 'E4', 'G4'],
    'Pythagorean minor':      ['C4', 'E♭4', 'G4'],
    'Just major (downmajor)': ['C4', '↓E4', 'G4'],
    'Just minor (upminor)':   ['C4', '↑E♭4', 'G4'],
    'Dominant 7th (down add-7)':    ['C4', '↓E4', 'G4', '↓B♭4'],
    'Otonal tetrad (down7)':        ['C4', '↓E4', 'G4', '↓B♭4'],
    'Utonal tetrad (upminor6)':     ['C4', '↑E♭4', 'G4', '↑A4'],
    'Diminished (updim)':     ['C4', '↑E♭4', 'G♭4'],
    'Diminished (downdim)':   ['C4', '↓E♭4', 'G♭4'],
    'Subminor (downminor)':   ['C4', '↓E♭4', 'G4'],
    'Infra minor':            ['C4', '↓↓E♭4', 'G4'],
    'Supra minor':            ['C4', '↑↑E♭4', 'G4'],
    'Super Major (upmajor)':  ['C4', '↑E4', 'G4'],
    'Ultra Major':            ['C4', '↑↑E4', 'G4'],
    'Sub Minor tetrad (downminor6)':['C4', '↓E♭4', 'G4', '↓A4'],
    'Super Major tetrad (up7)':     ['C4', '↑E4', 'G4', '↑B♭4'],
    'Augmented (downaug)':    ['C4', '↓E4', '↓↓G♯4'],
    'Orwell':                 ['C4', '↓E4', '↓↓G4', '↑A4'],
  },
}; 