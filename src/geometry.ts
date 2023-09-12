/**
 * Calculates the midpoint between two points on the 2D plane.
 *
 * @param point1 - One of the two points whose midpoint to calculate.
 * @param point2 - The other of the two points whose midpoint to calculate.
 * @returns The midpoint between the two points.
 */
export function midpoint(point1: Point2D, point2: Point2D): Point2D {
    return {
        x: (point1.x + point2.x)/2.0,
        y: (point1.y + point2.y)/2.0
    };
}

/**
 * Halves a cubic Bézier segment, returning the new points.
 *
 * @param point1 - The starting point of the Bézier segment to halve.
 * @param control1 - The first control point of the Bézier segment to halve. Vector image drawing
 * software often associates this point with the starting point.
 * @param control2 - The second control point of the Bézier segment to halve. Vector image drawing
 * software often associates this point with the end point.
 * @param point2 - The end point of the Bézier segment to halve.
 * @returns An array containing the following points in this order:
 * [0]: The starting point of the first half of the Bézier segment; equal to {@link point1}.
 * [1]: The first control point of the first half of the Bézier segment.
 * [2]: The second control point of the first half of the Bézier segment.
 * [3]: The midpoint of the Bézier segment, i.e. the ending point of the first half and the starting
 *      point of the second half of the Bézier segment.
 * [4]: The first control point of the second half of the Bézier segment.
 * [5]: The second control point of the second half of the Bézier segment.
 * [6]: The ending point of the second half of the Bézier segment; equal to {@link point2}.
 */
export function halveCubicBezier(
    point1: Point2D, control1: Point2D|null, control2: Point2D|null, point2: Point2D
): [Point2D, Point2D, Point2D, Point2D, Point2D, Point2D, Point2D] {
    if (control1 === null) {
        if (control2 === null) {
            // naïveté!
            let straightMidpoint: Point2D = midpoint(point1, point2);
            return [point1, point1, straightMidpoint, straightMidpoint, straightMidpoint, point2, point2];
        }

        control1 = point1;
    }
    if (control2 === null) {
        control2 = point2;
    }

    let m1: Point2D = midpoint(point1, control1);
    let m2: Point2D = midpoint(control1, control2);
    let m3: Point2D = midpoint(control2, point2);

    let q1: Point2D = midpoint(m1, m2);
    let q2: Point2D = midpoint(m2, m3);

    let o: Point2D = midpoint(q1, q2);

    return [point1, m1, q1, o, q2, m3, point2];
}

/**
 * Converts polar coordinates to Cartesian coordinates.
 *
 * @param angleRadians - The angle of the vector, in radians.
 * @param length - The length of the vector.
 * @returns The vector in Cartesian coordinates.
 */
export function polarToCartesian(angleRadians: number|null, length: number|null): Point2D {
    if (angleRadians === null) {
        angleRadians = 0;
    }
    if (length === null) {
        length = 0;
    }

    return {
        x: length * Math.cos(angleRadians),
        y: length * Math.sin(angleRadians)
    };
}

/**
 * Normalizes the angle to fall within (-pi; pi].
 *
 * @param angleRadians - The angle to normalize, in radians.
 * @returns The normalized angle.
 */
export function normalizeAngle(angleRadians: number): number {
    while (angleRadians <= -Math.PI) {
        angleRadians += 2 * Math.PI;
    }
    while (angleRadians > Math.PI) {
        angleRadians -= 2 * Math.PI;
    }
    return angleRadians;
}

/**
 * Calculates the unit vector for the given vector by normalizing its length to 1.
 *
 * @param vector - The vector whose unit vector to calculate.
 * @returns The unit vector for the given vector.
 */
export function unitVector(vector: Point2D): Point2D {
    let euclidNorm: number = Math.sqrt(vector.x*vector.x + vector.y*vector.y);
    return {
        x: vector.x / euclidNorm,
        y: vector.y / euclidNorm
    };
}

/**
 * Converts degrees to radians.
 *
 * @param angleDegrees - The angle in degrees to convert to radians.
 * @returns The angle in radians.
 */
export function deg2rad(angleDegrees: number): number {
    return angleDegrees * Math.PI / 180;
}

/**
 * Converts radians to degrees.
 *
 * @param angleDegrees - The angle in radians to convert to degrees.
 * @returns The angle in degrees.
 */
export function rad2deg(angleRadians: number): number {
    return angleRadians * 180 / Math.PI;
}

/**
 * A point on the two-dimensional plane.
 */
export interface Point2D {
    /** The horizontal position of the point. */
    x: number;

    /** The vertical position of the point. */
    y: number;
}
