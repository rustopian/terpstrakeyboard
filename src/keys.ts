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
    // Initialize canvas and context
    settingsManager.initializeCanvas();
    settings = settingsManager.getSettings();

    // Initialize hex utilities with current settings
    initHexUtils(settings);
    
    // Initialize display utilities
    initDisplayUtils(settings);
    
    // Initialize event handlers
    initEventHandlers(settings);
    
    // Initialize audio system
    const ctx = await initAudio();
    if (ctx) {
        settings.audioContext = ctx;
        console.log("[DEBUG] Audio context initialized:", ctx.state);
    }
    
    // Add settings button handler
    document.getElementById('settings-button')?.addEventListener('click', showSettings);
    
    // Add click handler to close modal when clicking overlay
    document.querySelector('.modal-overlay')?.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) {
            hideSettings();
        }
    });

    // Load instrument samples
    const instrumentSelect = document.getElementById('instrument') as HTMLSelectElement;
    if (instrumentSelect) {
        await loadInstrumentSamples();
    }

    // Initialize scroll area
    initScrollArea();

    // Load presets
    await settingsManager.loadPresets();

    // Apply URL parameters or default preset
    if (window.location.search) {
        const keyboard = document.getElementById("keyboard");
        const landingPage = document.getElementById("landing-page");
        const settingsButton = document.getElementById("settings-button");
        
        if (keyboard) keyboard.style.display = "block";
        if (landingPage) landingPage.style.display = "none";
        if (settingsButton) settingsButton.style.display = "block";
        
        if (instrumentSelect) {
            instrumentSelect.value = getData.instrument ?? "organ";
        }
        
        settingsManager.checkPreset(16);
        setTimeout(() => { goKeyboard(); }, 1500);
    } else {
        showSettings();
    }

    // Initialize note configuration
    settingsManager.initNoteConfig();

    // Initialize all event listeners
    initializeEventListeners();
});

// Initialize all event listeners
function initializeEventListeners(): void {
    // Pitch type change handler
    document.getElementById('pitch-type')?.addEventListener('change', () => {
        settingsManager.handlePitchTypeChange();
        settingsManager.handleCentralOctaveChange();
        settings = settingsManager.getSettings();
    });

    // Central octave change handler
    document.getElementById('central-octave')?.addEventListener('input', () => {
        settingsManager.handleCentralOctaveChange();
        settings = settingsManager.getSettings();
    });

    // Text size handler
    document.getElementById('text-size')?.addEventListener('input', (event) => {
        const slider = event.target as HTMLInputElement;
        settings.textSize = parseFloat(slider.value);
        settingsManager.updateKeyboardDisplay();
        settings = settingsManager.getSettings();
    });

    // Color vision mode handler
    const colorVisionSelect = document.getElementById('color-vision-mode') as HTMLSelectElement;
    if (colorVisionSelect) {
        colorVisionSelect.value = settings.colorVisionMode;
        colorVisionSelect.addEventListener('change', () => {
            settingsManager.updateColorVisionMode();
            settingsManager.updatePreviewButtons();
            settings = settingsManager.getSettings();
        });
    }

    // Color saturation handler
    const saturationSlider = document.getElementById('color-saturation') as HTMLInputElement;
    if (saturationSlider) {
        saturationSlider.addEventListener('input', () => {
            settingsManager.updateColorSaturation();
            settingsManager.updatePreviewButtons();
            settings = settingsManager.getSettings();
        });
    }

    // Invert up/down handler
    const invertUpdownCheckbox = document.getElementById('invert-updown') as HTMLInputElement;
    if (invertUpdownCheckbox) {
        invertUpdownCheckbox.addEventListener('change', () => {
            settings.invert_updown = invertUpdownCheckbox.checked;
            settingsManager.updatePreviewButtons();
            settingsManager.updateKeyboardDisplay();
            settings = settingsManager.getSettings();
        });
    }

    // MIDI input handler
    document.getElementById('midi_input')?.addEventListener('change', (event) => {
        const checkbox = event.target as HTMLInputElement;
        settings.midi_enabled = checkbox.checked;
        if (checkbox.checked) {
            if (window.WebMidi) {
                window.WebMidi
                    .enable()
                    .then(onEnabled)
                    .catch((err: Error) => {
                        console.error("WebMidi enable error:", err);
                        alert(err);
                    });
            }
        } else {
            if (window.WebMidi && window.WebMidi.enabled) {
                window.WebMidi.disable();
            }
        }
    });
}

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

