import { AllocatedWay, Config, Speed, Type } from "../types";

/** 弹幕默认配置 */
export const DEFAULT_CONFIG: Config = {
    speed: Speed.Faster,
    area: 50,
    rowHeight: 24,
    minGap: 50,
    allocatedWay: AllocatedWay.Sparse,
    type: Type.online,
};
