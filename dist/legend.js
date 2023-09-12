"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeLegend = void 0;
const index_1 = require("./index");
const legendLength = 100;
const legendWidth = 5;
// (let the container apply any transformations)
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
function placeLegend(svgMake, settings, container, defs, gradient, weathermapID) {
    let transform = "";
    if (settings.type === "") {
        // no legend
        return;
    }
    // draw stroke-color legend
    let strokeLegendContainer = svgMake.g();
    container.appendChild(strokeLegendContainer);
    strokeLegendContainer.setAttribute("class", "stroke-legend");
    if (settings.type[0] === "h") {
        transform =
            `translate(${settings.x} ${settings.y})`
                + ` scale(${settings.length / legendLength} ${settings.width / legendWidth})`;
    }
    else if (settings.type[0] === "v") {
        transform =
            `translate(${settings.x} ${settings.y + settings.length})`
                + ` rotate(-90)`
                + ` scale(${settings.length / legendLength} ${settings.width / legendWidth})`;
    }
    strokeLegendContainer.setAttribute("transform", transform);
    drawLegend(svgMake, gradient, "strokeColor", strokeLegendContainer, defs, weathermapID);
    // draw fill-color legend
    let fillLegendContainer = svgMake.g();
    container.appendChild(fillLegendContainer);
    strokeLegendContainer.setAttribute("class", "fill-legend");
    if (settings.type[0] === "h") {
        transform =
            `translate(${settings.x} ${settings.y + settings.width})`
                + ` scale(${settings.length / legendLength} ${settings.width / legendWidth})`;
    }
    else if (settings.type[0] === "v") {
        transform =
            `translate(${settings.x + settings.width} ${settings.y + settings.length})`
                + ` rotate(-90)`
                + ` scale(${settings.length / legendLength} ${settings.width / legendWidth})`;
    }
    fillLegendContainer.setAttribute("transform", transform);
    drawLegend(svgMake, gradient, "fillColor", fillLegendContainer, defs, weathermapID);
    // draw legend labels
    placeLabels(svgMake, settings, gradient, container);
}
exports.placeLegend = placeLegend;
/**
 * Draws the legend gradient.
 *
 * @param svgMake - An object which can create new elements in the DOM. Generally a {@link Document}
 * object.
 * @param gradient - The gradient configuration to use to draw the legend.
 * @param colorType - Whether to use the fill gradient (`"fillColor"`) or the stroke gradient
 * (`"strokeColor"`).
 * @param container - The container in which to place the gradient.
 * @param defs - The SVG `<defs>` element in which to place the gradient definition.
 * @param weathermapID - The ID of the weathermap on the dashboard; if provided, used to
 * disambiguate multiple gradient definitions to prevent cross-pollution.
 */
function drawLegend(svgMake, gradient, colorType, container, defs, weathermapID) {
    if (gradient.type === "linear") {
        let legendGradientName = `WeathermapLegendGradient-${colorType}`;
        if (weathermapID != null) {
            legendGradientName = `${legendGradientName}-${weathermapID}`;
        }
        let svgGrad = svgMake.linearGradient();
        defs.appendChild(svgGrad);
        svgGrad.setAttribute("id", legendGradientName);
        for (let stop of gradient.stops) {
            let svgStop = svgMake.stop();
            svgGrad.appendChild(svgStop);
            svgStop.setAttribute("offset", `${stop.position}%`);
            svgStop.setAttribute("stop-color", `${stop[colorType]}`);
        }
        let svgRect = svgMake.rect();
        container.appendChild(svgRect);
        (0, index_1.setRectangleDimensions)(svgRect, 0, 0, legendLength, legendWidth);
        svgRect.setAttribute("style", `fill:url(#${legendGradientName})`);
    }
    else if (gradient.type === "steps") {
        for (let i = 1; i < gradient.stops.length; ++i) {
            let rect = svgMake.rect();
            container.appendChild(rect);
            (0, index_1.setRectangleDimensions)(rect, gradient.stops[i - 1].position, 0, gradient.stops[i].position - gradient.stops[i - 1].position, legendWidth);
            rect.setAttribute("style", `fill:${gradient.stops[i - 1][colorType]}`);
        }
        let rect = svgMake.rect();
        container.appendChild(rect);
        (0, index_1.setRectangleDimensions)(rect, gradient.stops[gradient.stops.length - 1].position, 0, 100 - gradient.stops[gradient.stops.length - 1].position, legendWidth);
        rect.setAttribute("style", `fill:${gradient.stops[gradient.stops.length - 1][colorType]}`);
    }
}
/**
 * Places the labels of the gradient.
 *
 * @param svgMake - An object which can create new elements in the DOM. Generally a {@link Document}
 * object.
 * @param settings - Settings controlling the legend.
 * @param gradient - The gradient configuration to use to draw the legend.
 * @param container - The container in which to place the gradient.
 */
function placeLabels(svgMake, settings, gradient, container) {
    if (settings.type === "" || settings.type[1] === "n") {
        // no labels
        return;
    }
    for (let stop of gradient.stops) {
        if (!stop.showLegendLabel) {
            continue;
        }
        let xCoord = settings.x;
        let yCoord = settings.y;
        let dy = 0.0;
        let textAnchor = "start";
        if (settings.type[0] === "h") {
            // horizontal scale
            xCoord += stop.position * settings.length / legendLength;
            textAnchor = "middle";
            if (settings.type === "hb") {
                yCoord += 2 * settings.width;
                dy = 1.0;
            }
        }
        else if (settings.type[0] === "v") {
            // vertical scale
            yCoord += settings.length - (stop.position * settings.length / legendLength);
            dy = 0.4;
            if (settings.type === "vl") {
                textAnchor = "end";
            }
            else if (settings.type === "vr") {
                textAnchor = "start";
                xCoord += 2 * settings.width;
            }
        }
        let label = svgMake.text();
        container.appendChild(label);
        label.setAttribute("class", "legend-label");
        label.setAttribute("x", `${xCoord}`);
        label.setAttribute("y", `${yCoord}`);
        label.setAttribute("dy", `${dy}em`);
        label.setAttribute("style", `text-anchor:${textAnchor}`);
        label.textContent = `${stop.position}`;
    }
}
