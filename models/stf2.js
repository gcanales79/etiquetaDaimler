module.exports = function (sequelize, DataTypes) {
    var Fa11 = sequelize.define("Stf2", {
      serial: DataTypes.STRING,
      repetida: {
        type: DataTypes.BOOLEAN,
        defaultValue:false,
      },
      numero_parte: DataTypes.STRING,
      numero_serie:{
        type: DataTypes.STRING,
      }
      
    },{
    indexes:[
    {
      name: 'idx_createdAt_desc',
      fields: ['createdAt'],
      using: 'BTREE',
      order: 'DESC' // Indica que el índice ya esté ordenado de forma descendente
    }
    ]
  });
  
  
    return Fa11;
  };