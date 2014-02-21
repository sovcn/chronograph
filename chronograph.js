/****************************
 * Namespace: chronograph
 * Author: Kelly Smith
 * Date: 2/19/2014
 * Requirements: D3
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
	chronograph.agentSize = 5;
	
	function ChronographException(message){
		this.message = message;
		this.name = "ChronographException";
	}
	
	
	// Class XmlDocument
	function XmlDocument(xml){
		this.xml = xml;
	}
	
	XmlDocument.prototype.parse = function(){
		var self = this;
		
		var data = {};
		data.nodes = {};
		d3.select(self.xml).selectAll("node").each(function(){

			var node = d3.select(this);
			
			var attr = {};
			
			attr.id = node.attr('id');
			attr.color = node.attr('color');
			attr.x = node.attr('x');
			attr.y = node.attr('y');
			attr.label = node.attr('label');
			
			
			var edges = node.selectAll("edge");
			var edgesArr = [];
			edges.each(function(){
				var edge = d3.select(this);
				var to = edge.attr('to');
				edgesArr.push(to);
			});
			
			attr.edges = edgesArr;
			
			data.nodes[attr.id] = attr;
			
		});
		
		return data;
	};
	
	// Class Agent
	function Agent(id, start, label, steps, currentNode){
		this.id = id;
		this.start = start;
		this.label = label;
		this.steps = steps;
		this.currentNode = currentNode;
		
		this.svgCircle = null;
	}
	
	Agent.prototype.setPosition = function(x, y){
		
		if( this.svgCircle == null || this.svgCircle === undefined ){
			throw new ChronographException("SVG DOM element never initialized for " + this.toString());
		}
		
		this.svgCircle.attr("cx", x).attr("cy", y);

	};
	
	Agent.prototype.setSvg = function(circle){
		this.svgCircle = circle;
	};
	
	Agent.prototype.toString = function(){
		return "Agent(" + this.id + ")";
	};

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
	function Graph(cont, data, format, traverse){
		var self = this;
		
		// Data Members
		self.nodes = {};
		self.edges = [];
		self.agents = {};
		
		self.lineGroup = null;
		self.nodeGroup = null;
		self.agentGroup = null;
		
		self.svgContainer = null;
		
		
		if(format == chronograph.data.JSON){
			self.parsedData = data;
		}
		else{
			// TODO: Parse XML into JSON
			var xmlDoc = new XmlDocument(data);
			self.parsedData = xmlDoc.parse();
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
		
		try{
			if( traverse ){
				self.initializeTraverseData();
				self.initializeAgentDOM();
			}
		} catch(e){
			// Graph data was not initialized properly
			console.error(e.message);
			return;
		}
		
		self.container.style("display", "block");
	}
	
	Graph.prototype.initializeAgentDOM = function(){
		var self = this;
		
		self.agentGroup = self.svgContainer.append("g").attr("class", "agent-group");
		
		for(var index in self.agents){
			var agent = self.agents[index];
			
			var circle = self.agentGroup.append("circle");
			circle.attr("id", "agent_" + agent.id)
			     .attr("r", chronograph.agentSize)
			     .attr("fill", "blue")
			     .attr("stroke-width", 1)
			     .attr("stroke", "#777777");
			
			agent.setSvg(circle);
			agent.setPosition(agent.currentNode.x, agent.currentNode.y);
		}
	};
	
	Graph.prototype.initializeTraverseData = function(){
		var self = this;
		
		if( self.parsedData != null && self.parsedData.traversal != null ){
			var traversal = self.parsedData.traversal;
			for(var index in traversal.agents){
				var agent = traversal.agents[index];
				var node = self.nodes[agent.start];
				
				if( node == null ){
					throw new ChronographException("Agents must start at a valid node.");
					return;
				}
				
				var agentObj = new Agent(agent.id, agent.start, agent.label, agent.steps, node);
				self.agents[agent.id] = agentObj;
			}
		}
	};
	
	Graph.prototype.positionGraph = function(){
		var self = this;
		
		for(var index in self.nodes){
			self.nodes[index].setPosition();
		}
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
	    	dragmove(this, self);
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
	
	
	// Namespace Accessor
	chronograph.newGraph = function(container, data, format, traverse){
		
		if( window.d3 ){
			
			// Make sure that the user has specified a valid data format to provide to chronograph
			if( format === undefined || chronograph.validFormats[format] != null ){
				
				// Default to JSON
				if( format === undefined ){
					format = chronograph.JSON;
				}
				
				if( traverse === undefined ){
					traverse = false;
				}
				
				return new Graph(container, data, format, traverse);
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
