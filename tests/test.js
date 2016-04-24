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

        globals.agent1.get('/stores/userProfiles/' + res.body.user.id )
        //.expect('Content-Type', /json/)
        .expect(200)
        .end( function(err, res){
          test.ifError( err );

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
    });
  },


  "duplicate email": function( test ){

    globals.agent3.post( '/stores/testingStore/' )
    //.expect('Content-Type', /json/)
    .expect(201)
    .send( { one: 'merc1@mobily1.com' })
    .end( function( err, res ){
      test.ifError( err );

      globals.agent3.post( '/stores/testingStore/' )
      .expect(201)
      //.expect('Content-Type', /json/)
      .send( { one: 'merc2@mobily1.com' })
      .end( function( err, res ){
        test.ifError( err );

        var testing2 = res.body.id;

        globals.agent3.put( '/stores/testingStore/' + testing2 )
        //.expect('Content-Type', /json/)
        .expect(200)
        .send( { one: 'merc2@mobily1.com' })
        .end( function( err, res ){
          test.ifError( err );

          globals.agent3.put( '/stores/testingStore/' + testing2 )
          .expect(200)
          //.expect('Content-Type', /json/)
          .send( { one: 'merc4@mobily1.com' })
          .end( function( err, res ){
            test.ifError( err );

            globals.agent3.put( '/stores/testingStore/' + testing2 )
            //.expect('Content-Type', /json/)
            .expect(422)
            .send( { one: 'merc1@mobily1.com' })
            .end( function( err, res ){
              test.ifError( err );

              globals.agent3.post( '/stores/testingStore/' )
              //.expect('Content-Type', /json/)
              .expect(422)
              .send( { one: 'merc1@mobily1.com' })
              .end( function( err, res ){
                test.ifError( err );

                globals.agent3.post( '/stores/testingStore/' )
                //.expect('Content-Type', /json/)
                .expect(201)
                .send( { one: 'merc6@mobily1.com' })
                .end( function( err, res ){
                  test.ifError( err );

                  globals.agent3.put( '/stores/testingStore/' + globals.userId2 )
                  //.expect('Content-Type', /json/)
                  .expect(201)
                  .send( { one: 'merc5@mobily1.com' })
                  .end( function( err, res ){
                    test.ifError( err );

                    globals.agent3.put( '/stores/testingStore/' + globals.userId1 )
                    //.expect('Content-Type', /json/)
                    .expect(422)
                    .send( { one: 'merc1@mobily1.com' })
                    .end( function( err, res ){
                      test.ifError( err );

                      test.done();
                    })
                  })
                })
              })
            })
          })
        })
      })
    })

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
        console.log( res.body );

        globals.agent3.post('/auth/recover')
        .expect('Content-Type', /json/)
        .send( { anyId: 'merc@mobily1.com' })
        //.expect(201)
        .end( function(err, res){
          test.ifError( err );

          console.log( res.body );


          test.done();
        })
      })
    });

  },

  "stores/videoTemplates": function( test ){

    globals.agent1.post('/stores/videoTemplates')
    .expect('Content-Type', /json/)
    .send( { name: 'test1', templateData: '{}'  })
    .expect(201)
    .end( function(err, res){
      test.ifError( err );

      test.equal( res.body.name, "test1");
      test.equal( res.body.userId, globals.userId1 );
      test.equal( res.body.system, false );
      globals.videoTemplateId = res.body.id;

      globals.agent1.get('/stores/videoTemplates')
      .expect('Content-Type', /json/)
      .expect(200)
      .end( function(err, res){
        test.ifError( err );

        test.equal( res.body.length, 1 );

        var r = res.body[ 0 ];
        test.equal( r.name, "test1");
        test.equal( r.userId, globals.userId1 );
        test.equal( r.system, false );

        globals.agent1.post('/stores/videoTemplates')
        .expect('Content-Type', /json/)
        .send( { name: 'test2', templateData: '{}'  })
        .expect(201)
        .end( function(err, res){
          test.ifError( err );

          test.equal( res.body.name, "test2");
          test.equal( res.body.userId, globals.userId1 );
          test.equal( res.body.system, false );


          globals.agent2.post('/stores/videoTemplates')
          .expect('Content-Type', /json/)
          .send( { name: 'test3', templateData: '{}'  })
          .expect(201)
          .end( function(err, res){
            test.ifError( err );

            test.equal( res.body.name, "test3");
            test.equal( res.body.userId, globals.userId2 );
            test.equal( res.body.system, false );


            globals.agent1.get('/stores/videoTemplates')
            .expect('Content-Type', /json/)
            .expect(200)
            .end( function(err, res){
              test.ifError( err );

              test.equal( res.body.length, 3 );

              globals.agent1.get('/stores/videoTemplates')
              .expect('Content-Type', /json/)
              .expect(200)
              .query( { userId: globals.userId1 })
              .end( function(err, res){
                test.ifError( err );

                test.equal( res.body.length, 2 );

                globals.agent1.post('/stores/videoTemplates')
                .expect('Content-Type', /json/)
                .send( { name: 'test2', templateData: '[ BROKEN JSON  { { }' })
                .set('Accept', 'application/json')
                .expect(422)
                .end( function(err, res){
                  test.ifError( err );

                  test.done();
                });
              });
            });
          });
        });
      });
    });
  },

  "upload a video, and fetch it": function( test ){

    globals.defaultVideoString = '{ "title":"Test title", "depth": 1, "templateId":"'+globals.videoTemplateId+'", "tags": ["tag4","tag5","tag6","tag7"], "superTags":[ "Sports" ], "location": { "coordinates":[ -73.9667, 40.78 ] } }';

    // WRONG templateId
    globals.agent1.post('/video/submit')
    .expect('Content-Type', /json/)
    .field('data', '{ "title":"Test title 1", "depth": 1, "templateId":"'+globals.userId1+'", "tags": ["tag1","tag2","tag3","tag4"], "superTags":[ "Sports" ], "location": { "coordinates":[ -73.9667, 39.78 ] } }' )
    .attach('video', 'tests/test.mp4')
    .set('Accept', 'application/json')
    .expect(422)
    .end( function(err, res){
      test.ifError( err );

      // Submit a video. Strange title
      globals.agent1.post('/video/submit')
      .expect('Content-Type', /json/)
      .field('data', '{ "title":"Mest title 1", "depth": 1, "templateId":"'+globals.videoTemplateId+'", "tags": ["tag2","tag3","tag4"], "superTags":[ "Sports" ], "location": { "coordinates":[ -73.9667, 39.78 ] } }' )
      .attach('video', 'tests/test.mp4')
      .set('Accept', 'application/json')
      //.expect(200)
      .end( function(err, res){
        test.ifError( err );

        globals.videoId1 = res.body.id;
        globals.videoUrl1 = res.body.shortUrl;

        // Submit another video
        globals.agent1.post('/video/submit')
        .expect('Content-Type', /json/)
        .field('data', globals.defaultVideoString )
        .attach('video', 'tests/test.mp4')
        .set('Accept', 'application/json')
        .expect(200)
        .end( function(err, res){
          test.ifError( err );

          globals.videoId2 = res.body.id;
          globals.videoUrl2 = res.body.shortUrl;

          // Get all videos (should be 2)
          globals.agent1.get('/stores/videos')
          .expect('Content-Type', /json/)
          .expect(200)
          .end( function(err, res){
            test.ifError( err );

            test.equal( res.body.length, 2 );

            // Get the second video
            globals.agent1.get('/stores/videos/' + globals.videoId2 )
            .expect('Content-Type', /json/)
            .expect(200)
            .end( function(err, res){
              test.ifError( err );

              test.deepEqual( globals.videoId2, res.body.id );

              test.done();
            });
          });
        });
      });
    });
  },

  "one field stores for videos": function( test ){

    // Change title
    globals.agent1.put('/stores/videos/'+ globals.videoId2 + '/title' )
    .expect('Content-Type', /json/)
    .send( { title: 'Title has changed' })
    .expect(200)
    .end( function(err, res){
      test.ifError( err );

      // Get store record
      globals.agent1.get('/stores/videos/' + globals.videoId2 )
      .expect('Content-Type', /json/)
      .expect(200)
      .end( function(err, res){
        test.ifError( err );

        test.equal( res.body.title, 'Title has changed' );

        // Change published
        globals.agent1.put('/stores/videos/'+ globals.videoId1 + '/published' )
        .expect('Content-Type', /json/)
        .send( { published: false })
        .expect(200)
        .end( function(err, res){
          test.ifError( err );

          // Get store record
          globals.agent1.get('/stores/videos/' + globals.videoId2 )
          .expect('Content-Type', /json/)
          .expect(200)
          .end( function(err, res){
            test.ifError( err );

            test.equal( res.body.published, true );

            test.done();
          });
        });
      });
    });
  },


  "video searching -- preparing the ground": function( test ){

    // Submit another video
    globals.agent2.post('/video/submit')
    .expect('Content-Type', /json/)
    .field('data', globals.defaultVideoString )
    .attach('video', 'tests/test.mp4')
    .set('Accept', 'application/json')
    .expect(200)
    .end( function(err, res){
      test.ifError( err );

      globals.videoId3 = res.body.id;
      globals.videoUrl3 = res.body.shortUrl;


      // Submit another video
      globals.agent2.post('/video/submit')
      .expect('Content-Type', /json/)
      .field('data', globals.defaultVideoString )
      .attach('video', 'tests/test.mp4')
      .set('Accept', 'application/json')
      .expect(200)
      .end( function(err, res){
        test.ifError( err );

        globals.videoId4 = res.body.id;
        globals.videoUrl4 = res.body.shortUrl;

        // Submit another video
        globals.agent2.post('/video/submit')
        .expect('Content-Type', /json/)
        .field('data', globals.defaultVideoString )
        .attach('video', 'tests/test.mp4')
        .set('Accept', 'application/json')
        .expect(200)
        .end( function(err, res){
          test.ifError( err );

          globals.videoId5 = res.body.id;
          globals.videoUrl5 = res.body.shortUrl;

          // Change published
          globals.agent2.put('/stores/videos/'+ globals.videoId3 + '/published')
          .expect('Content-Type', /json/)
          .send( { published: false })
          .expect(200)
          .end( function(err, res){
            test.ifError( err );

            test.done();
          });
        });
      });
    });
  },

  // Videos 1,2 are owned by user1, videos 3,4,5 are owned by user2
  // Videos 2 (user 1)  and 4, 5 (user 2) are published
  "video searching -- check filters": function( test ){

    // Get all of the published videos by anybody
    globals.agent1.get('/stores/videos')
    .expect('Content-Type', /json/)
    .expect(200)
    .end( function(err, res){
      test.ifError( err );

      test.equal( res.body.length, 4 );

      // Get all of the published videos owned by agent1.
      // Note: unpublished here doesn't matter since they agent1's own
      globals.agent1.get('/stores/videos')
      .query( { userId: globals.userId1 })
      .expect('Content-Type', /json/)
      .expect(200)
      .end( function(err, res){
        test.ifError( err );

        test.equal( res.body.length, 2 );

        // agent1 gets all published videos from agent2.
        // Only the published ones show
        globals.agent1.get('/stores/videos')
        .query( { userId: globals.userId2 })
        .expect('Content-Type', /json/)
        .expect(200)
        .end( function(err, res){
          test.ifError( err );

          test.equal( res.body.length, 2 );

          // agent2 gets all published videos from agent1.
          // Only the published ones show
          globals.agent2.get('/stores/videos')
          .query( { userId: globals.userId1 })
          .expect('Content-Type', /json/)
          .expect(200)
          .end( function(err, res){
            test.ifError( err );

            test.equal( res.body.length, 1 );

            // All videos VERY near. One is missing as it's too far.
            globals.agent1.get('/stores/videos')
            .expect('Content-Type', /json/)
            .query( { lon: -73.9667, lat: 40.78, dist: 0.001 })
            .expect(200)
            .end( function(err, res){
              test.ifError( err );

              test.equal( res.body.length, 3 );

              // All videos near enough. They should all be here
              globals.agent1.get('/stores/videos')
              .expect('Content-Type', /json/)
              .query( { lon: -73.9667, lat: 40.78, dist: 115000 })
              .expect(200)
              .end( function(err, res){
                test.ifError( err );

                test.equal( res.body.length, 4 );

                // All videos near enough. They should all be here
                globals.agent1.get('/stores/videos')
                .expect('Content-Type', /json/)
                .query( { s: 'mest' })
                .expect(200)
                .end( function(err, res){
                  test.ifError( err );

                  test.equal( res.body.length, 1 );

                  // All videos near enough. They should all be here
                  globals.agent1.get('/stores/videos')
                  .expect('Content-Type', /json/)
                  .query( { s: 'tag4' })
                  .expect(200)
                  .end( function(err, res){
                    test.ifError( err );

                    test.equal( res.body.length, 4 );

                    //console.log("RESULT 2: ", require('util').inspect( res.body, {depth: 10 } ));

                    test.done();
                  });
                });
              });
            });
          });
        });
      });
    });
  },

  "video resources": function( test ){

    // globals.videoTemplateId

    var baseUrl = '/stores/videoTemplates/' + globals.videoTemplateId + '/resources';

    // Post record without file
    globals.agent1.post( baseUrl )
    .expect('Content-Type', /json/)
    .send( {} )
    .expect(201)
    .end( function(err, res1){
      test.ifError( err );

      globals.resource1 = res1.body;

      //console.log("RES1: ", res1.body );

      // Another record without file
      globals.agent1.post( baseUrl )
      .expect('Content-Type', /json/)
      .send( {} )
      .expect(201)
      .end( function(err, res2){
        test.ifError( err );

        globals.resource2 = res2.body

        //console.log("RES2: ", res2.body );

        // PUT file as one-field on existing one
        globals.agent1.put( baseUrl + "/" + res1.body.id + '/fileName' )
        .expect('Content-Type', /json/)
        .attach('fileName', 'tests/test.mp4')
        .set('Accept', 'application/json')
        .expect(200)
        .end( function(err, res){
          test.ifError( err );

          test.notEqual( res.body.fileName, '' );

          // PUT file as one-field with WRONG field name
          globals.agent1.post( baseUrl )
          .expect('Content-Type', /json/)
          .send( {} )
          .expect(422)
          .attach('fileName2', 'tests/test.mp4')
          .end( function(err, res3){
            test.ifError( err );

            globals.resource3 = res3.body;

            test.done();
          });
        });
      });
    })
  },

  "video views": function( test ){

    globals.agent1.get('/stores/videos/' + globals.videoId1)
    .expect('Content-Type', /json/)
    .expect(200)
    .end( function(err, res){
      test.ifError( err );

      test.equals( res.body.views, 0 );



      globals.agent1.get('/stores/relatedVideos/' + globals.videoId1)
      .expect('Content-Type', /json/)
      .expect(200)
      .end( function(err, res){
        test.ifError( err );

        // console.log("RESULT: ", globals.videoId1, require('util').inspect( res.body, { depth: 10 } ) );
      });

      globals.agent1.get('/video/' + globals.videoUrl1)
      .expect('Content-Type', /html/)
      .expect(200)
      .end( function(err, res){
        test.ifError( err );

        globals.agent1.get('/video/' + globals.videoUrl1)
        //.expect('Content-Type', /html/)
        .expect(200)
        .end( function(err, res){
          test.ifError( err );

          globals.agent1.get('/stores/videos/' + globals.videoId1)
          .expect('Content-Type', /json/)
          .expect(200)
          .end( function(err, res){
            test.ifError( err );

            test.equals( res.body.views, 2 );

            globals.agent1.get('/video/' + globals.videoUrl1)
            //.expect('Content-Type', /html/)
            .expect(200)
            .end( function(err, res){
              test.ifError( err );

              globals.agent1.get('/video/' + globals.videoUrl1)
              //.expect('Content-Type', /html/)
              .expect(200)
              .end( function(err, res){
                test.ifError( err );

                globals.agent1.get('/stores/videos/' + globals.videoId1)
                .expect('Content-Type', /json/)
                .expect(200)
                .end( function(err, res){
                  test.ifError( err );

                  test.equals( res.body.views, 4 );

                  test.done();
                });
              })
            });
          })
        })
      })
    });
  },

  "video likes": function( test ){

    // Like an unpublished video
    globals.agent1.post('/stores/videos/' + globals.videoId1 + '/likes')
    //.expect('Content-Type', /json/)
    .expect(403)
    .end( function(err, res){
      test.ifError( err );

      // Like an published video
      globals.agent1.post('/stores/videos/' + globals.videoId2 + '/likes')
      .expect('Content-Type', /json/)
      .expect(201)
      .end( function(err, res){
        test.ifError( err );

        globals.agent1.get('/stores/videos/' + globals.videoId2)
        .expect('Content-Type', /json/)
        .expect(200)
        .end( function(err, res){
          test.ifError( err );

          test.equals( res.body.likes, 1 );

          // Double liking not permitted
          globals.agent1.post('/stores/videos/' + globals.videoId2 + '/likes')
          //.expect('Content-Type', /json/)
          .expect(422)
          .end( function(err, res){
            test.ifError( err );

            test.done();
          });
        });
      });
    });
  },

  "reported videos": function( test ){

    // Report an unpublished video
    globals.agent1.post('/stores/videos/' + globals.videoId1 + '/reports')
    .send( { reason: "Some reason", category: '10' })
    //.expect('Content-Type', /json/)
    .expect(403)
    .end( function(err, res){
      test.ifError( err );

      // Report an published video
      globals.agent1.post('/stores/videos/' + globals.videoId2 + '/reports')
      .expect('Content-Type', /json/)
      .send( { reason: "Some reason", category: '10' })
      .expect(201)
      .end( function(err, res){
        test.ifError( err );

        globals.agent1.get('/stores/videos/' + globals.videoId2)
        .expect('Content-Type', /json/)
        .expect(200)
        .end( function(err, res){
          test.ifError( err );

          test.equals( res.body._children.videosReports.length, 1 );
          test.equals( res.body._children.videosReports[0].reason, "Some reason" );
          test.equals( res.body._children.videosReports[0].category, "10" );

          // Double reporting not permitted
          globals.agent1.post('/stores/videos/' + globals.videoId2 + '/reports')
          //.expect('Content-Type', /json/)
          .send( { reason: "Some reason", category: '10' })
          .expect(422)
          .end( function(err, res){
            test.ifError( err );

            test.done();
          });
        });
      });
    });

  },

  "video tags": function( test ){

    // Add a tag
    globals.agent1.post('/stores/videos/' + globals.videoId2 + '/tags')
    .expect('Content-Type', /json/)
    .send( { tagType: '1', tagName: "ten" })
    .expect(201)
    .end( function(err, res){
      test.ifError( err );

      globals.agent1.get('/stores/videos/' + globals.videoId2)
      .expect('Content-Type', /json/)
      .expect(200)
      .end( function(err, res){
        test.ifError( err );

        test.equals( res.body._children.videosTags.length, 6 );

        // Same tag not permitted
        globals.agent1.post('/stores/videos/' + globals.videoId2 + '/tags')
        //.expect('Content-Type', /json/)
        .send( { tagType: '1', tagName: "ten" })
        .expect(422)
        .end( function(err, res){
          test.ifError( err );

          // New superTag
          globals.agent1.post('/stores/videos/' + globals.videoId2 + '/tags')
          .expect('Content-Type', /json/)
          .send( { tagType: '2', tagName: "Travel" })
          .expect(201)
          .end( function(err, res){
            test.ifError( err );

            // Wrong superTag
            globals.agent1.post('/stores/videos/' + globals.videoId2 + '/tags')
            //.expect('Content-Type', /json/)
            .send( { tagType: '2', tagName: "Travel2" })
            .expect(422)
            .end( function(err, res){
              test.ifError( err );

              test.done();
            });
          });
        });
      });
    });
  },

  "security tests": function( test ){

    // Change published on a record that is NOT mine
    globals.agent2.put('/stores/videos/'+ globals.videoId2 + '/published' )
    //.expect('Content-Type', /html/)
    .send( { published: true })
    .expect(403)
    .end( function(err, res){
      test.ifError( err );

      // NOTE: This test failed at one point, as if autoLookup made this return
      // "FileNotFound"

      // Try to add a resource to a video template that isn't mine
      var baseUrl = '/stores/videoTemplates/' + globals.videoTemplateId + '/resources';
      globals.agent2.put( baseUrl + "/" + globals.resource1.id + '/fileName' )
      .expect('Content-Type', /json/)
      .attach('fileName', 'tests/test.mp4')
      .set('Accept', 'application/json')
      .expect(403)
      .end( function(err, res){
        test.ifError( err );

        // New superTag on a video that isn't mine
        globals.agent2.post('/stores/videos/' + globals.videoId2 + '/tags')
        //.expect('Content-Type', /json/)
        .send( { tagType: '2', tagName: "Music" })
        .expect(403)
        .end( function(err, res){
          test.ifError( err );

          // New superTag on a video that isn't mine
          globals.agent1.post('/stores/videos/' + globals.videoId2 + '/tags')
          .expect('Content-Type', /json/)
          .send( { tagType: '2', tagName: "Music" })
          .expect(201)
          .end( function(err, res){
            test.ifError( err );

            // Delete superTag on a video that isn't mine
            globals.agent2.delete('/stores/videos/' + globals.videoId2 + '/tags/' + res.body.id )
            //.expect('Content-Type', /json/)
            .expect(403)
            .end( function( err ){
              test.ifError( err );

              // Delete superTag on a video that IS mine
              globals.agent1.delete('/stores/videos/' + globals.videoId2 + '/tags/' + res.body.id )
              .expect('Content-Type', /json/)
              .expect(200)
              .end( function(err, res){
                test.ifError( err );

                test.done();
              });
            });
          });
        });
      });
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
