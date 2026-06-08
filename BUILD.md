# 打包为可执行文件

## 方式一：脚本启动器（已内置，推荐 mClaw）

```bash
chmod +x qijingchun-skill/wenxin
./qijingchun-skill/wenxin "请教齐先生：你好"
./qijingchun-skill/wenxin --xiang shenwen "析理：..."
./qijingchun-skill/wenxin --yuejuan
```

Windows:

```bat
wenxin.bat "请教齐先生：你好"
```

mClaw 话术可改为：

```
执行 qijingchun-skill/wenxin "问心内容"
```

## 方式二：pkg 打包单文件 exe（仅本机 Windows）

需 Node.js 和 pkg：

```powershell
npm install -g pkg
cd qijingchun-skill
pkg wenxin.mjs --targets node18-linux-x64,node18-win-x64 --output wenxin-bin
```

产出：
- `wenxin-bin-win.exe` — Windows 本机用
- `wenxin-bin-linux` — Linux 服务器用

注意：auth.txt 仍在工作区根目录，不打进 exe。

## 方式三：mClaw cron 定时执行

```
每天 8 点执行：qijingchun-skill/wenxin "今日科技要闻摘要" → 结果发微信
```
