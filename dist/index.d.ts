import { Gradient } from "./gradients";
import { LegendSettings } from "./legend";
/**
 * Renders the weathermap specified by the given configuration and values into the given DOM
 * container.
 *
 * This is effectively the entry point into this library.
 *
 * @param elementCreator - An object which can create new elements in the DOM. Generally a
 * {@link Document} object.
 * @param container - The DOM node in which to place the weathermap as a SVG document.
 * @param config - The configuration specifying the structure of the weathermap.
 * @param currentValues - The metric values with which to populate the weathermap.
 * @param linkResolver - A function that generates the base URL from a link configuration.
 * @param addViewBox - Whether to add a `viewBox` attribute to the SVG document.
 */
export declare function renderWeathermapInto(elementCreator: SVGElementCreatorDOM, container: Node, config: WeathermapConfig, currentValues: MetricValueMap, linkResolver: ((linkSettings: ObjectLinkSettings) => string | null) | null | undefined, addViewBox?: boolean): SVGSVGElement;
/**
 * Sets the position and dimensions of an SVG rectangle element.
 *
 * @param element - The rectangle element whose position and dimensions to set.
 * @param x - The horizontal position of the rectangle.
 * @param y - The vertical position of the rectangle.
 * @param width - The horizontal extent of the rectangle.
 * @param height - The vertical extent of the rectangle.
 */
export declare function setRectangleDimensions(element: SVGRectElement, x: number | string, y: number | string, width: number | string, height: number | string): void;
/**
 * The internal state of the weathermap renderer.
 */
export declare class WeathermapRendererState {
    make: SVGElementCreator;
    config: WeathermapConfig;
    sortedGradient: Gradient;
    currentValues: MetricValueMap;
    nodeLabelToNode: LabelToNodeMap;
    nodeLinkUriBase: string | null;
    edgeLinkUriBase: string | null;
    svg: SVGSVGElement | null;
    defs: SVGDefsElement | null;
    edgeGroup: SVGGElement | null;
    nodeGroup: SVGGElement | null;
    labelGroup: SVGGElement | null;
    legendGroup: SVGGElement | null;
    styleMap: NameToStyleMap;
    /**
     * Constructs a new renderer state.
     *
     * @param domCreator - An object which can create new elements in the DOM. Generally a
     * {@link Document} object.
     * @param config - The configuration of the weathermap.
     * @param sortedGradient - The gradient definition to use, with stops sorted by their location
     * within the gradient.
     * @param currentValues - The current values of the relevant metrics used to color the
     * weathermap.
     */
    constructor(domCreator: SVGElementCreatorDOM, config: WeathermapConfig, sortedGradient: Gradient, currentValues: MetricValueMap);
}
/**
 * Utility class used to quickly create SVG elements of well-known types.
 */
export declare class SVGElementCreator {
    /** The object that can create elements in the DOM. */
    maker: SVGElementCreatorDOM;
    /** Creates a new element creator. */
    constructor(maker: SVGElementCreatorDOM);
    /** Creates a new anchor (`<a>`) element. */
    a(): SVGAElement;
    /** Creates a new definitions (`<defs>`) element. */
    defs(): SVGDefsElement;
    /** Creates a new group (`<g>`) element. */
    g(): SVGGElement;
    /** Creates a new linear gradient (`<linearGradient>`) element. */
    linearGradient(): SVGLinearGradientElement;
    /** Creates a new path (`<path>`) element. */
    path(): SVGPathElement;
    /** Creates a new rectangle (`<rect>`) element. */
    rect(): SVGRectElement;
    /** Creates a new gradient stop (`<stop>`) element. */
    stop(): SVGStopElement;
    /** Creates a new SVG document (`<svg>`) element. */
    svg(): SVGSVGElement;
    /** Creates a new text (`<text>`) element. */
    text(): SVGTextElement;
    /** Creates a new title (`<title>`) element. */
    title(): SVGTitleElement;
}
/**
 * An interface implemented by DOM documents that can create new SVG elements. Generally accepts
 * {@link Document} and similar objects.
 */
export interface SVGElementCreatorDOM {
    /**
     * Creates a new element in the namespace with the given URI and the given name within that
     * namespace.
     *
     * The newly created element is initially not attached to any other node in the DOM.
     *
     * @param namespaceURI - The URI of the namespace in which to create the object.
     * @param qualifiedName - The name of the element within that namespace.
     */
    createElementNS(namespaceURI: string, qualifiedName: string): Element;
}
/**
 * A text element that can be placed at a specific position.
 */
interface PositionableTextElement {
    /** The textual content of this element. */
    label: string;
    /** The horizontal position of this element. */
    x: number;
    /** The vertical position of this element. */
    y: number;
}
/**
 * A node in the weathermap.
 *
 * A node generally represents a physical or virtual device that communicates with other devices.
 */
export interface WeathermapNode extends PositionableTextElement {
    /** The horizontal extent of this node. */
    width: number;
    /** The vertical extent of this node. */
    height: number;
    /** An optional metric name used to select the background color of this node. */
    metricName?: string | null;
    /** Optional parameters to append to the link that is followed when the node is clicked. */
    linkParams?: string;
}
/**
 * An edge connecting two nodes in the weathermap.
 */
