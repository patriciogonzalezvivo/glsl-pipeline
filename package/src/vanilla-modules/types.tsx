import * as THREE from 'three';

export type Uniform = { [key: string]: THREE.IUniform<any> }

export interface Buffers extends THREE.RenderTargetOptions {
    name: string,
    material: THREE.Material,
    renderTarget: THREE.WebGLRenderTarget,
    width: number,
    height: number
}

export interface DoubleBuffers extends THREE.RenderTargetOptions {
    name: string,
    material: THREE.Material,
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

export interface GlslPipelineProperties {
    renderer: THREE.WebGLRenderer,
    defines: { [key: string]: any },
    uniforms: Uniform,
    frag_src: string | null,
    vert_src: string | null,
    light: THREE.Light | null,
    buffers: Array<Buffers>,
    doubleBuffers: Array<DoubleBuffers>,
    background: THREE.Material | null,
    material: THREE.Material | null,
    sceneBuffer: SceneBuffers | null,
    postprocessing: THREE.Material | null,
    billboard_scene: THREE.Scene,
    billboard_camera: THREE.Camera,
    passThruUniforms: Uniform,
    passThruShader: THREE.Material,
    mesh: THREE.Mesh,
    clock: THREE.Clock,
    frame: number,
    lastTime: number,
    time: number,
    resolution: THREE.Vec2
}