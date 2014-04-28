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
	chronograph.data.XML = "XML";
	chronograph.data.JSON = "JSON";
	chronograph.data.RAW_TRAVERSAL = "RAW_TRAVERSAL";
	chronograph.validFormats = ["xml", "json"];
	
	// Constants
	chronograph.nodeSize = 15;
	chronograph.agentSize = 5;
	chronograph.infoOffsetX = 20;
	chronograph.infoOffsetY = 30;
	
	function ChronographException(message){
		this.message = message;
		this.name = "ChronographException";
	}
	
	chronograph.ChronographException = ChronographException;
	
	
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
		
		var agents = d3.select(self.xml).selectAll("agent");
		if( agents[0].length > 0 ){
			data.traversal = {};
			data.traversal.agents = {};
			
			agents.each(function(){
				var agent = d3.select(this);
				
				var attr = {};
				attr.id = agent.attr('id');
				attr.label = agent.attr('label');
				attr.start = agent.attr('start');
				
				var steps = agent.selectAll("step");
				var stepsArr = [];
				steps.each(function(){
					var step = d3.select(this);
					var stepObj = {};
					stepObj.from = step.attr('from');
					stepObj.to = step.attr('to');
					stepObj.timespan = this.textContent;
					stepsArr.push(stepObj);
				});
				attr.steps = stepsArr;
				
				data.traversal.agents[attr.id] = attr;
			});
		}
		
		return data;
	};
	
	// Class Agent
	function Agent(id, start, label, steps, currentNode){
		this.id = id;
		this.start = start;
		this.label = label;
		this.steps = steps;


		// Tracking Values - Do Not Export
		this.currentNode = currentNode;

		this.svgCircle = null;
		
		this.selected = false;
		this.unselectedOpacity = ".25";
		// End Tracking Values
	}

	Agent.prototype.calculateTraversalMap = function(timestep){
		var self = this;

		var traversalMap = d3.map();

		if( timestep > self.steps.length ){
			timestep = self.steps.length;
		}

		var step;
		for(var i=0;i<Math.floor(timestep);i++){
			if( traversalMap.has(self.steps[i].to) ){
				traversalMap.set(self.steps[i].to, traversalMap.get(self.steps[i].to) + 1);
			}
			else{
				traversalMap.set(self.steps[i].to, 1);
			}
			
		}

		return traversalMap;
	};
	
	Agent.prototype.exportObj = function(){
		var self = this;
		
		var obj = {};
		obj.id = self.id;
		obj.start = self.start;
		obj.label = self.label;
		obj.steps = self.steps;

		
		return obj;
	};
	
	Agent.prototype.select = function(agents){
		var self = this;
		
		if( self.selected ){
			// Unselect it
			self.svgCircle.attr("stroke", "#777777");
			self.svgCircle.attr("stroke-width", "1");
			self.selected = false;
			
			var numSelected = 0;
			for(var index in agents){
				if( agents[index].selected == true )
					numSelected++;
			}
			
			
			if( numSelected > 0 ){
				self.svgCircle.attr("opacity", self.unselectedOpacity);
			}
			else{
				for(var index in agents){
					agents[index].svgCircle.attr("opacity", "1");
				}
			}
			
		}
		else{
			// Select it
			self.selected = true;
			
			self.svgCircle.attr("stroke", "green");
			self.svgCircle.attr("stroke-width", "2");
			self.svgCircle.attr("opacity", "1");
			
			for(var index in agents){
				var agent = agents[index];
				if( !agent.selected ){	
					agent.svgCircle.attr("opacity", self.unselectedOpacity);
				}
			}
		}
	};
	
	Agent.prototype.setPosition = function(x, y){
		
		if( this.svgCircle == null || this.svgCircle === undefined ){
			throw new ChronographException("SVG DOM element never initialized for " + this.toString());
		}
		
		this.svgCircle.attr("cx", x).attr("cy", y);

	};
	
	// Step should be a floating point value in the range (0, self.steps.length)
	Agent.prototype.setToTimeStep = function(step, nodes){
		var self = this;
		
		var actualStep = Math.min(step, self.steps.length);
		
		var fromIndex = Math.floor(actualStep);
		
		if( fromIndex != self.steps.length ){
			
			var fromNode = nodes[self.steps[fromIndex].from];
			var toNode = nodes[self.steps[fromIndex].to];
			var fraction = actualStep - Math.floor(actualStep);
			var xDiff = (toNode.x - fromNode.x) * fraction;
			var yDiff = (toNode.y - fromNode.y) * fraction;
			
			self.setPosition(parseInt(fromNode.x) + xDiff, parseInt(fromNode.y) + yDiff);
		}
		else{
			var fromNode = nodes[self.steps[fromIndex-1].to];
			self.setPosition(parseInt(fromNode.x), parseInt(fromNode.y));
		}
		
		// Figure out where to draw the agent based on the fractional part of the step
		
	};
	
	Agent.prototype.moveToNode = function(node, animate){
		
		this.currentNode = node;
		
		if( animate === true ){
			if( this.svgCircle == null || this.svgCircle === undefined ){
				throw new ChronographException("SVG DOM element never initialized for " + this.toString());
			}
			
			this.svgCircle.transition().attr("cx", node.x).attr("cy", node.y).duration(1000);
		}
		else{
			this.setPosition(node.x, node.y);
		}
	};
	
	Agent.prototype.setSvg = function(circle){
		this.svgCircle = circle;
	};
	
	Agent.prototype.toString = function(){
		return "Agent(" + this.id + ")";
	};
	
	Agent.prototype.equals = function(agent){
		if( self.id == agent.id )
			return true;
		else
			return false;
	};

	// Class Node
	function Node(id, x, y, color, label){
		this.id = id;
		this.x = parseInt(x);
		this.y = parseInt(y);
		this.color = color;
		this.label = label;

		// Tracking Values - Do not export
		this.selected = false;

		this.svgGroup = null;
		this.svgLabel = null;
		this.svgCircle = null;

		// End Tracking Values
		
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
	
	Node.prototype.remove = function(){
		this.svgGroup.remove();
		this.svgLabel.remove();
		this.svgCircle.remove();
		
		// Remove all edges and refernces to this node.
		for(var index in this.edges){
			var edge = this.edges[index];
			edge.remove(this);
			delete this.edges[index];
		}
		this.edges = null;
	};
	
	Node.prototype.setPosition = function(x, y, agents, graph){
		if( x !== undefined ) this.x = x;
		if( y !== undefined ) this.y = y;
		
		this.svgCircle.attr("cx", this.x).attr("cy", this.y);
		
		for(var index in this.edges){
			this.edges[index].setPosition();
		}
		
		if( agents !== undefined ){
			for(var index in agents){
				agents[index].setToTimeStep(graph.currentStep, graph.nodes);
			}
		}
	};
	
	Node.prototype.select = function(){
		this.selected = true;
		this.svgCircle.classed("selected", true);
	};
	
	Node.prototype.unselect = function(){
		this.selected = false;
		this.svgCircle.classed("selected", false);
	}
	
	Node.prototype.exportObj = function(){
		var self = this;
		var obj = {};
		obj.id = self.id;
		obj.x = self.x;
		obj.y = self.y;
		obj.color = self.color;
		obj.label = self.label;
		
		obj.edges = d3.keys(self.edges);
		
		return obj;
	}
	
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
	
	Edge.prototype.remove = function(node){
		if( this.node1.equals(node) ){
			delete this.node2.edges[node.id];
		}
		else{
			delete this.node1.edges[node.id];
		}
		
		this.svgLine.remove();
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
	function Graph(id, name, data, format){
		var self = this;
		
		// Data Members
		self.nodes = {};
		self.edges = [];
		self.agents = {};
		
		self.lineGroup = null;
		self.nodeGroup = null;
		self.agentGroup = null;
		
		self.svgContainer = null;
		
		// These are usually tied to stored graphs.
		self.id = id;
		self.name = name;

		self.data = data;
		
		self.format = format;
		if( self.format != chronograph.data.JSON && self.format != chronograph.data.XML )
			self.format = chronograph.data.JSON;
		
		self.dataInitialized = false;
		
		self.traverse = null;
		self.mode = "view";
		self.editMode = "select";
		
		
		self.nodeId = 1;
		self.nodePrefix = "g";
		self.agentPrefix = "a";
		self.numColors = 20;
		self.colors = d3.scale.category20();
		
		self.currentTranslate = [0,0];
		self.currentScale = 1;
		
		self.currentStep = 0;
		self.calculatedStep = 0;
		self.maxSteps = 0;
		self.traversalMap = {};
		self.maxTraverse = 0;
		
		self.selectedNode = null;
		
	}

	Graph.prototype.setMode = function(mode){
		var self = this;
		
		if( !self.drawn ){
			console.error("Cannot set the mode on a graph that has not been drawn.");
			return;
		}
		
		self.setEditMode("select");
		
		if(mode == "clear" ){

		}
		else if(mode == "view"){
			console.log("Setting graph to view mode.");
			self.mode = mode;
			self.svgContainer.style("cursor", "move");
			d3.selectAll("circle.graph-node").style("cursor", "pointer");

			self.graphToolbar.attr("visibility", "hidden");
		}
		else if( mode == "edit" ){
			console.log("Setting graph to edit mode.");
			self.mode = mode;
			self.setEditMode(self.editMode);
			self.graphToolbar.attr("visibility", "visible");
			self.selectNode(null);
		}
		else{
			console.error("Invalid mode. Aborting.");
			return false;
		}
	};
	
	// Manages internals to reflect the interface change.  Does not update the interface - the interface should be calling this.
	Graph.prototype.setEditMode = function(mode){
		var self = this;
		
		self.editMode = mode;
		switch(mode){
		case "select":
			d3.selectAll("circle.graph-node").style("cursor", "pointer");
			self.svgContainer.style("cursor", "move");
			break;
		case "add_node":
			self.svgContainer.style("cursor", "crosshair");
			d3.selectAll("circle.graph-node").style("cursor", "no-drop");
			self.selectNode(null);
			break;
		case "add_edge":
			d3.selectAll("circle.graph-node").style("cursor", "pointer");
			self.svgContainer.style("cursor", "move");
			self.selectNode(null);
			break;
		case "delete_node":
			d3.selectAll("circle.graph-node").style("cursor", "pointer");
			self.svgContainer.style("cursor", "move");
			self.selectNode(null);
			break;
		case "delete_edge":
			
			break;
		}
	};
	
	Graph.prototype.parseGraphData = function(){
		var self = this;
		// Whether or not traverse data is included with this graph
		if(self.format == chronograph.data.JSON){
			self.parsedData = self.data;
		}
		else{
			// TODO: Parse XML into JSON
			var xmlDoc = new XmlDocument(self.data);
			self.parsedData = xmlDoc.parse();
			self.format = chronograph.data.JSON;
		}

		if( self.parsedData.traversal != undefined && self.parsedData.traversal ){
			self.traverse = true;
		}
		else{
			self.traverse = false;
		}
	}
	
	Graph.prototype.draw = function(cont){
		var self = this;
		
		self.parseGraphData();
		
		// Initialize DOM structure
		self.container = d3.select(cont);

		self.container.html('');
		
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
			if( self.traverse ){
				self.initializeTraverseData();
				self.initializeAgentDOM();
			}
		} catch(e){
			// Graph data was not initialized properly
			console.error(e.message);
			return;
		}
		
		self.container.style("display", "block");
		self.drawn = true;
	};
	
	Graph.prototype.setMaxSteps = function(){
		var self = this;
		
		var max = 0;
		for(var index in self.agents){
			var agent = self.agents[index];
			if( agent.steps.length > max ){
				max = agent.steps.length;
			}
		}
		
		self.maxSteps = max;
	};
	
	Graph.prototype.constructTraversalMap = function(){
		var self = this;

		self.traversalMap = {};
		for(var index in self.nodes){
			self.traversalMap[self.nodes[index].id] = 0;
		}
	};

	Graph.prototype.calculateTraversalMap = function(timestep){
		var self = this;

		if( self.traversalMap == null || d3.keys(self.traversalMap) == 0 ){
			self.constructTraversalMap();
		}


		self.maxTraverse = 0;

		//N^2 is scary for real time...  Might blow up for big graphs...
		for(var index in self.agents){
			var agentMap = self.agents[index].calculateTraversalMap(timestep);
			agentMap.forEach(function(key, value){
				self.traversalMap[key] += value;
			});
		}

		self.calculatedStep = Math.floor(timestep);
	};

	Graph.prototype.setArbitraryTimeStep = function(step){
		var self = this;
		
		self.currentStep = step;
		
		for(var index in self.agents){
			self.agents[index].setToTimeStep(step, self.nodes);
		}
		
		if( Math.floor(self.currentStep) != self.calculatedStep ){
			self.calculateTraversalMap(self.currentStep);
		}

		self.graphTimestep.text("Timestep: " + Math.round(step*100)/100);
	};
	
	Graph.prototype.initializeAgentDOM = function(){
		var self = this;
		
		self.agentGroup = self.graphContainer.append("g").attr("class", "agent-group");
		
		for(var index in self.agents){
			var agent = self.agents[index];
			
			var circle = self.agentGroup.selectAll("circle#agent_" + agent.id)
										.data([agent])
										.enter()
										.append("circle")
										.attr("id", "agent_" + agent.id)
										.style("cursor", "pointer")
									    .attr("r", chronograph.agentSize)
									    .attr("fill", "blue")
									    .attr("stroke-width", 1)
									    .attr("stroke", "#777777")
									    .on("click", function(d){
									    	d.select(self.agents);
											d3.event.stopPropagation();
									    });
			
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
				}
				
				var agentObj = new Agent(agent.id, agent.start, agent.label, agent.steps, node);
				self.agents[agent.id] = agentObj;
			}
			
			self.setMaxSteps();
		}
	};
	
	Graph.prototype.positionGraph = function(){
		var self = this;
		
		for(var index in self.nodes){
			self.nodes[index].setPosition();
		}
	};
	
	Graph.prototype.importTraversalData = function(data, label, format){
		var self = this;
		
		if( format != chronograph.data.RAW_TRAVERSAL ){
			console.error("Cannot import formats other than Gravity raw traversal data at this time.");
			throw new ChronographException("Cannot import formats other than Gravity raw traversal data at this time.");
		}
		
		if( !self.dataInitialized ){
			self.parseGraphData();
			self.initializeGraphData();
			if( self.traverse ){
				self.initializeTraverseData();
			}
		}
		// For now we are ignoring real time and only displaying order.
		try{
			var steps = data.split(";");
			steps = steps.splice(0, steps.length-1); // Cut off the end for trailing ;
			
			var startObj, nodeObj, lastNodeObj;
			var first = true;
			var thisTimestamp = 0, lastTimestamp = 0;
			var stepArr = [];
			for(var index in steps){
				var step = steps[index].split(",");
				var node = step[0];
				thisTimestamp = parseFloat(step[1]);
				
				lastObj = nodeObj;
				nodeObj = self.nodes[self.nodePrefix + node];
				
				
				// Do Something
				if( !nodeObj || nodeObj == undefined ){
					throw new ChronographException("Invalid data format. The imported graph structure does not match the structure of the actual graph.");
				}
				
				// Keep track of the first one.
				if( first ){
					startObj = nodeObj;
					lastTimestamp = thisTimestamp;
					first = false;
					continue;
				}
				
				// Only gets here starting 2nd iteration.
				if( !startObj || startObj == undefined ){
					// Only one stop... No traversal
					throw new ChronographException("Invalid data. Agents must make more than one stop.");
				}
				
				var stepObj = {from: lastObj.id, to: nodeObj.id, timespan: thisTimestamp - lastTimestamp };
				stepArr.push(stepObj);
				
				lastTimestamp = thisTimestamp;
			}
			
			var id;
			if( !self.agents || d3.keys(self.agents).length == 0 ){
				// No Agents Yet
				id = self.agentPrefix + "1";
			}
			else{
				id = d3.keys(self.agents).length+1;
				// If it exists, keep going until it doesn't.  Will ensure no key collisions
				while(d3.keys(self.agents).indexOf(self.agentPrefix + id) != -1){
					id++;
				}
				id = self.agentPrefix + id;
			}
			
			var agentObj = new Agent(id, startObj.id, label, stepArr);
			self.agents[agentObj.id] = agentObj;
			self.setMaxSteps();
		}
		catch(e){
			if( e.name == "ChronographException" ){
				throw e;
			}
			
			throw new ChronographException("Invalid data format.  Please check to make sure that you are importing valid data.");
		}
		
		return true;
	};
	
	Graph.prototype.exportData = function(){
		var self = this;
		
		var data = {};
		data.nodes = {};
		
		for(var index in self.nodes){
			var node = self.nodes[index].exportObj();
			data.nodes[node.id] = node;
		}
		
		if( d3.keys(self.agents).length > 0 ){
			data.traversal = {};
			data.traversal.agents = {};
			
			for( var index in self.agents ){
				var agent = self.agents[index].exportObj();
				data.traversal.agents[agent.id] = agent;
			}
		}
		
		return data;
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
			
			self.nodeId = d3.keys(self.nodes).length;
			
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
		
		self.dataInitialized = true;
	};
	
	Graph.prototype.addNode = function(node, behavior, click){
		var self = this;
		
		if( node ){
			self.parsedData.nodes[node.id] = node.exportObj();
			self.nodes[node.id] = node;
			
			var group = self.nodeGroup.append("g");
			group.attr("id", "node_" + node.id);
			
			var circle = group.selectAll("circle")
							  .data([node])
							  .enter()
							  .append("circle")
							  .attr("id", "node_" + node.id + "_circle")
							  .attr("class", "graph-node")
							  .attr("r", chronograph.nodeSize)
							  .attr("cx", node.x)
							  .attr("cy", node.y)
							  .attr("fill", node.color)
							  .attr("stroke-width", 1)
							  .attr("stroke", "#777777")
							  .attr("cursor", "move")
							  .call(behavior)
							  .on("click", click);
			
			var label = group.append("text");
			label.attr("id", "node_" + node.id + "_label");
			
			node.setSvg(group, label, circle);
			
			self.selectNode(node);
		}
		else {
			console.error("Must add a valid node.");
			throw new ChronographException("Invalid node - cannot add to graph: " + node);
		}
	};
	
	Graph.prototype.deleteNode = function(node){
		var self = this;
		
		if( node ){
			node.remove();
			delete self.nodes[node.id];
		}
	};
	
	Graph.prototype.selectNode = function(node){
		var self = this;
		
		if(node == null){
			for(var index in self.nodes){
				self.nodes[index].unselect();
			}
			return;
		}
		
		if( node.selected ){
			node.unselect();
		}
		else{
			for(var index in self.nodes){
				self.nodes[index].unselect();
			}
			node.select();
		}
		
	};
	
	Graph.prototype.addEdge = function(fromNode, toNode){
		var self = this;
		
		var edge = new Edge(fromNode, toNode);
		
		var otherEdge;
		var edgeExists = false;
		for(var index in self.edges){
			otherEdge = self.edges[index];
			if( edge.equals(otherEdge) ){
				edgeExists = true;
				break;
			}
		}
		
		if( !edgeExists ){
			toNode.addEdge(edge, fromNode);
			fromNode.addEdge(edge, toNode);
			
			var line = self.lineGroup.append("line");
			line.attr("id", "edge_" + edge.node1.id + "_" + edge.node2.id)
				.attr("stroke", "#777777");
			
			edge.setSvg(line);
			
			self.edges.push(edge);
			
			// Call on one of the nodes to properly position the edge.
			toNode.setPosition();
		}
		else{
			console.log("Only one edge can exist between two nodes.");
		}
	};
	
	Graph.prototype.initializeContainerDOM = function(){
		var self = this;

		var zoom = d3.behavior.zoom()
				    .scaleExtent([1, 10])
				    .on("zoom", zoomed);
		
		
		
		function dragstarted(d) {
		  d3.event.sourceEvent.stopPropagation();
		  //d3.select(this).classed("selected", true);
		  
		}

		function dragged(d) {
		  if( self.mode == "edit" && self.editMode == "select" ){
			  d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
			  self.nodes[d.id].setPosition(d.x,d.y, self.agents, self);
			}
		  d3.event.sourceEvent.stopPropagation();
		}

		function dragended(d) {
		  //d3.select(this).classed("selected", false);
		  d3.event.sourceEvent.stopPropagation();
		}
		
		var drag = d3.behavior.drag()
				    .origin(function(d) { 
				    	return d; 
				    })
				    .on("dragstart", dragstarted)
				    .on("drag", dragged)
				    .on("dragend", dragended);
		
		
		var selectingNextNode = false;
		var fromNode = null;
		
		var clickNode = function(d){
			if( self.editMode == "delete_node"){
				// Delete
				console.log("delete the bastard.");
				var confirmDialog = $("<div>").attr("id", "confirm_delete_dialog").attr("title", "Delete this node?").attr("class", "dialog");
				confirmDialog.dialog({
			      resizable: false,
			      height: 250,
			      modal: true,
			      open: function(){
			    	  $(this).html('<p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0; font-size: 12px;"></span>This node will be permanently deleted and cannot be recovered. Are you sure?</p>');
			      },
			      buttons: {
			        Delete: function() {
			        	// Actually delete it....
			        	self.deleteNode(d);
			        	
			          $( this ).dialog( "close" );
			        },
			        Cancel: function() {
			        	self.selectNode(null);
			          $( this ).dialog( "close" );
			        }
			      }
			    });
			}
			else if( self.editMode == "add_edge" ){
				if( selectingNextNode ){
					console.log("to " + d.toString());
					
					var toNode = d;
					if( !fromNode.equals(toNode) ){
						// Add Edge
						self.addEdge(fromNode, toNode);
					}
					
					selectingNextNode = false;
				}
				else{
					console.log("adding a new edge from " + d.toString());
					fromNode = d;
					selectingNextNode = true;
				}
			}
			else{
				self.selectNode(d);
			}
			d3.event.stopPropagation(); // Prevent clicking a node from activating svg.click
		};
		
		var click = function(container){
			//console.log("clicked: " + d3.event.x + ", " + d3.event.y);
			if( self.mode == "edit" && self.editMode == "add_node" ){
				var id = self.nodePrefix + self.nodeId;
				while( d3.keys(self.nodes).indexOf(id) >= 0 ){
					id = self.nodePrefix + (++self.nodeId);
				}
				var color = self.colors((self.nodeId-1)%self.numColors);
				
				var x = (d3.mouse(container)[0] - self.currentTranslate[0]) / self.currentScale;
				var y = (d3.mouse(container)[1] - self.currentTranslate[1]) / self.currentScale;
				var node = new Node(id, x, y, color, "Node " + self.nodeId);
				
				self.nodeId++;
				
				self.addNode(node, drag, clickNode);
			}
		}
		
		self.svgContainer = self.container.append("svg");
		
		var unique_id = self.container.attr("id").replace("#", "");
		self.svgContainer.attr("id", "svg_" + unique_id)
						 .call(zoom)
						 .on("click", function(){
							 if( self.mode == "edit" ){
								 click(this);
							 }
						 })
						 .on("dblclick.zoom", null);
		
		self.graphContainer = self.svgContainer.append("g").attr("id", "graph_container");
		
		// Lines first so they are under the nodes visually
		self.lineGroup = self.graphContainer.append("g").attr("class", "line-group");
		self.nodeGroup = self.graphContainer.append("g").attr("class", "node-group");

		
		function zoomed() {
			if( self.mode == "view" || self.editMode == "select" || self.editMode == "delete_node" ){
				self.currentTranslate = d3.event.translate;
				self.currentScale = d3.event.scale;
				self.graphContainer.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
			}
		}
		
		
		for(var index in self.nodes){
			var node = self.nodes[index];
			
			var group = self.nodeGroup.append("g");
			group.attr("id", "node_" + node.id);
			
			//var circle = group.append("circle");
			
			var circle = group.selectAll("circle")
							  .data([node])
							  .enter()
							  .append("circle")
							  .attr("id", "node_" + node.id + "_circle")
							  .attr("class", "graph-node")
							  .attr("r", chronograph.nodeSize)
							  .attr("fill", node.color)
							  .attr("stroke-width", 1)
							  .attr("stroke", "#777777")
							  .attr("cursor", "move")
							  .call(drag)
							  .on("click", clickNode);
			
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
		
		
		self.initializeInfoDOM();

		self.initializeToolbarDOM();
	};
	
	
	Graph.prototype.initializeInfoDOM = function(){
		var self = this;
		
		var graphInfo = self.svgContainer.append("g").attr("class", "info-group");
		self.graphName = graphInfo.append("text").attr("x", chronograph.infoOffsetX).attr("y", chronograph.infoOffsetY).text(self.name).attr("id", "graph_name");
		
		if( self.traverse ){
			self.graphTimestep = graphInfo.append("text").attr("x", chronograph.infoOffsetX).attr("y", chronograph.infoOffsetY+20).text("Timestep: " + self.currentStep).attr("id", "graph_timestep");
		}
		
		var nodeInfo = graphInfo.append("g").attr("class", "node-info-group");
		var widthOffset = parseInt(self.svgContainer.attr("width"));
		//self.svgNodeName = nodeInfo.append("text").attr("x", 400).attr("y", 200).attr("text-anchor", "end").text("testing");
		
		
	};

	Graph.prototype.initializeToolbarDOM = function(){
		var self = this;

		var iconSize = 31;
		var iconSpacing = 2;
		
		self.graphToolbar = self.svgContainer.append("g").attr("class", "toolbar-group");
		
		
		var icons = ['select', 'add_node', 'delete_node', 'add_edge', 'delete_edge'];
		
		var background = self.graphToolbar.append("rect").attr("class", "toolbar-background")
														 .attr("x", -7)
														 .attr("y", 0)
														 .attr("rx", 3)
														 .attr("ry", 3)
														 .attr("width", 45)
														 .attr("height", icons.length*(iconSize+iconSpacing) + 5)
														 .attr("stroke", "#a6a6a6")
														 .attr("stroke-width", 1)
														 .attr("fill", "#F0F0F0");
		
		// Default to the first one.
		var selected = 0;
		var iconBacks = [];
		var iconObjs = [];
		
		for( index in icons ){
			var iconId = icons[index];
			var group = self.graphToolbar.append("g").attr("transform", "translate(0, " + index * (iconSize + iconSpacing) + ")");;
			
			var iconBack = group.append("image")
								  .attr("x", 3)
								  .attr("y", 3)
								  .attr("height", iconSize)
								  .attr("width", iconSize);
			iconBacks[index] = iconBack;
			
			if( index == selected ){
				iconBack.attr("xlink:href", "public/graphs/assets/img/icon_back_selected.png");
			}
			
			var icon = group.append("image")
							.attr("x", 3)
						   .attr("y", 3)
						   .attr("height", iconSize)
						   .attr("width", iconSize)
						   .attr("class", "toolbar-icon")
						   .attr("xlink:href", "public/graphs/assets/img/icon_" + iconId + ".png");
			iconObjs[index] = icon;
			
			icon.on("mouseover", (function(){
				var i = index;
				var back = iconBack;
				return function(){
					if( i != selected )
						back.attr("xlink:href", "public/graphs/assets/img/icon_back_hover.png");
				}
			})());
			
			icon.on("mouseout", (function(){
				var i = index;
				var back = iconBack;
				return function(){
					if( i != selected )
						back.attr("xlink:href", "");
				}
			})());
			
			icon.on("click", (function(){
				var id = iconId;
				var i = index;
				return function(){
					d3.event.stopPropagation();
					iconBacks[selected].attr("xlink:href", "");
					iconBacks[i].attr("xlink:href", "public/graphs/assets/img/icon_back_selected.png");
					selected = i;
					console.log("Setting graph edit mode to " + id);
					self.setEditMode(id)
				}
			})());
			
		}
		
		
		var heightOffset = $(window).height()/2 - parseInt(background.attr("height"));
		self.graphToolbar.attr("transform", "translate(0," + heightOffset + ")");
		


	};
	
	
	// Namespace Accessor
	chronograph.newGraph = function(id, name, data, format){
		
		if( window.d3 ){
			
			// Make sure that the user has specified a valid data format to provide to chronograph
			if( format == chronograph.data.XML ){
				data = chronograph.textToXML(data);
			}
			else{
				data = JSON.parse(data);
			}
			
			return new Graph(id, name, data, format);
		}
		else{
			console.error("Chronograph requires that D3.js be loaded to function.  Please load D3.js into your application before you load Chronograph.");
			return null;
		}
	};


	// Class Timeline
	function Timeline(sliderContainer, playBtnContainer, domain, range, slideCallback){
		var self = this;
		self.sliderRange = domain;
		self.graphRange = range;
		self.slideCallback = slideCallback;
		
		self.sliderMax = 500;
		self.playResolution = 20; // ms
		self.playNumSteps = 500;
		
		self.playIntHandler = null;
		
		self.timelineScale = d3.scale.linear()
									 .domain(self.sliderRange)
									 .range(self.graphRange);

		self.playSpeed = 1;
		self.currentValue = 0;


		self.timelineContainer = $(sliderContainer);
		self.playButtonContainer = $(playBtnContainer);
	}

	Timeline.prototype.setPlaySpeed = function(speed){
		this.playSpeed = speed;
	};
	
	Timeline.prototype.draw = function(){
		var self = this;

		self.createDOM();
	};
	
	Timeline.prototype.createDOM = function(){
		var self = this;
		
		self.playButtonContainer.html('');

		var playButton = $("<button>").attr("id", "play_button");
		playButton.button({
			icons:{
				primary: "ui-icon-play"
			},
			text: false
		});
		
		var playStep = function(){
			var stepSize = self.sliderRange[1]/self.playNumSteps * self.playSpeed;
			var newValue = self.currentValue + stepSize;
			
			if( newValue > parseInt(self.timelineContainer.slider("option", "max"))){
				clearInterval(self.playIntHandler);
				self.playIntHandler = null;
				$(playButton).button("option", {
					icons:{ primary: "ui-icon-play" }
				});
			}
			else{
				self.timelineContainer.slider("value", newValue);
				self.currentValue = newValue;
				self.slideCallback(self.timelineScale(newValue));
			}
		};
		
		playButton.click(function(){
			if( self.playIntHandler == null ){
				// Play!
				if( self.currentValue >= parseInt(self.timelineContainer.slider("option", "max")) - self.playSpeed ){
					self.currentValue = 0;
				}
				self.playIntHandler = setInterval(playStep, self.playResolution);
				$(this).button("option", {
					icons:{ primary: "ui-icon-pause" }
				});
			}
			else{
				clearInterval(self.playIntHandler);
				self.playIntHandler = null;
				$(this).button("option", {
					icons:{ primary: "ui-icon-play" }
				});
			}
		});
		
		self.playButtonContainer.append(playButton);
		
		self.timelineContainer.slider({
			max: self.sliderMax,
			slide: function(event, ui){
				var value = $(this).slider("value");
				self.currentValue = value;
				self.slideCallback(self.timelineScale(value));
			}
		});
		
	};

	// Timeline accessor.
	chronograph.newTimeline = function(sliderContainer, playBtnContainer, domain, range, slideCallback){
		return new Timeline(sliderContainer, playBtnContainer, domain, range, slideCallback);
	};
	
	// https://gist.github.com/stevenaw/1305672
	chronograph.textToXML = function ( text ) {
	      try {
	        var xml = null;
	        
	        if ( window.DOMParser ) {
	 
	          var parser = new DOMParser();
	          xml = parser.parseFromString( text, "text/xml" );
	          
	          var found = xml.getElementsByTagName( "parsererror" );
	 
	          if ( !found || !found.length || !found[ 0 ].childNodes.length ) {
	            return xml;
	          }
	 
	          return null;
	        } else {
	 
	          xml = new ActiveXObject( "Microsoft.XMLDOM" );
	 
	          xml.async = false;
	          xml.loadXML( text );
	 
	          return xml;
	        }
	      } catch ( e ) {
	        // suppress
	      }
	    };
	
	chronograph.parseXml = function(xmlStr){
		
		
		var xml = chronograph.textToXML(xmlStr);
		var doc = new XmlDocument(xml);
		try{
			var json = doc.parse();
			return json;
		}
		catch(e){
			console.log("Invalid XML format.");
			return null;
		}
	};
	
})();
