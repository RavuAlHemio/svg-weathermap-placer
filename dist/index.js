"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SVGElementCreator = exports.WeathermapRendererState = exports.setRectangleDimensions = exports.renderWeathermapInto = void 0;
const constants_1 = require("./constants");
const geometry_1 = require("./geometry");
const gradients_1 = require("./gradients");
const legend_1 = require("./legend");
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
function renderWeathermapInto(elementCreator, container, config, currentValues, linkResolver, addViewBox = false) {
    // sort gradient stops
    let sortedStops = config.gradient.stops
        .slice()
        .sort((l, r) => l.position - r.position);
    let sortedGradient = {
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
    (0, legend_1.placeLegend)(state.make, config.legend, state.legendGroup, state.defs, sortedGradient, `${config.id}`);
    return state.svg;
}
exports.renderWeathermapInto = renderWeathermapInto;
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
function initializeSVG(state, container, addViewBox = false) {
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
function placeNodes(state) {
    for (let node of state.config.weathermapNodes) {
        state.nodeLabelToNode[node.label] = node;
        let singleNodeGroup = state.make.g();
        maybeWrapIntoLink(state.make, state.nodeGroup, singleNodeGroup, state.nodeLinkUriBase, node.linkParams);
        let rect = state.make.rect();
        singleNodeGroup.appendChild(rect);
        setRectangleDimensions(rect, node.x, node.y, node.width, node.height);
        modifyStyle(rect, {
            "stroke": "gray",
            "stroke-width": "1px",
        });
        let text = state.make.text();
        singleNodeGroup.appendChild(text);
        text.setAttribute("x", `${(+node.x) + (+state.config.textOffsets.left)}`);
        text.setAttribute("y", `${(+node.y) + (+node.height) - state.config.textOffsets.bottom}`);
        if (state.config.showNumbers && node.metricName != null) {
            let value = (node.metricName in state.currentValues)
                ? `${state.currentValues[node.metricName]}`
                : "?";
            text.textContent = `${node.label} (${value})`;
        }
        else {
            text.textContent = node.label;
        }
        let currentValue = null;
        if (!node.metricName) {
            modifyStyle(rect, {
                "fill": "silver",
                "stroke-dasharray": state.config.unmeasuredDashArray,
            });
        }
        else if (node.metricName in state.currentValues) {
            // color node by metric
            currentValue = state.currentValues[node.metricName];
            modifyStyle(rect, {
                "fill": (0, gradients_1.gradientColorForValue)(state.sortedGradient, "fillColor", currentValue),
            });
        }
        else {
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
            let titleElem = state.make.title();
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
function placeEdges(state) {
    // place edges
    for (let edge of state.config.weathermapEdges) {
        let node1 = state.nodeLabelToNode[edge.node1];
        let node2 = state.nodeLabelToNode[edge.node2];
        if (!node1 || !node2) {
            // TODO: output error
            continue;
        }
        let singleEdgeGroup = state.make.g();
        maybeWrapIntoLink(state.make, state.edgeGroup, singleEdgeGroup, state.edgeLinkUriBase, edge.linkParams);
        let n1Center = {
            x: (+node1.x) + ((+node1.width) / 2),
            y: (+node1.y) + ((+node1.height) / 2)
        };
        let n2Center = {
            x: (+node2.x) + ((+node2.width) / 2),
            y: (+node2.y) + ((+node2.height) / 2)
        };
        // calculate bend (control points)
        let control1 = null;
        let control2 = null;
        if (edge.bendDirection && edge.bendMagnitude) {
            // warning: screen coordinates (flipped Y axis)!
            let n1N2Angle = Math.atan2(n1Center.y - n2Center.y, n2Center.x - n1Center.x);
            let n2N1Angle = Math.atan2(n2Center.y - n1Center.y, n1Center.x - n2Center.x);
            let n1N2BendAngle = (0, geometry_1.normalizeAngle)(n1N2Angle + (0, geometry_1.deg2rad)(edge.bendDirection));
            let n2N1BendAngle = (0, geometry_1.normalizeAngle)(n2N1Angle - (0, geometry_1.deg2rad)(edge.bendDirection));
            let control1Offset = (0, geometry_1.polarToCartesian)(n1N2BendAngle, edge.bendMagnitude);
            let control2Offset = (0, geometry_1.polarToCartesian)(n2N1BendAngle, edge.bendMagnitude);
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
            let [, point1COut, point2CIn, point2, point2COut, point3CIn,] = (0, geometry_1.halveCubicBezier)(n1Center, control1, control2, n2Center);
            makeAndPlaceEdge(state, singleEdgeGroup, n1Center, point1COut, point2CIn, point2, edge.metricName, edge.styleName, `${edge.node1} \u2192 ${edge.node2}`);
            makeAndPlaceEdge(state, singleEdgeGroup, point2, point2COut, point3CIn, n2Center, edge.metric2Name, edge.styleName, `${edge.node2} \u2192 ${edge.node1}`);
        }
        else {
            makeAndPlaceEdge(state, singleEdgeGroup, n1Center, control1, control2, n2Center, edge.metricName, edge.styleName, `${edge.node1} \u2194 ${edge.node2}`);
        }
    }
}
/**
 * Places the non-node labels in the SVG.
 *
 * @param state - The state of the renderer.
 */
function placeLabels(state) {
    for (let label of state.config.weathermapLabels) {
        let singleLabelGroup = state.make.g();
        state.labelGroup.appendChild(singleLabelGroup);
        let text = state.make.text();
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
function makeAndPlaceEdge(state, singleEdgeGroup, start, control1, control2, end, metricName, edgeStyleName, title) {
    let strokeWidths = [state.config.strokeWidth];
    let edgeStyle = getWeathermapStyle(state, edgeStyleName);
    if (edgeStyle && edgeStyle.strokeWidthArray) {
        let pieces = edgeStyle.strokeWidthArray.split(/[ ,]+/);
        strokeWidths = pieces.map(p => Number.parseFloat(p));
    }
    if (strokeWidths.length % 2 !== 1) {
        // like stroke-dasharray, double the elements
        strokeWidths.push(...strokeWidths);
    }
    let offsetUnitVector = { x: 0, y: 0 };
    if (strokeWidths.length > 1) {
        // calculate an actual offset vector
        // get the direction
        let direction = {
            x: start.x - end.x,
            y: start.y - end.y
        };
        // rotate 90°; that's the offset vector
        let offsetVector = {
            x: direction.y,
            y: -direction.x
        };
        // calculate unit vector
        offsetUnitVector = (0, geometry_1.unitVector)(offsetVector);
    }
    let multistrokeGroup = state.make.g();
    singleEdgeGroup.appendChild(multistrokeGroup);
    modifyStyle(multistrokeGroup, {
        "fill": "none",
    });
    let currentValue = null;
    if (metricName != null && metricName in state.currentValues) {
        currentValue = state.currentValues[metricName];
        modifyStyle(multistrokeGroup, {
            "stroke": (0, gradients_1.gradientColorForValue)(state.sortedGradient, "strokeColor", currentValue)
        });
        modifyApplyingWeathermapStyle(state, multistrokeGroup, edgeStyle);
    }
    else {
        modifyStyle(multistrokeGroup, {
            "stroke": "black",
            "stroke-dasharray": state.config.noValueDashArray
        });
    }
    if (title) {
        let titleElem = state.make.title();
        multistrokeGroup.appendChild(titleElem);
        titleElem.textContent = (currentValue === null)
            ? title
            : `${title} (${currentValue.toFixed(2)})`;
    }
    let totalStrokeWidth = strokeWidths.reduce((acc, cur) => acc + cur, 0);
    let currentOffset = -totalStrokeWidth / 2.0;
    let isSpacing = true;
    for (let strokeWidth of strokeWidths) {
        isSpacing = !isSpacing;
        if (isSpacing) {
            currentOffset += strokeWidth;
            continue;
        }
        // calculate offset
        let xOffset = offsetUnitVector.x * (currentOffset + strokeWidth / 2.0);
        let yOffset = offsetUnitVector.y * (currentOffset + strokeWidth / 2.0);
        let strokeStart = {
            x: start.x + xOffset,
            y: start.y + yOffset,
        };
        let strokeControl1 = (control1 == null) ? null : {
            x: control1.x + xOffset,
            y: control1.y + yOffset,
        };
        let strokeControl2 = (control2 == null) ? null : {
            x: control2.x + xOffset,
            y: control2.y + yOffset,
        };
        let strokeEnd = {
            x: end.x + xOffset,
            y: end.y + yOffset,
        };
        // make the path
        let path = state.make.path();
        multistrokeGroup.appendChild(path);
        if (strokeControl1 == null || strokeControl2 == null) {
            path.setAttribute("d", `M ${strokeStart.x},${strokeStart.y} ` +
                `L ${strokeEnd.x},${strokeEnd.y}`);
        }
        else {
            path.setAttribute("d", `M ${strokeStart.x},${strokeStart.y} ` +
                `C ${strokeControl1.x},${strokeControl1.y},${strokeControl2.x},${strokeControl2.y},${strokeEnd.x},${strokeEnd.y}`);
        }
        // apply the specific stroke width
        modifyStyle(path, {
            "stroke-width": `${strokeWidth}`,
        });
        currentOffset += strokeWidth;
    }
    if (state.config.showNumbers) {
        let midpoint = (0, geometry_1.halveCubicBezier)(start, control1, control2, end)[3];
        let valueString = (metricName != null && metricName in state.currentValues)
            ? state.currentValues[metricName].toFixed(2)
            : "?";
        let text = state.make.text();
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
function maybeWrapIntoLink(svgMake, upperGroup, singleObjectGroup, linkUriBase, objLinkParams) {
    if (linkUriBase != null) {
        let objLinkUri = linkUriBase;
        if (objLinkParams != null) {
            objLinkUri += (objLinkUri.indexOf("?") === -1)
                ? "?"
                : "&";
            objLinkUri += objLinkParams;
        }
        let aElement = svgMake.a();
        upperGroup.appendChild(aElement);
        aElement.setAttributeNS(constants_1.xlinkNamespace, "href", objLinkUri);
        aElement.appendChild(singleObjectGroup);
    }
    else {
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
function setRectangleDimensions(element, x, y, width, height) {
    element.setAttribute("x", `${x}`);
    element.setAttribute("y", `${y}`);
    element.setAttribute("width", `${width}`);
    element.setAttribute("height", `${height}`);
}
exports.setRectangleDimensions = setRectangleDimensions;
/**
 * Modifies the style of the given element.
 *
 * If an element of `newValues` has a `null` value, it is removed from the element's style;
 * otherwise, it is added, replacing the current value if one is present.
 *
 * @param element - The element whose style is to be modified.
 * @param newValues - The new values to use to modify the current style of the element.
 */
function modifyStyle(element, newValues) {
    // parse style
    let assembledStyle = {};
    if (element.hasAttribute("style")) {
        let styleVal = element.getAttribute("style");
        if (styleVal != null) {
            for (let chunk of styleVal.split(";")) {
                let index = chunk.indexOf(":");
                if (index === -1) {
                    continue;
                }
                let key = chunk.substr(0, index);
                let value = chunk.substr(index + 1);
                assembledStyle[key] = value;
            }
        }
    }
    for (let key in newValues) {
        if (newValues.hasOwnProperty(key)) {
            if (newValues[key] === null) {
                delete assembledStyle[key];
            }
            else {
                assembledStyle[key] = newValues[key];
            }
        }
    }
    let keyValuePairs = [];
    for (let key in assembledStyle) {
        if (assembledStyle.hasOwnProperty(key)) {
            keyValuePairs.push(`${key}:${assembledStyle[key]}`);
        }
    }
    let keyValueString = keyValuePairs.join(";");
    element.setAttribute("style", keyValueString);
}
/**
 * Obtains a specific style from the weathermap.
 *
 * @param state - The state of the renderer.
 * @param styleName - The name of the style to obtain.
 * @returns The style with the given name, or `null` if such a style does not exist.
 */
function getWeathermapStyle(state, styleName) {
    if (!styleName) {
        return null;
    }
    let style = state.styleMap[styleName];
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
function modifyApplyingWeathermapStyle(state, element, style) {
    if (!style) {
        return;
    }
    let styleProps = {};
    if (style.dashArray) {
        styleProps["stroke-dasharray"] = style.dashArray;
    }
    // style.strokeWidthArray is handled beforehand
    modifyStyle(element, styleProps);
}
/**
 * The internal state of the weathermap renderer.
 */
class WeathermapRendererState {
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
    constructor(domCreator, config, sortedGradient, currentValues) {
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
exports.WeathermapRendererState = WeathermapRendererState;
/**
 * Utility class used to quickly create SVG elements of well-known types.
 */
class SVGElementCreator {
    /** Creates a new element creator. */
    constructor(maker) { this.maker = maker; }
    /** Creates a new anchor (`<a>`) element. */
    a() { return this.maker.createElementNS(constants_1.svgNamespace, "a"); }
    /** Creates a new definitions (`<defs>`) element. */
    defs() { return this.maker.createElementNS(constants_1.svgNamespace, "defs"); }
    /** Creates a new group (`<g>`) element. */
    g() { return this.maker.createElementNS(constants_1.svgNamespace, "g"); }
    /** Creates a new linear gradient (`<linearGradient>`) element. */
    linearGradient() { return this.maker.createElementNS(constants_1.svgNamespace, "linearGradient"); }
    /** Creates a new path (`<path>`) element. */
    path() { return this.maker.createElementNS(constants_1.svgNamespace, "path"); }
    /** Creates a new rectangle (`<rect>`) element. */
    rect() { return this.maker.createElementNS(constants_1.svgNamespace, "rect"); }
    /** Creates a new gradient stop (`<stop>`) element. */
    stop() { return this.maker.createElementNS(constants_1.svgNamespace, "stop"); }
    /** Creates a new SVG document (`<svg>`) element. */
    svg() { return this.maker.createElementNS(constants_1.svgNamespace, "svg"); }
    /** Creates a new text (`<text>`) element. */
    text() { return this.maker.createElementNS(constants_1.svgNamespace, "text"); }
    /** Creates a new title (`<title>`) element. */
    title() { return this.maker.createElementNS(constants_1.svgNamespace, "title"); }
}
exports.SVGElementCreator = SVGElementCreator;
