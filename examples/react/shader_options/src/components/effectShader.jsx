/* eslint-disable react/no-unknown-property */
import {  useCallback, useMemo, useRef, useState } from 'react'
import { GlslPipelineReact, useGlslPipeline } from 'glsl-pipeline/r3f'
import { useThree } from '@react-three/fiber';
import { resolveLygia } from 'resolve-lygia'
import * as THREE from 'three';
import { useControls } from 'leva'

// eslint-disable-next-line no-unused-vars
const Effect = () => {

    const shaderRef = useRef();

    const { meshSize, rotateSpeed } = useControls({
        meshSize: {
            value: {
                x: 100,
                y: 100
            },
            step: 1.,
            joystick: false
        },
        doubleSide: {
            value: false,
            onChange: (v) => {
                setSide(v);
            }
        },
        rotateSpeed: {
            value: 5.,
            min: 1.,
            max: 10.0,
            step: 0.1
        }
    })

    const [side, setSide] = useState(false);

    const {size, camera} = useThree()
    
    const setFov = useCallback((size, camera) => {
        return 2*Math.atan((size.height/2)/camera.position.z) * (180/Math.PI);
    }, []);

    useMemo(() => {
        camera.fov = setFov(size, camera)
    },[size, camera, setFov]);

    const vertexShader = useMemo(() => resolveLygia(`
    #ifdef GL_ES
    precision mediump float;
    #endif

    uniform float u_time;
    varying vec4 v_position;
    varying vec3 v_normal;
    varying vec2 v_texcoord;
    void main(void) {
        v_texcoord = uv;
        v_normal = normal;
        v_position = vec4(position, 1.);
        v_position.x *= sin(u_time * ${Number(rotateSpeed).toFixed(1)});
        v_position = modelMatrix * v_position;
        gl_Position = projectionMatrix * viewMatrix * v_position;
    }`), [rotateSpeed])

    const fragmentShader = useMemo(() => `#ifdef GL_ES
    precision mediump float;
    #endif
    
    uniform sampler2D texture;
    uniform float u_time;
    uniform vec2 u_resolution;
    varying vec2 v_texcoord;
    void main(void){
        vec2 pixel = 1./u_resolution;
        vec2 st = gl_FragCoord.xy * pixel;
        vec3 color = vec3(0.);

        color.rg = v_texcoord;

        gl_FragColor = vec4(color, 1.);
    }`,[]);

    useGlslPipeline(() => {

    }, shaderRef)

    return(
        <>
            <mesh scale={[meshSize.x, meshSize.y, 1]}>
                <planeGeometry args={[1, 1, 10, 10]}/>
                <GlslPipelineReact side={side ? THREE.DoubleSide : null} ref={shaderRef} fragmentShader={fragmentShader} vertexShader={vertexShader} />
            </mesh>
        </>
    )
}

export default Effect;