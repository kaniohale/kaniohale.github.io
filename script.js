import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// DOM elements
const viewerContainer = document.getElementById('shirt-viewer');
const patternUpload = document.getElementById('patternUpload');
const hdriUpload = document.getElementById('hdriUpload');
const resetBtn = document.getElementById('resetBtn');
const resetLightingBtn = document.getElementById('resetLightingBtn');
const downloadBtn = document.getElementById('downloadBtn');
const bgOption = document.getElementById('bgOption');
const shininessSlider = document.getElementById('shininessSlider');
const shininessValue = document.getElementById('shininessValue');
const hdriIntensitySlider = document.getElementById('hdriIntensitySlider');
const hdriIntensityValue = document.getElementById('hdriIntensityValue');

// Camera view buttons
const viewFrontBtn = document.getElementById('viewFront');
const viewBackBtn = document.getElementById('viewBack');
const viewLeftBtn = document.getElementById('viewLeft');
const viewRightBtn = document.getElementById('viewRight');
const viewTopBtn = document.getElementById('viewTop');
const viewBottomBtn = document.getElementById('viewBottom');
const resetCameraBtn = document.getElementById('resetCameraBtn');

// Three.js variables
let scene, camera, renderer, controls;
let shirt, shirtMaterial;
let originalTexture = null;
let currentPatternTexture = null;
let originalLighting = null;
let defaultLights = [];
let currentEnvironmentMap = null;
let hdriIntensity = 1.0;
let modelCenter = new THREE.Vector3(0, 0, 0);
let modelRadius = 5; // Default distance, will be adjusted after model loading

// Function to show messages to the user
function showMessage(message, isError = false) {
    // Create message element if it doesn't exist
    let messageEl = document.getElementById('message-overlay');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'message-overlay';
        messageEl.style.position = 'absolute';
        messageEl.style.top = '10px';
        messageEl.style.left = '10px';
        messageEl.style.padding = '10px';
        messageEl.style.borderRadius = '5px';
        messageEl.style.zIndex = '1000';
        messageEl.style.fontWeight = 'bold';
        messageEl.style.transition = 'opacity 0.5s';
        viewerContainer.appendChild(messageEl);
    }
    
    // Set message and styling
    messageEl.textContent = message;
    messageEl.style.backgroundColor = isError ? 'rgba(255,50,50,0.8)' : 'rgba(50,150,255,0.8)';
    messageEl.style.color = 'white';
    messageEl.style.opacity = '1';
    
    // Hide after 5 seconds
    setTimeout(() => {
        messageEl.style.opacity = '0';
    }, 5000);
}

