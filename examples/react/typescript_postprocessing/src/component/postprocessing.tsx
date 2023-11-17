import { useRef, useMemo } from "react"
import { useThree, extend } from '@react-three/fiber'
import { GlslPipelineReact, useGlslPipeline } from "glsl-pipeline/r3f"
import { GlslPipelineClass, Lights } from "glsl-pipeline/types"
import { Vector3 } from 'three'

import { resolveLygia } from 'resolve-lygia'
import { DirectionalLight, Color } from 'three'

extend({ DirectionalLight });


export default function MyEffect() {

    const shaderRef = useRef<GlslPipelineClass | null>(null);
    const lightRef = useRef<DirectionalLight | null>(null);

    const { camera, gl } = useThree();

    useMemo(() => {
        gl.shadowMap.enabled = true;
        camera.position.set(5, 5, -5);
        camera.lookAt(new Vector3(0, 1, 0));
        if(shaderRef.current && lightRef.current) {
            const light: Lights = lightRef.current;
            shaderRef.current.setLight(light);
            lightRef.current.shadow?.mapSize.set(2048, 2048)
            if(lightRef.current.shadow) {
                lightRef.current.shadow.camera.near = 0.1;
                lightRef.current.shadow.camera.far = 20;
                lightRef.current.shadow.camera.left = -3;
                lightRef.current.shadow.camera.left = -3;
                lightRef.current.shadow.camera.right = 3;
                lightRef.current.shadow.camera.top = 3;
                lightRef.current.shadow.camera.bottom = -3;
            }
        }
    }, [camera, shaderRef, gl, lightRef])

    const fragmentShader = useMemo(() => resolveLygia(/* glsl */`#ifdef GL_ES
precision mediump float;
#endif
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
            }`), []);

    const vertexShader = useMemo(() => resolveLygia(/* glsl */`
            #ifdef GL_ES
            precision mediump float;
            #endif

            uniform float   u_time;
            uniform mat4    u_projectionMatrix;
            uniform mat4    u_viewMatrix;
            uniform mat4    u_modelMatrix;

            uniform mat4    u_lightMatrix;
            varying vec4    v_lightCoord;

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
                
                #ifdef USE_TANGENT
                v_tangent = tangent;
                #endif

                float time = u_time * 3.0;
                float dist = sin(u_time) + 2.0;

                #ifdef SPHERE
                v_position.xz += 1.0;
                v_position = rotate4dZ(time * 0.4) * v_position;
                v_position.xz -= dist;
                #elif defined(CONE)
                v_position.xz -= 1.0;
                v_position = rotate4dX(time * 0.5) * v_position;
                v_position.xz += dist;
                #endif

                v_color = vec4(1.0);

                v_position = modelMatrix * v_position;
                v_lightCoord = u_lightMatrix * v_position;
                gl_Position = projectionMatrix * viewMatrix * v_position;
            }`), [])

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    useGlslPipeline((_props, { size }) => {
        console.log("Run Second: ", size);
    }, shaderRef, 2)

    useGlslPipeline(( { lastTime, time } ) => {
        console.log("Run First: ", time, lastTime);
    }, shaderRef, 1)

    return (
        <>
            <directionalLight color={new Color("pink")} ref={lightRef} position={new Vector3(0, 10, 8)} castShadow />
            <mesh castShadow receiveShadow>
                <sphereGeometry args={[1, 64, 32]}/>
                <GlslPipelineReact ref={shaderRef} transparent={true} fragmentShader={fragmentShader} vertexShader={vertexShader} branch={'SPHERE'} />
            </mesh>
            <mesh castShadow receiveShadow>
                <coneGeometry args={[0.5, 1.0, 32]} />
                <GlslPipelineReact ref={shaderRef} transparent={true} fragmentShader={fragmentShader} vertexShader={vertexShader} branch={'CONE'} />
            </mesh>
        </>
    )
}