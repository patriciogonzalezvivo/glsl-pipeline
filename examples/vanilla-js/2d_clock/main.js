import './style.css'
import { WebGLRenderer, PerspectiveCamera, Scene, BoxGeometry, ShaderMaterial, Mesh, Vector2, Vector3 } from 'three';
import { resolveLygia } from 'resolve-lygia';

import { GlslPipeline } from 'glsl-pipeline';

let W = window,
  D = document.querySelector('#app');

let width = W.innerWidth;
let height = W.innerHeight;
let pixelRatio = W.devicePixelRatio;

const renderer = new WebGLRenderer({
  alpha: true
});
renderer.setPixelRatio(pixelRatio);
renderer.setSize(width, height);
D.appendChild(renderer.domElement);

const shader_frag = resolveLygia(/* glsl */`
        uniform sampler2D   u_buffer0; // 256x256
        uniform sampler2D   u_buffer1; // 256x256


        uniform vec4        u_date;
        uniform vec2        u_resolution;
        uniform float       u_time;

        #include "lygia/math/const.glsl"
        #include "lygia/math/decimate.glsl"
        #include "lygia/space/ratio.glsl"
        #include "lygia/space/scale.glsl"

        #define DIGITS_SIZE vec2(0.1)
        #define DIGITS_LEADING_INT 2.0
        #include "lygia/draw/digits.glsl"

        #include "lygia/sample/clamp2edge.glsl"
        #include "lygia/filter/gaussianBlur/1D_fast13.glsl"

        #include "lygia/space/sqTile.glsl"
        #include "lygia/draw/circle.glsl"

        void main() {
            vec3 color = vec3(0.0);
            vec2 pixel = 1.0/u_resolution.xy;
            vec2 st = gl_FragCoord.xy * pixel;
            vec2 sst = ratio(st, u_resolution);
            
            #ifdef BUFFER_0
            // Draw the digital clock

            sst = scale(sst, 0.5);
            float h = floor( u_date.w / 3600.0);
            float m = floor( mod(u_date.w, 3600.0) / 60.0 );
            float time = 0.0;

            // blinking :
            color +=  (circle(sst - vec2(0.0, 0.025), 0.02) + 
                      circle(sst + vec2(0.0, 0.025), 0.02)) * 
                      mod(floor(u_time), 2.0);

            sst -= vec2(0.3, 0.45);
            // Hr and Min
            color += digits(sst, h, 0.0, 1.0);
            color += digits(sst - vec2(0.23, 0.0), m, 0.0, 1.0);
            color *= vec3(0.5, 1.0, 0.9);

            
            #elif defined(BUFFER_1)
            // First pass blur 
            color = gaussianBlur1D_fast13(u_buffer0, st, vec2(1.0, 0.0) * pixel).rgb; 
            
            #else
            // Second pass blur
            vec3 blur = gaussianBlur1D_fast13(u_buffer1, sst, 1.0/vec2(0.0, 512.0)).rgb;
            
            // sample the fist buffer but using a dot matrix
            float s = 80.0;
            vec4 t = sqTile(sst * s * 2.0 + 0.5);
            vec3 value = sampleClamp2edge(u_buffer0, decimate(sst, s) - pixel).rgb;

            // Draw pixels + glow
            color += value * fill(circleSDF(t.xy), 0.5, 0.5) * 0.8;
            color *= sin(st.y * u_resolution.y * 0.25 - u_time * 5.0) * 0.25 + 0.75;
            color += blur;


            #endif

            gl_FragColor = vec4(color, 1.);
        }`);

// GLSL Buffers
const glsl_sandbox = new GlslPipeline(renderer);
glsl_sandbox.load(shader_frag);

const draw = () => {
  glsl_sandbox.renderMain();
  requestAnimationFrame(draw);
};

const resize = () => {
  width = W.innerWidth;
  height = W.innerHeight;
  pixelRatio = W.devicePixelRatio;

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);

  glsl_sandbox.setSize(width, height);
};

W.addEventListener("resize", resize);
resize();

draw();