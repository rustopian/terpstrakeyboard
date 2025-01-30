import { Settings } from '../settings/Settings';
import { drawGrid } from '../grid/displayUtils';

export class ScrollManager {
  private isDragging: boolean = false;
  private startX: number = 0;
  private lastX: number = 0;
  private isRedrawing: boolean = false;
  private settings: Settings;
  private scrollArea: HTMLElement;

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
    
    this.updateView(delta);
    e.preventDefault();
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging) return;
    const currentX = e.touches[0].pageX;
    const delta = currentX - this.lastX;
    this.lastX = currentX;
    
    this.updateView(delta);
    e.preventDefault();
  };

  private handleDragEnd = (): void => {
    this.isDragging = false;
  };

  private handleWheel = (e: WheelEvent): void => {
    if (e.deltaX !== 0) {
      e.preventDefault();
      this.updateView(-e.deltaX);
    }
  };

  private preventEvent = (e: Event): void => {
    e.preventDefault();
  };

  private updateView(delta: number): void {
    if (this.isRedrawing) return;
    
    if (this.settings.centerpoint) {
      // Transform horizontal screen movement to grid space
      const angle = this.settings.rotation;
      const gridDeltaX = delta * Math.cos(angle);    // X component in grid space
      const gridDeltaY = -delta * Math.sin(angle);   // Y component in grid space (negative to counter rotation)
      
      // Move in both X and Y to maintain horizontal screen movement
      this.settings.centerpoint.x += gridDeltaX;
      this.settings.centerpoint.y += gridDeltaY;
      
      // Prevent multiple redraws in the same frame
      this.isRedrawing = true;
      requestAnimationFrame(() => {
        drawGrid();
        this.isRedrawing = false;
      });
    }
  }

  public cleanup(): void {
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