// Geometry utility functions and classes for the Temper

export class Point {
  constructor(public x: number, public y: number) {}

  equals(p: Point): boolean {
    return (this.x === p.x && this.y === p.y);
  }

  plus(p: Point): Point {
    const x = this.x + p.x;
    const y = this.y + p.y;
    return new Point(x, y);
  }

  minus(p: Point): Point {
    const x = this.x - p.x;
    const y = this.y - p.y;
    return new Point(x, y);
  }
}

type RotationMatrix = [number, number, number, number, number, number];

export function calculateRotationMatrix(rotation: number, center: Point): RotationMatrix {
  const m: RotationMatrix = [0, 0, 0, 0, 0, 0];

  m[0] = Math.cos(rotation);
  m[1] = Math.sin(rotation);
  m[2] = -m[1];
  m[3] = m[0];
  m[4] = center.x - m[0] * center.x - m[2] * center.y;
  m[5] = center.y - m[1] * center.x - m[3] * center.y;

  return m;
}

export function applyMatrixToPoint(m: RotationMatrix, p: Point): Point {
  return new Point(
    m[0] * p.x + m[2] * p.y + m[4],
    m[1] * p.x + m[3] * p.y + m[5]
  );
}

export function roundTowardZero(val: number): number {
  if (val < 0) {
    return Math.ceil(val);
  }
  return Math.floor(val);
} 