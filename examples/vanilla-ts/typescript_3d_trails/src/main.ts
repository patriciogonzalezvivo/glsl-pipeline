import './style.css'
import { WebGLRenderer, PerspectiveCamera, Scene, BoxGeometry, SphereGeometry, ConeGeometry, Mesh, Vector3 } from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { resolveLygia } from 'resolve-lygia';

import { GlslPipeline } from 'glsl-pipeline';

let W = window,
  D = document.querySelector('#app') as Element;

let width = W.innerWidth;
let height = W.innerHeight;
let pixelRatio = W.devicePixelRatio;

const shader_vert = resolveLygia(/* glsl */`

            
            uniform float   u_time;

            varying vec4    v_position;
            varying vec4    v_tangent;
            varying vec4    v_color;
            varying vec3    v_normal;
            varying vec2    v_texcoord;

            #include "lygia/math/const.glsl"
            #include "lygia/math/rotate4dX.glsl"
            #include "lygia/math/rotate4dY.glsl"
            #include "lygia/math/rotate4dZ.glsl"
            
            void main(void) {
                v_position = vec4(position, 1.0);
                v_normal = normal;
                v_texcoord = uv;
                
                float time = u_time * 3.0;
                float dist = sin(u_time) + 2.0;

                #if defined(BOX)
                v_position.xz += 1.0;
                v_position = rotate4dZ(time * 0.4) * v_position;
                v_position.xz -= dist;
                #elif defined(CONE)
                v_position.xz -= 1.0;
                v_position = rotate4dX(time * 0.3) * v_position;
                v_position.xz += dist;
                #endif

                #ifndef SPHERE
                v_position = rotate4dY(time * 0.5) * v_position;
                #endif

                
                #ifdef USE_TANGENT
                v_tangent = tangent;
                #endif

                v_color = vec4(1.0);

                v_position = modelMatrix * v_position;
                gl_Position = projectionMatrix * viewMatrix * v_position;
            }
            `);

const shader_frag = resolveLygia(/* glsl */`

            uniform sampler2D   u_doubleBuffer0;
            
            uniform sampler2D   u_scene;

            uniform mat4        u_projectionMatrix;
            uniform mat4        u_viewMatrix;
        
            uniform vec2        u_resolution;
            uniform float       u_time;

            varying vec4        v_position;
            varying vec3        v_normal;
            varying vec2        v_texcoord;

            #include "lygia/space/ratio.glsl"
            #include "lygia/space/scale.glsl"
            #include "lygia/color/mixOklab.glsl"
            #include "lygia/sample/clamp2edge.glsl"
            #include "lygia/generative/fbm.glsl"
            
            void main() {
                vec4 color = vec4(vec3(0.0), 1.0);
                vec2 pixel = 1.0 / u_resolution;
                vec2 st = gl_FragCoord.xy * pixel;
                vec2 sst = ratio(st, u_resolution);
                vec2 uv = v_texcoord;

            #if defined(BACKGROUND)
                color.a = 0.0;

            #elif defined(DOUBLE_BUFFER_0)

                vec2 offset = vec2( fbm(vec3(sst * 8., u_time)),
                                    fbm(vec3(sst * 7., u_time * 0.8))) * 2.0;
                
                vec2 dir = (u_projectionMatrix * u_viewMatrix * vec4(offset.x, -1.0, offset.y, 1.0)).xy;

                vec2 st1 = scale(st, 0.995) + pixel * dir;

                color = sampleClamp2edge(u_doubleBuffer0, st1 + pixel * 0.5) * 0.997;

                vec4 scene = texture2D(u_scene, st);
                color.rgb = mixOklab(color.rgb, scene.rgb, step(0.999, scene.a));
                color.a = 1.0;
                color = saturate(color);

            #elif defined(POSTPROCESSING)
                color = texture2D(u_doubleBuffer0, st);

            #else

                color.rgb = v_normal * 0.5 + 0.5;
                color.rg = mix(color.rg, uv, saturate(distance(sst, vec2(0.5))*2. ) );

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

// GLSL Buffers
const glsl_sandbox = new GlslPipeline(renderer);
glsl_sandbox.load(shader_frag, shader_vert);

const sphere = new SphereGeometry(0.5, 64, 32);
const sphereMesh = new Mesh(sphere, glsl_sandbox.branchMaterial("SPHERE"));
sphereMesh.castShadow = true;
sphereMesh.receiveShadow = true;
scene.add(sphereMesh);

const cone = new ConeGeometry(0.5, 1.0, 32)
cone.translate(1, 0.0, 1);
const coneMesh = new Mesh(cone, glsl_sandbox.branchMaterial("CONE"));
coneMesh.castShadow = true;
coneMesh.receiveShadow = true;
scene.add(coneMesh);

const box = new BoxGeometry(1.0, 1.0, 1.0);
box.translate(-1, 0.0, -1);
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