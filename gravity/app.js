
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var mongoose = require('mongoose');

var app = express();

// Database
mongoose.connect('mongodb://localhost/gravity');

var Schema = mongoose.Schema;

var Graph = new Schema({
	name: {type: String, required: true},
	data: {type: String, required: true},
	modified: {type: Date, default: Date.now}
});

var GraphModel = mongoose.model('Graph', Graph);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('ApVQf6tU5H2ztgbeeWTS'));
app.use(express.session({secret: 'ApVQf6tU5H2ztgbeeWTS'}));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


app.get('/api', function(req, res){
	res.send("API is running.");
});


// List Graphs
app.get('/api/graphs', function(req, res){
	return GraphModel.find(function (err, graphs) {
	    if (!err) {
	    	return res.send(graphs);
	    } else {
	    	return console.log(err);
	    }
	});
});

// Create New Graph
app.post('/api/graphs', function (req, res){
  var graph;
  console.log("POST: ");
  console.log(req.body);
  graph = new GraphModel({
    name: req.body.name,
    data: req.body.data,
  });
  graph.save(function (err) {
    if (!err) {
      return console.log("created");
    } else {
      return console.log(err);
    }
  });
  return res.send(graph);
});

// Get a Single Graph
app.get('/api/graphs/:id', function (req, res){
  return GraphModel.findById(req.params.id, function (err, graph) {
    if (!err) {
      return res.send(graph);
    } else {
      return console.log(err);
    }
  });
});

// Update a Single Graph
app.put('/api/graphs/:id', function (req, res){
  return GraphModel.findById(req.params.id, function (err, graph) {
    graph.name = req.body.name;
    graph.data = req.body.data;
    return graph.save(function (err) {
      if (!err) {
        console.log("updated");
      } else {
        console.log(err);
      }
      return res.send(graph);
    });
  });
});

// Delete a Single Graph
app.delete('/api/graphs/:id', function (req, res){
  return GraphModel.findById(req.params.id, function (err, graph) {
    return graph.remove(function (err) {
      if (!err) {
        console.log("removed");
        return res.send('');
      } else {
        console.log(err);
      }
    });
  });
});




/*
app.get('/', routes.index);
app.get('/users', user.list);
*/

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
