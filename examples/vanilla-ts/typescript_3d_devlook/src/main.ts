import './style.css'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

import { GlslPipeline } from 'glsl-pipeline';
import { CubeMapUniform } from 'glsl-pipeline/types';
import { resolveLygia } from 'resolve-lygia';

let W = window,
  D = document;

let width = W.innerWidth;
let height = W.innerHeight;
let pixelRatio = W.devicePixelRatio;


/* -----------------------------------------
            Temporary Lygia Fixes Shader
----------------------------------------- */

const temporaryLygiaLightFixes = /* glsl */`/*
contributors: Shadi El Hajj
description: Calculate indirect light
use: void lightIBLEvaluate(<Material> mat, inout <ShadingData> shadingData)
license: MIT License (MIT) Copyright (c) 2024 Shadi El Hajj
*/

#include "lygia/lighting/envMap.glsl"
#include "lygia/lighting/fresnelReflection.glsl"
#include "lygia/lighting/sphericalHarmonics.glsl"
#include "lygia/lighting/specular/importanceSampling.glsl"
#include "lygia/lighting/reflection.glsl"
#include "lygia/lighting/common/specularAO.glsl"
#include "lygia/lighting/common/envBRDFApprox.glsl"
#include "lygia/color/tonemap.glsl"

#ifndef IBL_LUMINANCE
#define IBL_LUMINANCE   1.0
#endif

#ifndef FNC_LIGHT_IBL_EVALUATE
#define FNC_LIGHT_IBL_EVALUATE

void lightIBLEvaluate(Material mat, inout ShadingData shadingData) {

#if !defined(IBL_IMPORTANCE_SAMPLING) ||  __VERSION__ < 130 || defined(SCENE_SH_ARRAY)
    vec2 E = envBRDFApprox(shadingData.NoV, shadingData.roughness);    
    vec3 specularColorE = shadingData.specularColor * E.x + E.y;
#endif

    vec3 energyCompensation = vec3(1.0, 1.0, 1.0);

#if defined(IBL_IMPORTANCE_SAMPLING) &&  __VERSION__ >= 130
    vec3 Fr = specularImportanceSampling(shadingData.linearRoughness, shadingData.specularColor,
        mat.position, shadingData.N, shadingData.V, shadingData.R, shadingData.NoV, energyCompensation);
#else
    vec3 R = mix(shadingData.R, shadingData.N, shadingData.roughness*shadingData.roughness);
    vec3 Fr = envMap(R, shadingData.roughness, mat.metallic);
    Fr *= specularColorE;
#endif
    Fr *= energyCompensation;

#if !defined(PLATFORM_RPI) && defined(SHADING_MODEL_IRIDESCENCE)
    Fr  += fresnelReflection(mat, shadingData);
#endif

vec3 Fd = shadingData.diffuseColor;
#if defined(SCENE_SH_ARRAY)
    #ifdef GLSLVIEWER
    Fd *= tonemap(sphericalHarmonics(shadingData.N));
    #else
    Fd *= (sphericalHarmonics(shadingData.N));
    #endif
#else
    Fd *= envMap(shadingData.N, 1.0);
#endif

#if !defined(IBL_IMPORTANCE_SAMPLING)
    Fd *= (1.0-specularColorE);
#endif

    // AO
    float diffuseAO = mat.ambientOcclusion;
    Fd  *= diffuseAO;
    Fr  *= specularAO(mat, shadingData, diffuseAO);

    shadingData.energyCompensation = energyCompensation;

    shadingData.indirectDiffuse = Fd * IBL_LUMINANCE;
    shadingData.indirectSpecular = Fr * IBL_LUMINANCE;
}

#endif`;

