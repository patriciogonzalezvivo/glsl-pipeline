import * as React from 'react'

import {
    GlslPipeline
} from "../../index"

import { create } from "zustand"

import { GlslPipelineProperties, ZustandStore, useGlslPipelineCallback, GlslPipelineClass } from '../../types';

export const GlslPipelineContext = create<ZustandStore>(() => ({}));

export function useGlslPipeline(callback: useGlslPipelineCallback, ref: React.MutableRefObject<GlslPipelineClass | null>, priority = 0) {
    const { addCallback, removeCallback } = GlslPipelineContext();

    React.useEffect(() => {
        if (!callback || !addCallback || !removeCallback || !ref.current) return;

        addCallback(callback, priority);

        return () => {
            removeCallback(callback);
        }
    }, [ref.current, addCallback, removeCallback, priority]); // eslint-disable-line react-hooks/exhaustive-deps
}