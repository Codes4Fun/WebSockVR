// line geometries for seeing the axis of objects
var xAxisMat = new THREE.LineBasicMaterial({color: 0xff0000});
var yAxisMat = new THREE.LineBasicMaterial({color: 0x00ff00});
var zAxisMat = new THREE.LineBasicMaterial({color: 0x0000ff});
var xAxisGeometry = new THREE.Geometry()
var yAxisGeometry = new THREE.Geometry()
var zAxisGeometry = new THREE.Geometry()
var zeroVec = new THREE.Vector3(0,0,0);
var xAxisVec = new THREE.Vector3(100,0,0);
var yAxisVec = new THREE.Vector3(0,100,0);
var zAxisVec = new THREE.Vector3(0,0,100);
xAxisGeometry.vertices.push(zeroVec, xAxisVec);
yAxisGeometry.vertices.push(zeroVec, yAxisVec);
zAxisGeometry.vertices.push(zeroVec, zAxisVec);

function createAxis(scale)
{
	var pivot = new THREE.Object3D();

	pivot.add(new THREE.Line(xAxisGeometry, xAxisMat));
	pivot.add(new THREE.Line(yAxisGeometry, yAxisMat));
	pivot.add(new THREE.Line(zAxisGeometry, zAxisMat));

	if (scale)
	{
		pivot.scale.set(scale, scale, scale)
	}

	return pivot
}

// grab these objects when the scene is loaded
var controllerModel = []
var joystickModel = []
var buttonModels = []
var triggerModels = []

function onSceneLoaded ( objects ) {
	var DK2Camera = objects.getObjectByName('DK2Camera');
	if (DK2Camera)
	{
		objects.remove(DK2Camera);
		DK2Camera.scale.set(modelScale, modelScale, modelScale);
		DK2Camera.position.z = -1000;
		scene.add(DK2Camera);
	}

	var HydraBase = objects.getObjectByName('HydraBase');
	if (HydraBase)
	{
		objects.remove(HydraBase);
		HydraBase.scale.set(modelScale, modelScale, modelScale);
		HydraBase.position.copy(baseOffset);
		scene.add(HydraBase);
	}

	var HydraController0 = HydraBase.getObjectByName('HydraController.Pivot');
	controllerModel[0] = HydraController0;
	if (HydraController0)
	{
		HydraController0.add(createAxis(0.01));

		var HydraController1 = HydraController0.clone();
		controllerModel[1] = HydraController1;
		HydraBase.add(HydraController1);

		buttonModels[0] = []
		buttonModels[0][0] = HydraController0.getObjectByName('HydraButtonStart')
		buttonModels[0][1] = HydraController0.getObjectByName('HydraButton1')
		buttonModels[0][2] = HydraController0.getObjectByName('HydraButton2')
		buttonModels[0][3] = HydraController0.getObjectByName('HydraButton3')
		buttonModels[0][4] = HydraController0.getObjectByName('HydraButton4')
		buttonModels[0][5] = HydraController0.getObjectByName('HydraBumper')
		triggerModels[0] = HydraController0.getObjectByName('HydraTrigger')
		joystickModel[0] = HydraController0.getObjectByName('HydraJoystick')

		buttonModels[1] = []
		buttonModels[1][0] = HydraController1.getObjectByName('HydraButtonStart')
		buttonModels[1][1] = HydraController1.getObjectByName('HydraButton1')
		buttonModels[1][2] = HydraController1.getObjectByName('HydraButton2')
		buttonModels[1][3] = HydraController1.getObjectByName('HydraButton3')
		buttonModels[1][4] = HydraController1.getObjectByName('HydraButton4')
		buttonModels[1][5] = HydraController1.getObjectByName('HydraBumper')
		triggerModels[1] = HydraController1.getObjectByName('HydraTrigger')
		joystickModel[1] = HydraController1.getObjectByName('HydraJoystick')
		
		HydraController0.getObjectByName('HydraController').rotation.x += 20*Math.PI/180;
		HydraController1.getObjectByName('HydraController').rotation.x += 20*Math.PI/180;
	}
}

var objectLoader = new THREE.ObjectLoader();
objectLoader.load('scene.json', onSceneLoaded );

//
// WebSockVR
//

