interface Instrument {
  fileName: string;
  fade: number;
}

export const instruments: Instrument[] = [
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

let audioContext: AudioContext | undefined;
let sampleBuffer: (AudioBuffer | undefined)[] = [undefined, undefined, undefined, undefined];
let sampleFadeout: number;
let debugLoading = true;

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export function initAudio(): AudioContext | null {
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) {
      audioContext = new AudioContext();
      if (debugLoading) console.log("Audio context created:", audioContext.state);
    } else if (debugLoading) {
      console.log("Using existing audio context:", audioContext.state);
    }
    return audioContext;
  } catch (e) {
    alert('Web Audio API is not supported in this browser');
    return null;
  }
}

export function loadSample(name: string, iteration: number): void {
  if (!audioContext) {
    console.error("No audio context available for loading sample");
    return;
  }

  const sampleFreqs = ["110", "220", "440", "880"];
  const url = `/sounds/${name}${sampleFreqs[iteration]}.mp3`;
  
  console.log(`[DEBUG] Starting to load sample: ${url}`);
  console.log(`[DEBUG] Current sample buffer status:`, 
    sampleBuffer.map((buf, i) => `${i}: ${buf ? 'loaded' : 'empty'}`));
  
  const request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    console.log(`[DEBUG] XMLHttpRequest complete for ${url}:`);
    console.log(`[DEBUG] - Status: ${request.status}`);
    console.log(`[DEBUG] - Response type: ${request.response?.constructor.name}`);
    console.log(`[DEBUG] - Response size: ${request.response?.byteLength} bytes`);
    
    if (request.status === 200) {
      console.log(`[DEBUG] Sample loaded from ${url}, decoding...`);
      audioContext?.decodeAudioData(request.response, 
        function(buffer) {
          console.log(`[DEBUG] Sample decoded successfully: ${url}`);
          console.log(`[DEBUG] - Buffer length: ${buffer.length} samples`);
          console.log(`[DEBUG] - Sample rate: ${buffer.sampleRate} Hz`);
          sampleBuffer[iteration] = buffer;
          console.log(`[DEBUG] Updated sample buffer status:`, 
            sampleBuffer.map((buf, i) => `${i}: ${buf ? 'loaded' : 'empty'}`));
          if (iteration < 3) {
            loadSample(name, iteration + 1);
          }
        }, 
        function(error) {
          console.error(`Error decoding sample ${url}:`, error);
          console.error(`[DEBUG] Decode error details:`, {
            error: error?.message || 'Unknown error',
            context: audioContext?.state
          });
          handleLoadError(name, iteration, new Error(`Failed to decode audio data: ${error?.message || 'Unknown error'}`));
        }
      );
    } else {
      console.error(`[DEBUG] HTTP error loading ${url}:`, {
        status: request.status,
        statusText: request.statusText,
        responseType: request.responseType,
        responseURL: request.responseURL
      });
      handleLoadError(name, iteration, new Error(`HTTP error ${request.status}: ${request.statusText}`));
    }
  };

  request.onerror = function() {
    console.error(`[DEBUG] Network error loading sample: ${url}`);
    console.error(`[DEBUG] Request details:`, {
      readyState: request.readyState,
      status: request.status,
      statusText: request.statusText
    });
    handleLoadError(name, iteration, new Error(`Network error loading sample: ${url}`));
  };

  console.log(`[DEBUG] Sending request for: ${url}`);
  request.send();
}

function handleLoadError(name: string, iteration: number, error: Error): void {
  console.error(`Error loading sample:`, error);
  if (name !== "piano") {
    if (debugLoading) console.log("Attempting to load fallback piano sample...");
    loadSample("piano", iteration);
  } else {
    console.error("Even piano fallback failed:", error);
  }
}

export function playNote(freq: number): { source: AudioBufferSourceNode; gainNode: GainNode } | null {
  if (!audioContext) {
    console.error("[DEBUG] No audio context available for playback");
    console.error("[DEBUG] Audio context state: suspended");
    return null;
  }
  
  // Choose sample
  let sampleFreq = 110;
  let sampleNumber = 0;
  if (freq > 155) {
    if (freq > 311) {
      if (freq > 622) {
        sampleFreq = 880;
        sampleNumber = 3;
      } else {
        sampleFreq = 440;
        sampleNumber = 2;
      }
    } else {
      sampleFreq = 220;
      sampleNumber = 1;
    }
  }

  console.log(`[DEBUG] Playing note:`, {
    requestedFreq: freq,
    selectedSample: sampleNumber,
    sampleFreq: sampleFreq,
    playbackRate: freq / sampleFreq,
    contextState: audioContext.state,
    bufferStatus: sampleBuffer.map((buf, i) => `${i}: ${buf ? 'loaded' : 'empty'}`)
  });

  if (!sampleBuffer[sampleNumber]) {
    console.error(`[DEBUG] Sample ${sampleNumber} not loaded yet. Buffer status:`, 
      sampleBuffer.map((buf, i) => `${i}: ${buf ? 'loaded' : 'empty'}`));
    return null;
  }

  const source = audioContext.createBufferSource();
  source.buffer = sampleBuffer[sampleNumber]!;
  source.playbackRate.value = freq / sampleFreq;
  
  const gainNode = audioContext.createGain();
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  gainNode.gain.value = 0.3;
  
  if (debugLoading) console.log(`Playing note with rate ${source.playbackRate.value}, gain ${gainNode.gain.value}`);
  source.start(0);

  return { source, gainNode };
}

export function stopNote(gainNode: GainNode | null, source: AudioBufferSourceNode | null, sustain = false): void {
  if (!audioContext || sustain) return;
  
  const fadeout = audioContext.currentTime + sampleFadeout;
  if (gainNode) {
    gainNode.gain.setTargetAtTime(0, audioContext.currentTime, sampleFadeout);
  }
  if (source) {
    source.stop(fadeout + 4);
  }
}

export function getMidiFromCoords(coords: { x: number; y: number }, rSteps: number, urSteps: number, octaveOffset: number = 0): number {
  return 60 + // C4 base note
    (octaveOffset * 12) + // Apply octave offset (12 semitones per octave)
    coords.x * rSteps +
    coords.y * urSteps;
}

export function setSampleFadeout(fadeout: number): void {
  sampleFadeout = fadeout;
}

export function getAudioContext(): AudioContext | undefined {
  return audioContext;
} 