var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;

var db = require("../models");
const { DocumentListInstance } = require("twilio/lib/rest/sync/v1/service/document");

// Telling passport we want to use a Local Strategy. In other words, we want login with a username/email and password
passport.use(new LocalStrategy(
  // Our user will sign in using an email, rather than a "username"
  {
    usernameField: "email"
  },
  function (email, password, done) {
    // When a user tries to sign in this code runs
    db.User.findOne({
      where: {
        email: email
      }
    }).then(async function verify(dbUser,err) {
      // If there's no user with the given email
      if (err) throw err;
      if (!dbUser) {
        return done(null, false, {
          message: "El usuario no esta dado de alta"
        });
      }
      // If there is a user with the given email, but the password the user gives us is incorrect
      else if (!(await dbUser.validPassword(password))) {
        return done(null, false, {
          message: "El password es incorrecto"
        })
      }

      // If none of the above, return the user
      return done(null, dbUser);
    }
    );
  }
));

// In order to help keep authentication state across HTTP requests,
// Sequelize needs to serialize and deserialize the user
// Just consider this part boilerplate needed to make it all work
passport.serializeUser(function (user, done) {
  console.log(user.id + " " + user.email)
  if(!user){
  process.nextTick(function(){
    done(null,{id:user.id, username:user.email})
  })}
  else{
    process.nextTick(function(){
      done(null,user)
    })
  }
});

passport.deserializeUser(function (user, done) {
  process.nextTick(function(){
    done(null,user)
  })
});

// Exporting our configured passport
module.exports = passport;
