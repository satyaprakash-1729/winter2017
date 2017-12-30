var express = require('express');
var url = require('url');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');
var fs = require('fs');
var dl = require('delivery');
var btoa = require('btoa');

// var path = require('path');
// var notifier = require('node-notifier');
var cron = require('node-cron');
var gcm = require('node-gcm');
// var PubSub = require('pubsub-js');
// var token11 = PubSub.subscribe('TOPIC1', function(msg, data){
//   console.log(">>>" + msg + "  " + data);
// });
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
var SqlString = require('sqlstring');

var app = express();
var http = require('http').Server(app)
var io = require('socket.io')(http);

var myIp = "192.168.1.2";

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
    database: 'polproj100',
    charset: 'utf8mb4'
});
var admin = {username: "mathayus1729", password: "PolProj@1729"};

var notificationidlist = {};
var onlineUsers = {};
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

app.post ('/removeuser', checkAdmin, function(req, res){
  var selecteduser = req.body.removallist1;
  var values = selecteduser.split('+');
  // console.log("VALUE: ", values[0]+"-"+values[1]);
  var id = values[0];
  var userid = values[1];
  connection.query("DELETE FROM Users WHERE id="+id+";", function(err, rows, fields){
        if(err){
               throw err;
        }else{
               console.log("Removed From Users");
        }
 });
  connection.query("DELETE FROM UserInfo WHERE id="+id+";", function(err, rows, fields){
        if(err){
               throw err;
        }else{
               console.log("Removed From UserInfo");
        }
 });
var removemsgquery = "DELETE FROM messages WHERE fromID="+userid+" OR toID="+userid+";";
// console.log(">>>> "+removemsgquery);
connection.query(removemsgquery, function(err, rows, fields){
        if(err){
               throw err;
        }else{
               console.log("Removed From messages");
        }
 });
  res.redirect('/protected');
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
                                                 // console.log("HERE>>>>>>");
                                                 break;
                                               }
                                        }
                                 }else{
                                          temp = rows[0];
                                          allowed = true;
                                 }
                             }
                             req.session.rowis = temp;
                             // console.log("HERE  "+temp);
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

function getUserInfo2(ip, resultObj, callback1){
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
                                                 // console.log("HERE>>>>>>");
                                                 break;
                                               }
                                        }
                                 }else{
                                          temp = rows[0];
                                          allowed = true;
                                 }
                             }
                             resultObj.result = temp;
                             // console.log("HERE  "+temp);
                             callback();
                         });
              },
              function(callback){
                     callback(null, 'DONE@@');
              }
       ], function(err, result){
              console.log("RES::" + result);
              callback1();
       });
}

