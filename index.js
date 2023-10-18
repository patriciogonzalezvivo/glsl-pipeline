import {
    WebGLRenderTarget,
    Camera,
    Scene,
    PlaneGeometry,
    ShaderMaterial,
    Mesh,
    Clock,
    Vector4,
    Vector3,
    Vector2,
    LinearFilter,
    RepeatWrapping,
    ClampToEdgeWrapping,
    FloatType,
    HalfFloatType,
    RGBAFormat,
    NearestFilter,
    DepthTexture,
} from 'three';

class GlslPipeline {
    constructor(renderer, uniforms = {}) {
        if (!renderer.capabilities.floatFragmentTextures)
            throw new Error("No OES_texture_float support for float textures.");

        this.renderer = renderer;

        this.defines = { 'PLATFORM_WEBGL': '1' };
        this.uniforms = uniforms;
        this.frag_src = null;
        this.vert_src = null;
        
        this.uniforms.u_camera = { value: new Vector3() };
        this.uniforms.u_cameraNearClip = { value: 0.0 };
        this.uniforms.u_cameraFarClip = { value: 0.0 };
        this.uniforms.u_cameraDistance = { value: 0.0 };

        this.uniforms.u_viewMatrix = { value: null };
        this.uniforms.u_inverseViewMatrix = { value: null };
        this.uniforms.u_projectionMatrix = { value: null };
        this.uniforms.u_inverseProjectionMatrix = { value: null };
        this.uniforms.u_normalMatrix = { value: null };
        this.uniforms.u_modelMatrix = { value: null };

        this.uniforms.u_resolution = { value: new Vector2() };
        this.uniforms.u_mouse = { value: new Vector2() };
        this.uniforms.u_delta = { value: 0.0 };
        this.uniforms.u_time = { value: 0.0 };
        this.uniforms.u_frame = { value: 0 };
        this.uniforms.u_date = { value: new Vector4() };

        this.light = null;

        this.buffers = [];
        this.doubleBuffers = [];
        this.background = null;
        this.material = null;
        this.sceneBuffer = null;
        this.postprocessing = null;

        this.billboard_scene = new Scene();
        this.billboard_camera = new Camera();
        this.billboard_camera.position.z = 1;
        this.passThruUniforms = { texture: { value: null } };
        this.passThruShader = createShaderMaterial(this.passThruUniforms, {}, getPassThroughFragmentShader());

        this.mesh = new Mesh(new PlaneGeometry(2, 2), this.passThruShader);
        this.billboard_scene.add(this.mesh);

        this.clock = new Clock();
        this.frame = 0;
        this.lastTime = 0.0;
        this.time = 0.0;
        this.resolution = new Vector2(renderer.domElement.width, renderer.domElement.height);

        document.addEventListener('mousemove', (e) => {
            let rect = renderer.domElement.getBoundingClientRect();
            let x = (e.clientX || e.pageX);
            let y = (e.clientY || e.pageY);
            this.uniforms.u_mouse.value.x = (x - rect.left) * window.devicePixelRatio;
            this.uniforms.u_mouse.value.y = (renderer.domElement.height - (y - rect.top) * window.devicePixelRatio);
        }, false);
    }

    getBufferSize(name) {
        if (this.frag_src == null)
            return { width: 1.0, height: 1.0 };

        const size_exp = new RegExp(`uniform\\s*sampler2D\\s*${name}\\;\\s*\\/\\/*\\s(\\d+)x(\\d+)`, 'gm');
        const size_found = size_exp.exec(this.frag_src);
        if (size_found)
            return { width: parseInt(size_found[1]), height: parseInt(size_found[2]) };

        const scale_exp = new RegExp(`uniform\\s*sampler2D\\s*${name}\\;\\s*\\/\\/*\\s(\\d*\\.\\d+|\\d+)`, 'gm');
        const scale_found = scale_exp.exec(this.frag_src);
        if (scale_found) {
            if (scale_found.length > 2)
                return { width: parseFloat(scale_found[1]), height: parseFloat(scale_found[2]) };
            else if (scale_found.length > 1)
                return { width: parseFloat(scale_found[1]), height: parseFloat(scale_found[1]) };
        }

        return { width: 1.0, height: 1.0 };
    }

