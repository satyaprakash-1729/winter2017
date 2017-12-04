var express = require('express');
var url = require('url');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');
var fs = require('fs');
// var multer = require('multer');

//  var Storage = multer.diskStorage({
//      destination: function(req, file, callback) {
//          callback(null, "images/profilePics");
//      },
//      filename: function(req, file, callback) {
//        console.log(">>>>>>>>>" + JSON.stringify(req));
//          callback(null, file.fieldname +'.'+mime.extension(file.mimetype));
//      }
//  });

// var upload = multer({storage: Storage}).array("profilepic", 5);

var session = require('express-session');
var async = require('async');

var app = express();

var myIp = "192.168.1.4";

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

app.set('view engine', 'ejs');
app.use(fileUpload({preserveExtension: 3}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
// app.use(upload.array());
app.use(cookieParser());
app.use(session({secret: "hamunaptra", resave: false, saveUninitialized: true}));

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'hamunaptra',
    database: 'polproj100'
});
var admin = {username: "mathayus1729", password: "PolProj@1729"};

app.get('/admin', function(req, res){
    // console.log("SAFASFAS");
    res.render('admin.html', {message: ""});
});

app.post('/admin', function(req, res){
        // console.log(req.body.username + "   "+ req.body.password);
        if(admin.username == req.body.username && admin.password == req.body.password){
            // console.log(JSON.stringify(user) + "  -- "+JSON.stringify(req.body));
            req.session.user = admin;
            res.redirect('/protected');
            res.end();
        }else{
            //console.log("sad: "+req.body.password);
            res.render("admin.html", {message: "Wrong Username or Password!"});
        }
});

function checkAdmin(req, res, next){
    //console.log("0------> "+req.session.user.username);
    if(req.session.user.username==admin.username && req.session.user.password == admin.password){
        // console.log("ASdaf");
        next();
    }else{
        var err = new Error("Not Admin!");
        next(err);
    }
}

app.get('/protected', checkAdmin, function(req, res){
    // console.log("SADA");
    connection.query("SELECT * FROM Users, UserInfo WHERE Users.id=UserInfo.id;", function(err, rows, fields){
       if(err){
              throw err;
       }else{
              res.render('protected.html', {users: rows});
       }
    });
    // res.render("protected.html", {users: null});
    // res.render('protected.html');
});

app.post('/logout', function(req, res){
        req.session.destroy(function(){
            console.log("Out!");
            res.redirect('/admin');
        });
});

app.post('/adduser', checkAdmin, function(req, res){
       var username = req.body.user_name;
       var email = req.body.email;
       var contact = req.body.contact;
       var design = req.body.designation;
       var station = req.body.station;
       var ipaddr = req.body.ipaddr;
       var userId = req.body.userID;
       connection.query("INSERT INTO Users (userID, ipAddr) VALUES ("+userId+", '"+ipaddr+"');", function(err, rows, fields){
              if(err){
                     throw err;
              }else{
                     console.log("ADDED TO USERS");
              }
       });
        connection.query("INSERT INTO UserInfo (name, email, contact, designation, station) VALUES ('"+username+"', '"+email+"', '"+contact+"', '"+design+"', '"+station+"');", function(err, rows, fields){
              if(err){
                     throw err;
              }else{
                     console.log("ADDED TO USERINFO");
              }
        });
       res.redirect('/protected');
});

function getUserInfo(req, ip, callback1){
       console.log("IOP: "+ip);
       async.waterfall([
              function(callback){
                     connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
                             // connection.end();
                             var temp = null;
                             if(err){ 
                                 throw err;
                             }else{
                                   if(myIp != ip){
                                        for (var i = rows.length - 1; i >= 0; i--) {
                                          // console.log(rows[i]);
                                               if(rows[i].ipAddr == ip){
                                                 // console.log(">>" + rows[i].ipAddr + "<  >" + ip + "<<");
                                                 allowed = true;
                                                 temp = rows[i];
                                                 // next(null, res, allowed);
                                                 console.log("HERE>>>>>>");
                                                 break;
                                               }
                                        }
                                 }else{
                                          temp = rows[0];
                                          allowed = true;
                                 }
                             }
                             req.session.rowis = temp;
                             console.log("HERE  "+temp);
                             callback();
                         });
              },
              function(callback){
                     callback1();
                     callback(null, 'DONE@@');
              }
       ], function(err, result){
              console.log("RES::" + result);
       });
}

