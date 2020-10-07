//정리필요 : water + sky + object (glossy texture) + player

'use strict';

import * as THREE from '../build/three.module.js';

import { PointerLockControls } from './jsm/controls/PointerLockControls.js';
//import { OBJLoader2 } from './jsm/loaders/OBJLoader2.js';
//import { MTLLoader } from './jsm/loaders/MTLLoader.js';
//import { MtlObjBridge } from './jsm/loaders/obj2/bridge/MtlObjBridge.js';
import { OBJLoader } from './jsm/loaders/OBJLoader.js';
import { RGBELoader } from './jsm/loaders/RGBELoader.js';

import { Water } from './jsm/objects/Water.js';
import { Sky } from './jsm/objects/Sky.js';

let renderer, scene, camera;
let controls, water, sun, mesh;

let clock;
let raycaster;
let direction = new THREE.Vector3();
let objects = [];

let params = {
	   projection: 'normal',
	   reflectivity: 1.0,
	   background: false,
	   exposure: 1.0,
	   gemColor: 'black'
			};

let params2 = {
	   projection: 'normal',
	   reflectivity: 1.0,
	   background: false,
	   exposure: 1.0,
	   gemColor: 'green'
			};

let gemBackMaterial, gemFrontMaterial;
let gemBackMaterial2, gemFrontMaterial2;
let hdrCubeRenderTarget;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
   
let prevTime = performance.now();
let playerVelocity = new THREE.Vector3();

main();
animate();

function main() {
        
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 20000 );
    camera.position.y = 50; // Height the camera will be looking from
    camera.position.x = 0;
    camera.position.z = 300;//뒤로

    sun = new THREE.Vector3();
    
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    
    document.body.appendChild( renderer.domElement );
    
    controls = new PointerLockControls( camera, document.body );
    scene.add(controls.getObject());

    {  
        const blocker = document.getElementById( 'blocker' );
        const instructions = document.getElementById( 'instructions' );

        instructions.addEventListener( 'click', function () {

				controls.lock();

        }, false );

        controls.addEventListener( 'lock', function () {

				instructions.style.display = 'none';
				blocker.style.display = 'none';

    } );

        controls.addEventListener( 'unlock', function () {

				blocker.style.display = 'block';
				instructions.style.display = '';

        } );
        
    }
        
    listenForPlayerMovement();
    function listenForPlayerMovement() {

        const onKeyDown = function(event) {

            switch (event.keyCode) {

            case 38: // up
            case 87: // w
            moveForward = true;
            break;

            case 37: // left
            case 65: // a
            moveLeft = true;
            break;

            case 40: // down
            case 83: // s
            moveBackward = true;
            break;

            case 39: // right
            case 68: // d
            moveRight = true;
            break;
            
            case 32: // space
            if ( canJump === true ) playerVelocity.y += 350;
            canJump = false;
            break;

    }

  };

  // Listen for when a key is released
  // If it's a specified key, mark the direction as false since no longer moving
  const onKeyUp = function(event) {

    switch (event.keyCode) {

      case 38: // up
      case 87: // w
        moveForward = false;
        break;

      case 37: // left
      case 65: // a
        moveLeft = false;
        break;

      case 40: // down
      case 83: // s
        moveBackward = false;
        break;

      case 39: // right
      case 68: // d
        moveRight = false;
        break;
    }
  };

  // Add event listeners for when movement keys are pressed and released
        document.addEventListener('keydown', onKeyDown, false);
        document.addEventListener('keyup', onKeyUp, false);
    }
    
    raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );
        
        // Water
    clock = new THREE.Clock();
    const waterGeometry = new THREE.CircleBufferGeometry( 200, 200 );

    water = new Water(
					waterGeometry,
					{
						textureWidth: 512,
						textureHeight: 512,
						waterNormals: new THREE.TextureLoader().load( 'textures/waternormals.png', function ( texture ) {

							texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

						} ),
						alpha: 1.0,
						sunDirection: new THREE.Vector3(),
						sunColor: 0xffffff,
						waterColor: 'pink',
						distortionScale: 20,
						fog: scene.fog !== undefined
					}
				);

    water.rotation.x = -Math.PI / 2;
    scene.add( water );

    // Skybox
    const sky = new Sky();
    sky.scale.setScalar( 10000 );
    scene.add( sky );

    //??var uniforms 아니면 에러남
    var uniforms = sky.material.uniforms;
        uniforms[ 'turbidity' ].value = 10;
        uniforms[ 'rayleigh' ].value = 4;
        uniforms[ 'mieCoefficient' ].value = 0.05;
        uniforms[ 'mieDirectionalG' ].value = 1;

    //빛 기울기, 방위각 - 해
    const parameters = { inclination: 0.4, azimuth: 0.4 };
        
    //해상도 유지 도와줌
    const pmremGenerator = new THREE.PMREMGenerator( renderer );

    function updateSun() {

        const theta = Math.PI * ( parameters.inclination - 0.5 );
        const phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );

					sun.x = Math.cos( phi );
					sun.y = Math.sin( phi ) * Math.sin( theta );
					sun.z = Math.sin( phi ) * Math.cos( theta );

					sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
					water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

					scene.environment = pmremGenerator.fromScene( sky ).texture;

				}
    updateSun();


    //lighting for object 
        
