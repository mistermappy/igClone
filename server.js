var express = require('express');
var router = express.Router();
var passport = require('passport');
var session = require('express-session');

const Sequelize = require('sequelize');
const sequelize = new Sequelize('users', 'postgres', 'nppsjuoll', {
    host: 'localhost',
    dialect: 'postgres'
})

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

var Ideas = require('./models/ideas.js')(sequelize,Sequelize);
var Comments = require('./models/comments.js')(sequelize, Sequelize);
var Likes = require('./models/likes.js')(sequelize, Sequelize);
var Users = require('./models/users.js')(sequelize, Sequelize);

Ideas.hasMany(Comments, {foreignKey: "postID"});
Ideas.hasMany(Likes, {foreignKey: "commentID"});
Comments.belongsTo(Ideas, {foreignKey: "postID"});
Ideas.belongsTo(Users, {foreignKey: "userID"});
Likes.belongsTo(Users, {foreignKey: "userID"});
//var db = require('./models/index.js');
//console.log(db)
//Comments.belongsTo(Ideas);
//Ideas.hasMany(Comments);

//app.set('views', __dirname + '/views');
//app.set('view engine', 'jade');

require('./config/config')
require('./strategies/passport-local.js')(passport); 

var bodyParser = require('body-parser');

//var createError = require('http-errors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

router.use(session({
    key: 'user_sid',
    secret: 'pixel pie',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        expires: 3600000
     }
}));
router.use(passport.initialize());
router.use(bodyParser());
router.use(logger('dev'));
router.use(express.json());
router.use(express.urlencoded({ extended: false }));
router.use(cookieParser());
router.use(express.static(path.join(__dirname, 'public')));


/**/
function compareValues(key, order='asc') {
    return function(a, b) {
      if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
        // property doesn't exist on either object
          return 0; 
      }
  
      const varA = (typeof a[key] === 'string') ? 
        a[key].toUpperCase() : a[key];
      const varB = (typeof b[key] === 'string') ? 
        b[key].toUpperCase() : b[key];
  
      let comparison = 0;
      if (varA > varB) {
        comparison = 1;
      } else if (varA < varB) {
        comparison = -1;
      }
      return (
        (order == 'desc') ? (comparison * -1) : comparison
      );
    };
};

let userID; 

router.get('/signup', (req, res) => {
    res.render('signup')
})

router.post('/signup', passport.authenticate('local-signup'), (req, res) => {
    res.redirect('/login');
})

router.get('/login', (req, res) => {
    res.render('login');
})

router.post('/login', passport.authenticate('local-login'), (req, res) => {
    console.log(req.user.id)
    userID = req.user.id
    res.redirect('/home');
})
  
router.get('/home', (req, res)=>{

    Ideas.findAll({
        include: [
            {
                model: Comments
            },
            {
                model: Likes
            }
        ]
    }).then(ideas => {
        const resObj = ideas.map(idea=>{
            return Object.assign(
                {},
                {
                    ideas_id: idea.id,
                    ideas_title: idea.title,
                    ideas_description: idea.description,
                    comments: idea.Comments.map(comment => {
                        return Object.assign(
                            {},
                            {
                                comment_id: comment.id,
                                comment_comments: comment.comments
                            }
                        )
                    }),
                    likes: idea.Likes.map(likes => {
                        return Object.assign(
                            {},
                            {
                                likes_like: likes.id,
                                user_who_liked: likes.userID
                            }
                        )
                    })
                }
            )
        })
        //console.log(ideas)
        let sortedObj = resObj.sort(compareValues("ideas_id"))
        //console.log(sortedObj);
        res.render('index', {title: "Instagram", ideas: sortedObj})
    })
  
});

router.post('/home', (req, res)=>{
    Ideas.sync()
         .then(()=>{
             return Ideas.create({
                 title: req.body.title,
                 description: req.body.description,
                 userID: userID
             }) 
         })
         .then(()=>{
             console.log("IT WORKED?", userID)
             res.redirect('/home')
         })
});

router.post('/comments', (req, res)=>{
    Comments.sync()
            .then(()=>{
                return Comments.create({
                    comments: req.body.comment,
                    postID: req.body.postID
                })
            })
            .then(()=>{
                res.redirect('/home')
            });
});

/*router.post('/likes', (req, res) => {
    Likes.sync() 
         .then(()=>{
             return Likes.create({
                 likes: 1,
                 commentID: req.body.postID,
                 userID: userID
             })
         })
         .then(()=>{
             res.redirect('/home')
         })
});*/

router.post('/likes', (req, res) => {
    Likes.findAll({
        where:{
            userID: userID
        }
    }).then(likes => {
        console.log(likes.length)
        if(likes.length == 0){
            return Likes.create({
                likes: 1, 
                commentID: req.body.postID,
                userID: userID
            })
        }
        else {
            Likes.destroy({
                where:{
                    userID: userID
                }
            })
        }
    }).then(()=>{
        res.redirect('/home')
    })
});

router.get('/profile', (req, res) => {
    //res.render('profile');
    Ideas.findAll({
        where: {
            userID: userID
        }
    })
    .then(posts => {
        console.log(posts)
        console.log(userID)
        res.render('profile', {posts:posts})
    })
})

router.post('/delete', (req, res) => {
    Ideas.destroy({
        where: {
            id: req.body.postID
        }
    }).then(()=>{
        console.log('successfully deleted instance..');
        res.redirect('/profile')
    })
})

module.exports = router; 