/**
* Module dependencies.
*/
var dummy

  // Node and Express' basic modules
  , http = require('http')
  , express = require('express')
  , path = require('path')

  // Usual suspects in Express
  , favicon = require('serve-favicon')
  , logger = require('morgan')
  , cookieParser = require('cookie-parser')
  , cookieSession = require('cookie-session')
  , bodyParser = require('body-parser')

  // Hotplate modules
  , passport = require('passport')
  , hotplate = require('hotplate')
  , SimpleDbLayer = require('simpledblayer')
  , JsonRestStores = require('jsonreststores')

  // Layers depending on the DB used
  , mongodb = require( 'mongodb' )
  , DbLayerMixin = require('simpledblayer-mongo')
  , SchemaMixin = require('simpleschema-mongo')
;

// Make up the express object `app`
var app = exports = module.exports = express();

// Basic app configuration
// Meaningful variables: APPNAME, DBHOST, DBNAME, IPADDRESS, PORT
// They all get meaninful defaults (even appName)
app.set('appName', process.env.APPNAME || 'placeholderName' );
app.set('dbHost', process.env.DBHOST || 'localhost' );
app.set('dbName', process.env.DBNAME || ( app.get('appName') + '_' + app.get('env') ) );
app.set('ipAddress', process.env.IPADDRESS || 'localhost');
app.set('port', process.env.PORT || 8080);

// Basic app configuration in convenient module variables
var env = app.get('env');
var appName = app.get('appName');
var dbHost = app.get('dbHost');
var dbName = app.get('dbName');
var ipAddress = app.get('ipAddress');
var port = app.get('port');

// Useful to get the full stack for debugging purposes
if( env == 'development') {
  Error.stackTraceLimit = Infinity;
}

// Connect to the DB
var mongoParameters = 'autoReconnect=true&socketTimeoutMS=10000&keepAlive=1';
var mongoUrl = `mongodb://${dbHost}/${dbName}?${mongoParameters}`;

console.log( "mongoUrl:", mongoUrl );
console.log( "env:", env );
console.log( "apName:", appName );
console.log( "dbHost:", dbHost );
console.log( "dbName:", dbName );
console.log( "ipAddress:", ipAddress );
console.log( "port:", port );

mongodb.MongoClient.connect( mongoUrl, {}, function( err, db ){

  // The connection is 100% necessary
  if( err ){
    hotplate.logger.error("Could not connect to the database. Aborting. Error: ", err );
    process.exit( 1 );
  }

  // Basic Hotplate setup. `routeUrlsPrefix` nees to be set here
  // since it might be used in modules at load-time
  hotplate.config.set( 'hotplate.routeUrlsPrefix', '/app' );

  // Require all of Hotplate's core modules
  // (You CAN be more selective if you like)
  require( 'hotplate/core_modules/hotCore' );

  // Require your app's main module(s) here
  var main = require( './main.js' );

  // More hotplate.config.set() commands can go here
  // (After loading modules, which might set some defaults for themselves)

  // Zap indexes by defailt. You will want to turn this off in production
  hotplate.config.set( 'hotCoreStore.zapIndexes', true );

  // Mandatory DB-specific stuff
  hotplate.config.set( 'hotplate.db', db );
  hotplate.config.set( 'hotplate.DbLayerMixin', DbLayerMixin );
  hotplate.config.set( 'hotplate.SchemaMixin', SchemaMixin );

  // Facebook strategy turned on
  hotplate.config.set('hotCoreAuth.strategies', {
    facebook: {
      clientID: 'YOUR_CLIENT_ID',
      clientSecret: 'YOUR_CLIENT_SECRET',
      fieldList: 'id,name,first_name,last_name,age_range,link,gender,locale,picture,timezone,updated_time,verified,email'
    },
    local: {
    },
  });

  // Express basic settings
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');

  // Various middleware. The usual suspects: static, favicon, logger,
  // bodyparser, cookieparser
  app.use('/', express.static(path.join(__dirname, 'public')));
  if( app.get( 'env' ) === 'development' ) app.use(logger('dev'));
  app.use(favicon(__dirname + '/public/favicon.ico'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser('woodchucks are nasty animals!!!'));
  app.use(cookieSession({ secret: 'woodchucks are nasty animals!!!' }));

  // Passport initialize
  app.use(passport.initialize());

  // Emit a `stores` signal, which will get each one of the Hotplate
  // modules to instance their stores.
  require('hotplate/core_modules/hotCoreStore').getAllStores( function( err, s ) {

    if( err ){
      console.error( "Error running the stores:", err );
      process.exit();
    }

    // Initialise JsonRestStores and SimpleDbLayer
    JsonRestStores.init();
    SimpleDbLayer.init();

    // Emit a setRoutes signal to Hotplate modules, which will set their routes
    // to the `app` object
    hotplate.hotEvents.emitCollect( 'setRoutes', app, function( err ) {
      if( err ){
        console.error( "Error setting the routes:", err );
        process.exit();
      }

      // Routes for password recovery
      app.post( '/auth/recover', main.recoverPostRoute );
      app.get( '/auth/recoverPage/:token', main.recoverPageGetRoute );
      app.get( '/auth/recoverPageLanding/:token', main.recoverPageLandingGetRoute );
      app.post( '/auth/resetPassword', main.resetPasswordPostRoute );

      // Error route
      app.use( require('hotplate/core_modules/hotCoreError').hotCoreErrorHandler );

      // You don't want to see this happen
      app.use( function( err, req, res, next){
        res.send("Oh dear, this should never happen!");
        next(err);
      });

      // Emit a run signal to Hotplate modules, which might set their
      // interval timers, etc.
      hotplate.hotEvents.emitCollect( 'run', function() {

        if( err ){
          console.error( "Error running the hook 'run':", err );
          process.exit();
        }

        // If TESTING is set, then this very module is being loaded
        // to run some tests. Since some of the things here are async,
        // this will tell the loading module when to run the tests
        if( process.env.TESTING ){
          process.emit( 'startTests', db );

        // Business as usual: create the server, listen to the port
        } else {
          var server = http.createServer( app );
          server.listen( app.get('port'), app.get('ipAddress'), function(){
            console.log("Express server listening on port " + app.get('port'));
          });
        }

      });
    });
  });
});
