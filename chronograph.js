/****************************
 * Namespace: chronograph
 * Author: Kelly Smith
 * Date: 2/19/2014
 * Requirements: jQuery
 */

var chronograph = {};

(function(){
	
	// Data information
	chronograph.data = {};
	chronograph.data.XML = 0;
	chronograph.data.JSON = 1;
	chronograph.validFormats = ["xml", "json"];
	
	// Constants
	chronograph.nodeSize = 15;
	
	function ChronographException(message){
		this.message = message;
		this.name = "ChronographException";
	}
	

	// Class Node
	function Node(id, x, y, color, label){
		this.id = id;
		this.x = x;
		this.y = y;
		this.color = color;
		this.label = label;
		
		this.svgGroup = null;
		this.svgLabel = null;
		this.svgCircle = null;
		
		// Maps id => Edge where Edge is the edge connecting this node to the node with id
		this.edges = {};
	}
	
	Node.prototype.addEdge = function(edge, otherNode){
		this.edges[otherNode.id] = edge;
	};
	
	Node.prototype.setSvg = function(group, label, circle){
		this.svgGroup = group;
		this.svgLabel = label;
		this.svgCircle = circle;
	};
	
	Node.prototype.setPosition = function(x, y){
		if( x !== undefined ) this.x = x;
		if( y !== undefined ) this.y = y;
		
		this.svgCircle.attr("cx", this.x).attr("cy", this.y);
		
		for(var index in this.edges){
			this.edges[index].setPosition();
		}
	};
	
	Node.prototype.equals = function(node){
		if( this.id == node.id ){
			return true;
		}
		else{
			return false;
		}
	};
	
	
	Node.prototype.toString = function(){
		return "Node(" + this.id + ")";
	};
	
	// Class Edge
	function Edge(node1, node2){
		this.node1 = node1;
		this.node2 = node2;
		
		this.svgLine = null;
	}
	
	// Determines if this edge is mathematically equivalent to another
	Edge.prototype.equals = function(edge){
		if( (this.node1.equals(edge.node1) && this.node2.equals(edge.node2))
				|| (this.node1.equals(edge.node2) && this.node2.equals(edge.node1))){
			return true;
		}
		else{
			return false;
		}
	};
	
	Edge.prototype.toString = function(){
		return "Edge(" + this.node1.id + " to " + this.node2.id + ")";
	};
	
	Edge.prototype.setSvg = function(line){
		this.svgLine = line;
	};
	
	Edge.prototype.setPosition = function(){
		if( this.svgLine == null || this.svgLine === undefined ){
			throw new ChronographException("SVG DOM element never initialized for " + this.toString());
		}
		this.svgLine.attr("x1", this.node1.x)
					.attr("y1", this.node1.y)
					.attr("x2", this.node2.x)
					.attr("y2", this.node2.y);
	};
	
	// Class Graph
	function Graph(cont, data, format){
		var self = this;
		
		// Data Members
		self.nodes = {};
		self.edges = [];
		
		self.lineGroup = null;
		self.nodeGroup = null;
		
		
		if(format == chronograph.data.JSON){
			self.parsedData = data;
		}
		else{
			// TODO: Parse XML into JSON
			self.parsedData = null;
		}
		
		// Initialize DOM structure
		self.container = d3.select(cont);
		
		// Hide the svg container until everything has been initialized
		self.container.style("display", "none");
		
		try{
			self.initializeGraphData();
		} catch(e){
			// Graph data was not initialized properly
			console.error(e.message);
			return;
		}
		
		self.initializeContainerDOM();
		self.positionGraph();
		//self.drawSpaciallyOrientedGraph();
		
		
		self.container.style("display", "block");
	}
	
	Graph.prototype.positionGraph = function(){
		var self = this;
		
		for(var index in self.nodes){
			self.nodes[index].setPosition();
		}
		
		/*for(var index in self.edges){
			self.edges[index].setPosition();
		}*/
	};
	
	// This function might need to be optimized later for large graphs.  Went with readability over performance for now.
	Graph.prototype.initializeGraphData = function(){
		var self = this;
		
		if( self.parsedData != null ){
			
			// Initialize Node Objects
			for(var index in self.parsedData.nodes){
				var node = self.parsedData.nodes[index];
				var nodeObj = new Node(node.id, node.x, node.y, node.color, node.label);
				
				self.nodes[nodeObj.id] = nodeObj;
			}
			
			// Initilize Edge Objects
			for(var index in self.nodes){
				var node = self.parsedData.nodes[index];
				var nodeObj = self.nodes[index];
				
				for(var index in node.edges){
					var edge = node.edges[index];
					var nodeTo = self.nodes[edge];
					
					if( nodeTo == null ){
						throw new ChronographException("Graph contains an invalid edge.");
					}
					
					var otherEdge = null;
					var edgeObj = new Edge(nodeObj, nodeTo);
					
					// Don't add edges twice (once per direction) to the edges list.
					var edgeExists = false;
					for(var index in self.edges){
						otherEdge = self.edges[index];
						if( edgeObj.equals(otherEdge) ){
							// Edge already exists because graph format defines edges in both directions.
							edgeExists = true;
							break;
						}
					}
					
					if( edgeExists && otherEdge != null ){
						nodeObj.addEdge(otherEdge, nodeTo);
					}
					else{
						nodeObj.addEdge(edgeObj, nodeTo);
						self.edges.push(edgeObj);
					}
					
				}
			}
		}
		else{
			var message = "Cannot initailize graph.  No data was loaded.";
			throw new ChronographException(message);
		}
	};

	
	Graph.prototype.initializeContainerDOM = function(){
		var self = this;
		
		self.svgContainer = self.container.append("svg");
		
		var unique_id = self.container.attr("id").replace("#", "");
		self.svgContainer.attr("id", "svg_" + unique_id);
		
		// Lines first so they are under the nodes visually
		self.lineGroup = self.svgContainer.append("g").attr("class", "line-group");
		self.nodeGroup = self.svgContainer.append("g").attr("class", "node-group");
		
		
		function dragmove(self, graph) {
			var x = ((d3.event.sourceEvent.pageX-chronograph.nodeSize/2) - self.offsetWidth/2);
			var y = ((d3.event.sourceEvent.pageY-chronograph.nodeSize/2) - self.offsetHeight/2);
			var id = self.id.replace("node_", "").replace("_circle", "");
			graph.nodes[id].setPosition(x,y);
		    
		}
		
		var drag = d3.behavior.drag()
	    .on("drag", function(){
	    	dragmove(this, self)
	    });
		
		for(var index in self.nodes){
			var node = self.nodes[index];
			
			var group = self.nodeGroup.append("g");
			group.attr("id", "node_" + node.id);
			
			var circle = group.append("circle");
			circle.attr("id", "node_" + node.id + "_circle")
				  .attr("r", chronograph.nodeSize)
				  .attr("fill", node.color)
				  .attr("stroke-width", 1)
				  .attr("stroke", "#777777")
				  .attr("cursor", "move")
				  .call(drag);
			
			var label = group.append("text");
			label.attr("id", "node_" + node.id + "_label");
			
			node.setSvg(group, label, circle);
		}
		
		for(var index in self.edges){
			var edge = self.edges[index];
			
			var line = self.lineGroup.append("line");
			line.attr("id", "edge_" + edge.node1.id + "_" + edge.node2.id)
				.attr("stroke", "#777777");
			
			edge.setSvg(line);
		}
		
	};
	
	Graph.prototype.drawSpaciallyOrientedGraph = function(){
		var self = this;
		
		if( self.parsedData != null ){
			
			// Lines first so they are under the nodes visually
			var lineGroup = self.svgContainer.append("g").attr("class", "line-group");
			var nodeGroup = self.svgContainer.append("g").attr("class", "node-group");
			
			for(var index in self.parsedData.nodes){
				
				var node = self.parsedData.nodes[index];
				
				var nodeG = nodeGroup.append("g");
				nodeG.attr("id", "node_" + node.id);
				
				
				function dragmove(d) {
				    d3.select(this)
				      .attr("cy", ((d3.event.sourceEvent.pageY-chronograph.nodeSize/2) - this.offsetHeight/2))
				      .attr("cx", ((d3.event.sourceEvent.pageX-chronograph.nodeSize/2) - this.offsetWidth/2));
				    
				    var text = this.parentNode.childNodes[1];
				    d3.select(text).attr("x", ((d3.event.sourceEvent.pageX-chronograph.nodeSize/2) - this.offsetWidth/2) - 5);
				    d3.select(text).attr("y", ((d3.event.sourceEvent.pageY-chronograph.nodeSize/2) - this.offsetHeight/2) + 5);
				}

				var drag = d3.behavior.drag()
				    .on("drag", dragmove);
				
				var circle = nodeG.append("circle");
				circle.attr("cx", node.x)
					.attr("cy", node.y)
					.attr("r", chronograph.nodeSize)
					.style("fill", node.color)
					.attr("stroke-width", 1)
					.attr("stroke", "#777777")
					.attr("cursor", "move")
					.call(drag);
				
				var label = nodeG.append("text");
				label.text(node.label)
					.attr("x", node.x-5)
					.attr("y", node.y+5)
					.attr("class", "node-label");
				
				self.svgNodes[node.id] = circle;
				
				for( var edge_index in node.edges ){
					var edge = node.edges[edge_index];
					
					var toNode = self.parsedData.nodes[edge];
					
					var line = lineGroup.append("line");
					line.attr("x1", node.x)
						.attr("y1", node.y)
						.attr("x2", toNode.x)
						.attr("y2", toNode.y)
						.attr("stroke", "#777777")
						.attr("shape-rendering", "geometricPrecision");
					
				}
			}
		}
		else{
			console.error("Error: Cannot draw a graph until it hs been parsed and spacially oriented.");
		}
	};
	
	
	// Namespace Accessor
	chronograph.newGraph = function(container, data, format){
		
		if( window.d3 ){
			
			// Make sure that the user has specified a valid data format to provide to chronograph
			if( format == null || chronograph.validFormats[format] != null ){
				
				// Default to JSON
				if( format == null ){
					format = chronograph.JSON;
				}
				
				return new Graph(container, data, format);
			}
			else{
				console.error("Invalid data format specified. Please consult the documentation for specifying a proper data format (default: chronograph.data.JSON).");
			}
		}
		else{
			console.error("Chronograph requires that D3.js be loaded to function.  Please load D3.js into your application before you load Chronograph.");
			return null;
		}
	};
	
})();
