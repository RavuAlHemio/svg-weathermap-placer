import { svgNamespace, xlinkNamespace } from "./constants";
import { deg2rad, halveCubicBezier, normalizeAngle, Point2D, polarToCartesian, unitVector } from "./geometry";
import { Gradient, GradientStop, gradientColorForValue } from "./gradients";
import { LegendSettings, placeLegend } from "./legend";


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
export function renderWeathermapInto(
    elementCreator: SVGElementCreatorDOM, container: Node, config: WeathermapConfig, currentValues: MetricValueMap,
    linkResolver: ((linkSettings: ObjectLinkSettings) => string|null)|null|undefined, addViewBox: boolean = false
): SVGSVGElement {
    // sort gradient stops
    let sortedStops: GradientStop[] = config.gradient.stops
        .slice()
        .sort((l, r) => l.position - r.position);
    let sortedGradient: Gradient = {
        type: config.gradient.type,
        stops: sortedStops
    };

    let state = new WeathermapRendererState(elementCreator, config, sortedGradient, currentValues);

    initializeSVG(state, container, addViewBox);

    // resolve links
    if (linkResolver != null) {
        state.nodeLinkUriBase = linkResolver(config.link.node);
        state.edgeLinkUriBase = linkResolver(config.link.edge);
    }

    // emplacement
    placeNodes(state);
    placeEdges(state);
    placeLabels(state);
    placeLegend(state.make, config.legend, state.legendGroup!, state.defs!, sortedGradient, `${config.id}`);

    return state.svg!;
}

/**
 * Creates the base SVG structure.
 *
 * Elements of the base SVG structure are the `svg` element itself, the `defs` element, and the `g`
 * (group) elements for the legend, the edges, the nodes and the labels.
 *
 * @param state - The state of the renderer.
 * @param container - The container in which to create the SVG object.
 * @param addViewBox - Whether to add a `viewBox` attribute to the SVG document.
 */
function initializeSVG(state: WeathermapRendererState, container: Node, addViewBox: boolean = false): void {
    // add SVG
    state.svg = state.make.svg();
    modifyStyle(state.svg, {
        "width": `${state.config.canvasSize.width}px`,
        "height": `${state.config.canvasSize.height}px`,
    });
    if (addViewBox) {
        state.svg.setAttribute("viewBox", `0 0 ${state.config.canvasSize.width} ${state.config.canvasSize.height}`);
    }
    container.appendChild(state.svg);

    state.defs = state.make.defs();
    state.svg.appendChild(state.defs);

    state.legendGroup = state.make.g();
    state.legendGroup.setAttribute("class", "legend");
    state.svg.appendChild(state.legendGroup);

    state.edgeGroup = state.make.g();
    state.edgeGroup.setAttribute("class", "edges");
    state.svg.appendChild(state.edgeGroup);

    state.nodeGroup = state.make.g();
    state.nodeGroup.setAttribute("class", "nodes");
    state.svg.appendChild(state.nodeGroup);

    state.labelGroup = state.make.g();
    state.labelGroup.setAttribute("class", "labels");
    state.svg.appendChild(state.labelGroup);
}

/**
 * Places the nodes in the SVG.
 *
 * @param state - The state of the renderer.
 */
