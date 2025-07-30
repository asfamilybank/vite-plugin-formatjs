#!/bin/bash

# 发布准备脚本
# 用于在发布前进行全面的检查和验证

set -e

echo "🚀 开始发布准备检查..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_step() {
    local step_name="$1"
    local command="$2"
    
    echo -e "${YELLOW}📋 检查: $step_name${NC}"
    if eval "$command"; then
        echo -e "${GREEN}✅ $step_name 通过${NC}"
    else
        echo -e "${RED}❌ $step_name 失败${NC}"
        exit 1
    fi
}

# 1. 检查 Git 状态
check_step "Git 状态" "test \$(git status --porcelain | wc -l) -eq 0 || (echo '有未提交的更改' && exit 1)"

# 2. 安装依赖
echo -e "${YELLOW}📦 安装依赖...${NC}"
pnpm install --frozen-lockfile

# 3. 运行测试
check_step "单元测试" "pnpm run test"

# 4. 代码检查
check_step "代码格式检查" "pnpm run lint"

# 5. 类型检查
check_step "TypeScript 类型检查" "pnpm run typecheck"

# 6. 构建项目
check_step "项目构建" "pnpm run build"

# 7. 验证构建输出
check_step "构建输出验证" "
    test -f packages/plugin/dist/index.js && \
    test -f packages/plugin/dist/index.d.ts && \
    test -f packages/plugin/dist/index.cjs
"

# 8. 检查必要文件
check_step "必要文件检查" "
    test -f LICENSE && \
    test -f packages/plugin/LICENSE && \
    test -f CHANGELOG.md && \
    test -f packages/plugin/README.md
"

# 9. 检查 package.json 配置
check_step "package.json 配置" "
    node -e \"
        const pkg = require('./packages/plugin/package.json');
        const required = ['name', 'version', 'description', 'main', 'types', 'files'];
        const missing = required.filter(field => !pkg[field]);
        if (missing.length > 0) {
            console.error('缺少必要字段:', missing);
            process.exit(1);
        }
        console.log('package.json 配置完整');
    \"
"

echo -e "${GREEN}🎉 所有检查通过！准备发布。${NC}"
echo ""
echo "📝 下一步操作："
echo "1. 更新版本号: cd packages/plugin && npm version patch|minor|major"
echo "2. 推送标签: git push origin --tags"
echo "3. 等待 GitHub Actions 自动创建 Release"
echo ""
echo "💡 提示："
echo "- 使用 'npm version patch' 进行补丁版本更新"
echo "- 使用 'npm version minor' 进行次要版本更新"
echo "- 使用 'npm version major' 进行主要版本更新"
echo "- 当前为开发版本，LTS 版本将在测试完成后发布到 npm" 