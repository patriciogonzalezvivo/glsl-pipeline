import React, {
    forwardRef,
    useCallback,
    useRef,
    useMemo,
    memo,
    useEffect,
    useImperativeHandle
} from 'react'

import {
    useFrame,
    useThree
} from "@react-three/fiber"

import {
    GlslPipeline
} from "../../index"

import { create } from "zustand"

const GlslPipelineContext = create(() => ({}));

export function useGlslPipeline(callback, ref, priority = 0) {
    const { addCallback, removeCallback } = GlslPipelineContext();

    const filtered = useCallback((pipe) => {
        return Object.keys(pipe).reduce((res, key) => {
            if (typeof pipe[key] !== 'function') {
                res[key] = pipe[key];
            }

            return res;
        }, {});
    }, []);

    useEffect(() => {
        if (!callback || !addCallback || !removeCallback || !ref.current) return;

        addCallback(callback, priority, filtered(ref.current));

        return () => {
            removeCallback(callback);
        }
    }, [ref.current, addCallback, removeCallback, priority]); // eslint-disable-line react-hooks/exhaustive-deps
}

const GlslPipelineReact = memo(forwardRef(({ type = "scene", uniforms, fragmentShader, vertexShader, branch, resize = true, autoRender = true, renderPriority = 0, ...props }, ref) => {

    const threeState = useThree();

    const callbacks = useRef([]);

    const addCallback = useCallback((callback, priority, pipeline) => {
        callbacks.current.push({ callback, priority, pipeline });
        callbacks.current.sort((a, b) => a.priority - b.priority);
    }, []);

    const removeCallback = useCallback((callback) => {
        callbacks.current = callbacks.current.filter((cb) => cb.callback !== callback)
    }, []);

    const onRender = useCallback((s) => {
        for (let i = 0; i < callbacks.current.length; i++) {
            callbacks.current[i].callback(callbacks.current[i].pipeline, s);
        }
    }, []);

    const pipeline = useMemo(() => {

        const glsl = new GlslPipeline(threeState.gl, uniforms);

        glsl.load(fragmentShader, vertexShader);

        return glsl;
    }, [threeState, uniforms, fragmentShader, vertexShader]);

    useFrame((state) => {
        if (autoRender) {
            pipeline.renderScene(state.scene, state.camera);
        }
        onRender(state);
    }, renderPriority);

    useEffect(() => {
        if (pipeline) {
            GlslPipelineContext.setState({ addCallback, removeCallback });
        }
    }, [pipeline, addCallback, removeCallback]);

    const material = useMemo(() => branch ? pipeline.branchMaterial(branch) : pipeline.material, [pipeline, branch]);

    useImperativeHandle(ref, () => pipeline);

    const onResize = useCallback(() => {

        threeState.gl.setPixelRatio(window.devicePixelRatio);
        threeState.gl.setSize(threeState.size.width, threeState.size.height);
        pipeline.setSize(threeState.size.width, threeState.size.height);

        if (type === "scene") {
            threeState.camera.aspect = threeState.size.width / threeState.size.height;
            threeState.camera.updateProjectionMatrix();
        }

    }, [threeState, pipeline, type]);

    useEffect(() => {
        if (resize) {
            window.addEventListener('resize', onResize, false);
            onResize();
        }

        return () => {
            if (resize) {
                window.removeEventListener('resize', onResize, false);
            }
            material.dispose();
        }
    }, [onResize, resize, material]);

    return <primitive ref={ref} attach='material' object={material} {...props} />
}));

export default GlslPipelineReact;