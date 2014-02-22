/****************************
 * Namespace: gravity
 * Author: Kelly Smith
 * Date: 2/19/2014
 * Requirements: jQuery
 */

var gravity = {};

(function(){
	
	
	// Class Controller
	function Controller(graph, container){
		var self = this;
		self.graph = graph;
		self.container = $(container);
		
		
		//DOM
		
		self.topControllerHeight = 40;
		self.topControllerBorder = 5;
		
		self.leftContainer = null;
		self.rightContainer = null;
		self.topController = null;
		self.sideController = null;
		self.graphContainer = null;
		
		
		
	}
	
	Controller.prototype.draw = function(data, format, traverse){
		var self = this;
		
		self.createDOM();
		
		
		self.graph.draw("#" + self.graphContainer.attr('id'), data, format, traverse);
		
		var graphRange = [0, self.graph.maxSteps];
		
		self.timeline = new Timeline(self, [0,500], graphRange, function(value){
			self.graph.setArbitraryTimeStep(value);
		});
		self.timeline.draw(self.topController);
		
		self.settingsPanel = new Settings(self.rightContainer, self.graph);
		self.settingsPanel.updateInfo();
		
		setSizes(self);
	};
	
	var setSizes = function(self){
		$("html").height($(window).height());
		$("body").height($(window).height());
		self.leftContainer.height($(window).height());
		self.rightContainer.height($(window).height());
		
		self.graphContainer.height($(window).height()-self.topControllerHeight-self.topControllerBorder);
		
		var svgContainer = $("#" + self.graphContainer.attr("id") + " svg");
		svgContainer.height(self.graphContainer.height());
		svgContainer.width(self.graphContainer.width());
		
	};
	
	Controller.prototype.createDOM = function(){
		var self = this;
		
		self.leftContainer = $("<div>");
		self.leftContainer.attr("id", "left_container");
		
		self.rightContainer = $("<div>");
		self.rightContainer.attr("id", "right_container");
		
		self.topController = $("<div>").attr("id", "top_controller").css("border-bottom", "1px solid #CCCCCC").height(self.topControllerHeight);
		self.sideController = $("<div>").attr("id", "side_controller");
		
		self.graphContainer = $("<div>").attr("id", "graph_container");
		
		self.leftContainer.append(self.topController);
		self.leftContainer.append(self.graphContainer);
		
		self.rightContainer.append(self.sideController);
		
		self.container.append(self.leftContainer);
		self.container.append(self.rightContainer);
		
		setSizes(self);
		$(window).resize(function(){
			setSizes(self);
		});
		
	};
	
	
	// Class Timeline
	function Timeline(controller, domain, range, slideCallback){
		var self = this;
		self.container = null;
		self.controller = controller;
		self.sliderRange = domain;
		self.graphRange = range;
		self.slideCallback = slideCallback;
		
		self.timelineScale = d3.scale.linear()
									 .domain(self.sliderRange)
									 .range(self.graphRange);
	}
	
	Timeline.prototype.draw = function(container){
		var self = this;
		
		self.container = container;
		self.createDOM();
	};
	
	Timeline.prototype.createDOM = function(){
		var self = this;
		
		self.timelineContainer = $("<div>").attr("id", "timeline_container");
		self.container.append(self.timelineContainer);
		
		self.timelineContainer.slider({
			max: 500,
			slide: function(event, ui){
				var value = $(this).slider("value");
				self.slideCallback(self.timelineScale(value));
				self.controller.settingsPanel.updateInfo();
			}
		});
		
	};
	
	// Class Information
	function Settings(container, graph){
		var self = this;
		
		if( container == null || container === undefined ){
			console.error("Must pass a container to Information constructor.");
			return null;
		}
		self.container = container;
		self.graph = graph;
		
		// DOM
		self.information = null;
		self.settings = null;
		
		// Information Handlers
		self.timestep = null;
		
		self.createDOM();
	}
	
	// Updates all of the information in the GUI
	Settings.prototype.updateInfo = function(){
		var self = this;
		
		self.timestep.text("Current Timestep: " + Math.ceil(self.graph.currentStep*100)/100);
	};
	
	Settings.prototype.createDOM = function(){
		var self = this;
		
		self.information = $("<div>").attr("id", "information_panel");
		
		var header = $("<h1>").attr("id", "info_header").text("Information");
		self.information.append(header);
		
		self.timestep = $("<p>").attr("id", "traverse_timestep");
		self.information.append(self.timestep);
		
		
		self.container.append(self.information);
	};
	
	gravity.load = function(){
		
		if( window.jQuery && window.d3 ){
			/*$.getJSON('data/graph1.json', function(json){
				var graph = chronograph.newGraph();
				var controller = new Controller(graph, "#container");
				controller.draw(json, chronograph.data.JSON, true);
			})
			.fail(function(){
				console.error("Unable to load graph data.");
			});*/
			
			
			d3.xml('data/graph2.xml', 'application/xml', function(error, xml){
			if( error ){
				console.error(error);
			}
			else{
				var graph = chronograph.newGraph();
				var controller = new Controller(graph, "#container");
				controller.draw(xml, chronograph.data.XML, true);
			}
			});
		} else{
			
		}
	};
	
})();
