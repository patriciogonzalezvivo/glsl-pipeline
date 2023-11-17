import * as THREE from 'three';

import { RootState } from '@react-three/fiber';
import { Assign } from 'utility-types';

export type Uniform = { [key: string]: THREE.IUniform<any> }

export type MaterialConstructor = new (options: Assign<THREE.ShaderMaterialParameters, GlslPipelineReactProps>) => THREE.Material
type MaterialParams<T extends MaterialConstructor> = ConstructorParameters<T>[0]
export interface GlslPipelineReactProps extends Omit<React.Ref<GlslPipelineClass>, 'ref'> {
    type?: "scene" | "main" | undefined,
    uniforms?: Uniform,
    fragmentShader: string,
    vertexShader?: string | null,
    branch?: string | Array<string>,
    resize?: boolean,
    autoRender?: boolean,
    renderPriority?: number
}

export interface iCSMPatchMap {
    [keyword: string]: {
        [toReplace: string]: string
    }
}

export type PipelineReactParams<T extends MaterialConstructor> = {
    type?: "scene" | "main" | undefined,
    uniforms?: Uniform,
    fragmentShader: string,
    vertexShader?: string | null,
    branch?: string | Array<string>,
    resize?: boolean,
    autoRender?: boolean,
    renderPriority?: number
} & (MaterialParams<T> extends undefined ? {} : MaterialParams<T>)

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
    options: THREE.ShaderMaterialParameters,
    uniforms: Uniform,
    frag_src: string | null,
    vert_src: string | null,
    light: Lights | null,
    buffers: Array<Buffers>,
    doubleBuffers: Array<DoubleBuffers>,
    background: THREE.Material | null,
    material: THREE.Material | null,
    sceneBuffer: SceneBuffers | null,
    postprocessing: THREE.Material | null,
    billboard_scene: THREE.Scene,
    billboard_camera: THREE.Camera,
    mesh: THREE.Mesh,
    clock: THREE.Clock,
    frame: number,
    lastTime: number,
    time: number,
    resolution: THREE.Vec2
}

export interface GlslPipelineClass extends GlslPipelineProperties {
    getBufferSize(name: string): BufferSize
    load(frag_src: string, vert_src?: string | null): void,
    reset(): void,
    branchMaterial(name: string | Array<string>): void,
    addBackground(): void,
    addBuffer(width: number, height: number): Buffers,
    addDoubleBuffer(width: number, height: number): DoubleBuffers,
    addPostprocessing(): SceneBuffers,
    setLight(light: Lights): void,
    createRenderTarget(b: GlslPipelineRenderTargets): THREE.WebGLRenderTarget,
    updateUniforms(camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera): void,
    updateBuffers(): void,
    getBufferTexture(index: number): THREE.Texture | undefined,
    getDoubleBufferTexture(index: number): THREE.Texture | undefined,
    renderBuffer(index: number): void,
    renderDoubleBuffer(index: number): void,
    renderMain(): void,
    renderScene(scene: THREE.Scene, camera: THREE.PerspectiveCamera | THREE.OrthographicCamera): void,
    renderTarget(material: THREE.Material, output: THREE.WebGLRenderTarget): void,
    setSize(width: number, height: number): void,
    dispose(): void
}

export type callbackRender = (props: GlslPipelineClass, state: RootState) => void

export type addCallback = (callback: useGlslPipelineCallback, priority: number) => void;

export type removeCallback = (callback: any) => void

export interface ZustandStore {
    addCallback?: addCallback
    removeCallback?: removeCallback
}

export interface callbacks {
    callback: useGlslPipelineCallback,
    priority: number
}

export const isOrthographicCamera = (def: any): def is THREE.OrthographicCamera =>
    def && (def as THREE.OrthographicCamera).isOrthographicCamera

export const isPerspectiveCamera = (def: any): def is THREE.PerspectiveCamera =>
    def && (def as THREE.PerspectiveCamera).isPerspectiveCamera

export type useGlslPipelineCallback = (props: GlslPipelineProperties, state: RootState) => void;

export type Lights = THREE.Light<THREE.DirectionalLightShadow | THREE.SpotLightShadow | THREE.PointLightShadow>;