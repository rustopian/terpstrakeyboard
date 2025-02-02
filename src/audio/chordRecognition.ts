import { SETTINGS_53_EDO, SETTINGS_31_EDO } from '../settings/tuningTypes';

// Display currently played notes
export function updateChordDisplay(notes: number[]): void {
  const display = document.getElementById('chord-display');
  if (!display) {
    console.log('[DEBUG] Display element not found');
    return;
  }

  if (notes.length === 0) {
    display.style.display = 'none';
    return;
  }

  const settings = (window as any).settings;
  const equivSteps = settings.enum ? settings.equivSteps : settings.scale.length;

  display.style.display = 'block';
  display.textContent = '';  // Clear previous content

  // Show intervals for 2 notes if the setting is enabled
  if (notes.length === 2 && settings.showIntervals) {
    const interval = Math.abs((notes[1] - notes[0] + equivSteps) % equivSteps);
    display.textContent = `${interval} steps`;
  }

  // Try to recognize the chord if we have more than one note
  if (notes.length > 1) {
    // Determine which tuning system to use based on the number of steps
    const tuningSystem = equivSteps === 31 ? SETTINGS_31_EDO : SETTINGS_53_EDO;
    console.log(`[DEBUG] Using tuning system: ${equivSteps === 31 ? '31-EDO' : '53-EDO'}`);
    
    const chordResult = recognizeChord(notes, tuningSystem, equivSteps);
    console.log('[DEBUG] Chord recognition result:', chordResult);
    
    if (chordResult) {
      const inversionText = chordResult.inversion > 0 ? ` (${chordResult.inversion}${getOrdinalSuffix(chordResult.inversion)} inv)` : '';
      const additionalText = chordResult.additionalIntervals && chordResult.additionalIntervals.length > 0 
        ? ` + ${chordResult.additionalIntervals.join(', ')}` 
        : '';
      
      // Use either full name or symbol based on settings
      const chordName = settings.useSymbolicChordNotation ? chordResult.symbol : chordResult.fullName;
      const finalText = `${chordName}${inversionText}${additionalText}`;
      console.log('[DEBUG] Setting display text to:', finalText);
      display.textContent = finalText;
    } else {
      console.log('[DEBUG] No chord result returned');
    }
  }
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
  const intervalData = tuningSystem.INTERVAL_DICT[interval];
  if (!intervalData || intervalData.length === 0) return null;
  return intervalData[0].intervalName;
}

function recognizeChord(notes: number[], tuningSystem: typeof SETTINGS_53_EDO | typeof SETTINGS_31_EDO, totalSteps: number): ChordResult | null {
  if (notes.length < 2) return null;

  // Sort by actual pitch and get the lowest 3-4 notes
  const sortedNotes = [...notes].sort((a, b) => a - b);
  const baseNotes = sortedNotes.slice(0, Math.min(4, notes.length));
  
  // Try with base notes first
  let result = findChordInNotes(baseNotes, tuningSystem, totalSteps);
  
  // If no result with base notes and we have more notes, try with all notes
  if (!result && baseNotes.length < notes.length) {
    result = findChordInNotes(notes, tuningSystem, totalSteps);
  }
  
  return result;
}

// Add this new function to convert step numbers back to note names
function getNoteName(step: number, tuningSystem: typeof SETTINGS_53_EDO | typeof SETTINGS_31_EDO): string {
  const settings = (window as any).settings;
  if (!settings || !settings.names) return '';
  
  // Get the note name from settings.names array
  const normalizedStep = ((step % settings.scale.length) + settings.scale.length) % settings.scale.length;
  return settings.names[normalizedStep] || '';
}

function findChordInNotes(notes: number[], tuningSystem: typeof SETTINGS_53_EDO | typeof SETTINGS_31_EDO, totalSteps: number): ChordResult | null {
  if (notes.length < 2) return null;

  const bassNote = notes[0];
  
  // For chord pattern matching, normalize all notes to within one octave
  const uniqueNotes = [...new Set(notes.map(n => ((n % totalSteps) + totalSteps) % totalSteps))];
  const sortedNotes = [...uniqueNotes].sort((a, b) => a - b);
  
  if (notes.length === 3) {
    console.log(`[DEBUG] Triad detected - Notes: ${notes.join(', ')} (normalized: ${sortedNotes.join(', ')})`);
  }

  let bestResult: ChordResult | null = null;
  let bestScore = -Infinity;

  // Try each note as potential root
  for (let i = 0; i < sortedNotes.length; i++) {
    const potentialRoot = sortedNotes[i];
    
    // Calculate intervals from this root to all other notes
    const intervals = sortedNotes
      .filter((_, idx) => idx !== i)
      .map(note => {
        let interval = note - potentialRoot;
        // Normalize to positive interval within one octave
        while (interval < 0) interval += totalSteps;
        interval = interval % totalSteps;
        return interval;
      })
      .sort((a, b) => a - b);

    if (notes.length === 3) {
      console.log(`[DEBUG] Testing root ${potentialRoot} - Raw intervals: ${intervals.join(', ')}`);
    }

    // Try each chord spelling from the tuning system
    for (const [chordName, spelling] of Object.entries(tuningSystem.CHORD_SPELLINGS)) {
      const pattern = Array.isArray(spelling) ? 
        getChordPattern(spelling, tuningSystem) : 
        getChordPattern(spelling.spelling, tuningSystem);

      // Sort the pattern for comparison
      const sortedPattern = [...pattern].sort((a, b) => a - b);

      // Check if our intervals match this chord pattern
      if (intervals.length === sortedPattern.length && 
          intervals.every((interval, idx) => interval === sortedPattern[idx])) {
        
        const rootNoteName = getNoteName(potentialRoot, tuningSystem);
        const symbol = Array.isArray(spelling) ? 
          `${rootNoteName} ${chordName}` : 
          rootNoteName + spelling.symbol.replace(/^C/, '');

        // Calculate inversion
        const inversion = potentialRoot === bassNote ? 0 : 
                        bassNote === sortedNotes[(i + 1) % sortedNotes.length] ? 1 : 
                        bassNote === sortedNotes[(i + 2) % sortedNotes.length] ? 2 : 3;

        const result = {
          root: rootNoteName,
          quality: chordName,
          fullName: `${rootNoteName} ${chordName}`,
          inversion,
          additionalIntervals: [],
          symbol
        };

        // Score based on number of notes matched and inversion
        let score = pattern.length * 20;
        score -= inversion * 5;  // Prefer root position slightly

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