import React, { memo, useEffect, useRef, useState } from 'react'
import styles from './index.module.scss'
import { Speed } from '../types'
import { classNames } from '@/util/classNames';
import { AllocatedData, BarragesProps } from '..';

export type ItemRef = {
  /** 当前弹幕行的前一个弹幕元素 */
  frontElement?: HTMLDivElement | null,
  /** 获取当前弹幕元素 */
  getElement: () => HTMLDivElement | null,
  /** 使用预计算的 containerRight 判断是否完全进入容器（避免重复读取容器 rect） */
  isEnterContainer: (containerRight: number) => boolean,
};

export default memo(function Barrage({
  barrageRef,
  containerRef,
  onLeave,
  data: { id, content, startTime, index },
  config: { speed: duration, rowHeight, minGap },
}: {
  data: AllocatedData,
  /** 容器ref */
  containerRef: React.RefObject<HTMLDivElement | null>,
  barrageRef: React.RefObject<Record<string, ItemRef>>,
  onLeave?: BarragesProps['onLeave'],
  config: Required<Required<BarragesProps>['config']>,
}) {

  const [start, setStart] = useState(false);  // 开始信号
  const [delay, setDelay] = useState(0);

  const currentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentRef.current) return;
    // 计算当前弹幕开始的延迟时间,可为负值
    let delay = startTime - Date.now();
    // 如果提前的延迟时间小于等于 弹幕持续时间 + 容错时间，说明弹幕很接近结束了，直接移除
    if( delay <= -duration * 1000 + 3000 ) {
      console.log('负延迟时间过大，直接移除弹幕：', delay, content);
      onLeave?.(id);
      return;
    }
    /** 前一个弹幕的rect信息 */
    const frontRect = barrageRef.current[id]?.frontElement?.getBoundingClientRect();
    // 调整延迟，确保不会与前一个弹幕重叠
    if (frontRect) {
      const container = containerRef.current?.getBoundingClientRect();
      if (!container) return;
      // 前一个弹幕离开容器时间
      const frontArrivalTime = (frontRect.right - container.left) / (frontRect.width + container.width) * duration * 1000;
      /** 当前弹幕移动的总路程, 需加上最小弹幕间距minGap */
      const currentDistance = currentRef.current.getBoundingClientRect().width + container.width + minGap;
      const currentMsSpeed = currentDistance / (duration * 1000);
      // 当前弹幕开始到达容器左侧时间，需减去最小弹幕间距minGap移动的时间
      const thisArrivalTime = delay + container.width / currentMsSpeed;
      // 如果当前弹幕到达时间早于前一个弹幕离开时间，则需要补上差的时间
      if (thisArrivalTime < frontArrivalTime) {
        delay += frontArrivalTime - thisArrivalTime;
      }
      // 前面只是计算前一条弹幕离开容器时，最终不交错的延迟时间，但没考虑到，负值delay的最开始出现时是否交错
      if (delay < 0) {
        // 计算当前弹幕出现在容器右侧时，前一条弹幕的位置，判断是否交错，如果交错则需要再调整delay
        const startPosition = container.right - (-delay) * currentMsSpeed;
        /** 交错距离 */
        const diff = frontRect.right - startPosition;
        if (diff > 0) {
          // 加上回退到不交错所需的时间（交错距离 / 当前弹幕速度）
          delay += diff / currentMsSpeed;
        }
      }
    }
    // 比较小的负值delay，视为无延迟立即开始
    if (delay < 0 && delay > -500) {
      delay = 0;
    }
    setStart(true);
    setDelay(delay);
  }, [startTime, id, duration, minGap, onLeave]);

  // 设置实例引用
  useEffect(() => {
    if (!currentRef.current) return;
    barrageRef.current[id] = {
      ...(barrageRef.current[id] || {}),
      getElement() {
        return currentRef.current;
      },
      isEnterContainer(containerRight: number) {
        if (!currentRef.current) return false;
        return currentRef.current.getBoundingClientRect().right < containerRight;
      }
    };
  }, [id]);

  useEffect(() => {
    if (!currentRef.current) return;
    currentRef.current.style.setProperty('--duration', `${duration}s`);
    currentRef.current.style.setProperty('--delay', `${delay}ms`);
    currentRef.current.style.setProperty('--height', `${rowHeight}px`);
    currentRef.current.style.top = `${index * rowHeight}px`;
  }, [duration, delay, rowHeight, index]);

  return (
    <div
      ref={currentRef}
      className={
        classNames(
          styles.container,
          start && styles.start,
          delay < 0 && styles.restock,
        )
      }
      onAnimationEnd={(e) => {
        if (e.animationName.includes('move-to-left')) {
          onLeave?.(id);
        }
      }}
    >
      <span className={styles.content}>{content}</span>
    </div>
  )
})
