import * as THREE from 'three';

export type MaterialConstructor = new (opts: { [key: string]: any }) => THREE.Material

export type Uniform = { [key: string]: THREE.IUniform<any> }

export interface Buffers extends THREE.RenderTargetOptions {
    name: string,
    material: THREE.Material | null,
    renderTarget: THREE.WebGLRenderTarget | null,
    width: number,
    height: number
}

export interface DoubleBuffers extends THREE.RenderTargetOptions {
    name: string,
    material: THREE.Material | null,
    renderTargets: Array<THREE.WebGLRenderTarget>,
    width: number,
    height: number
}


export interface SceneBuffers {
    renderTarget: THREE.WebGLRenderTarget | null,
    width: number,
    height: number,
}

export interface BufferSize {
    width: number,
    height: number
}

export interface GlslPipelineRenderTargets extends THREE.RenderTargetOptions {
    width: number,
    height: number
    depth?: boolean
}

export interface GlslPipelineReactProps extends React.PropsWithRef<THREE.PropertyBinding> {
    type: "scene" | "main" | null,
    uniforms : Uniform,
    fragmentShader: string,
    vertexShader?: string | null,
    branch?: string,
    resize: boolean,
    autoRender: boolean,
    renderPriority: number
}