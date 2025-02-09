import { Point } from '../core/geometry';
import { audioNodeManager } from './AudioNodeManager';
import { sampleManager } from './SampleManager';
import { hexCoordsToCents } from '../grid/hexUtils';
import { drawHex } from '../grid/displayUtils';
import { centsToColor } from '../grid/displayUtils';
import type { Settings } from '../settings/Settings';

declare global {
  interface Window {
    settings: Settings;
    noteEventManager: NoteEventManager;
  }
}

export interface NoteEvent {
  type: 'noteOn' | 'noteOff';
  coords: Point;
  frequency: number;
  midiNote: number;
  nodeId?: string;
}

interface NoteState {
  coords: Point;
  frequency: number;
  midiNote: number;
  nodeId?: string;
  startTime: number;
  sustainHeld?: boolean;
}

export class NoteEventManager {
  private activeNotes: Map<string, NoteState> = new Map();
  private midiEnabled: boolean = false;
  private midiOutput: WebMidiOutput | null = null;
  private sustain: boolean = false;
  private _audioContext: AudioContext | null = null;
  
  constructor() {
    // Clean up any lingering notes periodically.
    setInterval(() => this.cleanup(), 5000);
    // Do not block creation even if global settings is not yet defined.
  }

  // Getter to always retrieve the latest AudioContext from global settings or local backup
  private get audioContext(): AudioContext {
    // First try to get from global settings
    const ctx = window.settings?.audioContext;
    if (ctx) {
      this._audioContext = ctx; // Keep our local reference in sync
      return ctx;
    }
    
    // Fall back to our local context if we have one
    if (this._audioContext) {
      return this._audioContext;
    }
    
    throw new Error("AudioContext is not available. It may not have been initialized yet.");
  }

  // Setter for local audio context
  private set audioContext(ctx: AudioContext) {
    this._audioContext = ctx;
  }

  setMidiOutput(output: WebMidiOutput | null): void {
    this.midiOutput = output;
    this.midiEnabled = !!output;
  }

  setSustain(value: boolean): void {
    this.sustain = value;
    if (!value) {
      this.releaseAllSustained();
    }
  }

  private getNoteKey(coords: Point): string {
    return `${coords.x},${coords.y}`;
  }

  async handleNoteEvent(event: NoteEvent): Promise<void> {
    const key = this.getNoteKey(event.coords);
    
    if (event.type === 'noteOn') {
      // Handle note on.
      if (this.midiEnabled && this.midiOutput) {
        this.midiOutput.playNote(event.midiNote, [1]);
      } else {
        const buffer = sampleManager.getBuffer(event.frequency);
        if (buffer && !this.activeNotes.has(key)) {
          console.log(
            `[DEBUG] Playing note: ${event.frequency.toFixed(3)} Hz (MIDI: ${event.midiNote})`
          );
          const { source, gainNode } = await this.createAudioNodes(buffer, event.frequency);
          const nodeId = audioNodeManager.add(gainNode, source, event.frequency);
          
          this.activeNotes.set(key, {
            coords: event.coords,
            frequency: event.frequency,
            midiNote: event.midiNote,
            nodeId,
            startTime: Date.now()
          });
          
          // Propagate the nodeId to the corresponding ActiveHex (if any).
          if (window.settings && window.settings.activeHexObjects) {
            for (const hex of window.settings.activeHexObjects) {
              if (hex.coords.equals(event.coords)) {  // Assuming Point.equals is defined.
                hex.nodeId = nodeId;
              }
            }
          }
        }
      }
      
      // Update display (coloring the hex).
      drawHex(
        event.coords,
        centsToColor(hexCoordsToCents(event.coords), true)
      );
      
    } else {
      // Handle note off.
      const note = this.activeNotes.get(key);
      if (note) {
        if (this.sustain) {
          note.sustainHeld = true;
        } else {
          if (this.midiEnabled && this.midiOutput) {
            this.midiOutput.stopNote(note.midiNote, [1]);
          } else if (note.nodeId) {
            const nodePair = audioNodeManager.getNode(note.nodeId);
            if (nodePair) {
              this.releaseAudioNode(nodePair.gainNode, nodePair.source);
            }
          }
          this.activeNotes.delete(key);
        }
      }
      
      // Update display for note off.
      drawHex(
        event.coords,
        centsToColor(hexCoordsToCents(event.coords), false)
      );
    }
  }

