# glsl-pipeline

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
        {
          type === 'scene' ? <primitive ref={ref} attach='material' object={material as THREE.ShaderMaterial} /> : type === 'main' &&
          <mesh>
              <planeGeometry args={[2, 2]} />
              <primitive ref={ref} attach='material' object={material as THREE.ShaderMaterial} />
          </mesh>
        }
      </>
    )
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
