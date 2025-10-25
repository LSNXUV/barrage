import { AllocatedData, BarragesProps } from ".."
import { BarrageData, Config, Mode } from "../../type"
import { ItemRef } from "../Barrage"

/**
 * 弹幕分配算法
 * @param oldData 当前已存在的弹幕分配结果
 * @param newData 最新传入的弹幕数组
 * @param barrageRef 弹幕实例引用集合
 * @param container 弹幕容器节点
 * @param maxLanes 允许的最大弹道数量（可选）。超出后本轮不再分配，等待下轮。
 * @param mode 弹幕分配模式
 * @returns 更新后的分配结果
 */
export function allocate(
  oldData: AllocatedData[],
  newData: BarrageData[],
  barrageRef: Record<BarrageData['id'], ItemRef>,
  container: HTMLDivElement | null,
  maxLanes: number,
  config: Config
): AllocatedData[] {
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

  // 过滤出新增弹幕
  const toAdd: BarrageData[] = []
  for (let i = 0, len = newData.length; i < len; i++) {
    const item = newData[i];
    if (!existingIdRecord[item.id]) {
      toAdd.push(item);
    }
  }

  if (!toAdd.length) return oldData;
  /** 线性分配的空闲弹道索引 */
  const allocatedIndexes: number[] = users.length
    ? []
    // users.length 0代表一个弹幕也没有，全部弹道空闲，直接分配
    : Array.from({ length: toAdd.length }, (_, i) => i);

  /** 稀疏模式下，保存不忙碌弹道索引，等待最后完全空闲弹道不够时使用 */
  let notBusyIndexes: number[] = [];
  /** 分配索引，返回是否分配完毕 */
  const allocateIndex = (index: number) => (allocatedIndexes.push(index), allocatedIndexes.length === toAdd.length);
  /** 稀疏模式下，不忙碌弹道先保存起来，等待最后完全空闲弹道不够时再分配 */
  const freeDo = config.mode === Mode.Sparse
    ? (index: number) => (notBusyIndexes.push(index), false)
    : allocateIndex;
  for (let i = 0; i < maxLanes; i++) {
    const user = users[i];  // 当前弹道的最后一条弹幕
    if (!user) {
      // 前方无弹幕，则完全空闲，直接分配
      if (allocateIndex(i)) break;
    } else {
      if (
        barrageRef[user.id] &&
        !barrageRef[user.id]
          .isEnterContainer?.(
            container?.getBoundingClientRect().right || Number.MAX_SAFE_INTEGER
          )
      ) {
        // 前方弹幕未完全进入容器，则忙碌
      } else {
        // 前方弹幕已完全进入容器，则不忙碌
        if (freeDo(i)) break;
      }
    }
  }
  // 稀疏模式下，如果完全空闲弹道不够，则从不忙碌弹道中继续分配
  if (config.mode === Mode.Sparse && allocatedIndexes.length < toAdd.length) {
    for (let i = 0; i < notBusyIndexes.length; i++) {
      if (allocateIndex(notBusyIndexes[i])) break;
    }
  }

  // 无空闲弹道，直接返回旧数据，不渲染
  if (allocatedIndexes.length === 0 && maxLanes) {
    // console.log('no lanes!');
    return oldData;
  }

  // 分配新弹幕
  const reserved: boolean[] = [];
  const newAllocated = oldData.slice(); // 浅拷贝旧数据

  for (let i = 0, len = toAdd.length; i < len; i++) {
    const item = toAdd[i];

    let index = allocatedIndexes[i];
    if (index === undefined) {
      // 已超过弹道阈值，无可用弹道，停止分配
      // console.log('已超过限制！！', oldData.length, index, maxLanes);
      return newAllocated;
    }

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

  return newAllocated;
}
