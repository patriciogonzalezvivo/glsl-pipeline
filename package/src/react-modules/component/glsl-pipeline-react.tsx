import * as React from 'react'

import {
    useFrame,
    useThree,
    RootState
} from "@react-three/fiber"

import {
    GlslPipeline
} from "../../index"

import {
    GlslPipelineContext
} from "../hooks"

import { GlslPipelineReactProps, addCallback, callbacks, removeCallback } from '../helper/types';
import { ForwardRefComponent } from 'react-modules/helper/ts-utils';

export const GlslPipelineReact: ForwardRefComponent<GlslPipelineReactProps, GlslPipeline> = /* @__PURE__ */ React.forwardRef<GlslPipeline, GlslPipelineReactProps>((
    { 
        type = "scene", 
        uniforms, 
        fragmentShader, 
        vertexShader, 
        branch, 
        resize = true, 
        autoRender = true, 
        renderPriority = 0, 
        ...props 
    }, 
        ref
    ) => {

    const { gl, camera, viewport, size } = useThree();

    const callbacks = React.useRef<callbacks[]>([]);

    const addCallback = React.useCallback<addCallback>((callback, priority, pipeline) => {
        callbacks.current.push({ callback, priority, pipeline });
        callbacks.current.sort((a, b) => a.priority - b.priority);
    }, []);

    const removeCallback = React.useCallback<removeCallback>((callback) => {
        callbacks.current = callbacks.current.filter((cb) => cb.callback !== callback)
    }, []);

    const onRender = React.useCallback<((RootState) => void)>((s) => {
        for (let i = 0; i < callbacks.current.length; i++) {
            callbacks.current[i].callback(callbacks.current[i].pipeline, s);
        }
    }, []);

    const pipeline = React.useMemo<GlslPipeline>(() => {

        const glsl = new GlslPipeline(gl, uniforms);

        glsl.load(fragmentShader, vertexShader);

        return glsl;
    }, [uniforms, fragmentShader, vertexShader]);

    useFrame((state) => {
        if (autoRender) {
            pipeline.renderScene(state.scene, state.camera);
        }
        onRender(state);
    }, renderPriority);

    React.useEffect(() => {
        if (pipeline) {
            GlslPipelineContext.setState({ addCallback, removeCallback });
        }
    }, [pipeline, addCallback, removeCallback]);

    const material = React.useMemo(() => branch ? pipeline.branchMaterial(branch) : pipeline.material, [pipeline, branch]);

    React.useImperativeHandle(ref, () => pipeline, [pipeline]);

    const onResize = React.useCallback(() => {

        if(!type) return;

        gl.setPixelRatio(window.devicePixelRatio);
        gl.setSize(size.width, size.height);
        pipeline.setSize(size.width, size.height);

        if (type === 'scene') {
            viewport.aspect = size.width / size.height;
            camera.updateProjectionMatrix();
        }

    }, [pipeline, type]);

    React.useEffect(() => {
        if (resize) {
            window.addEventListener('resize', onResize, false);
            onResize();
        }

        return () => {
            if (resize) {
                window.removeEventListener('resize', onResize, false);
            }
            material?.dispose();
        }
    }, [resize, onResize, material]);

    return <primitive ref={ref} attach='material' object={material as THREE.ShaderMaterial} {...props} />
});

GlslPipelineReact.displayName = 'GlslPipeline'