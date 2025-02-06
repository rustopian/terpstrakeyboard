import { Point } from '../core/geometry';
import { calculateRotationMatrix } from '../core/geometry';
import type { ColorVisionType } from '../color/colorTransform';
import { transformColorsForCVD, transformColorForCVD } from '../color/colorTransform';
import { hex2rgb, adjustColorSaturation } from '../color/colorUtils';
import { drawGrid } from '../grid/displayUtils';
import { defaultSettings } from './Settings';
import type { Settings } from './Settings';
import type {
    EventHandlerSettings,
    AudioSettings,
    DisplaySettings,
    GridSettings,
} from './SettingsTypes';
import {
    hasEventHandlerProps,
    hasAudioProps,
    hasDisplayProps,
    hasGridProps
} from './SettingsTypes';

/**
 * Structure for a preset configuration
 */
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

/**
 * Manages application settings and provides typed access to settings for different modules.
 * Handles initialization, updates, and persistence of settings.
 */
export class SettingsManager {
    private settings: Settings;
    private presets: PresetGroups = {};
    private tiltSensorSubscription: number | null = null;

    constructor() {
        this.settings = { ...defaultSettings };
    }

    public updateTiltVolume(): void {
        const enabledCheckbox = document.getElementById('tilt_volume_enabled') as HTMLInputElement;
        const axisSelect = document.getElementById('tilt_volume_axis') as HTMLSelectElement;
        
        this.settings.tiltVolumeEnabled = enabledCheckbox.checked;
        this.settings.tiltVolumeAxis = axisSelect.value as 'x' | 'z';
        
        if (this.settings.tiltVolumeEnabled) {
            this.startTiltSensor();
        } else {
            this.stopTiltSensor();
            // Reset volume to full
            this.settings.tiltVolume = 1.0;
            this.updateAllActiveNoteVolumes();
        }
    }

    private startTiltSensor(): void {
        // Check if DeviceOrientationEvent is available
        if (!window.DeviceOrientationEvent) {
            console.warn('Device orientation not supported');
            return;
        }

        // Request permission if needed (iOS 13+)
        if ((DeviceOrientationEvent as any).requestPermission) {
            (DeviceOrientationEvent as any).requestPermission()
                .then((response: string) => {
                    if (response === 'granted') {
                        this.attachTiltListener();
                    }
                })
                .catch(console.error);
        } else {
            this.attachTiltListener();
        }
    }

    private attachTiltListener(): void {
        const handleOrientation = (event: DeviceOrientationEvent) => {
            if (!this.settings.tiltVolumeEnabled) return;

            // beta is front-to-back tilt (x-axis)
            // gamma is left-to-right tilt (z-axis)
            const angle = this.settings.tiltVolumeAxis === 'x' ? event.beta : event.gamma;
            
            if (angle !== null) {
                // Map -45° to 45° to volume range 0 to 1
                const volume = this.mapTiltToVolume(angle, -45, 45);
                if (this.settings.tiltVolume !== volume) {
                    this.settings.tiltVolume = volume;
                    this.updateAllActiveNoteVolumes();
                }
            }
        };

        window.addEventListener('deviceorientation', handleOrientation);
        this.tiltSensorSubscription = window.setInterval(() => {
            // Keep screen on for tilt control
            if (navigator.wakeLock) {
                navigator.wakeLock.request('screen').catch(console.error);
            }
        }, 30000);
    }

    private stopTiltSensor(): void {
        window.removeEventListener('deviceorientation', () => {});
        if (this.tiltSensorSubscription) {
            window.clearInterval(this.tiltSensorSubscription);
            this.tiltSensorSubscription = null;
        }
    }

    private mapTiltToVolume(angle: number, minAngle: number, maxAngle: number): number {
        const clamped = Math.max(minAngle, Math.min(maxAngle, angle));
        return (clamped - minAngle) / (maxAngle - minAngle);
    }

    private updateAllActiveNoteVolumes(): void {
        if (!this.settings.audioContext) return;

        // Update volume for all active notes
        for (const hex of this.settings.activeHexObjects) {
            if (hex.nodeId && this.settings.activeSources[hex.nodeId as any]) {
                const gainNode = this.settings.activeSources[hex.nodeId as any].gainNode;
                const currentTime = this.settings.audioContext.currentTime;
                // Use a short ramp time for smooth transitions
                const rampTime = 0.05; // 50ms ramp
                gainNode.gain.cancelScheduledValues(currentTime);
                gainNode.gain.linearRampToValueAtTime(
                    this.settings.tiltVolume,
                    currentTime + rampTime
                );
            }
        }
    }

    /**
     * Gets the complete settings object.
     * Use with caution - prefer the specific typed getters.
     */
    public getSettings(): Settings {
        return this.settings;
    }

    /**
     * Gets settings required for event handling.
     * Used by the event handling system for input processing.
     * @throws Error if required properties are missing
     */
    public getEventHandlerSettings(): EventHandlerSettings {
        if (!hasEventHandlerProps(this.settings)) {
            throw new Error('Settings missing required event handler properties');
        }
        return this.settings;
    }

    /**
     * Gets settings required for audio processing.
     * Used by the audio system for sound generation and MIDI.
     * @throws Error if required properties are missing
     */
    public getAudioSettings(): AudioSettings {
        if (!hasAudioProps(this.settings)) {
            throw new Error('Settings missing required audio properties');
        }
        return this.settings;
    }

    /**
     * Gets settings required for display rendering.
     * Used by the display system for visual output.
     * @throws Error if required properties are missing
     */
    public getDisplaySettings(): DisplaySettings {
        if (!hasDisplayProps(this.settings)) {
            throw new Error('Settings missing required display properties');
        }
        return this.settings;
    }

    /**
     * Gets settings required for grid calculations.
     * Used by the grid system for coordinate handling.
     * @throws Error if required properties are missing
     */
    public getGridSettings(): GridSettings {
        if (!hasGridProps(this.settings)) {
            throw new Error('Settings missing required grid properties');
        }
        return this.settings;
    }