// Initialize the 3D scene
function init() {
    console.log('Initializing 3D scene...');
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Get viewer dimensions (maintaining square aspect ratio)
    const width = viewerContainer.clientWidth;
    const height = width; // Keep as square

    // Create camera
    camera = new THREE.PerspectiveCamera(
        45,
        width / height,
        0.1,
        1000
    );
    camera.position.set(0, 0, 5);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;
    viewerContainer.appendChild(renderer.domElement);

    // Display actual rendered dimensions
    console.log(`Rendering at: ${renderer.domElement.width}x${renderer.domElement.height}px`);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    defaultLights.push(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    defaultLights.push(directionalLight);

    // Store original lighting state
    originalLighting = {
        background: scene.background.clone(),
        lights: [...defaultLights]
    };

    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 30;
    controls.enablePan = true;
    controls.panSpeed = 1.0;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI;

    // Load the shirt model
    loadShirtModel();

    // Event listener for window resize
    window.addEventListener('resize', onWindowResize);

    // Log initialization complete
    console.log('Initialization complete. Loading model...');
}

// Load the shirt GLTF model
function loadShirtModel() {
    // Show loading message
    showMessage("Loading 3D shirt model...");
    
    const loader = new GLTFLoader();
    loader.load(
        'ShirtMaker.glb',
        (gltf) => {
            // Process the loaded model
            const model = gltf.scene;
            scene.add(model);
            
            showMessage("Model loaded successfully!");
            
            // Find the shirt mesh in the loaded model
            let foundMesh = false;
            
            model.traverse((node) => {
                if (node.isMesh) {
                    foundMesh = true;
                    console.log('Found mesh:', node.name);
                    shirt = node;
                    
                    // Store the original material and texture
                    if (Array.isArray(node.material)) {
                        console.log('Mesh has multiple materials');
                        // If multiple materials, use the first one or create a specific handling
                        shirtMaterial = node.material[0].clone();
                        showMessage("Mesh has multiple materials. Using first material.");
                    } else {
                        console.log('Mesh has a single material:', node.material.type);
                        shirtMaterial = node.material.clone();
                    }
                    
                    // Check UV mapping
                    let hasUVs = false;
                    if (node.geometry && node.geometry.attributes.uv) {
                        console.log('Mesh has UV coordinates');
                        hasUVs = true;
                    } else {
                        console.warn('Mesh has no UV coordinates! Textures may not display correctly.');
                        showMessage("Warning: Mesh has no UV coordinates. Textures may not work correctly.", true);
                    }
                    
                    // Check if the material has a texture map
                    if (shirtMaterial.map) {
                        console.log('Material has texture map');
                        originalTexture = shirtMaterial.map.clone();
                        
                        // Log UV transform properties for debugging
                        console.log('Original texture properties:');
                        console.log('- repeat:', originalTexture.repeat);
                        console.log('- offset:', originalTexture.offset);
                        console.log('- wrapS/T:', originalTexture.wrapS, originalTexture.wrapT);
                        console.log('- flipY:', originalTexture.flipY);
                    } else {
                        console.log('No texture map found, creating default texture');
                        // If no texture, create a white texture as default
                        const textureLoader = new THREE.TextureLoader();
                        originalTexture = textureLoader.load('OriginalShirt.png', (texture) => {
                            // Set default UV settings
                            texture.wrapS = THREE.RepeatWrapping;
                            texture.wrapT = THREE.RepeatWrapping;
                            texture.repeat.set(1, 1);
                            texture.flipY = false;
                            
                            // Apply to shirt for initial view
                            if (shirt) {
                                const newMaterial = shirtMaterial.clone();
                                newMaterial.map = texture;
                                newMaterial.needsUpdate = true;
                                shirt.material = newMaterial;
                            }
                            
                            if (!hasUVs) {
                                showMessage("Warning: Using default texture but no UV coordinates found.", true);
                            } else {
                                showMessage("No texture found. Applied default texture.");
                            }
                        });
                    }
                    
                    // Center the model
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    modelCenter = center.clone(); // Store center for camera views
                    model.position.x -= center.x;
                    model.position.y -= center.y;
                    model.position.z -= center.z;
                    
                    // Calculate model radius for camera positioning
                    const size = box.getSize(new THREE.Vector3());
                    modelRadius = Math.max(size.x, size.y, size.z) * 1.5;
                    
                    // Adjust camera position based on model size
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const fov = camera.fov * (Math.PI / 180);
                    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
                    cameraZ *= 1.5; // Add some extra space
                    camera.position.z = cameraZ;
                    
                    // Update the controls
                    controls.target.set(0, 0, 0);
                    controls.update();
                }
            });
            
            if (!foundMesh) {
                console.error('No mesh found in the model!');
                showMessage("Error: No mesh found in the 3D model!", true);
            }
        },
        (xhr) => {
            const percent = Math.round(xhr.loaded / xhr.total * 100);
            console.log(`${percent}% loaded`);
            showMessage(`Loading: ${percent}%`);
        },
        (error) => {
            console.error('Error loading model:', error);
            showMessage(`Error loading model: ${error.message || 'Unknown error'}`, true);
        }
    );
}

// Apply a new texture to the shirt
function applyPatternTexture(texture) {
    if (!shirt) {
        showMessage("Shirt model not loaded yet!", true);
        return;
    }

    try {
        // Clone the current material to avoid affecting other instances
        const newMaterial = shirtMaterial.clone();
        
        // Set the new texture but preserve UV mapping
        texture.flipY = false; // Prevent texture flipping which can mess up UVs
        
        // Ensure texture uses the same UV transformations as the original
        if (originalTexture) {
            texture.repeat.copy(originalTexture.repeat);
            texture.offset.copy(originalTexture.offset);
            texture.wrapS = originalTexture.wrapS;
            texture.wrapT = originalTexture.wrapT;
            texture.center.copy(originalTexture.center);
            texture.rotation = originalTexture.rotation;
        }
        
        // Apply the texture
        newMaterial.map = texture;
        
        // Make sure the material knows to use the UV coordinates
        newMaterial.needsUpdate = true;
        
        // Update shininess/roughness based on slider
        updateMaterialProperties(newMaterial);
        
        // Apply the new material to the shirt
        shirt.material = newMaterial;
        
        // Success message
        showMessage("Pattern applied successfully!");
    } catch (error) {
        console.error("Error applying pattern:", error);
        showMessage("Error applying pattern. See console for details.", true);
    }
}

// Update material properties based on slider value
function updateMaterialProperties(material) {
    const shininess = parseFloat(shininessSlider.value) / 100;
    
    // For standard material
    if (material.shininess !== undefined) {
        material.shininess = shininess * 100;
    }
    
    // For PBR materials (like MeshStandardMaterial)
    if (material.roughness !== undefined) {
        material.roughness = 1 - shininess;
    }
    
    material.needsUpdate = true;
}

// Reset the shirt to its original texture
function resetShirt() {
    if (!shirt) {
        console.warn('Cannot reset: shirt object not found');
        return;
    }
    
    if (!originalTexture) {
        console.warn('Cannot reset: original texture not found');
        return;
    }
    
    console.log('Resetting shirt to original texture');
    
    try {
        // Create a new material based on the original
        const newMaterial = shirtMaterial.clone();
        
        // Ensure we use the original texture with its original parameters
        const resetTexture = originalTexture.clone();
        newMaterial.map = resetTexture;
        
        // Make sure all material properties are updated
        newMaterial.needsUpdate = true;
        updateMaterialProperties(newMaterial);
        
        // Apply to the shirt
        shirt.material = newMaterial;
        console.log('Shirt reset successful');
    } catch (error) {
        console.error('Error resetting shirt:', error);
    }
    
    // Clear the file input
    patternUpload.value = '';
    currentPatternTexture = null;
}

// Debug function to log material and texture properties
function logMaterialDetails(material, name = 'Material') {
    console.group(`${name} Details`);
    console.log('Type:', material.type);
    console.log('Has map:', !!material.map);
    
    if (material.map) {
        console.group('Texture Details');
        console.log('UUID:', material.map.uuid);
        console.log('Repeat:', material.map.repeat);
        console.log('Offset:', material.map.offset);
        console.log('Wrap:', material.map.wrapS, material.map.wrapT);
        console.log('FlipY:', material.map.flipY);
        console.groupEnd();
    }
    
    console.log('Shininess:', material.shininess);
    console.log('Roughness:', material.roughness);
    console.groupEnd();
}

// Handle window resize
function onWindowResize() {
    const width = viewerContainer.clientWidth;
    const height = viewerContainer.clientWidth; // Maintain square aspect ratio
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    
    console.log(`Viewer resized to: ${width}x${height}px`);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Load and apply HDRI to the scene
function loadHDRI(file) {
    if (!file) {
        showMessage("No HDRI file selected!", true);
        return;
    }

    showMessage("Loading HDRI environment...");
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const rgbeLoader = new RGBELoader();
        
        rgbeLoader.load(
            event.target.result,
            (texture) => {
                const pmremGenerator = new THREE.PMREMGenerator(renderer);
                pmremGenerator.compileEquirectangularShader();
                
                const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                
                // Store this environment map
                currentEnvironmentMap = envMap;
                
                // Apply to the scene
                scene.background = envMap;
                scene.environment = envMap;
                
                // Remove default lights when using HDRI lighting
                defaultLights.forEach(light => {
                    scene.remove(light);
                });
                
                // Make sure materials use environment maps
                if (shirt && shirt.material) {
                    shirt.material.envMap = envMap;
                    // Apply current intensity from slider
                    hdriIntensity = parseFloat(hdriIntensitySlider.value) / 100;
                    shirt.material.envMapIntensity = hdriIntensity;
                    shirt.material.needsUpdate = true;
                }
                
                texture.dispose();
                pmremGenerator.dispose();
                
                showMessage("HDRI environment applied successfully!");
            },
            undefined,
            (error) => {
                console.error('Error loading HDRI:', error);
                showMessage("Error loading HDRI. See console for details.", true);
            }
        );
    };
    
    reader.readAsDataURL(file);
}

// Update HDRI intensity
function updateHDRIIntensity() {
    hdriIntensity = parseFloat(hdriIntensitySlider.value) / 100;
    hdriIntensityValue.textContent = `${hdriIntensitySlider.value}%`;
    
    // Apply intensity if we have a shirt material
    if (shirt && shirt.material && currentEnvironmentMap) {
        shirt.material.envMapIntensity = hdriIntensity;
        shirt.material.needsUpdate = true;
    }
}

// Reset the scene lighting to default
function resetLighting() {
    if (!originalLighting) {
        console.warn('Cannot reset: original lighting not stored');
        return;
    }
    
    console.log('Resetting lighting to default');
    
    try {
        // Reset background
        scene.background = originalLighting.background.clone();
        
        // Remove environment map
        scene.environment = null;
        
        // Remove any current lights
        scene.traverse(object => {
            if (object.isLight && !defaultLights.includes(object)) {
                scene.remove(object);
            }
        });
        
        // Add back the default lights
        defaultLights.forEach(light => {
            if (!scene.children.includes(light)) {
                scene.add(light);
            }
        });
        
        // Update material to not use environment map
        if (shirt && shirt.material) {
            shirt.material.envMap = null;
            shirt.material.needsUpdate = true;
        }
        
        currentEnvironmentMap = null;
        
        showMessage("Lighting reset to default");
    } catch (error) {
        console.error('Error resetting lighting:', error);
        showMessage("Error resetting lighting. See console for details.", true);
    }
}

// Take a screenshot with the selected background option
function takeScreenshot() {
    // Store current state
    const originalBackground = scene.background;
    const originalEnvMap = scene.environment;
    
    // Get background option
    const bgType = bgOption.value;
    
    // Set background based on selection
    switch(bgType) {
        case 'white':
            scene.background = new THREE.Color(0xffffff);
            break;
        case 'black':
            scene.background = new THREE.Color(0x000000);
            break;
        case 'transparent':
            scene.background = null;
            break;
    }
    
    // Temporarily remove environment lighting for clean render
    scene.environment = null;
    
    // For transparent background, we need to use a different approach
    if (bgType === 'transparent') {
        // Need to set renderer to support alpha
        renderer.setClearColor(0x000000, 0);
        renderer.setClearAlpha(0);
    }
    
    // Render the scene
    renderer.render(scene, camera);
    
    // Create a downloadable image
    let imageType = 'image/png';
    let imageQuality = 1.0;
    
    const width = renderer.domElement.width;
    const height = renderer.domElement.height;
    
    showMessage(`Creating ${width}x${height} image...`);
    console.log(`Taking screenshot at resolution: ${width}x${height}`);
    
    const dataURL = renderer.domElement.toDataURL(imageType, imageQuality);
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `3d-shirt-${bgType}-bg-${width}x${height}.png`;
    link.click();
    
    // Restore original state
    scene.background = originalBackground;
    scene.environment = originalEnvMap;
    
    // Restore renderer settings
    if (bgType === 'transparent') {
        renderer.setClearColor(0x000000, 1);
        renderer.setClearAlpha(1);
    }
    
    // Re-render with original settings
    renderer.render(scene, camera);
    
    showMessage(`Screenshot saved with ${bgType} background (${width}x${height}px)`);
}

// Event listeners
patternUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        console.log(`Loading pattern: ${file.name} (${Math.round(file.size / 1024)} KB)`);
        
        const reader = new FileReader();
        
        reader.onload = (event) => {
            console.log('File loaded, creating texture...');
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(event.target.result, (texture) => {
                // Store current texture
                currentPatternTexture = texture;
                
                console.log('Texture created, applying to shirt...');
                // Log the texture details before applying
                console.group('New Texture Details');
                console.log('Repeat:', texture.repeat);
                console.log('Offset:', texture.offset);
                console.log('FlipY:', texture.flipY);
                console.groupEnd();
                
                // When texture is loaded, apply it to the shirt
                applyPatternTexture(texture);
                
                // Log material after applying
                if (shirt) {
                    logMaterialDetails(shirt.material, 'Updated Shirt Material');
                }
            });
        };
        
        reader.readAsDataURL(file);
    }
});

