// collision filter groups
var GROUP1 = 1;
var GROUP2 = 2;
var GROUP3 = 4;

// movement settings
var velocityFactor = 20;
var jumpVelocity = 20;
var shootVelo = 15;

// controllers
var gcontrollers
ws = new WebSocket('ws://' + location.host + '/ws');
ws.onopen = function(ev)  { console.log(ev); };
ws.onerror = function(ev) { console.log(ev); };
ws.onclose = function(ev) { console.log(ev); };
ws.onmessage = function(ev)
{
	var bases = JSON.parse(ev.data)
	if (bases && bases[0])
	{
		gcontrollers = bases[0]
	}
};

function CannonUpdateable(body, mesh)
{
	this.update = function ()
	{
		mesh.position.copy(body.position);
		mesh.quaternion.copy(body.quaternion);
	}

	this.destroy = function ()
	{
		mesh.parent.remove(mesh);
		body.world.remove(body);
	}
}


//
// Renderer
//
function createDefaultRenderer()
{
	var renderer = new THREE.WebGLRenderer();
	renderer.shadowMapEnabled = true;
	renderer.shadowMapSoft = true;
	renderer.setClearColor( 0x000000, 1 );

	function onWindowResize()
	{
		renderer.setSize( window.innerWidth, window.innerHeight );
	}

	document.body.appendChild( renderer.domElement );

	window.addEventListener( 'resize', onWindowResize, false );
	onWindowResize()
	return renderer;
}


//
// World/Scene
//
function createWorldContext()
{
	var world = new CANNON.World();
	world.quatNormalizeSkip = 0;
	world.quatNormalizeFast = false;

	var solver = new CANNON.GSSolver();

	world.defaultContactMaterial.contactEquationStiffness = 1e9;
	world.defaultContactMaterial.contactEquationRelaxation = 4;

	solver.iterations = 7;
	solver.tolerance = 0.1;
	var split = true;
	if(split)
		world.solver = new CANNON.SplitSolver(solver);
	else
		world.solver = solver;

	world.gravity.set(0,-20,0);
	world.broadphase = new CANNON.NaiveBroadphase();

	// Create a slippery material (friction coefficient = 0.0)
	var physicsMaterial = new CANNON.Material("slipperyMaterial");
	var physicsContactMaterial = new CANNON.ContactMaterial(	physicsMaterial,
																physicsMaterial,
																0.0, // friction coefficient
																0.3  // restitution
																);
	// We must add the contact materials to the world
	world.addContactMaterial(physicsContactMaterial);

	var scene = new THREE.Scene();
	scene.fog = new THREE.Fog( 0x000000, 0, 500 );

	return {
		world : world,
		scene : scene,
		updateables : [],
	};
}