function placeNodes(state: WeathermapRendererState): void {
    for (let node of state.config.weathermapNodes) {
        state.nodeLabelToNode[node.label] = node;

        let singleNodeGroup: SVGGElement = state.make.g();
        maybeWrapIntoLink(state.make, state.nodeGroup!, singleNodeGroup, state.nodeLinkUriBase, node.linkParams);

        let rect: SVGRectElement = state.make.rect();
        singleNodeGroup.appendChild(rect);

        setRectangleDimensions(rect, node.x, node.y, node.width, node.height);
        modifyStyle(rect, {
            "stroke": "gray",
            "stroke-width": "1px",
        });

        let text: SVGTextElement = state.make.text();
        singleNodeGroup.appendChild(text);

        text.setAttribute("x", `${(+node.x) + (+state.config.textOffsets.left)}`);
        text.setAttribute("y", `${(+node.y) + (+node.height) - state.config.textOffsets.bottom}`);
        if (state.config.showNumbers && node.metricName != null) {
            let value: string = (node.metricName in state.currentValues)
                ? `${state.currentValues[node.metricName]}`
                : "?"
            ;
            text.textContent = `${node.label} (${value})`;
        } else {
            text.textContent = node.label;
        }

        let currentValue: number|null = null;
        if (!node.metricName) {
            modifyStyle(rect, {
                "fill": "silver",
                "stroke-dasharray": state.config.unmeasuredDashArray,
            });
        } else if (node.metricName in state.currentValues) {
            // color node by metric
            currentValue = state.currentValues[node.metricName];
            modifyStyle(rect, {
                "fill": gradientColorForValue(state.sortedGradient, "fillColor", currentValue),
            });
        } else {
            // no data
            modifyStyle(text, {
                "fill": "white",
            });
            modifyStyle(rect, {
                "fill": "black",
                "stroke-dasharray": state.config.noValueDashArray,
            });
        }

        if (currentValue !== null) {
            let titleElem: SVGTitleElement = state.make.title();
            singleNodeGroup.insertBefore(titleElem, titleElem.firstChild);
            titleElem.textContent = `${node.label} (${currentValue.toFixed(2)})`;
        }
    }
}

/**
 * Places the edges between nodes in the SVG.
 *
 * @param state - The state of the renderer.
 */
function placeEdges(state: WeathermapRendererState): void {
    // place edges
    for (let edge of state.config.weathermapEdges) {
        let node1: WeathermapNode = state.nodeLabelToNode[edge.node1];
        let node2: WeathermapNode = state.nodeLabelToNode[edge.node2];
        if (!node1 || !node2) {
            // TODO: output error
            continue;
        }

        let singleEdgeGroup: SVGGElement = state.make.g();
        maybeWrapIntoLink(state.make, state.edgeGroup!, singleEdgeGroup, state.edgeLinkUriBase, edge.linkParams);

        let n1Center: Point2D = {
            x: (+node1.x) + ((+node1.width) / 2),
            y: (+node1.y) + ((+node1.height) / 2)
        };
        let n2Center: Point2D = {
            x: (+node2.x) + ((+node2.width) / 2),
            y: (+node2.y) + ((+node2.height) / 2)
        };

        // calculate bend (control points)
        let control1: Point2D|null = null;
        let control2: Point2D|null = null;
        if (edge.bendDirection && edge.bendMagnitude) {
            // warning: screen coordinates (flipped Y axis)!
            let n1N2Angle: number = Math.atan2(n1Center.y - n2Center.y, n2Center.x - n1Center.x);
            let n2N1Angle: number = Math.atan2(n2Center.y - n1Center.y, n1Center.x - n2Center.x);

            let n1N2BendAngle: number = normalizeAngle(n1N2Angle + deg2rad(edge.bendDirection));
            let n2N1BendAngle: number = normalizeAngle(n2N1Angle - deg2rad(edge.bendDirection));

            let control1Offset: Point2D = polarToCartesian(n1N2BendAngle, edge.bendMagnitude);
            let control2Offset: Point2D = polarToCartesian(n2N1BendAngle, edge.bendMagnitude);

            control1 = {
                x: (+n1Center.x) + control1Offset.x,
                y: (+n1Center.y) - control1Offset.y
            };
            control2 = {
                x: (+n2Center.x) + control2Offset.x,
                y: (+n2Center.y) - control2Offset.y
            };
        }

        if (edge.metric2Name) {
            // two metrics are twice the fun
            let
                [, point1COut, point2CIn, point2, point2COut, point3CIn,]
            =
                halveCubicBezier(n1Center, control1, control2, n2Center)
            ;

            makeAndPlaceEdge(
                state, singleEdgeGroup,
                n1Center, point1COut, point2CIn, point2,
                edge.metricName, edge.styleName,
                `${edge.node1} \u2192 ${edge.node2}`
            );

            makeAndPlaceEdge(
                state, singleEdgeGroup,
                point2, point2COut, point3CIn, n2Center,
                edge.metric2Name, edge.styleName,
                `${edge.node2} \u2192 ${edge.node1}`
            );
        } else {
            makeAndPlaceEdge(
                state, singleEdgeGroup,
                n1Center, control1, control2, n2Center,
                edge.metricName, edge.styleName,
                `${edge.node1} \u2194 ${edge.node2}`
            );
        }
    }
}