// Add HDRI upload event listener
hdriUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        console.log(`Loading HDRI: ${file.name} (${Math.round(file.size / 1024)} KB)`);
        loadHDRI(file);
    }
});

resetBtn.addEventListener('click', () => {
    console.log('Reset button clicked');
    resetShirt();
    
    // Log material after reset
    if (shirt) {
        logMaterialDetails(shirt.material, 'Reset Shirt Material');
    }
});

resetLightingBtn.addEventListener('click', () => {
    console.log('Reset lighting button clicked');
    resetLighting();
});

downloadBtn.addEventListener('click', () => {
    console.log('Taking screenshot with background:', bgOption.value);
    takeScreenshot();
});

shininessSlider.addEventListener('input', () => {
    shininessValue.textContent = `${shininessSlider.value}%`;
    if (shirt && shirt.material) {
        updateMaterialProperties(shirt.material);
    }
});

// Add HDRI intensity slider event listener
hdriIntensitySlider.addEventListener('input', () => {
    updateHDRIIntensity();
});

// Camera view control functions
function setCameraView(position, lookAt = modelCenter) {
    // Disable controls temporarily to prevent interference
    controls.enabled = false;
    
    // Store target position as a Vector3
    const targetPosition = new THREE.Vector3(...position);
    
    // Animate the camera movement
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 500; // milliseconds
    const startTime = Date.now();
    
    function animateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease function (cubic ease-out)
        const ease = 1 - Math.pow(1 - progress, 3);
        
        // Interpolate position and target
        camera.position.lerpVectors(startPosition, targetPosition, ease);
        controls.target.lerpVectors(startTarget, lookAt, ease);
        
        // Update camera and controls
        camera.lookAt(controls.target);
        controls.update();
        
        // Continue animation if not complete
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        } else {
            // Re-enable controls when animation completes
            controls.enabled = true;
        }
    }
    
    // Start animation
    animateCamera();
}

