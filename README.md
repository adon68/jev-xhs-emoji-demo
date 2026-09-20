# Jev × 小红书表情预判 Demo

用 TypeSafe **Jev Choice**，在「写想法」输入框里按**整句语义**自动插入小红书风格贴纸。

## 在线地址

部署完成后把 Vercel 链接写在本仓库 GitHub About → Website。

## 功能亮点

- 小红书「写想法」手机页（关闭 / 下一步 / 写长文）
- 停顿约 550ms 后按整句含义选贴纸（非关键词触发）
- 贴纸与文字齐平（约 `1.15em`，对齐参考稿）
- 生成中按回车**不会**删掉贴纸
- 底部显示防抖 / API 毫秒耗时
- **精灵图优化**：全部贴纸打包为 `sheet.png` + `atlas.json`，前端 CSS 按坐标动态切割

## 开发过程与思路

### 1. 语义判定，而不是词表匹配

前端把「当前句」发给 `/api/suggest-emoji`。服务端用 Jev：

- **Choice**：在贴纸名集合（含 `none`）里选最贴切的一个  
- **Noul**：这句是否说完、适不适合跟贴纸  

只有 accepted 时才插入。这样「今天坐飞机」可以对到「飞机」，而不是靠写死关键词。

### 2. 贴纸为什么偏大 → 改为相对字号

早期 `.xhs-sticker` 写死 `40px`，比 20px 正文字大一截。参考「加油」配贴纸的稿子后，改为：

```css
.xhs-sticker { height: 1.15em; width: 1.15em; vertical-align: -0.2em; }
```

随字号缩放，行高自然。

### 3. 图片体积与请求数 → 精灵图 + 动态切割

**问题**：61+ 张独立 PNG，首屏请求多。  

**方案**：

1. 构建时把 `public/xhs-small/*.png` 缩到 64×64，拼成一张 `public/sprites/sheet.png`  
2. 写出 `atlas.json`（每项的 name / x / y / w / h）  
3. 运行时插入 `<span class="xhs-sticker-sprite">`，用 `background-position` 按坐标切割  
4. `background-size` 按 `1.15em / cell` 换算，保证切割块仍与文字齐平  

单张 PNG 仍保留作 fallback，便于调试。

### 4. 扩展「飞机」等贴纸

原包没有飞机。构建脚本程序化绘制了「飞机 / 火箭 / 火」，写入 map，并补上 Choice 语义描述（travel / launch / hype）。输入「今天坐飞机去上海」即可测。

### 5. 回车不丢贴纸

请求发出时在句末打 marker；Enter 不再 abort 在途请求；插入用 snapshot；插入后不把贴纸选中，避免 Enter 替换选区。

## 本地运行

```bash
npm install
export TYPESAFE_API_KEY=你的_key   # 或在页面里粘贴保存
npm start
# http://127.0.0.1:8787
```

也可双击 `run-demo.command`（保持 Terminal 窗口不要关）。

## Vercel 部署

1. 用本仓库 Import 到 [Vercel](https://vercel.com)  
2. Environment Variable 增加：`TYPESAFE_API_KEY`  
3. Deploy  

CLI：

```bash
npx vercel login
npx vercel env add TYPESAFE_API_KEY
npx vercel --prod
```

`api/index.js` 导出 Express `server.js`；静态资源在 `public/`。

## 目录结构

```
api/index.js           Vercel serverless 入口
server.js              Express API + 本地静态服务
public/index.html      写想法 UI
public/xhs-small/      单贴纸 PNG + map.json
public/sprites/        sheet.png / sheet.webp / atlas.json
scripts/               构建与修复脚本
```

## License

MIT。贴纸素材仅供学习演示，商用请替换为自有授权素材。