/**
 * Places the non-node labels in the SVG.
 *
 * @param state - The state of the renderer.
 */
function placeLabels(state: WeathermapRendererState): void {
    for (let label of state.config.weathermapLabels) {
        let singleLabelGroup: SVGGElement = state.make.g();
        state.labelGroup!.appendChild(singleLabelGroup);

        let text: SVGTextElement = state.make.text();
        singleLabelGroup.appendChild(text);

        text.setAttribute("x", `${+label.x}`);
        text.setAttribute("y", `${+label.y}`);
        text.textContent = label.label;
    }
}

/**
 * Places one edge in the SVG.
 *
 * @param state - The state of the renderer.
 * @param singleEdgeGroup - The group which subsumes all the parts of this edge.
 * @param start - The start point of the edge.
 * @param control1 - The first cubic Bézier control point of the edge.
 * @param control2 - The second cubic Bézier control point of the edge.
 * @param end - The end point of the edge.
 * @param metricName - The name of the metric to query.
 * @param edgeStyleName - The name of the edge style in which to render the edge.
 * @param title - The title (mostly realized as tooltip text in browsers) for this edge.
 */
function makeAndPlaceEdge(
    state: WeathermapRendererState, singleEdgeGroup: SVGGElement, start: Point2D, control1: Point2D|null,
    control2: Point2D|null, end: Point2D, metricName: string|null|undefined, edgeStyleName: string|null|undefined,
    title: string|null|undefined
): void {
    let strokeWidths: number[] = [state.config.strokeWidth];
    let edgeStyle: WeathermapStyle|null = getWeathermapStyle(state, edgeStyleName);
    if (edgeStyle && edgeStyle.strokeWidthArray) {
        let pieces: string[] = edgeStyle.strokeWidthArray.split(/[ ,]+/);
        strokeWidths = pieces.map(p => Number.parseFloat(p));
    }

    if (strokeWidths.length % 2 !== 1) {
        // like stroke-dasharray, double the elements
        strokeWidths.push(...strokeWidths);
    }

    let offsetUnitVector: Point2D = {x: 0, y: 0};
    if (strokeWidths.length > 1) {
        // calculate an actual offset vector

        // get the direction
        let direction: Point2D = {
            x: start.x - end.x,
            y: start.y - end.y
        };

        // rotate 90°; that's the offset vector
        let offsetVector: Point2D = {
            x: direction.y,
            y: -direction.x
        };

        // calculate unit vector
        offsetUnitVector = unitVector(offsetVector);
    }

    let multistrokeGroup: SVGGElement = state.make.g();
    singleEdgeGroup.appendChild(multistrokeGroup);
    modifyStyle(multistrokeGroup, {
        "fill": "none",
    });

    let currentValue: number|null = null;
    if (metricName != null && metricName in state.currentValues) {
        currentValue = state.currentValues[metricName];
        modifyStyle(multistrokeGroup, {
            "stroke": gradientColorForValue(state.sortedGradient, "strokeColor", currentValue)
        });
        modifyApplyingWeathermapStyle(state, multistrokeGroup, edgeStyle);
    } else {
        modifyStyle(multistrokeGroup, {
            "stroke": "black",
            "stroke-dasharray": state.config.noValueDashArray
        });
    }

    if (title) {
        let titleElem: SVGTitleElement = state.make.title();
        multistrokeGroup.appendChild(titleElem);
        titleElem.textContent = (currentValue === null)
            ? title
            : `${title} (${currentValue.toFixed(2)})`
        ;
    }

    let totalStrokeWidth: number = strokeWidths.reduce((acc, cur) => acc + cur, 0);
    let currentOffset: number = -totalStrokeWidth/2.0;
    let isSpacing: boolean = true;
    for (let strokeWidth of strokeWidths) {
        isSpacing = !isSpacing;
        if (isSpacing) {
            currentOffset += strokeWidth;
            continue;
        }

        // calculate offset
        let xOffset: number = offsetUnitVector.x * (currentOffset + strokeWidth/2.0);
        let yOffset: number = offsetUnitVector.y * (currentOffset + strokeWidth/2.0);

        let strokeStart: Point2D = {
            x: start.x + xOffset,
            y: start.y + yOffset,
        };
        let strokeControl1: Point2D|null = (control1 == null) ? null : {
            x: control1.x + xOffset,
            y: control1.y + yOffset,
        };
        let strokeControl2: Point2D|null = (control2 == null) ? null : {
            x: control2.x + xOffset,
            y: control2.y + yOffset,
        };
        let strokeEnd: Point2D = {
            x: end.x + xOffset,
            y: end.y + yOffset,
        };

        // make the path
        let path: SVGPathElement = state.make.path();
        multistrokeGroup.appendChild(path);
        if (strokeControl1 == null || strokeControl2 == null) {
            path.setAttribute("d",
                `M ${strokeStart.x},${strokeStart.y} ` +
                `L ${strokeEnd.x},${strokeEnd.y}`
            );
        } else {
            path.setAttribute("d",
                `M ${strokeStart.x},${strokeStart.y} ` +
                `C ${strokeControl1.x},${strokeControl1.y},${strokeControl2.x},${strokeControl2.y},${strokeEnd.x},${strokeEnd.y}`
            );
        }

        // apply the specific stroke width
        modifyStyle(path, {
            "stroke-width": `${strokeWidth}`,
        });

        currentOffset += strokeWidth;
    }

    if (state.config.showNumbers) {
        let midpoint: Point2D = halveCubicBezier(start, control1, control2, end)[3];
        let valueString: string = (metricName != null && metricName in state.currentValues)
            ? state.currentValues[metricName].toFixed(2)
            : "?"
        ;
        let text: SVGTextElement = state.make.text();
        singleEdgeGroup.appendChild(text);
        text.setAttribute("x", `${midpoint.x}`);
        text.setAttribute("y", `${midpoint.y}`);
        text.textContent = valueString;
    }
}

