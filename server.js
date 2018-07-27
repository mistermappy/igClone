var express = require('express');
var router = express.Router();
var passport = require('passport');
var session = require('express-session');
var multer = require('multer'); 
var userPhotos = require('./model/photo');
var aws = require('aws-sdk');
var multers3 = require('multer-s3');
var imager = require('multer-imager');
var s3 = new aws.S3()
var fs = require('fs')

var upload = multer({
    storage : multers3({
        s3: s3, 
        bucket: 'instagram-clone-photos-version1',
        metadata: function (req, file, cb) {
            cb(null, {fieldName: file.fieldname});
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString())
        }
    })
});

const Sequelize = require('sequelize');
const sequelize = new Sequelize('d2rp83vuathmlu', 'qqfapouvhewocy', 'c4a6920ceb8cd92f47466624c28136032fbca36e2c80a7e021a3068285886116', {
    host: 'ec2-107-22-192-11.compute-1.amazonaws.com',
    port: 5432,
    dialect: 'postgres',
    ssl: true
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
Ideas.belongsTo(Users, {foreignKey: 'userName'});
Likes.belongsTo(Users, {foreignKey: "userName"});
//Likes.belongsTo(Ideas, {foreignKey: 'userName'});

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

router.get('/', (req, res) => {
    res.render('home');
})

router.get('/signup', (req, res) => {
    res.render('signup')
})

router.get('/signuperror', (req, res) => {
    res.render('signuperror');
})

router.post('/signup', passport.authenticate('local-signup', {successRedirect: '/login', failureRedirect: '/signuperror'}), (req, res) => {
    res.redirect('/login');
})

router.get('/login', (req, res) => {
    res.render('login');
})

router.get('/loginerror', (req, res) => {
    res.render('loginerror');
})

router.post('/login', function(req, res, next) {
    passport.authenticate('local-login', function(err, user, info) {
      if (err) { 
          return next(err); 
      };
      if (!user) { 
          return res.redirect('/loginerror'); 
      };
      console.log(user.username); 
      userName = user.username; 
      return res.redirect('/home');

    })(req, res, next);
  })

router.get('/faq', (req, res) => {
    res.render('faq')
});

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
                                user_who_liked: likes.userName
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
    });
});

router.post('/home', upload.single('imageUpload'), (req, res)=>{
    //console.log(req.file)
    Ideas.create({
        title: req.body.title,
        description: req.file.key,
        userName: userName
    }).then(() => {
        res.redirect('/home');
    });
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

router.post('/likes', (req, res) => {
    Likes.findAll({
        where:{
            userName: userName,
            commentID: req.body.postID
              }
    }).then(likes => {
        if(likes.length == 0){
            return Likes.create({
                likes: 1, 
                commentID: req.body.postID,
                userName: userName
            }).then(()=>{
                res.redirect('/home')
            })
        }
        else {
            Likes.destroy({
                where:{
                    userName: userName,
                    commentID: req.body.postID
                }
            }).then(()=>{
                res.redirect('/home')
            })
        }
    })
});

router.get('/profile', (req, res) => {
    Ideas.findAll({
        where: {
            userName: userName
        }
    })
    .then(posts => {
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