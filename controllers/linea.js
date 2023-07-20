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
  function deleteLine (req, res) {
    const { id } = req.params;
    db.Linea.destroy({
      where: {
        id: {
          [Op.eq]: id,
        },
      },
    })
      .then((lineDeleted) => {
        if (!lineDeleted) {
          res.status(404).send({ code: "404", message: "No se borro ninguna línea" });
        } else {
          res
            .status(200)
            .send({ code: "200", message: "Línea borrada exitosamente" });
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({ code: "200", message: "Error de servidor" });
      });
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