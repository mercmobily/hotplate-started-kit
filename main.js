var
  dummy

, hotplate =  require('hotplate')
, path = require('path')
, async = require('async')
, debug = require('debug')('main')
, emailaddresses = require( 'email-addresses')

, declare = require( 'simpledeclare' )

, hotCoreStore = require('hotplate/core_modules/hotCoreStore')
, hotCoreServerLogger = require( 'hotplate/core_modules/hotCoreServerLogger' )
, hotCoreAuth = require('hotplate/core_modules/hotCoreAuth')
, logger = hotCoreServerLogger
, JsonRestStores = require( 'jsonreststores' )
, SimpleSchema = require( 'simpleschema' )
, e = require('allhttperrors')
, nodemailer = require('nodemailer')
;

// Default error page
hotplate.config.set('hotCoreError.errorPage', function( req, res, next ){
 res.status( 200 ).render('error.ejs', { title: "Error!", error: req.hotError.name } );
});

// This is a module-wide variable so that I can reference stores defined here easily
var stores = {};

hotplate.hotEvents.onCollect( 'auth', 'main', function( strategyId, action, data, done){

  // Will add a record to usersInfo if needed
  function ensureRecord( userId, done ){
    stores.usersInfo.dbLayer.selectById( userId, function( err, record ){
      if( err) return done( err );

      // Record is there: that's it
      if( record ) return done( null );

      stores.usersInfo.dbLayer.insert( { userId: userId }, function( err, record ){
        if( err ) return done( err );

        done( null );
      });
    })
  }

  ensureRecord( data.userId, function( err ){
    if( err ) return done( err );

    // Only Facebook has the profile object and data
    if( strategyId !== 'facebook' ) return done( null );
    var p = data.profile;
    var record = {
      firstName: p.first_name,
      lastName: p.last_name,
      ageMin: p.age_range ? p.age_range.min : undefined,
      ageMax: p.age_range ? p.age_range.max : undefined,
      gender: p.gender,
      locale: p.locale,
      pictureUrl: p.picture && p.picture.data ? p.picture.data.url : undefined,
      timezone: p.timezone,
      facebookUpdated: p.updated_time,
      verified: p.verified,
      email: p.email,
      facebookId: p.id
    };
    stores.usersInfo.dbLayer.updateById( data.userId, record, function( err ){
      if( err ) return done( err );

      done( null );
    });
  });
});

hotplate.hotEvents.onCollect( 'stores', 'main', hotplate.cacheable( function( done ){


  var PrivateUserDataMixin = hotCoreStore.PrivateUserDataPermissionsMixin;

  hotCoreStore.get( function( err, s ){
    if( err ) return done( err );

    var HotStore = s.HotStore;
    var HotSchema = s.HotSchema;
    var BasicDbStore = s.BasicDbStore;
    var BasicSchema = s.BasicSchema;

    var UsersInfo = declare( [ HotStore, PrivateUserDataMixin ], {

      schema: new HotSchema({
        firstName : { type: 'string', searchable: true, required: false, default: "", trim: 255 },
        lastName  : { type: 'string', searchable: true, required: false, default: "", trim: 255 },
        ageMin    : { type: 'number', searchable: true, required: false },
        ageMax    : { type: 'number', searchable: true, required: false },
        gender    : { type: 'string', searchable: true, required: false, default: "", trim: 10 },
        locale    : { type: 'string', required: false, default: "", trim: 5 },
        pictureUrl: { type: 'string', required: false, default: "", trim: 255 },
        timezone  : { type: 'number', searchable: true, required: false },
        facebookUpdated  : { type: 'date', searchable: true, required: false },
        verified  : { type: 'boolean', searchable: true  },
        email     : { type: 'string', searchable: true, required: false, unique: true, default: "", trim: 255 },
        facebookId: { type: 'string', searchable: true, required: false, default: "", trim: 255 },
      }),

      onlineSearchSchema: new HotSchema({
      }),

      handlePut: true,
      handleGet: true,

      storeName:  'usersInfo',

      publicURL: '/config/users/:userId',
      hotExpose: true,
      configStore: { userId: true },
    });
    stores.usersInfo = new UsersInfo();

    var UsersInterests = declare( [ HotStore, PrivateUserDataMixin ], {

      schema: new HotSchema({
        name          : { type: 'string', required: true, trim: 35, searchable: true },
      }),

      onlineSearchSchema: new HotSchema({
      }),

      storeName: 'usersInterests',

      publicURL: '/config/users/:userId/interests/:id',
      hotExpose: true,
      configStore: { userId: true },

      defaultNewToStart: true,

      position: true,

      handlePut: true,
      handlePost: true,
      handleGet: true,
      handleGetQuery: true,

    });
    stores.usersInterests = new UsersInterests();

    // Root-level store
    var StatsUses = declare( [ HotStore ], {

      schema: new HotSchema({
        name         : { type: 'string', notEmpty: true, trim: 50, searchable: true },
      }),

      onlineSearchSchema: new HotSchema({
      }),

      storeName:  'statsUses',

      publicURL: '/statsUses/:id',
      hotExpose: true,
      configStore: { },

      position: true,

      hotGlobalBroadcast: true,

      handlePut: true,
      handlePost: true,
      handleGet: true,
      handleGetQuery: true,

    });
    stores.statsUses = new StatsUses();

    done( null, stores );

  });

}));

