const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
var passport = require("../config/passport");
var db = require("../models");
const moment = require('moment-timezone');
const { check, validationResult } = require('express-validator/check');
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
const Sequelize = require('sequelize');
const Op = Sequelize.Op;



module.exports = function (app) {

  // Using the passport.authenticate middleware with our local strategy.
  // If the user has valid login credentials, send them to the members page.
  // Otherwise the user will be sent an error
  app.post("/api/login", passport.authenticate("local", { failureRedirect: "/", badRequestMessage: "Por favor llena la forma", failureFlash: true }), function (req, res) {
    // Since we're doing a POST with javascript, we can't actually redirect that post into a GET request
    // So we're sending the user back the route to the members page because the redirect will happen on the front end
    // They won't get this or even be able to access this page if they aren't authed    
      

    if (req.user.role === "produccion" || req.user.role === "admin") {
      res.cookie("usuario",req.user.email)
      res.redirect("/produccion");
     
    }
    if (req.user.role === "inspector") {
      res.cookie("usuario",req.user.email)
      res.redirect("/gp12")
    }

  })

  app.post("/api/signup", [
    check("email").isEmail().withMessage("No es un correo valido"),
    check("password").isLength({ min: 5 }).withMessage("La contraseña debe tener 5 caracteres  ")
  ], (req, res) => {
    const errors = validationResult(req)
    //Revisa si hay errores
    let message = [];
    let errorsMessage = errors.array()
    if (!errors.isEmpty()) {
      for (let i = 0; i < errorsMessage.length; i++) {
        //console.log(errorsMessage)
        message.push({
          type: "alert alert-danger",
          message: errorsMessage[i].msg
        }),
          console.log(message)
      }
      req.session.sessionFlash = message,
        res.redirect("/alta")

    }
    else {
      db.User.create({
        email: req.body.email,
        password: req.body.password
      }).then(function (data) {
        req.session.sessionFlash = [{
          type: "alert alert-success",
          message: "Usuario agregado exitosamente"
        }]
        //console.log(req.flash("info"))
        res.redirect("/alta");
      }).catch(function (err) {
        console.log(err);
        res.json(err);
        // res.status(422).json(err.errors[0].message);
      });
    }
  });



  // Route for logging user out
  app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
  });


  // Get all examples
  app.get("/api/:serial", function (req, res) {
    db.Daimler.findOne({
      where: {
        serial: req.params.serial
      }
    }).then(function (dbDaimler) {
      res.json(dbDaimler);
      //console.log(dbDaimler);
    });
  });

  // Create a new serial
  app.post("/api/serial", function (req, res) {
    db.Daimler.create(req.body).then(function (dbDaimler) {
      res.json(dbDaimler);

    })
    .catch(function(error){
      res.json(error)
    });;
  });

  // Create a new serial manually
  app.post("/api/serialmanual", function (req, res) {
    db.Daimler.create({
      serial: req.body.serial,
      registro_auto:false,
      uso_etiqueta:req.body.uso
    }).then(function (dbDaimler) {
      res.json(dbDaimler);

    });
  })


  
  // Changes the status of the label that was repeated
  app.post("/api/repetido", function (req, res) {
    db.Daimler.update({
      repetida: true,
    }, {
        where: {
          serial: req.body.serial
        }

      }).then(function (dbDaimler) {
        res.json(dbDaimler);
      })
  });

  //Creates the registry of the repeated label
  app.post("/api/crearregistro/repetido", function (req, res) {
    //console.log("Entro al api de repetido");
    db.Daimler.create({
      serial: req.body.serial,
      repetida: true,
    }).then(function (dbDaimler) {
      res.json(dbDaimler);
    })
  });

  //!Cambiar esto a Whatsapp
  app.post("/message", function (req, res) {
    var telefonos = [process.env.GABRIEL_PHONE, process.env.TAMARA_PHONE];
    /*
    //* Send messages thru SMS
    for (var i = 0; i < telefonos.length; i++) {
      client.messages.create({
        from: process.env.TWILIO_PHONE, // From a valid Twilio number
        body: "Salio una pieza con serial repetido. El serial es " + req.body.serial,
        to: telefonos[i],  // Text this number

      })
        .then(function (message) {
          console.log("Mensaje de texto: " + message.sid);
          res.json(message);
        });
    }*/

    //* Send messages thru Whatsapp
    for (var i = 0; i < telefonos.length; i++) {
      console.log("whatsapp:" + telefonos[i]);
      client.messages.create({
        from: "whatsapp:" + process.env.TWILIO_PHONE,
        body: "Salio una pieza con serial repetido. El serial es " +req.body.serial+".",
        to: "whatsapp:" + telefonos[i],  // Text this number

      })
        .then(function (message) {
          console.log("Whatsapp:" + message.sid);
          res.json(message);
        });
    }


  });

  //* Api for labels not on the database
  //!Cambiar esto a Whatsapp
  app.post("/notfound", function (req, res) {
    var telefonos = [process.env.GABRIEL_PHONE, process.env.TAMARA_PHONE];
    //console.log("Manda mensaje de no en base de datos")
    /*
    //* Send messages thru SMS
    for (var i = 0; i < telefonos.length; i++) {
      client.messages.create({
        from: process.env.TWILIO_PHONE, // From a valid Twilio number
        body: "Salio una pieza en GP12 que no estaba dada de alta en la base de datos. " +
          "El serial es " + req.body.serial,
        to: telefonos[i],  // Text this number

      })
        .then(function (message) {
          console.log("Mensaje de texto: " + message.sid);
          res.json(message);
        });
    }*/
    //* Send messages thru Whatsapp
    for (var i = 0; i < telefonos.length; i++) {
      console.log("whatsapp:" + telefonos[i]);
      client.messages.create({
        from: "whatsapp:" + process.env.TWILIO_PHONE,
        body: "Salio una pieza en GP12 que no estaba dada de alta en la base de datos. " +
        "El serial es " +req.body.serial+".",
        to: "whatsapp:" + telefonos[i],  // Text this number

      })
        .then(function (message) {
          console.log("Whatsapp:" + message.sid);
          res.json(message);
        });
    }
  });

  //* Api for labels repeated in gp12
  //!Cambiar esto a Whatsapp
  app.post("/repeatgp12", function (req, res) {
    var telefonos = [process.env.GABRIEL_PHONE, process.env.TAMARA_PHONE];
    /*
    //* Send messages thru SMS
    for (var i = 0; i < telefonos.length; i++) {
      client.messages.create({
        from: process.env.TWILIO_PHONE, // From a valid Twilio number
        body: "Salio una pieza en GP12 repetida. " +
          "El serial es " + req.body.serial,
        to: telefonos[i],  // Text this number

      })
        .then(function (message) {
          console.log("Mensaje de texto: " + message.sid);
          res.json(message);
        });
    }*/

     //* Send messages thru Whatsapp
     for (var i = 0; i < telefonos.length; i++) {
      console.log("whatsapp:" + telefonos[i]);
      client.messages.create({
        from: "whatsapp:" + process.env.TWILIO_PHONE,
        body: "Salio una pieza en GP12 repetida. El serial es " +req.body.serial+".",
        to: "whatsapp:" + telefonos[i],  // Text this number

      })
        .then(function (message) {
          console.log("Whatsapp:" + message.sid);
          res.json(message);
        });
    }
  });

  //* This is to create the label registry once it has been changed
  app.post("/api/cambioetiqueta", function (req, res) {
    db.Daimler.create({
      serial: req.body.serial,
      etiqueta_remplazada: req.body.etiqueta_remplazada,
      repetida: false,
    }).then(function (dbDaimler) {
      res.json(dbDaimler);

    });
  })

  app.get("/api/all/:serial", function (req, res) {
    db.Daimler.findAll({
      where: {
        serial: req.params.serial
      }
    }).then(function (dbDaimler) {
      res.json(dbDaimler);
      //console.log(dbDaimler);
    });
  });

  //To show the last 6 scan labels
  app.get("/api/all/tabla/seisetiquetas", function (req, res) {
    db.Daimler.findAll({
      where:{
        uso_etiqueta:{
          [Op.eq]:"Produccion"
        }
      },
      limit: 6,
      order: [["createdAt", "DESC"]],
    }).then(function (dbDaimler) {
      res.json(dbDaimler);
      //console.log(dbDaimler)

    });
  });

  //To add the date it was inspected in GP-12
  app.put("/api/gp12/:serial", function (req, res) {
    db.Daimler.update({
      fecha_gp12: Date.now()
    },
      {
        where: {
          serial: req.params.serial
        }
      }).then(data => {
        res.json(data)
      }).catch(function (err) {
        console.log(err)
      })
  })

  //To add the date it was inspected in Poland
  app.put("/api/polonia/:serial", function (req, res) {
    db.Daimler.update({
      fechapolonia: Date.now()
    },
      {
        where: {
          serial: req.params.serial
        }
      }).then(data => {
        res.json(data)
      }).catch(function (err) {
        console.log(err)
      })
  })

  //To get the last 6 GP12 scan labels
  //To show the last 6 scan labels
  app.get("/api/all/tabla/gp12seisetiquetas", function (req, res) {
    db.Daimler.findAll({
      limit: 6,
      order: [["fecha_gp12", "DESC"]],
    }).then(function (dbDaimler) {
      res.json(dbDaimler);
      //console.log(dbDaimler)

    });
  });

  //Get data between hour
  app.get("/produccionhora/:fechainicial/:fechafinal", function (req, res) {
    let fechainicial = moment.unix(req.params.fechainicial).format("YYYY-MM-DD HH:mm:ss")
    let fechafinal = moment.unix(req.params.fechafinal).format("YYYY-MM-DD HH:mm:ss")
    //console.log(fechainicial)
    //console.log(fechafinal)
    //console.log(req.params.fechafinal)
    db.Daimler.findAndCountAll({
      where: {
        createdAt: {
          [Op.gte]: fechainicial,
          [Op.lte]: fechafinal
        },
        //Le agregue esto para que no cuente las cambiadas
        etiqueta_remplazada:null,
        registro_auto:{
          [Op.eq]:1,
        },

      },
      distinct: true,
      col: "serial"
    }).then(data => {
      res.json(data)
    }).catch(function (err) {
      console.log(err)
    })
  });

  //* SMS Produccion del turno
  app.post("/reporte", function (req, res) {
    var telefonos = [process.env.GUS_PHONE, process.env.OMAR_PHONE,
    process.env.CHAVA_PHONE, process.env.SALINAS_PHONE,process.env.CHAGO_PHONE];

    //* Send messages thru SMS
/*
    for (var i = 0; i < telefonos.length; i++) {
      client.messages.create({
        from: process.env.TWILIO_PHONE, // From a valid Twilio number
        body: "La producción de la linea Daimler del turno de " + req.body.turno + " fue de: " + req.body.piezasProducidas,
        to: telefonos[i],  // Text this number

      })
        .then(function (message) {
          console.log("Mensaje de texto: " + message.sid);
          res.json(message);
        });
    }
*/

    //* Send message thry whatsapp
    for (var i = 0; i < telefonos.length; i++) {
      console.log("whatsapp:" + telefonos[i]);
      client.messages.create({
        from: "whatsapp:" + process.env.TWILIO_PHONE, // From a valid Twilio number,
        body: "La producción de la linea de Daimler del turno de " + req.body.turno + " fue de: " + req.body.piezasProducidas,
        to: "whatsapp:" + telefonos[i],  // Text this number
        /*La producción de la linea de Daimler del turno de {{1}} fue de: {{2}}*/

      })
        .then(function (message) {
          console.log("Whatsapp:" + message.sid);
          res.json(message);
        })
        .catch(function(error){
          res.json(error)
        });
    }
  });

  //Route to restablish user password
  app.post('/forgot', function (req, res, next) {
    async.waterfall([
      function (done) {
        //console.log("entro 1")
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString('hex');
          //console.log("El token es " + token)
          done(err, token);
        });
      },
      function (token, done) {
        //console.log("entro 2")
        db.User.findOne({
          where: {
            email: req.body.email
          }
        }).then(data => {
          //console.log(data)
          if (!data) {
            req.flash("error", "No hay cuenta con ese correo")
            return res.redirect("/")
          }
          db.User.update({
            resetPasswordToken: token,
            resetPasswordExpire: Date.now() + 3600000, // 1 hora
          },
            {
              where: {
                email: req.body.email
              }

            }).then(function (user, err) {
              //console.log(user)
              //console.log(err)
              done(err, token, data)
            })
        })
      },
      function (token, data, done) {
        //console.log("Entro 3")
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            type:"OAuth2",
            user: 'netzwerk.mty@gmail.com',
            clientId:process.env.clientId,
            clientSecret:process.env.clientSecret,
            refreshToken:process.env.refreshToken,
            accessToken:process.env.accessToken
          }
        });
        var mailOptions = {
          to: data.email,
          from: 'netzwerk.mty@gmail.com',
          subject: 'Restablecer contraseña',
          text: 'Estas recibiendo este mensaje porque tu (o alguien mas) ha pedido restablecer tu contraseña de tu cuenta.\n\n' +
            ' Por favor dale click en el siguiente link, o pega el link en tu navegador para completar el proceso:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'Si tu no pediste restablecer tu contraseña, por favor ignora este correo y tu password no sufrira cambio.\n'
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          console.log('mail sent');
          req.flash('success', 'Un e-mail se ha mandado a ' + data.email + ' con las instrucciones a seguir.');
          done(err, 'done');
          //return res.redirect("/")
        });
      }
    ], function (err) {
      //console.log("Hubo error")
      if (err) return next(err);
      res.redirect('/');
    });
  });

  //Route to establish new password

  app.post('/reset/:token', function (req, res) {
    async.waterfall([
      function (done) {
        db.User.findOne({
          where: {
            resetPasswordToken: req.params.token,
            resetPasswordExpire: {
              [Op.gt]: Date.now()
            }
          }
        }).then(user => {
          if (!user) {
            req.flash("error", "El token para restablecer la contraseña ha expirado o es inválido")
            return res.redirect("/")
          }
          if (req.body.password.length > 4) {
            if (req.body.password === req.body.confirm) {
              db.User.update({
                resetPasswordToken: null,
                resetPasswordExpire: null,
                password: req.body.password
              },
                {
                  where: {
                    resetPasswordToken: req.params.token
                  },
                  individualHooks:true
                }).then(function (data, err) {
                  done(err, user)
                })
            }
            else {
              req.flash("error", "Las contraseñas no coinciden")
              return res.redirect("back")
            }
          }
          else{
            req.flash("error","La contraseña debe tener minimo 5 caracteres")
            return res.redirect("back")
          }

        })
      },
      function (user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            type:"OAuth2",
            user: 'netzwerk.mty@gmail.com',
            clientId:process.env.clientId,
            clientSecret:process.env.clientSecret,
            refreshToken:process.env.refreshToken,
            accessToken:process.env.accessToken
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'netzwerk.mty@gmail.com',
          subject: 'Tu contraseña ha cambiado',
          text: 'Hola,\n\n' +
            'Esta es una confirmación de que la contraseña de tu cuenta ' + user.email + ' ha cambiado.\n'
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          req.flash('success', 'Contraseña actualizada correctamente.');
          done(err);
        });
      }
    ], function (err) {
      res.redirect('/');
    });
  });



};