const temporaryLygiaLightingFixes = /* glsl */`
${temporaryLygiaLightFixes}

#include "lygia/math/hammersley.glsl"
#include "lygia/math/rotate3dZ.glsl"
#include "lygia/space/tbn.glsl"
#include "lygia/generative/random.glsl"
#include "lygia/lighting/common/ggx.glsl"
#include "lygia/lighting/common/smithGGXCorrelated.glsl"
#include "lygia/lighting/fresnel.glsl"
#include "lygia/lighting/common/preFilteredImportanceSampling.glsl"

/*
contributors:  Shadi El Hajj
description: Sample the environment map using importance sampling
use: vec3 specularImportanceSampling(float roughness, vec3 f0, const vec3 n, const vec3 v, const vec3 r, const float NoV, const vec2 st)
license: MIT License (MIT) Copyright (c) 2024 Shadi EL Hajj
*/

#ifndef IBL_IMPORTANCE_SAMPLING_SAMPLES
#define IBL_IMPORTANCE_SAMPLING_SAMPLES  16
#endif

#if !defined(FNC_SPECULAR_IMPORTANCE_SAMPLING) && defined(SCENE_CUBEMAP) &&  __VERSION__ >= 130 
#define FNC_SPECULAR_IMPORTANCE_SAMPLING

vec3 specularImportanceSampling(float roughness, vec3 f0, vec3 p, vec3 n, vec3 v, vec3 r, float NoV, out vec3 energyCompensation) {
    const int numSamples = IBL_IMPORTANCE_SAMPLING_SAMPLES;
    const float invNumSamples = 1.0 / float(IBL_IMPORTANCE_SAMPLING_SAMPLES);
    const vec3 up = vec3(0.0, 0.0, 1.0);
    mat3 T = tbn(n, up);
    // T *= rotate3dZ(TWO_PI * random(p));

    float width = float(textureSize(SCENE_CUBEMAP, 0).x);
    float omegaP = (4.0 * PI) / (6.0 * width * width);

    vec3 indirectSpecular = vec3(0.0, 0.0, 0.0);
    float dfg2 = 0.0;
    for (int i = 0; i < numSamples; i++) {
        vec2 u = hammersley(uint(i), numSamples);
        vec3 h = T * importanceSamplingGGX(u, roughness);
        vec3 l = reflect(-v, h);

        float NoL = saturate(dot(n, l));
        if (NoL > 0.0) {
            float NoH = dot(n, h);
            float LoH = max(dot(l, h), EPSILON);

            float D = GGX(n, h, NoH, roughness);
            float V = smithGGXCorrelated(NoV, NoL, roughness);
            vec3 F = fresnel(f0, LoH);

            float ipdf = (4.0 * LoH) / (D * NoH);
            float mipLevel = prefilteredImportanceSampling(ipdf, omegaP, numSamples);
            vec3 L = textureLod(SCENE_CUBEMAP, l, mipLevel).rgb;

            vec3 Fr = F * (D * V * NoL * ipdf * invNumSamples);

            indirectSpecular += (Fr * L);

            dfg2 += V*LoH*NoL/NoH;
        }
    }

    dfg2 = 4.0 * dfg2 * invNumSamples;

    energyCompensation = (dfg2 > 0.0) ? (1.0 + f0 * (1.0 / dfg2 - 1.0)) : vec3(1.0, 1.0, 1.0);

    return indirectSpecular;
}

#endif`;

