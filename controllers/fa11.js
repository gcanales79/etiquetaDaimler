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
    //let numero_serie=serial.slice(-14);
    //console.log(`El numero de serie es ${numero_serie}`);
    db.Numeropt.findOne({
        where:{
            linea:{
                [Op.eq]:"FA-11",
            },
            numero_parte:{
                [Op.eq]:numero_parte
            }
        }
    }).then((response)=>{
      console.log(response)
        if(!response){
            return res.send({code:"400", message:"El número de parte no esta dado de alta en la línea"})
        }else{

            //res.status(200).send({code:"200", message:"Número encontrado" })
            /*if(serial.length!=parseInt(response.largo_etiqueta)){
              return res.send({code:"400", message: "Etiqueta no tiene el largo correcto"})
            }*/
            /*else{*/
              //!Cambiar esto si se utilizan los datos del NP
            //let numero_parte=serial.substring(parseInt(response.izq_etiqueta),parseInt(response.izq_etiqueta)+parseInt(response.largo_numero_parte));
            //let numero_serie=serial.slice(-1*parseInt(response.der_etiqueta))
            let numero_serie=serial.slice(-14);
            db.Fa11.create({
                serial:serial,
                numero_parte:numero_parte,
                numero_serie:numero_serie,
            }).then((serialStored)=>{
                if(!serialStored){
                  console.log("Error en crear el NP")
                    return res.send({code:"500",message:"Error de servidor"})
                }else{
                    res.send({code:"200", serialStored:serialStored,message:"Etiqueta correcta"})
                }
            }).catch((err)=>{
                //res.status(500).send({code:"500", message:"Error de servidor",err:err})
                for(let i=0;i<err.errors.length;i++){
                    if (err.errors[i].message=="numero_serie must be unique"){
                        db.Fa11.update({
                            repetida:true
                        },
                        {
                            where:{
                                serial:serial
                            }
                        }).then((labelUpdate)=>{
                            if(!labelUpdate){
                               return res.send({code:"400",message:"Etiqueta no encontrada"})
                            }else{
                               return res.send({code:"400",message:"Numero de serie repetido"})
                            }
                        }).catch((err)=>{
                            console.log(err)
                           return res.send({code:"500",message:"Error del servidor"})
                        })
                       
                    }
                    else{
                        console.log(err.errors[i].message)
                    }
                }
            })
          /*}*/
        }
    }).catch((err)=>{
        res.send({code:"500", message:"Error de servidor", err:err})
    })

}

//Fin the last six pieces produced
function getLastSixLabels(req,res){
        db.Fa11.count()
          .then((count) => {
            db.Fa11.findAll({
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
    db.Fa11.count()
      .then((count) => {
        // console.log(count)
        db.Fa11.findAndCountAll({
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
  let responseMessage=[]
  for (var i = 0; i < telefonos.length; i++) {
    //console.log("whatsapp:" + telefonos[i]);
    client.messages
      .create({
        /*from: "whatsapp:" + process.env.TWILIO_PHONE, // From a valid Twilio number,
        body:
          "La producción de la linea de FA-1 del turno de " +
          req.body.turno +
          " fue de: " +
          req.body.piezasProducidas,
        to: "whatsapp:" + t/*elefonos[i], // Text this number
        /*La producción de la linea de Daimler del turno de {{1}} fue de: {{2}}*/
            contentSid:"HXb454791f97e9b548a336957d567d7c9d",
            from: "whatsapp:" + process.env.TWILIO_PHONE, // From a valid Twilio number,
            to: "whatsapp:" + telefonos[i], // Text this number,
            messagingServiceSid: process.env.serviceSid,
            contentVariables:JSON.stringify({
              1:'FA-11',
              2: String(req.body.turno),
              3: String(req.body.piezasProducidas)
            })
      })
      .then(function(message) {
        //console.log("Whatsapp:" + message.sid);
        console.log(`El mensaje a ${message.to} con sid: ${message.sid} tiene el status de: ${message.status}`)
        responseMessage.push(message);
            //console.log(responseMessage);
            if(responseMessage.length==telefonos.length){
            return res.json(responseMessage);
            }
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