function generateDefaultScene(context)
{
	//
	// Ground
	//
	var groundShape = new CANNON.Plane();
	var groundBody = new CANNON.Body({ mass: 0,
		collisionFilterGroup: GROUP1,
		collisionFilterMask: GROUP1 | GROUP2 | GROUP3,
	});
	groundBody.addShape(groundShape);
	groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
	context.world.addBody(groundBody);

	// floor
	var geometry = new THREE.PlaneGeometry( 300, 300, 50, 50 );
	geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );

	var material = new THREE.MeshLambertMaterial( { color: 0xdddddd } );
	context.defaultMaterial = material;

	var mesh = new THREE.Mesh( geometry, material );
	//mesh.castShadow = true;
	mesh.receiveShadow = true;
	context.scene.add( mesh );

	//
	// Lights
	//
	var ambient = new THREE.AmbientLight( 0x111111 );
	context.scene.add( ambient );

	var light = new THREE.SpotLight( 0xffffff );
	light.position.set( 10, 30, 20 );
	light.target.position.set( 0, 0, 0 );
	if(true){
		light.castShadow = true;

		light.shadowCameraNear = 20;
		light.shadowCameraFar = 50;//camera.far;
		light.shadowCameraFov = 40;

		light.shadowMapBias = 0.1;
		light.shadowMapDarkness = 0.7;
		light.shadowMapWidth = 2*512;
		light.shadowMapHeight = 2*512;

		//light.shadowCameraVisible = true;
	}
	context.scene.add( light );

	//
	// Boxes
	//
	var halfExtents = new CANNON.Vec3(1,1,1);
	var boxShape = new CANNON.Box(halfExtents);
	var boxGeometry = new THREE.BoxGeometry(halfExtents.x*2,halfExtents.y*2,halfExtents.z*2);
	for(var i=0; i<7; i++)
	{
		var x = (Math.random()-0.5)*20;
		var y = 1 + (Math.random()-0.5)*1;
		var z = (Math.random()-0.5)*20;
		var boxBody = new CANNON.Body({ mass: 5,
			collisionFilterGroup: GROUP1,
			collisionFilterMask: GROUP1 | GROUP2 | GROUP3,
		});
		boxBody.addShape(boxShape);
		var boxMesh = new THREE.Mesh( boxGeometry, material );
		boxBody.position.set(x,y,z);
		boxMesh.position.set(x,y,z);
		boxMesh.castShadow = true;
		boxMesh.receiveShadow = true;

		context.world.addBody(boxBody);
		context.scene.add(boxMesh);
		context.updateables.push(new CannonUpdateable(boxBody, boxMesh));
	}
	// linked boxes
	var size = 0.5;
	var he = new CANNON.Vec3(size,size,size*0.1);
	var boxShape = new CANNON.Box(he);
	var mass = 0;
	var space = 0.1 * size;
	var N = 5, last;
	var boxGeometry = new THREE.BoxGeometry(he.x*2,he.y*2,he.z*2);
	for(var i=0; i<N; i++)
	{
		var boxbody = new CANNON.Body({ mass: mass,
			collisionFilterGroup: GROUP1,
			collisionFilterMask: GROUP1 | GROUP2 | GROUP3,
		});
		boxbody.addShape(boxShape);
		var boxMesh = new THREE.Mesh(boxGeometry, material);
		boxbody.position.set(5,(N-i)*(size*2+2*space) + size*2+space,0);
		boxbody.linearDamping = 0.01;
		boxbody.angularDamping = 0.01;
		boxMesh.castShadow = true;
		boxMesh.receiveShadow = true;

		context.world.addBody(boxbody);
		context.scene.add(boxMesh);
		context.updateables.push(new CannonUpdateable(boxbody, boxMesh));

		if(i!=0)
		{
			// Connect this body to the last one
			var c1 = new CANNON.PointToPointConstraint(boxbody,new CANNON.Vec3(-size,size+space,0),last,new CANNON.Vec3(-size,-size-space,0));
			var c2 = new CANNON.PointToPointConstraint(boxbody,new CANNON.Vec3(size,size+space,0),last,new CANNON.Vec3(size,-size-space,0));
			context.world.addConstraint(c1);
			context.world.addConstraint(c2);
		} else {
			mass=0.3;
		}
		last = boxbody;
	}
}


