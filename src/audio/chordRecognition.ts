import { SETTINGS_53_EDO, SETTINGS_31_EDO } from '../settings/tuningTypes';

// Display currently played notes
export function updateChordDisplay(notes: number[]): void {
  const display = document.getElementById('chord-display');
  if (!display) return;

  display.style.display = notes.length ? 'block' : 'none';
  if (!notes.length) return;

  const settings = (window as any).settings;
  const equivSteps = settings.enum ? settings.equivSteps : settings.scale.length;
  const tuningSystem = equivSteps === 31 ? SETTINGS_31_EDO : SETTINGS_53_EDO;
  
  const chordResult = recognizeChord(notes, tuningSystem, equivSteps);
  display.textContent = formatChordResult(chordResult, notes, settings);
}

function formatChordResult(result: ChordResult | null, notes: number[], settings: any): string {
  if (!result) return '';
  
  const bassNote = Math.min(...notes);
  const bassName = getNoteName(bassNote);
  const rootName = result.root;

  // Handle slash notation
  const inversionSlash = bassName !== rootName ? `/${bassName}` : '';
  
  // Format additional intervals
  const additions = result.additionalIntervals?.length 
    ? ` + ${result.additionalIntervals.join(', ')}`
    : '';

  // Choose between symbolic or full name display
  const chordName = settings.useFullChordNotation 
    ? result.fullName 
    : result.symbol;

  return `${chordName}${inversionSlash}${additions}`;
}

interface ChordResult {
  root: string;
  quality: string;
  fullName: string;  // Added this field for the full quality name
  inversion: number;
  additionalIntervals?: string[];
  symbol: string;
}

// Convert a note name (like 'Eb4' or '↓↓G4') to its step number using NATURAL_NOTE_STEPS and MODIFIER_STEPS
function noteNameToSteps(noteName: string, tuningSystem: typeof SETTINGS_53_EDO | typeof SETTINGS_31_EDO): number {
  // Remove octave number
  const baseNoteName = noteName.replace(/\d+$/, '');
  
  // Find the base note letter (first occurrence of A-G)
  const baseNoteMatch = baseNoteName.match(/[A-G]/);
  if (!baseNoteMatch) {
    console.warn('No base note found in:', noteName);
    return 0;
  }
  
  // Split into prefix, base note, and suffix
  const baseNoteIndex = baseNoteMatch.index!;
  const prefix = baseNoteName.slice(0, baseNoteIndex); // e.g., '↓↓'
  const baseNote = baseNoteName[baseNoteIndex]; // e.g., 'G'
  const suffix = baseNoteName.slice(baseNoteIndex + 1); // e.g., '♭'
  
  // Get the base note value
  const baseValue = tuningSystem.NATURAL_NOTE_STEPS[baseNote];
  if (baseValue === undefined) {
    console.warn('Unknown base note:', baseNote, 'in', noteName);
    return 0;
  }
  
  // Add up all modifiers (both prefix and suffix)
  let modifierValue = 0;
  
  // Handle prefix modifiers (↑, ↓, ↑↑, ↓↓)
  if (prefix) {
    const prefixValue = tuningSystem.MODIFIER_STEPS[prefix];
    if (prefixValue !== undefined) {
      modifierValue += prefixValue;
    }
  }
  
  // Handle suffix modifiers (♭, ♯, b, #)
  if (suffix) {
    const suffixValue = tuningSystem.MODIFIER_STEPS[suffix];
    if (suffixValue !== undefined) {
      modifierValue += suffixValue;
    }
  }
  
  return baseValue + modifierValue;
}

// Convert a chord spelling to its interval pattern
function getChordPattern(spelling: string[], tuningSystem: typeof SETTINGS_53_EDO | typeof SETTINGS_31_EDO): number[] {
  const steps = spelling.map(note => noteNameToSteps(note, tuningSystem));
  const root = steps[0];
  const pattern = steps.slice(1).map(step => {
    let interval = step - root;
    while (interval < 0) interval += (tuningSystem === SETTINGS_31_EDO ? 31 : 53);
    interval = interval % (tuningSystem === SETTINGS_31_EDO ? 31 : 53);
    return interval;
  });
  return pattern;
}

function getIntervalName(interval: number, tuningSystem: typeof SETTINGS_53_EDO | typeof SETTINGS_31_EDO): string | null {
  const settings = (window as any).settings;
  const intervalData = tuningSystem.INTERVAL_DICT[interval];
  if (!intervalData || intervalData.length === 0) return null;

  // Use symbolic notation if enabled and available
  if (settings?.useFullChordNotation) {
    return intervalData[0].intervalName;
  }
  return intervalData[0].intervalSymbol || intervalData[0].intervalName;
}

function recognizeChord(notes: number[], tuningSystem: typeof SETTINGS_53_EDO | typeof SETTINGS_31_EDO, totalSteps: number): ChordResult | null {
  if (notes.length < 2) return null;

  // Always check all notes together - removed baseNotes limitation
  return findChordInNotes(notes, tuningSystem, totalSteps);
}

