var renderTargetWidth = window.innerWidth;
var renderTargetHeight = window.innerHeight;
var gHMD, gPositionSensor;
if (navigator.getVRDevices)
{
	navigator.getVRDevices().then(function(devices)
	{
		console.log(devices)
		for (var i = 0; i < devices.length; ++i)
		{
			if (devices[i] instanceof HMDVRDevice)
			{
				gHMD = devices[i];
				break;
			}
		}

		if (gHMD)
		{
			for (var i = 0; i < devices.length; ++i)
			{
				if (devices[i] instanceof PositionSensorVRDevice &&
					devices[i].hardwareUnitId == gHMD.hardwareUnitId)
				{
					gPositionSensor = devices[i];
					break;
				}
			}
		}
	});
}


function matrixMakeFromFieldOfView(matrix, fov, zNear, zFar)
{
	var upTan = Math.tan(fov.upDegrees * Math.PI/180.0);
	var downTan = Math.tan(fov.downDegrees * Math.PI/180.0);
	var leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0);
	var rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0);
	var xScale = 2.0 / (leftTan + rightTan);
	var yScale = 2.0 / (upTan + downTan);

	var out = matrix.elements;
	out[0] = xScale;
	out[1] = 0.0;
	out[2] = 0.0;
	out[3] = 0.0;
	out[4] = 0.0;
	out[5] = yScale;
	out[6] = 0.0;
	out[7] = 0.0;
	out[8] = -((leftTan - rightTan) * xScale * 0.5);
	out[9] = ((upTan - downTan) * yScale * 0.5);
	out[10] = -(zNear + zFar) / (zFar - zNear);
	out[11] = -1.0;
	out[12] = 0.0;
	out[13] = 0.0;
	out[14] = -(2.0 * zFar * zNear) / (zFar - zNear);
	out[15] = 0.0;
}

//
// Renderer VR
//
function createVRRenderer()
{
	var renderer = new THREE.WebGLRenderer();
	//renderer.shadowMap.type = THREE.BasicShadowMap;
	//renderer.shadowMap.type = THREE.PCFShadowMap;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.shadowMap.enabled = true;
	renderer.setClearColor( 0x000000, 1 );

	function ResizeRenderer()
	{
		if ((document.webkitFullscreenElement || document.mozFullScreenElement) && gHMD)
		{
			var leftEyeRect = gHMD.getEyeParameters('left').renderRect;
			var rightEyeRect = gHMD.getEyeParameters('right').renderRect;

			renderTargetWidth = rightEyeRect.x + rightEyeRect.width;
			renderTargetHeight = Math.max(leftEyeRect.y + leftEyeRect.height, rightEyeRect.y + rightEyeRect.height);
		}
		else
		{
			renderTargetWidth = window.innerWidth;
			renderTargetHeight = window.innerHeight;
		}
		renderer.setSize(renderTargetWidth, renderTargetHeight);
	}

	// set full screen for different browsers
	function requestFullScreen()
	{
		if (renderer.domElement.requestFullScreen)
		{
			renderer.domElement.requestFullScreen({vrDisplay:gHMD});
		}
		else if(renderer.domElement.webkitRequestFullScreen)
		{
			renderer.domElement.webkitRequestFullScreen({vrDisplay:gHMD});
		}
		else if (renderer.domElement.mozRequestFullScreen)
		{
			renderer.domElement.mozRequestFullScreen({vrDisplay:gHMD});
		}
	}

	window.addEventListener('webkitfullscreenchange', ResizeRenderer, false);
	window.addEventListener('mozfullscreenchange', ResizeRenderer, false);
	window.addEventListener('resize', ResizeRenderer, false);
	window.addEventListener('mousedown', requestFullScreen, true);
	console.log('done')

	ResizeRenderer();
	return renderer;
}

//
// Player VR
//
function createVRPlayer(context)
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

	var cameraLeft = new THREE.PerspectiveCamera();
	var cameraRight = new THREE.PerspectiveCamera();
	var cameraPivot = new THREE.Object3D();
	cameraPivot.add(cameraLeft);
	cameraPivot.add(cameraRight);
	context.activeLeftCamera = cameraLeft;
	context.activeRightCamera = cameraRight;
	playerNeck.add( cameraPivot );

	// box for casting a shadow for the HMD
	var boxGeometry = new THREE.BoxGeometry( 0.18, 0.11, 0.11 );
	var headShadow = new THREE.Mesh( boxGeometry, context.defaultMaterial );
	headShadow.castShadow = true;
	cameraPivot.add(headShadow);

	// boxes for hands
	var boxGeometry = new THREE.BoxGeometry( 0.05, 0.05, 0.05 );
	var hydraRightController = new THREE.Mesh( boxGeometry, context.defaultMaterial );
	hydraRightController.castShadow = true;
	hydraRightController.receiveShadow = true;
	var hydraLeftController = new THREE.Mesh( boxGeometry, context.defaultMaterial );
	hydraLeftController.castShadow = true;
	hydraLeftController.receiveShadow = true;
	var hydraBaseObject = new THREE.Object3D();
	hydraBaseObject.position.x = baseOffset.x / 1000;
	hydraBaseObject.position.y = baseOffset.y / 1000;
	hydraBaseObject.position.z = baseOffset.z / 1000;
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

		ballBody.velocity.set(
				gunDir.x * shootVelo + sphereBody.velocity.x,
				gunDir.y * shootVelo + sphereBody.velocity.y,
				gunDir.z * shootVelo + sphereBody.velocity.z);
		ballBody.position.copy( gunPos );
		ballMesh.position.copy( gunPos );

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

		if (gPositionSensor)
		{
			// update the head
			var state = gPositionSensor.getState();
			if (state)
			{
				if (state.orientation)
				{
					cameraPivot.quaternion.copy(state.orientation);
				}
				if (state.position)
				{
					cameraPivot.position.copy(state.position);
				}
			}
		}
		if (gHMD && (document.webkitFullscreenElement || document.mozFullScreenElement))
		{
			// left eye
			var eye = gHMD.getEyeParameters('left');
			cameraLeft.position.x = eye.eyeTranslation.x;
			matrixMakeFromFieldOfView(cameraLeft.projectionMatrix, eye.currentFieldOfView, 0.1, 2000)

			// right eye
			var eye = gHMD.getEyeParameters('right');
			cameraRight.position.x = eye.eyeTranslation.x;
			matrixMakeFromFieldOfView(cameraRight.projectionMatrix, eye.currentFieldOfView, 0.1, 2000)
		}
		else
		{
			cameraLeft.aspect = renderTargetWidth / renderTargetHeight;
			cameraLeft.fov = 75;
			cameraLeft.updateProjectionMatrix();
		}

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
			if (gPositionSensor)
			{
				playerNeck.rotation.x = 0;
			}
			else
			{
				playerNeck.rotation.x += gcontrollers[0].joystick_y * 0.02;
				playerNeck.rotation.x = Math.max( - PI_2, Math.min( PI_2, playerNeck.rotation.x ) );
			}

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
