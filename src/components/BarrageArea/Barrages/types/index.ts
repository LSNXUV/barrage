
export type BarrageData = {
    id: string;
    content: string;
    startTime: number; // 时间戳
    delay?: number; // 预设弹幕延迟时间，单位秒
}

/**
 * 弹幕速度枚举，值是代表duration过渡时间，数值越小速度越快
 */
export enum Speed {
    Slower = 26,
    Slow = 23,
    Slowless = 20,
    Normal = 18,
    Fastless = 16,
    Fast = 14,
    Faster = 12,
}

/**
 * 弹幕分配方式
 * 1. 紧凑（受最小间距限制）：直接分配到不忙碌弹道，整体看着更紧凑
 * 2. 稀疏（受最小间距限制）：优先分配到完全空闲弹道，整体看着更稀疏
 */
export enum AllocatedWay {
    /** 紧凑（受最小间距限制）：直接分配到不忙碌弹道，线性查找弹道，整体看着更紧凑 */
    Compact,
    /** 稀疏（受最小间距限制）：优先分配到完全空闲弹道，随机分配空闲弹道，整体看着更稀疏 */
    Sparse
}

/**
 * 弹幕组件类型
 * 1. 在线弹幕：实时发送的弹幕，如直播间弹幕，需要弹幕参数startTime毫秒时间戳
 * 2. 预设弹幕：预先设定好时间点发送的弹幕，如视频弹幕，需要弹幕参数delay延迟时间，单位秒
 */
export enum Type {
    online = 'online',
    preset = 'preset',
}

export type Config = {
    /** 弹幕速度 */
    speed: Speed,
    /** 弹幕显示区域高度相对容器百分比 */
    area: number,
    /** 弹幕行高，单位px */
    rowHeight: number,
    /** 弹幕最小间隔，单位px */
    minGap: number,
    /** 弹幕分配方式 */
    allocatedWay: AllocatedWay,
    /**
     * 弹幕组件类型
     * 1. 在线弹幕：实时发送的弹幕，如直播间弹幕，需要弹幕参数startTime毫秒时间戳
     * 2. 预设弹幕：预先设定好时间点发送的弹幕，如视频弹幕，需要弹幕参数delay延迟时间，单位秒
     */
    type: Type,
}