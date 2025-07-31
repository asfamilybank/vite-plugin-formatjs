# 发布指南

## 发布流程概述

本项目使用分阶段发布流程：

### 开发阶段 (0.0.x)
- 通过 GitHub Actions 在推送标签时自动创建 GitHub Release
- 标记为 pre-release，用于开发和测试
- 不发布到 npm

### 正式发布阶段 (0.0.1+)
- 通过推送标签自动触发发布
- 自动发布到 npm 并创建 GitHub Release
- 提供完整的发布流程

## 发布前准备

### 1. 运行发布准备检查

```bash
# 运行完整的发布前检查
pnpm run prepare-release
```

这个脚本会检查：
- Git 状态（确保没有未提交的更改）
- 依赖安装
- 单元测试
- 代码格式检查
- TypeScript 类型检查
- 项目构建
- 构建输出验证
- 必要文件检查
- package.json 配置

### 2. 确保所有更改已提交

```bash
git status
git add .
git commit -m "feat: 你的更改描述"
```

## 发布步骤

### 1. 更新版本号

进入插件目录并更新版本号：

```bash
cd packages/plugin

# 补丁版本更新（修复 bug）
npm version patch

# 次要版本更新（新功能，向后兼容）
npm version minor

# 主要版本更新（破坏性更改）
npm version major
```

### 2. 推送标签

```bash
# 推送所有标签到远程仓库
git push origin --tags
```

### 3. 等待自动发布

推送标签后，GitHub Actions 会自动：
1. 运行所有测试
2. 构建项目
3. 发布到 npm
4. 创建 GitHub Release

## 版本管理

### 语义化版本

- **补丁版本 (patch)**: 修复 bug，向后兼容
- **次要版本 (minor)**: 新功能，向后兼容
- **主要版本 (major)**: 破坏性更改

### 版本号示例

- `0.1.0` → `0.1.1` (patch)
- `0.1.0` → `0.2.0` (minor)
- `0.1.0` → `1.0.0` (major)

## 发布后验证

### 1. 检查 npm 页面

访问 [npm 包页面](https://www.npmjs.com/package/vite-plugin-formatjs) 确认发布成功。

### 2. 验证安装

```bash
# 测试安装
npm install -D vite-plugin-formatjs@latest

# 验证导入
node -e "console.log(require('vite-plugin-formatjs'))"
```

### 3. 检查 GitHub Release

访问 [GitHub Releases](https://github.com/Asfamilybank/vite-plugin-formatjs/releases) 查看自动生成的发布说明。

## 故障排除

### 发布失败

如果发布失败，检查：

1. **GitHub Secrets**: 确保 `NPM_TOKEN` 已正确配置
2. **权限问题**: 确保 npm 账号有发布权限
3. **版本冲突**: 确保版本号未被使用
4. **构建错误**: 检查 GitHub Actions 日志

### 手动发布

如果需要手动发布：

```bash
cd packages/plugin
npm publish --access public
```

### 发布流程总结

```bash
# 完整发布流程
cd packages/plugin
npm version patch  # 或 minor/major
git push origin --tags
# 自动发布完成
```

## 配置要求

### GitHub Secrets

在 GitHub 仓库设置中配置以下 secrets：

- `NPM_TOKEN`: npm 访问令牌

### npm 配置

确保 npm 账号已登录：

```bash
npm login
```

## 注意事项

1. **版本号唯一性**: 确保版本号在 npm 上是唯一的
2. **标签格式**: 使用 `v*` 格式的标签（如 `v0.1.0`）
3. **提交信息**: 使用符合 commitlint 规范的提交信息
4. **测试覆盖**: 确保所有测试通过后再发布
5. **文档更新**: 发布前更新 CHANGELOG.md

## 联系支持

如果遇到问题，请：

1. 检查 [GitHub Issues](https://github.com/Asfamilybank/vite-plugin-formatjs/issues)
2. 查看 [GitHub Actions 日志](https://github.com/Asfamilybank/vite-plugin-formatjs/actions)
3. 创建新的 Issue 描述问题 