export interface WeathermapEdge {
    /** The label of the first node to which to link. */
    node1: string;
    /** The label of the second node to which to link. */
    node2: string;
    /**
     * An optional direction in which this edge should bend.
     *
     * Useful if there are multiple links between two nodes.
     */
    bendDirection?: number;
    /**
     * An optional magnitude of how strongly this edge should bend.
     *
     * Useful if there are multiple links between two nodes.
     */
    bendMagnitude?: number;
    /**
     * The name of the metric defining the edge's color when going from {@link node1} to
     * {@link node2}.
     *
     * If {@link metricName} is specified but {@link metric2Name} is not, the metric is used to
     * color the whole edge between {@link node1} and {@link node2}. If both are specified, the
     * metric is used to color the part between {@link node1} and the halfway point between both
     * nodes.
     */
    metricName?: string;
    /**
     * The name of the metric defining the edge's color when going from `node2` to `node1`.
     *
     * The metric is used to color the part between the halfway point between both nodes and
     * {@link node2}.
     */
    metric2Name?: string | null;
    /** Optional parameters to append to the link that is followed when the node is clicked. */
    linkParams?: string;
    /**
     * The name of the style to use to override the weathermap's default style when placing this
     * edge.
     */
    styleName?: string;
}
/**
 * A free-floating label in the weathermap.
 */
export interface WeathermapLabel extends PositionableTextElement {
}
/**
 * A style definition within the weathermap.
 */
export interface WeathermapStyle {
    /** The name of this style. */
    name: string;
    /**
     * The array of stroke widths across the width of the edge, specified as alternating values of
     * line widths and empty space widths interspersed with spaces.
     *
     * @example "2 1 2" denotes a stroke of 2px, then a blank space of 1px, then another stroke of
     * 2px.
     */
    strokeWidthArray?: string;
    /**
     * The array of dash lengths across the length of the edge, specified as alternating values of
     * line lengths and empty space lengths interspersed with spaces.
     *
     * @example "2 1 2" denotes a stroke of 2px, then a blank space of 1px, then another stroke of
     * 2px.
     */
    dashArray?: string;
}
/**
 * Settings regulating what objects link to when clicked.
 */
interface LinkSettings {
    /** Settings regulating links when clicking on a node. */
    node: ObjectLinkSettings;
    /** Settings regulating links when clicking on an edge. */
    edge: ObjectLinkSettings;
}
/**
 * Settings regulating what an object specifically links to.
 */
export interface ObjectLinkSettings {
    /** What kind of object is being linked to? */
    type: "none" | "dashboard" | "absolute";
    /** The ID of the dashboard being linked to if {@link type} is "dashboard". */
    dashboard: string | null;
    /** The URL of the dashboard being linked to if {@link type} is "dashboard". */
    dashUri: string | null;
    /** The target URL if {@link type} is "absolute". */
    absoluteUri: string | null;
}
export interface StringMapping<V> {
    [key: string]: V;
}
export type LabelToNodeMap = StringMapping<WeathermapNode>;
export type MetricValueMap = StringMapping<number>;
export type NameToStyleMap = StringMapping<WeathermapStyle>;
/**
 * The configuration of a weathermap.
 */
export interface WeathermapDefaultConfig {
    /** The weathermap's edges. */
    weathermapEdges: WeathermapEdge[];
    /** The weathermap's nodes. */
    weathermapNodes: WeathermapNode[];
    /** The weathermap's labels. */
    weathermapLabels: WeathermapLabel[];
    /** The weathermap's style definitions. */
    weathermapStyles: WeathermapStyle[];
    /** The size of the SVG canvas on which to draw. */
    canvasSize: {
        width: number;
        height: number;
    };
    /** The text offset from the bottom-left edge of the weathermap. */
    textOffsets: {
        left: number;
        bottom: number;
    };
    /**
     * Whether to show the numeric values directly on the weathermap.
     *
     * If false, values are only hinted at by the edge's colors.
     */
    showNumbers: boolean;
    /**
     * The strategy to deal with multiple values for the same metric.
     *
     * `"max"` uses the maximum value, `"min"` uses the minimum value, `"avg"` uses the arithmetic
     * mean of all values, `"current"` uses the last value and `"total"` uses the sum of all values.
     */
    valueName: "max" | "min" | "avg" | "current" | "total";
    /** This option is prescribed by Grafana and ignored by the weathermap. */
    nullPointMode?: "connected" | "null" | "null as zero";
    /** The default stroke width of edges. Can be overridden within a style. */
    strokeWidth: number;
    /** The gradient defining the background colors of nodes and the stroke colors of edges. */
    gradient: Gradient;
    /** Defines the placement and orientation of the legend. */
    legend: LegendSettings;
    /** Defines the behavior regarding the generation of clickable links. */
    link: LinkSettings;
    /** Defines the dash array to display if a metric is missing a value. */
    noValueDashArray: string;
    /** Defines the dash array to display if an edge does not have a metric assigned. */
    unmeasuredDashArray: string;
}
/**
 * The configuration of a weathermap, including a numeric ID.
 */
export interface WeathermapConfig extends WeathermapDefaultConfig {
    id: number;
}
export {};
