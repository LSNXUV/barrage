
export type BarrageData = {
    id: string;
    content: string;
    startTime: number; // 时间戳
}

/**
 * 弹幕速度枚举，值是代表duration过渡时间，数值越小速度越快
 */
export enum Speed {
    Slow = 18,
    Normal = 15,
    Fast = 12,
}

/**
 * 弹幕模式
 * 1. 紧凑模式（受最小间距限制）：直接分配到不忙碌弹道，整体看着更紧凑
 * 2. 稀疏模式（受最小间距限制）：优先分配到完全空闲弹道，整体看着更稀疏
 */
export enum Mode {
    Compact,
    Sparse
}

export type Config = {
    speed: Speed,
    area: number,
    rowHeight: number,
    minGap: number,
    mode: Mode,
}