function onEnabled(): void {
  if (window.WebMidi.outputs) {
    const midiOutMenu = document.createElement("optgroup");
    midiOutMenu.setAttribute("label", "MIDI out");
    const instrumentSelect = document.getElementById("instrument");
    if (instrumentSelect) {
      instrumentSelect.appendChild(midiOutMenu);
    }

    function addMidiOption(e: string): void {
      const midiOption = document.createElement("option");
      midiOption.setAttribute("value", e);
      midiOption.textContent = e;
      midiOutMenu.appendChild(midiOption);
    }

    window.WebMidi.outputs.forEach((output: any) => addMidiOption(output.name));
  }

  // Initialize keyboard on load
  if (init_keyboard_onload) {
    // Hide landing page
    const landingPage = document.getElementById('landing-page');
    if (landingPage) {
      landingPage.style.display = 'none';
    }

    const instrumentSelect = document.getElementById("instrument") as HTMLSelectElement;
    if (instrumentSelect) {
      instrumentSelect.value = getData.instrument ?? "organ";
    }
    setTimeout(() => { goKeyboard(); }, 1500);
  }

  // Add beforeunload handler to clean up MIDI
  window.addEventListener('beforeunload', (_event: BeforeUnloadEvent) => {
    const instrumentSelect = document.getElementById("instrument") as HTMLSelectElement;
    if (instrumentSelect && window.WebMidi.enabled) {
      const midiOutput = window.WebMidi.getOutputByName(instrumentSelect.value);
      if (midiOutput) {
        midiOutput.sendAllSoundOff();
      }
    }
  });
}

// Check\set preset
let init_keyboard_onload = true;
if (decodeURIComponent(window.location.search) === '') {
  init_keyboard_onload = false;
}

settingsManager.checkPreset(16);

// Fill in form
const settingsForm = document.getElementById('settingsForm') as HTMLFormElement;
if (settingsForm) {
  settingsForm.onsubmit = goKeyboard;
}

function setInputValue(id: string, defaultValue: any): void {
  const element = document.getElementById(id) as HTMLInputElement;
  if (element) {
    if (id in getData) {
      if (element.type === 'checkbox') {
        element.checked = JSON.parse(getData[id]);
      } else {
        element.value = getData[id];
      }
    } else {
      if (element.type === 'checkbox') {
        element.checked = defaultValue;
      } else {
        element.value = defaultValue;
      }
    }
  }
}

setInputValue("fundamental", 263.09212);
setInputValue("rSteps", 5);
setInputValue("urSteps", 2);
setInputValue("hexSize", 50);
setInputValue("rotation", 343.897886248);
setInputValue("enum", false);
setInputValue("equivSteps", 31);
setInputValue("spectrum_colors", false);
setInputValue("fundamental_color", '#55ff55');
setInputValue("no_labels", false);
setInputValue("invert-updown", false);

if ("scale" in getData && getData.scale) {
  const scaleElement = document.getElementById("scale") as HTMLInputElement;
  if (scaleElement) {
    scaleElement.value = getData.scale[0];
  }
}

if ("names" in getData && getData.names) {
  const namesElement = document.getElementById("names") as HTMLInputElement;
  if (namesElement) {
    namesElement.value = getData.names[0];
  }
}

if ("note_colors" in getData && getData.note_colors) {
  const noteColorsElement = document.getElementById("note_colors") as HTMLInputElement;
  if (noteColorsElement) {
    noteColorsElement.value = getData.note_colors[0];
  }
}

settingsManager.hideRevealNames();
settingsManager.hideRevealColors();
settingsManager.hideRevealEnum();

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

function goKeyboard(): boolean {
  settingsManager.changeURL();
  console.log("[DEBUG] Starting goKeyboard...");

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

  // Initialize audio context if not already initialized
  if (!settings.audioContext) {
    const ctx = initAudio();
    if (ctx) {
      settings.audioContext = ctx;
      console.log("[DEBUG] Audio context initialized:", ctx.state);
      
      // Resume the audio context since it might be suspended
      ctx.resume().then(() => {
        console.log("[DEBUG] Audio context resumed:", ctx.state);
        // Only load samples after context is running
        loadInstrumentSamples();
      }).catch(error => {
        console.error("[DEBUG] Error resuming audio context:", error);
      });
      
      // Add state change monitoring
      ctx.onstatechange = () => {
        console.log("[DEBUG] Audio context state changed to:", ctx.state);
      };
    }
  } else {
    // If context already exists, ensure it's running and load samples
    settings.audioContext.resume().then(() => {
      console.log("[DEBUG] Existing audio context resumed:", settings.audioContext?.state);
      loadInstrumentSamples();
    }).catch((error: any) => {
      console.error("[DEBUG] Error resuming existing audio context:", error);
    });
  }

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
  console.log("Initializing event handlers with settings:", settings);
  initEventHandlers(settings);

  return false;
}