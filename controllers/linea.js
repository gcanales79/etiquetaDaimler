var db = require("../models");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
 
 //Add Line
function addLine (req, res) {
      const { linea } = req.body;
      if ( !linea) {
        res.status(200).send({
          code: "500",
          message: "El nombre de la línea es obligatorio",
        });
      } else {
        db.Linea.findOne({
          where: {
            linea: {
              [Op.eq]: linea,
            },
          },
        }).then((foundLinea) => {
          if (foundLinea) {
            res
              .status(200)
              .send({
                code: "500",
                message: "Línea ya fue agregada anteriormente",
              });
          } else {
            db.Linea.create({
              linea: linea,
            })
              .then((lineaCreated) => {
                if (!lineaCreated) {
                  res
                    .status(404)
                    .send({
                      code: "404",
                      message: "Línea no agregada",
                    });
                } else {
                  res.status(200).send({
                    code: "200",
                    message: "Línea agregada exitosamente",
                  });
                }
              })
              .catch((err) => {
                res
                  .status(500)
                  .send({
                    code: "500",
                    message: "Error del servidor",
                    err: err,
                  });
              });
          }
        })
        .catch((err)=>{
          res.status(500),send({code:"500", message:"Error del servidor", err:err})
        });
      }
    }


  //Get Line by id
  function getLine (req, res) {
      const { id } = req.params;
      db.Linea.findOne({
        where: {
          id: {
            [Op.eq]: id,
          },
        },
      })
        .then((lineStored) => {
          if (!lineStored) {
            res.status(400).send({
              code: "400",
              message: "No se encontro ninguna línea",
            });
          } else {
            res.status(200).send({ code: "200", line: lineStored });
          }
        })
        .catch((err) => {
          console.log(err);
          res.status(500).send({ code: "500", message: "Error de servidor" });
        });
    }

  //Get All Lines
   function getAllLines(req, res)  {
    db.Linea.findAll({
      order:[["linea","ASC"]]
    })
      .then((lineList) => {
        if (!lineList) {
          res.send({ message: "No se encontraron líneas", code: "404" });
        } else {
          res.send({ data: lineList, code: "200" });
        }
      })
      .catch((err) => {
        res.send({ message: "Error de servidor", code: "500", err: err });
      });
  }

  //Delete Part Number by id
  // Delete Line by id and update Users' alerts
  async function deleteLine (req, res) {
    const { id } = req.params;

    try {
      // 1. Buscamos la línea ANTES de borrarla para saber cómo se llamaba
      const lineaABorrar = await db.Linea.findOne({
        where: { id: { [Op.eq]: id } }
      });

      if (!lineaABorrar) {
        return res.status(404).send({ code: "404", message: "No se encontró ninguna línea" });
      }

      // 2. Limpiamos el nombre exactamente igual que en el frontend (ej. "FA-1" -> "fa1")
      const alertaLimpia = lineaABorrar.linea.toLowerCase().replace(/-/g, "");

      // 3. Borramos la línea de la base de datos
      await db.Linea.destroy({
        where: { id: { [Op.eq]: id } }
      });

      // 4. Buscamos a TODOS los usuarios que tengan esta línea en sus alertas
      const usuariosAfectados = await db.User.findAll({
        where: {
          alertas: {
            [Op.like]: `%${alertaLimpia}%` // Busca si "fa1" existe dentro del string
          }
        }
      });

      // 5. Iteramos sobre cada usuario para quitarle la alerta
      for (let user of usuariosAfectados) {
        if (user.alertas) {
          // Convertimos "fa1,fa2,fa9" a un arreglo: ["fa1", "fa2", "fa9"]
          let alertasArray = user.alertas.split(",");
          
          // Filtramos el arreglo quitando la que acabamos de borrar
          alertasArray = alertasArray.filter(alerta => alerta !== alertaLimpia);
          
          // Volvemos a unir lo que quedó: "fa2,fa9"
          let nuevasAlertas = alertasArray.join(",");

          // Actualizamos al usuario silenciosamente
          await db.User.update(
            { alertas: nuevasAlertas },
            { where: { id: user.id } }
          );
        }
      }

      // Finalizamos con éxito
      return res.status(200).send({ 
        code: "200", 
        message: "Línea borrada y alertas de usuarios actualizadas exitosamente" 
      });

    } catch (err) {
      console.log("Error al borrar línea o actualizar usuarios:", err);
      return res.status(500).send({ code: "500", message: "Error de servidor" });
    }
  }

  //Edit Part Number by id
  function editLine (req, res)  {
    const { id } = req.params;
    const { linea } = req.body;
    db.Linea.update(
      {
        linea:linea,
      },
      {
        where: {
          id: id,
        },
      }
    )
      .then((lineStore) => {
        // console.log(userStore);
        if (lineStore[0] === 0) {
          res.status(404).send({
            message: "Línea no encontrada",
            code: "404",
          });
        } else {
          res.status(200).send({
            message: "Línea actualizada correctamente",
            code: "200",
          });
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({ code: "500", message: "Error del servidor" });
      });
  }

  module.exports={
    addLine,
    getLine,
    getAllLines,
    deleteLine,
    editLine

  }