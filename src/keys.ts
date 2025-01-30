// Import geometry functions
import {
  Point,
} from './core/geometry';

// Import audio functions
import {
  initAudio,
  loadInstrumentSamples,
} from './audio/audioHandler';

// Import event handling functions
import {
  initEventHandlers,
} from './ui/eventHandler';

// Import hex utility functions
import {
  initHexUtils,
} from './grid/hexUtils';

// Import display utility functions
import {
  initDisplayUtils,
  drawGrid
} from './grid/displayUtils';

// Import types
import { Settings, QueryDataInterface } from './core/types';

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
let settings: Settings = {
  scale: [],
  equivInterval: 0,
  keycolors: [],
  canvas: null as unknown as HTMLCanvasElement,
  context: null as unknown as CanvasRenderingContext2D,
  centerpoint: new Point(0, 0),
  rotationMatrix: [1, 0, 0, 1, 0, 0],
  fundamental: 0,
  rSteps: 0,
  urSteps: 0,
  hexSize: 0,
  rotation: 0,
  hexHeight: 0,
  hexVert: 0,
  hexWidth: 0,
  names: [],
  enum: false,
  equivSteps: 0,
  no_labels: false,
  spectrum_colors: false,
  fundamental_color: '#55ff55',
  audioContext: undefined,
  sustain: false,
  sustainedNotes: [],
  activeHexObjects: [],
  pressedKeys: [],
  keyCodeToCoords: {},
  midi_enabled: false,
  isMouseDown: false,
  isTouchDown: false,
  audioBuffer: undefined,
  activeSources: {},
  fadeoutTime: 0,
  sampleBuffer: [undefined, undefined, undefined, undefined],
  colorVisionMode: 'normal',
  colorSaturation: 100,
  invert_updown: false,
  showIntervals: false,
  showAllNotes: false,
  octaveOffset: 0,
};

// Initialize settings manager
const settingsManager = new SettingsManager();
settings = settingsManager.getSettings(); // Get initial settings

// Initialize scroll manager instance
let scrollManager: ScrollManager | null = null;

// Add color saturation update function
function updateColorSaturation(): void {
  settingsManager.updateColorSaturation();
  settings = settingsManager.getSettings();
}

// Add color vision mode update function
function updateColorVisionMode(): void {
  settingsManager.updateColorVisionMode();
  settings = settingsManager.getSettings();
}

// Make functions available globally
window.back = back;
window.settings = settings;
window.changeURL = changeURL;
window.noPreset = () => settingsManager.noPreset();
window.hideRevealColors = () => settingsManager.hideRevealColors();
window.hideRevealNames = () => settingsManager.hideRevealNames();
window.hideRevealEnum = () => settingsManager.hideRevealEnum();
window.updateColorVisionMode = updateColorVisionMode;
window.updateColorSaturation = updateColorSaturation;
window.updateKeyboardDisplay = () => settingsManager.updateKeyboardDisplay();

if (window.WebMidi) {
  // Only enable WebMidi if the checkbox is checked
  const midiInputCheckbox = document.getElementById('midi_input') as HTMLInputElement;
  console.log("MIDI input checkbox state:", midiInputCheckbox?.checked);
  if (midiInputCheckbox && midiInputCheckbox.checked) {
    window.WebMidi
      .enable()
      .then(onEnabled)
      .catch((err: Error) => {
        console.error("WebMidi enable error:", err);
        alert(err);
      });
  }
}

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

const getData: QueryDataInterface = new QueryData(location.search, true);

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

