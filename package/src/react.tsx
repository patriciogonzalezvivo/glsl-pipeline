import React, {
    useCallback,
    useRef,
    useMemo,
    useEffect,
    useImperativeHandle
} from 'react'

import {
    useFrame,
    useThree,
    RootState
} from "@react-three/fiber"

import {
    GlslPipeline
} from "./index"

import { create } from "zustand"
import { GlslPipelineReactProps, MaterialConstructor, ZustandStore, addCallback, callbacks, removeCallback } from './types';

export const GlslPipelineContext = create<ZustandStore>(() => ({}));

export function useGlslPipeline(callback: (props: GlslPipeline, state: RootState) => void , ref : React.RefObject<GlslPipeline>, priority = 0 as number){
    const { addCallback, removeCallback } = GlslPipelineContext();

    const filtered = useCallback((pipe : any) => {
        return (Object.keys(pipe) as Array<keyof typeof GlslPipeline>).reduce((res : any, key: any) => {
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

const GlslPipelineReact = ({ type  = "scene" , uniforms, fragmentShader, vertexShader, branch, resize = true, autoRender = true, renderPriority = 0, ...props } : GlslPipelineReactProps, ref : React.Ref<any>) => {

    const state = useThree((state) => state.get);

    const callbacks = useRef([]) as React.MutableRefObject<callbacks[]>;

    const addCallback = useCallback<addCallback>((callback : any, priority : number, pipeline : GlslPipeline) => {
        callbacks.current.push({ callback, priority, pipeline });
        callbacks.current.sort((a, b) => a.priority - b.priority);
    }, []);

    const removeCallback = useCallback<removeCallback>((callback : any) => {
        callbacks.current = callbacks.current.filter((cb) => cb.callback !== callback)
    }, []);

    const onRender = useCallback((s : any) => {
        for (let i = 0; i < callbacks.current.length; i++) {
            callbacks.current[i].callback(callbacks.current[i].pipeline, s);
        }
    }, []);

    const pipeline = useMemo(() => {

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

    useEffect(() => {
        if (pipeline) {
            GlslPipelineContext.setState({ addCallback, removeCallback });
        }
    }, [pipeline, addCallback, removeCallback]);

    const material = useMemo(() => branch ? pipeline.branchMaterial(branch) : pipeline.material, [pipeline, branch]);

    useImperativeHandle(ref, () => pipeline, [pipeline]);

    const onResize = useCallback(() => {

        state().gl.setPixelRatio(window.devicePixelRatio);
        state().gl.setSize(state().size.width, state().size.height);
        pipeline.setSize(state().size.width, state().size.height);

        if (type === "scene") {
            state().viewport.aspect = state().size.width / state().size.height;
            state().camera.updateProjectionMatrix();
        }

    }, [pipeline, type]);

    useEffect(() => {
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
};

export default React.forwardRef(GlslPipelineReact) as <T extends MaterialConstructor>(
    props: GlslPipelineReactProps & { ref?: React.Ref<any> }
) => JSX.Element;

GlslPipelineReact.displayName = "GlslPipeline"

export * from "./types"