function extractExtension(filename){
  var patt1 = /\.([0-9a-z]+)(?:[\?#]|$)/i;
       var extension1 = (filename).match(patt1);
       var extension = extension1[1];
       return extension;
}

function extractFilename(filename){
  var extss = extractExtension(filename);
        var re = new RegExp('^(.*).'+extss);
       var ANSWER = filename.match(re);
       return ANSWER[1];
}

function getImageFileName(req, row, callback){
       var dirn = 'images/profilePics/';
       var done = false;
       fs.readdir(dirn, (err, files) => {
              files.forEach(file => {
                     if(file.match(new RegExp('^[0-9]*')) == row.userID){
                            req.session.imagefile = file;
                            done = true;
                     }
              });
              if(done==false){
                req.session.imagefile = "0.png";
              }
              callback();
       });
}

function _arrayBufferToBase64( buffer ) {
      var binary = '';
      var bytes = new Uint8Array( buffer );
      var len = bytes.byteLength;
      for (var i = 0; i < len; i++) {
          binary += String.fromCharCode( bytes[ i ] );
      }
      return btoa( binary );
  }

function homeMaker(req, res){
       var ip = req.connection.remoteAddress;
       console.log(">>>>>>>>"+ip);
       var allowed = false;
       var done = false;
       async.waterfall([
       function(next){
        // console.log(">>>>>111111111111111111111");
              // connection.connect();
           connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
               // connection.end();
               var temp = null;
               if(err){ 
                   throw err;
               }else{
                  if(rows.length==0){
                        res.status(403).send("You Are Not Authorized To View This Page ! Please contact the administrator.");
                  }
                     if(myIp != ip){
                          for (var i = rows.length - 1; i >= 0; i--) {
                            // console.log(rows[i]);
                                 if(rows[i].ipAddr == ip){
                                   // console.log(">>" + rows[i].ipAddr + "<  >" + ip + "<<");
                                   allowed = true;
                                   temp = rows[i];
                                   // next(null, res, allowed);
                                   // console.log("HERE>>>>>>");
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
        // console.log(">>>>>222222222222222222");

              if(allowed==true){
                            var dirn = 'images/profilePics/';
                            fs.readdir(dirn, (err, files) => {
                                   files.forEach(file => {
                                          if(file.match(new RegExp('^[0-9]*')) == row.userID){
                                                res.render('index.html', {row: row, filenameFull: file});
                                                done = true;
                                          }
                                   });
                                   if(done==false){
                                      return res.render('index.html', {row: row, filenameFull: "0.png"});
                                   }
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

app.get('/images/tempfiles/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('images/tempfiles/'+req.params.name, {root: __dirname});
});

app.get('/images/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('images/'+req.params.name, {root: __dirname});
});

app.get('/bootstrap-3.3.7/dist/js/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('bootstrap-3.3.7/dist/js/'+req.params.name, {root: __dirname});
});

app.get('/fonts/roboto/:name', function(req, res){
    // res.send('images/'+req.params.name);
    // console.log("ASDADDASDAS>>>>>>>>>>>>>>>>>>>>>>>>>>>   " + req.params.name);
    res.sendFile('fonts/roboto/'+req.params.name, {root: __dirname});
});

app.get('/views/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('views/'+req.params.name, {root: __dirname});
});

app.get('/css/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('css/'+req.params.name, {root: __dirname});
});

app.get('/js/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('js/'+req.params.name, {root: __dirname});
});

app.get('/home*', function(req, res){
       // res.render('index.html');
       homeMaker(req, res);
});

app.get('/message*', function(req, res){
       async.waterfall([
              function(callback){
                // console.log("1111111111111");
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
                      else
                        callback();
              },
              function(callback){
                // console.log("2222222222222222222");
                     if(!req.session.rowis){
                            res.status(403).send("Not Authorized!");
                            return res.end();
                          }
                     if(!req.session.imagefile)
                            getImageFileName(req, req.session.rowis, callback);
                          else
                            callback();
              },
              function(callback){
                connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
                   // connection.end();
                   if(err){ 
                       throw err;
                   }else{
                       req.session.allrows = rows;
                       callback();
                   }
               });
              },
              function(callback){
                // console.log("33333333333");
                     res.render('base.html', {row: req.session.rowis, filenameFull: req.session.imagefile, allrows: req.session.allrows, pageToGet: 'message'});
                     callback(null, 'DONE!');
              }
       ], function(err, result){
              console.log("RES : "+result);
       });
});

app.get('/contacts', function(req, res){
    async.waterfall([
              function(callback){
                // console.log("1111111111111");
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
                      else
                        callback();
              },
              function(callback){
                // console.log("2222222222222222222");
                     if(!req.session.rowis){
                            res.status(403).send("Not Authorized!");
                            return res.end();
                          }
                     if(!req.session.imagefile)
                            getImageFileName(req, req.session.rowis, callback);
                          else
                            callback();
              },
              function(callback){
                connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
                   // connection.end();
                   if(err){ 
                       throw err;
                   }else{
                       req.session.allrows = rows;
                       callback();
                   }
               });
              },
              function(callback){
                // console.log("33333333333");
                     res.render('base.html', {row: req.session.rowis, filenameFull: req.session.imagefile, allrows: req.session.allrows, pageToGet: 'contact'});
                     callback(null, 'DONE!');
              }
       ], function(err, result){
              console.log("RES : "+result);
       });
});

app.get('/chat*', function(req, res){
       async.waterfall([
              function(callback){
                // console.log("1111111111111");
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
                      else
                        callback();
              },
              function(callback){
                // console.log("2222222222222222222");
                     if(!req.session.rowis){
                            res.status(403).send("Not Authorized!");
                            return res.end();
                          }
                     if(!req.session.imagefile)
                            getImageFileName(req, req.session.rowis, callback);
                          else
                            callback();
              },
              function(callback){
                connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
                   // connection.end();
                   if(err){ 
                       throw err;
                   }else{
                       req.session.allrows = rows;
                       callback();
                   }
               });
              },
              function(callback){
                connection.query('SELECT * from messages WHERE fromID="'+req.session.rowis.userID+'" OR toID="'+req.session.rowis.userID+'";', function(err, rows, fields){
                   if(err){ 
                       throw err;
                   }else{
                       req.session.allmessages = rows;
                       
                       callback();
                   }
               });
              },
              function(callback){
                // console.log("33333333333");
                    // console.log("????????  >> " +JSON.stringify(req.session.allrows));
                    console.log(">>>>>>>>  " + JSON.stringify(onlineUsers));
                     res.render('chat.html', {row: req.session.rowis, filenameFull: req.session.imagefile, allrows: req.session.allrows, allmsgs: req.session.allmessages, usersonline: onlineUsers});
                     callback(null, 'DONE!');
              }
       ], function(err, result){
              console.log("RES : "+result);
       });
});

app.post('/picchange*', function(req, res){
       if (!req.files){
              return res.status(400).send('No files were uploaded.');
       }
       // console.log(JSON.stringify(req.files)+"FILE!!!!!!!!!!!!  >> ");
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

app.post('/checkip', function(req, res){
    connection.query('SELECT * from Users;', function(err, rows, fields){
       if(err){ 
           throw err;
       }else{
          res.send(JSON.stringify({iprows: rows}));
       }
   });
});

function removeQuotes(string){
  var i=0;
  var ans = "";
  while(string[i]!="'"){
    i++;
  }
  var j = string.length-1;
  while(string[j]!="'"){
    j--;
  }
  ans = string.substring(i+1,j);
  return ans;
}
function sendMessageNotification(messageToSend, fromIP, toIP){
  var res = {'result': ''};
  var info = {};
  async.waterfall([
              function(callback){
                // console.log("1111111111111");
                getUserInfo2(fromIP, res, callback);
              },
              function(callback){
                // console.log("1111111111111");
                frominfo = res.result;
                getUserInfo2(toIP, res, callback);
              },
              function(callback){
                  toinfo = res.result;
                  if(notificationidlist[toinfo.ipAddr]){
                        var sender = new gcm.Sender('AAAAdzAnxpE:APA91bEVxRxtQFRvz-GJ5QIT9ElWi6_SLaOOj112AcrN5AvA-kkHGfGkAtOV_-J1X9pcq0hyOQvgGPG6UVH5hVcu0cfIeoYOGxOtRZ1h196GgUybjdX7-tAfR8onTNA3Mn2dnfd4H7V8');
                        var message = new gcm.Message({
                            data: { message: messageToSend, fromname: frominfo.name}
                        });
                         
                        // Specify which registration IDs to deliver the message to
                        var regTokens = [notificationidlist[toinfo.ipAddr]];
                         
                        // Actually send the message
                        sender.send(message, { registrationTokens: regTokens }, function (err, response) {
                            if (err) console.error(err);
                            else{ 
                              console.log(">>RESPONSE > " + JSON.stringify(response));
                              callback(null, 'DONE!');
                            }
                        });
                  }else{
                    callback(null, 'DONE!');
                  }
              }
       ], function(err, result){
              console.log("NOTIFICATION :"+result);
       });

}

// cron.schedule('*/30 * * * * *', function(){
//   // io.emit('notification', {message: "Hello", frominfo:{name: 'temp1', userID: 103}, toinfo:{name: 'temp2', userID: 101}, timeOfMsg: new Date()});
//   io.on('connection', function(socket){
//   console.log('a user connected');
// });
// });

  io.on('connection', function(socket){
    var resultRow = {'result':''};
    getUserInfo2(socket.handshake.address, resultRow, function(){
      onlineUsers[''+resultRow.result.userID] = true;
      io.emit('user online', {userid: resultRow.result.userID});
    })
    socket.on('disconnect', function(){
      onlineUsers[''+resultRow.result.userID] = false;
        io.emit('user offline', {userid: resultRow.result.userID});
    });
    socket.on('seen', function(msg){
        io.emit('seen', msg);
    });
    socket.on('chat message', function(msg){
      if(msg.image){
         io.emit('message intranet', msg);
        var dateToInsert = new Date().toISOString().slice(0, 19).replace('T', ' ');
        msg.dateToInsert = dateToInsert;
        // sendMessageNotification(msg.filename, msg.frominfo.ipAddr, msg.toinfo.ipAddr);
        var storeFilename = extractFilename(msg.filename) + '_' + msg.frominfo.userID+'_'+msg.toinfo.userID+'_'+dateToInsert.replace(' ','-')+'.'+extractExtension(msg.filename);
       // console.log("QQQQQQQQ>>>>>>>>  "+JSON.stringify(extension1[1]));
             fs.writeFileSync(__dirname + '/images/tempfiles/' + storeFilename,msg.buffer, function(err){
              if(err){
                console.log("ERROR!!!!!!!!!!");
              }
             });
          // console.log(">>>>>>>>>>>> 123  >> "+removeQuotes(SqlString.escape(msg.buffer)));
            // var queryToRun = 'INSERT INTO messages (fromID, toID, timeOfMsg, isImg, img, imgname) VALUES ("'+msg.frominfo.userID+'", "'+msg.toinfo.userID+'", "'+dateToInsert+'", 1, "'+removeQuotes(SqlString.escape(msg.buffer))+'", "'+msg.filename+'");';
            var queryToRun = "INSERT INTO messages SET ?";
            var values = {
              fromID: parseInt(msg.frominfo.userID),
              toID: parseInt(msg.toinfo.userID),
              timeOfMsg: dateToInsert,
              isImg: 1,
              img: storeFilename,
              imgname: msg.filename
            };
            connection.query(queryToRun, values,function(err, da){
                 if(err){ 
                     throw err;
                 }else{
                       console.log("INSERTED IMAGE : " + msg.filename);
                 }
             });
            io.emit('chat message', msg);
      }else{
        io.emit('message intranet', msg);//////////////////////////////////////////////////////////////////////////////////
        sendMessageNotification(msg.message, msg.frominfo.ipAddr, msg.toinfo.ipAddr);
            var dateToInsert = new Date().toISOString().slice(0, 19).replace('T', ' ');
            // var queryToRun = 'INSERT INTO messages (fromID, toID, message, timeOfMsg, isImg) VALUES ("'+msg.frominfo.userID+'", "'+msg.toinfo.userID+'", "'+(SqlString.escape(msg.message)).substring(1,(SqlString.escape(msg.message)).length -1) +'", "'+dateToInsert+'", 0);';
            var queryToRun = 'INSERT INTO messages (fromID, toID, message, timeOfMsg, isImg) VALUES ("'+msg.frominfo.userID+'", "'+msg.toinfo.userID+'", "'+removeQuotes(SqlString.escape(msg.message)) +'", "'+dateToInsert+'", 0);';
            connection.query(queryToRun, function(err, rows, fields){
                 if(err){ 
                     throw err;
                 }else{
                       console.log("INSERTED MESSAGE : " + msg.message);
                 }
             });
            io.emit('chat message', msg);
          }
    });
  });

  app.post('/getmsgdata', function(req, res){
    console.log(">>>>>>>>>> REQUEST");
    var fromRow = req.body.rowFrom;
    var toRow = req.body.rowTo;
    async.waterfall([
       function(callback){
                // console.log("1111111111111");
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
                      else
                        callback();
              },
        function(callback){
          var queryToRun = "UPDATE messages SET seen=1 WHERE toID='"+fromRow.userID+"';"
          connection.query(queryToRun, function(err, rows, fields){
               if(err){ 
                   throw err;
                   res.send("");
               }else{
                callback();
                  // console.log(JSON.stringify(rows));
               }
           });
        },
        function(callback){
          var queryToRun = 'SELECT * from messages WHERE fromID="'+req.session.rowis.userID+'" OR toID="'+req.session.rowis.userID+'";';
          // console.log(">>  "+queryToRun);
          connection.query(queryToRun, function(err, rows, fields){
               if(err){ 
                   throw err;
                   res.send("");
               }else{
                  // console.log(JSON.stringify(rows));
                   res.send(JSON.stringify({rows: rows}));
                   callback(null, 'HOLA! RES');
               }
           });
        }
      ], function(err, result){
              console.log("NOTIFICATION :"+result);
       });
    
    // console.log("GET MESSAGE DATA>>>>>>  "+req.session.rowis.userID);
    
  });

app.get('/docs/:name', function(req, res){
    res.sendFile('/docs/'+req.params.name, {root: __dirname});
});

app.post('/notificationid', function(req, res){
        notificationidlist[req.body.ip] = req.body.id; 
});

app.post('/notificationid11', function(req, res){
  console.log(">>>>>>  "  + JSON.stringify(req.body));
});
// app.listen(process.env.PORT || 3000, myIp);
// server.listen(process.env.PORT || 3000, myIp);
http.listen(7000,'127.0.0.1', function(){
  console.log('listening on '+myIp+':3000');
  http.close(function(){
    http.listen(3000, myIp);
  });
});