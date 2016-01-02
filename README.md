
#WebSockVR

A small webserver that allows websocket access to local VR sensors.

Currently only supports Razer Hydra.

Not limited to localhost, so a remote mobile device can also access VR sensors.

##Running

Under bin/, run WebSockVR.exe.

To test it, point your browser to localhost:6438 and it will load web page with links to different tests (WebVR test included).

Before running the WebVR demos it is recommended you run the setup page for positioning the hydra relative to your hmd.

##Developing webpages

The code for the test pages is located in the bin/root directory.

bin/root/threejs_cubes.html - is the easiest one to read for position and rotation.

bin/root/js/scene.js - shows how to read buttons/triggers/joysticks.

The positional values are in millimeters.

##Building

Currently only set to build under MSVC with the Sixsense SDK.

1. Get the source code from github.
2. Get the Sixense SDK from Steam (Library>Tools).
3. Copy the Sixense SDK to the src directory, or update the project to point to the location of it.
4. Open up the solution in Visual C++ and build!

##Legal stuff

All source and data unique to this project are under the MIT License.

The Mongoose server version is based on the MIT License.

The Razor Hydra 3d model is a modified version of William Burke's model, which is free to use so long as he is credited for it.
