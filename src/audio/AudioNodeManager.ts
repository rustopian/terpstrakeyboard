import { v4 as uuidv4 } from 'uuid';

interface AudioNodePair {
  id: string;
  gainNode: GainNode;
  source: AudioBufferSourceNode;
  startTime: number;
  frequency: number;
}

export class AudioNodeManager {
  private nodes: Map<string, AudioNodePair> = new Map();
  private cleanupInterval: number | null = null;
  
  constructor() {
    // Run cleanup every 5 seconds
    this.cleanupInterval = window.setInterval(() => this.cleanup(), 5000);
  }

  add(gainNode: GainNode, source: AudioBufferSourceNode, frequency: number): string {
    const id = uuidv4();
    this.nodes.set(id, {
      id,
      gainNode,
      source,
      startTime: performance.now(),
      frequency
    });
    console.log(`[DEBUG] Added audio node ${id} for frequency ${frequency}Hz`);
    return id;
  }

  remove(id: string): void {
    const node = this.nodes.get(id);
    if (node) {
      try {
        // Ensure proper cleanup
        console.log(`[DEBUG] Cleaning up node ${id} (freq=${node.frequency}Hz)`);
        node.gainNode.disconnect();
        node.source.disconnect();
      } catch (e) {
        console.warn('Error cleaning up audio node:', e);
      }
      this.nodes.delete(id);
    }
  }

  cleanup(): void {
    const now = performance.now();
    let cleanedCount = 0;
    for (const [id, node] of this.nodes.entries()) {
      // Remove nodes that have been running for more than 30 seconds
      // or nodes that have zero gain (finished fading out)
      const age = now - node.startTime;
      const gain = node.gainNode.gain.value;
      if (age > 30000 || gain <= 0.001) {
        console.log(`[DEBUG] Auto-cleaning node ${id} (age=${(age/1000).toFixed(1)}s, gain=${gain.toFixed(3)})`);
        this.remove(id);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(`[DEBUG] Cleaned up ${cleanedCount} nodes, ${this.nodes.size} remaining`);
    }
  }

  getNode(id: string): AudioNodePair | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): AudioNodePair[] {
    return Array.from(this.nodes.values());
  }

  releaseAll(): void {
    for (const [id] of this.nodes) {
      this.remove(id);
    }
  }

  dispose(): void {
    if (this.cleanupInterval !== null) {
      window.clearInterval(this.cleanupInterval);
    }
    this.releaseAll();
  }
}

export const audioNodeManager = new AudioNodeManager(); 