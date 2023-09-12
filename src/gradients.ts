const emergencyColor: string = "pink";

/**
 * Calculates the color on a given gradient for the given value.
 *
 * @param gradient - The gradient defining which color to calculate.
 * @param colorType - Whether to use the fill gradient (`"fillColor"`) or the stroke gradient
 * (`"strokeColor"`).
 * @param value - The value whose gradient color to calculate.
 * @returns The gradient color corresponding to the given value on the given gradient.
 */
export function gradientColorForValue(gradient: Gradient, colorType: keyof GradientStop, value: number): string {
    if (gradient.type === "linear") {
        return linearColorForValue(gradient.stops, colorType, value);
    } else if (gradient.type === "steps") {
        return stepColorForValue(gradient.stops, colorType, value);
    }
    return emergencyColor;
}

/**
 * Calculates the color on a linear gradient for the given value.
 *
 * @param stops - The stops defining the gradient.
 * @param colorType - Whether to use the fill gradient (`"fillColor"`) or the stroke gradient
 * (`"strokeColor"`).
 * @param value - The value whose gradient color to calculate.
 * @returns The gradient color corresponding to the given value on the given linear gradient.
 */
function linearColorForValue(stops: GradientStop[], colorType: keyof GradientStop, value: number): string {
    if (stops.length === 0) {
        return emergencyColor;
    }

    let lastStop: GradientStop = stops[stops.length-1];
    let r: number = 0.0, g: number = 0.0, b: number = 0.0;
    if (value < stops[0].position) {
        return `${stops[0][colorType]}`;
    } else if (value >= lastStop.position) {
        return `${lastStop[colorType]}`;
    } else {
        let foundMatch: boolean = false;
        for (let i: number = 0; i < stops.length-1; ++i) {
            if (value >= stops[i].position && value < stops[i+1].position) {
                // found!

                let posFrom: number = stops[i].position;
                let rFrom: number = Number.parseInt(`${stops[i][colorType]}`.substr(1, 2), 16);
                let gFrom: number = Number.parseInt(`${stops[i][colorType]}`.substr(3, 2), 16);
                let bFrom: number = Number.parseInt(`${stops[i][colorType]}`.substr(5, 2), 16);

                let posTo: number = stops[i+1].position;
                let rTo: number = Number.parseInt(`${stops[i+1][colorType]}`.substr(1, 2), 16);
                let gTo: number = Number.parseInt(`${stops[i+1][colorType]}`.substr(3, 2), 16);
                let bTo: number = Number.parseInt(`${stops[i+1][colorType]}`.substr(5, 2), 16);

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
function stepColorForValue(stops: GradientStop[], colorType: keyof GradientStop, value: number): string {
    if (stops.length === 0) {
        return emergencyColor;
    }

    let lastStop: GradientStop = stops[stops.length-1];
    if (value < stops[0].position) {
        return `${stops[0][colorType]}`;
    } else if (value >= lastStop.position) {
        return `${lastStop[colorType]}`;
    } else {
        for (let i: number = 0; i < stops.length-1; ++i) {
            if (value >= stops[i].position && value < stops[i+1].position) {
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
function lerp(value: number, sourceMin: number, sourceMax: number, targetMin: number, targetMax: number): number {
    if (targetMin === targetMax) {
        return targetMin;
    }

    if (value < sourceMin) {
        value = sourceMin;
    }
    if (value > sourceMax) {
        value = sourceMax;
    }

    let terp: number = (value - sourceMin) / (sourceMax - sourceMin);
    return targetMin + terp * (targetMax - targetMin);
}


/**
 * A single stop on a gradient.
 */
export interface GradientStop {
    /**
     * The position of this stop on the gradient. When the value matches the position exactly, the
     * colors from the stop are used directly; if not, the chosen interpolation method is applied.
     */
    position: number;

    /** The color of the stroke (edge line) used in this stop. */
    strokeColor: string;

    /** The color of the fill (node background) used in this stop. */
    fillColor: string;

    /** Whether to show a textual label for this stop in the legend. */
    showLegendLabel: boolean;
}

/**
 * A gradient specifying colors for value ranges on the weathermap.
 */
export interface Gradient {
    /** The kind of interpolation to use if a value doesn't equal a stop position. */
    type: "steps"|"linear";

    /** The stops on the gradient. */
    stops: GradientStop[];
}
