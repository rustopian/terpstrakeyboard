// Import audio functions
import { initAudio, loadInstrumentSamples } from './audio/audioHandler';

// Import event handling functions
import { initEventHandlers } from './ui/eventHandler';

// Import hex utility functions
import { initHexUtils } from './grid/hexUtils';

// Import display utility functions
import { initDisplayUtils, drawGrid } from './grid/displayUtils';

// Import types and settings
import { Settings } from './settings/Settings';
import { defaultSettings } from './settings/Settings';

// Import query data parser
import { QueryData } from './core/QueryData';

// Import scroll manager
import { ScrollManager } from './ui/ScrollManager';

// Import settings manager
import { SettingsManager } from './settings/SettingsManager';
import { SETTINGS_31_EDO } from './settings/tuningTypes';

// Add WebMidi types
declare global {
  interface Window {
    settings: Settings;
    back: () => void;
    changeURL: () => void;
    noPreset: () => void;
    hideRevealColors: () => void;
    hideRevealNames: () => void;
    hideRevealEnum: () => void;
    WebMidi: {
      enable: () => Promise<void>;
      disable: () => void;
      enabled: boolean;
      outputs: WebMidiOutput[];
      getOutputByName: (name: string) => WebMidiOutput;
    };
    updateColorVisionMode: () => void;
    updateColorSaturation: () => void;
    updateKeyboardDisplay: () => void;
    settingsManager: SettingsManager;
  }

  interface WebMidiOutput {
    name: string;
    sendAllSoundOff: () => void;
    playNote: (note: number, channels: number[]) => void;
    stopNote: (note: number, channels: number[]) => void;
  }

  interface HTMLOptGroupElement extends HTMLElement {
    label: string;
  }
}

// Global variables
let settings: Settings = { ...defaultSettings };
const settingsManager = new SettingsManager();

// Initialize settings from manager
settings = settingsManager.getSettings();

// Initialize scroll manager instance
let scrollManager: ScrollManager | null = null;