/*

POST /auth/recover/
[anyId]
=> Email is sent to email address.
Response is in AJAX

GET /auth/recoverForm/:tokenId
=> Sets the session cookie, and shows form for a new password
Response is in HTML

POST /auth/resetPassword
=> Resets the password for the user
Response in HTML, "thank you"

*/


// POST /auth/recover ( body: { anyId: 43343 } )
exports.recoverPostRoute = function( req, res, next ) {

  hotCoreStore.getAllStores( function( err, allStores ){
    if( err ) return next( err );

    // Needs to be logged in for this to work
    if( req.session.userId ) return res.status( 403 ).json( { message: 'You are not authorized' } );

    var anyId = req.body.anyId;

    // Tags must be passed
    if( typeof( anyId ) != 'string' ) return res.status( 422 ).json( { message: 'Required field: anyId' } );

    function findUser( anyId, cb ){

      // Get the rest of the info
      allStores.usersInfo.dbLayer.selectByHash( { email: anyId }, function( err, records, total ){
        if( err ) return cb( err );

        // Found! End of story: we have userId AND email!
        if( total ) var record = records[ 0 ];
        if( record ) return cb( null, record.userId, record.email );

        allStores.usersStrategies.dbLayer.selectByHash( { field1: anyId }, function( err, data, total ){
          if( err ) return cb( err );

          // That's it: not even user name NOR facebook ID matched
          if( !total ) return cb( null, null, null );

          // There is a result!
          var userId = data[ 0 ].userId;

          // Attempt to find the email address
          // Get the rest of the info
          allStores.usersInfo.dbLayer.selectById( userId, function( err, record ){
            if( err ) return cb( err );

            if( ! record || ! record.email ) return cb( null, userId, null );

            return cb( null, userId, record.email );
          });
        });
      });
    }

    findUser( anyId, function( err, userId, email ){
      if( err) return next( err );

      if( !userId ) return res.status( 422 ).json( { message: 'User info not found' } );
      if( !email ) return res.status( 422 ).json( { message: 'User does not have an email address on file' } );

      hotCoreAuth.createToken( userId, function( err, token ){
        if( err ) return next( err );

        // Make up email body
        var text = `Hello there!

You haverecently requested us to help you reset your password for YOUR SOFTWARE.

If you would like to do so, please visit:

http://PLACEHOLDER.com/auth/recoverPageLanding/${token}

Thank you!

The PLACEHOLDER team`

        // create reusable transporter object using the default SMTP transport
        var transporter = nodemailer.createTransport('smtps://smtp-relay.gmail.com');

        // setup e-mail data with unicode symbols
        var mailOptions = {
            from: '"PLACEHOLDER 👥" <contact@PLACEHOLDER.com>', // sender address
            to: email, // list of receivers
            subject: 'Reset password for PLACEHOLDER ✔', // Subject line
            text: text, // plaintext body
            //html: '<b>Hello world 🐴</b>' // html body
        };

        // send mail with defined transport object
        transporter.sendMail( mailOptions, function( err, info){
          if( err ) return next( err );

          res.status( 200 ).json( { message: 'Email sent' } );
          //console.log( "HERE:", info && info.response );

        });
      });
    });
  });
}




