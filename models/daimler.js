module.exports = function (sequelize, DataTypes) {
  var Daimler = sequelize.define("Daimler", {
    serial: DataTypes.STRING,
    repetida: {
      type: DataTypes.BOOLEAN,
      defaultValue:false,
    },
    etiqueta_remplazada: DataTypes.STRING,
    fecha_gp12:{
      type:DataTypes.DATE,
    },
    fechapolonia:{
      type:DataTypes.DATE,
    },
    uso_etiqueta:{
      type: DataTypes.STRING,
      defaultValue:"Produccion",
    },
    registro_auto:{
      type:DataTypes.BOOLEAN,
      defaultValue:true,
    },
    
    
  });


  return Daimler;
};