// Get query data
const getData = new QueryData();

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[DEBUG] Starting DOMContentLoaded initialization...");
    
    // Initialize settings manager first
    window.settingsManager = new SettingsManager();
    settings = settingsManager.getSettings();

    // Hide settings dialog and landing page immediately
    console.log("[DEBUG] Hiding settings dialog and landing page...");
    const landingPage = document.getElementById("landing-page");
    const overlay = document.querySelector('.modal-overlay');
    const settingsButton = document.getElementById('settings-button');
    
    if (landingPage) landingPage.style.display = "none";
    if (overlay) overlay.classList.remove('active');
    if (settingsButton) settingsButton.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Initialize custom select for notation system
    const notationSelect = document.getElementById('notation-system') as HTMLSelectElement;
    if (notationSelect) {
        // Get notation system from URL or use default
        const urlParams = new URLSearchParams(window.location.search);
        const notationSystem = urlParams.get('notationSystem') || 'Standard';
        notationSelect.value = notationSystem;
        settings.notationSystem = notationSystem;
        console.log("[DEBUG] Initial notation system:", notationSystem);
    }

    // Show keyboard element immediately
    console.log("[DEBUG] Showing keyboard element...");
    const keyboard = document.getElementById("keyboard");
    if (keyboard) {
        keyboard.style.display = "block";
        keyboard.style.visibility = "visible";
        keyboard.style.opacity = "1";
        console.log("[DEBUG] Keyboard element shown");
    } else {
        console.error("[DEBUG] Could not find keyboard element!");
    }

    // Initialize canvas and context first
    console.log("[DEBUG] Initializing canvas...");
    try {
        settingsManager.initializeCanvas();
        settings = settingsManager.getSettings();
    } catch (error) {
        console.error("[DEBUG] Error initializing canvas:", error);
    }

    // Load presets BEFORE initializing hex utils and display utils
    console.log("[DEBUG] Loading presets...");
    try {
        await settingsManager.loadPresets();
        console.log("[DEBUG] Presets loaded successfully");
    } catch (error) {
        console.error("[DEBUG] Error loading presets:", error);
        // Don't show settings on error, just log it
    }

    // Apply URL parameters or default preset
    console.log("[DEBUG] Applying settings from URL or default preset...");
    if (window.location.search) {
        console.log("[DEBUG] URL parameters found, applying preset...");
        // Apply preset from URL parameters
        const presetId = getData.preset ? parseInt(getData.preset) : 16;  // Default to 16 if not specified
        console.log("[DEBUG] Using preset ID:", presetId);
        try {
            settingsManager.checkPreset(presetId);
            settings = settingsManager.getSettings();
            console.log("[DEBUG] Settings updated from preset");
        } catch (error) {
            console.error("[DEBUG] Error applying preset:", error);
            // Don't show settings on error, just log it
        }
    } else {
        console.log("[DEBUG] No URL parameters, loading default preset...");
        // No URL parameters, load default preset
        const mselect = document.getElementById('quicklinks') as HTMLSelectElement;
        if (mselect) {
            // Find and select the Lumatone preset
            for (let i = 0; i < mselect.options.length; i++) {
                if (mselect.options[i].text === "31-ed2 Lumatone") {
                    mselect.selectedIndex = i;
                    // Apply the preset
                    try {
                        const parameters = JSON.parse(mselect.value);
                        settingsManager.updateFromPreset(parameters);
                        settings = settingsManager.getSettings();
                        console.log("[DEBUG] Default preset applied successfully");
                    } catch (error) {
                        console.error("[DEBUG] Error applying default preset:", error);
                        // Don't show settings on error, just log it
                    }
                    break;
                }
            }
        }
    }

    // Initialize hex utilities with settings from preset
    console.log("[DEBUG] Initializing hex utilities...");
    initHexUtils(settings);
    
    // Initialize display utilities
    console.log("[DEBUG] Initializing display utilities...");
    initDisplayUtils(settings);
    
    // Initialize audio system - but don't try to start it yet
    console.log("[DEBUG] Creating audio context...");
    const ctx = await initAudio();
    if (ctx) {
        settings.audioContext = ctx;
        console.log("[DEBUG] Audio context created in suspended state:", ctx.state);
    }

    // Add user interaction handler to start audio
    console.log("[DEBUG] Setting up user interaction handler for audio...");
    const startAudioHandler = async () => {
        console.log("[DEBUG] User interaction detected, starting audio...");
        if (settings.audioContext && settings.audioContext.state === 'suspended') {
            try {
                await settings.audioContext.resume();
                console.log("[DEBUG] Audio context resumed:", settings.audioContext.state);
                await loadInstrumentSamples();
                console.log("[DEBUG] Instrument samples loaded");
                
                // Remove the event listeners once audio is started
                document.removeEventListener('click', startAudioHandler);
                document.removeEventListener('keydown', startAudioHandler);
                document.removeEventListener('touchstart', startAudioHandler);
            } catch (error) {
                console.error("[DEBUG] Error starting audio:", error);
            }
        }
    };

    // Add event listeners for user interaction
    document.addEventListener('click', startAudioHandler);
    document.addEventListener('keydown', startAudioHandler);
    document.addEventListener('touchstart', startAudioHandler);

    // Initialize event handlers
    console.log("[DEBUG] Initializing event handlers...");
    initEventHandlers(settings);
    
    // Add settings button handler
    document.getElementById('settings-button')?.addEventListener('click', showSettings);
    
    // Add click handler to close modal when clicking overlay
    document.querySelector('.modal-overlay')?.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) {
            hideSettings();
        }
    });

    // Initialize scroll area
    console.log("[DEBUG] Initializing scroll area...");
    initScrollArea();

    // Add form submission handler
    const settingsForm = document.getElementById('settingsForm') as HTMLFormElement;
    if (settingsForm) {
        settingsForm.onsubmit = async (event: Event) => {
            event.preventDefault();
            await goKeyboard();
            return false;
        };
    }

    // Add event listener for number-root dropdown
    const numberRootSelect = document.getElementById('number-root') as HTMLSelectElement;
    if (numberRootSelect) {
        numberRootSelect.addEventListener('change', () => {
            window.settingsManager.updateKeyboardDisplay();
            window.settingsManager.changeURL();
        });
    } else {
        console.error('[DEBUG] number-root element not found');
    }

    // Add event listener for learning note root dropdown
    const learningNoteRootSelect = document.getElementById('learning-note-root') as HTMLSelectElement;
    if (learningNoteRootSelect) {
        learningNoteRootSelect.addEventListener('change', () => {
            const selectedIndex = learningNoteRootSelect.selectedIndex;
            const selectedRootNote = settings.names[selectedIndex];
            console.log('[DEBUG] Selected root note:', selectedRootNote);

            // Update all chord names with the new root note
            updateChordNames(selectedRootNote);

            // Save the selected root note to the URL
            const url = new URL(window.location.href);
            url.searchParams.set('rootNote', encodeURIComponent(selectedRootNote));
            window.history.replaceState({}, '', url.toString());
            console.log('[DEBUG] Updated URL with rootNote:', url.toString());
        });
    } else {
        console.error('[DEBUG] learning-note-root element not found');
    }

    console.log("[DEBUG] All setup complete, calling goKeyboard...");
    goKeyboard();
});
// Add scroll area functionality with edge detection
function initScrollArea(): void {
    if (scrollManager) {
        scrollManager.cleanup();
    }
    scrollManager = new ScrollManager(settings);
}

