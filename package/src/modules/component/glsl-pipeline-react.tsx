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
import { ForwardRefComponent } from 'modules/helper/ts-utils';

export const GlslPipelineReact: ForwardRefComponent<GlslPipelineReactProps, GlslPipeline> = /* @__PURE__ */ React.forwardRef(({ type = "scene", uniforms, fragmentShader, vertexShader, branch, resize = true, autoRender = true, renderPriority = 0, ...props }: GlslPipelineReactProps, ref: React.Ref<GlslPipeline>) => {

    const state = useThree((state) => state.get);

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

        const glsl = new GlslPipeline(state().gl, uniforms);

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

        state().gl.setPixelRatio(window.devicePixelRatio);
        state().gl.setSize(state().size.width, state().size.height);
        pipeline.setSize(state().size.width, state().size.height);

        if (type === "scene") {
            state().viewport.aspect = state().size.width / state().size.height;
            state().camera.updateProjectionMatrix();
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