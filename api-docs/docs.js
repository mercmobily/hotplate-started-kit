// Minimal number of modules to get JsonRestStores going
var dummy
  , hotplate = require('hotplate')
  , SimpleDbLayer = require('simpledblayer')
  , SimpleSchema = require('simpleschema')
  , JsonRestStores = require('jsonreststores')
  , hotCoreStore = require( 'hotplate/node_modules/hotCoreStore' )
  , async = require('async')
  , fs = require('fs')
  , ejs = require('ejs')
;

// Dummy data for database connection, DbLayerMixin, SchemaMixin
hotplate.config.set( 'hotplate.db',  "DUMMY DATABASE CONNECTION" );
hotplate.config.set( 'hotplate.DbLayerMixin', {} );
hotplate.config.set( 'hotplate.SchemaMixin', {} )

// Require Hotplate modules that define extra stores
// They will be fetched by emitting `stores` and then calling
// hotCoreStore.getAllStores()
require( 'hotplate/node_modules/hotCore' );
require( 'bd' );

var extraDocStores = require('./extra-store-docs.js');


function formatSchemaLine( o ) {
  var r = '', once = false;
  Object.keys( o ).forEach( function( k ){
    r = r + k + ': ';
    r = r + JSON.stringify( o[ k ] ) + ', ';
    once = true;
  })
  if( once ) r = r.substr( 0, r.length - 2 );

  return  r;
}

hotplate.hotEvents.emitCollect( 'stores',function( err ) {

  if( err ){
    console.error( "Error running the stores:", err );
    process.exit();
  }

  hotCoreStore.getAllStores( function( err, stores ){

    if( err ){
      console.error( "Error getting all stores:", err );
      process.exit();
    }

    // Important! Init JsonRestStores
    JsonRestStores.init();
    SimpleDbLayer.init();

    // Prepare the template
    var data = JsonRestStores.makeDocsData( JsonRestStores.getAllStores(), extraDocStores );
    var str = fs.readFileSync( 'store.ejs');
    var template = ejs.compile(str.toString(), { localsName: 's', rmWhitespace: false } );

    console.log("TEST:", Object.keys( data ) );

    // Make up the documentation
    var r = '';
    Object.keys( data ).forEach( function( sk ){
      console.log("Documenting: " + sk + "\n" );

      // Prepare the data object
      var s = data[ sk ];
      s.obj = formatSchemaLine;

      console.log("Which has keys: " + Object.keys( s ) + " and methods: " + Object.keys( s.methods )) ;


      // Add the new bit of documentation
      r = r + template( s );

    });
    fs.writeFileSync("gen-docs.html", r );

  });
});