// Make necessary functions available globally
window.back = back;
window.settings = settings;
window.changeURL = () => settingsManager.changeURL();
window.noPreset = () => settingsManager.noPreset();
window.hideRevealColors = () => settingsManager.hideRevealColors();
window.hideRevealNames = () => settingsManager.hideRevealNames();
window.hideRevealEnum = () => settingsManager.hideRevealEnum();
window.updateColorVisionMode = () => {
    settingsManager.updateColorVisionMode();
    settings = settingsManager.getSettings();
};
window.updateColorSaturation = () => {
    settingsManager.updateColorSaturation();
    settings = settingsManager.getSettings();
};
window.updateKeyboardDisplay = () => settingsManager.updateKeyboardDisplay();

function resizeHandler(): void {
  settingsManager.updateDimensions();
  settings = settingsManager.getSettings();
  
  // Clear and redraw
  if (settings.canvas && settings.context) {
    settings.context.clearRect(0, 0, settings.canvas.width, settings.canvas.height);
    drawGrid();
  }
}

function showSettings(): void {
  const overlay = document.querySelector('.modal-overlay');
  const landingPage = document.getElementById('landing-page');
  const settingsButton = document.getElementById('settings-button');
  
  // Update notation system dropdown to match current settings
  const notationSelect = document.getElementById('notation-system') as HTMLSelectElement;
  if (notationSelect && settings.notationSystem) {
    notationSelect.value = settings.notationSystem;
    
    // Also update the custom select display if it exists
    const customSelect = document.querySelector('.custom-select') as HTMLElement;
    if (customSelect) {
      const selectedOption = Array.from(notationSelect.options)
        .find(option => option.value === settings.notationSystem);
      if (selectedOption) {
        customSelect.innerHTML = `${selectedOption.text}`;
      }
    }
  }
  
  if (overlay) overlay.classList.add('active');
  if (landingPage) landingPage.style.display = 'block';
  if (settingsButton) settingsButton.style.display = 'none';
  
  document.body.style.overflow = 'hidden';
}

