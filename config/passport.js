var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var bcrypt = require("bcrypt-nodejs");

var db = require("../models");
const { DocumentListInstance } = require("twilio/lib/rest/sync/v1/service/document");

// Telling passport we want to use a Local Strategy. In other words, we want to login with a username/email and password
passport.use(new LocalStrategy(
  // Our user will sign in using an email, rather than a "username"
  {
    usernameField: "email"
  },
  async function (email, password, done) {
    // When a user tries to sign in, this code runs
    try {
      const dbUser = await db.User.findOne({
        where: {
          email: email
        }
      });
      
      // If there's no user with the given email
      if (!dbUser) {
        //console.log("Authentication failed: Incorrect email");
        return done(null, false, {
          message: "El usuario no está registrado"
        });
      }

      //const isPasswordValid=await bcrypt.compare(password,dbUser.password)
      //console.log(isPasswordValid)
      //console.log(dbUser.validPassword(password))
      
      // If there is a user with the given email, but the password the user gives us is incorrect
    

      if (!(await dbUser.validPassword(password))) {
        //console.log("Authentication failed: Incorrect password");
        return done(null, false, {
          message: "La contraseña es incorrecta"
        });
      }

      // If none of the above, return the user
      //console.log("Authentication succeeded");
      return done(null, dbUser);
    } catch (err) {
      console.error("Authentication error:", err);
      return done(err);
    }
  }
));

// In order to help keep authentication state across HTTP requests,
// Sequelize needs to serialize and deserialize the user
// Just consider this part boilerplate needed to make it all work
passport.serializeUser(function (user, done) {
  //console.log(user)
  if (user === false) {
    // Authentication failed, serialize false to indicate no user is authenticated
    done(null, {id:user.id,username:user.email});
  } else {
    // Authentication succeeded, serialize the user object
    done(null, user);
  }
});

passport.deserializeUser(async function (id, done) {
  //console.log(id)
  try {
    const user = await db.User.findByPk(id.id);
    done(null, user); // Deserialize the user from the id
  } catch (err) {
    done(err);
  }
});

// Exporting our configured passport
module.exports = passport;
