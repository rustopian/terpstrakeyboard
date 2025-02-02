// Import audio functions
import { initAudio, initAudioHandler, loadInstrumentSamples } from './audio/audioHandler';

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
    
    // Hide settings dialog and landing page immediately
    console.log("[DEBUG] Hiding settings dialog and landing page...");
    const landingPage = document.getElementById("landing-page");
    const overlay = document.querySelector('.modal-overlay');
    const settingsButton = document.getElementById('settings-button');
    
    if (landingPage) landingPage.style.display = "none";
    if (overlay) overlay.classList.remove('active');
    if (settingsButton) settingsButton.style.display = 'block';
    document.body.style.overflow = 'hidden';

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
                if (mselect.options[i].text === "53-ed2 Bosanquet / Wilson / Terpstra (Lumatone)") {
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
        settingsForm.onsubmit = (event: Event) => {
            event.preventDefault();
            goKeyboard();
            return false;
        };
    }

    console.log("[DEBUG] All setup complete, calling goKeyboard...");
    goKeyboard();
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

    // Add preset change handler
    const presetSelect = document.getElementById('quicklinks') as HTMLSelectElement;
    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            try {
                const parameters = JSON.parse(presetSelect.value);
                settingsManager.updateFromPreset(parameters);
                settings = settingsManager.getSettings();
                initHexUtils(settings);
                initDisplayUtils(settings);
                // Update keyboard display immediately for live preview
                const keyboard = document.getElementById("keyboard");
                if (keyboard) {
                    keyboard.style.display = "block";
                    keyboard.style.visibility = "visible";
                    keyboard.style.opacity = "1";
                }
                drawGrid();
            } catch (error) {
                console.error('Error applying preset:', error);
            }
        });
    }
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

  // Always initialize keyboard immediately
  const instrumentSelect = document.getElementById("instrument") as HTMLSelectElement;
  if (instrumentSelect) {
    instrumentSelect.value = getData.instrument ?? "organ";
  }
  setTimeout(() => { goKeyboard(); }, 1500);

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

// Update goKeyboard to not try to start audio immediately
function goKeyboard(): boolean {
    // Update URL before anything else
    settingsManager.changeURL();
    console.log("[DEBUG] Starting keyboard initialization...");

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
    console.log("Initializing event handlers with settings:", settings);
    initEventHandlers(settings);

    // Show keyboard and settings button
    const keyboard = document.getElementById("keyboard");
    if (keyboard) {
        keyboard.style.display = "block";
        keyboard.style.visibility = "visible";
        keyboard.style.opacity = "1";
    }

    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
        settingsButton.style.display = 'block';
    }

    // Force a redraw
    drawGrid();

    return false;
}

// Initialize the settings manager
window.settingsManager = new SettingsManager();