//    {
//        const skyColor = 0xB1E1FF;  // light blue
//        const groundColor = 'pink';  // brownish orange
//        const intensity = 1;
//        const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
//        scene.add(light);
//    }
//    {
//        const color = 0xFFFFFF;
//        const intensity = 1;
//        const light = new THREE.DirectionalLight(color, intensity);
//        light.position.set(5, 10, 2);
//        scene.add(light);
//        scene.add(light.target);
//    }
    {
    gemBackMaterial = new THREE.MeshPhysicalMaterial( {
					map: null,
					color: 'black',
					metalness: 1,
					roughness: 0,
					opacity: 0.5,
					side: THREE.BackSide,
					transparent: true,
					envMapIntensity: 5,
					premultipliedAlpha: true
					// TODO: Add custom blend mode that modulates background color by this materials color.
				} );

    gemFrontMaterial = new THREE.MeshPhysicalMaterial( {
					map: null,
					color: 'black',
					metalness: 0,
					roughness: 0,
					opacity: 0.25,
					side: THREE.FrontSide,
					transparent: true,
					envMapIntensity: 10,
					premultipliedAlpha: true
				} );
    }
    
    { 
    gemBackMaterial2 = new THREE.MeshPhysicalMaterial( {
					map: null,
					color: 'white',
					metalness: 1,
					roughness: 0,
					opacity: 0.5,
					side: THREE.BackSide,
					transparent: true,
					envMapIntensity: 5,
					premultipliedAlpha: true
					// TODO: Add custom blend mode that modulates background color by this materials color.
				} );

    gemFrontMaterial2 = new THREE.MeshPhysicalMaterial( {
					map: null,
					color: 'white',
					metalness: 0,
					roughness: 0,
					opacity: 0.25,
					side: THREE.FrontSide,
					transparent: true,
					envMapIntensity: 10,
					premultipliedAlpha: true
				} );
    }
    const manager = new THREE.LoadingManager();
        manager.onProgress = function ( item, loaded, total ) {

					console.log( item, loaded, total );

				};
    
    var loader = new OBJLoader( manager );
    {
        loader.load( 'textures/sculptures/sculpture_1.obj', function ( object ) {

            object.traverse( function ( child ) {

				if ( child instanceof THREE.Mesh ) {

							child.material = gemBackMaterial2;
							var second = child.clone();
							second.material = gemFrontMaterial2;

							var parent = new THREE.Group();
							parent.add( second );
							parent.add( child );
							scene.add( parent );
                            parent.position.set( -60, 70, -50 );
                            parent.rotation.y = -70;

							objects.push( parent );

						}

					} );
            
				} );
    }
    {
        loader.load( 'textures/sculptures/sculpture_2.obj', function ( object ) {

            object.traverse( function ( child ) {

				if ( child instanceof THREE.Mesh ) {

							child.material = gemBackMaterial;
							var second = child.clone();
							second.material = gemFrontMaterial;

							var parent = new THREE.Group();
							parent.add( second );
							parent.add( child );
							scene.add( parent );
                            parent.position.set( 50, 0, 130 );
                            parent.rotation.y = 350;

							objects.push( parent );

						}

					} );
            
				} );
    }
    {
         loader.load( 'textures/sculptures/sculpture_3.obj', function ( object ) {

            object.traverse( function ( child ) {

				if ( child instanceof THREE.Mesh ) {

							child.material = gemBackMaterial;
							var second = child.clone();
							second.material = gemFrontMaterial;

							var parent = new THREE.Group();
							parent.add( second );
							parent.add( child );
							scene.add( parent );
                            parent.position.set( 70, 50, 0 );
                            //parent.rotation.y = 350;

							objects.push( parent );

						}

					} );
            
				} );
    }

        new RGBELoader()
            .setDataType( THREE.UnsignedByteType )
            .setPath( 'textures/' )
            .load( 'royal_esplanade_1k.hdr', function ( hdrEquirect ) {

				hdrCubeRenderTarget = pmremGenerator.fromEquirectangular( hdrEquirect );
				pmremGenerator.dispose();

				gemFrontMaterial.envMap = gemBackMaterial.envMap = hdrCubeRenderTarget.texture;
				gemFrontMaterial.needsUpdate = gemBackMaterial.needsUpdate = true;

				hdrEquirect.dispose();

					} );
    
     new RGBELoader()
            .setDataType( THREE.UnsignedByteType )
            .setPath( 'textures/' )
            .load( 'royal_esplanade_1k.hdr', function ( hdrEquirect ) {

				hdrCubeRenderTarget = pmremGenerator.fromEquirectangular( hdrEquirect );
				pmremGenerator.dispose();

				gemFrontMaterial2.envMap = gemBackMaterial2.envMap = hdrCubeRenderTarget.texture;
				gemFrontMaterial2.needsUpdate = gemBackMaterial2.needsUpdate = true;

				hdrEquirect.dispose();

					} );

    pmremGenerator.compileEquirectangularShader();
     
    renderer.shadowMap.enabled = true;
    //renderer.outputEncoding = THREE.sRGBEncoding;
   //sculpture_1
