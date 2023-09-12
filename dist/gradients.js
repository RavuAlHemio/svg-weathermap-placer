"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradientColorForValue = void 0;
const emergencyColor = "pink";
/**
 * Calculates the color on a given gradient for the given value.
 *
 * @param gradient - The gradient defining which color to calculate.
 * @param colorType - Whether to use the fill gradient (`"fillColor"`) or the stroke gradient
 * (`"strokeColor"`).
 * @param value - The value whose gradient color to calculate.
 * @returns The gradient color corresponding to the given value on the given gradient.
 */
function gradientColorForValue(gradient, colorType, value) {
    if (gradient.type === "linear") {
        return linearColorForValue(gradient.stops, colorType, value);
    }
    else if (gradient.type === "steps") {
        return stepColorForValue(gradient.stops, colorType, value);
    }
    return emergencyColor;
}
exports.gradientColorForValue = gradientColorForValue;
/**
 * Calculates the color on a linear gradient for the given value.
 *
 * @param stops - The stops defining the gradient.
 * @param colorType - Whether to use the fill gradient (`"fillColor"`) or the stroke gradient
 * (`"strokeColor"`).
 * @param value - The value whose gradient color to calculate.
 * @returns The gradient color corresponding to the given value on the given linear gradient.
 */
function linearColorForValue(stops, colorType, value) {
    if (stops.length === 0) {
        return emergencyColor;
    }
    let lastStop = stops[stops.length - 1];
    let r = 0.0, g = 0.0, b = 0.0;
    if (value < stops[0].position) {
        return `${stops[0][colorType]}`;
    }
    else if (value >= lastStop.position) {
        return `${lastStop[colorType]}`;
    }
    else {
        let foundMatch = false;
        for (let i = 0; i < stops.length - 1; ++i) {
            if (value >= stops[i].position && value < stops[i + 1].position) {
                // found!
                let posFrom = stops[i].position;
                let rFrom = Number.parseInt(`${stops[i][colorType]}`.substr(1, 2), 16);
                let gFrom = Number.parseInt(`${stops[i][colorType]}`.substr(3, 2), 16);
                let bFrom = Number.parseInt(`${stops[i][colorType]}`.substr(5, 2), 16);
                let posTo = stops[i + 1].position;
                let rTo = Number.parseInt(`${stops[i + 1][colorType]}`.substr(1, 2), 16);
                let gTo = Number.parseInt(`${stops[i + 1][colorType]}`.substr(3, 2), 16);
                let bTo = Number.parseInt(`${stops[i + 1][colorType]}`.substr(5, 2), 16);
                r = lerp(value, posFrom, posTo, rFrom, rTo);
                g = lerp(value, posFrom, posTo, gFrom, gTo);
                b = lerp(value, posFrom, posTo, bFrom, bTo);
                foundMatch = true;
                break;
            }
        }
        if (!foundMatch) {
            return emergencyColor;
        }
    }
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
}
/**
 * Calculates the color on a stepwise gradient for the given value.
 *
 * @param stops - The stops defining the gradient.
 * @param colorType - Whether to use the fill gradient (`"fillColor"`) or the stroke gradient
 * (`"strokeColor"`).
 * @param value - The value whose gradient color to calculate.
 * @returns The gradient color corresponding to the given value on the given stepwise gradient.
 */
function stepColorForValue(stops, colorType, value) {
    if (stops.length === 0) {
        return emergencyColor;
    }
    let lastStop = stops[stops.length - 1];
    if (value < stops[0].position) {
        return `${stops[0][colorType]}`;
    }
    else if (value >= lastStop.position) {
        return `${lastStop[colorType]}`;
    }
    else {
        for (let i = 0; i < stops.length - 1; ++i) {
            if (value >= stops[i].position && value < stops[i + 1].position) {
                return `${stops[i][colorType]}`;
            }
        }
    }
    return emergencyColor;
}
/**
 * Linearly interpolates a value from a source range to a target range.
 *
 * The value is clamped to the source range first.
 *
 * @param value - The value to interpolate.
 * @param sourceMin - The smallest value defining the source range.
 * @param sourceMax - The largest value defining the source range.
 * @param targetMin - The smallest value defining the target range.
 * @param targetMax - The largest value defining the target range.
 * @returns The value clamped to [sourceMin; sourceMax] and then interpolated from
 * [sourceMin; sourceMax] to [targetMin; targetMax].
 */
function lerp(value, sourceMin, sourceMax, targetMin, targetMax) {
    if (targetMin === targetMax) {
        return targetMin;
    }
    if (value < sourceMin) {
        value = sourceMin;
    }
    if (value > sourceMax) {
        value = sourceMax;
    }
    let terp = (value - sourceMin) / (sourceMax - sourceMin);
    return targetMin + terp * (targetMax - targetMin);
}