//
// Player
//
function createDefaultPlayer(context)
{
	var mass = 5, radius = 1.3;
	var sphereShape = new CANNON.Sphere(radius);
	var sphereBody = new CANNON.Body({ mass: mass,
		collisionFilterGroup: GROUP2,
		collisionFilterMask: GROUP1 | GROUP2,
	});
	sphereBody.addShape(sphereShape);
	sphereBody.position.set(0,5,0);
	sphereBody.linearDamping = 0.9;
	context.world.addBody(sphereBody);

	var canJump = false;
	var contactNormal = new CANNON.Vec3(); // Normal in the contact, pointing *out* of whatever the player touched
	var upAxis = new CANNON.Vec3(0,1,0);
	sphereBody.addEventListener("collide",function(e){
		var contact = e.contact;

		// contact.bi and contact.bj are the colliding bodies, and contact.ni is the collision normal.
		// We do not yet know which one is which! Let's check.
		if(contact.bi.id == sphereBody.id)  // bi is the player body, flip the contact normal
			contact.ni.negate(contactNormal);
		else
			contactNormal.copy(contact.ni); // bi is something else. Keep the normal as it is

		// If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
		if(contactNormal.dot(upAxis) > 0.5) // Use a "good" threshold value between 0 and 1 here!
			canJump = true;
	});

	// scene rig
	var playerBody = new THREE.Object3D();
	playerBody.position.y = 2;
	context.scene.add( playerBody );

	var playerNeck = new THREE.Object3D();
	playerBody.add( playerNeck )

	var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.01, 1000 );
	context.activeCamera = camera;
	playerNeck.add( camera );

	var boxGeometry = new THREE.BoxGeometry( 0.05, 0.05, 0.05 );
	var hydraRightController = new THREE.Mesh( boxGeometry, context.defaultMaterial );
	var hydraLeftController = new THREE.Mesh( boxGeometry, context.defaultMaterial );
	var hydraBaseObject = new THREE.Object3D();
	hydraBaseObject.position.z = -0.59;
	hydraBaseObject.position.y = -0.4;
	hydraBaseObject.add( hydraRightController );
	hydraBaseObject.add( hydraLeftController );
	playerBody.add( hydraBaseObject );

	var controllerQuat = new THREE.Quaternion();
	function getPlayerGun (gunPos, gunDir)
	{
		gunDir.set(0,0,-1);
		controllerQuat.x = gcontrollers[0].rot_quat[0];
		controllerQuat.y = gcontrollers[0].rot_quat[1];
		controllerQuat.z = gcontrollers[0].rot_quat[2];
		controllerQuat.w = gcontrollers[0].rot_quat[3];
		gunDir.applyQuaternion(controllerQuat);
		gunDir.applyEuler(playerBody.rotation);

		gunPos.set(gcontrollers[0].pos[0]/1000,gcontrollers[0].pos[1]/1000,gcontrollers[0].pos[2]/1000);
		gunPos.add(hydraBaseObject.position);
		gunPos.applyMatrix4(playerBody.matrix);
	};

	var balls = []
	var ballShape = new CANNON.Sphere(0.2);
	var ballGeometry = new THREE.SphereGeometry(ballShape.radius, 32, 32);
	var gunPos = new THREE.Vector3();
	var gunDir = new THREE.Vector3();
	function launchBall()
	{
		var ballBody = new CANNON.Body({ mass: 1,
			collisionFilterGroup: GROUP3,
			collisionFilterMask: GROUP1 | GROUP3,
		});
		ballBody.addShape(ballShape);
		var ballMesh = new THREE.Mesh( ballGeometry, context.defaultMaterial );
		ballMesh.castShadow = true;
		ballMesh.receiveShadow = true;

		getPlayerGun(gunPos, gunDir);

		ballBody.velocity.set(	gunDir.x * shootVelo,
								gunDir.y * shootVelo,
								gunDir.z * shootVelo);
		ballBody.position.copy(gunPos);
		ballMesh.position.copy(gunPos);

		var ballUpdateable = new CannonUpdateable(ballBody, ballMesh);
		balls.push(ballUpdateable);

		context.world.addBody(ballBody);
		context.scene.add(ballMesh);
		context.updateables.push(ballUpdateable);
	}

	// Moves the camera to the Cannon.js object position and adds velocity to the object if the run key is down
	var gunTimeout = 0;
	var PI_2 = Math.PI / 2;
	var inputVelocity = new THREE.Vector3();
	var euler = new THREE.Euler();
	function playerUpdate ( delta )
	{
		inputVelocity.set(0,0,0);

		if (gcontrollers && gcontrollers[0] && gcontrollers[1])
		{
			// 3d controllers
			hydraRightController.position.x = gcontrollers[0].pos[0]/1000;
			hydraRightController.position.y = gcontrollers[0].pos[1]/1000;
			hydraRightController.position.z = gcontrollers[0].pos[2]/1000;
			hydraRightController.quaternion.x = gcontrollers[0].rot_quat[0];
			hydraRightController.quaternion.y = gcontrollers[0].rot_quat[1];
			hydraRightController.quaternion.z = gcontrollers[0].rot_quat[2];
			hydraRightController.quaternion.w = gcontrollers[0].rot_quat[3];

			hydraLeftController.position.x = gcontrollers[1].pos[0]/1000;
			hydraLeftController.position.y = gcontrollers[1].pos[1]/1000;
			hydraLeftController.position.z = gcontrollers[1].pos[2]/1000;
			hydraLeftController.quaternion.x = gcontrollers[1].rot_quat[0];
			hydraLeftController.quaternion.y = gcontrollers[1].rot_quat[1];
			hydraLeftController.quaternion.z = gcontrollers[1].rot_quat[2];
			hydraLeftController.quaternion.w = gcontrollers[1].rot_quat[3];

			// update movement
			if ( gcontrollers[1].joystick_y > 0.1 ){
				inputVelocity.z = -velocityFactor * delta;
			}
			if ( gcontrollers[1].joystick_y < -0.1 ){
				inputVelocity.z = velocityFactor * delta;
			}

			if ( gcontrollers[1].joystick_x < -0.1 ){
				inputVelocity.x = -velocityFactor * delta;
			}
			if ( gcontrollers[1].joystick_x > 0.1 ){
				inputVelocity.x = velocityFactor * delta;
			}

			// update facing
			playerBody.rotation.y -= gcontrollers[0].joystick_x * 0.02;
			playerNeck.rotation.x += gcontrollers[0].joystick_y * 0.02;
			playerNeck.rotation.x = Math.max( - PI_2, Math.min( PI_2, playerNeck.rotation.x ) );

			// launch ball
			if (gcontrollers[0].trigger > 0.5)
			{
				if (gunTimeout == 0)
				{
					launchBall();
				}
				gunTimeout += dt;
				if (gunTimeout > 0.25)
				{
					gunTimeout = 0;
				}
			}
			else
			{
				gunTimeout = 0;
			}
		}

		// Convert velocity to world coordinates
		euler.x = playerNeck.rotation.x;
		euler.y = playerBody.rotation.y;
		euler.order = "XYZ";
		inputVelocity.applyEuler(euler);

		// Add to the object
		sphereBody.velocity.x += inputVelocity.x;
		sphereBody.velocity.z += inputVelocity.z;

		playerBody.position.copy(sphereBody.position);
	}
	
	context.updateables.push({update : playerUpdate, destroy: function () {}});
}
