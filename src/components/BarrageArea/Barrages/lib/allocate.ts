import { AllocatedData } from ".."
import { AllocatedWay, BarrageData, Config } from "../types"
import { ItemRef } from "../Barrage"
import { hashString } from "./hash";
import { MIN_DURATION } from "./constant";
import { shuffle } from "./shuffle";

export interface AllocateResult {
  /** 已分配弹幕数据 */
  allocated: AllocatedData[];
  /** 因弹道空闲不够，部分未分配的弹幕 */
  unAllocated?: BarrageData[];
  /** 是否全部弹道繁忙？ */
  isAllBusy?: boolean;
  /** 被舍弃的弹幕 */
  deserted?: BarrageData[];
}

/**
 * 弹幕分配算法
 * @param oldData 当前已存在的弹幕分配结果
 * @param newData 最新传入的弹幕数组
 * @param barrageRef 弹幕实例引用集合
 * @param container 弹幕容器节点
 * @param maxLanes 允许的最大弹道数量（可选）。超出后本轮不再分配，等待下轮。
 * @param config 弹幕配置项
 * @returns 更新后的分配结果
 */
export function allocate({
  oldData,
  newData,
  barrageRef,
  container,
  maxLanes,
  config
}: {
  /** 已分配的弹幕数据 */
  oldData: AllocatedData[],
  /** 待分配的弹幕数据，自动id去重 */
  newData: BarrageData[],
  /** 弹幕实例引用集合 */
  barrageRef: Record<BarrageData['id'], ItemRef>,
  /** 弹幕容器节点 */
  container: DOMRect | null,
  /** 允许的最大弹道数量 */
  maxLanes: number,
  /** 弹幕配置项 */
  config: Config,
}): AllocateResult {
  /** 已存在的弹幕 ID */
  const existingIdRecord = Object.create(null) as Record<BarrageData['id'], boolean>;
  /** 当前弹道对应的最后一条弹幕 */
  const users: (AllocatedData | undefined)[] = [];

  // 初始化现有弹幕状态
  for (let i = 0, len = oldData.length; i < len; i++) {
    const item = oldData[i];
    existingIdRecord[item.id] = true;
    users[item.index] = item;
  }

  /** 新增的弹幕 */
  const toAdd: BarrageData[] = [];
  /** 保存id方便去重 */
  const toAddExistId = Object.create(null) as Record<BarrageData['id'], boolean>;
  for (let i = 0, len = newData.length; i < len; i++) {
    const item = newData[i];
    if (!existingIdRecord[item.id] && !toAddExistId[item.id]) {
      toAdd.push(item);
      toAddExistId[item.id] = true;
    }
  }

  if (!toAdd.length) {
    // console.log('无新增弹幕');
    return { allocated: oldData };
  };

  /** 分配的空闲弹道索引 */
  const allocatedIndexes: number[] =
    users.length !== 0
      ? []  // 部分弹道已被分配，需要重新查找
      // 全部弹道空闲，直接分配
      : Array.from({ length: Math.min(maxLanes, toAdd.length) }, (_, i) => i);
  if (config.allocatedWay === AllocatedWay.Sparse && allocatedIndexes.length > 1) {
    // 稀疏分配下，随机打乱弹道顺序
    shuffle(allocatedIndexes);  
  };
  // 稀疏分配下，随机起始查找，使得分配更均匀；紧凑则是从头开始遍历
  const randomStart = (config.allocatedWay === AllocatedWay.Sparse && toAdd.length && maxLanes)
    // 为了保持幂等性，不能使用 Math.random() 作为起始索引，而是基于待分配弹幕的稳定信息生成一个确定性偏移。
    // 避免因为React Strict Mode（开发模式下可能会多次执行）闪烁或不一致。
    ? hashString(toAdd.map(i => String(i.id)).join('|')) % maxLanes
    : 0;
  for (
    let index = randomStart;
    // 最多遍历最大弹道数次；
    index < maxLanes + randomStart;
    index++
  ) {
    const i = randomStart ? index % maxLanes : index;  // 准确的索引
    const user = users[i];  // 当前弹道的最后一条弹幕
    if (
      user &&
      barrageRef[user.id] &&
      !barrageRef[user.id]
        .isEnterContainer?.(
          container?.right || Number.MAX_SAFE_INTEGER
        )
    ) {
      // 前方弹幕未完全进入容器，则忙碌
    } else {
      // 前方弹幕已完全进入容器，则不忙碌
      allocatedIndexes.push(i);
      if (allocatedIndexes.length === toAdd.length) {
        // 分配完毕，退出
        break;
      }
    }
  }

  // 无空闲弹道，直接返回旧数据，不渲染
  if (allocatedIndexes.length === 0) {
    // console.log('无可用弹道，本次未分配：', toAdd.length);
    return { allocated: oldData, isAllBusy: true };
  }

  /** 记录本次弹道分配情况 */
  const reserved: boolean[] = [];
  const newAllocated = oldData.slice(); // 浅拷贝旧已分配数据
  /** 舍弃的弹幕 */
  const desertedItems: BarrageData[] = [];

  // 若可分配数量少于待分配数量，说明弹幕显示已经逐渐开始受限，弹道不足以支撑过多的弹幕。
  // 则需要排序，然后优先分配更接近当前时间的弹幕，
  // 由于优先分配时间更近的，时间一长起来，可能就会逐渐导致一些弹幕始终得不到分配（也就超时了）。
  // 最后直接舍弃这些超时的弹幕
  if (allocatedIndexes.length < toAdd.length) {
    if (toAdd.length > 1) {
      const now = Date.now();
      toAdd.sort((a, b) => Math.abs(a.startTime - now) - Math.abs(b.startTime - now));
      for (let idx = toAdd.length - 1; idx >= 0; idx--) {
        const item = toAdd[idx];
        if (item.startTime - now <= -config.speed * 1000 + MIN_DURATION) {
          desertedItems.push(item);
          toAdd.pop();
        } else {
          break;
        }
      }
    }
  }
  // 逐个分配弹道
  for (let i = 0, len = toAdd.length; i < len; i++) {

    // 已超过可分配的数量，无可用弹道，停止分配
    if (i >= allocatedIndexes.length) {
      // console.log('可用弹道不够，剩余未分配：', len - i);
      // 若一条都未分配，返回旧数据；否则返回已分配结果
      return {
        allocated: newAllocated,
        unAllocated: toAdd.slice(i),
        deserted: desertedItems,
      };
    };

    let index = allocatedIndexes[i];
    if (reserved[index]) {
      continue; // 已被占用，跳过
    }

    const item = toAdd[i];

    // 保存前一个弹幕元素的引用，便于弹幕挂载时计算间距调整延迟时间
    barrageRef[item.id] = {
      ...(barrageRef[item.id] || {}),
      frontElement: barrageRef[users[index]?.id || '']?.getElement?.(),
    }

    const allocatedItem: AllocatedData = { ...item, index };
    newAllocated.push(allocatedItem);
    reserved[index] = true;
    users[index] = allocatedItem;
    index++;
  }

  return {
    allocated: newAllocated,
    deserted: desertedItems,
  };
}