    load(frag_src,  vert_src = null) {
        this.frag_src = frag_src;
        this.vert_src = vert_src;

        const found_background = this.frag_src.match(/(?:^\s*)((?:#if|#elif)(?:\s*)(defined\s*\(\s*BACKGROUND)(?:\s*\))|(?:#ifdef)(?:\s*BACKGROUND)(?:\s*))/gm);
        if (found_background) {
            this.renderer.autoClearColor = false;
            this.addBackground();
        }

        const found_buffers = this.frag_src.match(/(?:^\s*)((?:#if|#elif)(?:\s*)(defined\s*\(\s*BUFFER_)(\d+)(?:\s*\))|(?:#ifdef)(?:\s*BUFFER_)(\d+)(?:\s*))/gm);
        if (found_buffers)
            for (let i = 0;i < found_buffers.length;i++) {
                let s = this.getBufferSize(`u_buffer${i}`);
                this.addBuffer(s.width, s.height);
            }

        const found_doubleBuffers = frag_src.match(/(?:^\s*)((?:#if|#elif)(?:\s*)(defined\s*\(\s*DOUBLE_BUFFER_)(\d+)(?:\s*\))|(?:#ifdef)(?:\s*DOUBLE_BUFFER_)(\d+)(?:\s*))/gm);
        if (found_doubleBuffers) {
            this.renderer.autoClearColor = false;
            for (let i = 0;i < found_doubleBuffers.length;i++) {
                let s = this.getBufferSize(`u_doubleBuffer${i}`);
                // console.log(s);
                this.addDoubleBuffer(s.width, s.height);
            }
        }

        this.material = createShaderMaterial(this.uniforms, this.defines, this.frag_src, this.vert_src);

        const found_postprocessing = this.frag_src.match(/(?:^\s*)((?:#if|#elif)(?:\s*)(defined\s*\(\s*POSTPROCESSING)(?:\s*\))|(?:#ifdef)(?:\s*POSTPROCESSING)(?:\s*))/gm);
        if (found_postprocessing)
            this.addPostprocessing();
    }

    branchMaterial(name) {
        return createShaderMaterial(this.uniforms, this.defines, `#define ${name.toUpperCase()}\n${this.frag_src}`, `#define ${name.toUpperCase()}\n${this.vert_src}`,);
    }

    addBackground() {
        this.background = createShaderMaterial(this.uniforms, this.defines, `#define BACKGROUND\n${this.frag_src}`);
        return this.background;
    }

    addBuffer(width, height) {
        let index = this.buffers.length;
        let material = createShaderMaterial(this.uniforms, this.defines, `#define BUFFER_${index}\n${this.frag_src}`);
        let b = {
            name: `u_buffer${index}`,
            material: material,
            renderTarget: null,
            width: width,
            height: height,
            wrapS: RepeatWrapping,
            wrapT: RepeatWrapping,
            minFilter: LinearFilter,
            magFilter: LinearFilter
        };

        this.buffers.push(b);
        this.uniforms[b.name] = { value: null };

        b.renderTarget = this.createRenderTarget(b);

        return b;
    }

    addDoubleBuffer(width, height) {
        let index = this.doubleBuffers.length;
        let material = createShaderMaterial(this.uniforms, this.defines, `#define DOUBLE_BUFFER_${index}\n${this.frag_src}`);
        let db = {
            name: `u_doubleBuffer${index}`,
            material: material,
            renderTargets: [],
            width: width,
            height: height,
            wrapS: RepeatWrapping,
            wrapT: RepeatWrapping,
            minFilter: LinearFilter,
            magFilter: LinearFilter
        };

        this.doubleBuffers.push(db);
        this.uniforms[db.name] = { value: null };

        db.renderTargets[0] = this.createRenderTarget(db);
        db.renderTargets[1] = this.createRenderTarget(db);

        return db;
    }

    addPostprocessing() {
        this.postprocessing = createShaderMaterial(this.uniforms, this.defines, `#define POSTPROCESSING\n${this.frag_src}`);
        this.sceneBuffer = {
            renderTarget: null,
            width: this.renderer.domElement.width,
            height: this.renderer.domElement.height,
        };

        this.uniforms.u_scene = { value: null };
        this.uniforms.u_sceneDepth = { value: null };

        this.sceneBuffer.renderTarget = this.createRenderTarget({
            width: this.sceneBuffer.width,
            height: this.sceneBuffer.height,
            wrapS: null,
            wrapT: null,
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            depth: true
        });

        return this.sceneBuffer;
    }

    setLight(light) {
        this.light = light;
        this.uniforms.u_lightMatrix = { value: this.light.shadow.matrix };
        this.uniforms.u_light = { value: this.light.position };
        this.uniforms.u_lightColor = { value: this.light.color };
        this.uniforms.u_lightIntensity = { value: this.light.intensity };
        this.uniforms.u_lightShadowMap = { value: null};
        this.defines["LIGHT_SHADOWMAP"] = "u_lightShadowMap";
        this.defines["LIGHT_SHADOWMAP_SIZE"] = this.light.shadow.mapSize.width.toString();
    }

    createRenderTarget(b) {
        b.wrapS = b.wrapS || ClampToEdgeWrapping;
        b.wrapT = b.wrapT || ClampToEdgeWrapping;

        b.minFilter = b.minFilter || NearestFilter;
        b.magFilter = b.magFilter || NearestFilter;

        let type = FloatType;

        if (this.renderer.capabilities.isWebGL2 === false)
            type = HalfFloatType;

        let w = b.width;
        let h = b.height;

        if (w <= 1.0 && h <= 1.0) {
            w *= this.renderer.domElement.width;
            h *= this.renderer.domElement.height;
        }

        let depth = null;
        if (b.depth)
            depth = new DepthTexture();

        let renderTarget = new WebGLRenderTarget(Math.floor(w), Math.floor(h), {
            wrapS: b.wrapS,
            wrapT: b.wrapT,
            minFilter: b.minFilter,
            magFilter: b.magFilter,
            format: RGBAFormat,
            type: (/(iPad|iPhone|iPod)/g.test(navigator.userAgent)) ? HalfFloatType : type,
            stencilBuffer: false,
            depthTexture: depth,
        });

        return renderTarget;
    }

    updateUniforms(camera = null) {

        this.time = this.clock.getElapsedTime();

        this.uniforms.u_frame.value = this.frame;
        this.uniforms.u_time.value = this.time;
        this.uniforms.u_delta.value = this.time - this.lastTime;

        this.uniforms.u_resolution.value = this.resolution;

        let date = new Date();
        this.uniforms.u_date.value = new Vector4(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() * 0.001 );

        if (camera) {
            this.uniforms.u_camera.value = camera.position;
            this.uniforms.u_cameraDistance.value = camera.position.length();
            this.uniforms.u_cameraNearClip.value = camera.near;
            this.uniforms.u_cameraFarClip.value = camera.far;

            this.uniforms.u_projectionMatrix.value = camera.projectionMatrix;
            this.uniforms.u_inverseProjectionMatrix.value = camera.projectionMatrixInverse;

            this.uniforms.u_viewMatrix.value = camera.matrixWorldInverse;
            this.uniforms.u_inverseViewMatrix.value = camera.matrixWorld;
            this.uniforms.u_normalMatrix.value = camera.normalMatrix;

            this.uniforms.u_modelMatrix.value = camera.matrixWorld;
        }

        if (this.light) {
            this.uniforms.u_lightMatrix = { value: this.light.shadow.matrix };
            this.uniforms.u_light = { value: this.light.position };
            this.uniforms.u_lightColor = { value: this.light.color };
            this.uniforms.u_lightIntensity = { value: this.light.intensity };

            if (this.light.shadow.map)
                this.uniforms.u_lightShadowMap = { value: this.light.shadow.map.texture };
        }

        this.lastTime = this.time;
        this.frame++;
    }

    updateBuffers() {
        // Buffers
        for (let i = 0, il = this.buffers.length;i < il;i++) {
            let b = this.buffers[i];
            if (b.width <= 1.0 && b.height <= 1.0)
                this.uniforms.u_resolution.value = new Vector2(Math.floor(this.resolution.x * b.width), Math.floor(this.resolution.y * b.height));
            else
                this.uniforms.u_resolution.value = new Vector2(b.width, b.height);

            this.renderTarget(b.material, b.renderTarget);
            this.uniforms[b.name].value = b.renderTarget.texture;
        }

        // Double buffers
        let currentTextureIndex = this.frame % 2;
        let nextTextureIndex = (this.frame+1) % 2;
        for (let i = 0, il = this.doubleBuffers.length;i < il;i++) {
            let db = this.doubleBuffers[i];
            if (db.width <= 1.0 && db.height <= 1.0)
                this.uniforms.u_resolution.value = new Vector2(Math.floor(this.resolution.x * db.width), Math.floor(this.resolution.y * db.height));
            else
                this.uniforms.u_resolution.value = new Vector2(db.width, db.height);

            this.uniforms[db.name].value = db.renderTargets[currentTextureIndex].texture;

            this.renderTarget(db.material, db.renderTargets[nextTextureIndex]);
            // this.uniforms[db.name].value = db.renderTargets[nextTextureIndex].texture;
        }

        this.renderer.setRenderTarget(null);
    }

    renderBackground() {
        if (this.background) {
            this.mesh.material = this.background;
            this.renderer.render(this.billboard_scene, this.billboard_camera);
            this.mesh.material = this.passThruShader;
        }
    }

    getBufferTexture(index) {
        if (index >= this.buffers.length)
            return;

        return this.buffers[index].renderTarget.texture;
    }

    getDoubleBufferTexture(index) {
        if (index >= this.doubleBuffers.length)
            return;

        return this.doubleBuffers[index].renderTargets[this.frame % 2].texture;
    }

    renderBuffer(index) {
        if (index >= this.buffers.length)
            return;

        this.uniforms.u_resolution.value = this.resolution;
        this.passThruUniforms.texture.value = this.geBufferTexture(index);
        this.mesh.material = this.passThruShader;
        this.renderer.render(this.billboard_scene, this.billboard_camera);
    }

    renderDoubleBuffer(index) {
        if (index >= this.doubleBuffers.length)
            return;

        this.uniforms.u_resolution.value = this.resolution;
        this.passThruUniforms.texture.value = this.getDoubleBufferTexture(index);
        this.mesh.material = this.passThruShader;
        this.renderer.render(this.billboard_scene, this.billboard_camera);
    }

    renderMain() {
        this.updateUniforms();

        this.updateBuffers();

        this.uniforms.u_resolution.value = this.resolution;

        this.mesh.material = this.material;
        this.renderer.render(this.billboard_scene, this.billboard_camera);
        this.mesh.material = this.passThruShader;
    }

    renderScene(scene, camera) {
        this.updateUniforms(camera);

        this.updateBuffers();

        if (this.sceneBuffer) {
            this.renderer.setRenderTarget(this.sceneBuffer.renderTarget);
            this.renderer.clear();
        }

        this.renderBackground();
        this.renderer.render(scene, camera);

        if (this.sceneBuffer) {
            this.renderer.setRenderTarget(null);
            this.renderer.clear();

            this.uniforms.u_resolution.value = this.resolution;
            this.uniforms.u_scene.value = this.sceneBuffer.renderTarget.texture;
            this.uniforms.u_sceneDepth.value = this.sceneBuffer.renderTarget.depthTexture;

            this.mesh.material = this.postprocessing;
            this.renderer.render(this.billboard_scene, this.billboard_camera);
            this.mesh.material = this.passThruShader;
        }
    }

    renderTarget(material, output) {
        this.mesh.material = material;
        this.renderer.setRenderTarget(output);
        // this.renderer.clear();
        this.renderer.render(this.billboard_scene, this.billboard_camera, output);
        this.mesh.material = this.passThruShader;
    }

    setSize(width, height) {
        width *= window.devicePixelRatio;
        height *= window.devicePixelRatio;

        if (this.sceneBuffer) {
            this.sceneBuffer.width = width;
            this.sceneBuffer.height = height;
            this.sceneBuffer.renderTarget.setSize(width, height);
        }

        this.resolution = new Vector2(width, height);
        this.uniforms.u_resolution.value = this.resolution;

        for (let i = 0;i < this.buffers.length;i++) {
            let b = this.buffers[i];
            if (b.width <= 1.0 && b.height <= 1.0)
                b.renderTarget.setSize(b.width * width, b.height * height);
        }

        for (let i = 0;i < this.doubleBuffers.length;i++) {
            this.renderer.autoClearColor = false;
            let db = this.doubleBuffers[i];
            if (db.width <= 1.0 && db.height <= 1.0) {
                let w = Math.floor(db.width * width);
                let h = Math.floor(db.height * height);
                db.renderTargets[0].setSize(w, h);
                db.renderTargets[1].setSize(w, h);
            }
        }

        this.frame = 0;
    }
}

function createShaderMaterial(uniforms, defines, fragmentShader, vertexShader) {
    let material = new ShaderMaterial({
        uniforms: uniforms === undefined ? {} : uniforms,
        vertexShader: vertexShader || getPassThroughVertexShader(),
        fragmentShader,
    });
    material.defines = defines;

    return material;
}

function getPassThroughVertexShader() {
    return  /* glsl */`varying vec2 v_texcoord;
    void main() {
        v_texcoord = uv;
        gl_Position = vec4(position, 1.0);
    }`;
}

function getPassThroughFragmentShader() {
    return  /* glsl */`uniform sampler2D texture;
    uniform vec2 u_resolution;
    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        gl_FragColor = texture2D( texture, uv );
    }`;
}

export { GlslPipeline };