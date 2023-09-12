"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rad2deg = exports.deg2rad = exports.unitVector = exports.normalizeAngle = exports.polarToCartesian = exports.halveCubicBezier = exports.midpoint = void 0;
/**
 * Calculates the midpoint between two points on the 2D plane.
 *
 * @param point1 - One of the two points whose midpoint to calculate.
 * @param point2 - The other of the two points whose midpoint to calculate.
 * @returns The midpoint between the two points.
 */
function midpoint(point1, point2) {
    return {
        x: (point1.x + point2.x) / 2.0,
        y: (point1.y + point2.y) / 2.0
    };
}
exports.midpoint = midpoint;
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
function halveCubicBezier(point1, control1, control2, point2) {
    if (control1 === null) {
        if (control2 === null) {
            // naïveté!
            let straightMidpoint = midpoint(point1, point2);
            return [point1, point1, straightMidpoint, straightMidpoint, straightMidpoint, point2, point2];
        }
        control1 = point1;
    }
    if (control2 === null) {
        control2 = point2;
    }
    let m1 = midpoint(point1, control1);
    let m2 = midpoint(control1, control2);
    let m3 = midpoint(control2, point2);
    let q1 = midpoint(m1, m2);
    let q2 = midpoint(m2, m3);
    let o = midpoint(q1, q2);
    return [point1, m1, q1, o, q2, m3, point2];
}
exports.halveCubicBezier = halveCubicBezier;
/**
 * Converts polar coordinates to Cartesian coordinates.
 *
 * @param angleRadians - The angle of the vector, in radians.
 * @param length - The length of the vector.
 * @returns The vector in Cartesian coordinates.
 */
function polarToCartesian(angleRadians, length) {
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
exports.polarToCartesian = polarToCartesian;
/**
 * Normalizes the angle to fall within (-pi; pi].
 *
 * @param angleRadians - The angle to normalize, in radians.
 * @returns The normalized angle.
 */
function normalizeAngle(angleRadians) {
    while (angleRadians <= -Math.PI) {
        angleRadians += 2 * Math.PI;
    }
    while (angleRadians > Math.PI) {
        angleRadians -= 2 * Math.PI;
    }
    return angleRadians;
}
exports.normalizeAngle = normalizeAngle;
/**
 * Calculates the unit vector for the given vector by normalizing its length to 1.
 *
 * @param vector - The vector whose unit vector to calculate.
 * @returns The unit vector for the given vector.
 */
function unitVector(vector) {
    let euclidNorm = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    return {
        x: vector.x / euclidNorm,
        y: vector.y / euclidNorm
    };
}
exports.unitVector = unitVector;
/**
 * Converts degrees to radians.
 *
 * @param angleDegrees - The angle in degrees to convert to radians.
 * @returns The angle in radians.
 */
function deg2rad(angleDegrees) {
    return angleDegrees * Math.PI / 180;
}
exports.deg2rad = deg2rad;
/**
 * Converts radians to degrees.
 *
 * @param angleDegrees - The angle in radians to convert to degrees.
 * @returns The angle in degrees.
 */
function rad2deg(angleRadians) {
    return angleRadians * 180 / Math.PI;
}
exports.rad2deg = rad2deg;
