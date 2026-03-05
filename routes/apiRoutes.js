const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
var passport = require("../config/passport");
var db = require("../models");
const moment = require("moment-timezone");
const { query, validationResult } = require("express-validator");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const sgMail = require("@sendgrid/mail");
var isAuthenticated = require("../config/middleware/isAuthenticated");
const LineController = require("../controllers/linea");
const Fa1Controller = require("../controllers/fa1");
const DaimlerController = require("../controllers/daimler");
const Fa9Controller = require("../controllers/fa9");
const Fa11Controller = require("../controllers/fa11");
const Fa13Controller = require("../controllers/fa13");
const PerfilController = require("../controllers/perfil");
const { fa9, fa11, fa13 } = require("../models"); // Adjust if your models are imported differently
const models = { fa9: fa9, fa11: fa11, fa13: fa13 };
const { handleTwilioMessage } = require("../controllers/twilioController");

module.exports = function(app) {
  // Using the passport.authenticate middleware with our local strategy.
  // If the user has valid login credentials, send them to the members page.
  // Otherwise the user will be sent an error
  //  app.post("/login", passport.authenticate("local", { failureRedirect: "/", badRequestMessage: "Por favor llena la forma", failureFlash: true }), function (req, res) {

  //    if (req.user.role === "produccion" || req.user.role === "admin") {
  //     //  res.cookie("usuario",req.user.email)
  //     //  res.redirect("/produccion");
  //     res.send({alert:"success", redirect:"/produccion"})

  //    }
  //    if (req.user.role === "inspector") {
  //     //  res.cookie("usuario",req.user.email)
  //     //  res.redirect("/gp12")
  //     res.send({alert:"success", redirect:"/produccion"})
  //    }

  //  })

  // NUEVO MIDDLEWARE HÍBRIDO PARA LA API
  function isApiAuthenticated(req, res, next) {
    // 1. ¿Es un usuario humano desde el navegador web (con sesión)?
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }

    // 2. ¿Es nuestro Cron Job "robot" usando la Llave Maestra secreta?
    const apiKey = req.headers["x-api-key"];

    const secretKey = process.env.SECRET_KEY;

    if (apiKey === secretKey) {
      return next();
    }

    // 3. Si no es un humano logueado ni el Cron Job autorizado, ¡bloqueamos!
    return res.status(401).json({ error: "Acceso no autorizado" });
  }

  app.post("/login", function(req, res, next) {
    passport.authenticate("local", function(err, user, info) {
      // Since we're doing a POST with javascript, we can't actually redirect that post into a GET request
      // So we're sending the user back the route to the members page because the redirect will happen on the front end
      // They won't get this or even be able to access this page if they aren't authed
      //console.log(req.user)
      //console.log(info)
      //console.log("Datos recibidos en el servidor",user);
      if (err) {
        console.log(err);
        // res.send({ message: "Error de Servidor", alert: "Error" });
        res.redirect("/");
      }
      if (!user) {
        console.log("Not user: " + info.message);
        res.send({ message: info.message, alert: "Error" });
        // res.redirect("/");
      }

      req.logIn(user, function(err) {
        //console.log(user)
        if (err) {
          console.log(err);
        } else {
          if (user.role === "produccion" || user.role === "admin") {
            // console.log("Hello")
            // res.cookie("usuario", req.user.email);
            // res.redirect("/produccion");
            res.send({ alert: "success", redirect: "/produccion" });
          }
          if (user.role === "inspector") {
            // res.cookie("usuario", req.user.email);
            // res.redirect("/gp12");
            res.send({ alert: "success", redirect: "/gp12" });
          }
        }
      });
    })(req, res, next);
  });

  app.post(
    "/api/signup",
    [
      query("email")
        .isEmail()
        .withMessage("No es un correo valido"),
      query("password")
        .isLength({ min: 5 })
        .withMessage("La contraseña debe tener 5 caracteres  "),
    ],
    (req, res) => {
      const errors = validationResult(req);
      //Revisa si hay errores
      let message = [];
      let errorsMessage = errors.array();
      if (!errors.isEmpty()) {
        for (let i = 0; i < errorsMessage.length; i++) {
          //console.log(errorsMessage)
          message.push({
            type: "alert alert-danger",
            message: errorsMessage[i].msg,
          }),
            console.log(message);
        }
        (req.session.sessionFlash = message), res.redirect("/alta");
      } else {
        db.User.create({
          email: req.body.email,
          password: req.body.password,
        })
          .then(function(data) {
            req.session.sessionFlash = [
              {
                type: "alert alert-success",
                message: "Usuario agregado exitosamente",
              },
            ];
            //console.log(req.flash("info"))
            res.redirect("/alta");
          })
          .catch(function(err) {
            console.log(err);
            res.json(err);
            // res.status(422).json(err.errors[0].message);
          });
      }
    },
  );

  // Route for logging user out
  app.get("/logout", function(req, res) {
    req.logout(function(err) {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  });

  // ══════════════════════════════════════════════════════════════
  // NUEVO ENDPOINT DAIMLER — reemplaza la lógica GET+POST del JS
  // Poner ANTES del route genérico: app.get("/api/:serial", ...)
  // ══════════════════════════════════════════════════════════════

  app.post("/api/daimler/serial", async (req, res) => {
    const { serial } = req.body;

    // 1. Validación básica
    if (!serial || serial.trim() === "") {
      return res.status(200).send({ code: "400", message: "Serial vacío" });
    }

    const nuevoSerial = serial.trim();

    try {
      // 2. Buscar si ya existe (ignora registros con repetida=true para no
      //    contar los registros de "contención" que ya se crearon a propósito)
      const existente = await db.Daimler.findOne({
        where: { serial: nuevoSerial, repetida: false },
      });

      if (existente) {
        // ── Serial REPETIDO ──
        // Marcar el registro original como repetido
        await db.Daimler.update(
          { repetida: true },
          { where: { serial: nuevoSerial } },
        );

        // Crear registro de contención
        await db.Daimler.create({ serial: nuevoSerial, repetida: true });

        // Notificar por WhatsApp (igual que antes)
        const telefonos = [process.env.TAMARA_PHONE];
        for (const tel of telefonos) {
          client.messages
            .create({
              from: "whatsapp:" + process.env.TWILIO_PHONE,
              body:
                "Salio una pieza con serial repetido. El serial es " +
                nuevoSerial +
                ".",
              to: "whatsapp:" + tel,
            })
            .catch((err) => console.log("Twilio error:", err));
        }

        return res.status(200).send({
          code: "400",
          message:
            "La etiqueta ya existe, por favor segregar la pieza para inspección de calidad",
        });
      }

      // ── Serial NUEVO ──
      await db.Daimler.create({ serial: nuevoSerial });

      return res.status(200).send({
        code: "200",
        message: "Etiqueta Correcta",
      });
    } catch (err) {
      console.error("Error en /api/daimler/serial:", err);
      return res
        .status(200)
        .send({ code: "500", message: "Error de servidor" });
    }
  });

  app.get("/api/daimler/dashboardmaster", isAuthenticated, DaimlerController.getDaimlerDashboardMaster);

  // Get all examples
  app.get("/api/:serial", function(req, res) {
    db.Daimler.findOne({
      where: {
        serial: req.params.serial,
      },
    }).then(function(dbDaimler) {
      res.json(dbDaimler);
      //console.log(dbDaimler);
    });
  });

  // Create a new serial
  app.post("/api/serial", function(req, res) {
    db.Daimler.create(req.body)
      .then(function(dbDaimler) {
        res.json(dbDaimler);
      })
      .catch(function(error) {
        res.json(error);
      });
  });

  // Create a new serial manually
  app.post("/api/serialmanual", function(req, res) {
    db.Daimler.create({
      serial: req.body.serial,
      registro_auto: false,
      uso_etiqueta: req.body.uso,
    }).then(function(dbDaimler) {
      res.json(dbDaimler);
    });
  });

  // Changes the status of the label that was repeated
  app.post("/api/repetido", function(req, res) {
    db.Daimler.update(
      {
        repetida: true,
      },
      {
        where: {
          serial: req.body.serial,
        },
      },
    ).then(function(dbDaimler) {
      res.json(dbDaimler);
    });
  });

  //Creates the registry of the repeated label
  app.post("/api/crearregistro/repetido", function(req, res) {
    //console.log("Entro al api de repetido");
    db.Daimler.create({
      serial: req.body.serial,
      repetida: true,
    }).then(function(dbDaimler) {
      res.json(dbDaimler);
    });
  });

  //!Cambiar esto a Whatsapp
  app.post("/message", function(req, res) {
    var telefonos = [process.env.TAMARA_PHONE];
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
      client.messages
        .create({
          from: "whatsapp:" + process.env.TWILIO_PHONE,
          body:
            "Salio una pieza con serial repetido. El serial es " +
            req.body.serial +
            ".",
          to: "whatsapp:" + telefonos[i], // Text this number
        })
        .then(function(message) {
          console.log("Whatsapp:" + message.sid);
          res.json(message);
        });
    }
  });

  //* Api for labels not on the database
  //!Cambiar esto a Whatsapp
  app.post("/notfound", function(req, res) {
    var telefonos = [process.env.TAMARA_PHONE];
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
      client.messages
        .create({
          from: "whatsapp:" + process.env.TWILIO_PHONE,
          body:
            "Salio una pieza en GP12 que no estaba dada de alta en la base de datos. " +
            "El serial es " +
            req.body.serial +
            ".",
          to: "whatsapp:" + telefonos[i], // Text this number
        })
        .then(function(message) {
          console.log("Whatsapp:" + message.sid);
          res.json(message);
        });
    }
  });

  //* Api for labels repeated in gp12
  //!Cambiar esto a Whatsapp
  app.post("/repeatgp12", function(req, res) {
    var telefonos = [process.env.TAMARA_PHONE];
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
      client.messages
        .create({
          from: "whatsapp:" + process.env.TWILIO_PHONE,
          body:
            "Salio una pieza en GP12 repetida. El serial es " +
            req.body.serial +
            ".",
          to: "whatsapp:" + telefonos[i], // Text this number
        })
        .then(function(message) {
          console.log("Whatsapp:" + message.sid);
          res.json(message);
        });
    }
  });

  //* This is to create the label registry once it has been changed
  app.post("/api/cambioetiqueta", function(req, res) {
    db.Daimler.create({
      serial: req.body.serial,
      etiqueta_remplazada: req.body.etiqueta_remplazada,
      repetida: false,
    }).then(function(dbDaimler) {
      res.json(dbDaimler);
    });
  });

  app.get("/api/all/:serial", function(req, res) {
    db.Daimler.findAll({
      where: {
        serial: req.params.serial,
      },
    }).then(function(dbDaimler) {
      res.json(dbDaimler);
      //console.log(dbDaimler);
    });
  });

  //To show the last 6 scan labels
  app.get("/api/all/tabla/seisetiquetas", function(req, res) {
    db.Daimler.count()
      .then((count) => {
        db.Daimler.findAll({
          where: {
            id: {
              [Op.gte]: count * 0.95,
            },
            uso_etiqueta: {
              [Op.eq]: "Produccion",
            },
          },
          limit: 6,
          order: [["createdAt", "DESC"]],
        })
          .then(function(dbDaimler) {
            // res.json(dbDaimler);
            if (!dbDaimler) {
              res
                .status(404)
                .send({ message: "Datos no encontrados", alert: "Error" });
            } else {
              res.status(200).send({ data: dbDaimler, alert: "Success" });
            }
            //console.log(dbDaimler)
          })
          .catch((err) => {
            res.status(500).send({ err: err, alert: "Error" });
          });
      })
      .catch((err) => {
        console.log(err);
      });
  });

  //To add the date it was inspected in GP-12
  app.put("/api/gp12/:serial", function(req, res) {
    db.Daimler.update(
      {
        fecha_gp12: Date.now(),
      },
      {
        where: {
          serial: req.params.serial,
        },
      },
    )
      .then((data) => {
        res.json(data);
      })
      .catch(function(err) {
        console.log(err);
      });
  });

  //To add the date it was inspected in Poland
  app.put("/api/polonia/:serial", function(req, res) {
    db.Daimler.update(
      {
        fechapolonia: Date.now(),
      },
      {
        where: {
          serial: req.params.serial,
        },
      },
    )
      .then((data) => {
        res.json(data);
      })
      .catch(function(err) {
        console.log(err);
      });
  });

  //To get the last 6 GP12 scan labels
  //To show the last 6 scan labels
  app.get("/api/all/tabla/gp12seisetiquetas", function(req, res) {
    db.Daimler.count()
      .then((count) => {
        db.Daimler.findAll({
          where: {
            id: {
              [Op.gte]: count * 0.95,
            },
          },
          limit: 6,
          order: [["fecha_gp12", "DESC"]],
        }).then(function(dbDaimler) {
          res.json(dbDaimler);
          //console.log(dbDaimler)
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });

  //Get data between hour
  app.get("/produccionhora/:fechainicial/:fechafinal", function(req, res) {
    let fechainicial = moment
      .unix(req.params.fechainicial)
      .format("YYYY-MM-DD HH:mm:ss");
    let fechafinal = moment
      .unix(req.params.fechafinal)
      .format("YYYY-MM-DD HH:mm:ss");
    //console.log(fechainicial)
    //console.log(fechafinal)
    //console.log(req.params.fechafinal)
    db.Daimler.count()
      .then((count) => {
        // console.log(count)
        db.Daimler.findAndCountAll({
          where: {
            id: {
              [Op.gte]: count * 0.9,
            },
            createdAt: {
              [Op.gte]: fechainicial,
              [Op.lte]: fechafinal,
            },
            //Le agregue esto para que no cuente las cambiadas
            etiqueta_remplazada: null,
            registro_auto: {
              [Op.eq]: 1,
            },
          },
          distinct: true,
          col: "serial",
        })
          .then((data) => {
            if (!data) {
              res
                .status(404)
                .send({ message: "Datos no encontrados", alert: "Error" });
            } else {
              res.status(200).send({ data: data, alert: "Success" });
            }
          })
          .catch(function(err) {
            res
              .status(500)
              .send({ message: "Error de servidor", err: err, alert: "Error" });
          });
      })
      .catch((err) => {
        console.log(err);
      });
  });

  //Get data between hour
  app.get("/daimler/produccionhora/:fechainicial/:fechafinal", function(
    req,
    res,
  ) {
    let fechainicial = moment
      .unix(req.params.fechainicial)
      .format("YYYY-MM-DD HH:mm:ss");
    let fechafinal = moment
      .unix(req.params.fechafinal)
      .format("YYYY-MM-DD HH:mm:ss");
    //console.log(fechainicial)
    //console.log(fechafinal)
    //console.log(req.params.fechafinal)
    db.Daimler.count()
      .then((count) => {
        // console.log(count)
        db.Daimler.findAndCountAll({
          where: {
            id: {
              [Op.gte]: count * 0.9,
            },
            createdAt: {
              [Op.gte]: fechainicial,
              [Op.lte]: fechafinal,
            },
            //Le agregue esto para que no cuente las cambiadas
            etiqueta_remplazada: null,
            registro_auto: {
              [Op.eq]: 1,
            },
          },
          distinct: true,
          col: "serial",
        })
          .then((data) => {
            if (!data) {
              res
                .status(404)
                .send({ message: "Datos no encontrados", alert: "Error" });
            } else {
              res.status(200).send({ data: data, alert: "Success" });
            }
          })
          .catch(function(err) {
            res
              .status(500)
              .send({ message: "Error de servidor", err: err, alert: "Error" });
          });
      })
      .catch((err) => {
        console.log(err);
      });
  });

  //* SMS Produccion del turno
  app.post("/reporte", function(req, res) {
    var telefonos = [
      process.env.GUS_PHONE,
      process.env.CHAVA_PHONE,
      process.env.CHAGO_PHONE,
      process.env.BERE_PHONE,
      process.env.BERNARDO,
    ];

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
    sendMessage(telefonos);

    //* Async function

    async function sendMessage(telefonos) {
      //Stop condition

      //* Send message thry whatsapp
      let responseMessage = [];
      for (var i = 0; i < telefonos.length; i++) {
        //console.log("whatsapp:" + telefonos[i]);
        await client.messages
          .create({
            /*from: "whatsapp:" + process.env.TWILIO_PHONE, // From a valid Twilio number,
            body:
              "La producción de la linea de Daimler del turno de " +
              req.body.turno +
              " fue de: " +
              req.body.piezasProducidas,
            to: "whatsapp:" + telefonos[i], // Text this number
            /*La producción de la linea de Daimler del turno de {{1}} fue de: {{2}}*/
            contentSid: "HX156cf46181c4f696541af97b78a920b9",
            from: "whatsapp:" + process.env.TWILIO_PHONE, // From a valid Twilio number,
            to: "whatsapp:" + telefonos[i], // Text this number,
            messagingServiceSid: process.env.serviceSid,
            contentVariables: JSON.stringify({
              1: String(req.body.turno),
              2: String(req.body.piezasProducidas),
            }),
          })
          .then(function(message) {
            //console.log("Whatsapp:" + message.sid);
            console.log(
              `El mensaje a ${message.to} con sid: ${
                message.sid
              } tiene el status de: ${message.status}`,
            );
            responseMessage.push(message);
            //console.log(responseMessage);
            if (responseMessage.length == telefonos.length) {
              return res.json(responseMessage);
            }
          })
          .catch(function(error) {
            console.log("error: " + error);
          });
      }
    }
  });

  //Route to restablish user password
  app.post("/forgot", function(req, res, next) {
    async.waterfall(
      [
        function(done) {
          //console.log("entro 1")
          crypto.randomBytes(20, function(err, buf) {
            var token = buf.toString("hex");
            console.log("El token es " + token);
            done(err, token);
          });
        },
        function(token, done) {
          //console.log("entro 2")
          db.User.findOne({
            where: {
              email: req.body.email,
            },
          }).then((data) => {
            // console.log(data)
            if (!data) {
              req.flash("error", "No hay cuenta con ese correo");
              return res.redirect("/");
            }
            db.User.update(
              {
                resetPasswordToken: token,
                resetPasswordExpire: Date.now() + 3600000, // 1 hora
              },
              {
                where: {
                  email: req.body.email,
                },
              },
            ).then(function(user, err) {
              //console.log(user)
              //console.log(err)
              done(err, token, data);
            });
          });
        },
        function(token, data, done) {
          //console.log("Entro 3")
          const msg = {
            to: data.email, // Change to your recipient
            from: "netzwerk.mty@gmail.com", // Change to your verified sender
            //subject: 'Sending with SendGrid is Fun',
            //text: 'and easy to do anywhere, even with Node.js',
            //html: '<strong>and easy to do anywhere, even with Node.js</strong>',
            template_id: "d-7bb2f1084d154cecb824ff2ef1632ffe",
            dynamic_template_data: {
              user: data.email,
              link: `http://${req.headers.host}/recover-password/${token}`,
            },
          };
          sgMail
            .send(msg)
            .then((email, err) => {
              console.log("Email sent");
              done(err, "done");
            })
            .catch((err) => {
              console.log(err);
            });
        },
      ],
      function(err) {
        //console.log("Hubo error")
        if (err) return next(err);
        res.redirect("/");
      },
    );
  });

  // Request Password Reset
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      // 1. Find the user
      const user = await db.User.findOne({ where: { email: email } });

      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado." });
      }

      // 2. Check if they have a phone number on record
      if (!user.telefono || user.telefono.trim() === "") {
        return res.status(400).json({
          error:
            "No tienes un número de teléfono registrado. Contacta al administrador para restablecer tu contraseña.",
        });
      }

      // 3. Send Twilio Verify OTP via WhatsApp
      await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verifications.create({ to: user.telefono, channel: "whatsapp" }); // Use 'sms' if you prefer text messages

      res.json({ message: "Código de verificación enviado exitosamente." });
    } catch (error) {
      console.error("Error in forgot-password:", error);
      res
        .status(500)
        .json({ error: "Error de servidor. Inténtalo de nuevo más tarde." });
    }
  });

  // Route 2: Verify OTP and Reset Password
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email, otpCode, newPassword } = req.body;

      const user = await db.User.findOne({ where: { email: email } });
      if (!user || !user.telefono)
        return res.status(400).json({
          error:
            "No se encontró un usuario válido con ese correo o no tiene un número de teléfono registrado.",
        });

      // 1. Verify the OTP with Twilio
      const verificationCheck = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verificationChecks.create({ to: user.telefono, code: otpCode });

      if (verificationCheck.status !== "approved") {
        return res.status(400).json({ error: "Código inválido o expirado." });
      }

      // 2. Update the password in the database
      // (Assuming your Sequelize User model has a beforeUpdate/beforeSave hook to hash the password)
      user.password = newPassword;
      await user.save();

      res.json({
        message:
          "Contraseña actualizada exitosamente! Ahora puedes iniciar sesión.",
      });
    } catch (error) {
      console.error("Error in reset-password:", error);
      res
        .status(500)
        .json({ error: "Error de servidor al restablecer la contraseña." });
    }
  });

  //Route to establish new password

  app.post("/reset/:token", function(req, res) {
    async.waterfall(
      [
        function(done) {
          db.User.findOne({
            where: {},
          }).then((user) => {
            if (!user) {
              req.flash(
                "error",
                "El token para restablecer la contraseña ha expirado o es inválido",
              );
              return res.redirect("/");
            }
            if (req.body.password.length > 4) {
              if (req.body.password === req.body.confirm) {
                db.User.update(
                  {
                    resetPasswordToken: null,
                    resetPasswordExpire: null,
                    password: req.body.password,
                  },
                  {
                    where: {
                      resetPasswordToken: req.params.token,
                    },
                    individualHooks: true,
                  },
                ).then(function(data, err) {
                  done(err, user);
                });
              } else {
                req.flash("error", "Las contraseñas no coinciden");
                return res.redirect("back");
              }
            } else {
              req.flash(
                "error",
                "La contraseña debe tener minimo 5 caracteres",
              );
              return res.redirect("back");
            }
          });
        },
        function(user, done) {
          var smtpTransport = nodemailer.createTransport({
            service: "Gmail",
            auth: {
              type: "OAuth2",
              user: "netzwerk.mty@gmail.com",
              clientId: process.env.clientId,
              clientSecret: process.env.clientSecret,
              refreshToken: process.env.refreshToken,
              accessToken: process.env.accessToken,
            },
          });
          var mailOptions = {
            to: user.email,
            from: "netzwerk.mty@gmail.com",
            subject: "Tu contraseña ha cambiado",
            text:
              "Hola,\n\n" +
              "Esta es una confirmación de que la contraseña de tu cuenta " +
              user.email +
              " ha cambiado.\n",
          };
          smtpTransport.sendMail(mailOptions, function(err) {
            req.flash("success", "Contraseña actualizada correctamente.");
            done(err);
          });
        },
      ],
      function(err) {
        res.redirect("/");
      },
    );
  });

  //Get all user
  app.get("/get-all-users", isAuthenticated, async (req, res) => {
    try {
      const usersList = await db.User.findAll({
        attributes: ["id", "email", "role", "telefono", "alertas"],
        // Optional: Order by creation date so the newest users appear first
        order: [["createdAt", "DESC"]],
      });

      // Check array length instead of just checking if it exists
      if (usersList.length === 0) {
        return res
          .status(404)
          .send({ code: "404", message: "No se encontraron usuarios" });
      }

      res.status(200).send({ code: "200", data: usersList });
    } catch (err) {
      // Log the error to your server console, but keep it hidden from the frontend
      console.error("Error fetching all users:", err);
      res.status(500).send({ code: "500", message: "Error de servidor" });
    }
  });

  //Add User
  app.post("/add-user", isAuthenticated, async (req, res) => {
    const { email, password, role, telefono, otpCode, alertas } = req.body;
    const serviceSid = process.env.TWILIO_VERIFY_SID;
    console.log(
      "Datos recibidos en el servidor para agregar usuario:",
      req.body,
    );

    if (telefono.length > 0) {
      try {
        // 1. Preguntamos a Twilio si el código es válido
        const verificationCheck = await client.verify.v2
          .services(serviceSid)
          .verificationChecks.create({ to: telefono, code: otpCode });

        // 2. Si Twilio dice que está aprobado, guardamos en la BD
        if (verificationCheck.status === "approved") {
          const userCreated = await db.User.create({
            email: email,
            password: password,
            role: role,
            telefono: telefono,
            alertas: alertas,
          });

          res
            .status(200)
            .send({ code: "200", message: "Usuario agregado exitosamente" });
        } else {
          // El código era incorrecto o ya expiró
          res.status(400).send({
            code: "400",
            message: "Código de verificación incorrecto",
          });
        }
      } catch (err) {
        console.log("Error creando usuario:", err);
        res
          .status(500)
          .send({ code: "500", message: "Error del servidor", err: err });
      }
    } else {
      try {
        const userCreated = await db.User.create({
          email: email,
          password: password,
          role: role,
          telefono: telefono,
          alertas: alertas,
        });

        res
          .status(200)
          .send({ code: "200", message: "Usuario agregado exitosamente" });
      } catch (err) {
        console.log("Error creando usuario:", err);
        res
          .status(500)
          .send({ code: "500", message: "Error del servidor", err: err });
      }
    }
  });

  //Send OTP thru Whatsapp
  app.post("/api/send-otp", isAuthenticated, async (req, res) => {
    const { telefono } = req.body;

    // Lo ideal es process.env.TWILIO_VERIFY_SID, pero usamos tu código:
    const serviceSid = process.env.TWILIO_VERIFY_SID;

    try {
      // Le pedimos a Twilio que envíe el código usando el canal 'whatsapp'
      const verification = await client.verify.v2
        .services(serviceSid)
        .verifications.create({ to: telefono, channel: "whatsapp" });

      res
        .status(200)
        .send({ code: "200", message: "Código enviado por WhatsApp" });
    } catch (error) {
      console.log("Error Twilio:", error);
      res.status(500).send({
        code: "500",
        message: "Error al enviar el código de WhatsApp",
      });
    }
  });

  //Get user by id
  app.get("/get-user/:id", isAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
      // findByPk (Find By Primary Key) is much cleaner than findOne with Op.eq
      const userStored = await db.User.findByPk(id, {
        attributes: ["id", "email", "role", "telefono", "alertas"],
      });

      if (!userStored) {
        // Changed to 404 (Not Found) which is semantically more accurate than 400
        return res
          .status(404)
          .send({ code: "404", message: "No se encontró ningún usuario" });
      }

      res.status(200).send({ code: "200", user: userStored });
    } catch (err) {
      console.error("Error fetching user:", err);
      res.status(500).send({ code: "500", message: "Error de servidor" });
    }
  });

  //Delete user by id
  app.delete("/delete-user/:id", isAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
      // Optional Security Guard: Prevent the logged-in admin from deleting themselves
      // if (req.user && req.user.id == id) {
      //   return res.status(400).send({ code: "400", message: "No puedes eliminar tu propia cuenta" });
      // }

      const userDeleted = await db.User.destroy({
        where: { id: id },
      });

      // Sequelize's destroy() returns the number of rows deleted. 0 means it wasn't found.
      if (!userDeleted) {
        return res.status(404).send({
          code: "404",
          message: "Usuario no encontrado o ya fue borrado",
        });
      }

      res
        .status(200)
        .send({ code: "200", message: "Usuario borrado exitosamente" });
    } catch (err) {
      console.error("Error deleting user:", err);
      // FIXED: Changed code to "500" so the frontend handles it as an error
      res.status(500).send({ code: "500", message: "Error de servidor" });
    }
  });

  //Edit User by id
  app.put("/update-user/:id", isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { email, password, role, telefono, otpCode, alertas } = req.body;
    const serviceSid = process.env.TWILIO_VERIFY_SID;

    try {
      // 1. Buscar al usuario actual en la BD ANTES de actualizar
      const currentUser = await db.User.findByPk(id); // O .findOne({ where: { id: id } })
      if (!currentUser) {
        return res
          .status(404)
          .send({ code: "404", message: "Usuario no encontrado" });
      }

      // 2. Verificar de forma segura si el teléfono cambió y no está vacío
      const phoneChanged = currentUser.telefono !== telefono;
      const isNewPhoneValid = telefono && telefono.trim().length > 0;

      if (phoneChanged && isNewPhoneValid) {
        // Obligar a que venga el otpCode si el teléfono cambió
        if (!otpCode) {
          return res.status(400).send({
            code: "400",
            message:
              "Se requiere un código de verificación para actualizar a un nuevo número.",
          });
        }

        // Validar con Twilio
        const check = await client.verify.v2
          .services(serviceSid)
          .verificationChecks.create({ to: telefono, code: otpCode });

        if (check.status !== "approved") {
          return res.status(400).send({
            code: "400",
            message: "Código de verificación incorrecto",
          });
        }
      }

      // 3. Construimos el objeto de actualización de forma dinámica
      let updateData = {
        email: email,
        role: role,
        telefono: telefono,
        alertas: alertas,
      };

      // Solo agregamos la contraseña al objeto si el usuario escribió una nueva
      if (password && password.trim() !== "") {
        updateData.password = password;
      }

      // 4. Actualizamos en la Base de Datos
      await db.User.update(updateData, {
        where: { id: id },
        individualHooks: true, // Súper importante para que encripte la nueva contraseña
      });

      res
        .status(200)
        .send({ code: "200", message: "Usuario actualizado exitosamente" });
    } catch (err) {
      console.log("Error en Update:", err);
      res
        .status(500)
        .send({ code: "500", message: "Error al actualizar el usuario" });
    }
  });

  //Add Part Number
  app.post(
    "/add-part-number",
    /*isAuthenticated,*/ (req, res) => {
      const {
        numero_parte,
        linea,
        izq_etiqueta,
        der_etiqueta,
        largo_etiqueta,
      } = req.body;
      if (!numero_parte || !linea) {
        res.status(200).send({
          code: "500",
          message: "Numero de parte y línea son obligatorios",
        });
      } else {
        db.Numeropt.findOne({
          where: {
            linea: {
              [Op.eq]: linea,
            },
            numero_parte: {
              [Op.eq]: numero_parte,
            },
          },
        })
          .then((foundPartNumber) => {
            if (foundPartNumber) {
              res.status(200).send({
                code: "500",
                message: "Numero de parte ya agregado anteriormente",
              });
            } else {
              db.Numeropt.create({
                numero_parte: numero_parte,
                linea: linea,
                largo_etiqueta: largo_etiqueta,
                izq_etiqueta: izq_etiqueta,
                der_etiqueta: der_etiqueta,
                largo_numero_parte: numero_parte.length,
              })
                .then((partnumberCreated) => {
                  if (!partnumberCreated) {
                    res.status(404).send({
                      code: "404",
                      message: "Numero de parte no agregado",
                    });
                  } else {
                    res.status(200).send({
                      code: "200",
                      message: "Numero de parte agregado exitosamente",
                    });
                  }
                })
                .catch((err) => {
                  res.status(500).send({
                    code: "500",
                    message: "Error del servidor",
                    err: err,
                  });
                });
            }
          })
          .catch((err) => {
            res.status(500),
              send({ code: "500", message: "Error del servidor", err: err });
          });
      }
    },
  );

  //Get Part Number by id
  app.get("/get-part-number/:id", isAuthenticated, (req, res) => {
    const { id } = req.params;
    db.Numeropt.findOne({
      where: {
        id: {
          [Op.eq]: id,
        },
      },
    })
      .then((partNumberStored) => {
        if (!partNumberStored) {
          res.status(400).send({
            code: "400",
            message: "No se encontro ningún numero de parte",
          });
        } else {
          res.status(200).send({ code: "200", partNumber: partNumberStored });
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({ code: "500", message: "Error de servidor" });
      });
  });

  //Get All Part Numbers
  app.get("/get-all-part-numbers", isAuthenticated, (req, res) => {
    db.Numeropt.findAll({
      order: [["numero_parte", "ASC"]],
    })
      .then((partNumberList) => {
        if (!partNumberList) {
          res.send({
            message: "No se encontraron numeros de parte",
            code: "404",
          });
        } else {
          res.send({ data: partNumberList, code: "200" });
        }
      })
      .catch((err) => {
        res.send({ message: "Error de servidor", code: "500", err: err });
      });
  });

  //Delete Part Number by id
  app.delete("/delete-part-number/:id", isAuthenticated, (req, res) => {
    const { id } = req.params;
    db.Numeropt.destroy({
      where: {
        id: {
          [Op.eq]: id,
        },
      },
    })
      .then((partNumberDeleted) => {
        if (!partNumberDeleted) {
          res.status(404).send({
            code: "404",
            message: "No se borro ningún numero de parte",
          });
        } else {
          res.status(200).send({
            code: "200",
            message: "Numero de parte borrado exitosamente",
          });
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({ code: "200", message: "Error de servidor" });
      });
  });

  //Edit Part Number by id
  app.put("/update-part-number/:id", isAuthenticated, (req, res) => {
    const { id } = req.params;
    const { numero_parte, linea } = req.body;
    db.Numeropt.update(
      {
        numero_parte: numero_parte,
        linea: linea,
        largo_etiqueta: largo_etiqueta,
        izq_etiqueta: izq_etiqueta,
        der_etiqueta: der_etiqueta,
        largo_numero_parte: numero_parte.length,
      },
      {
        where: {
          id: id,
        },
      },
    )
      .then((partNumberStore) => {
        // console.log(userStore);
        if (partNumberStore[0] === 0) {
          res.status(404).send({
            message: "Numero de parte no encontrado",
            code: "404",
          });
        } else {
          res.status(200).send({
            message: "Numero de parte actualizado correctamente",
            code: "200",
          });
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({ code: "500", message: "Error del servidor" });
      });
  });

  //Add Line
  app.post("/add-line", isAuthenticated, LineController.addLine);

  // Get Line by id
  app.get("/get-line/:id", isAuthenticated, LineController.getLine);

  //Get All Lines
  app.get("/get-all-lines", isAuthenticated, LineController.getAllLines);

  //Delete Line by id
  app.delete("/delete-line/:id", isAuthenticated, LineController.deleteLine);

  //Edit Line by id
  app.put("/update-line/:id", isAuthenticated, LineController.editLine);

  //Add Serial FA-1
  app.post("/api/fa1/serial", Fa1Controller.addSerial);

  // ⭐ NUEVA RUTA MAESTRA PARA DASHBOARD:
  app.get("/api/fa11/dashboard-master", isAuthenticated,Fa11Controller.getDashboardMaster);

  //Find the last six pieces builts
  app.get("/api/fa1/all/tabla/seisetiquetas", Fa1Controller.getLastSixLabels);

  app.get(
    "/fa1/produccionhora/:fechainicial/:fechafinal",
    Fa1Controller.productionPerHour,
  );

  app.post("/fa1/reporte", Fa1Controller.productionReport);

  //Add Serial FA-9
  app.post("/api/fa9/serial", Fa9Controller.addSerial);

  // ⭐ NUEVA RUTA MAESTRA PARA DASHBOARD:

  app.get("/api/fa9/dashboard-master", isAuthenticated, Fa9Controller.getDashboardMaster);

  //Find the last six pieces builts
  app.get("/api/fa9/all/tabla/seisetiquetas", Fa9Controller.getLastSixLabels);

  app.get(
    "/fa9/produccionhora/:fechainicial/:fechafinal",
    Fa9Controller.productionPerHour,
  );

  app.post("/fa9/reporte", Fa9Controller.productionReport);

  //Add Serial FA-11
  app.post("/api/fa11/serial", Fa11Controller.addSerial);

  //Find the last six pieces builts
  app.get("/api/fa11/all/tabla/seisetiquetas", Fa11Controller.getLastSixLabels);

  app.get(
    "/fa11/produccionhora/:fechainicial/:fechafinal",
    Fa11Controller.productionPerHour,
  );

  app.post("/fa11/reporte", Fa11Controller.productionReport);

  //Add Serial FA-13
  app.post("/api/fa13/serial", Fa13Controller.addSerial);

  // ⭐ NUEVA RUTA MAESTRA PARA DASHBOARD FA-13:
  app.get("/api/fa13/dashboard-master", isAuthenticated, Fa13Controller.getDashboardMaster);

  //Find the last six pieces builts
  app.get("/api/fa13/all/tabla/seisetiquetas", Fa13Controller.getLastSixLabels);

  app.get(
    "/fa13/produccionhora/:fechainicial/:fechafinal",
    Fa13Controller.productionPerHour,
  );

  app.post("/fa13/reporte", Fa13Controller.productionReport);

  //Search for a serial
  app.get("/search-serial/:linea/:serial", async (req, res) => {
    const { linea, serial } = req.params;
    db[linea]
      .findAll({
        where: {
          serial: { [Op.like]: `%${serial}%` },
        },
      })
      .then((serialStored) => {
        if (!serialStored) {
          res.status(400).send({
            code: "400",
            message: "No se encontro ningún numero de parte",
          });
        } else {
          res.status(200).send({ code: "200", serialData: serialStored });
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({ code: "500", message: "Error de servidor" });
      });
  });

  //Twilio Webhook
  app.post("/sms", handleTwilioMessage);

  //Actualizar alertas de usuario
  app.put(
    "/api/perfil/alertas",
    isAuthenticated,
    PerfilController.updateAlertas,
  );

  //Update Password by user
  app.put(
    "/api/perfil/password",
    isAuthenticated,
    PerfilController.updatePassword,
  );

  //Solicitar Codigo para cambiar telefono
  app.post(
    "/api/perfil/solicitar-telefono",
    isAuthenticated,
    PerfilController.solicitarTelefono,
  );

  //Verificar codigo para cambiar telefono y actualizarlo
  app.post(
    "/api/perfil/verificar-telefono",
    isAuthenticated,
    PerfilController.verificarTelefono,
  );
};