/**
 * Adds an object to a container, wrapping it into a link first if a link can be generated from the
 * configuration and parameters.
 *
 * A link is only generated if `linkUriBase` is not null or undefined. Otherwise, the object is
 * added to the container directly.
 *
 * @param svgMake - An object which can create new elements in the DOM. Generally a {@link Document}
 * object.
 * @param upperGroup - The container into which to place the single-object group.
 * @param singleObjectGroup - The single-object group to place into the group (possibly wrapped into
 * a link).
 * @param linkUriBase - The base URI for the link.
 * @param objLinkParams - The object-specific parameters to append to the link.
 */
function maybeWrapIntoLink(
    svgMake: SVGElementCreator, upperGroup: SVGGElement, singleObjectGroup: SVGGElement,
    linkUriBase: string|null|undefined, objLinkParams: string|null|undefined
): void {
    if (linkUriBase != null) {
        let objLinkUri: string = linkUriBase;
        if (objLinkParams != null) {
            objLinkUri += (objLinkUri.indexOf("?") === -1)
                ? "?"
                : "&";

            objLinkUri += objLinkParams;
        }

        let aElement: SVGAElement = svgMake.a();
        upperGroup.appendChild(aElement);
        aElement.setAttributeNS(xlinkNamespace, "href", objLinkUri);

        aElement.appendChild(singleObjectGroup);
    } else {
        upperGroup.appendChild(singleObjectGroup);
    }
}

