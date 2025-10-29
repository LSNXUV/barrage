'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './index.module.scss'
import { BarrageData, Config, Speed } from './types'
import Barrage, { ItemRef } from './Barrage'
import { useResizer } from '@/hooks/useResize';
import { classNames } from '@/util/classNames';
import { allocate } from './lib/allocate';
import { DEFAULT_CONFIG } from './lib/constant';

export interface BarragesProps extends React.HTMLAttributes<HTMLDivElement> {
    /** 弹幕数据数组 */
    data: BarrageData[],
    /** 用于更新弹幕数据，一般用于移除已离开的弹幕 */
    setData: React.Dispatch<React.SetStateAction<BarrageData[]>>,
    /** 当弹幕数量过多，部分弹幕会被舍弃，则调用该函数，请在该函数中处理舍弃的弹幕，一般是从data中移除 */
    onDeserted: (desertedData: BarrageData[]) => void,
    /** 弹幕运动结束，离开时会调用 */
    onLeave: (id: BarrageData['id']) => void,
    /**
     * 弹幕配置项
     * @default 默认值
        speed: Speed.Normal,
        area: 50,
        rowHeight: 24,
        minGap: 50,
     */
    config?: Partial<Config>,
}

export type AllocatedData = (BarrageData & {
    index: number,
    speed?: Speed,
})

export default function Barrages({
    data,
    setData,
    onLeave,
    onDeserted,
    config: originConfig = {},
    ...props
}: BarragesProps) {

    // 分配后的弹幕数据
    const [allocatedData, setAllocatedData] = useState<AllocatedData[]>([])

    /** 实时data数据 */
    const dataRef = useRef<BarrageData[]>(data);

    /** 容器ref */
    const containerRef = useRef<HTMLDivElement>(null);
    /** 弹幕实例引用, 可获取弹幕状态 */
    const barrageRef = useRef<Record<BarrageData['id'], ItemRef>>({})
    /** 最大弹道数（由容器高度与配置计算） */
    const maxLanesRef = useRef<number>(1);

    /** 统一配置 */
    const config = useMemo<Required<Required<BarragesProps>['config']>>(() => ({
        ...DEFAULT_CONFIG,
        ...originConfig,
    }), [originConfig]);

    /** 处理弹幕移动结束 */
    const handleLeave: BarragesProps['onLeave'] = useCallback((id) => {
        onLeave(id);
        delete barrageRef.current[id];
        setData(prevData => prevData.filter(item => item.id !== id));
        setAllocatedData(acData => {
            return acData.filter(i => i.id !== id);
        });
    }, [onLeave]);

    /** 处理舍弃显示的弹幕 */
    const handleDeserted: BarragesProps['onDeserted'] = useCallback((desertedData) => {
        onDeserted(desertedData);
        // 清理引用
        const desertedRecord: Record<string, boolean> = {};
        desertedData.forEach(item => {
            delete barrageRef.current[item.id];
            desertedRecord[item.id] = true;
        });
        setData(prevData => prevData.filter(item => !desertedRecord[item.id]));
    }, [onDeserted]);

    // 监听容器宽度变化，设置容器宽度，便于计算弹幕移动距离
    useResizer<typeof containerRef.current>(
        containerRef,
        useCallback((rect) => {
            // 直接写入 CSS 变量，避免 setState 造成的额外渲染
            containerRef.current?.style.setProperty('--distance', `${rect.width}px`);
            // 计算最大弹道数
            const maxHeight = rect.height * (config.area / 100);
            const lanes = Math.max(1, Math.floor(maxHeight / (config.rowHeight || Number.MAX_SAFE_INTEGER)));
            maxLanesRef.current = lanes;
        }, [config.area, config.rowHeight])
    );

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // 分配弹道
    useEffect(() => {
        let frame: number | null = null;
        const update = () => {
            frame = null;
            let deserted: BarrageData[] = [];
            setAllocatedData(oldData => {
                const result = allocate(
                    oldData,
                    dataRef.current,
                    barrageRef.current,
                    containerRef.current,
                    maxLanesRef.current,
                    config,
                );
                deserted = result.deserted;
                return result.allocated;
            });
            if (deserted.length) {
                handleDeserted(deserted);
            }
        }

        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(update);

        return () => {
            if (frame) cancelAnimationFrame(frame);
        }
    }, [config, handleDeserted]);

    return (
        <div
            ref={containerRef}
            style={{
                ...(props.style || {}),
            }}
            className={classNames(styles.barrageContainer, props.className)}
        >
            {allocatedData.map((item) => (
                <Barrage
                    key={item.id}
                    data={item}
                    config={config}
                    barrageRef={barrageRef}
                    containerRef={containerRef}
                    onLeave={handleLeave}
                />
            ))}
        </div>
    )
}