const temporaryLygiaFixes = /* glsl */`
#include "lygia/math/const.glsl"

/*
contributor: nan
description: |
    Computes the luminance of the specified linear RGB color using the luminance coefficients from Rec. 709.
    Note, ThreeJS seems to inject this in all their shaders. Which could lead to issues
use: luminance(<vec3|vec4> color)
license:
    - Copyright (c) 2021 Patricio Gonzalez Vivo under Prosperity License - https://prosperitylicense.com/versions/3.0.0
    - Copyright (c) 2021 Patricio Gonzalez Vivo under Patron License - https://lygia.xyz/license
*/

#ifndef FNC_LUMINANCE
#define FNC_LUMINANCE
float luminance(in vec3 linear) { return dot(linear, vec3(0.21250175, 0.71537574, 0.07212251)); }
float luminance(in vec4 linear) { return luminance( linear.rgb ); }
#endif

#if !defined(ENVMAP_MAX_MIP_LEVEL) && __VERSION__ < 430
#define ENVMAP_MAX_MIP_LEVEL 3.0
#endif

/*
contributors: nan
description: |
    Converts the input HDR RGB color into one of 16 debug colors that represent
    the pixel's exposure. When the output is cyan, the input color represents
    middle gray (18% exposure). Every exposure stop above or below middle gray
    causes a color shift.

    The relationship between exposures and colors is:

    -5EV  - black
    -4EV  - darkest blue
    -3EV  - darker blue
    -2EV  - dark blue
    -1EV  - blue
     OEV  - cyan
    +1EV  - dark green
    +2EV  - green
    +3EV  - yellow
    +4EV  - yellow-orange
    +5EV  - orange
    +6EV  - bright red
    +7EV  - red
    +8EV  - magenta
    +9EV  - purple
    +10EV - white

use: <vec3|vec4> tonemapDebug(<vec3|vec4> x)
*/

#define FNC_TONEMAPDEBUG
#if !defined(PLATFORM_RPI) && !defined(PLATFORM_WEBGL)
vec3 tonemapDebug(const vec3 x) {

    // 16 debug colors + 1 duplicated at the end for easy indexing
    vec3 debugColors[17];
    debugColors[0] = vec3(0.0, 0.0, 0.0);         // black
    debugColors[1] = vec3(0.0, 0.0, 0.1647);      // darkest blue
    debugColors[2] = vec3(0.0, 0.0, 0.3647);      // darker blue
    debugColors[3] = vec3(0.0, 0.0, 0.6647);      // dark blue
    debugColors[4] = vec3(0.0, 0.0, 0.9647);      // blue
    debugColors[5] = vec3(0.0, 0.9255, 0.9255);   // cyan
    debugColors[6] = vec3(0.0, 0.5647, 0.0);      // dark green
    debugColors[7] = vec3(0.0, 0.7843, 0.0);      // green
    debugColors[8] = vec3(1.0, 1.0, 0.0);         // yellow
    debugColors[9] = vec3(0.90588, 0.75294, 0.0); // yellow-orange
    debugColors[10] = vec3(1.0, 0.5647, 0.0);      // orange
    debugColors[11] = vec3(1.0, 0.0, 0.0);         // bright red
    debugColors[12] = vec3(0.8392, 0.0, 0.0);      // red
    debugColors[13] = vec3(1.0, 0.0, 1.0);         // magenta
    debugColors[14] = vec3(0.6, 0.3333, 0.7882);   // purple
    debugColors[15] = vec3(1.0, 1.0, 1.0);         // white
    debugColors[16] = vec3(1.0, 1.0, 1.0);         // white

    // The 5th color in the array (cyan) represents middle gray (18%)
    // Every stop above or below middle gray causes a color shift
    float l = dot(x, vec3(0.21250175, 0.71537574, 0.07212251));
    float v = log2(l / 0.18);
    v = clamp(v + 5.0, 0.0, 15.0);
    int index = int(v);
    return mix(debugColors[index], debugColors[index + 1], v - float(index));
}
vec4 tonemapDebug(const vec4 x) { return vec4(tonemapDebug(x.rgb), x.a); }
#endif

/*
contributors: [Erik Reinhard, Michael Stark, Peter Shirley, James Ferwerda]
description: Photographic Tone Reproduction for Digital Images. http://www.cmap.polytechnique.fr/~peyre/cours/x2005signal/hdr_photographic.pdf
use: <vec3|vec4> tonemapReinhard(<vec3|vec4> x)
*/

#define FNC_TONEMAPREINHARD
vec3 tonemapReinhard(const vec3 v) { return v / (1.0 + dot(v, vec3(0.21250175, 0.71537574, 0.07212251))); }
vec4 tonemapReinhard(const vec4 v) { return vec4( tonemapReinhard(v.rgb), v.a ); }

/*
contributors: [Erik Reinhard, Michael Stark, Peter Shirley, James Ferwerda]
description: Photographic Tone Reproduction for Digital Images. http://www.cmap.polytechnique.fr/~peyre/cours/x2005signal/hdr_photographic.pdf
use: <vec3|vec4> tonemapReinhardJodie(<vec3|vec4> x)
*/

#define FNC_TONEMAPREINHARDJODIE
vec3 tonemapReinhardJodie(const vec3 x) {
    float l = dot(x, vec3(0.21250175, 0.71537574, 0.07212251));
    vec3 tc = x / (x + 1.0);
    return mix(x / (l + 1.0), tc, tc);
}
vec4 tonemapReinhardJodie(const vec4 x) { return vec4( tonemapReinhardJodie(x.rgb), x.a ); }

/*
contributors: Holger Dammertz
description: Return a Hammersley point
use: hammersley(uint index)
license: CC BY 3.0 Copyright (c) 2012 Holger Dammertz
*/

#if !defined(FNC_HAMMERSLEY) &&  __VERSION__ >= 130
#define FNC_HAMMERSLEY

vec2 hammersley(uint index, int numSamples) {
    const float tof = 0.5 / float(0x80000000U);
    uint bits = index;
    bits = (bits << 16u) | (bits >> 16u);
    bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
    bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
    bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
    bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
    return vec2(float(index) / float(numSamples), float(bits) * tof);
}

vec3 hemisphereCosSample(vec2 u) {
    float phi = 2.0 * PI * u.x;
    float cosTheta2 = 1.0 - u.y;
    float cosTheta = sqrt(cosTheta2);
    float sinTheta = sqrt(1.0 - cosTheta2);
    return vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
}

#endif`;

