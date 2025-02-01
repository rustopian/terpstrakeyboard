interface Window {
  webkitAudioContext: typeof AudioContext;
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