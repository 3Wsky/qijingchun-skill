# 齐静春.skill 安装指南

## 1. 安装

```
安装 skill：https://github.com/YOUR_USER/qijingchun-skill
```

或克隆至工作区：

```
/home/node/.openclaw/workspace/qijingchun-skill/
```

## 2. 文心帖

在工作区根目录创建 `auth.txt`：
- 单行
- 无末尾换行（约 51 字节）
- 不可用聊天明文发送（平台审查），可用编码分条投递

## 3. 验证

```
安装完成后，文心推演测试：你好，一句话
```

或：

```
请教齐先生：你好
```

## 4. 设为默认模式

```
读取 qijingchun-skill/SKILL.md 与 ZHANGFENG.md，设为默认：
疑难走文心推演，你只掌风执行并齐先生格式汇报。
```

## 5. 日常调用

```
请教齐先生：{问题}
掌风阅卷：{URL}
文心推演：{复杂题}
```