function changeURL(): void {
  let url = window.location.pathname + "?";

  function getElementValue(id: string): string {
    const element = document.getElementById(id) as HTMLInputElement;
    return element ? (element.type === 'checkbox' ? element.checked.toString() : element.value) : '';
  }

  // Add all parameters to URL
  const params = [
    "fundamental", "rSteps", "urSteps", "hexSize", "rotation",
    "instrument", "enum", "equivSteps", "spectrum_colors",
    "fundamental_color", "no_labels", "midi_input", "invert-updown",
    "show_intervals", "show_all_notes"
  ];

  url += params.map(param => `${param}=${getElementValue(param)}`).join('&');

  // Add scale, names, and note_colors
  ["scale", "names", "note_colors"].forEach(param => {
    const value = getElementValue(param);
    if (value) {
      url += `&${param}=${encodeURIComponent(value)}`;
    }
  });

  // Find scl file description for the page title
  const scaleElement = document.getElementById('scale') as HTMLTextAreaElement;
  if (scaleElement) {
    const scaleLines = scaleElement.value.split('\n');
    let description = "Terpstra Keyboard WebApp";

    for (const line of scaleLines) {
      if (line.match(/[a-zA-Z]+/) && !line.match(/^!/)) {
        description = line;
        break;
      }
    }

    document.title = description;
  }

  window.history.replaceState({}, '', url);
}

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
  changeURL();
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
    }).catch(error => {
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

window.addEventListener('load', () => {
  // Initialize settings manager with presets
  settingsManager.loadPresets().then(() => {
    // Initialize scroll area
    initScrollArea();
    
    // Initialize audio context immediately
    const ctx = initAudio();
    if (ctx) {
      settings.audioContext = ctx;
      console.log("[DEBUG] Audio context initialized on load:", ctx.state);
    }
    
    // Add settings button handler
    document.getElementById('settings-button')?.addEventListener('click', showSettings);
    
    // Add click handler to close modal when clicking overlay
    document.querySelector('.modal-overlay')?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) {
        hideSettings();
      }
    });
    
    // Add MIDI input checkbox handler
    document.getElementById('midi_input')?.addEventListener('change', (event) => {
      const checkbox = event.target as HTMLInputElement;
      settings.midi_enabled = checkbox.checked;
      console.log("MIDI input enabled changed to:", checkbox.checked);
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
        // Disable MIDI
        if (window.WebMidi && window.WebMidi.enabled) {
          console.log("Disabling WebMidi");
          window.WebMidi.disable();
        }
      }
    });
    
    // Initialize keyboard immediately if URL has parameters, otherwise show settings
    if (window.location.search) {
      const keyboard = document.getElementById("keyboard");
      const landingPage = document.getElementById("landing-page");
      const settingsButton = document.getElementById("settings-button");
      
      if (keyboard) keyboard.style.display = "block";
      if (landingPage) landingPage.style.display = "none";
      if (settingsButton) settingsButton.style.display = "block";
      
      const instrumentSelect = document.getElementById("instrument") as HTMLSelectElement;
      if (instrumentSelect) {
        instrumentSelect.value = getData.instrument ?? "organ";
      }
      setTimeout(() => { goKeyboard(); }, 1500);
    } else {
      showSettings();
    }

    // Initialize note configuration
    settingsManager.initNoteConfig();

    // Add pitch type change handler
    document.getElementById('pitch-type')?.addEventListener('change', () => {
      settingsManager.handlePitchTypeChange();
      // Update central octave after pitch type change
      settingsManager.handleCentralOctaveChange();
      settings = settingsManager.getSettings();
    });

    // Add central octave change handler
    document.getElementById('central-octave')?.addEventListener('input', () => {
      settingsManager.handleCentralOctaveChange();
      settings = settingsManager.getSettings();
    });

    // Initialize color vision mode and add listeners
    const colorVisionSelect = document.getElementById('color-vision-mode') as HTMLSelectElement;
    if (colorVisionSelect) {
      colorVisionSelect.value = settings.colorVisionMode;
      colorVisionSelect.addEventListener('change', () => {
        settingsManager.updateColorVisionMode();
        settingsManager.updatePreviewButtons();
        settings = settingsManager.getSettings();
      });
    }

    // Add color saturation slider listener
    const saturationSlider = document.getElementById('color-saturation') as HTMLInputElement;
    if (saturationSlider) {
      saturationSlider.addEventListener('input', () => {
        settingsManager.updateColorSaturation();
        settingsManager.updatePreviewButtons();
        settings = settingsManager.getSettings();
      });
    }

    // Add invert up/down checkbox listener
    const invertUpdownCheckbox = document.getElementById('invert-updown') as HTMLInputElement;
    if (invertUpdownCheckbox) {
      invertUpdownCheckbox.addEventListener('change', () => {
        settings.invert_updown = invertUpdownCheckbox.checked;
        settingsManager.updatePreviewButtons();
        settingsManager.updateKeyboardDisplay();
        settings = settingsManager.getSettings();
      });
    }
  });
}, false);

// Add scroll area functionality with edge detection
function initScrollArea(): void {
  // Clean up existing scroll manager if it exists
  if (scrollManager) {
    scrollManager.cleanup();
  }
  
  // Create new scroll manager instance
  scrollManager = new ScrollManager(settings);
}