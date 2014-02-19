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
	

	// Class Graph
	function Graph(cont, data, format){
		var self = this;
		
		// Data Members
		self.svgNodes = {};
		self.svgEdges = {};
		
		
		if(format == chronograph.data.JSON){
			self.parsedData = data;
		}
		else{
			// TODO: Parse XML into JSON
			self.parsedData = null;
		}
		
		// Initialize DOM structure
		self.container = d3.select(cont);
		self.initializeContainerDOM();
		self.drawSpaciallyOrientedGraph();
	}
	
	Graph.prototype.initializeContainerDOM = function(){
		var self = this;
		
		self.svgContainer = self.container.append("svg");
		
		var unique_id = self.container.attr("id").replace("#", "");
		self.svgContainer.attr("id", "svg_" + unique_id);
	};
	
	Graph.prototype.drawSpaciallyOrientedGraph = function(){
		var self = this;
		
		if( self.parsedData != null ){
			for(var index in self.parsedData.nodes){
				
				var node = self.parsedData.nodes[index];
				
				var circle = self.svgContainer.append("circle");
				circle.attr("cx", node.x)
					.attr("cy", node.y)
					.attr("r", chronograph.nodeSize)
					.style("fill", node.color)
					.attr("stroke-width", 1)
					.attr("stroke", "#777777");
				
				self.svgNodes[node.id] = circle;
				
				for( var edge_index in node.edges ){
					var edge = node.edges[edge_index];
					
					var toNode = self.parsedData.nodes[edge];
					
					var line = self.svgContainer.append("line");
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
