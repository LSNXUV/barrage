'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import styles from './index.module.scss'
import { BarrageData } from './Barrages/types'
import Barrages, { BarragesProps } from './Barrages';
import { WsDataType } from './type';

const randomUserName = Math.random().toString(36).slice(-6);

export default function Barrage() {
    const [data, setData] = useState<BarrageData[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const [input, setInput] = useState('');
    const [pause, setPause] = useState(false);

    const onLeave: BarragesProps['onLeave'] = useCallback((id) => {
        // console.log('弹幕离开:', id);
    }, []);

    const onDeserted: BarragesProps['onDeserted'] = useCallback((desertedData) => {
        console.log('弹幕数量过多，已舍弃弹幕:', desertedData);
    }, []);

    // ws发送弹幕
    const handleSend = useCallback(() => {
        const content = input.trim();
        if (!content) return;
        const newBarrage: BarrageData = { id: Date.now().toString(), content, startTime: Date.now(), userName: randomUserName };
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: WsDataType.NEW_BARRAGE, payload: newBarrage }));
        }
        setInput('');
    }, [input]);

    useEffect(() => {
        // 连接 WebSocket 服务器
        const url = window.location.hostname === 'localhost'
            ? 'ws://localhost:7701/ws/barrage'
            : `${window.location.protocol.replace('http', 'ws')}//${window.location.host}/ws/barrage`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.addEventListener('open', () => {
            console.log('WebSocket opened', url);
            try { ws.send(JSON.stringify({ type: WsDataType.PING })); } catch (e) { }
        });

        ws.addEventListener('message', (ev) => {
            try {
                const msg = JSON.parse(ev.data) as {
                    type: WsDataType;
                    payload: BarrageData;
                };
                if (msg.type === WsDataType.INITIAL && Array.isArray(msg.payload)) {
                    setData(msg.payload);
                } else if (msg.type === WsDataType.NEW_BARRAGE && msg.payload) {
                    // setData(d => [...d, msg.payload]);
                    setData(d => [msg.payload]);
                } else {
                    console.log('unknown msg type', msg.type);
                }
            } catch (e) {
                console.warn('Invalid WS message', e);
            }
        });

        ws.addEventListener('close', () => {
            console.log('WebSocket closed');
            wsRef.current = null;
            setTimeout(() => {
                if (!wsRef.current) {
                    const newWs = new WebSocket(url);
                    wsRef.current = newWs;
                }
            }, 2000);
        });

        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, []);

    return (
        <div className={styles.container}>
            <Barrages
                className={styles.barrageContainer}
                data={data}
                userName={randomUserName}
                setData={setData}
                onLeave={onLeave}
                onDeserted={onDeserted}
                pause={pause}
            />
            <div className={styles.inputContainer}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    type="text"
                    placeholder="来发表你的想法吧...Enter发送"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleSend();
                        }
                    }}
                />
                <button onClick={() => {
                    setPause(p => !p)
                }}>{pause ? '继续' : '暂停'}</button>
            </div>
        </div>
    )
}
