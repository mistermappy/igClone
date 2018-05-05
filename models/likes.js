'use strict';
module.exports = (sequelize, DataTypes) => {
  var Likes = sequelize.define('Likes', {
    likes: DataTypes.INTEGER,
    commentID: DataTypes.INTEGER
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return Likes;
};