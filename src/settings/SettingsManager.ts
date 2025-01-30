import { Point } from '../core/geometry';
import { calculateRotationMatrix } from '../core/geometry';
import { transformColorsForCVD, transformColorForCVD, ColorVisionType } from '../color/colorTransform';
import { hex2rgb, adjustColorSaturation } from '../color/colorUtils';
import { drawGrid } from '../grid/displayUtils';
import { defaultSettings } from './Settings';
import { Settings } from './Settings';

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

export class SettingsManager {
    private settings: Settings;
    private presets: PresetGroups = {};

    constructor() {
        this.settings = { ...defaultSettings };
    }

    public getSettings(): Settings {
        return this.settings;
    }

    public initializeCanvas(): void {
        const keyboard = document.getElementById("keyboard") as HTMLCanvasElement;
        if (keyboard) {
            keyboard.style.display = "block";
            keyboard.width = window.innerWidth;
            keyboard.height = window.innerHeight - 50;
            keyboard.style.width = '100%';
            keyboard.style.height = '100%';
            keyboard.style.margin = '0';

            this.settings.canvas = keyboard;
            this.settings.context = keyboard.getContext('2d')!;
        }
    }

    public updateDimensions(): void {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight - 50;  // Account for scroll area

        if (!this.settings.canvas || !this.settings.context) return;

        // Set canvas dimensions
        this.settings.canvas.width = newWidth;
        this.settings.canvas.height = newHeight;
        this.settings.canvas.style.width = '100%';
        this.settings.canvas.style.height = '100%';

        // Calculate centerpoint
        this.settings.centerpoint = new Point(newWidth / 2, newHeight / 2);

        // Calculate hex dimensions
        this.settings.hexHeight = this.settings.hexSize * 2;
        this.settings.hexVert = this.settings.hexHeight * 3 / 4;
        this.settings.hexWidth = Math.sqrt(3) / 2 * this.settings.hexHeight;

        // Update rotation matrix
        this.updateRotationMatrix();
    }

    public updateRotationMatrix(): void {
        if (!this.settings.context) return;

        // Restore previous state if exists
        if (this.settings.rotationMatrix) {
            this.settings.context.restore();
        }
        this.settings.context.save();

        // Calculate and apply new rotation matrix
        this.settings.rotationMatrix = calculateRotationMatrix(-this.settings.rotation, this.settings.centerpoint);
        const m = calculateRotationMatrix(this.settings.rotation, this.settings.centerpoint);
        this.settings.context.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    }

    public loadFromForm(): void {
        // Load basic settings
        this.settings.fundamental = parseFloat((document.getElementById("fundamental") as HTMLInputElement).value);
        this.settings.rSteps = parseInt((document.getElementById("rSteps") as HTMLInputElement).value);
        this.settings.urSteps = this.settings.rSteps - parseInt((document.getElementById("urSteps") as HTMLInputElement).value);
        this.settings.hexSize = parseInt((document.getElementById("hexSize") as HTMLInputElement).value);
        this.settings.rotation = (parseFloat((document.getElementById("rotation") as HTMLInputElement).value) * 2 * Math.PI) / 360;

        // Load checkbox settings
        this.settings.no_labels = (document.getElementById('no_labels') as HTMLInputElement).checked;
        this.settings.spectrum_colors = (document.getElementById('spectrum_colors') as HTMLInputElement).checked;
        this.settings.enum = (document.getElementById('enum') as HTMLInputElement).checked;
        this.settings.equivSteps = parseInt((document.getElementById('equivSteps') as HTMLInputElement).value);
        this.settings.showAllNotes = (document.getElementById('show_all_notes') as HTMLInputElement).checked;
        this.settings.showIntervals = (document.getElementById('show_intervals') as HTMLInputElement).checked;
        this.settings.invert_updown = (document.getElementById('invert-updown') as HTMLInputElement).checked;

        // Load colors and names
        this.settings.fundamental_color = (document.getElementById('fundamental_color') as HTMLInputElement).value;
        this.settings.names = (document.getElementById('names') as HTMLInputElement).value.split('\n');
    }

