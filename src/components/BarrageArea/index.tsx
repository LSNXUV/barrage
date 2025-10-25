'use client'
import React, { useCallback, useEffect, useState } from 'react'
import styles from './index.module.scss'
import { BarrageData } from './type'
import Barrages, { BarragesProps } from './Barrages';

export default function Barrage() {
    const [data, setData] = useState<BarrageData[]>([
        { id: '1', content: 'Hello World! This is a barrage message.', startTime: Date.now() + 1000 },
        { id: '2', content: 'Another message appears!', startTime: Date.now() + 2000 },
        { id: '3', content: 'React is awesome!', startTime: Date.now() + 3000 },
    ]);

    const leave: BarragesProps['leave'] = useCallback((id) => {
        setData(prevData => prevData.filter(item => item.id !== id));
    }, []);

    useEffect(() => {
        // return;
        // 每隔一秒随机添加一条弹幕
        let id = 3;
        const interval = setInterval(() => {
            setData(prevData => {
                const newId = ++id;
                if (prevData.find(item => item.id === newId.toString())) return prevData;
                // console.log('add data:', prevData.length + 1);
                return [
                    ...prevData,
                    {
                        id: newId.toString(),
                        content: `Message ${newId} ${Array(Math.floor(Math.random() * 10) + 1).fill('len!').join('')}`,
                        startTime: Date.now() - Math.floor(Math.random() * 2000 - 1000), // 允许startTime为过去的时间
                    }
                ];
            });
        }, 200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={styles.container}>
            <Barrages
                className={styles.barrageContainer}
                data={data}
                leave={leave}
            />
            <div className={styles.inputContainer}>
                <input type="text" placeholder="来发表你的想法吧..." />
                <button onClick={() => { }}>发送</button>
            </div>
        </div>
    )
}
