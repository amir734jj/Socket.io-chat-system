var fs = require("fs");
var https = require("https");
var express = require("express");
var enforce = require("express-sslify");
var app = express();
var options = {
    key: fs.readFileSync("./certificate/file.pem"),
    cert: fs.readFileSync("./certificate/file.crt")
};
var serverPort = 443;
var server = https.createServer(options, app);
var io = require("socket.io").listen(server);
var expressServer = server.listen(serverPort, function() {
    console.log("Server is listening on port %s!", serverPort);
});
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var path = require("path");
var Sequelize = require("sequelize");
var _ = require("underscore");
var session = require("express-session")
var SequelizeStore = require("connect-session-sequelize")(session.Store);
var sha3 = require("js-sha3").sha3_256;
var multer = require("multer");
var moment = require("moment");

app.use(enforce.HTTPS({
    trustProtoHeader: true
}));
var storage = multer.diskStorage({
    destination: "./uploads/",
    filename: function(req, file, cb) {
        if (req.session.user) {
            cb(null, req.session.user.hashcode + "." + getFileExtension(file.originalname));
        } else {
            cb(null, false);
        }
    }
});

var upload = multer({
    "storage": storage
});
var authentication = require("./modules/authentication.js");
var discussion = require("./modules/discussion.js");
var database = require("./modules/database.js");

// initialize database with SQLite
var sequelize = new Sequelize("database", "username", "password", {
    host: "localhost",
    dialect: "sqlite",
    pool: {
        max: 1,
        min: 0,
        idle: 10000
    },
    storage: "database/db.sqlite",
    logging: false
});

(function() {
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());
    app.set("view engine", "jade");
    app.locals.pretty = true;
    app.use("/views", express.static(__dirname + "/views"));
    app.use("/bower_components", express.static(__dirname + "/bower_components"));
    app.use("/static", express.static(__dirname + "/static"));
    app.use(session({
        secret: "This is a seed!",
        store: new SequelizeStore({
            db: sequelize
        }),
        proxy: true,
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 60 * 60 * 1000
        }
    }));
    app.locals.moment = moment;
})();

// load schemas to the databse if there are not there already
var databaseModels = database.initialize(sequelize, Sequelize);

app.get("/", function(req, res) {
    if (req.session.user) {
        authentication.listAccounts(databaseModels.userModel, function(users) {
            discussion.listDiscussions({}, databaseModels.discussionModel, function(discussions) {
                res.render("main", {
                    "user": req.session.user,
                    "discussions": _.each(discussions, function(discussion) {
                        _.each(users, function(user) {
                            if (user.hashcode === discussion.discussionCreator) {
                                discussion.discussionCreatorName = user.firstName + " " + user.lastName;
                            }
                        });
                    })
                });
            });
        });
    } else {
        res.redirect("/login");
    }
});

app.get("/register", function(req, res) {
    if (req.session.user) {
        res.redirect("/");
    } else {
        res.render("register");
    }
});

app.get("/login", function(req, res) {
    if (req.session.user) {
        res.redirect("/");
    } else {
        res.render("login");
    }
});

app.get("/logout", function(req, res) {
    req.session.destroy(function(err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });
});

app.get("/account", function(req, res) {
    if (req.session.user) {
        res.render("account", {
            "user": req.session.user
        });
    } else {
        res.redirect("/login");
    }
});

app.get("/account/:filename", function(req, res) {
    if (req.session.user) {
        res.sendFile("/uploads/" + req.params.filename, {
            root: __dirname
        });
    } else {
        res.redirect("/login");
    }
});

app.get("/account/:filename/delete", function(req, res) {
    if (req.session.user) {
        authentication.updateAccount(_.extend(_.pick(req.session.user, "firstName", "lastName", "email", "password", "profileBiography", "hashcode"), {
            "profileImage": ""
        }), databaseModels.userModel, function(user) {
            try {
                fs.unlinkSync("./uploads/" + req.params.filename);
                req.session.user = user;
                req.session.save(function(err) {
                    req.session.reload(function(err) {
                        res.redirect("/account");
                    });
                });
            } catch (error) {
                console.log(error);
            }
        });
    } else {
        res.redirect("/login");
    }
});

app.get("/administrative", function(req, res) {
    if (req.session.user && req.session.user.admin) {
        authentication.listAccounts(databaseModels.userModel, function(users) {
            discussion.listDiscussions({}, databaseModels.discussionModel, function(discussions) {
                res.render("administrative", {
                    "user": req.session.user,
                    "users": users,
                    "discussions": _.each(discussions, function(discussion) {
                        _.each(users, function(user) {
                            if (user.hashcode === discussion.discussionCreator) {
                                discussion.discussionCreatorName = user.firstName + " " + user.lastName;
                            }
                        });
                    })
                });
            });
        });
    } else {
        res.redirect("/login");
    }
});

app.get("/administrative/accounts/:uid/:command", function(req, res) {
    if (req.session.user && req.session.user.admin) {
        authentication.updateAccountByAdmin({
            "hashcode": req.params.uid,
            "command": req.params.command
        }, databaseModels.userModel, function(user) {
            res.redirect("/administrative");
        });
    } else {
        res.redirect("/login");
    }
});