    public parseScale(): void {
        this.settings.scale = [];
        const scaleElement = document.getElementById('scale') as HTMLTextAreaElement;
        if (!scaleElement) return;

        const scaleLines = scaleElement.value.split('\n');
        scaleLines.forEach((line) => {
            if (line.match(/^[1234567890.\s/]+$/) && !line.match(/^\s+$/)) {
                if (line.match(/\//)) {
                    // Ratio
                    const [num, den] = line.split('/').map(n => parseInt(n));
                    const ratio = 1200 * Math.log(num / den) / Math.log(2);
                    this.settings.scale.push(ratio);
                } else if (line.match(/\./)) {
                    // Cents
                    this.settings.scale.push(parseFloat(line));
                }
            }
        });
        this.settings.equivInterval = this.settings.scale.pop() || 0;
        this.settings.scale.unshift(0);
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

        const currentValue = parseFloat(fundamentalInput.value);
        
        if (pitchType === 'A4') {
            // Convert from C4 to A4 (A4 is 9 semitones above C4)
            fundamentalInput.value = (currentValue * Math.pow(2, 9/12)).toFixed(5);
        } else {
            // Convert from A4 to C4 (C4 is 9 semitones below A4)
            fundamentalInput.value = (currentValue * Math.pow(2, -9/12)).toFixed(5);
        }

        // Update settings and redraw
        this.settings.fundamental = parseFloat(fundamentalInput.value);
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
                this.updateKeyboardDisplay();
            });

            colorsTextarea.addEventListener('input', () => {
                this.synchronizeTextareas();
                this.updatePreviewButtons();
                this.updateKeyboardDisplay();
            });
        }
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

        // Add change handler to update form values without immediate navigation
        quicklinks.addEventListener('change', (event) => {
            const select = event.target as HTMLSelectElement;
            if (select.selectedIndex > 0) { // If not "Choose Preset"
                try {
                    const parameters = JSON.parse(select.value);
                    this.updateFromPreset(parameters);
                } catch (error) {
                    console.error('Error applying preset:', error);
                }
            }
        });
    }

    // Update settings from preset parameters
    private updateFromPreset(parameters: any): void {
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

        // Update note configuration
        this.updateNoteConfigFromPreset(parameters);

        // Update URL without navigation
        this.changeURL();
        
        // Trigger UI updates
        this.hideRevealNames();
        this.hideRevealColors();
        this.hideRevealEnum();
    }

    // Update note configuration from preset parameters
    public updateNoteConfigFromPreset(parameters: any): void {
        // Update all form inputs based on parameters
        const formInputs = {
            'fundamental': parameters.fundamental,
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
            'show_all_notes': parameters.show_all_notes
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

    // Check preset selection
    public checkPreset(_init: number): void {
        // First check for URL parameters
        if (window.location.search) {
            const params = new URLSearchParams(window.location.search);
            const paramObj: any = {};
            params.forEach((value, key) => {
                paramObj[key] = value;
            });
            this.updateNoteConfigFromPreset(paramObj);
            return; // Don't apply preset if we have URL parameters
        }

        // Only apply preset if no URL parameters exist
        const mselect = document.getElementById('quicklinks') as HTMLSelectElement;
        if (!mselect) return;

        // Find and select the Lumatone preset
        for (let i = 0; i < mselect.options.length; i++) {
            if (mselect.options[i].text === "53-ed2 Bosanquet / Wilson / Terpstra (Lumatone)") {
                mselect.selectedIndex = i;
                // Trigger the change event to apply the preset
                mselect.dispatchEvent(new Event('change'));
                return;
            }
        }
    }

    // Reset preset selection
    public noPreset(): void {
        const quicklinks = document.getElementById('quicklinks') as HTMLSelectElement;
        if (quicklinks) {
            quicklinks.selectedIndex = 0;
        }
    }

    private changeURL(): void {
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
} 