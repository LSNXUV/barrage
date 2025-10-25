'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './index.module.scss'
import { BarrageData, Config, Mode, Speed } from '../type'
import Barrage, { ItemRef } from './Barrage'
import { useResizer } from '@/hooks/useResize';
import { classNames } from '@/util/classNames';
import { allocate } from './util/allocate';

export interface BarragesProps extends React.HTMLAttributes<HTMLDivElement> {
    data: BarrageData[],
    /** 弹幕运动结束，离开时会调用 */
    leave: (id: BarrageData['id']) => void,
    /**
     * 弹幕配置项
     * @default 默认值
        speed: Speed.Fast,
        area: 100,
        rowHeight: 24,
        minGap: 20,
     */
    config?: Partial<Config>,
}

export type AllocatedData = (BarrageData & {
    index: number,
    speed?: Speed,
})

export default function Barrages({
    data, leave,
    config: originConfig = {},
    ...props
}: BarragesProps) {

    // 分配后的弹幕数据
    const [allocatedData, setAllocatedData] = useState<AllocatedData[]>([])

    /** 容器ref */
    const containerRef = useRef<HTMLDivElement>(null);
    /** 弹幕实例引用, 可获取弹幕状态 */
    const barrageRef = useRef<Record<BarrageData['id'], ItemRef>>({})
    /** 最大弹道数（由容器高度与配置计算） */
    const maxLanesRef = useRef<number>(1);

    /** 统一配置 */
    const config = useMemo<Required<Required<BarragesProps>['config']>>(() => ({
        speed: Speed.Fast,
        area: 100,
        rowHeight: 24,
        minGap: 32,
        mode: Mode.Sparse,
        ...originConfig,
    }), [originConfig]);

    /** 处理弹幕移动结束 */
    const handleLeave: BarragesProps['leave'] = useCallback((id) => {
        leave(id);
        delete barrageRef.current[id];
        setAllocatedData(acData => {
            return acData.filter(i => i.id !== id);
        });
    }, [leave]);

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

    // 分配弹道
    useEffect(() => {
        let frame: number | null = null;

        const update = () => {
            frame = null
            setAllocatedData((oldData) =>
                allocate(
                    oldData, data,
                    barrageRef.current, containerRef.current,
                    maxLanesRef.current, config
                )
            )
        }

        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(update);

        return () => {
            if (frame) cancelAnimationFrame(frame);
        }
    }, [data, config]);

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
                    leave={handleLeave}
                />
            ))}
        </div>
    )
}
