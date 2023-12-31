import './style.css'
import { WebGLRenderer } from 'three';
import { resolveLygia } from 'resolve-lygia';

import { GlslPipeline } from 'glsl-pipeline';

let W = window,
  D = document.querySelector('#app') as Element;

let width = W.innerWidth;
let height = W.innerHeight;
let pixelRatio = W.devicePixelRatio;

const renderer = new WebGLRenderer();
renderer.setPixelRatio(pixelRatio);
renderer.setSize(width, height);
D.appendChild(renderer.domElement);

const shader_frag = resolveLygia(/* glsl */`
      uniform sampler2D   u_doubleBuffer0;

      uniform vec2        u_resolution;
      uniform float       u_time;

      #include "lygia/space/ratio.glsl"
      #include "lygia/color/palette/hue.glsl"
      #include "lygia/draw/circle.glsl"

      void main() {
          vec3 color = vec3(0.0);
          vec2 pixel = 1.0/u_resolution.xy;
          vec2 st = gl_FragCoord.xy * pixel;

      #ifdef DOUBLE_BUFFER_0
          color = texture2D(u_doubleBuffer0, st).rgb * 0.998;

          vec2 sst = ratio(st, u_resolution);
          sst.xy += vec2(cos(u_time * 2.0), sin(u_time * 1.7)) * 0.35;
          color.rgb += hue(fract(u_time * 0.1)) * circle(sst, 0.1) * 0.05;

      #else
          color += texture2D(u_doubleBuffer0, st).rgb;

      #endif

          gl_FragColor = vec4(color, 1.0);
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