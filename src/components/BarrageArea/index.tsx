'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import styles from './index.module.scss'
import { BarrageData } from './Barrages/types'
import Barrages, { BarragesProps } from './Barrages';
import { WsDataType } from './type';

export default function Barrage() {
    const [data, setData] = useState<BarrageData[]>([
        { id: '1', content: 'Hello World! This is a barrage message.', startTime: Date.now() + 1000 },
        { id: '2', content: 'Another message appears!', startTime: Date.now() + 2000 },
        { id: '3', content: 'React is awesome!', startTime: Date.now() + 3000 },
    ]);
    const wsRef = useRef<WebSocket | null>(null);
    const [input, setInput] = useState('');

    const onLeave: BarragesProps['onLeave'] = useCallback((id) => {
        console.log('弹幕离开:', id);
    }, []);

    const onDeserted: BarragesProps['onDeserted'] = useCallback((desertedData) => {
        console.log('弹幕数量过多，已舍弃弹幕:', desertedData);
    }, []);

    // ws发送弹幕
    const handleSend = useCallback(() => {
        const content = input.trim();
        if (!content) return;
        const newBarrage: BarrageData = { id: Date.now().toString(), content, startTime: Date.now() };
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
                const msg = JSON.parse(ev.data);
                if (msg.type === WsDataType.INITIAL && Array.isArray(msg.payload)) {
                    setData(prev => {
                        // merge while avoiding duplicates
                        const existIds = new Set(prev.map(p => p.id));
                        const merged = [...prev];
                        for (const item of msg.payload) {
                            if (!existIds.has(item.id)) merged.push(item);
                        }
                        return merged;
                    });
                } else if (msg.type === WsDataType.NEW_BARRAGE && msg.payload) {
                    setData(prev => {
                        if (prev.find(p => p.id === msg.payload.id)) return prev;
                        return [...prev, msg.payload];
                    });
                }
            } catch (e) {
                console.warn('Invalid WS message', e);
            }
        });

        ws.addEventListener('close', () => {
            console.log('WebSocket closed');
            wsRef.current = null;
            // simple reconnect after a delay
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
                setData={setData}
                onLeave={onLeave}
                onDeserted={onDeserted}
            />
            <div className={styles.inputContainer}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    type="text"
                    placeholder="来发表你的想法吧..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleSend();
                        }
                    }}
                />
                <button onClick={() => {
                    handleSend();
                }}>发送</button>
            </div>
        </div>
    )
}
