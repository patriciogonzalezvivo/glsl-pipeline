import * as React from 'react'

import {
    GlslPipeline
} from "../../index"

import { create } from "zustand"

import { GlslPipelineProperties, ZustandStore, useGlslPipelineCallback, GlslPipelineClass } from '../../types';

export const GlslPipelineContext = create<ZustandStore>(() => ({}));

export function useGlslPipeline(callback: useGlslPipelineCallback, ref: React.MutableRefObject<GlslPipelineClass | undefined>, priority = 0) {
    const { addCallback, removeCallback } = GlslPipelineContext();

    const filtered = React.useCallback<(pipe: GlslPipelineClass) => GlslPipelineProperties>((pipe) => {
        return (Object.keys(pipe) as Array<keyof typeof GlslPipeline>).reduce((res, key) => {
            if (typeof pipe[key] !== 'function') {
                res[key] = pipe[key];
            }

            return res;
        }, {} as any);
    }, []);

    React.useEffect(() => {
        if (!callback || !addCallback || !removeCallback || !ref.current) return;

        addCallback(callback, priority, filtered(ref.current));

        return () => {
            removeCallback(callback);
        }
    }, [ref.current, addCallback, removeCallback, priority]); // eslint-disable-line react-hooks/exhaustive-deps
}