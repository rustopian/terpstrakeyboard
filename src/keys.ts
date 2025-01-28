// Import geometry functions
import {
  Point,
  calculateRotationMatrix,
} from './geometry';

// Import audio functions
import {
  initAudio,
  setSampleFadeout,
  loadSample
} from './audioHandler';

// Import event handling functions
import {
  initEventHandlers,
  removeEventHandlers
} from './eventHandler';

// Import hex utility functions
import {
  initHexUtils,
  hexCoordsToCents,
} from './hexUtils';

// Import display utility functions
import {
  initDisplayUtils,
  centsToColor,
  drawHex
} from './displayUtils';

// Import query data
import { QueryData } from './QueryData';

// Type definitions
interface Instrument {
  fileName: string;
  fade: number;
}

interface QueryDataInterface {
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

interface Settings {
  scale: number[];
  equivInterval: number;
  keycolors: string[];
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  centerpoint: Point;
  rotationMatrix: [number, number, number, number, number, number];
  fundamental: number;
  rSteps: number;
  urSteps: number;
  hexSize: number;
  rotation: number;
  hexHeight: number;
  hexVert: number;
  hexWidth: number;
  names: string[];
  enum: boolean;
  equivSteps: number;
  no_labels: boolean;
  spectrum_colors: boolean;
  fundamental_color: string;
  audioContext?: AudioContext;
  sustain: boolean;
  sustainedNotes: any[];
  activeHexObjects: any[];
  pressedKeys: number[];
  keyCodeToCoords: { [key: number]: Point };
  isMouseDown: boolean;
  isTouchDown: boolean;
  midi_enabled: boolean;
  audioBuffer?: AudioBuffer;
  activeSources: { [key: number]: { source: AudioBufferSourceNode; gainNode: GainNode } };
  fadeoutTime: number;
  sampleBuffer: (AudioBuffer | undefined)[];
}

// Add WebMidi types
declare global {
  interface Window {
    settings: Settings;
    back: () => void;
    changeURL: () => void;
    noPreset: () => void;
    WebMidi: {
      enable: () => Promise<void>;
      disable: () => void;
      enabled: boolean;
      outputs: WebMidiOutput[];
      getOutputByName: (name: string) => WebMidiOutput;
    };
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
let myOutput: any = null;
const instruments: Instrument[] = [
  { fileName: "piano", fade: 0.1 },
  { fileName: "harpsichord", fade: 0.2 },
  { fileName: "rhodes", fade: 0.1 },
  { fileName: "harp", fade: 0.2 },
  { fileName: "choir", fade: 0.5 },
  { fileName: "strings", fade: 0.9 },
  { fileName: "sawtooth", fade: 0.2 },
  { fileName: "gayageum", fade: 1 },
  { fileName: "qanun", fade: 1 },
  { fileName: "organ", fade: 0.1 },
  { fileName: "organleslie", fade: 0.1 },
  { fileName: "marimba", fade: 0.1 },
  { fileName: "musicbox", fade: 0.1 },
  { fileName: "WMRI3LST", fade: 0.1 },
  { fileName: "WMRI5LST", fade: 0.1 },
  { fileName: "WMRI5Lpike", fade: 0.1 },
  { fileName: "WMRI7LST", fade: 0.1 },
  { fileName: "WMRI11LST", fade: 0.1 },
  { fileName: "WMRI13LST", fade: 0.1 },
  { fileName: "WMRInLST", fade: 0.1 },
  { fileName: "WMRIByzantineST", fade: 0.1 },
  { fileName: "WMRI-in6-har7-", fade: 0.1 },
  { fileName: "WMRI-in7-har6-", fade: 0.1 }
];
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
  sampleBuffer: [undefined, undefined, undefined, undefined]
};

// Make back function available globally
window.back = back;
window.settings = settings;
window.changeURL = changeURL;
window.noPreset = noPreset;

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

  window.addEventListener('beforeunload', (_event: BeforeUnloadEvent) => {
    if (myOutput) {
      myOutput.sendAllSoundOff();
    }
  });
}

// Check\set preset
let init_keyboard_onload = true;
if (decodeURIComponent(window.location.search) === '') {
  init_keyboard_onload = false;
}

checkPreset(16);

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

hideRevealNames();
hideRevealColors();
hideRevealEnum();

function hideRevealNames(): void {
  const enumCheckbox = document.getElementById("enum") as HTMLInputElement;
  const equivStepsElement = document.getElementById("equivSteps") as HTMLElement;
  const namesElement = document.getElementById("names") as HTMLElement;
  const numberLabel = document.getElementById("numberLabel") as HTMLElement;
  const namesLabel = document.getElementById("namesLabel") as HTMLElement;

  if (enumCheckbox && enumCheckbox.checked) {
    if (equivStepsElement) equivStepsElement.style.display = 'block';
    if (namesElement) namesElement.style.display = 'none';
    if (numberLabel) numberLabel.style.display = 'block';
    if (namesLabel) namesLabel.style.display = 'none';
  } else {
    if (equivStepsElement) equivStepsElement.style.display = 'none';
    if (namesElement) namesElement.style.display = 'block';
    if (numberLabel) numberLabel.style.display = 'none';
    if (namesLabel) namesLabel.style.display = 'block';
  }
  changeURL();
}

function hideRevealColors(): void {
  const spectrumColorsCheckbox = document.getElementById("spectrum_colors") as HTMLInputElement;
  const fundamentalColorElement = document.getElementById("fundamental_color") as HTMLElement;
  const fundamentalColorLabel = document.getElementById("fundamental_colorLabel") as HTMLElement;
  const noteColorsElement = document.getElementById("note_colors") as HTMLElement;
  const noteColorsLabel = document.getElementById("note_colorsLabel") as HTMLElement;

  if (spectrumColorsCheckbox && spectrumColorsCheckbox.checked) {
    if (fundamentalColorElement) fundamentalColorElement.style.display = 'block';
    if (fundamentalColorLabel) fundamentalColorLabel.style.display = 'block';
    if (noteColorsElement) noteColorsElement.style.display = 'none';
    if (noteColorsLabel) noteColorsLabel.style.display = 'none';
  } else {
    if (fundamentalColorElement) fundamentalColorElement.style.display = 'none';
    if (fundamentalColorLabel) fundamentalColorLabel.style.display = 'none';
    if (noteColorsElement) noteColorsElement.style.display = 'block';
    if (noteColorsLabel) noteColorsLabel.style.display = 'block';
  }
  changeURL();
}

function hideRevealEnum(): void {
  const noLabelsCheckbox = document.getElementById("no_labels") as HTMLInputElement;
  const enumCheckbox = document.getElementById("enum") as HTMLInputElement;
  const equivStepsElement = document.getElementById("equivSteps") as HTMLElement;
  const namesElement = document.getElementById("names") as HTMLElement;
  const numberLabel = document.getElementById("numberLabel") as HTMLElement;
  const namesLabel = document.getElementById("namesLabel") as HTMLElement;

  if (noLabelsCheckbox && noLabelsCheckbox.checked) {
    if (enumCheckbox) enumCheckbox.disabled = true;
    if (equivStepsElement) equivStepsElement.style.display = 'none';
    if (namesElement) namesElement.style.display = 'none';
    if (numberLabel) numberLabel.style.display = 'none';
    if (namesLabel) namesLabel.style.display = 'none';
  } else {
    if (enumCheckbox) {
      enumCheckbox.disabled = false;
      if (!enumCheckbox.checked) {
        if (namesLabel) namesLabel.style.display = 'block';
        if (namesElement) namesElement.style.display = 'block';
      } else {
        if (equivStepsElement) equivStepsElement.style.display = 'block';
        if (numberLabel) numberLabel.style.display = 'block';
      }
    }
  }
  changeURL();
}

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
    "fundamental_color", "no_labels", "midi_input"
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

function parseScale(): void {
  settings.scale = [];
  const scaleElement = document.getElementById('scale') as HTMLTextAreaElement;
  if (!scaleElement) return;

  const scaleLines = scaleElement.value.split('\n');
  scaleLines.forEach((line) => {
    if (line.match(/^[1234567890.\s/]+$/) && !line.match(/^\s+$/)) {
      if (line.match(/\//)) {
        // Ratio
        const [num, den] = line.split('/').map(n => parseInt(n));
        const ratio = 1200 * Math.log(num / den) / Math.log(2);
        settings.scale.push(ratio);
      } else if (line.match(/\./)) {
        // Cents
        settings.scale.push(parseFloat(line));
      }
    }
  });
  settings.equivInterval = settings.scale.pop() || 0;
  settings.scale.unshift(0);
}

function parseScaleColors(): void {
  settings.keycolors = [];
  const noteColorsElement = document.getElementById('note_colors') as HTMLTextAreaElement;
  if (!noteColorsElement) return;

  const colorsArray = noteColorsElement.value.split('\n');
  settings.keycolors = colorsArray;
}

function resizeHandler(): void {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;

  if (!settings.canvas || !settings.context) return;

  settings.canvas.style.height = newHeight + 'px';
  settings.canvas.style.width = newWidth + 'px';

  settings.canvas.style.marginTop = (-newHeight / 2) + 'px';
  settings.canvas.style.marginLeft = (-newWidth / 2) + 'px';

  settings.canvas.width = newWidth;
  settings.canvas.height = newHeight;

  // Find new centerpoint
  const centerX = newWidth / 2;
  const centerY = newHeight / 2;
  settings.centerpoint = new Point(centerX, centerY);

  // Rotate about it
  if (settings.rotationMatrix) {
    settings.context.restore();
  }
  settings.context.save();

  settings.rotationMatrix = calculateRotationMatrix(-settings.rotation, settings.centerpoint);

  const m = calculateRotationMatrix(settings.rotation, settings.centerpoint);
  settings.context.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

  // Redraw Grid
  drawGrid();
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
  const keyboard = document.getElementById("keyboard");
  if (keyboard) keyboard.style.display = "block";

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

  // Set up settings constants
  settings.fundamental = parseFloat((document.getElementById("fundamental") as HTMLInputElement).value);
  settings.rSteps = parseInt((document.getElementById("rSteps") as HTMLInputElement).value);
  settings.urSteps = settings.rSteps - parseInt((document.getElementById("urSteps") as HTMLInputElement).value);
  settings.hexSize = parseInt((document.getElementById("hexSize") as HTMLInputElement).value);
  settings.rotation = (parseFloat((document.getElementById("rotation") as HTMLInputElement).value) * 2 * Math.PI) / 360;

  parseScale();
  parseScaleColors();
  settings.names = (document.getElementById('names') as HTMLInputElement).value.split('\n');
  settings.enum = (document.getElementById('enum') as HTMLInputElement).checked;
  settings.equivSteps = parseInt((document.getElementById('equivSteps') as HTMLInputElement).value);

  settings.canvas = document.getElementById('keyboard') as HTMLCanvasElement;
  settings.context = settings.canvas.getContext('2d')!;

  settings.hexHeight = settings.hexSize * 2;
  settings.hexVert = settings.hexHeight * 3 / 4;
  settings.hexWidth = Math.sqrt(3) / 2 * settings.hexHeight;

  settings.no_labels = (document.getElementById('no_labels') as HTMLInputElement).checked;
  settings.spectrum_colors = (document.getElementById('spectrum_colors') as HTMLInputElement).checked;
  settings.fundamental_color = (document.getElementById('fundamental_color') as HTMLInputElement).value;

  // Initialize display utils
  initDisplayUtils(settings);
  // Initialize hex utils
  initHexUtils(settings);

  // Set up resize handler
  window.addEventListener('resize', resizeHandler, false);
  window.addEventListener('orientationchange', resizeHandler, false);
  resizeHandler();

  // Initialize event handlers
  settings.sustain = false;
  settings.sustainedNotes = [];
  settings.activeHexObjects = [];
  console.log("Initializing event handlers with settings:", settings);
  initEventHandlers(settings);

  return false;
}

window.addEventListener('load', () => {
  loadPresets();
  
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
}, false);

function init(): void {
  // Audio context will be initialized in goKeyboard after user interaction
}

// Add interface for preset structure
interface Preset {
  label: string;
  parameters: {
    fundamental: string;
    right: string;
    upright: string;
    size: string;
    rotation: string;
    instrument: string;
    enum: string;
    equivSteps: string;
    piano_colors: string;
    spectrum_colors: string;
    no_labels: string;
    scale: string[];
    names: string[];
    note_colors: string[];
  };
}

interface PresetGroups {
  [key: string]: Preset[];
}

let presets: PresetGroups = {};

// Load presets from JSON file
async function loadPresets(): Promise<void> {
  try {
    const response = await fetch('presets.json');
    presets = await response.json();
    populatePresetDropdown();
  } catch (error) {
    console.error('Error loading presets:', error);
  }
}

// Populate the quicklinks dropdown with presets from JSON
function populatePresetDropdown(): void {
  const quicklinks = document.getElementById('quicklinks') as HTMLSelectElement;
  if (!quicklinks) return;

  // Clear existing options except the first "Choose Preset" option
  while (quicklinks.options.length > 1) {
    quicklinks.remove(1);
  }

  // Add presets from JSON
  Object.entries(presets).forEach(([groupName, groupPresets]) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = groupName;

    groupPresets.forEach(preset => {
      const option = document.createElement('option');
      option.text = preset.label;
      option.value = JSON.stringify(preset.parameters); // Store parameters directly
      optgroup.appendChild(option);
    });

    quicklinks.appendChild(optgroup);
  });

  // Add change handler to update form values without immediate navigation
  quicklinks.addEventListener('change', (event) => {
    const select = event.target as HTMLSelectElement;
    if (select.selectedIndex > 0) { // If not "Choose Preset"
      try {
        const parameters = JSON.parse(select.value);
        
        // Update all form fields with preset values
        Object.entries(parameters).forEach(([key, value]) => {
          const element = document.getElementById(key) as HTMLInputElement;
          if (element) {
            if (element.type === 'checkbox') {
              element.checked = value === 'true';
            } else if (Array.isArray(value)) {
              element.value = value.join('\n');
            } else {
              element.value = value as string;
            }
          }
        });

        // Update URL without navigation
        changeURL();
        
        // Trigger UI updates
        hideRevealNames();
        hideRevealColors();
        hideRevealEnum();
      } catch (error) {
        console.error('Error applying preset:', error);
      }
    }
  });

  // Check current URL to set initial selection
  checkPreset(16);
}

// Modify checkPreset to work with JSON presets
function checkPreset(init: number): void {
  const mselect = document.getElementById('quicklinks') as HTMLSelectElement;
  if (!mselect) return;

  const url_str = window.location.href;
  let presetFound = false;

  // First check for .htm as end of url and set the default preset
  if (url_str.substr(url_str.length - 4) === '.htm') {
    // Find the 31-ed2 preset option
    for (let i = 0; i < mselect.options.length; i++) {
      if (mselect.options[i].text === "31-ed2 Bosanquet / Wilson / Terpstra") {
        mselect.value = mselect.options[i].value;
        presetFound = true;
        // Trigger the onchange event to load the preset
        const event = new Event('change');
        mselect.dispatchEvent(event);
        break;
      }
    }
  }

  // Find matching preset from URL parameters
  if (!presetFound && window.location.search) {
    const currentParams = new URLSearchParams(window.location.search);
    
    // Try to find a matching preset
    for (let i = 0; i < mselect.options.length; i++) {
      if (mselect.options[i].value) {
        const presetParams = new URLSearchParams(mselect.options[i].value.substring(1)); // Remove leading '?'
        let matches = true;
        
        // Compare relevant parameters
        const paramsToCheck = ['fundamental', 'right', 'upright', 'size', 'rotation', 'instrument', 
                             'enum', 'equivSteps', 'spectrum_colors', 'no_labels'];
        
        for (const param of paramsToCheck) {
          if (currentParams.get(param) !== presetParams.get(param)) {
            matches = false;
            break;
          }
        }
        
        // Check array parameters separately (they might be encoded differently)
        ['scale', 'names', 'note_colors'].forEach(param => {
          const currentValue = currentParams.get(param);
          const presetValue = presetParams.get(param);
          if (currentValue !== presetValue) {
            matches = false;
          }
        });
        
        if (matches) {
          mselect.value = mselect.options[i].value;
          presetFound = true;
          break;
        }
      }
    }
  }

  // If no matching preset was found, select the "Choose Preset" option
  if (!presetFound) {
    mselect.selectedIndex = 0;
  }
}

export function drawGrid(): void {
  if (!settings.centerpoint || !settings.hexSize) return;

  const max = (settings.centerpoint.x > settings.centerpoint.y) ?
    settings.centerpoint.x / settings.hexSize :
    settings.centerpoint.y / settings.hexSize;
  
  for (let r = -Math.floor(max); r < max; r++) {
    for (let ur = -Math.floor(max); ur < max; ur++) {
      const coords = new Point(r, ur);
      const centsObj = hexCoordsToCents(coords);
      drawHex(coords, centsToColor(centsObj, false));
    }
  }
}

// Add noPreset function
function noPreset(): void {
  const quicklinks = document.getElementById('quicklinks') as HTMLSelectElement;
  if (quicklinks) {
    quicklinks.selectedIndex = 0;
  }
}

function initInstrumentSample(instrumentName: string, index: number): void {
  console.log(`[DEBUG] initInstrumentSample called with instrument: ${instrumentName}, index: ${index}`);
  loadSample(instrumentName, index);
}

// Move sample loading to a separate function
function loadInstrumentSamples(): void {
  const instrumentSelect = document.getElementById("instrument") as HTMLSelectElement;
  const instrumentOption = instrumentSelect ? instrumentSelect.selectedIndex : 0;
  console.log("[DEBUG] Selected instrument index:", instrumentOption);

  if (instrumentSelect && instrumentSelect.querySelector(':checked')?.parentElement instanceof HTMLOptGroupElement) {
    const parentElement = instrumentSelect.querySelector(':checked')?.parentElement as HTMLOptGroupElement;
    if (parentElement.label === 'MIDI out') {
      const selectedOption = instrumentSelect.querySelector(':checked');
      if (selectedOption?.textContent) {
        myOutput = window.WebMidi.getOutputByName(selectedOption.textContent);
        console.log("[DEBUG] MIDI output selected:", myOutput);
        if (myOutput) {
          myOutput.sendAllSoundOff();
        }
      }
      return;
    }
  }

  myOutput = null;
  let instrumentToLoad = instruments[instrumentOption];
  if (!instrumentToLoad) {
    console.error("[DEBUG] No instrument selected, defaulting to piano");
    instrumentToLoad = instruments[0]; // Default to piano
  }
  console.log("[DEBUG] Selected instrument:", {
    index: instrumentOption,
    name: instrumentToLoad.fileName,
    fade: instrumentToLoad.fade,
    audioContextState: settings.audioContext?.state
  });
  
  // Add sampleBuffer to settings
  settings.sampleBuffer = [undefined, undefined, undefined, undefined];
  
  // Load the samples
  try {
    console.log("[DEBUG] About to load samples:", {
      instrument: instrumentToLoad.fileName,
      fade: instrumentToLoad.fade,
      audioContext: settings.audioContext?.state,
      sampleBuffer: settings.sampleBuffer
    });
    initInstrumentSample(instrumentToLoad.fileName, 0);
    setSampleFadeout(instrumentToLoad.fade);
  } catch (error) {
    console.error("[DEBUG] Error loading samples:", error);
    // Try loading piano as fallback
    console.log("[DEBUG] Attempting to load piano as fallback...");
    initInstrumentSample("piano", 0);
    setSampleFadeout(0.1);
  }
} 