import { Gradient } from "./gradients";
import { SVGElementCreator } from "./index";
/**
 * Places a legend in the given document.
 *
 * @param svgMake - An object which can create new elements in the DOM. Generally a {@link Document}
 * object.
 * @param settings - The settings for the legend.
 * @param container - The container element in which to place the legend.
 * @param defs - The SVG `<defs>` element to populate with gradient definitions.
 * @param gradient - The gradient configuration to use to draw the legend.
 * @param weathermapID - The ID of the weathermap on the dashboard; if provided, used to
 * disambiguate multiple gradient definitions to prevent cross-pollution.
 */
export declare function placeLegend(svgMake: SVGElementCreator, settings: LegendSettings, container: Element, defs: SVGDefsElement, gradient: Gradient, weathermapID?: string | null): void;
/**
 * Settings defining the location and appearance of the legend.
 */
export interface LegendSettings {
    /**
     * The type of legend to draw.
     *
     * Either an empty string (no legend) or a string consisting of two letters. The first letter
     * defines the orientation, the second the label location.
     *
     * "" - no legend
     * "hn" - horizontal, no labels
     * "ha" - horizontal, labels above
     * "hb" - horizontal, labels below
     * "vn" - vertical, no labels
     * "vl" - vertical, labels on the left
     * "vr" - vertical, labels on the right
     */
    type: "" | "hn" | "ha" | "hb" | "vn" | "vl" | "vr";
    /** The horizontal offset of the legend. */
    x: number;
    /** The vertical offset of the legend. */
    y: number;
    /**
     * The length of the legend.
     *
     * This is the height of vertical legends and the width of horizontal legends.
     */
    length: number;
    /**
     * The width of the legend.
     *
     * This is the width of vertical legends and the height of horizontal legends.
     */
    width: number;
}
