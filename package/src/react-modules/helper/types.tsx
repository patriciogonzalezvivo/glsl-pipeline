import * as THREE from 'three';

import { GlslPipeline } from 'vanilla-modules';

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

export interface GlslPipelineReactProps extends Omit<React.Ref<GlslPipeline>, 'ref'> {
    type: "scene" | "main" | undefined,
    uniforms : Uniform,
    fragmentShader: string,
    vertexShader?: string | null,
    branch?: string | Array<string>,
    resize: boolean,
    autoRender: boolean,
    renderPriority: number,
}

export type addCallback = (callback: any, priority: number, pipeline: GlslPipelineProperties) => void;

export type removeCallback = (callback: any) => void

export interface ZustandStore {
    addCallback?: addCallback
    removeCallback?: removeCallback
}

export interface callbacks {
    callback: any,
    priority: number,
    pipeline: GlslPipelineProperties
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

export const isOrthographicCamera = (def: any): def is THREE.OrthographicCamera =>
    def && (def as THREE.OrthographicCamera).isOrthographicCamera

export const isPerspectiveCamera = (def: any): def is THREE.PerspectiveCamera =>
    def && (def as THREE.PerspectiveCamera).isPerspectiveCamera