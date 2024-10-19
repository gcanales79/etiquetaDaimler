module.exports = function (sequelize, DataTypes) {
    var Fa13 = sequelize.define("Fa13", {
      serial: DataTypes.STRING,
      repetida: {
        type: DataTypes.BOOLEAN,
        defaultValue:false,
      },
      numero_parte: DataTypes.STRING,
      numero_serie:{
        type: DataTypes.STRING,
        unique: true,
      },
      largo_etiqueta:{
        type:DataTypes.STRING,
      },
      izq_etiqueta:{
        type:DataTypes.STRING,
      },
      der_etiqueta:{
        type:DataTypes.STRING,
      },
      largo_numero_parte:{
        type:DataTypes.STRING,
      }
      
    });
  
  
    return Fa13;
  };