'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './index.module.scss'
import { BarrageData, Config, Speed } from './types'
import Barrage, { ItemRef } from './Barrage';
import { useResizer } from './hooks/useResize';
import { classNames } from './lib/classNames';
import { allocate } from './lib/allocate';
import { DEFAULT_CONFIG } from './lib/constant';

export interface BarragesProps extends React.HTMLAttributes<HTMLDivElement> {
    /** 
     * 弹幕数据数组
     * 1. 可只传入新增的弹幕
     * 2. 也可以传入全部弹幕（会自动去重），内部会通过setData移除掉已经展示完的弹幕
    */
    data: BarrageData[],
    /** 用于更新弹幕数据，一般用于移除已离开的弹幕 */
    setData: React.Dispatch<React.SetStateAction<BarrageData[]>>,
    /** 当弹幕数量过多，部分弹幕会被舍弃，则调用该函数，请在该函数中处理舍弃的弹幕，一般是从data中移除 */
    onDeserted: (desertedData: BarrageData[]) => void,
    /** 弹幕运动结束，离开时会调用 */
    onLeave: (id: BarrageData['id']) => void,
    /** 弹幕配置项 */
    config?: Partial<Config>,
    /** 暂停播放弹幕 */
    pause?: boolean,
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
    config: userConfig,
    pause = false,
    ...props
}: BarragesProps) {

    // 分配后的弹幕数据
    const [allocatedData, setAllocatedData] = useState<{
        /** 已分配弹道的弹幕 */
        data: AllocatedData[];
        /** 因弹道繁忙而尚未分配/等待分配的弹幕 */
        unAllocatedData: BarrageData[];
    }>({
        data: [],
        unAllocatedData: [],
    })

    /** 暂停状态 */
    const pauseRef = useRef(pause);

    /** 容器ref */
    const containerRef = useRef<HTMLDivElement>(null);
    /** 容器最新rect对象 */
    const containerRectRef = useRef<DOMRect | null>(null);
    /** 弹幕实例引用, 可获取弹幕状态 */
    const barrageRef = useRef<Record<BarrageData['id'], ItemRef>>({})
    /** 最大弹道数（由容器高度与配置计算） */
    const maxLanesRef = useRef<number>(1);

    /** 统一配置 */
    const config = useMemo<Required<Required<BarragesProps>['config']>>(() => ({
        ...DEFAULT_CONFIG,
        ...(userConfig || {}),
    }), [userConfig]);

    /** 处理弹幕移动结束 */
    const handleLeave: BarragesProps['onLeave'] = useCallback((id) => {
        onLeave(id);
        delete barrageRef.current[id];
        setData(prevData => prevData.filter(item => item.id !== id));
        setAllocatedData(acData => {
            return {
                ...acData,
                data: acData.data.filter(i => i.id !== id),
            }
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
            // 保存rect对象
            containerRectRef.current = rect;
            // 直接写入 CSS 变量，避免 setState 造成的额外渲染
            containerRef.current?.style.setProperty('--distance', `${rect.width}px`);
            // 计算最大弹道数
            const maxHeight = rect.height * (config.area / 100);
            maxLanesRef.current = Math.max(1, Math.floor(maxHeight / (config.rowHeight || Number.MAX_SAFE_INTEGER)));
        }, [config.area, config.rowHeight])
    );

    useEffect(() => {
        pauseRef.current = pause;
    }, [pause]);

    // 分配弹道
    useEffect(() => {
        let rafId: number | null = null;
        let frameCount = 0;
        const update = (loop: boolean = false) => {
            // 弹道繁忙时，每隔frameInterval帧尝试分配，快速查找最新弹道
            if (loop && ++frameCount % config.frameInterval !== 0) {
                rafId = requestAnimationFrame(() => update(true));
                return;
            }

            /** 此时是否所有弹道繁忙？ */
            let isAllBusy = false;
            let deserted: BarrageData[] | undefined;
            setAllocatedData((prev) => {
                // 合并未分配数据，allocate函数内部已自动去重
                prev.unAllocatedData.push(...data);
                const result = allocate({
                    config,
                    oldData: prev.data,
                    newData: prev.unAllocatedData,
                    barrageRef: barrageRef.current,
                    container: containerRectRef.current,
                    maxLanes: maxLanesRef.current,
                });
                deserted = result.deserted;
                isAllBusy = !!result.isAllBusy;
                // 引用不同，代表有弹幕被分配
                if (result.allocated !== prev.data) {
                    if (result.unAllocated?.length) {
                        // 因为空闲不够，有部分未分配数据
                        prev.unAllocatedData = result.unAllocated;
                    } else {
                        // 全部都已分配，清空unAllocatedData
                        prev.unAllocatedData.length = 0;
                    }
                    return {
                        data: result.allocated,
                        unAllocatedData: prev.unAllocatedData,
                    };
                } else {
                    // 一条都没分配，则全部合并到newUnAllocatedData
                    return prev;
                }
            });

            if (deserted?.length) {
                handleDeserted(deserted);
            }

            // 如果所有弹道都繁忙，启动循环帧更新
            if (isAllBusy) {
                rafId = requestAnimationFrame(() => update(true));
            } else {
                rafId = null;
            }
        }

        // 未暂停时，启动更新
        if (!pauseRef.current) {
            rafId = requestAnimationFrame(() => update());
        }

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
        }
    }, [
        config, data, handleDeserted,
        // pause变化时，自动取消帧操作，释放内存
        pause
    ]);

    return (
        <div
            {...props}
            ref={containerRef}
            className={classNames(styles.barrageContainer, props.className)}
        >
            {allocatedData.data.map((item) => (
                <Barrage
                    key={item.id}
                    data={item}
                    pause={pause}
                    config={config}
                    barrageRef={barrageRef}
                    containerRef={containerRectRef}
                    onLeave={handleLeave}
                />
            ))}
        </div>
    )
}
