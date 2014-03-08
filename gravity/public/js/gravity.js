/****************************
 * Namespace: gravity
 * Author: Kelly Smith
 * Date: 2/19/2014
 * Requirements: jQuery
 */
var gravity = {};

(function(){
	
	Object.size = function(obj) {
	    var size = 0, key;
	    for (key in obj) {
	        if (obj.hasOwnProperty(key)) size++;
	    }
	    return size;
	};
	
	// Class Controller
	function Controller(container){
		var self = this;
		self.container = $(container);
		
		
		//DOM
		
		self.topControllerHeight = 40;
		self.topControllerBorder = 5;
		
		self.playButtonWidth = 35;
		
		self.leftContainer = null;
		self.rightContainer = null;
		self.topController = null;
		self.sideController = null;
		self.graphContainer = null;
		
		
		
	}

	Controller.prototype.setGraph = function(graph){
		var self = this;

		self.graph = graph;
	};
	
	Controller.prototype.draw = function(){
		var self = this;
		
		if( self.graph == null || self.graph == undefined ){
			console.error("Cannot draw a graph when none has been loaded or specified.");
			return;
		}
		
		self.graphContainer.html('');
		self.topController.html('');
		self.graph.draw("#" + self.graphContainer.attr('id'));
		
		if( self.graph.traverse ){
			self.topController.show();
			var graphRange = [0, self.graph.maxSteps];
			
			self.timeline = new Timeline(self, [0,500], graphRange, function(value){
				self.graph.setArbitraryTimeStep(value);
			});
			self.timeline.draw(self.topController);
		}
		else{
			self.topController.hide();
		}
		
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
		if( self.graph ){
			if( self.graph.traverse ){
				self.timeline.timelineContainer.width(self.topController.width() - self.playButtonWidth*2);
			}
		}
		
	};
	

	Controller.prototype.setMode = function(mode){
		var self = this;

		if(mode == "clear" ){

		}
		else if(mode == "view"){
			self.mode = mode;
			self.graph.setMode(mode);
		}
		else if( mode == "edit" ){
			self.mode = mode;
			self.graph.setMode(mode);
		}
		else{
			console.error("Invalid mode. Aborting.");
			return false;
		}
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
		self.graphContainer.append($("<p>").text("Please Create or Load a Graph"));
		
		self.leftContainer.append(self.topController);
		self.leftContainer.append(self.graphContainer);
		
		self.rightContainer.append(self.sideController);
		
		self.container.html('');

		self.container.append(self.leftContainer);
		self.container.append(self.rightContainer);

		self.settingsPanel = new Settings(self.rightContainer, self);


		$(window).resize(function(){
			setSizes(self);
		});

		setSizes(self);
		
	};
	
	
	// Class Timeline
	function Timeline(controller, domain, range, slideCallback){
		var self = this;
		self.container = null;
		self.controller = controller;
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
		
		var playStep = function(){
			var currentValue = parseInt(self.timelineContainer.slider("value"));
			var stepSize = self.sliderRange[1]/self.playNumSteps;
			var newValue = currentValue + stepSize;
			
			if( newValue > parseInt(self.timelineContainer.slider("option", "max"))){
				clearInterval(self.playIntHandler);
				self.playIntHandler = null;
				$(playButton).button("option", {
					icons:{ primary: "ui-icon-play" }
				});
			}
			else{
				self.timelineContainer.slider("value", newValue);
				self.slideCallback(self.timelineScale(newValue));
			}
		};
		
		playButton.click(function(){
			if( self.playIntHandler == null ){
				// Play!
				var currentValue = parseInt(self.timelineContainer.slider("value"));
				if( currentValue >= parseInt(self.timelineContainer.slider("option", "max")) - .05 ){
					self.timelineContainer.slider("value", self.sliderRange[0]);
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
		
		self.timelineContainer = $("<div>").attr("id", "timeline_container");
		self.container.append(self.timelineContainer);
		
		self.timelineContainer.slider({
			max: self.sliderMax,
			slide: function(event, ui){
				var value = $(this).slider("value");
				self.slideCallback(self.timelineScale(value));
			}
		});
		
	};
	
	// Class Information
	function Settings(container, controller){
		var self = this;
		
		if( container == null || container === undefined ){
			console.error("Must pass a container to Information constructor.");
			return null;
		}
		self.container = container;
		self.controller = controller;
		
		// DOM
		self.information = null;
		self.settings = null;
		
		// Information Handlers
		self.timestep = null;
		
		self.createDOM();
	}
	
	// Updates all of the information in the GUI
	// NOT very efficient, might need to be optimized for larger graphs.
	Settings.prototype.updateInfo = function(){
		var self = this;
		
		/*var info = [
		    {
		    	label: "Current Timestep",
		    	value: Math.ceil(self.graph.currentStep*100)/100,
		    	id: "current_timestamp_row"
		    },
		    {
		    	label: "Number of Nodes",
		    	value: Object.size(self.graph.nodes)
		    },
		    {
		    	label: "Number of Edges",
		    	value: self.graph.edges.length
		    }
		];
		
		var table = d3.select("#" + self.information_table.attr("id")).html("");
		var tbody = table.append("tbody");
		
		var rows = tbody.selectAll("tr")
					 .data(info)
					 .enter()
					 .append("tr")
					 .attr("id", function(row){
						if( row.id !== undefined ){
							return row.id;
						} 
						else{
							return null;
						}
					 });
		
		var cells = rows.selectAll("td")
						.data(function(row){
							return [row.label, row.value];
						})
						.enter()
						.append("td")
						.text(function(d){return d;});

						*/
		
		
	};

	 function checkLength( o, n, min, max ) {
		if ( o.val().length > max || o.val().length < min ) {
			o.addClass( "ui-state-error" );
			updateTips( "Length of " + n + " must be between " +
			min + " and " + max + "." );
			return false;
		} else {
			return true;
		}
	}

	Settings.prototype.setMode = function(mode){
		var self = this;

		if(mode == "clear" ){

		}
		else if(mode == "view"){
			self.controller.setMode(mode);
			self.newGraphButton.show();
			self.loadGraphButton.show();
			self.editGraphButton.show();
			self.editGraphButton.attr("class", "");
			self.saveGraphButton.hide();
			self.cancelEditButton.hide();
			self.editMenu.hide();
		}
		else if( mode == "edit" ){
			self.controller.setMode(mode);
			self.newGraphButton.hide();
			self.loadGraphButton.hide();
			self.editGraphButton.hide();
			self.saveGraphButton.show();
			self.cancelEditButton.show();
			self.editMenu.show();
		}
		else{
			console.error("Invalid mode. Aborting.");
			return false;
		}
	};
	
	Settings.prototype.initializeDialogs = function(){
		var self = this;
		
		self.createDialog = $("<div>").attr("id", "create_dialog").attr("title", "Create New Graph").attr("class", "dialog");

		// Maintain scope
		(function(){
			var dialogContainer = $("<div>");

			self.createDialog.append(dialogContainer);
			var infoField;
			var nameField;

			var createGraphFunction = function(){
				var bValid = true;
				nameField.removeClass( "ui-state-error" );

				bValid = bValid && checkLength( nameField, "username", 3, 16 );

				if ( bValid ) {
					console.log("Create Graph.");
					var graph = {};
					graph.name = nameField.val();
					graph.data = {};
					graph.data.nodes = {};
					graph.data = JSON.stringify(graph.data);

					var jqxhr = $.post("api/graphs", graph,
								function(data, textStatus, jqXHR){
									console.log("Post response:"); console.dir(data);
									var graphObj = chronograph.newGraph(data._id, data.name, JSON.parse(data.data), chronograph.data.JSON);

									self.controller.setGraph(graphObj);
									self.controller.draw();
									self.setMode("edit");
									dialogContainer.html('');
									self.createDialog.dialog("close");
								});
					jqxhr.fail(function(){
						console.error("Unable to create new graph.  Unknown error.");
						infoField.text("An unknown error has ocurred.  Please try refreshing the page.");
					});
				}
			};

			self.createDialog.dialog({
				autoOpen: false,
				modal: true,
				open: function(){
					dialogContainer.load('dialog/newGraph.html', function(){
						console.log("Loading dialog for New Graph.");
						nameField = $("#nameField");
						infoField = $("add_graph_info");
					})
				},
				buttons:{
					"Create a Graph": createGraphFunction,
					 Cancel: function() {
						 dialogContainer.html('');
						$( this ).dialog( "close" );
					}
				},
				 close: function() {
					nameField.val( "" ).removeClass( "ui-state-error" );
				}
			});
		})();



		self.loadDialog = $("<div>").attr("id", "load_dialog").attr("title", "Load Existing Graph").attr("class", "dialog");

		// Maintain scope
		(function(){
			var dialogContainer = $("<div>");
			self.loadDialog.append(dialogContainer);
			var infoField;


			self.loadDialog.dialog({
				autoOpen: false,
				modal: true,
				width: 600,
				height: 800,
				open: function(){
					dialogContainer.load('dialog/loadGraph.html', function(){
						console.log("Loading dialog for Load Graph.");
						infoField = $("#dialog_graph_info");

						var listContainer = d3.select(this).select("#dialog_graph_list");

						var table = listContainer.append("table").attr("width", "100%");
						var head = table.append("thead");
						var headRow = head.append("tr");
						headRow.append("th").text("Name");
						headRow.append("th").text("Modified");

						var tBody = table.append("tbody");

						var jqxhr = $.get("api/graphs",
								function(data, textStatus, jqXHR){
									console.log("Post response:"); console.dir(data);
									var rows = tBody.selectAll('tr')
												.data(data)
												.enter()
												.append("tr")
												.on("click", function(data){
														var graphObj = chronograph.newGraph(data._id, data.name, JSON.parse(data.data), chronograph.data.JSON);

														self.controller.setGraph(graphObj);
														self.controller.draw();
														self.setMode("view");
														dialogContainer.html('');
														self.loadDialog.dialog("close")
													})
													.attr("class", "graph_dialog_item");

									var td = rows.selectAll('td') 
													.data(function(d){
														var date = new Date(d.modified);
														return [d.name, date];
													})
													.enter()
													.append("td")
													.text(function(d){
														return d;
													});

								});
						jqxhr.fail(function(){
							console.error("Unable to load new graphs.  Unknown error.");
							infoField.text("An unknown error has ocurred.  Please try refreshing the page.");
						});
					});
				}
			});
		})();
		
		
		self.importDialog = $("<div>").attr("id", "import_dialog").attr("title", "Import Graph Data").attr("class", "dialog");

		// Maintain scope
		(function(){
			var dialogContainer = $("<div>");
			self.importDialog.append(dialogContainer);
			
			var form;
			var infoField;
			var importField;
			var formatField;


			self.importDialog.dialog({
				autoOpen: false,
				modal: true,
				width: 600,
				height: 800,
				open: function(){
					
					dialogContainer.load('dialog/importGraph.html', function(){
						console.log("Loading dialog for Import Graph.");
						
						form = $("#form");
						infoField = $("#dialog_graph_info");
						importField = $("#dataField");
						
						formatField = $("#formatRadioSet").buttonset();

					});
				},
				buttons:{
					"Import": function(){
						importField.removeClass( "ui-state-error" );
						
						var data = importField.val();
						
						formatField.buttonset("refresh");
						var formatId = $("#" + formatField.attr("id") + " :radio:checked").attr('id');
						if( formatId == "jsonRadio" ){
							// DO nothing, already the correct format
						}
						else if (formatId == "xmlRadio"){
							data = JSON.stringify(chronograph.parseXml(data));
						}
						else{
							infoField.text("Invalid format specified, please try again.");
							console.error("Invalid format specified.");
						}
						
						var graph = {};
						graph._id = self.controller.graph.id;
						graph.name = self.controller.graph.name;
						graph.data = data;
						
						var jqxhr = $.ajax(
								{url: "api/graphs/" + graph._id, 
								 data: graph,
								 type: "PUT",
								 success: function(data, textStatus, jqXHR){
										console.log("Post response:"); console.dir(data);
										var graphObj = chronograph.newGraph(data._id, data.name, JSON.parse(data.data), chronograph.data.JSON);

										self.controller.setGraph(graphObj);
										self.controller.draw();
										self.setMode("view");
										dialogContainer.html('');
										self.importDialog.dialog("close");
									}
								});
						jqxhr.fail(function(){
							console.error("Unable to create new graph.  Unknown error.");
							infoField.text("An unknown error has ocurred.  Please try refreshing the page.");
						});
						
					},
					 Cancel: function() {
						 dialogContainer.html('');
						$( this ).dialog( "close" );
					}
				},
				 close: function() {
					dataField.val( "" ).removeClass( "ui-state-error" );
				}
			});
		})();
	};

	Settings.prototype.createDOM = function(){
		var self = this;
		
		self.menu = $("<table>").attr("id", "menu_panel")
								.attr("height", self.topControllerHeight)
								.attr("width", "100%");

		var row = $("<tr>");
		self.menu.append(row);


		self.initializeDialogs();

		self.newGraphButton = $("<td>").attr("id", "new_graph_button")
								.append($("<span>").text("Create"))
								.click(function(){
									self.createDialog.dialog("open");
								});

		self.loadGraphButton = $("<td>").attr("id", "load_graph_button")
								.append($("<span>").text("Load"))
								.click(function(){
									self.loadDialog.dialog("open");
								});

		self.editGraphButton = $("<td>").attr("id", "edit_graph_button")
								 .attr("class", "disabled")
								 .append($("<span>").text("Edit"))
								 .click(function(){
									self.setMode("edit"); 
								 });
		
		self.saveGraphButton = $("<td>").attr("id", "save_graph_button")
									 .css("display", "none")
									 .append($("<span>").text("Save"))
									 .click(function(){
										// Save the graph
										
										 var graph = {};
										graph._id = self.controller.graph.id;
										graph.name = self.controller.graph.name;
										graph.data = JSON.stringify(self.controller.graph.exportData());
										
										
										var jqxhr = $.ajax(
												{url: "api/graphs/" + graph._id, 
												 data: graph,
												 type: "PUT",
												 success: function(data, textStatus, jqXHR){
														console.log("Saving Graph. Post response:"); console.dir(data);
														var graphObj = chronograph.newGraph(data._id, data.name, JSON.parse(data.data), chronograph.data.JSON);

														self.controller.setGraph(graphObj);
														self.controller.draw();
														self.setMode("view");
													}
												});
										jqxhr.fail(function(){
											console.error("Unable to save graph.  Unknown error.");
										});
									 });
		
		self.cancelEditButton = $("<td>").attr("id", "cancel_edit_button")
		 .css("display", "none")
		 .append($("<span>").text("Cancel"))
		 .click(function(){
			 	// Load unmodified graph from database.			
				var jqxhr = $.ajax(
						{url: "api/graphs/" + self.controller.graph.id,
						 type: "GET",
						 success: function(data, textStatus, jqXHR){
								console.log("Fetching unmodified Graph. Post response:"); console.dir(data);
								var graphObj = chronograph.newGraph(data._id, data.name, JSON.parse(data.data), chronograph.data.JSON);

								self.controller.setGraph(graphObj);
								self.controller.draw();
								self.setMode("view");
							}
						});
				jqxhr.fail(function(){
					console.error("Unable to save graph.  Unknown error.");
				});
		 });
		
		row.append(self.newGraphButton);
		row.append(self.loadGraphButton);
		row.append(self.editGraphButton);
		row.append(self.saveGraphButton);
		row.append(self.cancelEditButton);
		
		
		self.editMenu = $("<div>").attr("id", "edit_menu")
								  .css("display", "none");
		
		var importLink = $("<a>").attr("id", "import_graph_link")
							 .text("Import Graph")
							 .attr("href", "#")
							 .click(function(){
								 self.importDialog.dialog("open");
								 return false;
							 });
		
		self.editMenu.append(importLink);
		


		self.container.append(self.menu);
		self.container.append(self.editMenu);
	};
	
	gravity.load = function(){
		
		if( window.jQuery && window.d3 ){
	
			var controller = new Controller("#container");
			controller.createDOM();


		} else{
			
		}
	};
	
})();
