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
		
		self.timeline = new Timeline([0,500], graphRange, function(value){
			self.graph.setArbitraryTimeStep(value);
		});
		self.timeline.draw(self.topController);
		
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
	function Timeline(domain, range, slideCallback){
		var self = this;
		self.container = null;
		
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
		
		self.playButtonContainer = $("<div>").attr("id", "play_button_container");
		self.container.append(self.playButtonContainer);
		
		var playButton = $("<button>").attr("id", "play_button");
		playButton.button({
			icons:{
				primary: "ui-icon-play"
			},
			text: false
		});
		
		self.playButtonContainer.append(playButton);
		
		self.timelineContainer = $("<div>").attr("id", "timeline_container");
		self.container.append(self.timelineContainer);
		
		self.timelineContainer.slider({
			max: 500,
			slide: function(event, ui){
				var value = $(this).slider("value");
				self.slideCallback(self.timelineScale(value));
			}
		});
		
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
