"use strict";
/*
Copyright (C) 2016 Tony Mobily

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// Define basic classes to play with
var app = require('../server');
var request = require('supertest');
var JsonRestStores = require('jsonreststores');

var globals = {};

// Make sure uncaught errors are displayed
process.on('uncaughtException', function(err) {
  console.error(err.stack);
  process.emit( 'hotplateShutdown');
  globals.db.close();
});


exports = module.exports = {

  "getting started: start tests, zap database": function( test ){

    // Make sure uncaught errors are displayed
    process.on('startTests', function( db) {
      globals.db = db;

      globals.db.dropDatabase( function( err ){
        test.done();
      });
    });
  },


  "create, modify, login": function( test ){

    globals.userName1 = '_test_user1';
    globals.userName2 = '_test_user2';

    var agent1 = globals.agent1 = request.agent( app );
    var agent2 = globals.agent2 = request.agent( app );
    var agent3 = globals.agent3 = request.agent( app );

    // Try to login with non-existing account
    agent1.post('/app/auth/signin/local/postcheck')
    .expect('Content-Type', /json/)
    .send( { login: globals.userName1, password: 'password_test'  })
    .expect(403)
    .end( function(err, res){
      test.ifError( err );
      test.equals( res.body.message, 'Authentication error' );

      agent1.post('/app/auth/register/local/postcheck')
      .expect('Content-Type', /json/)
      .send( { login: globals.userName1, password: 'password_test'  })
      .expect(200)
      .end( function(err, res){
        test.ifError( err );

        test.equals( typeof res.body.user, 'object' );
        test.notEqual( typeof res.body.user, null );
        test.ok( res.body.user.id );

        globals.userId1 = res.body.user.id;


        agent2.post('/app/auth/register/local/postcheck')
        .expect('Content-Type', /json/)
        .send( { login: globals.userName2, password: 'password_test'  })
        .expect(200)
        .end( function(err, res){
          test.ifError( err );

          test.equals( typeof res.body.user, 'object' );
          test.notEqual( typeof res.body.user, null );
          test.ok( res.body.user.id );

          globals.userId2 = res.body.user.id;

          // Register with the same name
          agent1.post('/app/auth/register/local/postcheck')
          .expect('Content-Type', /json/)
          .send( { login: globals.userName1, password: 'password_test'  })
          .expect(403)
          .end( function(err, res){
            test.ifError( err );

            // Change password
            agent1.post('/app/auth/manager/local/postcheck')
            .expect('Content-Type', /json/)
            .send( { login: globals.userName1, password: 'password_test2'  })
            .expect(200)
            .end( function(err, res){
              test.ifError( err );

              // Change login
              globals.userName1 = globals.userName1 + "_changed";
              agent1.post('/app/auth/manager/local/postcheck')
              .expect('Content-Type', /json/)
              .send( { login: globals.userName1, password: '*'  })
              .expect(200)
              .end( function(err, res){
                test.ifError( err );

                // Change both login and password
                globals.userName1 = globals.userName1 + "_changed";
                agent1.post('/app/auth/manager/local/postcheck')
                .expect('Content-Type', /json/)
                .send( { login: globals.userName1, password: '*'  })
                .expect(200)
                .end( function(err, res){
                  test.ifError( err );

                  test.equals( typeof res.body.user, 'object' );
                  test.notEqual( typeof res.body.user, null );
                  test.equal( res.body.user.id, globals.userId1 );

                  test.done();
                });
              });
            });
          });
        });
      });
    });
  },


  "password recovery": function( test ){

    globals.agent2.put( '/stores/config/users/' + globals.userId2 )
    .expect('Content-Type', /json/)
    .send( { email: 'merc@mobily1.com' })
    .end( function( err, res ){
      test.ifError( err );

      globals.agent3.post('/auth/recover')
      .expect('Content-Type', /json/)
      .send( { anyId: '_test_user2' })
      //.expect(201)
      .end( function(err, res){
        test.ifError( err );

        globals.agent3.post('/auth/recover')
        .expect('Content-Type', /json/)
        .send( { anyId: 'merc@mobily1.com' })
        //.expect(201)
        .end( function(err, res){
          test.ifError( err );

          test.done();
        })
      })
    });

  },

  "end of story": function( test ){

    // Close the database connection, shit down hotPlate (this is especially for setInterval calls)
    process.emit( 'hotplateShutdown');
    setTimeout( function(){
      globals.db.close();
      test.done();
    }, 1000 );
  }

};
