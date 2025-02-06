import { AccidentalStep, AccidentalSystem, ACCIDENTAL_SYSTEMS } from '../settings/tuningTypes';

// Convert a symbol to its corresponding step value
export function symbolToStep(symbol: string): AccidentalStep | null {
    for (const system of ACCIDENTAL_SYSTEMS) {
        for (const [step, sym] of Object.entries(system.symbols)) {
            if (sym === symbol) {
                return parseInt(step) as AccidentalStep;
            }
        }
    }
    return null;
}

// Convert a step value to its symbol in the specified notation system
export function stepToSymbol(step: AccidentalStep, systemName: string): string {
    const system = ACCIDENTAL_SYSTEMS.find(s => s.name === systemName);
    if (!system) return '';
    
    // Only access valid step values that exist in the symbols object
    if (step in system.symbols) {
        return system.symbols[step as keyof typeof system.symbols] || '';
    }
    return '';
}

// Convert a note name with accidentals from one system to another
export function convertNoteNameToSystem(noteName: string, toSystem: string): string {    
    // First convert ASCII accidentals to unicode
    const withUnicode = noteName
        .replace(/b/g, '♭')
        .replace(/#/g, '♯');
    
    // Find accidental in any system
    const fromSystemDef = ACCIDENTAL_SYSTEMS.find(s => Object.values(s.symbols).some(symbol => withUnicode.includes(symbol)));
    const toSystemDef = ACCIDENTAL_SYSTEMS.find(s => s.name === toSystem);
    if (!fromSystemDef || !toSystemDef) return withUnicode; // Return with unicode but unconverted if systems not found

    // Find the base note (first A-G character)
    const baseNoteMatch = withUnicode.match(/[A-G]/);
    if (!baseNoteMatch) return withUnicode;

    const baseNoteIndex = baseNoteMatch.index!;
    const baseNote = withUnicode[baseNoteIndex];
    const prefix = withUnicode.slice(0, baseNoteIndex);
    const suffix = withUnicode.slice(baseNoteIndex + 1);

    // Function to find the longest matching symbol in a system
    const findLongestMatch = (str: string, system: AccidentalSystem): { symbol: string; step: AccidentalStep } | null => {
        let longestMatch = { symbol: '', step: AccidentalStep.NATURAL };
        let maxLength = 0;

        for (const [stepStr, symbol] of Object.entries(system.symbols)) {
            const step = parseInt(stepStr) as AccidentalStep;
            if (str.startsWith(symbol) && symbol.length > maxLength) {
                maxLength = symbol.length;
                longestMatch = { symbol, step };
            }
        }
        return maxLength > 0 ? longestMatch : null;
    };

    // Parse all accidentals in sequence
    const parseAccidentals = (str: string, system: AccidentalSystem): { steps: AccidentalStep[]; remaining: string } => {
        const steps: AccidentalStep[] = [];
        let remaining = str;

        while (remaining.length > 0) {
            const match = findLongestMatch(remaining, system);
            if (!match) break;
            steps.push(match.step);
            remaining = remaining.slice(match.symbol.length);
        }
        return { steps, remaining };
    };

    // Parse prefix and suffix accidentals
    const prefixResult = parseAccidentals(prefix, fromSystemDef);
    const suffixResult = parseAccidentals(suffix, fromSystemDef);
    
    // Combine all steps and calculate net step
    const allSteps = [...prefixResult.steps, ...suffixResult.steps];
    
    // Calculate net step with proper type handling
    let netStep = allSteps.reduce((sum: number, step: AccidentalStep) => sum + step, 0);
    
    // Clamp the net step to valid AccidentalStep values
    netStep = Math.max(AccidentalStep.DOWN4, Math.min(AccidentalStep.UP4, netStep)) as AccidentalStep;

    // Convert to new system's symbol, with type safety
    const validStep = netStep as keyof typeof toSystemDef.symbols;
    const newSymbol = validStep in toSystemDef.symbols ? toSystemDef.symbols[validStep] : null;
    
    return newSymbol ? baseNote + newSymbol : withUnicode;
}

// Get the display text for a notation system (for the dropdown)
export function getNotationSystemDisplay(system: AccidentalSystem): string {
    return `${system.name} (${system.symbols[AccidentalStep.UP1]}, ${system.symbols[AccidentalStep.DOWN1]}, ${system.symbols[AccidentalStep.UP2]}, ${system.symbols[AccidentalStep.DOWN2]})`;
} 