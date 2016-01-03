var request = require('supertest');
var express = require('express');
var assert = require('assert');
var http = require('http');
var bodyParser = require('body-parser');

var swaggerInputValidator = require('../module.js');


describe('Wrong instanciation', function() {
  var swaggerFile;
  before(function(){
    swaggerFile = require('./../swagger-examples/UberAPI.json');
  });

  it('should crash if no swagger object is specified', function(done){
    assert.throws(function(){
      new swaggerInputValidator();
    });
    done();
  });
  it('should crash if bad swagger file is specified', function(done){
    assert.throws(function(){
      new swaggerInputValidator("fake object");
    });
    done();
  });
  it('should crash if swagger file without paths variable is specified', function(done){
    assert.throws(function(){
      new swaggerInputValidator({
        "swagger": "2.0",
        "info": {
            "title": "Uber API",
            "description": "Move your app forward with the Uber API",
            "version": "1.0.0"
        },
        "host": "api.uber.com",
        "schemes": [
            "https"
        ],
        "basePath": "/v1",
        "produces": [
            "application/json"
        ]
      });
    });
    done();
  });
  it('should crash if bad option object is passed', function(done){
    assert.throws(function(){
      new swaggerInputValidator(swaggerFile, "wrong option parameter");
    });
    done();
  });
  it('should crash if bad option.onError function is passed', function(done){
    assert.throws(function(){
      new swaggerInputValidator(swaggerFile, {onError:"wrong option.onError parameter"});
    });
    done();
  });
  it('should crash if bad option.strict variable is passed', function(done){
    assert.throws(function(){
      new swaggerInputValidator(swaggerFile, {strict:"wrong option.success parameter"});
    });
    done();
  });
});

describe('good instanciation', function() {

  var swaggerFile;
  before(function(){
    swaggerFile = require('./../swagger-examples/UberAPI.json');
  });

  it('should NOT crash if valid swagger is passed', function(done){
    new swaggerInputValidator(swaggerFile);
    done();
  });
  it('should NOT crash if valid swagger is passed + valid onError function', function(done){
    new swaggerInputValidator(swaggerFile, {onError: function(errors, req, res){}});
    done();
  });
  it('should NOT crash if valid swagger is passed + valid strict variable', function(done){
    new swaggerInputValidator(swaggerFile, {strict: false});
    done();
  });
  it('should NOT crash if valid swagger is passed + valid strict variable + valid onError function', function(done){
    new swaggerInputValidator(swaggerFile, {strict: false, onError: function(errors, req, res){}});
    done();
  });
});

describe('missing parameters in get (in query)', function(){
  var server;
  before(function(){
    swaggerFile = require('./../swagger-examples/UberAPI.json');
    server = createFakeServer(new swaggerInputValidator(swaggerFile).get("/products"));
  });

  it('should return an HTTP 400 code when all parameters are missing', function(done){
    request.agent(server)
    .get('/products')
    .expect(400)
    .end(done);
  });

  it('should return an HTTP 400 code when only one parameter is missing', function(done){
    request.agent(server)
    .get('/products?longitude=50')
    .expect(400, "Error: Parameter : latitude is not specified.\n")
    .end(done);
  });

  it('should return an HTTP 400 code when only one parameter is missing', function(done){
    request.agent(server)
    .get('/products?latitude=50')
    .expect(400, "Error: Parameter : longitude is not specified.\n")
    .end(done);
  });
});

describe('missing parameters in get with custom errorHandling (in query)', function(){
  var server;
  before(function(){
    swaggerFile = require('./../swagger-examples/UberAPI.json');
    var customOnError = function(errors, req, res){
      res.status(501).json({error : "Custom Error"});
    };
    server = createFakeServer(new swaggerInputValidator(swaggerFile, {onError: customOnError}).get("/products"));
  });

  it('should return an HTTP 501 code when all parameters are missing', function(done){
    request.agent(server)
    .get('/products')
    .expect(501, {error : "Custom Error"})
    .end(done);
  });

  it('should return an HTTP 501 code when only one parameter is missing', function(done){
    request.agent(server)
    .get('/products?longitude=50')
    .expect(501, {error : "Custom Error"})
    .end(done);
  });

  it('should return an HTTP 501 code when only one parameter is missing', function(done){
    request.agent(server)
    .get('/products?latitude=50')
    .expect(501, {error : "Custom Error"})
    .end(done);
  });
});

describe('All parameters provided in get (in query / path)', function(){
  var server;
  before(function(){
    swaggerFile = require('./../swagger-examples/UberAPI.json');
    server = createFakeServer(new swaggerInputValidator(swaggerFile, {strict: true}).get("/products"));
  });

  it('should return an HTTP 200 code when all parameters are provided in query', function(done){
    request.agent(server)
    .get('/products?longitude=50&latitude=50')
    .expect(200, { success: 'If you can enter here, it means that the swagger middleware let you do so' })
    .end(done);
  });

  it('should return an HTTP 200 code when one parameter is provided in path', function(done){

    var app = express();
    app.get('/user/:id', new swaggerInputValidator(swaggerFile, {strict: true}).get("/user/:id"), function(req, res){
      res.status(200).json({ success: 'If you can enter here, it means that the swagger middleware let you do so' });
    });

    request.agent(app)
    .get('/user/50')
    .expect(200, { success: 'If you can enter here, it means that the swagger middleware let you do so' })
    .end(done);
  });

  it('should return an HTTP 200 code when optional parameter is provided also in query', function(done){
    request.agent(server)
    .get('/products?longitude=50&latitude=50&optional=IamOptionalButPresentWithinTheSwaggerFile')
    .expect(200, { success: 'If you can enter here, it means that the swagger middleware let you do so' })
    .end(done);
  });

});

describe('strict / no strict mode)', function(){
  var server;
  before(function(){
    swaggerFile = require('./../swagger-examples/UberAPI.json');
    serverInStrictMode = createFakeServer(new swaggerInputValidator(swaggerFile, {strict: true}).get("/products"));
    serverNotInStrictMode = createFakeServer(new swaggerInputValidator(swaggerFile, {strict: false}).get("/products"));
  });

  it('should return an HTTP 200 code when extra is provided and strict = false', function(done){
    request.agent(serverNotInStrictMode)
    .get('/products?longitude=50&latitude=50&extraParameter=shouldNotWork')
    .expect(200, { success: 'If you can enter here, it means that the swagger middleware let you do so' })
    .end(done);
  });

  it('should return an HTTP 400 code when extra parameters are provided and strict = true', function(done){
    request.agent(serverInStrictMode)
    .get('/products?longitude=50&latitude=50&extraParameter=shouldNotWork')
    .expect(400, "Error: Parameter : extraParameter should not be specified.\n")
    .end(done);
  });

});



function createFakeServer(swaggerMiddleware){
  var app = express();

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(swaggerMiddleware);

  app.use(function(req, res){
    res.status(200).json({ success: 'If you can enter here, it means that the swagger middleware let you do so' });
  });

  app.use('/user/:id', swaggerMiddleware, function(req, res){
    console.log('----------------------------')
    console.log(req.params);
    console.log('----------------------------')
    res.status(200).json({ success: 'If you can enter here, it means that the swagger middleware let you do so' });
  });


  return app;
};
