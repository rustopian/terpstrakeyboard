import { SETTINGS_53_EDO } from './tuningTypes';

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
  
  // Get note names using the same logic as hex labels
  const noteNames = notes.map(note => {
    // Subtract 7 steps from each note
    const adjustedNote = note - 7;
    let reducedNote = adjustedNote % equivSteps;
    if (reducedNote < 0) {
      reducedNote = equivSteps + reducedNote;
    }
    return settings.names[reducedNote];
  });

  // Try to recognize chord if we have multiple notes
  if (notes.length >= 2) {
    const chordResult = recognizeChord(notes.map(n => n - 7));
    if (chordResult) {
      let displayText = `${chordResult.root} ${chordResult.quality}`;
      if (chordResult.inversion > 0) {
        displayText += ` (${chordResult.inversion}${getOrdinalSuffix(chordResult.inversion)} inv)`;
      }
      if (chordResult.additionalIntervals && chordResult.additionalIntervals.length > 0) {
        displayText += ` + ${chordResult.additionalIntervals.join(' + ')}`;
      }
      display.textContent = displayText;
    } else {
      display.textContent = noteNames.join(' ');
    }
  } else {
    display.textContent = noteNames[0];
  }
  display.style.display = 'block';
}

interface ChordResult {
  root: string;
  quality: string;
  inversion: number;
  additionalIntervals?: string[];
}

// Convert a note name (like 'Eb4' or '↓↓G4') to its step number using NATURAL_NOTE_STEPS and MODIFIER_STEPS
function noteNameToSteps(noteName: string): number {
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
  const baseValue = SETTINGS_53_EDO.NATURAL_NOTE_STEPS[baseNote];
  if (baseValue === undefined) {
    console.warn('Unknown base note:', baseNote, 'in', noteName);
    return 0;
  }
  
  // Add up all modifiers (both prefix and suffix)
  let modifierValue = 0;
  
  // Handle prefix modifiers (↑, ↓, ↑↑, ↓↓)
  if (prefix) {
    const prefixValue = SETTINGS_53_EDO.MODIFIER_STEPS[prefix];
    if (prefixValue !== undefined) {
      modifierValue += prefixValue;
    }
  }
  
  // Handle suffix modifiers (♭, ♯, b, #)
  if (suffix) {
    const suffixValue = SETTINGS_53_EDO.MODIFIER_STEPS[suffix];
    if (suffixValue !== undefined) {
      modifierValue += suffixValue;
    }
  }
  
  console.log('Note name to steps:', {
    noteName,
    prefix,
    baseNote,
    suffix,
    baseValue,
    modifierValue,
    total: baseValue + modifierValue
  });
  
  return baseValue + modifierValue;
}

// Convert a chord spelling to its interval pattern
function getChordPattern(spelling: string[]): number[] {
  const steps = spelling.map(noteNameToSteps);
  const root = steps[0];
  return steps.slice(1).map(step => {
    let interval = step - root;
    if (interval < 0) interval += 53;
    return interval;
  });
}

function getIntervalName(interval: number): string | null {
  const intervalData = SETTINGS_53_EDO.INTERVAL_DICT[interval];
  if (!intervalData || intervalData.length === 0) return null;
  return intervalData[0].intervalName;
}

function recognizeChord(notes: number[]): ChordResult | null {
  if (notes.length < 2) return null;

  // Sort and reduce notes to within one octave, removing duplicates
  const uniqueNotes = [...new Set(notes.map(n => n % 53))];
  const sortedNotes = [...uniqueNotes].sort((a, b) => a - b);

  let bestResult: ChordResult | null = null;

  // Try each note as potential root
  for (let i = 0; i < sortedNotes.length; i++) {
    const potentialRoot = sortedNotes[i];
    
    // Calculate intervals from this potential root
    const intervals = [];
    for (let j = 0; j < sortedNotes.length; j++) {
      if (j !== i) {  // Skip the root note itself
        let interval = sortedNotes[j] - potentialRoot;
        if (interval < 0) interval += 53;
        intervals.push(interval);
      }
    }

    // Get root note name
    let reducedRoot = potentialRoot % 53;
    if (reducedRoot < 0) reducedRoot += 53;
    const rootName = (window as any).settings.names[reducedRoot];

    console.log('Trying root:', {
      potentialRoot,
      rootName,
      intervals
    });

    // Convert each chord spelling to its interval pattern and compare
    for (const [quality, spelling] of Object.entries(SETTINGS_53_EDO.CHORD_SPELLINGS)) {
      const pattern = getChordPattern(spelling);
      
      // Sort both interval arrays for comparison
      const sortedPattern = [...pattern].sort((a, b) => a - b);
      const sortedIntervals = [...intervals].sort((a, b) => a - b);
      
      // First try to find a basic triad match
      const triadMatch = sortedPattern.every(patternInterval => 
        sortedIntervals.includes(patternInterval));

      if (triadMatch) {
        // We found a basic chord match
        const result = {
          root: rootName,
          quality,
          inversion: i,
          additionalIntervals: [] as string[]
        };

        // If we found a match with a lower inversion number, or this is our first match
        if (!bestResult || i < bestResult.inversion) {
          // Now look for additional intervals above this specific chord
          const chordIntervals = new Set(sortedPattern);
          const additionalIntervals = sortedIntervals
            .filter(interval => !chordIntervals.has(interval))
            .map(interval => getIntervalName(interval))
            .filter((name): name is string => name !== null);

          if (additionalIntervals.length > 0) {
            result.additionalIntervals = additionalIntervals;
          }

          bestResult = result;
          console.log('Found better match:', {
            quality,
            inversion: i,
            additionalIntervals
          });
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