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

import { GlslPipelineReactProps, addCallback, callbacks, removeCallback, isPerspectiveCamera, GlslPipelineClass } from '../../types';

export const GlslPipelineReact = /* @__PURE__ */ React.forwardRef<GlslPipelineClass, GlslPipelineReactProps>((
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
    } : GlslPipelineReactProps, 
        ref
    ) => {

    const { gl, camera, size } = useThree();

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

    const pipeline = React.useMemo<GlslPipelineClass>(() => {

        const glsl = new GlslPipeline(gl, uniforms);

        glsl.load(fragmentShader, vertexShader);

        return glsl;
    }, [uniforms, fragmentShader, vertexShader, gl]);

    useFrame((state) => {
        if (autoRender) {
            switch (type) {
                case "scene":
                    pipeline.renderScene(state.scene, state.camera);
                    break;
                
                case "main":
                    pipeline.renderMain();
                    break;
            }
        }
        onRender(state);
    }, renderPriority);

    React.useEffect(() => {
        if (pipeline) {
            GlslPipelineContext.setState({ addCallback, removeCallback });
        }
    }, [pipeline, addCallback, removeCallback, GlslPipelineContext]);

    const material = React.useMemo(() => branch ? pipeline.branchMaterial(branch) : pipeline.material, [pipeline, branch]);

    React.useImperativeHandle(ref, () => pipeline, [pipeline]);

    const onResize = React.useCallback(() => {

        if(!type) return;

        gl.setPixelRatio(window.devicePixelRatio);
        gl.setSize(size.width, size.height);
        pipeline.setSize(size.width, size.height);

        // Only set camera manually if camera set to `manual` because fiber is making the camera responsive by default.
        if (type === 'scene' && isPerspectiveCamera(camera)) {
            camera.aspect = size.width / size.height;
            camera.updateProjectionMatrix();
        }

    }, [pipeline, type, size, camera, gl]);

    React.useLayoutEffect(() => {
        if (resize) {
            window.addEventListener('resize', onResize, false);
            onResize();
        }

        return () => {
            if (resize) {
                window.removeEventListener('resize', onResize, false);
            }
            pipeline.dispose();
        }
    }, [resize, onResize, pipeline]);

    return <primitive ref={ref} attach='material' object={material as THREE.ShaderMaterial} {...props} />
});

// For React Dev Tools Display Name
GlslPipelineReact.displayName = 'GlslPipelineReact'