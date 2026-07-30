jsPlumb.ready(() => {


const tk = jsPlumb;

var instance = jsPlumb.newInstance({
                // default drag options
                dragOptions: {
                    cursor: 'pointer',
                    zIndex: 2000,
                    grid: [20, 20],
                    containment: "notNegative"
                },
                // the overlays to decorate each connection with.  note that the label overlay uses a function to generate the label text; in this
                // case it returns the 'labelText' member that we set on each connection in the 'init' method below.
                connectionOverlays: [{
                    type: "Arrow",
                    options: {
                        location: 1,
                        visible: true,
                        width: 11,
                        length: 11,
                        id: "ARROW",
                        events: {
                            click: function click() {
                                alert("you clicked on the arrow overlay");
                            }
                        }
                    }
                }, {
                    type: "Label",
                    options: {
                        location: 0.1,
                        id: "label",
                        cssClass: "aLabel",
                        events: {
                            tap: function tap() {
                                alert("hey");
                            }
                        }
                    }
                }],
                container: document.getElementById("canvas")
            }); // this is the paint style for the connecting lines..

            var connectorPaintStyle = {
                    strokeWidth: 2,
                    stroke: "#61B7CF",
                    joinstyle: "round",
                    outlineStroke: "white",
                    outlineWidth: 2
                },
                // .. and this is the hover style.
                connectorHoverStyle = {
                    strokeWidth: 3,
                    stroke: "#216477",
                    outlineWidth: 5,
                    outlineStroke: "white"
                },
                endpointHoverStyle = {
                    fill: "#216477",
                    stroke: "#216477"
                },
                // the definition of source endpoints (the small blue ones)
                sourceEndpoint = {
                    endpoint: tk.DotEndpoint.type,
                    paintStyle: {
                        stroke: "#7AB02C",
                        fill: "transparent",
                        radius: 7,
                        strokeWidth: 1
                    },
                    source: true,
                    connector: {
                        type: "Flowchart",
                        options: {
                            stub: [40, 60],
                            gap: 10,
                            cornerRadius: 5,
                            alwaysRespectStubs: true
                        }
                    },
                    connectorStyle: connectorPaintStyle,
                    hoverPaintStyle: endpointHoverStyle,
                    connectorHoverStyle: connectorHoverStyle
                },
                // the definition of target endpoints (will appear when the user drags a connection)
                targetEndpoint = {
                    endpoint: tk.DotEndpoint.type,
                    paintStyle: {
                        fill: "#7AB02C",
                        radius: 7
                    },
                    hoverPaintStyle: endpointHoverStyle,
                    maxConnections: -1,
                    dropOptions: {
                        hoverClass: "hover",
                        activeClass: "active"
                    },
                    target: true
                },
                init = function init(connection) {
                    connection.getOverlay("label").setLabel(connection.source.id.substring(15) + "-" + connection.target.id.substring(15));
                };

            const _addEndpoints = (toId, sourceAnchors, targetAnchors) => {
                for (var i = 0; i < sourceAnchors.length; i++) {
                    var sourceUUID = toId + sourceAnchors[i];
                    instance.addEndpoint(document.getElementById("flowchart" + toId), sourceEndpoint, {
                        anchor: sourceAnchors[i],
                        uuid: sourceUUID
                    });
                }

                for (var j = 0; j < targetAnchors.length; j++) {
                    var targetUUID = toId + targetAnchors[j];
                    instance.addEndpoint(document.getElementById("flowchart" + toId), targetEndpoint, {
                        anchor: targetAnchors[j],
                        uuid: targetUUID
                    });
                }
            } // suspend drawing and initialise.


            instance.batch(function () {
                _addEndpoints("Window4", [tk.AnchorLocations.Top, tk.AnchorLocations.Bottom], [tk.AnchorLocations.Left, tk.AnchorLocations.Right]);

                _addEndpoints("Window2", [tk.AnchorLocations.Left, tk.AnchorLocations.Bottom], [tk.AnchorLocations.Top, tk.AnchorLocations.Right]);

                _addEndpoints("Window3", [tk.AnchorLocations.Right, tk.AnchorLocations.Bottom], [tk.AnchorLocations.Left, tk.AnchorLocations.Top]);

                _addEndpoints("Window1", [tk.AnchorLocations.Left, tk.AnchorLocations.Right], [tk.AnchorLocations.Top, tk.AnchorLocations.Bottom]); // listen for new connections; initialise them the same way we initialise the connections at startup.


                instance.bind("connection", function (connInfo, originalEvent) {
                    init(connInfo.connection);
                }); // connect a few up

                instance.connect({
                    uuids: ["Window2Bottom", "Window3Top"]
                });
                instance.connect({
                    uuids: ["Window2Left", "Window4Left"]
                });
                instance.connect({
                    uuids: ["Window4Top", "Window4Right"]
                });
                instance.connect({
                    uuids: ["Window3Right", "Window2Right"]
                });
                instance.connect({
                    uuids: ["Window4Bottom", "Window1Top"]
                });
                instance.connect({
                    uuids: ["Window3Bottom", "Window1Bottom"]
                }); //
                //
                // listen for clicks on connections, and offer to delete connections on click.
                //

                instance.bind(tk.EVENT_CLICK, function (conn, originalEvent) {
                    if (confirm("Delete connection from " + conn.source.id + " to " + conn.target.id + "?")) {
                        instance.deleteConnection(conn);
                    }
                });
                instance.bind(tk.EVENT_CONNECTION_DRAG, function (connection) {
                    console.log("connection " + connection.id + " is being dragged. suspendedElement is ", connection.suspendedElement, " of type ", connection.suspendedElementType);
                });
                instance.bind(tk.EVENT_CONNECTION_MOVED, function (params) {
                    console.log("connection " + params.connection.id + " was moved");
                });
                instance.bind(tk.EVENT_CONNECTION_DETACHED, function (params) {
                    console.log("connection " + params.connection.id + " was detached");
                });
                instance.bind(tk.EVENT_CONNECTION_ABORT, function (connection) {
                    console.log("connection aborted " + connection.id);
                });
            });

})