function setFrontView() {
    setCameraView([0, 0, modelRadius]);
    showMessage("Front view");
}

function setBackView() {
    setCameraView([0, 0, -modelRadius]);
    showMessage("Back view");
}

function setLeftView() {
    setCameraView([-modelRadius, 0, 0]);
    showMessage("Left view");
}

function setRightView() {
    setCameraView([modelRadius, 0, 0]);
    showMessage("Right view");
}

function setTopView() {
    setCameraView([0, modelRadius, 0]);
    showMessage("Top view");
}

function setBottomView() {
    setCameraView([0, -modelRadius, 0]);
    showMessage("Bottom view");
}

// Reset camera to default position
function resetCamera() {
    const initialPosition = new THREE.Vector3(0, 0, modelRadius * 0.8); // Default position
    setCameraView([initialPosition.x, initialPosition.y, initialPosition.z]);
    showMessage("Camera reset to default view");
}

// Add event listeners for camera view buttons
viewFrontBtn.addEventListener('click', setFrontView);
viewBackBtn.addEventListener('click', setBackView);
viewLeftBtn.addEventListener('click', setLeftView);
viewRightBtn.addEventListener('click', setRightView);
viewTopBtn.addEventListener('click', setTopView);
viewBottomBtn.addEventListener('click', setBottomView);
resetCameraBtn.addEventListener('click', resetCamera);

// Initialize and start the animation loop
init();
animate();