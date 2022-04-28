# Babylon.js 5.x Floating Origin

This is a quick solution to support huge scenes in Babylon.js 5.x.

The idea is to stick the camera at world's origin (0, 0, 0) and instead
of moving the camera, move the objects around the origin.

The result is that floating-point imprecisions never happen close to
the camera, allowing for really big scenes.

Read the code to understand more about how it works.

## INSTALL

git clone https://github.com/imerso/babylonjs_template.git  
cd babylonjs_etherea  
npm install

## BUILD DEV AND WATCH FOR CHANGES

npm run start

## BUILD DIST DIRECTORY

npm run dev  
(dev build without auto-start)

or

npm run prod  
(production build which will also obfuscate the build)