  private async createAudioNodes(buffer: AudioBuffer, frequency: number): Promise<{ source: AudioBufferSourceNode, gainNode: GainNode }> {
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Ensure no unintended connections exist:
    source.disconnect();
    
    const sampleBaseFreq = frequency > 622 ? 880 :
                           frequency > 311 ? 440 :
                           frequency > 155 ? 220 : 110;
    source.playbackRate.value = frequency / sampleBaseFreq;
    
    const gainNode = this.audioContext.createGain();
    // Use the global settings (make sure window.settings is in sync with your SettingsManager)
    const settings = window.settings;
    const baseGain = settings?.instrumentFade || 0.3;
    const tiltVolume = settings?.tiltVolumeEnabled ? settings.tiltVolume : 1.0;
    const targetGain = baseGain * tiltVolume;
    
    // Set initial gain with proper ramping
    const currentTime = this.audioContext.currentTime;
    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, targetGain), currentTime + 0.02);
    
    console.log(`[DEBUG] Creating note with gain ${targetGain.toFixed(3)} (base: ${baseGain.toFixed(3)}, tilt: ${tiltVolume.toFixed(3)})`);
    
    // Important: Ensure the source is connected *only* via the gain node.
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    source.start(0);
    return { source, gainNode };
  }

  private releaseAudioNode(gainNode: GainNode, source: AudioBufferSourceNode): void {
    const releaseTime = this.audioContext.currentTime + 0.1;
    gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
    source.stop(releaseTime + 0.2);
  }

  private releaseAllSustained(): void {
    for (const [key, note] of this.activeNotes.entries()) {
      if (note.sustainHeld) {
        if (this.midiEnabled && this.midiOutput) {
          this.midiOutput.stopNote(note.midiNote, [1]);
        } else if (note.nodeId) {
          const nodePair = audioNodeManager.getNode(note.nodeId);
          if (nodePair) {
            this.releaseAudioNode(nodePair.gainNode, nodePair.source);
          }
        }
        this.activeNotes.delete(key);
        drawHex(
          note.coords,
          centsToColor(hexCoordsToCents(note.coords), false)
        );
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, note] of this.activeNotes.entries()) {
      // Clean up notes active for more than 30 seconds.
      if (now - note.startTime > 30000) {
        this.activeNotes.delete(key);
        if (note.nodeId) {
          audioNodeManager.remove(note.nodeId);
        }
        drawHex(
          note.coords,
          centsToColor(hexCoordsToCents(note.coords), false)
        );
      }
    }
  }

  releaseAll(): void {
    if (this.midiEnabled && this.midiOutput) {
      this.midiOutput.sendAllSoundOff();
    }
    
    for (const [key, note] of this.activeNotes.entries()) {
      if (note.nodeId) {
        audioNodeManager.remove(note.nodeId);
      }
      drawHex(
        note.coords,
        centsToColor(hexCoordsToCents(note.coords), false)
      );
      this.activeNotes.delete(key);
    }
  }

  // Update gains for all active notes with provided target gain
  updateAllGains(targetGain?: number): void {
    const settings = window.settings;
    if (!settings) return;

    // If no targetGain provided, calculate it from settings
    if (targetGain === undefined) {
      const baseGain = settings.instrumentFade || 0.3;
      const tiltVolume = settings.tiltVolumeEnabled ? settings.tiltVolume : 1.0;
      targetGain = baseGain * tiltVolume;
    }

    console.log(`[DEBUG] Updating all gains to ${targetGain.toFixed(3)}`);

    const currentTime = this.audioContext.currentTime;
    for (const note of this.activeNotes.values()) {
      if (note.nodeId) {
        const nodePair = audioNodeManager.getNode(note.nodeId);
        if (nodePair?.gainNode) {
          const gainNode = nodePair.gainNode;
          
          // Cancel any scheduled values
          gainNode.gain.cancelScheduledValues(currentTime);
          
          // Set current gain
          gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
          
          // Use linear ramp for zero or near-zero values, exponential otherwise
          if (targetGain <= 0.001) {
            gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.01);
          } else {
            gainNode.gain.exponentialRampToValueAtTime(
              targetGain,
              currentTime + 0.01
            );
          }
        }
      }
    }
  }

  updateAudioContext(newContext: AudioContext): void {
    // First stop all notes tied to the old context
    this.stopAllNotes();
    
    // Update our local context reference
    this._audioContext = newContext;
    
    // Ensure window.settings is also updated
    if (window.settings) {
      window.settings.audioContext = newContext;
    }
  }

  private stopAllNotes(): void {
    for (const [key, note] of this.activeNotes) {
      if (note.nodeId) {
        const nodePair = audioNodeManager.getNode(note.nodeId);
        if (nodePair) {
          const { source, gainNode } = nodePair;
          try {
            gainNode.disconnect();
            source.disconnect();
            source.stop();
          } catch (e) {
            console.warn('[DEBUG] Error stopping note:', e);
          }
          audioNodeManager.remove(note.nodeId);
        }
      }
      this.activeNotes.delete(key);
    }
  }
}

// Create and expose a singleton instance
const noteEventManager = new NoteEventManager();
window.noteEventManager = noteEventManager;
export default noteEventManager; 