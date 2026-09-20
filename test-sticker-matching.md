# 表情贴纸匹配验证

## 修复的问题

### 1. choiceToSticker 映射错误
- **错误**: `'🔥':'哇'` - fire emoji 映射到了 "哇"（惊讶）
- **修复**: `'🔥':'火'` - 正确映射到 "火"（trending/hype energy）
- **新增**: 
  - `'🚀':'火箭'` - rocket emoji 映射
  - `'✈️':'飞机'`, `'🛫':'飞机'`, `'🛬':'飞机'` - 飞机相关emoji映射

## 关键场景测试

### 应该匹配 "火" 贴纸的短语：
- "这个视频火了"
- "最近很火的那个"
- "超火的产品"

### 应该匹配 "火箭" 贴纸的短语：
- "销量火箭般上升"
- "增长速度跟火箭一样"

### 应该匹配 "飞机" 贴纸的短语：
- "今天坐飞机去上海"
- "明天要坐飞机"
- "在飞机上看日出"

### 应该匹配 "心心眼" 贴纸的短语：
- "我很有爱心" (criteria: "Heart eyes loving something a lot")
- "超级爱这个"
- "好喜欢呀"

### 应该匹配 "微笑" 贴纸的短语：
- "今天天气不错"
- "挺好的"

## 验证要点

1. **文件完整性**: ✅ 所有 64 个贴纸文件都存在于 `public/xhs-small/`
2. **map.json 一致性**: ✅ `EMOJI_CRITERIA` 的所有 key 都在 `map.json` 中有对应项
3. **atlas.json 一致性**: ✅ sprite atlas 包含所有 64 个贴纸的坐标
4. **语义映射**: ✅ Unicode emoji fallback 映射已修复

## 需要注意的点

- API 返回的 `choice` 应该是直接的贴纸名称（如 "火箭"），不是 Unicode emoji
- `choiceToSticker` 仅作为 fallback，处理某些边缘情况
- 贴纸尺寸: `1.15em`，与文字对齐
- sprite 切割基于 atlas.json 中的 x/y 坐标
