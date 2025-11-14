export interface BarrageData {
  id: string;
  content: string;
  startTime: number;
}

export enum WsDataType {
    WELCOME ='WELCOME',
    INITIAL ='INITIAL',
    NEW_BARRAGE = 'NEW_BARRAGE',
    PING = 'PING'    
};

export type WsData = {
  type: WsDataType;
  payload?: any;
};