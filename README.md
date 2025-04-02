# 3D Shirt Pattern Maker

A 3D web application that allows users to customize a shirt model by applying custom patterns and textures.

## Features

- Interactive 3D shirt model viewer
- Upload custom pattern images to apply to the shirt
- Adjust material shininess for different fabric effects
- Orbit controls to view the shirt from any angle
- Take screenshots of your designs

## How to Access

This application is hosted on GitHub Pages and can be accessed at: https://kaniohale.github.io

Since it's a static website, you can also run it locally by simply opening the `index.html` file in your browser.

## How to Use

1. Once the application is loaded in your browser
2. The 3D shirt model will load automatically
3. Use your mouse to rotate, zoom, and pan around the shirt:
   - Left-click and drag to rotate
   - Scroll to zoom in/out
   - Right-click and drag to pan
4. Click "Choose File" to upload a pattern image
5. The pattern will be applied as a texture to the 3D shirt model
6. Adjust the "Material Shininess" slider to change how shiny or matte the fabric appears
7. Click "Reset" to remove the pattern and start over
8. Click "Take Screenshot" to save your current view as a PNG image

## Technical Details

- Built with Three.js for 3D rendering
- Uses GLTFLoader to load the 3D shirt model
- Implements OrbitControls for interactive viewing
- Applies textures dynamically to the shirt material
- Supports shininess adjustment for material properties

## Files

- `index.html` - Main HTML file
- `styles.css` - CSS styling for the application
- `script.js` - JavaScript implementing the Three.js application
- `ShirtMaker.glb` - 3D model of the shirt

## Requirements

- A modern web browser with WebGL support 