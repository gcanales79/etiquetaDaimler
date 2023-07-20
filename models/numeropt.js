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

      
      
    });
  
  
    return Numeropt;
  };