    public initializeCanvas(): void {
        const keyboard = document.getElementById("keyboard") as HTMLCanvasElement;
        if (keyboard) {
            keyboard.style.display = "block";
            
            // Set display size (css pixels)
            keyboard.style.width = '100%';
            keyboard.style.height = '100%';
            keyboard.style.margin = '0';
            
            // Set actual size in memory (scaled for retina)
            const dpr = window.devicePixelRatio || 1;
            keyboard.width = window.innerWidth * dpr;
            keyboard.height = (window.innerHeight - 50) * dpr;
            
            this.settings.canvas = keyboard;
            this.settings.context = keyboard.getContext('2d', { alpha: false })!;
            
            // Scale all drawing operations by the dpr
            this.settings.context.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }

    public updateDimensions(): void {
        if (!this.settings.canvas || !this.settings.context) return;

        const dpr = window.devicePixelRatio || 1;
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight - 50;

        // Update canvas size
        this.settings.canvas.style.width = '100%';
        this.settings.canvas.style.height = '100%';
        this.settings.canvas.width = newWidth * dpr;
        this.settings.canvas.height = newHeight * dpr;

        // Reset the transform with the new DPI scale
        this.settings.context.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Calculate centerpoint (in CSS pixels)
        this.settings.centerpoint = new Point(newWidth / 2, newHeight / 2);

        // Calculate hex dimensions
        this.settings.hexHeight = this.settings.hexSize * 2;
        this.settings.hexVert = this.settings.hexHeight * 3 / 4;
        this.settings.hexWidth = Math.sqrt(3) / 2 * this.settings.hexHeight;

        // Calculate grid boundaries with padding
        const padding = 10;
        const hexesAcrossHalf = Math.ceil((newWidth / this.settings.hexWidth)) + padding;
        const hexesVerticalHalf = Math.ceil((newHeight / this.settings.hexVert)) + padding;
        
        const viewCenterX = this.settings.centerpoint.x;
        const viewCenterY = this.settings.centerpoint.y;
        
        const centerOffsetX = Math.floor(viewCenterX / this.settings.hexWidth);
        const centerOffsetY = Math.floor(viewCenterY / this.settings.hexVert);
        
        this.settings.minR = -hexesAcrossHalf + centerOffsetX;
        this.settings.maxR = hexesAcrossHalf + centerOffsetX;
        this.settings.minUR = -hexesVerticalHalf + centerOffsetY;
        this.settings.maxUR = hexesVerticalHalf + centerOffsetY;

        // Update rotation matrix
        this.updateRotationMatrix();
    }

    public updateRotationMatrix(): void {
        if (!this.settings.context) return;

        const dpr = window.devicePixelRatio || 1;

        // Restore previous state if exists
        if (this.settings.rotationMatrix) {
            this.settings.context.restore();
        }
        this.settings.context.save();

        // First apply DPI scaling
        this.settings.context.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Then calculate and apply rotation matrix
        this.settings.rotationMatrix = calculateRotationMatrix(-this.settings.rotation, this.settings.centerpoint);
        const m = calculateRotationMatrix(this.settings.rotation, this.settings.centerpoint);
        
        // Combine DPI scaling with rotation matrix
        this.settings.context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    }

    public loadFromForm(): void {
        // Get the current pitch type and value
        const pitchType = (document.getElementById('pitch-type') as HTMLSelectElement)?.value;
        const fundamentalInput = document.getElementById('fundamental') as HTMLInputElement;
        
        if (fundamentalInput) {
            const inputValue = parseFloat(fundamentalInput.value);
            if (!isNaN(inputValue)) {
                // If pitch type is A4, convert to C4 before storing
                if (pitchType === 'A4') {
                    this.settings.fundamental = inputValue * Math.pow(2, -9/12);
                } else {
                    this.settings.fundamental = inputValue;
                }
            }
        }

        // Load other settings...
        this.settings.rSteps = parseInt((document.getElementById("rSteps") as HTMLInputElement).value);
        this.settings.urSteps = this.settings.rSteps - parseInt((document.getElementById("urSteps") as HTMLInputElement).value);
        this.settings.hexSize = parseInt((document.getElementById("hexSize") as HTMLInputElement).value);
        this.settings.rotation = (parseFloat((document.getElementById("rotation") as HTMLInputElement).value) * 2 * Math.PI) / 360;

        // Load checkbox settings
        this.settings.no_labels = (document.getElementById('no_labels') as HTMLInputElement)?.checked ?? false;
        this.settings.spectrum_colors = (document.getElementById('spectrum_colors') as HTMLInputElement)?.checked ?? false;
        this.settings.enum = (document.getElementById('enum') as HTMLInputElement)?.checked ?? false;
        this.settings.equivSteps = parseInt((document.getElementById('equivSteps') as HTMLInputElement)?.value ?? "0");
        this.settings.showAllNotes = (document.getElementById('show_all_notes') as HTMLInputElement)?.checked ?? false;
        this.settings.showIntervals = (document.getElementById('show_intervals') as HTMLInputElement)?.checked ?? false;
        this.settings.invert_updown = (document.getElementById('invert-updown') as HTMLInputElement)?.checked ?? false;
        this.settings.useFullChordNotation = (document.getElementById('full-chord-notation') as HTMLInputElement)?.checked ?? false;
        this.settings.toggle_mode = (document.getElementById('toggle_mode') as HTMLInputElement)?.checked ?? false;
        
        // Load key image settings
        const keyImageSelect = document.getElementById('key-image') as HTMLSelectElement;
        if (keyImageSelect) {
            this.settings.useKeyImage = keyImageSelect.value !== 'none';
            this.settings.keyImage = keyImageSelect.value;
        }

        // Load colors and names
        this.settings.fundamental_color = (document.getElementById('fundamental_color') as HTMLInputElement).value;
        this.settings.names = (document.getElementById('names') as HTMLTextAreaElement).value.split('\n');

        // Load number-root setting
        const numberRootInput = document.getElementById('number-root') as HTMLInputElement;
        if (numberRootInput) {
            const numberRootValue = parseInt(numberRootInput.value);
            if (!isNaN(numberRootValue)) {
                this.settings.numberRoot = numberRootValue;
            }
        }

        // Load notation system setting
        const notationSelect = document.getElementById('notation-system') as HTMLSelectElement;
        if (notationSelect) {
            this.settings.notationSystem = notationSelect.value;
        }
    }

    public parseScale(): void {
        this.settings.scale = [];
        const scaleElement = document.getElementById('scale') as HTMLTextAreaElement;
        if (!scaleElement) return;

        const scaleLines = scaleElement.value.split('\n');
        let foundScale = false;
        let scaleSize = 0;
        
        scaleLines.forEach((line, index) => {
            // Skip comments and empty lines until we find the scale size
            if (!foundScale) {
                const sizeMatch = line.match(/^(\d+)\s*$/);
                if (sizeMatch) {
                    scaleSize = parseInt(sizeMatch[1]);
                    foundScale = true;
                    if (scaleSize <= 0) {
                        console.error(`Invalid scale size ${scaleSize} on line ${index + 1}. Scale size must be positive.`);
                        return;
                    }
                }
                return;
            }

            // Once we've found the scale size, parse numbers
            line = line.trim();
            if (line === '' || line.startsWith('!')) return;

            try {
                if (line.includes('/')) {
                    // Ratio
                    const [num, den] = line.split('/').map(n => parseInt(n));
                    if (!isNaN(num) && !isNaN(den) && den !== 0) {
                        const ratio = 1200 * Math.log(num / den) / Math.log(2);
                        if (!isNaN(ratio) && isFinite(ratio)) {
                            this.settings.scale.push(ratio);
                        } else {
                            console.warn(`Invalid ratio ${num}/${den} on line ${index + 1}`);
                        }
                    }
                } else {
                    // Cents
                    const cents = parseFloat(line);
                    if (!isNaN(cents) && isFinite(cents)) {
                        this.settings.scale.push(cents);
                    } else {
                        console.warn(`Invalid cents value "${line}" on line ${index + 1}`);
                    }
                }
            } catch (e) {
                console.warn(`Error parsing line ${index + 1}: ${line}`, e);
            }
        });

        // Validate scale length
        if (this.settings.scale.length === 0) {
            console.error('No valid scale entries found. Please provide at least one valid scale degree.');
            this.settings.scale = [0];
            this.settings.equivInterval = 1200; // Default octave size, but no assumptions about internal divisions
            return;
        }

        // Sort scale values to ensure they're in ascending order
        this.settings.scale.sort((a, b) => a - b);

        // Remove duplicates and validate values
        this.settings.scale = [...new Set(this.settings.scale)].filter(x => {
            if (!isFinite(x)) {
                console.warn(`Removing non-finite scale degree: ${x}`);
                return false;
            }
            // Allow any reasonable value that won't cause audio system issues
            if (Math.abs(x) > 14400) { // ±10 octaves should be enough for any practical use
                console.warn(`Removing scale degree outside reasonable range: ${x}`);
                return false;
            }
            return true;
        });

        // Ensure we have at least one value for equivInterval
        if (this.settings.scale.length > 0) {
            this.settings.equivInterval = this.settings.scale.pop() || 1200;
            // Ensure first value is 0
            if (this.settings.scale[0] !== 0) {
                this.settings.scale.unshift(0);
            }
        } else {
            console.error('All scale degrees were invalid. Please check your scale definition.');
            this.settings.equivInterval = 1200; // Default octave size, but no internal divisions
            this.settings.scale = [0];
        }

        // Update UI if needed
        const equivInput = document.getElementById('equiv-interval') as HTMLInputElement;
        if (equivInput) {
            equivInput.value = this.settings.equivInterval.toString();
        }
    }

    public parseScaleColors(): void {
        this.settings.keycolors = [];
        const noteColorsElement = document.getElementById('note_colors') as HTMLTextAreaElement;
        if (!noteColorsElement) return;

        const originalColors = noteColorsElement.value.split('\n').map(c => `#${c}`);
        
        // Apply saturation adjustment before color vision transformation
        const saturatedColors = originalColors.map(color => 
            adjustColorSaturation(color, this.settings.colorSaturation / 100));
        const transformedColors = transformColorsForCVD(saturatedColors, this.settings.colorVisionMode);
        this.settings.keycolors = transformedColors.map(c => c.substring(1));
    }

    public updateColorVisionMode(): void {
        const select = document.getElementById('color-vision-mode') as HTMLSelectElement;
        this.settings.colorVisionMode = select.value as ColorVisionType;
        
        // Transform colors based on selected mode
        const noteColorsElement = document.getElementById('note_colors') as HTMLTextAreaElement;
        if (noteColorsElement) {
            const originalColors = noteColorsElement.value.split('\n').map(c => `#${c}`);
            const transformedColors = transformColorsForCVD(originalColors, this.settings.colorVisionMode);
            this.settings.keycolors = transformedColors.map(c => c.substring(1));
        }
        
        this.updatePreviewButtons();
        this.updateKeyboardDisplay();
    }

    public updateColorSaturation(): void {
        const saturationSlider = document.getElementById('color-saturation') as HTMLInputElement;
        if (saturationSlider) {
            this.settings.colorSaturation = parseInt(saturationSlider.value);
            this.updatePreviewButtons();
            this.updateKeyboardDisplay();
        }
    }

    public updateKeyboardDisplay(): void {
        // Update all the settings
        this.settings.no_labels = (document.getElementById('no_labels') as HTMLInputElement).checked;
        this.settings.spectrum_colors = (document.getElementById('spectrum_colors') as HTMLInputElement).checked;
        this.settings.enum = (document.getElementById('enum') as HTMLInputElement).checked;
        this.settings.equivSteps = parseInt((document.getElementById('equivSteps') as HTMLInputElement).value);
        this.settings.names = (document.getElementById('names') as HTMLTextAreaElement).value.split('\n');
        this.settings.invert_updown = (document.getElementById('invert-updown') as HTMLInputElement).checked;
        this.settings.showIntervals = (document.getElementById('show_intervals') as HTMLInputElement).checked;
        this.settings.showAllNotes = (document.getElementById('show_all_notes') as HTMLInputElement).checked;
        
        // Get number root value if enum is enabled
        if (this.settings.enum) {
            const numberRootSelect = document.getElementById('number-root') as HTMLSelectElement;
            if (numberRootSelect) {
                this.settings.numberRoot = parseInt(numberRootSelect.value) || 0;
            }
        }
        
        // Safely check for symbolic chord notation checkbox
        const fullNotationCheckbox = document.getElementById('full-chord-notation') as HTMLInputElement;
        this.settings.useFullChordNotation = fullNotationCheckbox ? fullNotationCheckbox.checked : false;
            
        // Parse scale and colors
        this.parseScaleColors();
        
        // Clear and redraw the entire grid
        if (this.settings.canvas && this.settings.context) {
            this.settings.context.clearRect(0, 0, this.settings.canvas.width, this.settings.canvas.height);
            drawGrid();
        }
    }

    public handlePitchTypeChange(): void {
        const pitchType = (document.getElementById('pitch-type') as HTMLSelectElement)?.value;
        const fundamentalInput = document.getElementById('fundamental') as HTMLInputElement;

        if (!fundamentalInput) return;

        // If fundamental is 0 or not set, use default C4 = 261.6255653 Hz
        const currentC4 = this.settings.fundamental || 261.6255653;
        
        if (pitchType === 'A4') {
            // Convert from C4 to A4 (A4 is 9 semitones above C4)
            const a4Value = currentC4 * Math.pow(2, 9/12);
            fundamentalInput.value = a4Value.toFixed(5);
            // Also update settings to store the C4 value
            this.settings.fundamental = currentC4;
        } else {
            // When switching back to C4, show the actual C4 value
            fundamentalInput.value = currentC4.toFixed(5);
            this.settings.fundamental = currentC4;
        }

        // Update URL and redraw
        this.changeURL();
        drawGrid();
    }

    public handleFundamentalChange(): void {
        const pitchType = (document.getElementById('pitch-type') as HTMLSelectElement)?.value;
        const fundamentalInput = document.getElementById('fundamental') as HTMLInputElement;

        if (!fundamentalInput) return;

        const inputValue = parseFloat(fundamentalInput.value);
        
        if (isNaN(inputValue)) return;

        if (pitchType === 'A4') {
            // Convert A4 to C4 (C4 is 9 semitones below A4)
            // For example: if A4 = 442Hz, then C4 = 442 * 2^(-9/12) ≈ 263.0Hz
            this.settings.fundamental = inputValue * Math.pow(2, -9/12);
        } else {
            // Input is C4, set it directly as fundamental
            // For example: if C4 = 261.63Hz, then that's our fundamental
            this.settings.fundamental = inputValue;
        }

        // Update display and redraw
        drawGrid();
    }

    public handleCentralOctaveChange(): void {
        const octaveSlider = document.getElementById('central-octave') as HTMLInputElement;
        if (!octaveSlider) return;

        // Store the octave value in settings
        this.settings.octaveOffset = parseInt(octaveSlider.value);

        // Redraw the grid with the new octave numbers
        if (this.settings.canvas && this.settings.context) {
            this.settings.context.clearRect(0, 0, this.settings.canvas.width, this.settings.canvas.height);
            drawGrid();
        }
    }

    public updatePreviewButtons(): void {
        const namesElement = document.getElementById('names') as HTMLTextAreaElement;
        const noteColorsElement = document.getElementById('note_colors') as HTMLTextAreaElement;
        const noteButtons = document.querySelector('.note-buttons');
        
        if (!namesElement || !noteColorsElement || !noteButtons) return;
        
        const names = namesElement.value.split('\n');
        const colors = noteColorsElement.value.split('\n');
        
        // Clear existing buttons
        noteButtons.innerHTML = '';
        
        // Apply all color transformations
        const transformedColors = colors.map(c => {
            // Ensure color has # prefix
            const hexColor = c.startsWith('#') ? c : `#${c}`;
            
            // Apply saturation adjustment first
            const saturatedColor = adjustColorSaturation(hexColor, this.settings.colorSaturation / 100);
            
            // Then apply color vision deficiency transformation
            return transformColorForCVD(saturatedColor, this.settings.colorVisionMode);
        });
        
        // Create new preview buttons
        names.forEach((name, index) => {
            const button = document.createElement('button');
            button.className = 'note-button';
            
            // Apply the transformed color
            const baseColor = transformedColors[index] || '#ffffff';
            
            // Apply invert up/down if needed
            if (this.settings.invert_updown) {
                // Convert to RGB to darken
                const rgb = hex2rgb(baseColor);
                const darkenedColor = `rgb(${Math.max(0, rgb[0] - 90)}, ${Math.max(0, rgb[1] - 90)}, ${Math.max(0, rgb[2] - 90)})`;
                button.style.backgroundColor = darkenedColor;
                button.style.color = '#ffffff';
            } else {
                button.style.backgroundColor = baseColor;
                button.style.color = '#000000';
            }
            
            button.textContent = name;
            button.disabled = true; // Make buttons non-interactive
            noteButtons.appendChild(button);
        });
    }

    private populateNumberRootDropdown(): void {
        const numberRootSelect = document.getElementById('number-root') as HTMLSelectElement;
        const namesTextarea = document.getElementById('names') as HTMLTextAreaElement;
        
        if (!numberRootSelect || !namesTextarea) return;

        // Store current value before clearing
        const currentValue = this.settings.numberRoot;

        // Clear existing options
        numberRootSelect.innerHTML = '';
        
        // Get note names and populate dropdown
        const names = namesTextarea.value.split('\n');
        names.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = index.toString();
            option.text = name;
            numberRootSelect.appendChild(option);
        });

