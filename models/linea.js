module.exports = function (sequelize, DataTypes) {
    var Linea = sequelize.define("Linea", {
      linea: {
        type: DataTypes.STRING,
        allowNull:false,
        unique:true,
      },

      
      
    });
  
  
    return Linea;
  };