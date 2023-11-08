import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import pkg from './package.json';

export default {
    input: 'src/index.js',
    output: [
        { file: pkg.main, format: 'cjs', exports: 'named', sourcemap: true },
        { file: pkg.module, format: 'esm', exports: 'named', sourcemap: true }
    ],
    plugins: [
        babel({
            babelHelpers: 'bundled',
            exclude: 'node_modules/**',
            presets: ['@babel/preset-env', '@babel/preset-react']
        }),
        nodeResolve(),
        commonjs(),
        terser()
    ],
    external: Object.keys(pkg.peerDependencies)
};