/* -----------------------------------------
            Vertex Shader
----------------------------------------- */

const shader_vert = resolveLygia(/* glsl */`uniform mat4    u_lightMatrix;
varying vec4    v_lightCoord;

uniform mat4    u_modelViewProjectionMatrix;
uniform mat4    u_projectionMatrix;
uniform mat4    u_modelMatrix;
uniform mat4    u_viewMatrix;
uniform mat3    u_normalMatrix;

uniform vec3    u_camera;
uniform vec2    u_resolution;
uniform float   u_time;

varying vec4    v_position;
varying vec4    v_tangent;
varying vec4    v_color;
varying vec3    v_normal;
varying vec2    v_texcoord;

#ifdef PLATFORM_WEBGL

// ThreeJS
#define POSITION_ATTRIBUTE  vec4(position,1.0)
#define TANGENT_ATTRIBUTE   tangent
#define COLOR_ATTRIBUTE     color
#define NORMAL_ATTRIBUTE    normal
#define TEXCOORD_ATTRIBUTE  uv
#define CAMERA_UP           vec3(0.0, -1.0, 0.0)
#define MODEL_MATRIX        modelMatrix
#define VIEW_MATRIX         viewMatrix
#define PROJECTION_MATRIX   projectionMatrix

#else

// GlslViewer
#define POSITION_ATTRIBUTE  a_position
attribute vec4              POSITION_ATTRIBUTE;

#ifdef MODEL_VERTEX_TANGENT
#define TANGENT_ATTRIBUTE   a_tangent
attribute vec4              TANGENT_ATTRIBUTE;
#endif

#ifdef MODEL_VERTEX_COLOR
#define COLOR_ATTRIBUTE     a_color
attribute vec4              COLOR_ATTRIBUTE;
#endif

#ifdef MODEL_VERTEX_NORMAL
#define NORMAL_ATTRIBUTE    a_normal
attribute vec3              NORMAL_ATTRIBUTE;
#endif

#ifdef MODEL_VERTEX_TEXCOORD
#define TEXCOORD_ATTRIBUTE  a_texcoord
attribute vec2              TEXCOORD_ATTRIBUTE;
#endif

#define CAMERA_UP           vec3(0.0, 1.0, 0.0)
#define MODEL_MATRIX        u_modelMatrix
#define VIEW_MATRIX         u_viewMatrix
#define PROJECTION_MATRIX   u_projectionMatrix

#endif

#include "lygia/math/const.glsl"
#include "lygia/math/toMat4.glsl"
#include "lygia/math/inverse.glsl"
#include "lygia/space/lookAt.glsl"
#include "lygia/space/orthographic.glsl"

void main(void) {
    v_position = POSITION_ATTRIBUTE;
    v_color = vec4(1.0);
    v_normal = NORMAL_ATTRIBUTE;

    #if defined(PLATFORM_WEBGL) || defined(MODEL_VERTEX_TEXCOORD)
    v_texcoord = TEXCOORD_ATTRIBUTE;
    #else
    v_texcoord = v_position.xy;
    #endif

    #if defined(USE_TANGENT) || defined(MODEL_VERTEX_TANGENT)
    v_tangent = TANGENT_ATTRIBUTE;
    #endif

    #if defined(USE_COLOR) || defined(MODEL_VERTEX_COLOR)
    v_color = COLOR_ATTRIBUTE;
    #endif

    #if defined(FLOOR) && defined(PLATFORM_WEBGL)
    v_position.xz *= vec2(2.0, 2.0);
    float z = 1.0-(v_position.z * 0.1 + 0.25);
    v_position.y += pow(z, 12.0) * 0.5;

    #endif

#if defined(DEVLOOK_SPHERE_0) || defined(DEVLOOK_SPHERE_1) || defined(DEVLOOK_BILLBOARD_0)

    #ifdef LIGHT_SHADOWMAP
    v_lightCoord = vec4(0.0);
    #endif

    float area = 2.0;
    mat4 P = orthographic(  area, -area,
                            area, -area,
                            -1.0, 5.0);

    #if defined(DEVLOOK_BILLBOARD_0)
    mat4 V = mat4(1.0);
    float S = 0.65;
    #else
    mat4 V = inverse( toMat4( lookAt(normalize(u_camera), vec3(0.0), CAMERA_UP) ) );
    float S = 0.25;
    #endif

    gl_Position = P * V * POSITION_ATTRIBUTE;
    float aspect = u_resolution.y / u_resolution.x;
    gl_Position.xy *= vec2(aspect, 1.0) * S;
    gl_Position.x -= 0.8;

    #if defined(DEVLOOK_SPHERE_0)
    gl_Position.y += 0.8;
    #elif defined(DEVLOOK_SPHERE_1)
    gl_Position.y += 0.5;
    #elif defined(DEVLOOK_BILLBOARD_0)
    gl_Position.y += 0.2;
    #endif

#else

    v_position = MODEL_MATRIX * v_position;
    #if defined(LIGHT_SHADOWMAP)
    v_lightCoord = u_lightMatrix * v_position;
    #endif

    gl_Position = PROJECTION_MATRIX * VIEW_MATRIX * MODEL_MATRIX * v_position;

#endif
}`);