/**
 * Sets the position and dimensions of an SVG rectangle element.
 *
 * @param element - The rectangle element whose position and dimensions to set.
 * @param x - The horizontal position of the rectangle.
 * @param y - The vertical position of the rectangle.
 * @param width - The horizontal extent of the rectangle.
 * @param height - The vertical extent of the rectangle.
 */
export function setRectangleDimensions(
    element: SVGRectElement, x: number|string, y: number|string, width: number|string, height: number|string
): void {
    element.setAttribute("x", `${x}`);
    element.setAttribute("y", `${y}`);
    element.setAttribute("width", `${width}`);
    element.setAttribute("height", `${height}`);
}

/**
 * Modifies the style of the given element.
 *
 * If an element of `newValues` has a `null` value, it is removed from the element's style;
 * otherwise, it is added, replacing the current value if one is present.
 *
 * @param element - The element whose style is to be modified.
 * @param newValues - The new values to use to modify the current style of the element.
 */
function modifyStyle(element: Element, newValues: { [key: string]: any }): void {
    // parse style
    let assembledStyle: StringMapping<string> = {};
    if (element.hasAttribute("style")) {
        let styleVal: string|null = element.getAttribute("style");
        if (styleVal != null) {
            for (let chunk of styleVal.split(";")) {
                let index: number = chunk.indexOf(":");
                if (index === -1) {
                    continue;
                }
                let key: string = chunk.substr(0, index);
                let value: string = chunk.substr(index + 1);
                assembledStyle[key] = value;
            }
        }
    }

    for (let key in newValues) {
        if (newValues.hasOwnProperty(key)) {
            if (newValues[key] === null) {
                delete assembledStyle[key];
            } else {
                assembledStyle[key] = newValues[key];
            }
        }
    }

    let keyValuePairs: string[] = [];
    for (let key in assembledStyle) {
        if (assembledStyle.hasOwnProperty(key)) {
            keyValuePairs.push(`${key}:${assembledStyle[key]}`);
        }
    }

    let keyValueString: string = keyValuePairs.join(";");
    element.setAttribute("style", keyValueString);
}

/**
 * Obtains a specific style from the weathermap.
 *
 * @param state - The state of the renderer.
 * @param styleName - The name of the style to obtain.
 * @returns The style with the given name, or `null` if such a style does not exist.
 */
function getWeathermapStyle(
    state: WeathermapRendererState, styleName: string|null|undefined
): WeathermapStyle|null {
    if (!styleName) {
        return null;
    }

    let style: WeathermapStyle|undefined = state.styleMap[styleName];
    if (!style) {
        return null;
    }
    return style;
}

/**
 * Modifies the element by applying the given weathermap style.
 *
 * @param state - The state of the renderer.
 * @param element - The element to modify with the given style.
 * @param style - The style to apply to the element.
 */
function modifyApplyingWeathermapStyle(
    state: WeathermapRendererState, element: Element, style: WeathermapStyle|null
): void {
    if (!style) {
        return;
    }

    let styleProps: StringMapping<string> = {};
    if (style.dashArray) {
        styleProps["stroke-dasharray"] = style.dashArray;
    }
    // style.strokeWidthArray is handled beforehand

    modifyStyle(element, styleProps);
}


/**
 * The internal state of the weathermap renderer.
 */
