
/**
 * FNV Hash（Fowler–Noll–Vo）算法，稳定、哈希分布更均匀、性能好
 * 
 * 生成哈希数值
*/
export function hashString(str: string) {
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}