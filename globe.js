/**
 * dat.globe Javascript WebGL Globe Toolkit
 * http://dataarts.github.com/dat.globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

var DAT = DAT || {};

DAT.Globe = function(container, colorFn) {

  colorFn = colorFn || function(x) {
    var c = new THREE.Color();
    //c.setHSV( ( 0.6 - ( x * 0.5 ) ), 1.0, 1.0 );
    //c.setHSV( ( 0.6 - ( x * 0.5 ) ), 1.0, 1.0 );
    //c.setRGB( 253,185,24);
    c.setHSV( 0, 0, 0 );
    return c;
  };

  var Shaders = {
    'earth' : {
      uniforms: {
        'texture': { type: 't', value: 0, texture: null }
      },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
          'vNormal = normalize( normalMatrix * normal );',
          'vUv = uv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D texture;',
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'vec3 diffuse = texture2D( texture, vUv ).xyz;',
          'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
          'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
          'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
        '}'
      ].join('\n')
    },
    'atmosphere' : {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'vNormal = normalize( normalMatrix * normal );',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'float intensity = pow( 0.7 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
          'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
        '}'
      ].join('\n')
    /*'atmosphere' : {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'vNormal = normalize( normalMatrix * normal );',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
          'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
        '}'
      ].join('\n')*/
    }
  };

  var camera, scene, sceneAtmosphere, renderer, w, h;
  var vector, mesh, atmosphere, point;

  var overRenderer;

  var imgDir = '/globe/';

  var curZoomSpeed = 0;
  var zoomSpeed = 50;

  var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
  var rotation = { x: 0, y: 0 },
      target = { x: Math.PI*3/2, y: Math.PI / 6.0 },
      targetOnDown = { x: 0, y: 0 },
      diffX = 0, diffY = 0;

  var distance = 100000, distanceTarget = 100000;
  var padding = 40;
  var PI_HALF = Math.PI / 2;

  this.planets = [];
  var that = this;

  function init() {

    container.style.color = '#fff';
    container.style.font = '13px/20px Arial, sans-serif';

    var shader, uniforms, material;
    w = container.offsetWidth || window.innerWidth;
    h = container.offsetHeight || window.innerHeight;

    camera = new THREE.Camera( 30, w / h, 1, 10000);
    camera.position.z = distance;

    vector = new THREE.Vector3();
    scene = new THREE.Scene();
    sceneAtmosphere = new THREE.Scene();

    var geometry = new THREE.Sphere(200, 50, 30);

    shader = Shaders['earth'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    uniforms['texture'].texture = THREE.ImageUtils.loadTexture('world-5.jpg');
    //uniforms['texture'].texture = THREE.ImageUtils.loadTexture('world' + '.jpg');

    material = new THREE.MeshShaderMaterial({
        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader
     });

    mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    scene.addObject(mesh);
    shader = Shaders['atmosphere'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    material = new THREE.MeshShaderMaterial({
          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader
    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.scale.x = mesh.scale.y = mesh.scale.z = 1.1;
    mesh.flipSided = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    sceneAtmosphere.addObject(mesh);

    geometry = new THREE.Cube(0.75, 0.75, 1, 1, 1, 1, null, false, { px: true,
          nx: true, py: true, ny: true, pz: false, nz: true});

    for (var i = 0; i < geometry.vertices.length; i++) {
      var vertex = geometry.vertices[i];
      vertex.position.z += 0.5;
    }

    point = new THREE.Mesh(geometry);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.autoClear = false;
    renderer.setClearColorHex(0x000000, 0.0);
    renderer.setSize(w, h);

    renderer.domElement.style.position = 'absolute';

    container.appendChild(renderer.domElement);

    container.addEventListener('mousedown', onMouseDown, false);
    container.addEventListener('mousewheel', onMouseWheel, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);
    window.addEventListener('resize', onWindowResize, false);

    container.addEventListener('mouseover', function() {
      overRenderer = true;
    }, false);

    container.addEventListener('mouseout', function() {
      overRenderer = false;
    }, false);

    //testing
    /*var options = [
      { radius: 10, planetSpeed: 1, orbitRadius: 450, color: 0x164df5, thetaInit: 10 },
      { radius: 10, planetSpeed: 2, orbitRadius: 370, declination: -45, color: 0xda142d, thetaInit: 30  },
      { radius: 10, planetSpeed: -1, orbitRadius: 450, color: 0x03a319, thetaInit: 4  },
      { radius: 10, planetSpeed: 1.5, orbitRadius: 250, declination: 90, color: 0xfdb918, thetaInit: 60  },
      { radius: 10, planetSpeed: 1, orbitRadius: 250, declination: 25, color: 0xda142d, thetaInit: 20  },
      { radius: 10, planetSpeed: 2, orbitRadius: 370, declination: -5, color: 0x164df5, thetaInit: 10  },
      { radius: 10, planetSpeed: -1, orbitRadius: 330, color: 0x03a319, thetaInit: 180  },
      { radius: 10, planetSpeed: 1.5, orbitRadius: 290, declination: 30, color: 0x164df5, thetaInit: 130  },
      { radius: 10, planetSpeed: 1, orbitRadius: 390, color: 0x164df5, thetaInit: 160  },
      { radius: 10, planetSpeed: -3, orbitRadius: 280, declination: -75, color: 0xda142d, thetaInit: 15  },
      { radius: 10, planetSpeed: -1, orbitRadius: 250, declination: -35, color: 0x03a319, thetaInit: 65 },
      { radius: 10, planetSpeed: 1.5, orbitRadius: 270, declination: -25, declination: 20, color: 0x164df5 , thetaInit: 78 },
      { radius: 10, planetSpeed: -1, orbitRadius: 450, color: 0x164df5, thetaInit: 10 },
      { radius: 10, planetSpeed: 2, orbitRadius: 370, declination: -45, color: 0xda142d, thetaInit: 30  },
      { radius: 10, planetSpeed: -1, orbitRadius: 450, color: 0x03a319, thetaInit: 4  },
      { radius: 10, planetSpeed: -1.5, orbitRadius: 250, declination: 90, color: 0xfdb918, thetaInit: 60  },
      { radius: 10, planetSpeed: -1, orbitRadius: 250, declination: 145, color: 0xda142d, thetaInit: 27  },
      { radius: 10, planetSpeed: 2, orbitRadius: 370, declination: -5, color: 0x164df5, thetaInit: 46  },
      { radius: 10, planetSpeed: -1, orbitRadius: 330, color: 0x03a319, thetaInit: 180  },
      { radius: 10, planetSpeed: 1.5, orbitRadius: 290, declination: 30, color: 0x164df5, thetaInit: 134  },
      { radius: 10, planetSpeed: 1, orbitRadius: 390, color: 0x164df5, thetaInit: 160  },
      { radius: 10, planetSpeed: 2, orbitRadius: 280, declination: -15, color: 0xda142d, thetaInit: 17  },
      { radius: 10, planetSpeed: -1, orbitRadius: 250, color: 0xfdb918, thetaInit: 65 },
      { radius: 10, planetSpeed: 1.5, orbitRadius: 270, declination: 20, color: 0x03a319 , thetaInit: 58 }
    ];*/

   var options = [
      { radius: 10, planetSpeed: 2, orbitRadius: 290, color: 0x03a319, thetaInit: 180  } /*,
      { radius: 10, planetSpeed: 2, orbitRadius: 320, declination: 45, color: 0x03a319, thetaInit: 134  },
      { radius: 10, planetSpeed: 2, orbitRadius: 350, color: 0x03a319, thetaInit: 160  },
      { radius: 10, planetSpeed: 2, orbitRadius: 380, color: 0x03a319, thetaInit: 17  },
      { radius: 10, planetSpeed: 2, orbitRadius: 400, color: 0x03a319, thetaInit: 65 },
      { radius: 10, planetSpeed: 2, orbitRadius: 440, color: 0x03a319 , thetaInit: 58 }*/
    ];
    
    var len = options.length, planet;
    for( var i = 0; i < len; i++ ) {
      planet = new Planet( camera, options[ i ] );
      scene.addObject( planet.mesh );
      that.planets.push( planet );
    }

  }
  
  var phiOffset = 0;
  var thetaOffset = 0;
  var thetaInit = 0;
  var earthRotation = -.001;
  var planetRotation = -.1;

  function rotatePlanets( diffX, diffY ) {
    target.x += earthRotation;
    var i = that.planets.length;
    while( --i > -1 ) {
      that.planets[ i ].rotate( diffX, diffY );
    }
  }

  var aligned = false;

  function align() {
    var i = that.planets.length;
    while( --i > -1 ) {

      if( !aligned ) {
        that.planets[ i ].setTargetThetaInit( 50, 3 );
        that.planets[ i ].setTargetDeclination( 0, 3 );
      } else {
        that.planets[ i ].reset( 3 );
      }
     
    }

    aligned = !aligned;
  }

  addData = function(data, opts) {
    var lat, lng, size, color, i, step, colorFnWrapper;

    opts.animated = opts.animated || false;
    this.is_animated = opts.animated;
    opts.format = opts.format || 'magnitude'; // other option is 'legend'
    console.log(opts.format);
    if (opts.format === 'magnitude') {
      step = 3;
      colorFnWrapper = function(data, i) { return colorFn(data[i+2]); }
    } else if (opts.format === 'legend') {
      step = 4;
      colorFnWrapper = function(data, i) { return colorFn(data[i+3]); }
    } else {
      throw('error: format not supported: '+opts.format);
    }

    if (opts.animated) {
      if (this._baseGeometry === undefined) {
        this._baseGeometry = new THREE.Geometry();
        for (i = 0; i < data.length; i += step) {
          lat = data[i];
          lng = data[i + 1];
//        size = data[i + 2];
          color = colorFnWrapper(data,i);
          size = 0;
          addPoint(lat, lng, size, color, this._baseGeometry);
        }
      }
      if(this._morphTargetId === undefined) {
        this._morphTargetId = 0;
      } else {
        this._morphTargetId += 1;
      }
      opts.name = opts.name || 'morphTarget'+this._morphTargetId;
    }
    var subgeo = new THREE.Geometry();
    for (i = 0; i < data.length; i += step) {
      lat = data[i];
      lng = data[i + 1];
      color = colorFnWrapper(data,i);
      size = data[i + 2];
      size = 1;
      //size = size*200;
      addPoint(lat, lng, size, color, subgeo);
    }
    if (opts.animated) {
      this._baseGeometry.morphTargets.push({'name': opts.name, vertices: subgeo.vertices});
    } else {
      this._baseGeometry = subgeo;
    }

  };


  function createPoints() {
    if (this._baseGeometry !== undefined) {
      if (this.is_animated === false) {
        this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
              color: 0xffffff,
              vertexColors: THREE.FaceColors,
              morphTargets: false
            }));
      } else {
        if (this._baseGeometry.morphTargets.length < 8) {
          console.log('t l',this._baseGeometry.morphTargets.length);
          var padding = 8-this._baseGeometry.morphTargets.length;
          console.log('padding', padding);
          for(var i=0; i<=padding; i++) {
            console.log('padding',i);
            this._baseGeometry.morphTargets.push({'name': 'morphPadding'+i, vertices: this._baseGeometry.vertices});
          }
        }
        this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
              color: 0xffffff,
              vertexColors: THREE.FaceColors,
              morphTargets: true
            }));
      }
      scene.addObject(this.points);
    }
  }

  function addPoint(lat, lng, size, color, subgeo) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (180 - lng) * Math.PI / 180;

    point.position.x = 200 * Math.sin(phi) * Math.cos(theta);
    point.position.y = 200 * Math.cos(phi);
    point.position.z = 200 * Math.sin(phi) * Math.sin(theta);

    point.lookAt(mesh.position);

    point.scale.z = -size;
    point.updateMatrix();

    var i;
    for (i = 0; i < point.geometry.faces.length; i++) {
      point.geometry.faces[i].color = color;
    }

    GeometryUtils.merge(subgeo, point);
  }

  function onMouseDown(event) {
    event.preventDefault();

    container.addEventListener('mousemove', onMouseMove, false);
    container.addEventListener('mouseup', onMouseUp, false);
    container.addEventListener('mouseout', onMouseOut, false);

    mouseOnDown.x = - event.clientX;
    mouseOnDown.y = event.clientY;

    targetOnDown.x = target.x;
    targetOnDown.y = target.y;

    container.style.cursor = 'move';
  }

  function onMouseMove(event) {
    mouse.x = - event.clientX;
    mouse.y = event.clientY;

    var zoomDamp = distance/1000;

    diffX += Math.abs( mouse.x - mouseOnDown.x );
    diffY += Math.abs( mouse.y - mouseOnDown.y );

    target.x = targetOnDown.x + ( mouse.x - mouseOnDown.x ) * 0.005 * zoomDamp;
    target.y = targetOnDown.y + ( mouse.y - mouseOnDown.y ) * 0.005 * zoomDamp;

    target.y = target.y > PI_HALF ? PI_HALF : target.y;
    target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
  }

  function onMouseUp(event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
    container.style.cursor = 'auto';
  }

  function onMouseOut(event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
  }

  function onMouseWheel(event) {
    event.preventDefault();
    if (overRenderer) {
      zoom(event.wheelDeltaY * 0.3);
    }
    return false;
  }

  function onDocumentKeyDown(event) {
    switch (event.keyCode) {
      case 38:
        zoom(100);
        event.preventDefault();
        break;
      case 40:
        zoom(-100);
        event.preventDefault();
        break;
    }
  }

  function onWindowResize( event ) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }

  function zoom(delta) {
    distanceTarget -= delta;
    var maxDistance = 2500;
    var minDistance = 350;
    distanceTarget = distanceTarget > maxDistance ? maxDistance : distanceTarget;
    distanceTarget = distanceTarget < minDistance ? minDistance : distanceTarget;
  }

  function animate() {
    requestAnimationFrame(animate);
    render();
  }

  var cameraAnimated = false;
  var cameraRotation = {x:0,y:0};
  var cameraTarget;

  function moveCamera() {
    cameraAnimated = true;
    //camera.target = that.planets[0].mesh;
    var pos = new THREE.Vector3( -400, 0, 0 );//that.planets[0].mesh.position;

    //get planet speed
    var planet = that.planets[ 0 ];
    var speed = planet.planetSpeed;
    //calculate time of orbit
    var orbitTime = ( 360 / speed ) / 60;
    //setInterval( function() {
      //console.log( "settimeout", orbitTime  );
    //}, orbitTime * 1000 );

    //console.log( "speed", speed, orbitTime );

    cameraTarget = new THREE.Object3D();
    cameraTarget.position = pos;
    //camera.target = cameraTarget;
    var distance = camera.position.distanceTo( pos );
    console.log( "camera.position", camera.position.)
    //console.log( camera.position.distanceTo( pos ) );
    //console.log( "pos", pos );
    //TweenLite.to( camera.position, 2, { x: pos.x, y: pos.y, z: pos.z, onUpdate: onCameraUpdate } );
    TweenLite.to( distance, 2, { distance: 0, onUpdate: onCameraUpdate } );
  }

  function onCameraUpdate() {
    console.log( "onCameraUpdate", distance );
  }

  function render() {
    zoom(curZoomSpeed);

    rotation.x += (target.x - rotation.x) * 0.1;
    rotation.y += (target.y - rotation.y) * 0.1;
    distance += (distanceTarget - distance) * 0.3;

    if( !cameraAnimated ) {
      camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
      camera.position.y = distance * Math.sin(rotation.y);
      camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);
    } else {
      distance = 1500;
      var steps = 1000;



    //  console.log( "camera.position", camera.position.x, camera.position.y, camera.position.z );

      /*camera.position.x = distance * Math.cos(cameraRotation.x);
      camera.position.y = 0;//distance * Math.cos(cameraRotation.x);
      camera.position.z = distance * Math.sin(cameraRotation.x);*/
   
      //cameraRotation.x += 2 / ( 180 / Math.PI );
      //console.log( "rotation", rotation );
    }
    

    vector.copy(camera.position);

    renderer.clear();
    renderer.render(scene, camera);
    renderer.render(sceneAtmosphere, camera);

    rotatePlanets( diffX, diffY );

    var step = 1.03;
    if( diffX > step ) diffX /= step;
    if( diffY > step ) diffY /= step;
 }

  init();
  this.animate = animate;
  this.align = align;
  this.moveCamera = moveCamera;


  this.__defineGetter__('time', function() {
    return this._time || 0;
  });

  this.__defineSetter__('time', function(t) {
    var validMorphs = [];
    var morphDict = this.points.morphTargetDictionary;
    for(var k in morphDict) {
      if(k.indexOf('morphPadding') < 0) {
        validMorphs.push(morphDict[k]);
      }
    }
    validMorphs.sort();
    var l = validMorphs.length-1;
    var scaledt = t*l+1;
    var index = Math.floor(scaledt);
    for (i=0;i<validMorphs.length;i++) {
      this.points.morphTargetInfluences[validMorphs[i]] = 0;
    }
    var lastIndex = index - 1;
    var leftover = scaledt - index;
    if (lastIndex >= 0) {
      this.points.morphTargetInfluences[lastIndex] = 1 - leftover;
    }
    this.points.morphTargetInfluences[index] = leftover;
    this._time = t;
  });

  this.addData = addData;
  this.createPoints = createPoints;
  this.renderer = renderer;
  this.scene = scene;

  return this;

};