app.get("/about", function(req, res) {
    if (req.session.user) {
        res.render("about", {
            "user": req.session.user
        });
    } else {
        res.render("main");
    }
});

app.get("/administrative/discussions/:uid/:command", function(req, res) {
    if (req.session.user && req.session.user.admin) {
        discussion.deleteDiscussion({
            "discussionHashcode": req.params.uid,
            "command": req.params.command
        }, databaseModels.discussionModel, function(discussion) {
            res.redirect("/administrative");
        });
    } else {
        res.redirect("/login");
    }
});

app.get("/discussions/:uid", function(req, res) {
    if (req.session.user) {
        discussion.getDiscussion({
            "discussionHashcode": req.params.uid
        }, databaseModels.discussionModel, function(discussion) {
            res.render("chat", {
                "user": req.session.user,
                "discussion": discussion
            });
        });
    } else {
        res.redirect("/login");
    }
});

app.post("/register", function(req, res) {
    authentication.registerAccount({
        "init": function() {
            this.firstName = req.body.firstName;
            this.lastName = req.body.lastName;
            this.email = req.body.email;
            this.password = sha3(req.body.password);
            this.memberSince = new Date();
            this.hashcode = sha3(this.firstName + this.lastName + this.email + this.memberSince);
            delete this.init;
            return this;
        }
    }.init(), databaseModels.userModel, function(user) {
        if (_.isUndefined(user)) {
            res.render("register", {
                "message": "Entered username/password has already been registered on the system! Please try again.",
                "unauthorized": true
            });
        } else {
            res.redirect("/login");
        }
    });
});

app.post("/login", function(req, res) {
    authentication.loginAccount({
        "email": req.body.email,
        "password": sha3(req.body.password)
    }, databaseModels.userModel, function(user) {
        if (_.isUndefined(user)) {
            res.render("login", {
                "message": "Invalid username/password! Please try again.",
                "unauthorized": true
            });
        } else {
            req.session.user = user;
            req.session.maxAge = _.isUndefined(req.body.remember) ? (3600000 * 24) : (3600000 * 24 * 7);
            req.session.save(function(err) {
                req.session.reload(function(err) {
                    res.redirect("/");
                });
            });
        }
    });
});

app.post("/account/updateAccount", upload.single("image"), function(req, res) {
    authentication.updateAccount({
        "firstName": req.body.firstName,
        "lastName": req.body.lastName,
        "email": req.session.user.email,
        "password": req.body.password === req.session.user.password ? req.body.password : sha3(req.body.password),
        "profileBiography": req.body.profileBiography,
        "hashcode": req.session.user.hashcode,
        "profileImage": !_.isUndefined(req.file) ? req.file.filename : req.session.user.profileImage
    }, databaseModels.userModel, function(user) {
        req.session.user = user;
        req.session.save(function(error) {
            req.session.reload(function(error) {
                res.redirect("/account");
            });
        });
    });
});

app.post("/discussion/createDiscussion", function(req, res) {
    discussion.createDiscussion({
        "init": function() {
            this.discussionName = req.body.discussionName;
            this.discussionCreator = req.session.user.hashcode;
            this.discussionPrivacy = req.body.privacy === "private" ? true : false;
            this.discussionSince = new Date();
            this.discussionHashcode = sha3(this.discussionName + this.discussionCreator + this.discussionSince + this.discussionPrivacy);
            delete this.init;
            return this;
        }
    }.init(), databaseModels.discussionModel, function(discussion) {
        res.redirect("/discussions/" + discussion.discussionHashcode)
    });
});

// initialize connection pool
var connections = [];

io.sockets.on("connection", function(socket) {
    socket.join(socket.handshake.query.discussionHashcode);
    connections.push(socket);

    console.log("Connected: %s sockets connected", connections.length);

    socket.on("disconnect", function(data) {
        socket.leave(socket.handshake.query.discussionHashcode);
        connections.splice(connections.indexOf(socket), 1);
        console.log("Disconnected: %s sockets connected", connections.length);
    });

    socket.on("send message", function(data) {
        io.to(data.room).emit("new message", data);
    });

    // new
    // socket.on('message', function(message) {
    //     socket.broadcast.emit('message', message);
    // });
    //
    // socket.on('chat', function(message) {
    //     socket.broadcast.emit('chat', message);
    // });
    //
    // socket.on('create or join', function(room) {
    //     var numClients = io.sockets.adapter.rooms[room].length;
    //     console.log(numClients);
    //     if (numClients === 0) {
    //         socket.join(room);
    //         socket.emit('created', room);
    //     } else {
    //         io.sockets.in(room).emit('join', room);
    //         socket.join(room);
    //         socket.emit('joined', room);
    //     }
    //     socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
    //     socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);
    //
    // });


    
});

var getFileExtension = function(fileName) {
    var fileExt = fileName.split(".");
    if (fileExt.length === 1 || (fileExt[0] === "" && fileExt.length === 2)) {
        return "";
    }
    return fileExt.pop();
}