/* -----------------------------------------
            Fragment Shader
----------------------------------------- */

const shader_frag = resolveLygia(/* glsl */`// IBL
uniform samplerCube             u_cubeMap;
uniform vec3                    u_SH[9];

// Shadow
uniform sampler2D               u_lightShadowMap;
uniform mat4                    u_lightMatrix;
uniform vec3                    u_light;
uniform vec3                    u_lightColor;
uniform float                   u_lightIntensity;
varying vec4                    v_lightCoord;

// Scene
uniform vec2                    u_resolution;
uniform float                   u_time;

// Model
varying vec4                    v_position;
varying vec4                    v_color;
varying vec3                    v_normal;
varying vec2                    v_texcoord;

#define SCENE_SH_ARRAY          u_SH
#define SCENE_CUBEMAP           u_cubeMap
// #define IBL_IMPORTANCE_SAMPLING

#define SURFACE_POSITION        v_position

#define LIGHT_DIRECTION         u_light
#define LIGHT_COORD             v_lightCoord
#define LIGHT_COLOR             u_lightColor
#define LIGHT_INTENSITY         u_lightIntensity

#ifdef PLATFORM_WEBGL
#define CAMERA_POSITION         cameraPosition

#define MODEL_VERTEX_NORMAL     v_normal
#define MODEL_VERTEX_TEXCOORD   v_texcoord
#define MODEL_VERTEX_TANGENT    v_tangent
#define MODEL_VERTEX_COLOR      v_color

#include <packing>

#define SAMPLERSHADOW_FNC(TEX, UV) unpackRGBAToDepth(SAMPLER_FNC(TEX, UV))
#define SHADOWMAP_BIAS 0.0

#else

uniform vec3                    u_camera;
#define CAMERA_POSITION         u_camera

#endif

#define FNC_SPECULAR_IMPORTANCE_SAMPLING
#define FNC_LUMINANCE

${temporaryLygiaFixes}
${temporaryLygiaLightingFixes}

#include "lygia/math/saturate.glsl"
#include "lygia/space/ratio.glsl"
#include "lygia/space/scale.glsl"
#include "lygia/color/space/rgb2srgb.glsl"
#include "lygia/color/space/srgb2rgb.glsl"
#include "lygia/draw/colorChecker.glsl"
#include "lygia/space/lookAt.glsl"

#include "lygia/lighting/material/new.glsl"
#include "lygia/lighting/pbr.glsl"

void main() {
    vec4 color = vec4(vec3(0.0), 1.0);
    vec2 pixel = 1.0 / u_resolution;
    vec2 st = gl_FragCoord.xy * pixel;
    vec2 uv = v_texcoord;

    Material material = materialNew();

    #if defined(FLOOR)
    material.albedo.rgb = vec3(0.25);
    material.roughness = 1.0;
    material.metallic = 0.001;

    #elif defined(DEVLOOK_SPHERE_0)
    material.metallic = 0.0;
    material.roughness = 1.0;

    #elif defined(DEVLOOK_SPHERE_1)
    material.metallic = 1.0;
    material.roughness = 0.0;

    #elif defined(DEVLOOK_BILLBOARD_0)
    material.roughness = 1.0;
    material.metallic = 0.0;
    material.albedo = srgb2rgb(colorChecker(uv));

    #else
    material.albedo.rgb = vec3(1.0);

    #endif

    color = pbr(material);
    color = rgb2srgb(color);

    gl_FragColor = color;
}`);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(width, height);
renderer.shadowMap.enabled = true;
// renderer.toneMapping = THREE.ACESFilmicToneMapping;
D.body.appendChild(renderer.domElement);

