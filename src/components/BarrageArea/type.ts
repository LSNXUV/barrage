import { BarrageData } from "./Barrages/types";

export enum WsDataType {
    INITIAL = 'initial',
    NEW_BARRAGE = 'new_barrage',
    WELCOME = 'welcome',
    PING = 'ping',
}

export type WsData = {
    type: WsDataType;
    payload: BarrageData[];
};