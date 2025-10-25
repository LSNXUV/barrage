import { debounce } from "@/util/dt";
import { useEffect } from "react";

export type useResizerHandle = (rect: DOMRect) => void

/**
 * 监听元素尺寸变化
 * @param ref
 * @param handle 变化回调
 * @example
 * useResizer(containerRef, (rect) => {
 *    console.log('尺寸变化', rect.width, rect.height);
 * });
 */
export const useResizer = <T extends HTMLElement | null>(
    ref: React.RefObject<T>,
    handle: useResizerHandle,
) => {

    useEffect(() => {
        // 首次设置
        if (ref.current) {
            handle(ref.current.getBoundingClientRect());
        }
        
        // 观察容器尺寸变化
        let observer: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined' && ref.current) {
            observer = new ResizeObserver(entries => {
                const entry = entries[0];
                if (!entry) return;
                handle(entry.contentRect);
            });
            observer.observe(ref.current);
        } else {
            // 兜底：窗口尺寸变化时重新取容器宽度
            const handleResize = debounce(() => {
                if (!ref.current) return;
                handle(ref.current.getBoundingClientRect());
            });
            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }

        return () => {
            if (observer && ref.current) {
                observer.disconnect();
            }
        };
    }, []);
}