// GET /auth/recoverPageLanding/:token
exports.recoverPageLandingGetRoute = function( req, res, next ){

  req.session = {};

  var token = req.params[ 'token' ];

  hotCoreAuth.checkToken( token, function( err, tokenIsGood, errorMessageOrUserId ){
    if( err ) return next( err );
    if( ! tokenIsGood ) return next( new e.UnprocessableEntityError( errorMessageOrUserId ) );

    // The token is good: clear it, set the session, and redirect
    hotCoreAuth.clearToken( errorMessageOrUserId, function( err ){
      if( err ) return next( err );

      // Log the user in using the token!
      req.session.loggedIn = true;
      req.session.userId = errorMessageOrUserId;

      // User was already logged in. No prob: clear the token regardless
      hotCoreAuth.clearToken( req.session.userId, function( err ){
        if( err ) return next( err );

        // Redirect to the right URL
        res.redirect( `/auth/recoverPage/${token}` );
      })
    })
  });
}

// GET /auth/recoverPage/:token
exports.recoverPageGetRoute = function( req, res, next ){

  var token = req.params[ 'token' ];

  // Needs to be logged in for this to work
  if( ! req.session.userId ) return next( new e.UnauthorizedError() );

  res.status( 200 ).render('recoverPage.ejs', { title: "Password recovery", data: { } } );
};


// POST /auth/resetPassword
exports.resetPasswordPostRoute = function( req, res, next ){

  // Needs to be logged in for this to work
  if( ! req.session.userId ) return res.status( 403 ).json( { message: 'You are not authorized' } );

  var password = req.body.password;

  // Password must be passed
  if( typeof( password ) != 'string' ) return res.status( 422 ).json( { message: 'Required field: password' } );

  hotCoreStore.getAllStores( function( err, allStores ){
    if( err ) return next( err );

    // Check if the user is already there. If it is, simply change the password
    allStores.usersStrategies.dbLayer.selectByHash( { userId: req.session.userId, strategyId: 'local' }, function( err, strategyInfo, total ){
      if( err ) return next( err );

      if( total ){

        allStores.usersStrategies.dbLayer.updateByHash( { userId: req.session.userId, strategyId: 'local' }, { field3: password },function( err, strategyInfo, total ){
          if( err ) return next( err );

          res.status( 200 ).render('recoverPage.ejs', { title: "Password reset!", data: { allDone: true } } );
        });

      } else {

        // Look for the facebook strategy. This will be used since the facebookId will be the username
        allStores.usersStrategies.dbLayer.selectByHash( { userId: req.session.userId, strategyId: 'facebook' }, function( err, strategyInfo, total ){
          if( err ) return next( err );

          // NO facebook and NO local strategy. This isn't supposed to happen, render result with an error
          if( total ){

            // Add 'local' strategy with facebook's id as field1 and password as field3
            allStores.usersStrategies.dbLayer.insert( { userId: req.session.userId, strategyId: 'local', field1: strategyInfo.field1, field3: password },function( err, strategyInfo, total ){
              if( err ) return next( err );

              res.status( 200 ).render('recoverPage.ejs', { data: { allDone: true } } );
            });

          } else {

            return next( new Error( 'Could not find a suitable authentication strategy' ) );
          }
        });
      }
    });
  });
}
