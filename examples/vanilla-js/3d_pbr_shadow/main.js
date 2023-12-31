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

            
            uniform float   u_time;

            uniform mat4    u_lightMatrix;
            varying vec4    v_lightCoord;

            varying vec4    v_position;
            varying vec4    v_tangent;
            varying vec4    v_color;
            varying vec3    v_normal;
            varying vec2    v_texcoord;
            
            void main(void) {
                v_position = vec4(position, 1.0);
                v_normal = normal;
                v_texcoord = uv;
                
                #ifdef USE_TANGENT
                v_tangent = tangent;
                #endif

                #ifdef USE_COLOR
                v_color = color;
                #else
                v_color = vec4(1.0);
                #endif

                v_position = modelMatrix * v_position;
                v_lightCoord = u_lightMatrix * v_position;
                gl_Position = projectionMatrix * viewMatrix * v_position;
            }
            `);

const shader_frag = resolveLygia(/* glsl */`
            uniform sampler2D   u_scene;
        
            uniform vec3        u_camera;
            
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

            #define LIGHT_DIRECTION         u_light
            #define LIGHT_COORD             v_lightCoord
            #define LIGHT_COLOR             u_lightColor
            #define LIGHT_INTENSITY         u_lightIntensity

            #define MODEL_VERTEX_NORMAL     v_normal
            #define MODEL_VERTEX_TANGENT    v_tangent
            #define MODEL_VERTEX_TEXCOORD   v_texcoord
            #define MODEL_VERTEX_COLOR      v_color

            #include "lygia/math/unpack.glsl"
            #define SAMPLERSHADOW_FNC(TEX, UV) unpack(SAMPLER_FNC(TEX, UV))
            #define SHADOWMAP_BIAS 0.0

            #include "lygia/lighting/pbr.glsl"
            #include "lygia/lighting/material/new.glsl"

            #include "lygia/math/aafract.glsl"
            #include "lygia/math/aafloor.glsl"
            
            float checkBoard(vec2 uv, vec2 _scale) {
                uv = aafloor( aafract(uv * _scale) * 2.0);
                return saturate(min(1.0, uv.x + uv.y) - (uv.x * uv.y));
            }

            void main() {
                vec4 color = vec4(vec3(0.0), 1.0);
                vec2 pixel = 1.0 / u_resolution;
                vec2 st = gl_FragCoord.xy * pixel;
                vec2 uv = v_texcoord;

                Material material = materialNew();

                #if defined(FLOOR)
                material.albedo.rgb = vec3(0.25) + checkBoard(uv, vec2(8.0)) * 0.1;
                material.roughness = 0.5;
                #endif

                color = pbr(material);

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
light.lookAt(0, 0, 0);
light.castShadow = true;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = 20;
light.shadow.camera.left = -3;
light.shadow.camera.right = 3;
light.shadow.camera.top = 3;
light.shadow.camera.bottom = -3;

scene.add(light);

// GLSL Buffers
const glsl_sandbox = new GlslPipeline(renderer);
glsl_sandbox.load(shader_frag, shader_vert);
glsl_sandbox.setLight(light);

const floor = new PlaneGeometry(5, 5);
floor.rotateX(-Math.PI * 0.5);
const floorMesh = new Mesh(floor, glsl_sandbox.branchMaterial("FLOOR"));
floorMesh.castShadow = false;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

const sphere = new SphereGeometry(0.5, 64, 32);
sphere.translate(0.0, 0.5, 0.0);
const sphereMesh = new Mesh(sphere, glsl_sandbox.branchMaterial("SPHERE"));
sphereMesh.castShadow = true;
sphereMesh.receiveShadow = true;
scene.add(sphereMesh);

const cone = new ConeGeometry(0.5, 1.0, 32)
cone.translate(1, 0.5, 1);
const coneMesh = new Mesh(cone, glsl_sandbox.branchMaterial("CONE"));
coneMesh.castShadow = true;
coneMesh.receiveShadow = true;
scene.add(coneMesh);

const box = new BoxGeometry(1.0, 1.0, 1.0);
box.translate(-1, 0.5, -1);
const boxMesh = new Mesh(box, glsl_sandbox.branchMaterial("BOX"));
boxMesh.castShadow = true;
boxMesh.receiveShadow = true;
scene.add(boxMesh);

const draw = () => {
  glsl_sandbox.renderScene(scene, camera);
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