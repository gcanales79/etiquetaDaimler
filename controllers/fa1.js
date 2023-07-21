var db = require("../models");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const moment = require("moment-timezone");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);


//Add a new label
function addSerial(req,res){
    const{serial}=req.body;
    let numero_parte=serial.substring(serial.indexOf("P")+1,serial.indexOf("P")+9)
    //console.log(numero_parte);
    //console.log(-1*serial.length+14)
  //!Aqui iria desde donde se quiere tomar numero de serie a partir de la derecha
    let numero_serie=serial.slice(-14)
    //console.log(`El numeor de serie es ${numero_serie}`);
    db.Numeropt.findOne({
        where:{
            linea:{
                [Op.eq]:"FA-1",
            },
            numero_parte:{
                [Op.eq]:numero_parte
            }
        }
    }).then((response)=>{
        if(!response){
            res.send({code:"401", message:"El número de parte no esta dado de alta en la línea"})
        }else{
            //res.status(200).send({code:"200", message:"Número encontrado" })
            db.Fa1.create({
                serial:serial,
                numero_parte:numero_parte,
                numero_serie:numero_serie,
            }).then((serialStored)=>{
                if(!serialStored){
                    res.send({code:"500",message:"Error de servidor"})
                }else{
                    res.send({code:"200", serialStored:serialStored,message:"Etiqueta correcta"})
                }
            }).catch((err)=>{
                //res.status(500).send({code:"500", message:"Error de servidor",err:err})
                for(let i=0;i<err.errors.length;i++){
                    if (err.errors[i].message=="numero_serie must be unique"){
                        db.Fa1.update({
                            repetida:true
                        },
                        {
                            where:{
                                serial:serial
                            }
                        }).then((labelUpdate)=>{
                            if(!labelUpdate){
                                res.send({code:"402",message:"Etiqueta no encontrada"})
                            }else{
                                res.send({code:"404",message:"Numero de serie repetido"})
                            }
                        }).catch((err)=>{
                            console.log(err)
                            res.send({code:"500",message:"Error del servidor"})
                        })
                       
                    }
                    else{
                        console.log(err.errors[i].message)
                    }
                }
            })
        }
    }).catch((err)=>{
        res.status(500).send({code:"500", message:"Error de servidor", err:err})
    })

}

//Fin the last six pieces produced
function getLastSixLabels(req,res){
        db.Fa1.count()
          .then((count) => {
            db.Fa1.findAll({
              where: {
                id: {
                  [Op.gte]: count * 0,
                },
              },
              limit: 6,
              order: [["createdAt", "DESC"]],
            })
              .then(function(response) {
                // res.json(dbDaimler);
                if (!response) {
                 return res
                    .status(404)
                    .send({ message: "Etiquetas no encontradas", alert: "Error" });
                } else {
                 return res.status(200).send({ data: response, alert: "Success" });
                }
                //console.log(dbDaimler)
              })
              .catch((err) => {
                return res.status(500).send({ err: err, alert: "Error" });
              });
          })
          .catch((err) => {
            console.log(err);
            return
          });
      
}

//Get production per hour
function productionPerHour (req, res) {
    let fechainicial = moment
      .unix(req.params.fechainicial)
      .format("YYYY-MM-DD HH:mm:ss");
    let fechafinal = moment
      .unix(req.params.fechafinal)
      .format("YYYY-MM-DD HH:mm:ss");
    //console.log(fechainicial)
    //console.log(fechafinal)
    //console.log(req.params.fechafinal)
    db.Fa1.count()
      .then((count) => {
        // console.log(count)
        db.Fa1.findAndCountAll({
          where: {
           /* id: {
              [Op.gte]: count * 0,
            },*/
            createdAt: {
              [Op.gte]: fechainicial,
              [Op.lte]: fechafinal,
            },
            //Le agregue esto para que no cuente las cambiadas
          },
          distinct: true,
          col: "serial",
        })
          .then((data) => {
            //console.log(data)
            if (!data) {
             return res
                .status(404)
                .send({ message: "Datos no encontrados", alert: "Error" });
            } else {
              return res.status(200).send({ data: data, alert: "Success" });
            }
          })
          .catch(function(err) {
           return res
              .status(500)
              .send({ message: "Error de servidor", err: err, alert: "Error" });
          });
      })
      .catch((err) => {
        console.log(err);
        return
      });
  };


//* SMS Produccion del turno
function productionReport (req, res) {
  var telefonos = [
    process.env.GUS_PHONE,
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

  //* Send message thry whatsapp
  for (var i = 0; i < telefonos.length; i++) {
    console.log("whatsapp:" + telefonos[i]);
    client.messages
      .create({
        from: "whatsapp:" + process.env.TWILIO_PHONE, // From a valid Twilio number,
        body:
          "La producción de la linea de FA-1 del turno de " +
          req.body.turno +
          " fue de: " +
          req.body.piezasProducidas,
        to: "whatsapp:" + telefonos[i], // Text this number
        /*La producción de la linea de Daimler del turno de {{1}} fue de: {{2}}*/
      })
      .then(function(message) {
        console.log("Whatsapp:" + message.sid);
        return res.json(message);
      })
      .catch(function(error) {
        return res.json(error);
      });
  }
};


module.exports={
   addSerial,
   getLastSixLabels,
   productionPerHour,
   productionReport,
   

  }