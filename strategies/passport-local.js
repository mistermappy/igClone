var LocalStrategy = require('passport-local').Strategy; 
var bcrypt = require('bcrypt');
var User = require('../models').Users
var saltRounds = 10;

module.exports = function(passport){

	function getUserParams(req) {
    var body = req.body
    return {
        id: body.id,
        username: body.username,
        password: body.password
    	};
	}

	passport.serializeUser(function(user, done){
		done(null, user.id)
	})

	passport.deserializeUser(function(id, done){
		User.findById(id, function(err, user){
			done(err, user);
		})
	})

	passport.use('local-signup', new LocalStrategy({
		username: 'username',
		password: 'password',
		passReqToCallback: true
	}, processSignupCallback));

	passport.use('local-login', new LocalStrategy({
		username: 'username',
		password: 'password'
	}, processLoginCallback))

	function processSignupCallback(req, username, password, done) {
		User.findOne({
			where: {
				'username': username
			},
			attributes : ['id']
		})
		.then(function(user){
			if(user){
				return done(null, false);
			} else {

				var userToCreate = getUserParams(req);
				
				bcrypt.hash(userToCreate.password, saltRounds, function(err, hash){
				userToCreate.password = hash; 
				User.create(userToCreate)
				.then(function(createdRecord){
					createdRecord.password = undefined;
					return done(null, createdRecord);
					})})
			}})}

	function processLoginCallback(username, password, done){
		User.findOne({
			where: {
				'username': username
			}
		})
		.then(function(user){
			if (!user) {
				return done(null, false)
			}
			else {
			bcrypt.compare(password, user.password, function(err, res){
		
				if (err){
					return done(err)
				}
				if (!res){
					return done(null, false)
				}
				return done(null, user);
				
			})}
		});
	}

}
