"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
var WsDataType;
(function (WsDataType) {
    WsDataType["WELCOME"] = "WELCOME";
    WsDataType["INITIAL"] = "INITIAL";
    WsDataType["NEW_BARRAGE"] = "NEW_BARRAGE";
    WsDataType["PING"] = "PING";
})(WsDataType || (WsDataType = {}));
;
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Hello from barrage-server (TypeScript + Express + WebSocket)');
});
const port = process.env.PORT ? Number(process.env.PORT) : 7701;
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server, path: '/ws/barrage' });
function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    });
}
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    // 发送一个欢迎消息和一些初始弹幕数据
    ws.send(JSON.stringify({ type: WsDataType.WELCOME, payload: { time: Date.now() } }));
    const initial = [];
    ws.send(JSON.stringify({ type: WsDataType.INITIAL, payload: initial }));
    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            if (msg.type === WsDataType.NEW_BARRAGE && msg.payload) {
                broadcast({ type: WsDataType.NEW_BARRAGE, payload: msg.payload });
            }
        }
        catch (e) {
            console.warn('Invalid WS message received', e);
        }
    });
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});
const randomBarrages = [
    '66666666',
    'tql',
    '逆天了兄弟',
    '？？？？？？？？？？？？',
    '哈哈哈哈哈哈哈',
    'ohhhhhhhhhhhhhhhhhhhhhhhh',
    '23333333333',
    '卧槽牛逼啊👍👍👍',
    '李时珍的皮啊兄弟🤣🤣',
    'no做nodie啊兄弟🤣🤣',
    '爸爸的雷达🤣🤣',
    '你是猴子派来的救兵吗🤣🤣',
    '你是魔鬼还是秀儿🤣🤣',
    '请输入文本🩼',
    '泪目😭😭😭😭😭😭',
    '鬼灭之刃你不竟然看！！！！',
    '惊天魔盗团3你不去看？？？',
    '内裤质量非常好，买了一车，孩子很喜欢吃'
];
const sendRandom = () => {
    const id = Date.now().toString();
    const content = randomBarrages[Math.floor(Math.random() * randomBarrages.length)];
    broadcast({ type: WsDataType.NEW_BARRAGE, payload: { id, content, startTime: Date.now() + Math.floor(Math.random() * 2000 - 1000) } });
};
// 测试随机弹幕，前5秒每200ms发送一次，之后每1秒发送一次
const intervalFast = setInterval(sendRandom, 200);
server.listen(port, () => {
    console.log(`barrage-server listening on http://localhost:${port}`);
});
exports.default = app;