function hideSettings(): void {
  const overlay = document.querySelector('.modal-overlay');
  const landingPage = document.getElementById('landing-page');
  const settingsButton = document.getElementById('settings-button');
  
  if (overlay) overlay.classList.remove('active');
  if (landingPage) landingPage.style.display = 'none';
  if (settingsButton) settingsButton.style.display = 'block';
  
  document.body.style.overflow = 'hidden';
}

// Modify the back function to use the new modal behavior
function back(): void {
  showSettings();
}

// Update goKeyboard to not try to start audio immediately
async function goKeyboard(): Promise<boolean> {
    // Update URL before anything else
    settingsManager.changeURL();
    console.log('[DEBUG] Starting keyboard initialization...');

    // Hide settings and show keyboard
    hideSettings();
    
    // Initialize canvas using SettingsManager
    settingsManager.initializeCanvas();

    // Reset all pressed states
    settings.pressedKeys = [];
    settings.isMouseDown = false;
    settings.isTouchDown = false;
    settings.activeHexObjects = [];
    settings.sustainedNotes = [];
    settings.sustain = false;

    // Load settings from form
    settingsManager.loadFromForm();
    settings = settingsManager.getSettings();

    // Parse scale and colors
    settingsManager.parseScale();
    settingsManager.parseScaleColors();

    // Initialize display utils
    initDisplayUtils(settings);
    // Initialize hex utils
    initHexUtils(settings);

    // Set up resize handler
    window.addEventListener('resize', resizeHandler, false);
    window.addEventListener('orientationchange', resizeHandler, false);
    resizeHandler();

    // Initialize event handlers
    console.log('Initializing event handlers with settings:', settings);
    initEventHandlers(settings);

    // Show keyboard and settings button
    const keyboard = document.getElementById('keyboard');
    if (keyboard) {
        keyboard.style.display = 'block';
        keyboard.style.visibility = 'visible';
        keyboard.style.opacity = '1';
    }

    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
        settingsButton.style.display = 'block';
    }

    // Ensure audio context is initialized and resumed
    if (!settings.audioContext) {
        settings.audioContext = await initAudio();
    }
    if (settings.audioContext && settings.audioContext.state === 'suspended') {
        await settings.audioContext.resume();
    }

    // Load new instrument samples
    try {
        await loadInstrumentSamples();
        console.log('[DEBUG] New instrument samples loaded successfully');
    } catch (error) {
        console.error('[DEBUG] Error loading new instrument samples:', error);
    }

    // Force a redraw
    drawGrid();

    initLearningFunctions();

    return false;
}

// Ensure settings are loaded before populating the dropdown
settings = settingsManager.getSettings();

