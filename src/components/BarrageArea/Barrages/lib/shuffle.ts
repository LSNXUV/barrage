
/**
 * 随机打乱数组顺序，使用Fisher-Yates算法
 */
export function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;    // ｜ 0 向下取整比 Math.floor 更快
        const value = array[i];
        array[i] = array[j];
        array[j] = value;
    }
    return array;
}