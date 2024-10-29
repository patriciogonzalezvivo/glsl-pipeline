/* eslint-disable react/no-unknown-property */
import { useRef, useMemo, useCallback } from "react"
import { useThree, extend, useLoader, useGraph } from '@react-three/fiber'
import { GlslPipelineReact, useGlslPipeline } from "glsl-pipeline/r3f"
import { PlaneGeometry, Vector3 } from 'three'

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'

import { resolveLygia } from 'resolve-lygia'
import { DirectionalLight, Color } from 'three'

import { temporaryLygiaFixes, temporaryLygiaLightingFixes } from '../lygia-fixes/fix'
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js"

extend({ DirectionalLight });


export default function Devlook() {

    const devlookRef = useRef(null);
    const floorRef = useRef(null);
    const devlookSphere0Ref = useRef(null);
    const devlookSphere1Ref = useRef(null);
    const devlookbillboard0Ref = useRef(null);
    const lightRef = useRef(null);
    const { camera, gl, scene } = useThree();

    const sceneLoader = useLoader(OBJLoader, '/dragon.obj', null, (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    })

    const { nodes, materials } = useGraph(sceneLoader)

    useMemo(() => {
        gl.shadowMap.enabled = true;
        camera.position.set(3, 3, 3);
        camera.lookAt(new Vector3(0, 1, 0));
        if (devlookRef.current) {
            devlookRef.current.setLight(lightRef.current);
            devlookRef.current.setCubemap("/little_paris_eiffel_tower_2k.hdr", scene)
            scene.background = devlookRef.current.uniforms.u_cubeMap.value;
            scene.environment = devlookRef.current.uniforms.u_cubeMap.value;
            // Smooth surface
            nodes.dragon.geometry.deleteAttribute('normal');
            nodes.dragon.geometry = BufferGeometryUtils.mergeVertices(nodes.dragon.geometry);
            nodes.dragon.geometry.computeVertexNormals();
            nodes.dragon.castShadow = true;
            nodes.dragon.receiveShadow = true;
            lightRef.current.shadow.mapSize.width = 1024;
            lightRef.current.shadow.mapSize.height = 1024;
            lightRef.current.shadow.camera.near = 0.1;
            lightRef.current.shadow.camera.far = 20;
        }
    }, [])

    const fragmentShader = useMemo(() => resolveLygia(/* glsl */`#ifdef GL_ES
precision mediump float;
#endif
// IBL
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
}`), []);

    const vertexShader = useMemo(() => resolveLygia(/* glsl */`#ifdef GL_ES
precision mediump float;
#endif
uniform mat4    u_lightMatrix;
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
}`), [])

    return (
        <>
            <directionalLight color={new Color(0xffffff)} ref={lightRef} position={new Vector3(0, 10, 8)} castShadow lookAt={new Vector3(0, 0, 0)} intensity={1.0} />
            <mesh castShadow receiveShadow>
                <mesh geometry={nodes.dragon.geometry} material={materials.dragon}/>
                <GlslPipelineReact ref={devlookRef} fragmentShader={fragmentShader} vertexShader={vertexShader} />
            </mesh>
            <mesh receiveShadow>
                <planeGeometry args={[5, 5, 1, 36]} rotateX={-Math.PI * 0.5} translate={new Vector3(0, -0.7, 0)}/>
                <GlslPipelineReact ref={floorRef} fragmentShader={fragmentShader} vertexShader={vertexShader} branch={'FLOOR'} />
            </mesh>
            <mesh>
                <icosahedronGeometry args={[1, 200]} />
                <GlslPipelineReact ref={devlookSphere0Ref} fragmentShader={fragmentShader} vertexShader={vertexShader} branch={'DEVLOOK_SPHERE_0'} />
            </mesh>
            <mesh>
                <icosahedronGeometry args={[1, 200]} />
                <GlslPipelineReact ref={devlookSphere1Ref} fragmentShader={fragmentShader} vertexShader={vertexShader} branch={'DEVLOOK_SPHERE_1'} />
            </mesh>
            <mesh>
                <planeGeometry args={[1, 1]} />
                <GlslPipelineReact ref={devlookbillboard0Ref} fragmentShader={fragmentShader} vertexShader={vertexShader} branch={'DEVLOOK_BILLBOARD_0'} transparent />
            </mesh>
        </>
    )
}