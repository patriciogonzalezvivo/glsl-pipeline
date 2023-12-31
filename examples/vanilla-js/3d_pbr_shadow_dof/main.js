import './style.css'
import { WebGLRenderer, PerspectiveCamera, Scene, DirectionalLight, BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, Color, Mesh, ShaderMaterial, PlaneGeometry, Vector2, Vector3 } from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { resolveLygia } from 'resolve-lygia';

import { GlslPipeline } from 'glsl-pipeline';

let W = window,
  D = document.querySelector('#app');

let width = W.innerWidth;
let height = W.innerHeight;
let pixelRatio = W.devicePixelRatio;

const shader_vert = resolveLygia(/* glsl */`
            uniform mat4    u_lightMatrix;
            varying vec4    v_lightCoord;

            varying vec4    v_position;
            varying vec4    v_tangent;
            varying vec4    v_color;
            varying vec3    v_normal;
            varying vec2    v_texcoord;
            
            void main(void) {
                v_position = vec4(position, 1.0);
                v_normal = (modelMatrix * vec4(normal, 0.0)).xyz;
                v_texcoord = uv;
                
                #ifdef USE_TANGENT
                v_tangent = tangent;
                #endif

                v_color = vec4(1.0);

                v_position = modelMatrix * v_position;
                v_lightCoord = u_lightMatrix * v_position;
                gl_Position = projectionMatrix * viewMatrix * v_position;
            }
            `);

const shader_frag = resolveLygia(/* glsl */`
            uniform sampler2D   u_scene;
            uniform sampler2D   u_sceneDepth;

            uniform mat4        u_projectionMatrix;
            uniform mat4        u_viewMatrix;
        
            uniform vec3        u_camera;
            uniform float       u_cameraDistance;
            uniform float       u_cameraNearClip;
            uniform float       u_cameraFarClip;
            
            uniform sampler2D   u_lightShadowMap;
            uniform mat4        u_lightMatrix;
            uniform vec3        u_light;
            uniform vec3        u_lightColor;
            uniform float       u_lightIntensity;

            uniform vec2        u_resolution;
            uniform float       u_time;
            uniform int         u_frame;

            varying vec4        v_lightCoord;
            varying vec4        v_position;
            varying vec4        v_tangent;
            varying vec4        v_color;
            varying vec3        v_normal;
            varying vec2        v_texcoord;

            #define CAMERA_POSITION         u_camera
            #define SURFACE_POSITION        v_position
            #define RESOLUTION              u_resolution

            #define LIGHT_DIRECTION         u_light
            #define LIGHT_COORD             v_lightCoord
            #define LIGHT_COLOR             u_lightColor
            #define LIGHT_INTENSITY         u_lightIntensity

            #define MODEL_VERTEX_NORMAL     v_normal
            #define MODEL_VERTEX_TANGENT    v_tangent
            #define MODEL_VERTEX_TEXCOORD   v_texcoord
            #define MODEL_VERTEX_COLOR      v_color

            #include "lygia/math/saturate.glsl"
            
            #if !defined(POSTPROCESSING)
            #include "lygia/lighting/atmosphere.glsl"
            #define ENVMAP_FNC(NORM, ROUGHNESS, METALLIC) atmosphere(NORM, normalize(LIGHT_DIRECTION))
            
            #include "lygia/math/unpack.glsl"
            #define SAMPLERSHADOW_FNC(TEX, UV) unpack(SAMPLER_FNC(TEX, UV))
            #define SHADOWMAP_BIAS 0.0

            #include "lygia/lighting/pbr.glsl"
            #include "lygia/lighting/material/new.glsl"
            #endif

            #include "lygia/sample/clamp2edge.glsl"
            #include "lygia/space/linearizeDepth.glsl"

            // #define SAMPLEDOF_DEBUG
            #define SAMPLEDOF_BLUR_SIZE 12.
            #define SAMPLEDOF_DEPTH_SAMPLE_FNC(TEX, UV) linearizeDepth( sampleClamp2edge(TEX, UV).r, u_cameraNearClip, u_cameraFarClip)
            #include "lygia/sample/dof.glsl"

            float checkBoard(vec2 uv, vec2 _scale) {
                uv = floor( fract(uv * _scale) * 2.0);
                return saturate(min(1.0, uv.x + uv.y) - (uv.x * uv.y));
            }

            void main() {
                vec4 color = vec4(vec3(0.0), 1.0);
                vec2 pixel = 1.0 / u_resolution;
                vec2 st = gl_FragCoord.xy * pixel;
                vec2 uv = v_texcoord;

                #if defined(POSTPROCESSING)
                    color.rgb = sampleDoF(u_scene, u_sceneDepth, st, u_cameraDistance, 20.0);

                #else

                    Material material = materialNew();

                    #if defined(FLOOR)
                    material.albedo.rgb = vec3(0.25) + checkBoard(uv, vec2(8.0)) * 0.1;
                    material.metallic = 0.0;
                    material.roughness = 0.5;
                    #endif

                    color = pbr(material);

                #endif

                gl_FragColor = color;
            }
            `);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(width, height);
