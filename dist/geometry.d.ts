/**
 * Calculates the midpoint between two points on the 2D plane.
 *
 * @param point1 - One of the two points whose midpoint to calculate.
 * @param point2 - The other of the two points whose midpoint to calculate.
 * @returns The midpoint between the two points.
 */
export declare function midpoint(point1: Point2D, point2: Point2D): Point2D;
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
export declare function halveCubicBezier(point1: Point2D, control1: Point2D | null, control2: Point2D | null, point2: Point2D): [Point2D, Point2D, Point2D, Point2D, Point2D, Point2D, Point2D];
/**
 * Converts polar coordinates to Cartesian coordinates.
 *
 * @param angleRadians - The angle of the vector, in radians.
 * @param length - The length of the vector.
 * @returns The vector in Cartesian coordinates.
 */
export declare function polarToCartesian(angleRadians: number | null, length: number | null): Point2D;
/**
 * Normalizes the angle to fall within (-pi; pi].
 *
 * @param angleRadians - The angle to normalize, in radians.
 * @returns The normalized angle.
 */
export declare function normalizeAngle(angleRadians: number): number;
/**
 * Calculates the unit vector for the given vector by normalizing its length to 1.
 *
 * @param vector - The vector whose unit vector to calculate.
 * @returns The unit vector for the given vector.
 */
export declare function unitVector(vector: Point2D): Point2D;
/**
 * Converts degrees to radians.
 *
 * @param angleDegrees - The angle in degrees to convert to radians.
 * @returns The angle in radians.
 */
export declare function deg2rad(angleDegrees: number): number;
/**
 * Converts radians to degrees.
 *
 * @param angleDegrees - The angle in radians to convert to degrees.
 * @returns The angle in degrees.
 */
export declare function rad2deg(angleRadians: number): number;
/**
 * A point on the two-dimensional plane.
 */
export interface Point2D {
    /** The horizontal position of the point. */
    x: number;
    /** The vertical position of the point. */
    y: number;
}
