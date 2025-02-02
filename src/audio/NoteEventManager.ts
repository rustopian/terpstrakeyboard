import { Point } from '../core/geometry';
import { audioNodeManager } from './AudioNodeManager';
import { sampleManager } from './SampleManager';
import { hexCoordsToCents } from '../grid/hexUtils';
import { drawHex } from '../grid/displayUtils';
import { centsToColor } from '../grid/displayUtils';

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
  private audioContext: AudioContext;
  
  constructor() {
    // Clean up any lingering notes periodically
    setInterval(() => this.cleanup(), 5000);
    this.audioContext = new AudioContext();
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
      // Handle note on
      if (this.midiEnabled && this.midiOutput) {
        this.midiOutput.playNote(event.midiNote, [1]);
      } else {
        const buffer = sampleManager.getBuffer(event.frequency);
        if (buffer && !this.activeNotes.has(key)) {
          console.log(`[DEBUG] Playing note: ${event.frequency.toFixed(3)} Hz (MIDI: ${event.midiNote})`);
          const { source, gainNode } = await this.createAudioNodes(buffer, event.frequency);
          const nodeId = audioNodeManager.add(gainNode, source, event.frequency);
          
          this.activeNotes.set(key, {
            coords: event.coords,
            frequency: event.frequency,
            midiNote: event.midiNote,
            nodeId,
            startTime: Date.now()
          });
        }
      }
      
      // Update display
      drawHex(event.coords, centsToColor(hexCoordsToCents(event.coords), true));
      
    } else {
      // Handle note off
      const note = this.activeNotes.get(key);
      if (note) {
        if (this.sustain) {
          // Keep the note but mark it for release when sustain ends
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
      
      // Update display
      drawHex(event.coords, centsToColor(hexCoordsToCents(event.coords), false));
    }
  }

  private async createAudioNodes(buffer: AudioBuffer, frequency: number): Promise<{ source: AudioBufferSourceNode, gainNode: GainNode }> {
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Get the base frequency of the sample we're using
    const sampleBaseFreq = frequency > 622 ? 880 :
                          frequency > 311 ? 440 :
                          frequency > 155 ? 220 : 110;
    
    // Calculate playback rate to achieve desired frequency from this sample
    source.playbackRate.value = frequency / sampleBaseFreq;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0.3; // Initial gain
    
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
        drawHex(note.coords, centsToColor(hexCoordsToCents(note.coords), false));
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, note] of this.activeNotes.entries()) {
      // Clean up notes that have been active for too long (30 seconds)
      if (now - note.startTime > 30000) {
        this.activeNotes.delete(key);
        if (note.nodeId) {
          audioNodeManager.remove(note.nodeId);
        }
        drawHex(note.coords, centsToColor(hexCoordsToCents(note.coords), false));
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
      drawHex(note.coords, centsToColor(hexCoordsToCents(note.coords), false));
      this.activeNotes.delete(key);
    }
  }
}

export const noteEventManager = new NoteEventManager(); 