function getImageFileName(req, row, callback){
       var dirn = 'images/profilePics/';
       fs.readdir(dirn, (err, files) => {
              files.forEach(file => {
                     if(file.match(new RegExp('^[0-9]*')) == row.userID){
                            req.session.imagefile = file;
                     }
              });
              callback();
       });
}

function homeMaker(req, res){
       var ip = req.connection.remoteAddress;
       console.log(">>>>>>>>"+ip);
       var allowed = false;

       async.waterfall([
       function(next){
              // connection.connect();
           connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
               // connection.end();
               var temp = null;
               if(err){ 
                   throw err;
               }else{
                     if(myIp != ip){
                          for (var i = rows.length - 1; i >= 0; i--) {
                            // console.log(rows[i]);
                                 if(rows[i].ipAddr == ip){
                                   // console.log(">>" + rows[i].ipAddr + "<  >" + ip + "<<");
                                   allowed = true;
                                   temp = rows[i];
                                   // next(null, res, allowed);
                                   console.log("HERE>>>>>>");
                                   break;
                                 }
                          }
                   }else{
                            temp = rows[0];
                            allowed = true;
                   }
                   req.session.rowis = temp;
                   next(null, res, allowed, temp);
               }
           });
    }, function(res, allowed, row, callback){
              if(allowed==true){
                            var dirn = 'images/profilePics/';
                            fs.readdir(dirn, (err, files) => {
                                   files.forEach(file => {
                                          if(file.match(new RegExp('^[0-9]*')) == row.userID){
                                                 return res.render('index.html', {row: row, filenameFull: file});
                                          }
                                   });
                            });
                            // res.render('index.html', {row: row, filenameFull: ""});
                  }else{
                            res.status(403).send("You Are Not Authorized To View This Page ! Please contact the administrator.");
                  }
                  callback(null, "Done");
           }], function(err, result){
              console.log("RES-> "+result);
           });
}

app.get('/', function(req, res){
       homeMaker(req, res);
});

app.get('/images/profilePics/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('images/profilePics/'+req.params.name, {root: __dirname});
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
       // res.render('index.html');
       homeMaker(req, res);
});

app.get('/message', function(req, res){
       async.waterfall([
              function(callback){
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
              },
              function(callback){
                     if(!req.session.rowis)
                            res.status(403).send("Not Authorized!");
                     if(!req.session.imagefile)
                            getImageFileName(req, req.session.rowis, callback);
              },
              function(callback){
                     res.render('base.html', {pageToGet: 'message', row: req.session.rowis, filenameFull: req.session.imagefile});
                     callback(null, 'DONE!');
              }
       ], function(err, result){
              console.log("RES : "+result);
       });
});

app.get('/chat', function(req, res){
       async.waterfall([
              function(callback){
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
              },
              function(callback){
                     if(!req.session.rowis)
                            res.status(403).send("Not Authorized!");
                     if(!req.session.imagefile)
                            getImageFileName(req, req.session.rowis, callback);
              },
              function(callback){
                     res.render('base.html', {pageToGet: 'chat', row: req.session.rowis, filenameFull: req.session.imagefile});
                     callback(null, 'DONE!');
              }
       ], function(err, result){
              console.log("RES : "+result);
       });
});

app.post('/picchange', function(req, res){
       if (!req.files){
              return res.status(400).send('No files were uploaded.');
       }
       let sampleFile = req.files.profilePicUpload;
       var mime1 = sampleFile.mimetype;
       var re = new RegExp('image/(.*)');
       var extension1 = mime1.match(re);
       // console.log(">>>>>>>>>>>>  "+extension1[1]);
       var userID = req.body.userID;

       var dirn = 'images/profilePics/';
       fs.readdir(dirn, (err, files) => {
              files.forEach(file => {
                     console.log(">>>>>>>>>>>>>>>  " + file.match(new RegExp('^[0-9]*')));
                     if(file.match(new RegExp('^[0-9]*')) == userID){
                            // console.log(">> ** ", file);
                            fs.unlink(dirn +''+ file, (err) => {
                                   if(err) throw err;
                                   console.log('DELETED FILE -> ' + dirn+''+file);
                            });
                     }
              });
              sampleFile.mv('images/profilePics/'+userID+'.'+extension1[1], function(err) {
                     if (err){
                            return res.status(500).send(err);
                     }
                     res.redirect('/');
                     });
              });
});

app.listen(process.env.PORT || 3000, myIp);