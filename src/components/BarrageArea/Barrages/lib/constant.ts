import { AllocatedWay, Config, Speed, Type } from "../types";

/** 弹幕默认配置 */
export const DEFAULT_CONFIG: Config = {
    speed: Speed.Normal,
    area: 50,
    rowHeight: 24,
    minGap: 50,
    allocatedWay: AllocatedWay.Sparse,
    frameInterval: 10,
    type: Type.online,
};

/** 弹幕最短展示时间，如果弹幕展示时间少于该值，则直接移除 */
export const MIN_DURATION = 3000;
