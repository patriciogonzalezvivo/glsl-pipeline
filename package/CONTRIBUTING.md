# About Package
This package is using monorepo [`preconstruct/cli`](https://preconstruct.tools/) that can handle multiple packages. Below here are the set of rules when contributing the repo:

1. Always use `yarn` to install packages/run example websites.
2. Use typescript to maintain compatibility across all Javascript imports lint.

## Initialize
After cloning the project into your local computer, you must initialize the project on the **root** folder by simply run:
```bash
yarn
```

> Then it will automatically run script for you from `postinstall` script. This will ensure all the packages validated && `manypkg` script will checks all the `packages` & `examples` folder are properly aligned.

## Package.json

### Entrypoints
Contains 3 entrypoints, react, javascript & types. See `/package/package.json` how it looks like:
```json
{
    "preconstruct": {
        "entrypoints": [
            "index.ts",
            "r3f.ts",
            "types.ts"
        ]
    },
}
```
This will let downloaders use the package to this:
```js
import { GlslPipeline } from 'glsl-pipeline';
import { GlslPipelineReact } from 'glsl-pipeline/r3f';
import { GlslPipelineClass } from 'glsl-pipeline/types';
```

### Workspaces
This is for Yarn Workspace easy for linking. For more info, refer [here](https://preconstruct.tools/tutorials/monorepo#setting-up-yarn-workspaces)

```json
{
  "workspaces": {
        "packages": [
            "package",
            "examples/**/*"
        ]
  },
}
```

### Preconstruct
A set of entrypoints with dependencies that is generally published to a package registry such as npm

```json
{
      "preconstruct": {
            "packages": [
                "package"
            ]
    },
}
```

### Files
`files:[]` in `/package/package.json` will set up a _whitelists_ items on what to allow publish to npm package.

```json
{
    "files": [
        "dist/**",
        "r3f/**",
        "types/**",
        "README.md",
        "LICENSE.md",
        "package.json"
    ],
}
```

## Package
The package contains 3 main directories inside `/package/src` which are:
- `index.ts`
- `r3f.ts`
- `types.ts`

And also contains multiple sub-directories in the called:
- `react-modules`
- `types-helper`
- `vanilla-modules`

In those folders must contains `index.ts` to actually do exports all separated files into one import. Ex:

#### Without `index.ts`
```js
// In /vanilla-modules/class.tsx
export default class GlslPipline ...

// Import example
import { ... } from 'glsl-pipeline/class'
```

#### With `index.ts`
```js
// In /vanilla-modules/class.tsx
export default class GlslPipline ...

// In /vanilla-modules/index.ts
export * from "./class"

// In index.ts
export * from "./react-modules"

// Import example
import { ... } from 'glsl-pipeline'
```

### Install Dependencies in Package
If you ever need to contribute on installing the packages for specific `glsl-pipeline` module, you must do this script on your console **from the root directory**. 

> 💡 No need to go to the directory to add new packages

```bash
# To install new package
yarn workspace glsl-pipeline add <new-package-name>

# To remove some package
yarn workspace glsl-pipeline remove <package-name>
```

## Examples

### Run Examples

You can simply run examples by using this command similar to `package.json` on root folder:

```bash
yarn workspace <package-name> dev
```

`<package-name>` is the package file that already defined in `package.json`:
```json
{
    "name": "<package-name>"
}
```

While the last word from the command earlier says `dev`. It is a shorthand for `yarn dev` to run similarly like `npm run dev` but inside workspace of `<package-name>`

#### Tweak `dev-react` or `dev-vanilla` scripts

Inside `package.json` on root folder, you'll see:
```json
{
    "dev-vanilla": "preconstruct dev && yarn workspace 2d_clock dev",
    "dev-react": "preconstruct dev && yarn workspace shader_options dev",
}
```

> Tweak only on `preconstruct dev && yarn workspace <package-name> dev`

As you can see `preconstruct dev` will run the `/package` folder to build the raw files into `dist` folders using babel and continously run with yarn workspace linking.

### Add new examples
Unfortunately, you cannot run workspace when creating a new folder package using `create-vite`. Inside `/examples` contains two directories for other cloners to run the example:
- `react`
- `vanilla`

You must run this script inside either two directories above to build your own new example:

```bash
# In /exampels/react
yarn create-vite
```

Then it will shows an interactive console for you to setup on your own example.

Then you can go back to root folder and add new packages:
```bash
yarn workspace <your-new-package-name> add <package-dependencies-install>
```

## Publish Npm Package
This package use `changesets/cli` commands for easily.

1. Run Build from root folder

You must run build first to produce `dist` folders that contains all the necessary code that has been minify for production used from installers.
```bash
# From Root Folder
yarn build
```

2. Changeset command

To publish new version, you must follow the [Changesets/Cli Guideline](https://www.npmjs.com/package/@changesets/cli)