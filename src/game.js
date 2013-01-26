define([
  'frozen/GameCore', 'frozen/ResourceManager', 'dojo/keys', 'dojo/_base/declare', 'frozen/Animation', 'frozen/box2d/Box', 'frozen/box2d/RectangleEntity', 'frozen/box2d/PolygonEntity', 'frozen/box2d/CircleEntity', 'frozen/box2d/MultiPolygonEntity', 'frozen/utils',
  'dojo/dom',
  'dojo/on',
  'game/WsRpc',
  'qrcode/qrcode',
  'dojo/domReady!'
], function(
  GameCore, ResourceManager, keys, declare, Animation, Box, Rectangle, Polygon, Circle, MultiPolygon, utils,
  dom,on,WsRpc, qrcode){

  var rand = 's' + Math.floor(Math.random() * 10000000);

  var wsrpc = new WsRpc({socket: io.connect('http://rebroadcast.nodester.com:80') });
  //var wsrpc = new WsRpc({socket: io.connect('http://192.168.2.200:11097') });
  window.wsrpc = wsrpc; //export global to play with in web dev tools

  var torqueTotal = 0;
  var flip = false;
  var url = 'http://rebroadcast.nodester.com/control?id=' + rand;
  //var url = 'http://192.168.2.200:11097/control?id=' + rand;
  var showURL = true;

  var qr = qrcode(4,'M');
  qr.addData(url);
  qr.make();

  dom.byId('logo').style.display = 'none';

  wsrpc.socket.on('broadcast', function(obj){
    //console.log('broadcasted:',obj);
    if(obj.hasOwnProperty('beta')){
      torqueTotal= obj.beta;
    }else{
      console.log('broadcasted:',obj);
    }

    if(obj.btnA){
      flip = true;
    }

    if(obj.btnB){
      rm.playSound(horn);
    }

    showURL = false;
    
  });

  wsrpc._ready.then(function(){
    wsrpc.joinChannel(rand).then(function(){
      console.log('joined', rand);
      //dom.byId('output').innerHTML = rand;
    });

  });






  //dimensions same as canvas.
  var gameH = 480;
  var gameW = 770;
  var offscrCtx;
  
  var speed = 30;
  
  var rm = new ResourceManager();
  var backImg = rm.loadImage('images/longBackground.png');
  var vanImg = rm.loadImage('images/vanagon.png');
  var tireImg = rm.loadImage('images/tire.png');
  var hit = rm.loadSound('sounds/hit.wav');
  var whoosh = rm.loadSound('sounds/whoosh.wav');
  var backWhoosh = rm.loadSound('sounds/backWhoosh.wav');
  var horn = rm.loadSound('sounds/horn.wav');

  var staticBodies = [{"x":1155,"y":460,"halfWidth":1500,"halfHeight":20,"staticBody":true,"type":"Rectangle"},{"x":1155,"y":-500,"halfWidth":1500,"halfHeight":20,"staticBody":true,"type":"Rectangle"},{"points":[{"x":2.3333333333333712,"y":-60},{"x":123.33333333333337,"y":51.666666666666686},{"x":-126.66666666666663,"y":50.666666666666686}],"x":807.6666666666666,"y":391.3333333333333,"staticBody":true,"type":"Polygon"},{"x":-40,"y":10,"halfWidth":30,"halfHeight":1200,"staticBody":true,"type":"Rectangle"},{"x":2340,"y":10,"halfWidth":30,"halfHeight":1200,"staticBody":true,"type":"Rectangle"},{"points":[{"x":3.3333333333332575,"y":-100.33333333333331},{"x":120.33333333333326,"y":48.666666666666686},{"x":-123.66666666666674,"y":51.666666666666686}],"x":2029.6666666666667,"y":393.3333333333333,"staticBody":true,"type":"Polygon"}];

  var portalCollisionDistance = 50;
  var animFactory = new Animation();

  var orangePortalSheet = rm.loadImage('images/portal_orange_sheet_small.png');
  var orangePortalAnim = animFactory.createFromTile(12, 100, orangePortalSheet, 120, 80, 0);
  var orangePortal = {x: 600, y: 100, collided: true};

  var bluePortalSheet = rm.loadImage('images/portal_blue_sheet_small.png');
  var bluePortalAnim = animFactory.createFromTile(12, 100, bluePortalSheet, 120, 80, 0);
  var bluePortal = {x: 2000, y: 100, collided: true};
  
  var box;
  var world = {};

  //pixels per meter for box2d
  var SCALE = 30.0;

  //objects in box2d need an id
  var geomId = 1;

  //shapes in the box2 world, locations are their centers
  var van, lWheel, rWheel;

 
  // create our box2d instance
  box = new Box({intervalRate:60, adaptive:false, width:gameW, height:gameH, scale:SCALE, gravityY:9.8, resolveCollisions: true});

  for (var i = 0; i < staticBodies.length; i++) {
    geomId++;
    var body = staticBodies[i];
    var entity;
    if(body.type === 'Rectangle'){
      entity = new Rectangle({
        id: geomId,
        x: body.x / SCALE,
        y: body.y / SCALE,
        halfWidth: body.halfWidth / SCALE,
        halfHeight: body.halfHeight / SCALE,
        staticBody: true
      });
    }else if(body.type === 'Polygon'){
      entity = new Polygon({
        id: geomId,
        x: body.x / SCALE,
        y: body.y / SCALE,
        points: utils.scalePoints(body.points, 1/SCALE),
        staticBody: true
      });
    }

    if(entity){
      box.addBody(entity); //add the shape to the box
      world[geomId] = entity; //keep a reference to the shape for fast lookup
    }
  }

  geomId++;
  van = new Rectangle({
    id: geomId,
    x: 116 / SCALE,
    y: 306 / SCALE,
    halfWidth: 65 / SCALE,
    halfHeight: 30 / SCALE,
    staticBody: false,
    draw: function(ctx, scale){ // we want to render the van with an image
      ctx.save();
      ctx.translate(this.x * scale, this.y * scale);
      ctx.rotate(this.angle); // this angle was given to us by box2d's calculations
      ctx.translate(-(this.x) * scale, -(this.y) * scale);
      ctx.fillStyle = this.color;
      ctx.drawImage(
        vanImg,
        (this.x-this.halfWidth) * scale -11, //lets offset it a little to the left
        (this.y-this.halfHeight) * scale -4
      );
      ctx.restore();
    }
  });
  box.addBody(van);
  world[geomId] = van;





  geomId++;
  lWheel = new Circle({
    id: geomId,
    x: 74 / SCALE,
    y: 337 / SCALE,
    staticBody: false,
    radius: 20 / SCALE,
    friction: 20,
    density: 1,
    draw: function(ctx, scale){

            // Stroked line
      ctx.save();
      ctx.translate(this.x * scale, this.y * scale);
      ctx.rotate(this.angle); // this angle was given to us by box2d's calculations
      ctx.translate(-(this.x) * scale, -(this.y) * scale);
       ctx.drawImage(
        tireImg,
        (this.x-this.radius) * scale, //lets offset it a little to the left
        (this.y-this.radius) * scale
      );

      ctx.restore();

    }
  });
  box.addBody(lWheel);
  world[geomId] = lWheel;
  box.addRevoluteJoint(lWheel.id, van.id);

  geomId++;
  rWheel = new Circle({
    id: geomId,
    x: 161 / SCALE,
    y: 337 / SCALE,
    staticBody: false,
    radius: 20 / SCALE,
    friction: 20,
    density: 1,
    draw: function(ctx, scale){
            // Stroked line
      ctx.save();
      ctx.translate(this.x * scale, this.y * scale);
      ctx.rotate(this.angle); // this angle was given to us by box2d's calculations
      ctx.translate(-(this.x) * scale, -(this.y) * scale);
       ctx.drawImage(
        tireImg,
        (this.x-this.radius) * scale, //lets offset it a little to the left
        (this.y-this.radius) * scale
      );

      ctx.restore();

    }
  });
  box.addBody(rWheel);
  world[geomId] = rWheel;
  box.addRevoluteJoint(rWheel.id, van.id);


  //setup a GameCore instance
  var game = new GameCore({
    canvasId: 'canvas',
    gameAreaId: 'gameArea',
    canvasPercentage: 0.9,
    resourceManager: rm,
    initInput: function(im){
      //tells the input manager to listen for key events
      im.addKeyAction(keys.LEFT_ARROW);
      im.addKeyAction(keys.RIGHT_ARROW);
      im.addKeyAction(keys.UP_ARROW);
      im.addKeyAction(keys.DOWN_ARROW);
      im.addKeyAction(keys.ENTER);

      im.addKeyAction('A');
      im.addKeyAction('D');

    },
    handleInput: function(im){
      if(im.keyActions[keys.LEFT_ARROW].isPressed()){
        box.applyImpulseDegrees(van.id, 270, speed / 5);
      }

      if(im.keyActions[keys.ENTER].isPressed()){
        showURL = false;
      }

      if(im.keyActions[keys.RIGHT_ARROW].isPressed()){
        box.applyImpulseDegrees(van.id, 90, speed / 5);
      }

      if(im.keyActions[keys.UP_ARROW].isPressed()){
        box.applyImpulseDegrees(van.id, 0, speed / 5);
      }

      if(im.keyActions['A'].isPressed()){
        box.applyTorque(rWheel.id, -speed);
        box.applyTorque(lWheel.id, -speed);
      }


      if(im.keyActions['D'].isPressed()){
        box.applyTorque(rWheel.id, speed);
        box.applyTorque(lWheel.id, speed);
      }


      if(im.touchAction.isPressed()){ //mobile first :)
        box.applyImpulse(van.id, utils.radiansFromCenter({x:van.x * SCALE, y:van.y * SCALE},im.touchAction.position), speed / 5);
      }
      else if(im.mouseAction.isPressed()){
        box.applyImpulse(van.id, utils.radiansFromCenter({x:van.x * SCALE, y:van.y * SCALE},im.mouseAction.position), speed / 5);
      }


    },
    update: function(millis){
      
      box.update();//have box2d do an interation
      box.updateExternalState(world); //have update local objects with box2d state

      //update the animations
      orangePortalAnim.update(millis);
      bluePortalAnim.update(millis);

      box.applyTorque(rWheel.id, torqueTotal * 2);
      box.applyTorque(lWheel.id, torqueTotal * 2);

      if(flip){
        flip = false;
        var vanDegrees = utils.radiansToDegrees(van.angle);
        vanDegrees = vanDegrees % 360;
        if(vanDegrees < 0){
          vanDegrees += 360;
        }
        if(vanDegrees > 60  && vanDegrees < 300){
          box.setPosition(van.id, van.x, van.y - 2);
          box.setAngle(van.id, 0);
        }
        
      }


      //this is for simple distance-based collision detection outside of box2s
      var blueDist = utils.distance({x: van.x * SCALE, y: van.y * SCALE}, bluePortal);
      var orangeDist = utils.distance({x: van.x * SCALE, y: van.y * SCALE}, orangePortal);

      if(blueDist > portalCollisionDistance){
        bluePortal.collided = false;
      }
      if(orangeDist > portalCollisionDistance){
        orangePortal.collided = false;
      }

      if(orangeDist < portalCollisionDistance && !orangePortal.collided){
        bluePortal.collided = true;
        box.setPosition(van.id, (bluePortal.x + 350) / SCALE, bluePortal.y / SCALE);
        rm.playSound(whoosh);
      }
      else if(blueDist < portalCollisionDistance && !bluePortal.collided){
        orangePortal.collided = true;
        box.setPosition(van.id, (orangePortal.x - 350) / SCALE , orangePortal.y / SCALE);
        rm.playSound(backWhoosh);
      }


      // this uses a simple wrapper for box2d's own collision detection
      if(van.collisions){
        van.collisions.forEach(function(collision){
          if(collision.impulse > 10){
            //console.log('van collision impulse:', collision.id , collision.impulse);
            rm.playSound(hit);
          }
        });
      }

    },
    draw: function(context){

      

      if(showURL){
        context.fillStyle = '#FFF';
        context.fillRect(0,0,this.canvas.width, this.canvas.height);
        qr.renderToContext(context, 14, 150, 5 );

      }else{

        if(!offscrCtx){
          var buffer = document.createElement('canvas');
          buffer.width =  backImg.width;
          buffer.height = backImg.height;
          offscrCtx = buffer.getContext('2d');
        }

        offscrCtx.drawImage(backImg, 0, 0, backImg.width, backImg.height);
        orangePortalAnim.draw(offscrCtx, orangePortal.x - orangePortalAnim.width / 2, orangePortal.y - orangePortalAnim.height / 2);
        bluePortalAnim.draw(offscrCtx, bluePortal.x - bluePortalAnim.width / 2, bluePortal.y - bluePortalAnim.height / 2);
        van.draw(offscrCtx, SCALE);
        lWheel.draw(offscrCtx, SCALE);
        rWheel.draw(offscrCtx, SCALE);

        var vanX = van.x * SCALE;
        var offsetX = 0;
        if( (vanX >= this.canvas.width / 2) && (vanX <= backImg.width - (this.canvas.width / 2) )){
          offsetX = -vanX + (this.canvas.width / 2);
          context.drawImage(offscrCtx.canvas, offsetX, 0);
        }else if(vanX > ( backImg.width - (this.canvas.width / 2) ) ){
          context.drawImage(offscrCtx.canvas, this.canvas.width - backImg.width, 0);
        }else{
          context.drawImage(offscrCtx.canvas, 0, 0);

        }


      }
        
    }
  });

  //if you want to take a look at the game object in dev tools
  console.log(game);

  //launch the game!
  game.run();



});