//        
//    {
//        const mtlLoader = new MTLLoader();
//            
//        mtlLoader.load('textures/sculptures/sculpture_1.mtl', (mtlParseResult) => {
//        const objLoader = new OBJLoader2();
//        const materials =  
//                MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult);
//                for (const material of Object.values(materials)) {
//                material.side = THREE.DoubleSide;
//                objLoader.addMaterials(materials);
//            } 
//                
//        objLoader.load('textures/sculptures/sculpture_1.obj', (root) => {
//            scene.add(root);
//            root.position.set( -60, 70, -50 );
//            root.rotation.y = -70;
//                
//      });
//    });
//  }
    
//    //sculpture_2
//    
//    {
//        const mtlLoader = new MTLLoader();
//            
//        mtlLoader.load('textures/sculptures/sculpture_2.mtl', (mtlParseResult) => {
//        const objLoader = new OBJLoader2();
//        const materials =  
//                MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult);
//                for (const material of Object.values(materials)) {
//                material.side = THREE.DoubleSide;
//                objLoader.addMaterials(materials);
//            } 
//                
//        objLoader.load('textures/sculptures/sculpture_2.obj', (root) => {
//            scene.add(root);
//            root.position.set( 50, 0, 70 );
//            root.rotation.y = 350;
//                
//      });
//    });
//  }
//    
//    //sculpture_3
//    
//    {
//        const mtlLoader = new MTLLoader();
//            
//        mtlLoader.load('textures/sculptures/sculpture_3.mtl', (mtlParseResult) => {
//        const objLoader = new OBJLoader2();
//        const materials =  
//                MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult);
//                for (const material of Object.values(materials)) {
//                material.side = THREE.DoubleSide;
//                objLoader.addMaterials(materials);
//            } 
//                
//        objLoader.load('textures/sculptures/sculpture_3.obj', (root) => {
//            scene.add(root);
//            root.position.set( 70, 50, 0 );
//            
//      });
//    });
//  }
//    

    window.addEventListener( 'resize', onWindowResize, false );

} // 여기까지 main

    function onWindowResize() {

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize( window.innerWidth, window.innerHeight );

			}

    function animate() {

				requestAnimationFrame( animate );
        
                render();
        
                const delta = clock.getDelta();
        
        if ( controls.isLocked === true ) {

					raycaster.ray.origin.copy( controls.getObject().position );
					raycaster.ray.origin.y -= 10;

					const intersections = raycaster.intersectObjects( objects );

					const onObject = intersections.length > 0;

					const time = performance.now();
					const delta = ( time - prevTime ) / 1000;

					playerVelocity.x -= playerVelocity.x * 10.0 * delta;
					playerVelocity.z -= playerVelocity.z * 10.0 * delta;

					playerVelocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

					direction.z = Number( moveForward ) - Number( moveBackward );
					direction.x = Number( moveRight ) - Number( moveLeft );
					direction.normalize(); // this ensures consistent movements in all directions

					if ( moveForward || moveBackward ) playerVelocity.z -= direction.z * 400.0 * delta;
					if ( moveLeft || moveRight ) playerVelocity.x -= direction.x * 400.0 * delta;

					if ( onObject === true ) {

						playerVelocity.y = Math.max( 0, velocity.y );
						canJump = true;

					}

					controls.moveRight( - playerVelocity.x * delta );
					controls.moveForward( - playerVelocity.z * delta );

					controls.getObject().position.y += ( playerVelocity.y * delta ); // new behavior

					if ( controls.getObject().position.y < 10 ) {

						playerVelocity.y = 0;
						controls.getObject().position.y = 10;

						canJump = true;

					}

					prevTime = time;

				}

			}

    function render() {
        
        if ( gemBackMaterial !== undefined && gemFrontMaterial !== undefined ) {

            gemFrontMaterial.reflectivity = gemBackMaterial.reflectivity = params.reflectivity;

            var newColor = gemBackMaterial.color;
            switch ( params.gemColor ) {

				case 'blak': newColor = new THREE.Color( 0x888888 ); break;

		}
            gemBackMaterial.color = gemFrontMaterial.color = newColor;


				}
        
        if ( gemBackMaterial2 !== undefined && gemFrontMaterial2 !== undefined ) {

            gemFrontMaterial2.reflectivity = gemBackMaterial2.reflectivity = params.reflectivity;

            var newColor = gemBackMaterial2.color;
            switch ( params.gemColor ) {

				case 'white': newColor = new THREE.Color( 0x888888 ); break;

		}
            gemBackMaterial2.color = gemFrontMaterial2.color = newColor;


				}

        renderer.toneMappingExposure = params.exposure;

				water.material.uniforms[ 'time' ].value += 1.0 / 60.0;

				renderer.render( scene, camera );

			}


