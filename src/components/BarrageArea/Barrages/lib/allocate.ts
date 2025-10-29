import { AllocatedData } from ".."
import { BarrageData, Config } from "../types"
import { ItemRef } from "../Barrage"
import { shuffle } from "./shuffle";

export interface AllocateResult {
  allocated: AllocatedData[];
  deserted: BarrageData[];
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
export function allocate(
  oldData: AllocatedData[],
  newData: BarrageData[],
  barrageRef: Record<BarrageData['id'], ItemRef>,
  container: HTMLDivElement | null,
  maxLanes: number,
  config: Config,
): AllocateResult {
  /** 已存在的弹幕 ID */
  const existingIdRecord = Object.create(null) as Record<BarrageData['id'], boolean>;
  /** 当前弹道对应的最后一条弹幕 */
  const users: (AllocatedData | undefined)[] = [];
  const desertedItems: BarrageData[] = [];

  // 初始化现有弹幕状态
  for (let i = 0, len = oldData.length; i < len; i++) {
    const item = oldData[i];
    existingIdRecord[item.id] = true;
    users[item.index] = item;
  }

  /** 新增的弹幕 */
  let toAdd: BarrageData[] = [];
  for (let i = 0, len = newData.length; i < len; i++) {
    const item = newData[i];
    if (!existingIdRecord[item.id]) {
      toAdd.push(item);
    }
  }

  if (!toAdd.length) return { allocated: oldData, deserted: desertedItems };

  /** 分配的空闲弹道索引 */
  const allocatedIndexes: number[] = users.length
    ? []
    : Array.from({ length: toAdd.length }, (_, i) => i);  // 全部弹道空闲，直接分配

  // 最多遍历最大弹道数次；稀疏分配下，随机起始查找，使得分配更均匀；紧凑则是从头开始遍历
  for (
    let rd =
      // config.allocatedWay === AllocatedWay.Sparse ? Math.floor(Math.random() * maxLanes) :
      0, index = rd;
    index < maxLanes + rd;
    index++
  ) {
    const i = rd ? index % maxLanes : index;
    const user = users[i];  // 当前弹道的最后一条弹幕
    if (
      user &&
      barrageRef[user.id] &&
      !barrageRef[user.id]
        .isEnterContainer?.(
          container?.getBoundingClientRect().right || Number.MAX_SAFE_INTEGER
        )
    ) {
      // 前方弹幕未完全进入容器，则忙碌
    } else {
      // 前方弹幕已完全进入容器，则不忙碌
      allocatedIndexes.push(i);
      if (allocatedIndexes.length === toAdd.length) {
        break; // 分配完毕，退出
      }
    }
  }

  // 无空闲弹道，直接返回旧数据，不渲染
  if (allocatedIndexes.length === 0 && maxLanes) {
    console.log('无可用弹道，本次未分配：', toAdd.length);
    return { allocated: oldData, deserted: desertedItems };
  }

  // 分配新弹幕
  const reserved: boolean[] = [];
  const newAllocated = oldData.slice(); // 浅拷贝旧数据

  // 若可分配数量少于待分配数量，说明弹幕显示数量已经逐渐开始受限，则优先分配更接近当前时间的弹幕
  if (allocatedIndexes.length < toAdd.length) {
    if (toAdd.length > 1) {
      const now = Date.now();
      toAdd.sort((a, b) => Math.abs(a.startTime - now) - Math.abs(b.startTime - now));
      const desertedData: BarrageData[] = [];
      for (let idx = toAdd.length - 1; idx >= 0; idx--) {
        const item = toAdd[idx];
        if (item.startTime - now <= -config.speed * 1000 + 3000) {
          desertedData.push(item);
        } else {
          break;
        }
      }
      if (desertedData.length) {
        desertedItems.push(...desertedData);
      }
    }
  }
  // 逐个分配弹道
  for (let i = 0, len = toAdd.length; i < len; i++) {

    // 已超过可分配的数量，无可用弹道，停止分配
    if (i >= allocatedIndexes.length) {
      console.log('可用弹道不够，剩余未分配：', len - i);
      // 若一条都未分配，返回旧数据；否则返回已分配结果
      return {
        allocated: i === 0 ? oldData : newAllocated,
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
    existingIdRecord[item.id] = true;
    users[index] = allocatedItem;
    index++;
  }

  return {
    allocated: newAllocated,
    deserted: desertedItems,
  };
}
