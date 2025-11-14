import { BarrageData } from "./Barrages/types";

export enum WsDataType {
    INITIAL = 'INITIAL',
    NEW_BARRAGE = 'NEW_BARRAGE',
    WELCOME = 'WELCOME',
    PING = 'PING',
}

export type WsData = {
    type: WsDataType;
    payload: BarrageData[];
};