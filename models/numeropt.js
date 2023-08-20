module.exports = function (sequelize, DataTypes) {
    var Numeropt = sequelize.define("Numeropt", {
      numero_parte: {
        type:DataTypes.STRING,
        allowNull: false,
      },
      linea: {
        type: DataTypes.STRING,
        allowNull:false,
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
  
  
    return Numeropt;
  };