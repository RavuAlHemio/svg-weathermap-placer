/**
 * Calculates the color on a given gradient for the given value.
 *
 * @param gradient - The gradient defining which color to calculate.
 * @param colorType - Whether to use the fill gradient (`"fillColor"`) or the stroke gradient
 * (`"strokeColor"`).
 * @param value - The value whose gradient color to calculate.
 * @returns The gradient color corresponding to the given value on the given gradient.
 */
export declare function gradientColorForValue(gradient: Gradient, colorType: keyof GradientStop, value: number): string;
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
    type: "steps" | "linear";
    /** The stops on the gradient. */
    stops: GradientStop[];
}