let uniforms = {};

// GLSL Buffers
const glsl_pipeline = new GlslPipeline(renderer, uniforms);
glsl_pipeline.load(shader_frag, shader_vert);

// Camera
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
camera.position.z = 3;
const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

// Scene
const scene = new THREE.Scene();

// Scene: IBL
glsl_pipeline.setCubemap("/little_paris_eiffel_tower_2k.hdr", scene);
scene.background = (uniforms as CubeMapUniform).u_cubeMap.value;
scene.environment = (uniforms as CubeMapUniform).u_cubeMap.value;

// Scene: Lights
const light = new THREE.DirectionalLight(0xffffff, 1.0);
light.position.set(0, 10, 8);
light.lookAt(0, 0, 0);
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = 20;
scene.add(light);
glsl_pipeline.setLight(light);

// Scene: Floor
const floor = new THREE.PlaneGeometry(5, 5, 1, 36);
floor.rotateX(-Math.PI * 0.5);
floor.translate(0, -0.7, 0);
const floorMesh = new THREE.Mesh(floor, glsl_pipeline.branchMaterial("FLOOR"));
floorMesh.castShadow = false;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

// Scene: devlook
const devlook_sphere_0 = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 200), glsl_pipeline.branchMaterial("DEVLOOK_SPHERE_0"));
scene.add(devlook_sphere_0);

const devlook_sphere_1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 200), glsl_pipeline.branchMaterial("DEVLOOK_SPHERE_1"));
scene.add(devlook_sphere_1);

const devlook_billboard_0 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glsl_pipeline.branchMaterial("DEVLOOK_BILLBOARD_0"));
devlook_billboard_0.material.transparent = true;
scene.add(devlook_billboard_0);

// Scene: Mesh
const objLoader = new OBJLoader();
objLoader.load(
  '/dragon.obj',
    function (object: THREE.Object3D & { children: { geometry: THREE.BufferGeometry, material: THREE.Material | null }[] }) {
    // Smooth surface
    object.children[0].geometry.deleteAttribute('normal');
    object.children[0].geometry = BufferGeometryUtils.mergeVertices(object.children[0].geometry);
    object.children[0].geometry.computeVertexNormals();
    // Set material
    object.children[0].material = glsl_pipeline.material;
    object.children[0].castShadow = true;
    object.children[0].receiveShadow = true;
    // Add to scene
    scene.add(object);
  },
  function (xhr: { loaded: number, total: number }) { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
  function () { console.log('An error happened'); }
);

const draw = () => {
  glsl_pipeline.renderScene(scene, camera);
  requestAnimationFrame(draw);
};

const resize = () => {
  width = W.innerWidth;
  height = W.innerHeight;
  pixelRatio = W.devicePixelRatio;

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);

  glsl_pipeline.setSize(width, height);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

W.addEventListener("resize", resize);
resize();

draw();

// window.gp = glsl_pipeline; // for debugging
