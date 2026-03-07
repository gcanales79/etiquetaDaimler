var db = require("../models");
var isAuthenticated = require("../config/middleware/isAuthenticated");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

module.exports = function(app) {
  // Load index page
  app.get("/", function(req, res) {
    res.status(200);
    console.log(req.flash("message"));
    db.Daimler.findAll({
      limit: 6,
      order: [["createdAt", "DESC"]],
    }).then(function(dbDaimler) {
      let jsfile = [{ jsfile: "/js/toastr.js" }, { jsfile: "/js/login.js" }];
      res.render("index", {
        layout:"blank",
        title: "home",
        jsfile: jsfile,
        active_home: {
          Register: true,
        },
        etiqueta: dbDaimler,
      });
    });
  });

  //Profile Home Page
  // Ruta para ver el perfil (asegúrate de que tenga isAuthenticated)
  app.get("/perfil", isAuthenticated, async (req, res) => {
    // Le pasamos a Handlebars los datos del usuario logueado (req.user)
    try {
      // 1. Vamos a la BD a buscar la información más reciente de este usuario
      const usuarioFresco = await db.User.findByPk(req.user.id);

      // 2. Extraemos los datos puros (.get({ plain: true })) para que Handlebars los pueda leer sin problemas de seguridad
      const datosParaHandlebars = usuarioFresco.get({ plain: true });
      //console.log(datosParaHandlebars);

      if (datosParaHandlebars.role !== "admin") {
        res.status(200);
        let jsfile = [
          { jsfile: "/js/perfil.js" },
          {
            jsfile:
              "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/intlTelInput.min.js",
          },
        ];
        res.render("perfil", {
          title: "perfil",
          active_perfil: {
            Register: true,
          },
          jsfile: jsfile,
          user: datosParaHandlebars,
        });
      } else {
        return res.render("404");
      }
    } catch (error) {
      console.error("Error al cargar el perfil:", error);
      res
        .status(500)
        .send(
          "Hubo un error al cargar tu perfil. Por favor, intenta de nuevo más tarde.",
        );
    }
  });

  //Get Production Home Page
  app.get("/produccion", isAuthenticated, function(req, res) {
    if (
      req.user.role === "admin" ||
      req.user.role === "produccion" ||
      req.user.role === "inspector"
    ) {
      res.status(200);
      /*let jsfile = [{jsfile:"https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.js"},
          { jsfile: "/js/label.js" }];*/
      res.render("homeproduccion", {
        title: "produccion",
        active_produccion: {
          Register: true,
        },
        /*jsfile: jsfile,*/
      });
    } else {
      res.render("404");
    }
  });

  //Get Mercedes report page
  app.get("/produccion/daimler", isAuthenticated, function(req, res) {
    //console.log(req.user)
    if (
      req.user.role === "admin" ||
      req.user.role === "produccion" ||
      req.user.role === "inspector"
    ) {
      res.status(200);
      db.Daimler.findAll({
        attributes:["id","serial","createdAt"],
        limit: 6,
        order: [["createdAt", "DESC"]],
        raw:true,
        nest:true
      }).then(function(dbDaimler) {
        let jsfile = [
          {
            jsfile:
              "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.js",
          },
          { jsfile: "/js/label.js" },
        ];
        res.render("produccion", {
          title: "produccion",
          active_produccion: {
            Register: true,
          },
          etiqueta: dbDaimler,
          jsfile: jsfile,
        });
      }).catch(err=>{
        console.log("Error al cargar la página de producción:", err);
        res.status("500").render("404");
      });
    } else {
      res.render("404");
    }
  });

  //Get FA-1
  app.get("/produccion/fa1", isAuthenticated, function(req, res) {
    //console.log(req.user)
    if (
      req.user.role === "admin" ||
      req.user.role === "produccion" ||
      req.user.role === "inspector"
    ) {
      res.status(200);
      db.Fa1.findAll({
        limit: 6,
        order: [["createdAt", "DESC"]],
      }).then(function(response) {
        let jsfile = [
          {
            jsfile:
              "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.js",
          },
          { jsfile: "/js/label_fa1.js" },
        ];
        res.render("produccionfa1", {
          title: "Produccion FA-1",
          active_produccion: {
            Register: true,
          },
          etiqueta: response,
          jsfile: jsfile,
        });
      });
    } else {
      res.render("404");
    }
  });

  //Get FA-9
  app.get("/produccion/fa9", isAuthenticated, function(req, res) {
    //console.log(req.user)
    if (
      req.user.role === "admin" ||
      req.user.role === "produccion" ||
      req.user.role === "inspector"
    ) {
      res.status(200);
      db.Fa9.findAll({
        limit: 6,
        order: [["createdAt", "DESC"]],
      }).then(function(response) {
        let jsfile = [
          {
            jsfile:
              "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.js",
          },
          { jsfile: "/js/label_fa9.js" },
        ];
        res.render("produccionfa9", {
          title: "Produccion FA-9",
          active_produccion: {
            Register: true,
          },
          etiqueta: response,
          jsfile: jsfile,
        });
      });
    } else {
      res.render("404");
    }
  });

  //Get FA-11
  app.get("/produccion/fa11", isAuthenticated, function(req, res) {
    //console.log(req.user)
    if (
      req.user.role === "admin" ||
      req.user.role === "produccion" ||
      req.user.role === "inspector"
    ) {
      res.status(200);
      db.Fa11.findAll({
        limit: 6,
        order: [["createdAt", "DESC"]],
      }).then(function(response) {
        let jsfile = [
          {
            jsfile:
              "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.js",
          },
          { jsfile: "/js/label_fa11.js" },
        ];
        res.render("produccionfa11", {
          title: "Produccion FA-11",
          active_produccion: {
            Register: true,
          },
          etiqueta: response,
          jsfile: jsfile,
        });
      });
    } else {
      res.render("404");
    }
  });

  //Get FA-13
  app.get("/produccion/fa13", isAuthenticated, function(req, res) {
    //console.log(req.user)
    if (
      req.user.role === "admin" ||
      req.user.role === "produccion" ||
      req.user.role === "inspector"
    ) {
      res.status(200);
      db.Fa13.findAll({
        limit: 6,
        order: [["createdAt", "DESC"]],
      }).then(function(response) {
        let jsfile = [
          {
            jsfile:
              "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.js",
          },
          { jsfile: "/js/label_fa13.js" },
        ];
        res.render("produccionfa13", {
          title: "Produccion FA-13",
          active_produccion: {
            Register: true,
          },
          etiqueta: response,
          jsfile: jsfile,
        });
      });
    } else {
      res.render("404");
    }
  });

  //Esto sirve para cambiar el CSS cuando entras a consulta, con el actvie_consulta
  app.get("/consulta", isAuthenticated, function(req, res) {
    if (req.user.role === "admin") {
      res.status(200);
      let jsfile = [{ jsfile: "/js/consulta.js" }];
      let jsarchivo = [{ jsarchivo: "https://cdn.datatables.net/1.10.20/js/jquery.dataTables.js" }];
      res.render("consulta", {
        title: "consulta",
        active_consulta: {
          Register: true,
        },
        jsfile: jsfile,
        jsarchivo: jsarchivo,
        serialBuscado:req .params.serie,
      });
    } else {
      res.render("404");
    }
  });

  //Para cargar la pagina de registro manual
  app.get("/pruebas", isAuthenticated, function(req, res) {
    if (req.user.role === "admin" || req.user.role === "produccion") {
      res.status(200);
      let jsfile = [{ jsfile: "/js/pruebas.js" }];
      res.render("pruebas", {
        title: "pruebas",
        active_pruebas: {
          Register: true,
        },
        jsfile: jsfile,
      });
    }
  });

  //Este te permite ver los datos de una etiqueta en particular
  app.get("/consulta/:serie", isAuthenticated, function(req, res) {
    if (req.user.role === "admin") {
      db.Daimler.findAll({
        where: {
          [Op.or]: {
            serial: req.params.serie,
            etiqueta_remplazada: req.params.serie,
          },
        },
      }).then(function(dbDaimler) {
        let jsfile = [{ jsfile: "/js/consulta.js" }];
        let jsarchivo = [{ jsarchivo: "https://cdn.datatables.net/1.10.20/js/jquery.dataTables.js" }];
        res.render("consulta", {
          title: "consulta",
          active_consulta: {
            Register: true,
          },
          jsfile: jsfile,
          jsarchivo: jsarchivo,
          etiqueta: dbDaimler.map((dbDaimler) => dbDaimler.toJSON()),
        });
        //console.log(dbDaimler);
      });
    } else {
      res.render("404");
    }
  });

  //Cargar la tabla de registros
  app.get("/tabla/:registros", isAuthenticated, function(req, res) {
    if (req.user.role === "admin") {
      db.Daimler.findAll({
        limit: parseInt(req.params.registros),
        order: [["createdAt", "DESC"]],
      }).then(function(dbDaimler) {
        let jsfile = [{ jsfile: "/js/tabla.js" }];
        let jsarchivo = [
          {
            jsarchivo:
              "https://cdn.datatables.net/1.10.20/js/jquery.dataTables.js",
          },
        ];
        res.render("tabla", {
          title: "tabla",
          active_consulta: {
            Register: true,
          },
          jsfile: jsfile,
          jsarchivo: jsarchivo,
          etiqueta: dbDaimler.map((dbDaimler) => dbDaimler.toJSON()),
          cantidadBuscada: req.params.registros
        });
        //console.log(dbDaimler)
      });
    } else {
      res.render(404);
    }
  });

  // Carga la pagina tabla
  app.get("/tabla", isAuthenticated, function(req, res) {
    if (req.user.role === "admin") {
      res.status(200);
      let jsfile = [{ jsfile: "/js/tabla.js" }];
      let jsarchivo = [
        {
          jsarchivo:
            "https://cdn.datatables.net/1.10.20/js/jquery.dataTables.js",
        },
      ];
      res.render("tabla", {
        title: "tabla",
        active_consulta: {
          Register: true,
        },
        jsfile: jsfile,
        jsarchivo: jsarchivo,
      });
    } else {
      res.render("404");
    }
  });

  // Carga la pagina para dar de alta usuarios
  app.get("/alta", isAuthenticated, function(req, res) {
    //console.log(res.locals.sessionFlash)
    //let message=res.locals.sessionFlash
    //console.log(message)
    let jsfile = [
      { jsfile: "/js/toastr.js" },
      { jsfile: "/js/pagination.js" },
      { jsfile: "/js/alta.js" },
      {jsfile: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/intlTelInput.min.js"},
    ];
    if (req.user.role === "admin") {
      //console.log(res.locals.sessionFlash)
      //res.status(200);
      res.render("alta", {
        // sessionFlash: message,
        title: "alta",
        active_consulta: {
          Register: true,
        },
        jsfile: jsfile,
      });
    } else {
      res.render("404");
    }
  });

  //Carga la pagina para dar de alta los NP
  app.get("/alta-numero-de-parte", isAuthenticated, function(req, res) {
    //console.log(res.locals.sessionFlash)
    //let message=res.locals.sessionFlash
    //console.log(message)
    let jsfile = [
      { jsfile: "/js/toastr.js" },
      { jsfile: "/js/pagination.js" },
      { jsfile: "/js/alta_numeropt.js" },
    ];
    if (req.user.role === "admin") {
      //console.log(res.locals.sessionFlash)
      //res.status(200);
      res.render("alta_numero", {
        // sessionFlash: message,
        title: "Alta de Numero de Parte",
        active_consulta: {
          Register: true,
        },
        jsfile: jsfile,
      });
    } else {
      res.render("404");
    }
  });

  // Carga la pagina para buscar el serial

  app.get("/buscar-serial", isAuthenticated, function(req, res) {
    //console.log(res.locals.sessionFlash)
    //let message=res.locals.sessionFlash
    //console.log(message)
    let jsfile = [
      { jsfile: "/js/toastr.js" },
      { jsfile: "/js/pagination.js" },
      { jsfile: "/js/buscar_serial.js" },
    ];
    if (req.user.role === "admin") {
      //console.log(res.locals.sessionFlash)
      //res.status(200);
      res.render("buscar_serial", {
        // sessionFlash: message,
        title: "Buscar Serial",
        active_consulta: {
          Register: true,
        },
        jsfile: jsfile,
      });
    } else {
      res.render("404");
    }
  });

  //Carga la pagina para dar de alta las lineas
  app.get("/alta-linea", isAuthenticated, function(req, res) {
    //console.log(res.locals.sessionFlash)
    //let message=res.locals.sessionFlash
    //console.log(message)
    let jsfile = [
      { jsfile: "/js/toastr.js" },
      { jsfile: "/js/pagination.js" },
      { jsfile: "/js/alta_linea.js" },
    ];
    if (req.user.role === "admin") {
      //console.log(res.locals.sessionFlash)
      //res.status(200);
      res.render("alta_linea", {
        // sessionFlash: message,
        title: "Alta de Línea",
        active_consulta: {
          Register: true,
        },
        jsfile: jsfile,
      });
    } else {
      res.render("404");
    }
  });

  // Load example page and pass in an example by id
  app.get("/cambiar", isAuthenticated, function(req, res) {
    res.sendFile(path.join(__dirname, ".cambiar.html"));
  });

  //Load GP12 inspection page
  app.get("/gp12", isAuthenticated, function(req, res) {
    //console.log(req.user)
    if (req.user.role === "admin" || req.user.role === "inspector") {
      res.status(200);
      let jsfile = [{ jsfile: "/js/gp12.js" }];
      res.render("gp12", {
        title: "gpq2",
        active_gp12: {
          Register: true,
        },
        jsfile: jsfile,
      });
    } else {
      res.render("404");
    }
  });

  //Cambiar contraseña

  app.get("/reset/:token", function(req, res) {
    db.User.findOne({
      where: {
        resetPasswordToken: req.params.token,
        resetPasswordExpire: {
          [Op.gt]: Date.now(),
        },
      },
    }).then((user) => {
      if (!user) {
        req.flash(
          "error",
          "El token para restablecer la contraseña se ha vencido",
        );
        return res.redirect("/");
      }
      res.render("reset", {
        token: req.params.token,
      });
    });
  });

  // Render 404 page for any unmatched routes
  app.get("*", function(req, res) {
    res.render("404");
  });
};
