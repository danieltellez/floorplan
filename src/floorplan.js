//
//   Copyright 2018 Nachiket Gadre
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
//

d3.floorplan = function () {
    var layers = [],
        panZoomEnabled = true,
        maxZoom = 5,
        toolsWidth = 95,
        xScale = d3.scaleLinear(),
        yScale = d3.scaleLinear(),
        mapdata = null,
        svgCanvas = null,
        g = null;

    function map() {
        return this
    }

    map.setData = function (svg, data) {
        svgCanvas = svg;
        mapdata = data;
    }

    map.xScale = function (scale) {
        if (!arguments.length) return xScale;
        xScale = scale;
        layers.forEach(function (l) {
            l.xScale(xScale);
        });
        return map;
    };

    map.yScale = function (scale) {
        if (!arguments.length) return yScale;
        yScale = scale;
        layers.forEach(function (l) {
            l.yScale(yScale);
        });
        return map;
    };

    map.maxZoom = function (zoom) {
        if (!arguments.length) return maxZoom;
        maxZoom = zoom;
        return map;
    };

    map.layersWidth = function (width) {
        if (!arguments.length) return toolsWidth;
        toolsWidth = width;
        return map;
    };

    map.panZoom = function (enabled) {
        if (!arguments.length) return panZoomEnabled;
        panZoomEnabled = enabled;
        return map;
    };

    map.addLayer = function (layer, index) {
        layer.xScale(xScale);
        layer.yScale(yScale);

        if (arguments.length > 1 && index >= 0) {
            layers.splice(index, 0, layer);
        } else {
            layers.push(layer);
        }

        return map;
    };

    map.imageLayers = function () {
        console.log(JSON.stringify(mapdata.floors))
        var images = svgCanvas.selectAll("g.images")
            .data(mapdata.floors)
            .enter()
            .append("g")
            .attr("class", function (floor) {
                return "floor-" + floor.id;
            })
            .append("image");

        images.attr("xlink:href", function (floor) {
            return floor.image.url
        }).attr("x", function (floor) {
            return floor.image.x;
        }).attr("y", function (floor) {
            return floor.image.y;
        }).attr("width", function (floor) {
            return floor.image.w;
        }).attr("height", function (floor) {
            return floor.image.h;
        });
    };

    map.drawText = function (g, data) {

        // DATA JOIN
        // Join new data with old elements, if any.
        var text = g.selectAll("text")
            .data(data);

        // UPDATE
        // Update old elements as needed.
        text.attr("class", "update");

        // ENTER
        // Create new elements as needed.
        //
        // ENTER + UPDATE
        // After merging the entered elements with the update selection,
        // apply operations to both.
        text.enter().append("text")
            .attr("class", "enter")
            .attr("x", function (d, i) {
                return i * 32;
            })
            .attr("dy", ".35em")
            .merge(text)
            .text(function (d) {
                return d;
            });

        // EXIT
        // Remove old elements as needed.
        text.exit().remove();
    };

    map.loadSensors = function() {
        mapdata.floors[0].sensors.forEach( function(sensor) {
            new map.sensorImageLayer(svgCanvas, mapdata.floors[0], sensor)
        })
    }

    map.drawSensor = function(sensor) {
        mapdata.floors[0].sensors.push(sensor);
        new map.sensorImageLayer(svgCanvas, mapdata.floors[0], sensor)
    }

    map.zonePolygons = function () {
        let zones = mapdata.floors[0].zones;  // TODO Why get floor zero ?

        zones.forEach(function (zone) {
            // Context menu
            var menu = [
                {
                    title: 'Change zone name',
                    action: function (elm, d, i) {
                        console.log('Change zone name');
                        zone.name = prompt("Please enter new name name", "Zone name");
                        d3.select("." + this.classList.item(1) + '-text').text(zone.name);
                    }
                },
                {
                    title: 'Delete zone',
                    action: function (elm, d, i) {
                        console.log('You have deleted - ' + this.classList.item(1));
                        d3.select("." + this.classList.item(1)).remove();
                    }
                }
            ];

            var gPoly;
            var polyPoints = zone.points;
            drawPolygon(svgCanvas, zone);

            //Called on mousedown if mousedown point if a polygon handle
            function drawPolygon(svgCanvas, zone) {

                var isDrawing = false;
                var isDragging = false;

                var polyPoints = zone.points;
                d3.select('g.outline').remove();

                // Create polygon
                gPoly = svgCanvas.append('g')
                    .classed("polygon", true)
                    .classed("zone-" + zone.id, true);
                // Add drag behavior
                var dragBehavior = d3.drag().on("drag", alterPolygon);

                // Not needed while drawing them all at first.
                // polyPoints.splice(polyPoints.length - 1);
                //console.log(polyPoints);

                var polyEl = gPoly.append("polygon")
                    .style("fill", `url(${zone.pattern})`)
                    .attr("points", polyPoints);

                for (var i = 0; i < polyPoints.length; i++) {
                    gPoly.append('circle')
                        .attr("cx", polyPoints[i][0])
                        .attr("cy", polyPoints[i][1])
                        .attr("r", 4)
                        .call(dragBehavior);
                }

                var bbox = polyEl._groups[0][0].getBBox();
                var bbox2 = gPoly._groups[0][0].getBBox();

                bbox.x = 0;
                bbox.y = 0;
                bbox.width = 50;
                bbox.height = 50;

                // Set translate variable data;
                gPoly.datum({
                    x: 0,
                    y: 0
                });

                // Set translate elem attribute defaults
                gPoly.attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")"
                });

                // Add Transform for mouse drag
                gPoly.call(d3.drag().on("drag", function (d) {
                    d3.select(this).attr("transform", "translate(" + (d.x = d3.event.x) + "," + (d.y = d3.event.y) + ")")
                }));

                // Add context menu
                gPoly.on('contextmenu', d3.contextMenu(menu));

                // Add label text
                var gPolyCentroid = d3.polygonCentroid(polyPoints);
                addLabel(zone.name, gPolyCentroid, "zone-" + zone.id + '-text');

            }

            //Altering polygon coordinates based on handle drag
            function alterPolygon() {

                var alteredPoints = [];
                var selectedP = d3.select(this);
                var parentNode = d3.select(this.parentNode);

                //select only the elements belonging to the parent <g> of the selected circle
                var circles = d3.select(this.parentNode).selectAll('circle');
                var polygon = d3.select(this.parentNode).select('polygon');


                var pointCX = d3.event.x;
                var pointCY = d3.event.y;

                //rendering selected circle on drag
                selectedP.attr("cx", pointCX).attr("cy", pointCY);

                //loop through the group of circle handles attatched to the polygon and push to new array
                for (var i = 0; i < polyPoints.length; i++) {

                    var circleCoord = d3.select(circles._groups[0][i]);
                    var pointCoord = [parseInt(circleCoord.attr("cx")), parseInt(circleCoord.attr("cy"))];
                    alteredPoints[i] = pointCoord;

                }

                //re-rendering polygon attributes to fit the handles
                polygon.attr("points", alteredPoints);

                // Update points
                zone.points = alteredPoints;

                // Update label
                d3.select(".polygon-id-" + zone.id + '-text').remove();
                var gPolyCentroid = d3.polygonCentroid(alteredPoints);
                addLabel(zone.name, gPolyCentroid, "polygon-id-" + zone.id + '-text');

                bbox = parentNode._groups[0][0].getBBox();
                console.log(bbox);
            }

            function addLabel(text, centroid, labelClassName) {
                var svgText = gPoly.append("text");
                svgText.attr("x", centroid[0])
                    .attr("y", centroid[1])
                    .attr('font-size', 14)
                    .attr('font-weight', 400)
                    .attr('font-family', 'sans-serif')
                    .attr('text-anchor', 'middle')
                    .style('fill', 'darkOrange')
                    .classed(labelClassName, true);
                svgText.text(text);
            }

        });
    };

    map.drawZonePolygon = function (zone) {
        mapdata.floors[0].zones.push(zone);
        // Context menu
        var menu = [
            {
                title: 'Change zone name',
                action: function (elm, d, i) {
                    console.log('Change zone name');
                    zone.name = prompt("Please enter new name name", "Zone name");
                    d3.select("." + this.classList.item(1) + '-text').text(zone.name);
                }
            },
            {
                title: 'Delete zone',
                action: function (elm, d, i) {
                    console.log('You have deleted - ' + this.classList.item(1));
                    d3.select("." + this.classList.item(1)).remove();
                }
            }
        ];

        var gContainer = svgCanvas.append('g').classed("outline", true);
        var isDrawing = false;
        var isDragging = false;
        var linePoint1, linePoint2;
        var startPoint;
        var bbox;
        var boundingRect;
        var shape;
        var gPoly;
        var polyPoints = zone.points;

        var polyDraw = svgCanvas.on("mousedown", setPoints)
            .on("mousemove", drawline)
            .on("mouseup", decidePoly);

        var dragBehavior = d3.drag().on("drag", alterPolygon);
        // var dragPolygon = d3.drag().on("drag", movePolygon(bbox));

        //On mousedown - setting points for the polygon
        function setPoints() {

            if (isDragging) return;

            isDrawing = true;

            var plod = d3.mouse(this);
            linePoint1 = {
                x: plod[0],
                y: plod[1]
            };

            polyPoints.push(plod);

            var circlePoint = gContainer.append("circle")
                .attr("cx", linePoint1.x)
                .attr("cy", linePoint1.y)
                .attr("r", 4)
                .attr("start-point", true)
                .classed("handle", true)
                .style("cursor", "pointer");


            // on setting points if mousedown on a handle
            if (d3.event.target.hasAttribute("handle")) {
                completePolygon()
            }

        }

        //on mousemove - appending SVG line elements to the points
        function drawline() {

            if (isDrawing) {
                linePoint2 = d3.mouse(this);
                gContainer.select('line').remove();
                gContainer.append('line')
                    .attr("x1", linePoint1.x)
                    .attr("y1", linePoint1.y)
                    .attr("x2", linePoint2[0] - 2) //arbitary value must be substracted due to circle cursor hover not working
                    .attr("y2", linePoint2[1] - 2); // arbitary values must be tested

            }
        }

        //On mouseup - Removing the placeholder SVG lines and adding polyline
        function decidePoly() {

            gContainer.select('line').remove();
            gContainer.select('polyline').remove();

            var polyline = gContainer.append('polyline').attr('points', polyPoints);

            gContainer.selectAll('circle').remove();

            for (var i = 0; i < polyPoints.length; i++) {
                var circlePoint = gContainer.append('circle')
                    .attr('cx', polyPoints[i][0])
                    .attr('cy', polyPoints[i][1])
                    .attr('r', 5)
                    .attr("handle", true)
                    .classed("handle", true);
            }
        }

        //Called on mousedown if mousedown point if a polygon handle
        function completePolygon() {
            d3.select('g.outline').remove();

            gPoly = svgCanvas.append('g')
                .classed("polygon", true)
                .classed("zone-" + zone.id, true);

            polyPoints.splice(polyPoints.length - 1);
            //console.log(polyPoints);

            polyEl = gPoly.append("polygon")
                .style("fill", `url(${zone.pattern})`)
                .attr("points", polyPoints);

            for (var i = 0; i < polyPoints.length; i++) {
                gPoly.append('circle')
                    .attr("cx", polyPoints[i][0])
                    .attr("cy", polyPoints[i][1])
                    .attr("r", 4)
                    .call(dragBehavior);
            }

            isDrawing = false;
            isDragging = true;

            bbox = polyEl._groups[0][0].getBBox();
            var bbox2 = gPoly._groups[0][0].getBBox();


            bbox.x = 0;
            bbox.y = 0;
            bbox.width = 50;
            bbox.height = 50;


            // Set translate variable defaults;
            gPoly.datum({
                x: 0,
                y: 0
            });

            // Set translate elem attribute defaults
            gPoly.attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")"
            });

            // polyEL.attr("transform", "translate(" + 0 + "," + 0 + ")");
            //
            gPoly.call(d3.drag().on("drag", function (d) {
                d3.select(this).attr("transform", "translate(" + (d.x = d3.event.x) + "," + (d.y = d3.event.y) + ")")
            }));

            // Add context menu
            gPoly.on('contextmenu', d3.contextMenu(menu))

            // Add label text
            var gPolyCentroid = d3.polygonCentroid(polyPoints);
            addLabel(gPoly, zone.name, gPolyCentroid);

        }

        function addLabel(g, text, centroid) {
            var svgText = g.append("text");
            svgText.attr("x", centroid[0])
                .attr("y", centroid[1])
                .attr('font-size', 14)
                .attr('font-weight', 400)
                .attr('font-family', 'sans-serif')
                .attr('text-anchor', 'middle')
                .style('fill', 'darkOrange')
                .classed("zone-" + zone.id + '-text', true);
            svgText.text(text);
        }

        //Altering polygon coordinates based on handle drag
        function alterPolygon() {

            if (isDrawing === true) return;

            var alteredPoints = [];
            var selectedP = d3.select(this);
            var parentNode = d3.select(this.parentNode);

            //select only the elements belonging to the parent <g> of the selected circle
            var circles = d3.select(this.parentNode).selectAll('circle');
            var polygon = d3.select(this.parentNode).select('polygon');


            var pointCX = d3.event.x;
            var pointCY = d3.event.y;

            //rendering selected circle on drag
            selectedP.attr("cx", pointCX).attr("cy", pointCY);

            //loop through the group of circle handles attatched to the polygon and push to new array
            for (var i = 0; i < polyPoints.length; i++) {

                var circleCoord = d3.select(circles._groups[0][i]);
                var pointCoord = [parseInt(circleCoord.attr("cx")), parseInt(circleCoord.attr("cy"))];
                alteredPoints[i] = pointCoord;

            }

            //re-rendering polygon attributes to fit the handles
            polygon.attr("points", alteredPoints);

            // Update points
            zone.points = alteredPoints;

            // Update label
            d3.select(".zone-" + zone.id + '-text').remove();
            var gPolyCentroid = d3.polygonCentroid(alteredPoints);
            addLabel(gPoly, zone.name, gPolyCentroid);

            bbox = parentNode._groups[0][0].getBBox();
            console.log(bbox);
        }

        function movePolygon() {

        }

        function prepareTransform(bboxVal) {

            var originalPosition = {
                x: bboxVal.x,
                y: bboxVal.y
            };

            console.log(bboxVal);
            console.log(bbox);

            bbox.x = 0;
            bbox.y = 0;


            //render a bounding box
            // shape.rectEl.attr("x", bbox.x).attr("y", bbox.y).attr("height", bbox.height).attr("width", bbox.width);
            //
            // //drag points
            // shape.pointEl1.attr("cx", bbox.x).attr("cy", bbox.y).attr("r", 4);
            // shape.pointEl2.attr("cx", (bbox.x + bbox.width)).attr("cy", (bbox.y + bbox.height)).attr("r", 4);
            // shape.pointEl3.attr("cx", bbox.x + bbox.width).attr("cy", bbox.y).attr("r", 4);
            // shape.pointEl4.attr("cx", bbox.x).attr("cy", bbox.y + bbox.height).attr("r", 4);

            return originalPosition;
        }
    };

    map.sensorImageLayer = function (svgCanvas, floor, sensor) {

        // Context menu
        var menu = [
            {
                title: 'Delete sensor',
                action: function (elm, d, i) {
                    console.log('You have deleted - ' + this.classList.item(1));
                    d3.select("." + this.classList.item(0)).remove();
                }
            }
        ];

        // Select Group element of Floor sensor images
        var gFloorSensorImages = svgCanvas.selectAll(".floor-" + floor.id);

        // UPDATE
        // Update old elements as needed.
        gFloorSensorImages.attr("class", "floor-" + floor.id + " update");

        // ENTER + UPDATE
        // Create new elements as needed.
        var gSensorContainer = svgCanvas.append("g").classed("sensor-" + sensor.id, true);

        var rotationController = gSensorContainer.append('g');

        // ENTER
        // Create new elements as needed.
        var image = rotationController.append("image")
            .attr("xlink:href", sensor.url)
            .attr("x", sensor.x)
            .attr("y", sensor.y)
            .attr("width", sensor.w)
            .attr("height", sensor.h);

        var rotationIcon = rotationController.append('g')
            .attr("class", "sensor-tool")
            .attr("transform", `translate(${sensor.x - 10}, ${sensor.y - 10})`)
            .call(
                d3.drag()
                    .on("drag", function() {
                        var x = d3.event.x,
                            y = d3.event.y,
                            toolCenterX = this.getBBox().x + sensor.x,
                            toolCenterY = this.getBBox().y + sensor.y,
                            rotationCenterX = sensor.x + (sensor.w / 2),
                            rotationCenterY = sensor.y + (sensor.h / 2),
                            vector2 = {
                                x: rotationCenterX - x,
                                y: rotationCenterY - y
                            },
                            vector1 = {
                                x: rotationCenterX - toolCenterX,
                                y: rotationCenterY - toolCenterY
                            },
                            angle;
                        
                        angle = (Math.atan2(vector2.y, vector2.x) - Math.atan2(vector1.y, vector1.x)) * 180 / Math.PI;
                        console.log(x, y, angle)
                        // if (x < 0) {
                        //     angle = 270 - (Math.atan(y / -x) * 180 / Math.PI);
                        // } else {
                        //     angle = 90 + (Math.atan(y / x) * 100 / Math.PI);
                        // }
    
                        rotationController.attr("transform", `rotate(${angle}, ${rotationCenterX}, ${rotationCenterY})`);
                    })
                    .container(function() { return this.parentNode.parentNode })
            )

        rotationIcon
            .style('fill', 'red')
            .append("path")
            .attr("d", "M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z")
            .attr("fill-rule", "evenodd")
        
        rotationIcon
            .append("path")
            .attr("d", "M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z")

        rotationIcon
            .append('circle')
            .attr('cx', 8)
            .attr('cy', 8)
            .attr('r', '10px')
            .attr('class', 'tool')

        // Set translate variable defaults;
        gSensorContainer.datum({
            x: 0,
            y: 0
        });

        // Set translate elem attribute defaults
        gSensorContainer.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")"
        });

        d3.selectAll(".sensor-" + sensor.id).call(d3.drag().on("drag", function (d) {
            // Uncomment if you need to apply to image layer
            // d3.select("." + this.classList[0] + " image").datum(d).attr("transform",
            // "translate(" + (d.x = d3.event.x) + "," + (d.y = d3.event.y) + ")");
            d3.select(this)
                .attr("transform", "translate(" + (d.x = d3.event.x) + "," + (d.y = d3.event.y) + ")");
        }));

        // Add context menu
        gSensorContainer.on('contextmenu', d3.contextMenu(menu));
    };

    return map;
};

d3.floorplan.version = "0.1.0";