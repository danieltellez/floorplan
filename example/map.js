var svg = d3.select("svg.d3"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    g = svg.append("g").attr("transform", "translate(32," + (height / 2) + ")"),
    map = d3.floorplan(); // initialize floor plan

// Set data
var mapdata = {
    floors: [{
        id: uuid(),
        name: "Floor 1",
        image: {
            url: "images/sample_floorplan.png",
            x: 0,
            y: 0,
            w: width,
            h: height
        },
        zones: [
            {
                id: uuid(),
                pattern: '#circles-1',
                name: "ZONE - 0",
                points: [
                    [
                        147,
                        117
                    ],
                    [
                        147,
                        268
                    ],
                    [
                        368,
                        268
                    ],
                    [
                        369,
                        148
                    ],
                    [
                        353,
                        149
                    ],
                    [
                        353,
                        82
                    ],
                    [
                        316,
                        32
                    ],
                    [
                        233,
                        32
                    ],
                    [
                        201,
                        79
                    ],
                    [
                        199,
                        117
                    ]
                ]
            },
            {
                id: uuid(),
                pattern: '#circles-1',
                name: "ZONE - 1",
                points: [
                    [
                        581,
                        326
                    ],
                    [
                        582,
                        475
                    ],
                    [
                        784,
                        474
                    ],
                    [
                        784,
                        325
                    ]
                ]
            }
        ],
        sensors: []
    }]
};

map.setData(svg, mapdata);
// Load Floor image layers
map.imageLayers();
// Load default polygons.
map.zonePolygons();

// Load and Draw sensors
map.loadSensors();

// Draw Zone function
var drawZone = d3.selectAll('.poly').on('click', function () {
    var zonePolyPoints = [];
    var zoneType = $( this ).data('type');
    var zone = {
        id:uuid(),
        name: "ZONE - " + uuid(),
        pattern: `#${zoneType}`,
        points: zonePolyPoints
    };
    
    new map.drawZonePolygon(zone);
});

// Draw Sensor Image function
var drawSensor = d3.select('#sensor').on('click', function () {
    var sensor = {
        id:  uuid(),
        name: "Sensor - " + uuid(),
        url: "images/bluetooth_logo.png",
        x: width / 2,
        y: height / 2,
        w: 32,
        h: 32
    };
    map.drawSensor(sensor);
});

// Helper to automatically refresh data
var updateMapData = d3.select('#updateMapData').on('click', function () {
    // Reacalculate all coordinate points.
    mapdata.floors[0].sensors.forEach(function(sensor) {
       var cssAttribute = $("g.sensor-"+sensor.id).css('transform');
       var matrix = cssAttribute.replace(/[^0-9\-.,]/g, '').split(',');
       sensor.x += parseInt(matrix[4]);
       sensor.y += parseInt(matrix[5]);
    });
    $('#mapdata').html(library.json.prettyPrint(mapdata));
});

// Helper to add uuids
function uuid() {
    var uuid = "", i, random;
    for (i = 0; i < 32; i++) {
        random = Math.random() * 16 | 0;

        if (i == 8 || i == 12 || i == 16 || i == 20) {
            uuid += "-"
        }
        uuid += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
    }
    return uuid;
}