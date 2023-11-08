# GlslPipeline 🖌📦

[![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

GlslPipeline is a class that allows quick prototyping of pipelines directly from a single shader by branching it into different special stages using `#if`, `#elif`, `#else`, define flags. It also allows you to handle multiple buffers and post-processing passes using keywords (defines) such as `BUFFERS`, `DOUBLE_BUFFERS`, `BACKGROUND` and `POSTPROCESSING`.

GlslPipeline also handles some basic uniforms such as `u_resolution`, `u_mouse`, `u_time`, `u_delta` and `u_frame`.

All these specs are based 100% on the [glslViewer](https://github.com/patriciogonzalezvivo/glslViewer/wiki) workflow and are designed so you can start your prototypes there and then port them to WebGL using [ThreeJS](https://github.com/mrdoob/three.js) in a few seconds by just loading your shader code in GlslPipeline.

## Install, load and run your shader

Through your terminal **install** the package:

```sh
npm install glsl-pipeline --save
```

If you are not using geometry, you just create a new instance of GlslPipeline, load your shader, and start rendering it:

```js
import { WebGLRenderer, PerspectiveCamera, Vector3 } from 'three';
import { GlslPipeline } from 'glsl-pipeline';

const renderer = new WebGLRenderer();
const sandbox = new GlslPipeline(renderer, {
    // Optional uniforms object to pass to the shader
    u_color: { value: new Vector3(1.0, 0.0, 0.0) },
    u_speed: { value: 0.5 },
    ...
});

sandbox.load(fragment_shader);

const draw = () => {
    sandbox.renderMain();
    requestAnimationFrame(draw);
};

const resize = () => {
    sandbox.setSize(window.innerWidth, window.innerHeight);
};

window.addEventListener("resize", resize);
resize();

draw();
```

If you want to use geometry you will need to create a scene and a camera, provide a vertex and fragment shader and then render the scene using `renderScene` method:


```js
import { WebGLRenderer, PerspectiveCamera, Vector3 } from 'three';
import { GlslPipeline } from 'glsl-pipeline';

const renderer = new WebGLRenderer();
const glsl_sandbox = new GlslPipeline(renderer, {
    // Optional uniforms object to pass to the shader
    u_color: { value: new Vector3(1.0, 0.0, 0.0) },
    u_speed: { value: 0.5 },
    ...
});
glsl_sandbox.load(shader_frag, shader_vert);

// Create your scene and use the main material shader
const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
const mesh = new Mesh(new BoxGeometry(1, 1, 1), glsl_sandbox.material);
const scene = new Scene();
scene.add(mesh);

const draw = () => {
    glsl_sandbox.renderScene(scene, cam);
    requestAnimationFrame(draw);
};

const resize = () => {
    sandbox.setSize(window.innerWidth, window.innerHeight);
};

window.addEventListener("resize", resize);
resize();

draw();
```

## PIPELINE STAGES

Before getting into the different stages is important to understand that we are using `#if`, `#elif`, `#else` and `#endif`  directives to branch a single shader into multiple. This are pre-compilation macros that are evaluated before the shader is compiled. This means that the shader code will be different depending on the defines that are active at the moment of compiling it. This avoid realtime logic branching and allow us to create a pipeline of stages that will be executed in a specific order, with very little performance overhead.

![](https://github.com/patriciogonzalezvivo/glslViewer/raw/main/.github/images/buffers.gif)

GlslPipeline will detect the use of the following keywords to define the different stages of the pipeline: `BUFFER_<N>`, `DOUBLE_BUFFER_<N>`, `BACKGROUND`, and `POSTPROCESSING`. It will create new render passes for each one of them (except `BACKGROUND`, which just renders a billboard in your scene). Each one will use the same shader code but "injecting" these keywords at the top of it, so its behavior will "activate" different parts of the code. That's what we call forking the shader.

In the particular case of `BUFFERS` and `DOUBLE_BUFFERS` it will also create a new render target for each one of them. All `BUFFER_X` will be rendered first into textures with the name `u_bufferX` (where `X` is the index number) and then all `DOUBLE_BUFFER_X` will be rendered into the `u_doubleBufferX` textures.

In 3D scenes, when `POSTPROCESSING` is used, the geometry will be rendered into a framebuffer associated with the `u_scene` texture. This allows you to perform postprocessing in a pass that occurs at the end of the pipeline.


### BACKGROUND (3D scene stage)

![](https://user-images.githubusercontent.com/346914/198333499-abdbd9ac-dd78-4602-be8b-8636c32651c9.svg)

This stage is used to render the background of the scene. It is only available when using the `renderScene` method. It is defined by using the `BACKGROUND` keyword.

```glsl
uniform vec2    u_resolution;

varying vec4    v_position;
varying vec3    v_normal;

void main(void) {
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
    vec2 pixel = 1.0/u_resolution;
    vec2 st = gl_FragCoord.xy * pixel;

    #if defined(BACKGROUND)

    // Draw a ciruclar gradient background
    float dist = distance(st, vec2(0.5));
    color.rgb += 1.0-dist;

    #else

    // Basic diffuse shading from directional light
    vec3 N = normalize(v_normal);
    vec3 L = vec3(1.0, 1.0, 0.0);
    vec3 Ld = normalize(L - v_position.xyz);
    color.rgb += dot(N, Ld) * 0.5 + 0.5;
    
    #endif

    gl_FragColor = color;
}
```

### POSTPROCESSING (3D scene stage)

![](https://user-images.githubusercontent.com/346914/198334417-48758f24-4e63-4732-8529-bf0e3dae0050.svg)

This stage is used to render the postprocessing effects of the scene. It is only available when using the `renderScene` method. It is defined by using the `POSTPROCESSING` keyword.

It's important to notice that at this stage the 3D scene have been already rendered into a framebuffer and is available as `u_scene` texture uniform.

```glsl
#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D   u_scene;

uniform vec2        u_resolution;

varying vec4        v_position;
varying vec3        v_normal;

void main(void) {
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
    vec2 pixel = 1.0/u_resolution;
    vec2 st = gl_FragCoord.xy * pixel;

    #if defined(POSTPROCESSING)

    // Render the scene with a circular RGB shift
    float dist = distance(st, vec2(0.5)) * 2.0;
    color.r = texture2D(u_scene, st + pixel * dist).r;
    color.g = texture2D(u_scene, st).g;
    color.b = texture2D(u_scene, st - pixel * dist).b;

    #else

    // Basic diffuse shading from directional light
    vec3 N = normalize(v_normal);
    vec3 L = vec3(1.0, 1.0, 0.0);
    vec3 Ld = normalize(L - v_position.xyz);
    color.rgb += dot(N, Ld) * 0.5 + 0.5;

    #endif

    gl_FragColor = color;
}
```

### BUFFERs 

![](https://user-images.githubusercontent.com/346914/198334848-42a4f4ba-cf5e-4fb5-a017-da18c0b8dc6b.svg)

Buffers are used to render something in an offscreen render pass. They are defined by using the keyword `BUFFER_` followed by the index number. The content of that pass will be available as a texture uniform named `u_buffer` followed by the same index number.

This kind of buffers is useful, for example, for creating blurs that require two passes (one horizontal and one vertical).

```glsl

uniform vec2        u_resolution;

uniform sampler2D   u_buffer0;
uniform sampler2D   u_tex0;

#include "lygia/filter/gaussianBlur.glsl"

void main (void) {
    vec3 color = vec3(0.0);
    vec2 pixel = 1.0/u_resolution;
    vec2 st = gl_FragCoord.xy * pixel;

#ifdef BUFFER_0
    color = gaussianBlur(u_tex0, st, pixel * vec2(1.0, 0.0), 5).rgb;

#else
    color = gaussianBlur(u_buffer0, st, pixel * vec2(0.0, 1.0), 5).rgb;

#endif

    gl_FragColor = vec4(color,1.0);
}
```

### DOUBLE BUFFERs

![](https://user-images.githubusercontent.com/346914/198334801-76edcf24-519b-4b50-8bdf-4e3f01d42ccd.svg)

Double buffers are used to render something in an offscreen render pass by alternating a single pair of frame buffers. This allows using the output of one pass as the input for the following pass. They are defined by using the keyword `DOUBLE_BUFFER_` followed by the index number, and the content of that pass will be available as a texture uniform named `u_doubleBuffer` followed by the same index number.

This particular technique allows you to preserve the content of the previous frame and use it as input for the next one. This technique is useful, for example, for creating all sorts of interesting effects like motion blur, trails, simulations, etc.

```glsl
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
}
```

## Native Uniforms

* `uniform int   u_frame;`: frame number

* `uniform float u_time;`: shader playback time (in seconds)

* `uniform float u_delta;`: delta time between frames (in seconds)

* `uniform vec4  u_date;`: year, month, day and seconds

* `uniform vec2  u_resolution;`: viewport resolution (in pixels)

* `uniform vec2  u_mouse;`: mouse pixel coords

* `uniform vec3  u_camera`: Position of the camera

* `uniform float u_cameraFarClip`: far clipping

* `uniform float u_cameraNearClip`: near clipping

* `uniform float u_cameraDistance`: camera distance to (0,0,0)

* `uniform mat3  u_normalMatrix`: Normal Matrix

* `uniform mat4  u_modelMatrix`: Model Matrix

* `uniform mat4  u_viewMatrix`: View Matrix

* `uniform mat4  u_inverseViewMatrix`: Inverse View Matrix

* `uniform mat4  u_projectionMatrix`: Projection Matrix

* `uniform mat4  u_inverseProjectionMatrix`: Inverse Projection Matrix

* `uniform vec3  u_light`: Position of the light

* `uniform vec3  u_lightColor`: Color of the light

* `uniform float u_lightIntensity`: Intensity of the light

* `uniform mat4  u_lightMatrix`: Light Matrix for reprojecting shadows

* `uniform sampler2D u_scene`: color texture buffer of the scene, available on `POSTPROCESSING` subshader. [Learn more about it here](https://github.com/patriciogonzalezvivo/glslViewer/wiki/GlslViewer-DEFINES#buffers-and-render-passes)

* `uniform sampler2D u_sceneDepth`: color texture buffer of the scene, available on `POSTPROCESSING` subshader. [Learn more about it here](https://github.com/patriciogonzalezvivo/glslViewer/wiki/GlslViewer-DEFINES#buffers-and-render-passes)

* `uniform sampler2D u_ligthShadowMap`: Shadow map

* `uniform sampler2D u_buffer[number]`: extra buffers forked with the define flag `BUFFER_[number]` on a subshaders. [learn more about this here](https://github.com/patriciogonzalezvivo/glslViewer/wiki/GlslViewer-DEFINES#buffers-and-render-passes)

* `uniform sampler2D u_doubleBuffer[number]`: extra double buffers forked with the define flag `DOUBLE_BUFFER_[number]` on a subshaders. [learn more about this here](https://github.com/patriciogonzalezvivo/glslViewer/wiki/GlslViewer-DEFINES#buffers-and-render-passes)


## Examples

To build/run from source, first `git clone` this repo 

```sh
git clone git@github.com:patriciogonzalezvivo/glsl-pipeline.git
```

And then:

```sh
npm install
```

Once installed, you can test/build the demo like this:

```sh
# to run demo dev server/scripts
npm run dev

# to run demo build scripts
npm run build
```

Then locally, open the following links with your browser:

* http://localhost:5173
* http://localhost:5173/examples/2d_clock.html
* http://localhost:5173/examples/2d_trails.html
* http://localhost:5173/examples/2d_reaction_diffusion.html
* http://localhost:5173/examples/3d_trails.html
* http://localhost:5173/examples/3d_pbr_shadow.html
* http://localhost:5173/examples/3d_pbr_shadow_dof.html
* http://localhost:5173/examples/3d_pbr_shadow_enviroment.html


## License

MIT, see [LICENSE.md](http://github.com/patriciogonzalezvivo/glsl-pipeline/blob/master/LICENSE.md) for details.