// Add this new function to convert step numbers back to note names
function getNoteName(step: number): string {
  const settings = (window as any).settings;
  if (!settings || !settings.names) return '';
  
  // Get the note name from settings.names array
  const normalizedStep = ((step % settings.scale.length) + settings.scale.length) % settings.scale.length;
  return settings.names[normalizedStep] || '';
}

function findChordInNotes(notes: number[], tuningSystem: typeof SETTINGS_53_EDO | typeof SETTINGS_31_EDO, totalSteps: number): ChordResult | null {
  if (notes.length < 2) return null;

  const bassNote = notes[0];
  const uniqueNotes = [...new Set(notes.map(n => ((n % totalSteps) + totalSteps) % totalSteps))];
  const sortedNotes = [...uniqueNotes].sort((a, b) => a - b);
  
  let bestResult: ChordResult | null = null;
  let bestScore = -Infinity;

  // Get chord entries sorted by size (largest first)
  const chordEntries = Object.entries(tuningSystem.CHORD_SPELLINGS)
    .sort((a, b) => {
      const aSize = Array.isArray(a[1]) ? a[1].length : a[1].spelling.length;
      const bSize = Array.isArray(b[1]) ? b[1].length : b[1].spelling.length;
      return bSize - aSize;
    });

  // Check all possible roots and chord types
  for (const [chordName, spelling] of chordEntries) {
    const pattern = Array.isArray(spelling) ? 
      getChordPattern(spelling, tuningSystem) : 
      getChordPattern(spelling.spelling, tuningSystem);

    // Skip chords that require more notes than we have
    if (pattern.length + 1 > notes.length) continue;

    for (const potentialRoot of sortedNotes) {
      // Get all intervals from this root
      const intervalsFromRoot = sortedNotes.map(n => 
        normalizeInterval(n - potentialRoot, totalSteps)
      );

      // Check if chord intervals exist in played notes
      const requiredIntervals = [0, ...pattern];
      const hasChordIntervals = requiredIntervals.every(ri => 
        intervalsFromRoot.includes(ri)
      );

      if (hasChordIntervals) {
        // Find which notes are part of the chord
        const chordNotes = sortedNotes.filter(n => 
          requiredIntervals.includes(normalizeInterval(n - potentialRoot, totalSteps))
        );
        
        // Get remaining notes (actual additional intervals)
        const remainingNotes = sortedNotes.filter(n => 
          !chordNotes.includes(n)
        );

        // Get actual bass note (lowest played note in original input)
        const actualBassNote = Math.min(...notes.map(n => ((n % totalSteps) + totalSteps) % totalSteps));
        
        // Exclude bass note from additional intervals regardless of octave
        const remainingNotesWithoutBass = remainingNotes.filter(n => 
          ((n % totalSteps) + totalSteps) % totalSteps !== actualBassNote
        );

        // Calculate inversion
        const inversion = chordNotes.indexOf(potentialRoot);
        
        // Build result
        const rootNoteName = getNoteName(potentialRoot);
        const symbol = Array.isArray(spelling) ? 
          `${rootNoteName} ${chordName}` : 
          rootNoteName + spelling.symbol.replace(/^C/, '');

        const settings = (window as any).settings;
        const additionalIntervals = remainingNotesWithoutBass.map(n => {
          const interval = normalizeInterval(n - potentialRoot, totalSteps);
          const name = getIntervalName(interval, tuningSystem);
          return name || `${interval}${settings?.useFullChordNotation ? 'steps' : ''}`;
        });

        const result: ChordResult = {
          root: rootNoteName,
          quality: chordName,
          fullName: `${rootNoteName} ${chordName}`,
          inversion: inversion > 0 ? inversion : 0,
          additionalIntervals: additionalIntervals.length > 0 ? additionalIntervals : undefined,
          symbol
        };

        // Score based on:
        // 1. Chord size (most important)
        // 2. Number of remaining notes (fewer is better)
        // 3. Root position bonus
        const score = 
          (pattern.length * 10000) + 
          ((notes.length - remainingNotes.length) * 1000) + 
          (inversion === 0 ? 100 : 0);

        if (score > bestScore) {
          bestScore = score;
          bestResult = result;
        }
      }
    }
  }

  return bestResult;
}

function getOrdinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

function normalizeInterval(interval: number, totalSteps: number): number {
  while (interval < 0) interval += totalSteps;
  return interval % totalSteps;
}

function getIntervalsBetweenNotes(notes: number[], root: number, totalSteps: number): number[] {
  return notes
    .filter(note => note !== root)
    .map(note => normalizeInterval(note - root, totalSteps))
    .sort((a, b) => a - b);
}

function findBestChordSubset(notes: number[], root: number, pattern: number[], totalSteps: number): number[] {
  const result: number[] = [root];
  const remainingNotes = new Set(notes.filter(n => n !== root));
  
  for (const patternInterval of pattern) {
    let bestNote: number | null = null;
    let bestDistance = Infinity;
    
    for (const note of remainingNotes) {
      const interval = normalizeInterval(note - root, totalSteps);
      const distance = Math.abs(interval - patternInterval);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestNote = note;
      }
    }
    
    if (bestNote !== null && bestDistance === 0) {
      result.push(bestNote);
      remainingNotes.delete(bestNote);
    }
  }
  
  return result;
} 