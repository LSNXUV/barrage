## 弹幕组件

该组件用于展示弹幕效果，支持自定义配置和动态数据更新。

### 使用方法

1. 引入组件

```tsx
import Barrages from './components/BarrageArea/Barrages';
```

2. 使用组件

```tsx
<Barrages
    data={data}
    leave={handleLeave}
    config={config}
/>
```

### 组件属性

- `data`: BarrageData，弹幕数据数组，包含每条弹幕的内容、开始时间等信息。
- `leave`: 弹幕离开时的回调函数。
- `config`: 弹幕配置项，支持自定义速度、区域、行高等属性。

```tsx
interface BarrageData {
	id: string;
	content: string;
	startTime: number;	// 弹幕开始时间，时间戳，单位毫秒
}
```

### 事件处理

- `leave`: 当弹幕离开视口时触发，参数为弹幕的 ID。

```tsx
const handleLeave = (id: string) => {
    console.log(`弹幕 ${id} 离开视口`);
	// 需要从data中移除该弹幕
    removeBarrageById(id);
};
```
### 配置选项

```tsx
/** 默认配置 */
const config = {
    speed: Speed.Fast,
    area: 100,
    rowHeight: 24,
    minGap: 32,
    mode: Mode.Sparse,
};
```
- `speed`: 弹幕速度，支持 `Speed.Slow`、`Speed.Normal`、`Speed.Fast`。
- `area`: 弹幕显示区域的百分比。
- `rowHeight`: 每行弹幕的高度。
- `minGap`: 弹幕之间的最小间隔。
- `mode`: 弹幕分配模式，支持稀疏模式 `Mode.Sparse` 和 紧凑模式 `Mode.Compact`。