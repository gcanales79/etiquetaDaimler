require("dotenv").config();
var express = require("express");
var bodyParser = require("body-parser");
// var cookieParser = require("cookie-parser");
var exphbs = require("express-handlebars");
var twilio = require("twilio");
//var helpers = require('handlebars-helpers')();
const moment = require("moment-timezone");
var session = require("express-session");
const cors=require("cors")
// Requiring passport as we've configured it
var passport = require("./config/passport");
var db = require("./models");
var axios = require("axios");
var flash = require("connect-flash");
var MemoryStore = require("memorystore")(session);
const morgan=require("morgan")

var app = express();
//var sessionStore = new session.MemoryStore;
var PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan("dev"))

app.use(bodyParser.json());
app.use(express.static("public"));
// app.use(cookieParser('secret'));


app.set("trust proxy", 1);
app.use(
  session({
    cookie: {
      secure:process.env.NODE_ENV === "production",
      sameSite:process.env.NODE_ENV === "production"?"Strict":"lax",
      httpOnly:false,
      maxAge: 86400000,
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
    resave:false,
    secret: "keyboard cat",
    saveUninitialized: true,
  })
);
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

//Create a Handlebar function
var hbs = exphbs.create({
  defaultLayout: "main",
  helpers: {
    formatDate: function(property) {
      moment.tz.add(
        "America/Monterrey|LMT CST CDT|6F.g 60 50|0121212121212121212121212121212121212121212121212121212121212121212121212121212121212121|-1UQG0 2FjC0 1nX0 i6p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 1fB0 WL0 1fB0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0|41e5"
      );
      var fechaCreacion = moment(property)
        .tz("America/Monterrey")
        .format("DD/MM/YYYY hh:mm:ss a");
      return fechaCreacion;
    },
    ifCond: function(v1, operator, v2, options) {
      switch (operator) {
        case "==":
          return v1 == v2 ? options.fn(this) : options.inverse(this);
        case "===":
          return v1 === v2 ? options.fn(this) : options.inverse(this);
        case "!=":
          return v1 != v2 ? options.fn(this) : options.inverse(this);
        case "!==":
          return v1 !== v2 ? options.fn(this) : options.inverse(this);
        case "<":
          return v1 < v2 ? options.fn(this) : options.inverse(this);
        case "<=":
          return v1 <= v2 ? options.fn(this) : options.inverse(this);
        case ">":
          return v1 > v2 ? options.fn(this) : options.inverse(this);
        case ">=":
          return v1 >= v2 ? options.fn(this) : options.inverse(this);
        case "&&":
          return v1 && v2 ? options.fn(this) : options.inverse(this);
        case "||":
          return v1 || v2 ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    },
  },
});

// Handlebars
app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");

//*Global Vars
app.use(function(req, res, next) {
  // if there's a flash message in the session request, make it available in the response, then delete it
  res.locals.sessionFlash = req.session.sessionFlash;
  delete req.session.sessionFlash;
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  res.locals.user = req.user || null;
  if (req.user) {
    if (req.user.role === "admin") {
      res.locals.admin = "admin";
    }
    if (req.user.role === "produccion") {
      res.locals.produccion = "produccion";
    }
    if (req.user.role === "inspector") {
      res.locals.inspector = "inspector";
    }
  }
  next();
});

// Routes
require("./routes/apiRoutes")(app);
require("./routes/htmlRoutes")(app);

var syncOptions = { force: false };

// CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", true);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-token,"
  );
  res.header("Access-Control-Allow-Methods", "PUT, POST, GET, DELETE, OPTIONS");
  next();
});
// END CORS

// If running a test, set syncOptions.force to true
// clearing the `testdb`
if (process.env.NODE_ENV === "test") {
  syncOptions.force = true;
}

// Starting the server, syncing our models ------------------------------------/
db.sequelize.sync(syncOptions).then(function() {
  app.listen(PORT, function() {
    console.log(
      "==> 🌎  Listening on port %s. Visit http://localhost:%s/ in your browser.",
      PORT,
      PORT
    );
  });
});

module.exports = app;
