import { Settings } from '../settings/Settings';
import { drawGrid } from '../grid/displayUtils';

export class ScrollManager {
  private isDragging: boolean = false;
  private startX: number = 0;
  private lastX: number = 0;
  private isRedrawing: boolean = false;
  private settings: Settings;
  private scrollArea: HTMLElement;
  private accumulatedDelta: number = 0;
  private animationFrameId: number | null = null;
  private lastDrawTime: number = 0;
  private readonly FRAME_THROTTLE: number = 1000 / 60; // Target 60fps
  private cachedCos: number = 1;
  private cachedSin: number = 0;
  private lastRotation: number | null = null;

  constructor(settings: Settings) {
    this.settings = settings;
    this.scrollArea = document.querySelector('.scroll-area') as HTMLElement;
    if (this.scrollArea) {
      this.initializeEventListeners();
    }
  }

  private initializeEventListeners(): void {
    // Mouse handlers
    this.scrollArea.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleDragEnd);
    document.addEventListener('mouseleave', this.handleDragEnd);

    // Touch handlers
    this.scrollArea.addEventListener('touchstart', this.handleTouchStart);
    document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('touchend', this.handleDragEnd);

    // Wheel handler
    window.addEventListener('wheel', this.handleWheel, { passive: false });

    // Gesture handlers
    window.addEventListener('gesturestart', this.preventEvent, { passive: false });
    window.addEventListener('gesturechange', this.preventEvent, { passive: false });
  }

  private handleMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.startX = e.pageX;
    this.lastX = this.startX;
    e.preventDefault();
  };

  private handleTouchStart = (e: TouchEvent): void => {
    this.isDragging = true;
    this.startX = e.touches[0].pageX;
    this.lastX = this.startX;
    e.preventDefault();
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    const currentX = e.pageX;
    const delta = currentX - this.lastX;
    this.lastX = currentX;
    
    this.queueDeltaUpdate(delta);
    e.preventDefault();
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging) return;
    const currentX = e.touches[0].pageX;
    const delta = currentX - this.lastX;
    this.lastX = currentX;
    
    this.queueDeltaUpdate(delta);
    e.preventDefault();
  };

  private handleDragEnd = (): void => {
    this.isDragging = false;
  };

  private handleWheel = (e: WheelEvent): void => {
    if (e.deltaX !== 0) {
      e.preventDefault();
      this.queueDeltaUpdate(-e.deltaX);
    }
  };

  private preventEvent = (e: Event): void => {
    e.preventDefault();
  };

  private updateTrigCache(): void {
    if (this.lastRotation !== this.settings.rotation) {
      this.cachedCos = Math.cos(this.settings.rotation);
      this.cachedSin = Math.sin(this.settings.rotation);
      this.lastRotation = this.settings.rotation;
    }
  }

  private queueDeltaUpdate(delta: number): void {
    this.accumulatedDelta += delta;
    
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(this.updateFrame);
    }
  }

  private updateFrame = (): void => {
    const currentTime = performance.now();
    const timeSinceLastDraw = currentTime - this.lastDrawTime;

    if (this.accumulatedDelta !== 0 && !this.isRedrawing && this.settings.centerpoint && 
        timeSinceLastDraw >= this.FRAME_THROTTLE) {
      this.isRedrawing = true;

      // Update trig cache if rotation changed
      this.updateTrigCache();
      
      // Transform horizontal screen movement to grid space using cached values
      const gridDeltaX = this.accumulatedDelta * this.cachedCos;
      const gridDeltaY = -this.accumulatedDelta * this.cachedSin;
      
      // Move in both X and Y to maintain horizontal screen movement
      this.settings.centerpoint.x += gridDeltaX;
      this.settings.centerpoint.y += gridDeltaY;

      // Reset accumulated delta
      this.accumulatedDelta = 0;
      
      // Draw the grid and update last draw time
      drawGrid();
      this.lastDrawTime = currentTime;
      this.isRedrawing = false;
    }

    // Continue the animation frame loop if still dragging or have accumulated delta
    if (this.isDragging || this.accumulatedDelta !== 0) {
      this.animationFrameId = requestAnimationFrame(this.updateFrame);
    } else {
      this.animationFrameId = null;
    }
  };

  public cleanup(): void {
    // Cancel any pending animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove all event listeners
    this.scrollArea?.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleDragEnd);
    document.removeEventListener('mouseleave', this.handleDragEnd);
    
    this.scrollArea?.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleDragEnd);
    
    window.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('gesturestart', this.preventEvent);
    window.removeEventListener('gesturechange', this.preventEvent);
  }
} 