var express = require('express');
var url = require('url');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function(req, res){
       res.render('index.html');
});

app.get('/images/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('images/'+req.params.name, {root: __dirname});
});

app.get('/views/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('views/'+req.params.name, {root: __dirname});
});

app.get('/home', function(req, res){
       res.render('index.html');
});

app.get('/message', function(req, res){
       res.render('base.html', {pageToGet: 'message'});
});

app.listen(3000);