var SIXENSE_BUTTON_BUMPER =   (0x01<<7)
var SIXENSE_BUTTON_JOYSTICK = (0x01<<8)
var SIXENSE_BUTTON_1 =        (0x01<<5)
var SIXENSE_BUTTON_2 =        (0x01<<6)
var SIXENSE_BUTTON_3 =        (0x01<<3)
var SIXENSE_BUTTON_4 =        (0x01<<4)
var SIXENSE_BUTTON_START =    (0x01<<0)

var ws = new WebSocket('ws://' + location.host + '/ws');
ws.onopen = function(ev)  { console.log(ev); };
ws.onerror = function(ev) { console.log(ev); };
ws.onclose = function(ev) { console.log(ev); };
ws.onmessage = function(ev)
{
	lastMsg = ev.data;
	if (!controllerModel[0])
	{
		ws.send('*');
		return;
	}
	var bases = JSON.parse(ev.data);
	if (bases && bases[0] && bases[0][0] && bases[0][0].rot_mat)
	{
		if (bases[0][0] && bases[0][0].rot_mat)
		{
			var model = controllerModel[0]
			var controller = bases[0][0]
			model.quaternion.x = controller.rot_quat[0];
			model.quaternion.y = controller.rot_quat[1];
			model.quaternion.z = controller.rot_quat[2];
			model.quaternion.w = controller.rot_quat[3];
			model.position.x = controller.pos[0] * 0.01;
			model.position.y = controller.pos[1] * 0.01;
			model.position.z = controller.pos[2] * 0.01;

			joystickModel[0].rotation.x = -controller.joystick_y * 0.5;
			joystickModel[0].rotation.z = -controller.joystick_x * 0.5;
			joystickModel[0].position.y = (controller.buttons & SIXENSE_BUTTON_JOYSTICK)? -0.01 : 0;

			buttonModels[0][0].position.y = (controller.buttons & SIXENSE_BUTTON_START)? -0.01 : 0;
			buttonModels[0][1].position.y = (controller.buttons & SIXENSE_BUTTON_1)? -0.01 : 0;
			buttonModels[0][2].position.y = (controller.buttons & SIXENSE_BUTTON_2)? -0.01 : 0;
			buttonModels[0][3].position.y = (controller.buttons & SIXENSE_BUTTON_3)? -0.01 : 0;
			buttonModels[0][4].position.y = (controller.buttons & SIXENSE_BUTTON_4)? -0.01 : 0;
			buttonModels[0][5].position.y = (controller.buttons & SIXENSE_BUTTON_BUMPER)? -0.01 : 0;
			
			triggerModels[0].rotation.x = controller.trigger * -15*Math.PI/180;
		}
		if (bases[0][1] && bases[0][1].rot_mat)
		{
			var model = controllerModel[1]
			var controller = bases[0][1]
			model.quaternion.x = controller.rot_quat[0];
			model.quaternion.y = controller.rot_quat[1];
			model.quaternion.z = controller.rot_quat[2];
			model.quaternion.w = controller.rot_quat[3];
			model.position.x = controller.pos[0] * 0.01;
			model.position.y = controller.pos[1] * 0.01;
			model.position.z = controller.pos[2] * 0.01;

			joystickModel[1].rotation.x = -controller.joystick_y * 0.5;
			joystickModel[1].rotation.z = -controller.joystick_x * 0.5;
			joystickModel[1].position.y = (controller.buttons & SIXENSE_BUTTON_JOYSTICK)? -0.01 : 0;

			buttonModels[1][0].position.y = (controller.buttons & SIXENSE_BUTTON_START)? -0.01 : 0;
			buttonModels[1][1].position.y = (controller.buttons & SIXENSE_BUTTON_1)? -0.01 : 0;
			buttonModels[1][2].position.y = (controller.buttons & SIXENSE_BUTTON_2)? -0.01 : 0;
			buttonModels[1][3].position.y = (controller.buttons & SIXENSE_BUTTON_3)? -0.01 : 0;
			buttonModels[1][4].position.y = (controller.buttons & SIXENSE_BUTTON_4)? -0.01 : 0;
			buttonModels[1][5].position.y = (controller.buttons & SIXENSE_BUTTON_BUMPER)? -0.01 : 0;

			triggerModels[1].rotation.x = controller.trigger * -15*Math.PI/180;
		}
	}
	ws.send('*');
}
