# glsl-pipeline

## 4.1.1

### Patch Changes

- Fix Render Target that thrown error if set 'depthTexture' to undefined.

## 4.1.0

### Minor Changes

- - React cubemap support
  - Added examples for React Devlook with typescript supported

## 4.0.0

### Major Changes

- Adding support for Cubemaps

## 3.0.0

### Major Changes

- Updated to the latest ThreeJS & React packages using Vite in examples folder.
  - Fix issue raised from https://github.com/patriciogonzalezvivo/glsl-pipeline/issues/9. Updated the conditional statement when initialised `GlslPipeline` with this. Fix the issue by running UnsignedByteType by default for texture format (https://threejs.org/docs/#api/en/constants/Textures):
  ```tsx
  if (renderer.extensions.has("OES_texture_float") || this.forceFloatTexture) {
    this.floatType = FloatType;
  } else if (
    renderer.extensions.has("OES_texture_half_float") ||
    this.forceFloatTextureLinear
  ) {
    this.floatType = HalfFloatType;
  } else {
    this.floatType = UnsignedByteType;
  }
  ```
  - Update all examples packages to use latest ThreeJS and React packages so that it can be running smoothly.
  - Fix typings issues using latest threejs typescript package.

## 2.0.5 - 2.0.6

### Patch Changes

- 2fe8dfa: - Update examples package to use leva to test different hooks value.
  - Added new `id` property in glsl-pipeline class to determine its unique initializer being used in React environment.
  - Update glsl-pipeline hooks.
  - Added more "Render Main" examples.
  - Fix "Render Main" ungenerated mesh on `billboard_scene` due to how the react code component structured using material as object attached. Provide conditional `primitive` component for specific type like this:
  ```tsx
  return (
    <>
      {type === "scene" ? (
        <primitive
          ref={ref}
          attach="material"
          object={material as THREE.ShaderMaterial}
        />
      ) : (
        type === "main" && (
          <mesh>
            <planeGeometry args={[2, 2]} />
            <primitive
              ref={ref}
              attach="material"
              object={material as THREE.ShaderMaterial}
            />
          </mesh>
        )
      )}
    </>
  );
  ```

## 2.0.4

### Patch Changes

- f4802b3: installing
- f4802b3: Small fix
- f4802b3: bumping

## 2.0.1 - 2.0.3

### Patch Changes

- 032b104: - Added new examples for vanilla typescript
  - Adjust typescript files accordingly for non-react code. Only react code uses file name called `.tsx` .
  - Adjust README.md mistakes.
  - Remove unneccessary dependencies in glsl-pipeline package. Cleaner package
  - Remove unused rollup due to preconstruct/cli has already its own rollup by running `preconstruct build`.
  - Add `types` parameter in package.json for `r3f` and `types`.

## 2.0.0

### Major Changes

- New GlslPipeline Version that supports react & typescript!