// Function to replace 'b' with '♭' and '#' with '♯' in note names
function replaceAccidentals(noteName: string): string {
    return noteName.replace(/b/g, '♭').replace(/#/g, '♯');
}

// Apply replaceAccidentals to note names when loading or updating
settings.names = settings.names.map(replaceAccidentals);

// Update the chord names with the new root note
function updateChordNames(rootNote: string) {
    const chordList = document.getElementById('chord-list');
    if (!chordList) return;

    // Update each chord name with the new root note
    Array.from(chordList.children).forEach((li) => {
        const chordName = li.textContent || '';
        // Clear existing accidentals and special characters, then apply the new root note
        const newChordName = replaceAccidentals(chordName.replace(/^[^A-G]*[A-G][b#♯♭]?/, rootNote));
        li.textContent = newChordName;

        // Update the chordData object with the new root note
        const chordData = SETTINGS_31_EDO.CHORD_SPELLINGS[chordName] as { symbol: string; spelling: string[] };
        if (chordData && 'symbol' in chordData) {
            chordData.symbol = newChordName;
        }
    });
}

// Call replaceAccidentals when loading note names
function populateLearningNoteDropdown() {
    const learningNoteRootSelect = document.getElementById('learning-note-root') as HTMLSelectElement;
    const namesTextarea = document.getElementById('names') as HTMLTextAreaElement;
    
    if (!learningNoteRootSelect || !namesTextarea) return;

    // Clear existing options
    learningNoteRootSelect.innerHTML = '';
    
    // Get note names from the current tuning system
    const noteNames = settings.names.map(replaceAccidentals);
    console.log('[DEBUG] Note names:', noteNames);
    noteNames.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = index.toString();
        option.text = name;
        learningNoteRootSelect.appendChild(option);
    });
}

// Function to populate the chord list
function populateChordList() {
    const chordList = document.getElementById('chord-list');
    if (!chordList) return;

    // Clear existing list
    chordList.innerHTML = '';

    // Get chords from tuningTypes
    const chords = SETTINGS_31_EDO.CHORD_SPELLINGS; // Example using 31-EDO, adjust as needed
    Object.entries(chords).forEach(([chordName, chordData]) => {
        const listItem = document.createElement('li');
        listItem.textContent = chordData.symbol;
        listItem.className = 'toggle-button';
        listItem.onclick = () => {
            console.log('[DEBUG] Chord button clicked:', chordName);
            setLearningMode(chordData);
        };
        chordList.appendChild(listItem);
    });

    // Style chord list as columns
    chordList.style.display = 'grid';
    chordList.style.gridTemplateColumns = 'repeat(auto-fill, minmax(100px, 1fr))';
    chordList.style.gap = '10px';
}

// Add CSS for toggle-style buttons
const style = document.createElement('style');
style.textContent = `
    .toggle-button {
        background-color: #f0f0f0;
        border: 1px solid #ccc;
        padding: 10px;
        text-align: center;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }
    .toggle-button.selected {
        background-color: #007bff;
        color: white;
    }
    .toggle-button:hover {
        background-color: #e0e0e0;
    }
`;
document.head.appendChild(style);

// Function to set learning mode
function setLearningMode(chordData: { symbol: string; spelling: string[] }) {
    console.log('[DEBUG] setLearningMode called with chordData:', chordData);
    // Update settings with the selected chord
    settings.learningChord = chordData.spelling;
    settings.learningChordSymbol = chordData.symbol;
    console.log('[DEBUG] Updated settings.learningChordSymbol:', settings.learningChordSymbol);
    
    // Update URL with learningChord symbol
    const url = new URL(window.location.href);
    url.searchParams.set('learningChord', encodeURIComponent(chordData.symbol));
    window.history.replaceState({}, '', url.toString());
    console.log('[DEBUG] Updated URL with learningChord:', url.toString());

    // Update UI to reflect selected chord
    const chordList = document.getElementById('chord-list');
    if (chordList) {
        chordList.querySelectorAll('li').forEach(li => {
            li.classList.remove('selected');
        });
        const selectedChord = Array.from(chordList.children).find(li => li.textContent === chordData.symbol);
        if (selectedChord) {
            selectedChord.classList.add('selected');
        }
    }

    updateKeyboardDisplay();
}

// Update keyboard display to highlight learning mode
function updateKeyboardDisplay() {
    // Clear the canvas
    if (settings.canvas && settings.context) {
        settings.context.clearRect(0, 0, settings.canvas.width, settings.canvas.height);
    }

    // Draw the grid
    drawGrid();

    // Highlight learning mode
    if (settings.learningChord) {
        const hexes = settings.activeHexObjects;
        hexes.forEach(hex => {
            const noteNumber = hex.note;
            // Check if the note is part of the learning chord
            if (settings.learningChord.includes(noteNumber.toString())) {
                // Set full opacity for chord notes
                hex.opacity = 1.0;
            } else {
                // Set opacity to 20% for non-chord notes
                hex.opacity = 0.2;
            }
            // Redraw hex with updated opacity
            hex.draw(settings.context);
        });
    }
}

// Initialize learning functions
function initLearningFunctions() {
    populateLearningNoteDropdown();
    populateChordList();
}