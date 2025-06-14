var db = require("../models");
var isAuthenticated = require("../config/middleware/isAuthenticated");
const Sequelize = require('sequelize');
const Op = Sequelize.Op;



module.exports = function (app) {
  // Load index page
  app.get("/", function (req, res) {
    res.status(200);
    console.log(req.flash("message"))
    db.Daimler.findAll({
      limit: 6,
      order: [["createdAt", "DESC"]],

    })
      .then(function (dbDaimler) {
        let jsfile = [{jsfile:"/js/toastr.js"},{ jsfile: "/js/login.js" }];
        res.render("index", {
          title: "home",
          jsfile: jsfile,
          active_home: {
            Register: true,
          },
          etiqueta: dbDaimler
        });
      });

  });

  //Get Production Home Page
  app.get("/produccion",isAuthenticated,function(req,res){
    if (req.user.role === "admin" || req.user.role === "produccion" || req.user.role ==="inspector") {
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
        
    }
    else{
      res.render("404")
    }
  })


  //Get Mercedes report page 
  app.get("/produccion/daimler", isAuthenticated, function (req, res) {
    //console.log(req.user)
    if (req.user.role === "admin" || req.user.role === "produccion" || req.user.role ==="inspector") {
      res.status(200);
      db.Daimler.findAll({
        limit: 6,
        order: [["createdAt", "DESC"]],

      })
        .then(function (dbDaimler) {
          let jsfile = [{jsfile:"https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.js"},
          { jsfile: "/js/label.js" }];
          res.render("produccion", {
            title: "produccion",
            active_produccion: {
              Register: true,
            },
            etiqueta: dbDaimler,
            jsfile: jsfile,
            
          });
        });
    }
    else{
      res.render("404")
    }
  });

  //Get FA-1
  app.get("/produccion/fa1", isAuthenticated, function (req, res) {
    //console.log(req.user)
    if (req.user.role === "admin" || req.user.role === "produccion" || req.user.role ==="inspector") {
      res.status(200);
      db.Fa1.findAll({
        limit: 6,
        order: [["createdAt", "DESC"]],

      })
        .then(function (response) {
          let jsfile = [{jsfile:"https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.js"},
          { jsfile: "/js/label_fa1.js" }];
          res.render("produccionfa1", {
            title: "Produccion FA-1",
            active_produccion: {
              Register: true,
            },
            etiqueta: response,
            jsfile: jsfile,
            
          });
        });
    }
    else{
      res.render("404")
    }
  });

  //Get FA-9
  app.get("/produccion/fa9", isAuthenticated, function (req, res) {
    //console.log(req.user)
    if (req.user.role === "admin" || req.user.role === "produccion" || req.user.role ==="inspector") {
      res.status(200);
      db.Fa9.findAll({
        limit: 6,
        order: [["createdAt", "DESC"]],

      })
        .then(function (response) {
          let jsfile = [{jsfile:"https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.js"},
          { jsfile: "/js/label_fa9.js" }];
          res.render("produccionfa9", {
            title: "Produccion FA-9",
            active_produccion: {
              Register: true,
            },
            etiqueta: response,
            jsfile: jsfile,
            
          });
        });
    }
    else{
      res.render("404")
    }
  });

   //Get FA-11
   app.get("/produccion/fa11", isAuthenticated, function (req, res) {
    //console.log(req.user)
    if (req.user.role === "admin" || req.user.role === "produccion" || req.user.role ==="inspector") {
      res.status(200);
      db.Fa11.findAll({
        limit: 6,
        order: [["createdAt", "DESC"]],

      })
        .then(function (response) {
          let jsfile = [{jsfile:"https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.js"},
          { jsfile: "/js/label_fa11.js" }];
          res.render("produccionfa11", {
            title: "Produccion FA-11",
            active_produccion: {
              Register: true,
            },
            etiqueta: response,
            jsfile: jsfile,
            
          });
        });
    }
    else{
      res.render("404")
    }
  });

     //Get FA-13
     app.get("/produccion/fa13", isAuthenticated, function (req, res) {
      //console.log(req.user)
      if (req.user.role === "admin" || req.user.role === "produccion" || req.user.role ==="inspector") {
        res.status(200);
        db.Fa13.findAll({
          limit: 6,
          order: [["createdAt", "DESC"]],
  
        })
          .then(function (response) {
            let jsfile = [{jsfile:"https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.js"},
            { jsfile: "/js/label_fa13.js" }];
            res.render("produccionfa13", {
              title: "Produccion FA-13",
              active_produccion: {
                Register: true,
              },
              etiqueta: response,
              jsfile: jsfile,
              
            });
          });
      }
      else{
        res.render("404")
      }
    });


  //Esto sirve para cambiar el CSS cuando entras a consulta, con el actvie_consulta
  app.get("/consulta", isAuthenticated, function (req, res) {
    if (req.user.role === "admin") {
      res.status(200);
      let jsfile = [{ jsfile: "/js/consulta.js" }];
      res.render("consulta", {
        title: "consulta",
        active_consulta: {
          Register: true,
        },
        jsfile: jsfile,
      })
    }
    else{
      res.render("404")
    }
  });

  //Para cargar la pagina de registro manual
  app.get("/pruebas",isAuthenticated,function(req,res){
    if(req.user.role === "admin" || req.user.role === "produccion"){
      res.status(200);
      let jsfile = [{ jsfile: "/js/pruebas.js" }];
      res.render("pruebas",{
        title:"pruebas",
        active_pruebas: {
          Register:true,
        },
        jsfile: jsfile,
      })
    }
  })

  //Este te permite ver los datos de una etiqueta en particular
  app.get("/consulta/:serie", isAuthenticated, function (req, res) {
    if (req.user.role === "admin") {
      db.Daimler.findAll({

        where: {
          [Op.or]: {
            serial: req.params.serie,
            etiqueta_remplazada: req.params.serie,
          }
        },

      })
        .then(function (dbDaimler) {
          let jsfile = [{ jsfile: "/js/consulta.js" }];
          res.render("consulta", {
            title: "consulta",
            active_consulta: {
              Register: true,
            },
            jsfile: jsfile,
            etiqueta: dbDaimler.map(dbDaimler=>dbDaimler.toJSON()),
          });
          //console.log(dbDaimler);
        });
    }
    else{
      res.render("404")
    }
  });

  //Cargar la tabla de registros
  app.get("/tabla/:registros", isAuthenticated, function (req, res) {
    if (req.user.role === "admin") {
      db.Daimler.findAll({
        limit: parseInt(req.params.registros),
        order: [["createdAt", "DESC"]],

      })
        .then(function (dbDaimler) {
          let jsfile = [{ jsfile: "/js/tabla.js" }];
          let jsarchivo=[{jarchivo:"https://cdn.datatables.net/1.10.20/js/jquery.dataTables.js"}]
          res.render("tabla", {
            title: "tabla",
            active_consulta: {
              Register: true,
            },
            jsfile: jsfile,
            jsarchivo:jsarchivo,
            etiqueta: dbDaimler.map(dbDaimler=>dbDaimler.toJSON()),

          });
          //console.log(dbDaimler)
        });
    }
    else{
      res.render(404)
    }
  });

  // Carga la pagina tabla
  app.get("/tabla", isAuthenticated, function (req, res) {
    if (req.user.role === "admin") {
      res.status(200);
      let jsfile = [{ jsfile: "/js/tabla.js" }];
      let jsarchivo=[{jsarchivo:"https://cdn.datatables.net/1.10.20/js/jquery.dataTables.js"}]
      res.render("tabla", {
        title: "tabla",
        active_consulta: {
          Register: true,
        },
        jsfile: jsfile,
        jsarchivo: jsarchivo
      });
    }
    else{
      res.render("404")
    }
  });

  // Carga la pagina para dar de alta usuarios
  app.get("/alta", isAuthenticated, function (req, res) {
    //console.log(res.locals.sessionFlash)
    //let message=res.locals.sessionFlash
    //console.log(message)
    let jsfile = [{jsfile:"/js/toastr.js"},{jsfile:"/js/pagination.js"},{ jsfile: "/js/alta.js" }];
    if(req.user.role==="admin"){
      //console.log(res.locals.sessionFlash)
    //res.status(200);
    res.render("alta", {
      // sessionFlash: message,
      title: "alta",
      active_consulta: {
        Register: true,
      },
      jsfile:jsfile,
      
      
    });
  }
  else{
    res.render("404")
  }
  });

  //Carga la pagina para dar de alta los NP
    app.get("/alta-numero-de-parte", isAuthenticated, function (req, res) {
      //console.log(res.locals.sessionFlash)
      //let message=res.locals.sessionFlash
      //console.log(message)
      let jsfile = [{jsfile:"/js/toastr.js"},{jsfile:"/js/pagination.js"},{ jsfile: "/js/alta_numeropt.js" }];
      if(req.user.role==="admin"){
        //console.log(res.locals.sessionFlash)
      //res.status(200);
      res.render("alta_numero", {
        // sessionFlash: message,
        title: "Alta de Numero de Parte",
        active_consulta: {
          Register: true,
        },
        jsfile:jsfile,
        
        
      });
    }
    else{
      res.render("404")
    }
    });

  // Carga la pagina para buscar el serial

  app.get("/buscar-serial", isAuthenticated, function (req, res) {
    //console.log(res.locals.sessionFlash)
    //let message=res.locals.sessionFlash
    //console.log(message)
    let jsfile = [{jsfile:"/js/toastr.js"},{jsfile:"/js/pagination.js"},{ jsfile: "/js/buscar_serial.js" }];
    if(req.user.role==="admin"){
      //console.log(res.locals.sessionFlash)
    //res.status(200);
    res.render("buscar_serial", {
      // sessionFlash: message,
      title: "Buscar Serial",
      active_consulta: {
        Register: true,
      },
      jsfile:jsfile,
      
      
    });
  }
  else{
    res.render("404")
  }
  }
  );


  //Carga la pagina para dar de alta las lineas
  app.get("/alta-linea", isAuthenticated, function (req, res) {
    //console.log(res.locals.sessionFlash)
    //let message=res.locals.sessionFlash
    //console.log(message)
    let jsfile = [{jsfile:"/js/toastr.js"},{jsfile:"/js/pagination.js"},{ jsfile: "/js/alta_linea.js" }];
    if(req.user.role==="admin"){
      //console.log(res.locals.sessionFlash)
    //res.status(200);
    res.render("alta_linea", {
      // sessionFlash: message,
      title: "Alta de Línea",
      active_consulta: {
        Register: true,
      },
      jsfile:jsfile,
      
      
    });
  }
  else{
    res.render("404")
  }
  });



  // Load example page and pass in an example by id
  app.get("/cambiar", isAuthenticated, function (req, res) {
    res.sendFile(path.join(__dirname, ".cambiar.html"));
  });

  //Load GP12 inspection page
  app.get("/gp12", isAuthenticated, function (req, res) {
    //console.log(req.user)
    if(req.user.role==="admin" || req.user.role==="inspector"){
    res.status(200);
        let jsfile = [{ jsfile: "/js/gp12.js" }];
        res.render("gp12", {
          title: "gpq2",
          active_gp12: {
            Register: true,
          },
          jsfile: jsfile,
        });
    
    }
    else{
      res.render("404")
    }
  });

  //Cambiar contraseña

  app.get("/reset/:token",function (req,res){
    db.User.findOne({
      where:{
        resetPasswordToken:req.params.token,
        resetPasswordExpire:{
          [Op.gt]:Date.now()
        }

      }
    }).then(user=>{
      if(!user){
        req.flash("error","El token para restablecer la contraseña se ha vencido")
        return res.redirect("/")
      }
      res.render("reset",{
        token:req.params.token
      })
    })
  })


  // Render 404 page for any unmatched routes
  app.get("*", function (req, res) {
    res.render("404");
  });




}
