
export const debounce = <F extends (...args: any[]) => any>(func: F, wait: number = 300): F => {
    let timeout: ReturnType<typeof setTimeout> | null;
    return function(this: any, ...args: Parameters<F>) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    } as F;
};