import { SETTINGS_53_EDO, SETTINGS_31_EDO } from '../settings/tuningTypes';

// Display currently played notes
export function updateChordDisplay(notes: number[]): void {
  const display = document.getElementById('chord-display');
  if (!display) return;

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
    const chordResult = recognizeChord(notes, tuningSystem, equivSteps);
    
    if (chordResult) {
      const inversionText = chordResult.inversion > 0 ? ` (${chordResult.inversion}${getOrdinalSuffix(chordResult.inversion)} inv)` : '';
      const additionalText = chordResult.additionalIntervals && chordResult.additionalIntervals.length > 0 
        ? ` + ${chordResult.additionalIntervals.join(', ')}` 
        : '';
      
      // Use either full name or symbol based on settings
      const chordName = settings.useSymbolicChordNotation ? chordResult.symbol : chordResult.fullName;
      display.textContent = `${chordName}${inversionText}${additionalText}`;
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
  return steps.slice(1).map(step => {
    let interval = step - root;
    if (interval < 0) interval += (tuningSystem === SETTINGS_31_EDO ? 31 : 53);
    return interval;
  });
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

function findChordInNotes(notes: number[], tuningSystem: typeof SETTINGS_53_EDO | typeof SETTINGS_31_EDO, totalSteps: number): ChordResult | null {
  if (notes.length < 2) return null;

  const bassNote = notes[0];
  
  // For chord pattern matching, we still need to work with reduced notes
  const uniqueNotes = [...new Set(notes.map(n => ((n % totalSteps) + totalSteps) % totalSteps))];
  const sortedNotes = [...uniqueNotes].sort((a, b) => a - b);
  
  let bestResult: ChordResult | null = null;
  let bestScore = -Infinity;

  // Group chord spellings by number of notes
  const spellingsBySize = new Map<number, Array<[string, any]>>();
  for (const [quality, spelling] of Object.entries(tuningSystem.CHORD_SPELLINGS)) {
    const pattern = Array.isArray(spelling) ? spelling : spelling.spelling;
    const size = pattern.length;
    if (!spellingsBySize.has(size)) {
      spellingsBySize.set(size, []);
    }
    spellingsBySize.get(size)!.push([quality, spelling]);
  }

  // Sort sizes in descending order, but not larger than number of unique notes
  const sortedSizes = Array.from(spellingsBySize.keys())
    .filter(size => size <= uniqueNotes.length)
    .sort((a, b) => b - a);

  // Try each note as potential root
  for (let i = 0; i < sortedNotes.length; i++) {
    const potentialRoot = sortedNotes[i];
    
    // Calculate intervals from this potential root
    const intervals = [];
    for (let j = 0; j < sortedNotes.length; j++) {
      if (j !== i) {
        let interval = ((sortedNotes[j] - potentialRoot + totalSteps) % totalSteps);
        intervals.push(interval);
      }
    }

    // Try each chord size in descending order
    for (const size of sortedSizes) {
      const spellingsOfSize = spellingsBySize.get(size) || [];
      
      // Try each chord quality of this size
      for (const [quality, spelling] of spellingsOfSize) {
        const pattern = Array.isArray(spelling) ? 
          getChordPattern(spelling, tuningSystem) : 
          getChordPattern(spelling.spelling, tuningSystem);
        
        const sortedPattern = [...pattern].sort((a, b) => a - b);
        const sortedIntervals = [...intervals].sort((a, b) => a - b);
        
        const triadMatch = sortedPattern.every(patternInterval => 
          sortedIntervals.includes(patternInterval));

        if (triadMatch) {
          // Calculate chord tones
          const chordTones = [potentialRoot];
          for (const interval of pattern) {
            let tone = (potentialRoot + interval) % totalSteps;
            chordTones.push(tone);
          }

          // Find the actual root note in the original notes array
          const rootNote = notes.find(n => n % totalSteps === potentialRoot);
          if (!rootNote) continue; // Skip if root isn't in original notes

          // Determine inversion
          let inversion = 0;
          const bassPosition = chordTones.indexOf(bassNote % totalSteps);
          if (bassPosition > 0) {
            inversion = bassPosition;
          }

          // Find additional intervals
          const chordIntervals = new Set(sortedPattern);
          const additionalIntervals = sortedIntervals
            .filter(interval => !chordIntervals.has(interval))
            .map(interval => getIntervalName(interval, tuningSystem))
            .filter((name): name is string => name !== null);

          const result = {
            root: rootNote.toString(),
            quality: Array.isArray(spelling) ? quality : spelling.symbol.replace(/^C/, ''),
            fullName: Array.isArray(spelling) ? quality : quality.replace(/^C/, ''),
            inversion,
            additionalIntervals: additionalIntervals,
            symbol: Array.isArray(spelling) ? rootNote.toString() + quality : rootNote.toString() + spelling.symbol.replace(/^C/, '')
          };

          // Score based on actual MIDI note distances and chord completeness
          let score = 0;
          
          // Bonus for larger chords
          score += size * 20;
          
          // Bonus for exact matches (no additional intervals)
          if (additionalIntervals.length === 0) {
            score += 50;
          }
          
          // Prefer roots that are closer to the bass note in actual MIDI distance
          score -= Math.abs(rootNote - notes[0]);
          
          // Penalty for additional intervals
          score -= additionalIntervals.length * 10;

          if (score > bestScore) {
            bestResult = result;
            bestScore = score;
          }
        }
      }
      
      // If we found a match at this size with no additional intervals, we can stop
      if (bestResult && bestResult.additionalIntervals?.length === 0) {
        break;
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