        // Set value from settings
        if (currentValue !== undefined) {
            numberRootSelect.value = currentValue.toString();
            this.settings.numberRoot = currentValue;
        }
    }

    public initNoteConfig(): void {
        const noteConfig = document.getElementById('note-config');
        if (!noteConfig) return;

        // Find or create note-buttons container
        let noteButtons = noteConfig.querySelector('.note-buttons');
        if (!noteButtons) {
            noteButtons = document.createElement('div');
            noteButtons.className = 'note-buttons';
            noteConfig.appendChild(noteButtons);
        } else {
            // Clear existing buttons
            noteButtons.innerHTML = '';
        }

        // Get current note names and colors
        const names = (document.getElementById('names') as HTMLTextAreaElement)?.value.split('\n') || [];
        const colors = (document.getElementById('note_colors') as HTMLTextAreaElement)?.value.split('\n') || [];

        // Create preview buttons for each note
        names.forEach((name, index) => {
            const button = document.createElement('button');
            button.className = 'note-button';
            button.style.backgroundColor = `#${colors[index] || 'ffffff'}`;
            button.textContent = name;
            button.disabled = true; // Make buttons non-interactive
            noteButtons.appendChild(button);
        });

        // Add live update handlers to textareas
        const namesTextarea = document.getElementById('names') as HTMLTextAreaElement;
        const colorsTextarea = document.getElementById('note_colors') as HTMLTextAreaElement;

        if (namesTextarea && colorsTextarea) {
            // Show the textareas
            namesTextarea.style.display = 'block';
            colorsTextarea.style.display = 'block';

            // Add scroll synchronization
            namesTextarea.addEventListener('scroll', () => {
                colorsTextarea.scrollTop = namesTextarea.scrollTop;
            });

            colorsTextarea.addEventListener('scroll', () => {
                namesTextarea.scrollTop = colorsTextarea.scrollTop;
            });

            // Add input handlers for live updates
            namesTextarea.addEventListener('input', () => {
                this.synchronizeTextareas();
                this.updatePreviewButtons();
                this.populateNumberRootDropdown();
                this.updateKeyboardDisplay();
            });

            colorsTextarea.addEventListener('input', () => {
                this.synchronizeTextareas();
                this.updatePreviewButtons();
                this.updateKeyboardDisplay();
            });
        }

        // Populate the number root dropdown initially
        this.populateNumberRootDropdown();
    }

    private synchronizeTextareas(): void {
        const namesTextarea = document.getElementById('names') as HTMLTextAreaElement;
        const colorsTextarea = document.getElementById('note_colors') as HTMLTextAreaElement;

        if (!namesTextarea || !colorsTextarea) return;

        const names = namesTextarea.value.split('\n');
        const colors = colorsTextarea.value.split('\n');

        // Ensure both arrays have the same length
        const maxLength = Math.max(names.length, colors.length);
        while (names.length < maxLength) names.push('');
        while (colors.length < maxLength) colors.push('ffffff');

        // Update textareas
        namesTextarea.value = names.join('\n');
        colorsTextarea.value = colors.join('\n');
    }

    public hideRevealNames(): void {
        const enumCheckbox = document.getElementById("enum") as HTMLInputElement;
        const equivStepsElement = document.getElementById("equivSteps") as HTMLElement;
        const namesElement = document.getElementById("names") as HTMLElement;
        const numberLabel = document.getElementById("numberLabel") as HTMLElement;
        const namesLabel = document.getElementById("namesLabel") as HTMLElement;
        const numberRootContainer = document.getElementById("number-root-container") as HTMLElement;

        if (enumCheckbox && enumCheckbox.checked) {
            if (equivStepsElement) equivStepsElement.style.display = 'block';
            if (namesElement) namesElement.style.display = 'none';
            if (numberLabel) numberLabel.style.display = 'block';
            if (namesLabel) namesLabel.style.display = 'none';
            if (numberRootContainer) numberRootContainer.style.display = 'block';
            
            // Always populate the dropdown when enum is checked
            const numberRootSelect = document.getElementById('number-root') as HTMLSelectElement;
            if (numberRootSelect) {
                // Clear existing options
                numberRootSelect.innerHTML = '';
                // Populate with note names
                const names = (document.getElementById('names') as HTMLTextAreaElement)?.value.split('\n') || [];
                names.forEach((name, index) => {
                    const option = document.createElement('option');
                    option.value = index.toString();
                    option.text = name;
                    numberRootSelect.appendChild(option);
                });
                // Set current value
                numberRootSelect.value = this.settings.numberRoot.toString();
            }
        } else {
            if (equivStepsElement) equivStepsElement.style.display = 'none';
            if (namesElement) namesElement.style.display = 'block';
            if (numberLabel) numberLabel.style.display = 'none';
            if (namesLabel) namesLabel.style.display = 'block';
            if (numberRootContainer) numberRootContainer.style.display = 'none';
        }
        this.updateKeyboardDisplay();
    }

    public hideRevealColors(): void {
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
        this.updateKeyboardDisplay();
    }

    public hideRevealEnum(): void {
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
        this.updateKeyboardDisplay();
    }

    // Load presets from JSON file
    public async loadPresets(): Promise<void> {
        try {
            const response = await fetch('presets.json');
            this.presets = await response.json();
            this.populatePresetDropdown();
            this.checkPreset(16);
        } catch (error) {
            console.error('Error loading presets:', error);
        }
    }

    // Check preset selection and handle initial state
    public checkPreset(_init: number): void {
        // Always hide settings dialog on load
        const settingsDialog = document.getElementById('settings-dialog');
        if (settingsDialog) {
            settingsDialog.style.display = 'none';
        }

        // First check for URL parameters
        if (window.location.search) {
            const params = new URLSearchParams(window.location.search);
            const paramObj: any = {};
            
            // First pass: decode all parameters
            params.forEach((value, key) => {
                try {
                    paramObj[key] = decodeURIComponent(value);
                } catch (e) {
                    paramObj[key] = value;
                }
            });

            // Handle notation system before other parameters
            if (params.has('notationSystem')) {
                const notationSystem = params.get('notationSystem');
                const notationSelect = document.getElementById('notation-system') as HTMLSelectElement;
                if (notationSelect && notationSystem) {
                    notationSelect.value = notationSystem;
                    this.settings.notationSystem = notationSystem;
                    console.log('[DEBUG] Loaded notation system from URL:', notationSystem);
                }
            }

            // Special handling for number-root before anything else
            if ('number-root' in paramObj) {
                const rootValue = parseInt(paramObj['number-root']);
                if (!isNaN(rootValue)) {
                    this.settings.numberRoot = rootValue;
                }
            }

            // Update form with URL parameters
            this.updateFromPreset(paramObj);

            // Ensure notation system is not overwritten by preset
            if (params.has('notationSystem')) {
                const notationSystem = params.get('notationSystem');
                if (notationSystem) {
                    this.settings.notationSystem = notationSystem;
                    const notationSelect = document.getElementById('notation-system') as HTMLSelectElement;
                    if (notationSelect) {
                        notationSelect.value = notationSystem;
                    }
                }
            }

            // Ensure the dropdown is populated with current note names
            this.populateNumberRootDropdown();
            
            // Try to find and select matching preset in dropdown based on scale content
            const mselect = document.getElementById('quicklinks') as HTMLSelectElement;
            if (mselect && paramObj.scale) {
                const scaleContent = decodeURIComponent(paramObj.scale);
                for (let i = 0; i < mselect.options.length; i++) {
                    const option = mselect.options[i];
                    try {
                        const parameters = JSON.parse(option.value);
                        if (parameters.scale && parameters.scale.join('\n') === scaleContent) {
                            mselect.selectedIndex = i;
                            break;
                        }
                    } catch (e) {
                        console.warn('Error parsing preset parameters:', e);
                    }
                }
            }

            // Update keyboard display
            this.updateKeyboardDisplay();
            return;
        }

        // If no URL parameters, load default preset
        this.loadDefaultPreset();
        this.updateKeyboardDisplay();
    }

    // Reset preset selection
    public noPreset(): void {
        const quicklinks = document.getElementById('quicklinks') as HTMLSelectElement;
        if (quicklinks) {
            quicklinks.selectedIndex = 0;
        }
    }

    // Populate the quicklinks dropdown with presets from JSON
    private populatePresetDropdown(): void {
        const quicklinks = document.getElementById('quicklinks') as HTMLSelectElement;
        if (!quicklinks) return;

        // Clear existing options except the first "Choose Preset" option
        while (quicklinks.options.length > 1) {
            quicklinks.remove(1);
        }

        // Add presets from JSON
        Object.entries(this.presets).forEach(([groupName, groupPresets]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = groupName;

            groupPresets.forEach(preset => {
                const option = document.createElement('option');
                option.text = preset.label;
                option.value = JSON.stringify(preset.parameters);
                optgroup.appendChild(option);
            });

            quicklinks.appendChild(optgroup);
        });

        // Add change handler to update form values and URL
        quicklinks.addEventListener('change', (event) => {
            const select = event.target as HTMLSelectElement;
            if (select.selectedIndex > 0) { // If not "Choose Preset"
                try {
                    const parameters = JSON.parse(select.value);
                    this.updateFromPreset(parameters);
                    
                    // Update URL to include preset name
                    const url = new URL(window.location.href);
                    url.searchParams.set('preset', encodeURIComponent(select.options[select.selectedIndex].text));
                    window.history.replaceState({}, '', url.toString());
                } catch (error) {
                    console.error('Error applying preset:', error);
                }
            }
        });
    }

    // Update settings from preset parameters
    public updateFromPreset(parameters: any): void {
        // Always ensure settings dialog is hidden
        const settingsDialog = document.getElementById('settings-dialog');
        if (settingsDialog) {
            settingsDialog.style.display = 'none';
        }

        // Handle number root value early
        if (parameters['number-root'] !== undefined) {
            const rootValue = parseInt(parameters['number-root']);
            if (!isNaN(rootValue)) {
                this.settings.numberRoot = rootValue;
            }
        }

        // Update form fields with preset values
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

        // Handle notation system
        const notationSystem = parameters.notationSystem || 'Standard';
        const notationSelect = document.getElementById('notation-system') as HTMLSelectElement;
        if (notationSelect) {
            notationSelect.value = notationSystem;
            this.settings.notationSystem = notationSystem;
        }

        // Update note configuration
        this.updateNoteConfigFromPreset(parameters);

        // Handle pitch type parameter
        const pitchType = parameters['pitch-type'];
        if (pitchType) {
            const pitchTypeSelect = document.getElementById('pitch-type') as HTMLSelectElement;
            if (pitchTypeSelect) {
                pitchTypeSelect.value = pitchType;
                // Update fundamental display if needed
                this.handlePitchTypeChange();
            }
        }

        // Update scale and names
        const scaleElement = document.getElementById('scale') as HTMLTextAreaElement;
        if (scaleElement && parameters.scale) {
            scaleElement.value = Array.isArray(parameters.scale) ? parameters.scale.join('\n') : parameters.scale;
        }

        // Handle number root and dropdown visibility
        const enumCheckbox = document.getElementById('enum') as HTMLInputElement;
        const numberRootContainer = document.getElementById('number-root-container') as HTMLElement;
        const equivStepsElement = document.getElementById('equivSteps') as HTMLElement;
        const namesElement = document.getElementById('names') as HTMLElement;
        const numberLabel = document.getElementById('numberLabel') as HTMLElement;
        const namesLabel = document.getElementById('namesLabel') as HTMLElement;

        if (enumCheckbox?.checked) {
            // Show number-related elements
            if (equivStepsElement) equivStepsElement.style.display = 'block';
            if (numberLabel) numberLabel.style.display = 'block';
            if (namesElement) namesElement.style.display = 'none';
            if (namesLabel) namesLabel.style.display = 'none';
            if (numberRootContainer) numberRootContainer.style.display = 'block';
            
            // Always populate the dropdown when enum is checked
            const numberRootSelect = document.getElementById('number-root') as HTMLSelectElement;
            if (numberRootSelect) {
                // Clear existing options
                numberRootSelect.innerHTML = '';
                // Populate with note names
                const names = (document.getElementById('names') as HTMLTextAreaElement)?.value.split('\n') || [];
                names.forEach((name, index) => {
                    const option = document.createElement('option');
                    option.value = index.toString();
                    option.text = name;
                    numberRootSelect.appendChild(option);
                });

                // Set number root value from settings
                numberRootSelect.value = this.settings.numberRoot.toString();
            }
        } else {
            // Hide number-related elements
            if (equivStepsElement) equivStepsElement.style.display = 'none';
            if (numberLabel) numberLabel.style.display = 'none';
            if (namesElement) namesElement.style.display = 'block';
            if (namesLabel) namesLabel.style.display = 'block';
            if (numberRootContainer) numberRootContainer.style.display = 'none';
        }

        // Trigger UI updates
        this.hideRevealColors();
        this.hideRevealEnum();

        if (parameters.full_chord_notation !== undefined) {
            (document.getElementById('full-chord-notation') as HTMLInputElement).checked = 
                parameters.full_chord_notation === 'true';
        }

        // Update dimensions and rotation matrix
        this.updateDimensions();
        this.updateRotationMatrix();

        // Redraw the grid
        if (this.settings.canvas && this.settings.context) {
            this.settings.context.clearRect(0, 0, this.settings.canvas.width, this.settings.canvas.height);
            drawGrid();
        }
    }

    // Load the default Lumatone preset
    public loadDefaultPreset(): boolean {
        const mselect = document.getElementById('quicklinks') as HTMLSelectElement;
        if (!mselect) return false;

        // Find the Lumatone preset
        for (let i = 0; i < mselect.options.length; i++) {
            if (mselect.options[i].text === "31-ed2 Lumatone") {
                mselect.selectedIndex = i;
                try {
                    const parameters = JSON.parse(mselect.value);
                    this.updateFromPreset(parameters);
                    return true;
                } catch (error) {
                    console.error('Error applying default preset:', error);
                    return false;
                }
            }
        }
        return false;
    }

    // Update note configuration from preset parameters
    public updateNoteConfigFromPreset(parameters: any): void {
        // Update all form inputs based on parameters
        const formInputs = {
            'fundamental': parameters.fundamental || '261.6255653', // Default C4 if not specified
            'rSteps': parameters.right,
            'urSteps': parameters.upright,
            'hexSize': parameters.size,
            'rotation': parameters.rotation,
            'instrument': parameters.instrument,
            'enum': parameters.enum,
            'equivSteps': parameters.equivSteps,
            'spectrum_colors': parameters.spectrum_colors,
            'fundamental_color': parameters.fundamental_color,
            'no_labels': parameters.no_labels,
            'midi_input': parameters.midi_input,
            'invert-updown': parameters.invert_updown,
            'show_intervals': parameters.show_intervals,
            'show_all_notes': parameters.show_all_notes,
            'toggle_mode': parameters.toggle_mode
        };

        // Update each form input if parameter exists
        Object.entries(formInputs).forEach(([id, value]) => {
            if (value !== undefined) {
                const element = document.getElementById(id) as HTMLInputElement;
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value === 'true';
                    } else {
                        element.value = value;
                    }
                }
            }
        });

        // Set pitch type dropdown based on fundamental frequency
        const pitchTypeSelect = document.getElementById('pitch-type') as HTMLSelectElement;
        if (pitchTypeSelect) {
            // Get pitch type from parameters or default to fundamental
            const pitchType = parameters['pitch-type'] || 'fundamental';
            pitchTypeSelect.value = pitchType;
            
            // Update fundamental value based on pitch type
            const fundamentalInput = document.getElementById('fundamental') as HTMLInputElement;
            if (fundamentalInput && fundamentalInput.value) {
                const inputValue = parseFloat(fundamentalInput.value);
                if (!isNaN(inputValue)) {
                    if (pitchType === 'A4') {
                        // Convert A4 to C4 for internal storage
                        this.settings.fundamental = inputValue * Math.pow(2, -9/12);
                    } else {
                        this.settings.fundamental = inputValue;
                    }
                }
            }
        }

        // Handle multiline text areas
        const textAreas = {
            'scale': parameters.scale,
            'names': parameters.names,
            'note_colors': parameters.note_colors
        };

        Object.entries(textAreas).forEach(([id, value]) => {
            if (value) {
                const element = document.getElementById(id) as HTMLTextAreaElement;
                if (element) {
                    if (Array.isArray(value)) {
                        element.value = value.join('\n');
                    } else {
                        element.value = value;
                    }
                }
            }
        });

        // Update settings object with new values
        if (parameters.right) {
            this.settings.rSteps = parseInt(String(parameters.right));
        }
        if (parameters.upright) {
            this.settings.urSteps = parseInt(String(parameters.upright));
        }

        // Initialize note configuration UI
        this.initNoteConfig();
    }

    public changeURL(): void {
        const url = new URL(window.location.pathname, window.location.origin);
        const quicklinks = document.getElementById('quicklinks') as HTMLSelectElement;
        
        // Add preset name if one is selected
        if (quicklinks && quicklinks.selectedIndex > 0) {
            const selectedOption = quicklinks.options[quicklinks.selectedIndex];
            url.searchParams.set('preset', encodeURIComponent(selectedOption.text));
        }

        function getElementValue(id: string): string {
            const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
            return element ? element.value : '';
        }

        // Add notation system to URL parameters
        const notationSystem = getElementValue('notation-system');
        if (notationSystem) {
            url.searchParams.set('notationSystem', notationSystem);
        }

        // Add all other parameters
        const fundamental = getElementValue('fundamental');
        if (fundamental) {
            url.searchParams.set('fundamental', fundamental);
        }

        // Add modified parameters to URL
        const params = [
            "pitch-type", "rSteps", "urSteps", "hexSize", "rotation",
            "instrument", "enum", "equivSteps", "spectrum_colors",
            "fundamental_color", "no_labels", "midi_input", "invert-updown",
            "show_intervals", "show_all_notes", "key-image", "full-chord-notation",
            "toggle_mode"
        ];

        params.forEach(param => {
            const value = getElementValue(param);
            if (value) {
                url.searchParams.set(param, encodeURIComponent(value));
            }
        });

        // Always include number-root in URL if enum is checked
        const enumCheckbox = document.getElementById('enum') as HTMLInputElement;
        if (enumCheckbox?.checked) {
            console.log('[DEBUG] Updating URL with number-root:', this.settings.numberRoot);
            url.searchParams.set('number-root', this.settings.numberRoot.toString());
        }

        // Add scale, names, and note_colors
        ["scale", "names", "note_colors"].forEach(param => {
            const value = getElementValue(param);
            if (value) {
                url.searchParams.set(param, encodeURIComponent(value));
            }
        });

        // Add learningChord to URL if it exists
        if (this.settings.learningChordSymbol) {
            const learningChordSymbol = encodeURIComponent(this.settings.learningChordSymbol);
            url.searchParams.set('learningChord', learningChordSymbol);
        }

        // Update page title from scale description
        const scaleElement = document.getElementById('scale') as HTMLTextAreaElement;
        if (scaleElement) {
            const scaleLines = scaleElement.value.split('\n');
            let description = "Temper";

            for (const line of scaleLines) {
                if (line.match(/[a-zA-Z]+/) && !line.match(/^!/)) {
                    description = line;
                    break;
                }
            }

            document.title = description;
        }

        console.log('[DEBUG] Final URL:', url.toString());
        window.history.replaceState({}, '', url.toString());
    }

    public updateNotationSystem(): void {
        const notationSelect = document.getElementById('notation-system') as HTMLSelectElement;
        if (!notationSelect) return;

        console.log('[DEBUG] Updating notation system from:', this.settings.notationSystem, 'to:', notationSelect.value);
        
        // Update both the settings object and the global settings
        this.settings.notationSystem = notationSelect.value;
        window.settings.notationSystem = notationSelect.value;
        
        console.log('[DEBUG] Updated settings.notationSystem:', this.settings.notationSystem);
        console.log('[DEBUG] Updated window.settings.notationSystem:', window.settings.notationSystem);

        // Update the keyboard display
        this.updateKeyboardDisplay();
        this.changeURL();
    }

    // Initialize settings
    public initialize(): void {
        // Initialize settings object
        this.settings = { ...defaultSettings };

        // Initialize canvas
        this.initializeCanvas();

        // Try to load settings from URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.toString()) {
            const parameters: { [key: string]: string } = {};
            urlParams.forEach((value, key) => {
                parameters[key] = value;
            });
            this.updateFromPreset(parameters);
        } else {
            // If no URL parameters, load default preset
            this.loadDefaultPreset();
        }

        // Initialize note configuration (which now includes populating the dropdown)
        this.initNoteConfig();

        // Set up event listeners for form elements
        const pitchTypeSelect = document.getElementById('pitch-type') as HTMLSelectElement;
        if (pitchTypeSelect) {
            // Set initial value to fundamental (C4) mode
            pitchTypeSelect.value = 'fundamental';
            // Add change event listener
            pitchTypeSelect.addEventListener('change', () => {
                this.handlePitchTypeChange();
                this.changeURL();
            });
        }

        // Add event listener for number-root dropdown
        const numberRootSelect = document.getElementById('number-root') as HTMLSelectElement;
        if (numberRootSelect) {
            console.log('[DEBUG] Attaching event listener to number-root dropdown');
            numberRootSelect.addEventListener('change', () => {
                const selectedValue = numberRootSelect.value;
                console.log('[DEBUG] Dropdown selected value:', selectedValue);
                this.settings.numberRoot = parseInt(selectedValue);
                console.log('[DEBUG] Number root changed to:', this.settings.numberRoot);
                this.updateKeyboardDisplay();
                this.changeURL();
            });
        } else {
            console.error('[DEBUG] number-root element not found');
        }

        const octaveSlider = document.getElementById('central-octave') as HTMLInputElement;
        if (octaveSlider) {
            octaveSlider.addEventListener('input', () => this.handleCentralOctaveChange());
        }

        const colorVisionSelect = document.getElementById('color-vision-mode') as HTMLSelectElement;
        if (colorVisionSelect) {
            colorVisionSelect.addEventListener('change', () => this.updateColorVisionMode());
        }

        const saturationSlider = document.getElementById('color-saturation') as HTMLInputElement;
        if (saturationSlider) {
            saturationSlider.addEventListener('input', () => this.updateColorSaturation());
        }

        // Set up checkbox event listeners
        const checkboxes = ['no_labels', 'spectrum_colors', 'enum', 'show_all_notes', 
                          'show_intervals', 'invert-updown', 'full-chord-notation', 'toggle_mode'];
        checkboxes.forEach(id => {
            const checkbox = document.getElementById(id) as HTMLInputElement;
            if (checkbox) {
                checkbox.addEventListener('change', () => this.updateKeyboardDisplay());
            }
        });

        // Set up text input event listeners
        const textInputs = ['fundamental', 'rSteps', 'urSteps', 'hexSize', 'rotation', 'equivSteps'];
        textInputs.forEach(id => {
            const input = document.getElementById(id) as HTMLInputElement;
            if (input) {
                input.addEventListener('change', () => {
                    this.loadFromForm();
                    this.updateDimensions();
                    this.updateKeyboardDisplay();
                });
            }
        });

        // Load presets
        this.loadPresets();

        // Initial keyboard display update
        this.updateKeyboardDisplay();

        // Add event listener for notation system dropdown
        const notationSelect = document.getElementById('notation-system') as HTMLSelectElement;
        if (notationSelect) {
            notationSelect.value = this.settings.notationSystem;
            notationSelect.addEventListener('change', () => this.updateNotationSystem());
        }
    }
} 