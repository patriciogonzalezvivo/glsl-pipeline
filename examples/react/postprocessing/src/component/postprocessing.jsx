/* eslint-disable react/no-unknown-property */
import { useRef, useMemo } from "react"
import { useThree, extend } from '@react-three/fiber'
import { GlslPipelineReact } from "glsl-pipeline/r3f"
import { Vector3 } from 'three'

import { resolveLygia } from 'resolve-lygia'
import { DirectionalLight, Color } from 'three'

extend({ DirectionalLight });


export default function MyEffect() {

    const shaderRef = useRef();
    const lightRef = useRef();

    const { camera, gl } = useThree();

    useMemo(() => {
        gl.shadowMap.enabled = true;
        camera.position.set(0, 0, 1);
        camera.lookAt(new Vector3(0, 1, 0));
        if(shaderRef.current) {
            shaderRef.current.setLight(lightRef.current);
            lightRef.current.shadow.mapSize.width = 2048;
            lightRef.current.shadow.mapSize.height = 2048;
            lightRef.current.shadow.camera.near = 0.1;
            lightRef.current.shadow.camera.far = 20;
            lightRef.current.shadow.camera.left = -3;
            lightRef.current.shadow.camera.right = 3;
            lightRef.current.shadow.camera.top = 3;
            lightRef.current.shadow.camera.bottom = -3;
        }
    }, [camera, shaderRef, gl])

    const fragmentShader = useMemo(() => resolveLygia(/* glsl */`#ifdef GL_ES
precision mediump float;
#endif

            uniform sampler2D   u_scene;
            uniform sampler2D   u_sceneDepth;

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

            #include "lygia/math/unpack.glsl"
            #define SAMPLERSHADOW_FNC(TEX, UV) unpack(SAMPLER_FNC(TEX, UV))
            #define SHADOWMAP_BIAS 0.0

            #include "lygia/sample/clamp2edge.glsl"
            #include "lygia/space/linearizeDepth.glsl"

             // #define SAMPLEDOF_DEBUG
            #define SAMPLEDOF_BLUR_SIZE 12.
            #define SAMPLEDOF_DEPTH_SAMPLE_FNC(TEX, UV) linearizeDepth( sampleClamp2edge(TEX, UV).r, u_cameraNearClip, u_cameraFarClip)
            #include "lygia/sample/dof.glsl"

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

                #if defined(POSTPROCESSING)
                    color.rgb = sampleDoF(u_scene, u_sceneDepth, st, u_cameraDistance, 20.0);

                #else

                Material material = materialNew();

                #if defined(FLOOR)
                material.albedo.rgb = vec3(0.25) + checkBoard(uv, vec2(8.0)) * 0.1;
                material.roughness = 0.5;
                #endif

                color = pbr(material);
                #endif

                gl_FragColor = color;
            }`), []);

    const vertexShader = useMemo(() => `
            #ifdef GL_ES
            precision mediump float;
            #endif

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
            }`, [])

    return (
        <>
            <directionalLight color={new Color("pink")} ref={lightRef} position={new Vector3(0, 10, 8)} lookAt={new Vector3(0, 0, 0)} castShadow />
            <mesh scale={1} castShadow receiveShadow>
                <sphereGeometry args={[0.5, 64, 32]} translate={[0., 0.5, 0.]}/>
                <GlslPipelineReact ref={shaderRef} fragmentShader={fragmentShader} vertexShader={vertexShader} />
            </mesh>
        </>
    )
}