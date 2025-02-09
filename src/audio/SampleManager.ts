import { Instrument } from '../core/types';

interface SampleState {
  buffer: AudioBuffer | undefined;
  loading: boolean;
  error?: Error;
  retries: number;
  lastLoaded: number;
}

type FrequencyKey = '110' | '220' | '440' | '880';

export class SampleManager {
  private samples: Map<string, Map<FrequencyKey, SampleState>> = new Map();
  private maxRetries = 3;
  private audioContext: AudioContext;
  private currentInstrument: string | null = null;
  
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  getAudioContext(): AudioContext {
    return this.audioContext;
  }

  async loadInstrument(instrument: Instrument): Promise<void> {
    this.currentInstrument = instrument.fileName;
    const frequencies: FrequencyKey[] = ['110', '220', '440', '880'];
    
    if (!this.samples.has(instrument.fileName)) {
      this.samples.set(instrument.fileName, new Map());
    }
        
    // Load all frequencies in parallel
    await Promise.all(frequencies.map(freq => this.loadSample(instrument.fileName, freq)));
  }

  private async loadSample(instrumentName: string, frequency: FrequencyKey): Promise<void> {
    const instrumentSamples = this.samples.get(instrumentName)!;
    let state = instrumentSamples.get(frequency);
    
    if (!state) {
      state = {
        buffer: undefined,
        loading: false,
        retries: 0,
        lastLoaded: 0
      };
      instrumentSamples.set(frequency, state);
    }

    if (state.loading) return;
    
    state.loading = true;
    try {
      const url = `/sounds/${instrumentName}${frequency}.mp3`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      state.buffer = audioBuffer;
      state.loading = false;
      state.error = undefined;
      state.lastLoaded = Date.now();
      state.retries = 0;
    } catch (error) {
      state.loading = false;
      state.error = error as Error;
      state.retries++;
      
      if (state.retries < this.maxRetries) {
        console.warn(`Retrying sample load for ${instrumentName}${frequency}, attempt ${state.retries + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * state.retries));
        return this.loadSample(instrumentName, frequency);
      } else if (instrumentName !== 'piano') {
        // Fallback to piano if we're not already loading piano
        console.warn(`Falling back to piano for ${frequency}Hz`);
        return this.loadSample('piano', frequency);
      }
    }
  }

  getBuffer(frequency: number): AudioBuffer | undefined {
    if (!this.currentInstrument) return undefined;
    
    const instrumentSamples = this.samples.get(this.currentInstrument);
    if (!instrumentSamples) return undefined;
    
    // Choose the appropriate sample based on frequency
    let sampleFreq: FrequencyKey = '110';
    if (frequency > 155) {
      if (frequency > 311) {
        sampleFreq = frequency > 622 ? '880' : '440';
      } else {
        sampleFreq = '220';
      }
    }
    
    return instrumentSamples.get(sampleFreq)?.buffer;
  }

  isLoading(): boolean {
    if (!this.currentInstrument) return false;
    const instrumentSamples = this.samples.get(this.currentInstrument);
    if (!instrumentSamples) return false;
    return Array.from(instrumentSamples.values()).some(state => state.loading);
  }

  clear(): void {
    this.samples.clear();
    this.currentInstrument = null;
  }

  hasLoadedSamples(): boolean {
    if (!this.currentInstrument) return false;
    const instrumentSamples = this.samples.get(this.currentInstrument);
    if (!instrumentSamples) return false;
    
    // Check if all required frequencies are loaded
    const requiredFreqs: FrequencyKey[] = ['110', '220', '440', '880'];
    return requiredFreqs.every(freq => {
      const state = instrumentSamples.get(freq);
      return state?.buffer && !state.loading && !state.error;
    });
  }

  updateAudioContext(newContext: AudioContext): void {
    this.audioContext = newContext;
    // Clear existing samples since they're tied to the old context
    this.clear();
  }
}

export const sampleManager = new SampleManager(new AudioContext()); 