renderer.shadowMap.enabled = true;
D.appendChild(renderer.domElement);

const camera = new PerspectiveCamera(45, width / height, 0.001, 200);
camera.position.set(5, 5, -5);
camera.lookAt(new Vector3(0, 1, 0));

const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

const scene = new Scene();

const light = new DirectionalLight(0xffffff, 1.0);
light.position.set(0, 10, 8);
light.castShadow = true;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = 100;
light.shadow.camera.left = -10;
light.shadow.camera.right = 10;
light.shadow.camera.top = 10;
light.shadow.camera.bottom = -10;

scene.add(light);

// GLSL Buffers
const glsl_sandbox = new GlslPipeline(renderer);
glsl_sandbox.load(shader_frag, shader_vert);
glsl_sandbox.setLight(light);

const floorMesh = new Mesh(new PlaneGeometry(5, 5), glsl_sandbox.branchMaterial("FLOOR"));
floorMesh.rotation.x = -Math.PI * 0.5;
floorMesh.position.y = -1.0;
floorMesh.castShadow = false;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

const sphereMesh = new Mesh(new SphereGeometry(0.5, 64, 32), glsl_sandbox.branchMaterial("SPHERE"));
sphereMesh.castShadow = true;
sphereMesh.receiveShadow = true;
scene.add(sphereMesh);

const coneMesh = new Mesh(new ConeGeometry(0.5, 1.0, 32), glsl_sandbox.branchMaterial("CONE"));
coneMesh.position.x = 1.0;
coneMesh.position.z = 1.0;
coneMesh.castShadow = true;
coneMesh.receiveShadow = true;
scene.add(coneMesh);

const boxMesh = new Mesh(new BoxGeometry(1.0, 1.0, 1.0), glsl_sandbox.branchMaterial("BOX"));
boxMesh.position.x = -1.0;
boxMesh.position.z = -1.0;
boxMesh.castShadow = true;
boxMesh.receiveShadow = true;
scene.add(boxMesh);

const draw = () => {
  glsl_sandbox.renderScene(scene, camera);
  // renderer.shadowMap.needsUpdate = true;
  let x = Math.cos(glsl_sandbox.time) * 1.5;
  let y = Math.sin(glsl_sandbox.time) * 1.5;
  boxMesh.rotation.x += 0.005;
  boxMesh.rotation.y += 0.005;
  boxMesh.position.x = -x;
  boxMesh.position.z = -y;
  coneMesh.rotation.x += 0.005;
  coneMesh.rotation.y += 0.005;
  coneMesh.position.x = x;
  coneMesh.position.z = y;


  requestAnimationFrame(draw);
};

const resize = () => {
  width = W.innerWidth;
  height = W.innerHeight;
  pixelRatio = W.devicePixelRatio;

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);

  glsl_sandbox.setSize(width, height);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

W.addEventListener("resize", resize);
resize();

draw();