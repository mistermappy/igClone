'use strict';
module.exports = (sequelize, DataTypes) => {
  var Ideas = sequelize.define('Ideas', {
    title: DataTypes.STRING,
    description: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return Ideas;
};