import * as React from 'react'

import { create } from "zustand"

import { ZustandStore, useGlslPipelineCallback, GlslPipelineClass } from '../../types';

export const GlslPipelineContext = create<ZustandStore>(() => ({}));

export function useGlslPipeline(callback: useGlslPipelineCallback, ref: React.MutableRefObject<GlslPipelineClass | null>, priority = 0) {
    const { addCallback, removeCallback } = GlslPipelineContext();

    React.useEffect(() => {
        if (!callback || !addCallback || !removeCallback || !ref.current) return;

        addCallback(callback, priority, ref.current);

        return () => {
            removeCallback(callback);
        }
    }, [ref.current, addCallback, removeCallback, priority]); // eslint-disable-line react-hooks/exhaustive-deps
}