export class WeathermapRendererState {
    make: SVGElementCreator;
    config: WeathermapConfig;
    sortedGradient: Gradient;
    currentValues: MetricValueMap;
    nodeLabelToNode: LabelToNodeMap;
    nodeLinkUriBase: string|null;
    edgeLinkUriBase: string|null;
    svg: SVGSVGElement|null;
    defs: SVGDefsElement|null;
    edgeGroup: SVGGElement|null;
    nodeGroup: SVGGElement|null;
    labelGroup: SVGGElement|null;
    legendGroup: SVGGElement|null;
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
    constructor(
        domCreator: SVGElementCreatorDOM, config: WeathermapConfig, sortedGradient: Gradient, currentValues: MetricValueMap
    ) {
        this.make = new SVGElementCreator(domCreator);
        this.config = config;
        this.sortedGradient = sortedGradient;
        this.currentValues = currentValues;
        this.nodeLabelToNode = {};
        this.nodeLinkUriBase = null;
        this.edgeLinkUriBase = null;
        this.svg = null;
        this.defs = null;
        this.edgeGroup = null;
        this.nodeGroup = null;
        this.labelGroup = null;
        this.legendGroup = null;

        this.styleMap = {};
        if (config.weathermapStyles) {
            for (let style of config.weathermapStyles) {
                this.styleMap[style.name] = style;
            }
        }
    }
}

/**
 * Utility class used to quickly create SVG elements of well-known types.
 */
export class SVGElementCreator {
    /** The object that can create elements in the DOM. */
    maker: SVGElementCreatorDOM;

    /** Creates a new element creator. */
    constructor(maker: SVGElementCreatorDOM) { this.maker = maker; }

    /** Creates a new anchor (`<a>`) element. */
    a() { return <SVGAElement>this.maker.createElementNS(svgNamespace, "a"); }

    /** Creates a new definitions (`<defs>`) element. */
    defs() { return <SVGDefsElement>this.maker.createElementNS(svgNamespace, "defs"); }

    /** Creates a new group (`<g>`) element. */
    g() { return <SVGGElement>this.maker.createElementNS(svgNamespace, "g"); }

    /** Creates a new linear gradient (`<linearGradient>`) element. */
    linearGradient() { return <SVGLinearGradientElement>this.maker.createElementNS(svgNamespace, "linearGradient"); }

    /** Creates a new path (`<path>`) element. */
    path() { return <SVGPathElement>this.maker.createElementNS(svgNamespace, "path"); }

    /** Creates a new rectangle (`<rect>`) element. */
    rect() { return <SVGRectElement>this.maker.createElementNS(svgNamespace, "rect"); }

    /** Creates a new gradient stop (`<stop>`) element. */
    stop() { return <SVGStopElement>this.maker.createElementNS(svgNamespace, "stop"); }

    /** Creates a new SVG document (`<svg>`) element. */
    svg() { return <SVGSVGElement>this.maker.createElementNS(svgNamespace, "svg"); }

    /** Creates a new text (`<text>`) element. */
    text() { return <SVGTextElement>this.maker.createElementNS(svgNamespace, "text"); }

    /** Creates a new title (`<title>`) element. */
    title() { return <SVGTitleElement>this.maker.createElementNS(svgNamespace, "title"); }
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
    metricName?: string|null;

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
    metric2Name?: string|null;

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
    type: "none"|"dashboard"|"absolute";

    /** The ID of the dashboard being linked to if {@link type} is "dashboard". */
    dashboard: string|null;

    /** The URL of the dashboard being linked to if {@link type} is "dashboard". */
    dashUri: string|null;

    /** The target URL if {@link type} is "absolute". */
    absoluteUri: string|null;
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
    canvasSize: { width: number; height: number; };

    /** The text offset from the bottom-left edge of the weathermap. */
    textOffsets: { left: number; bottom: number; };

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
    valueName: "max"|"min"|"avg"|"current"|"total";

    /** This option is prescribed by Grafana and ignored by the weathermap. */
    nullPointMode?: "connected"|"null"|"null as zero";

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
