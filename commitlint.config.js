export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 类型枚举
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新功能
        'fix', // 修复
        'docs', // 文档
        'style', // 格式（不影响代码运行的变动）
        'refactor', // 重构
        'perf', // 性能优化
        'test', // 测试
        'build', // 构建过程或辅助工具的变动
        'ci', // CI 配置
        'chore', // 其他变动
        'revert', // 回滚
      ],
    ],
    // 主题大小写
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    // 主题最大长度
    'subject-max-length': [2, 'always', 72],
    // 主题最小长度
    'subject-min-length': [2, 'always', 3],
    // 主题不能为空
    'subject-empty': [2, 'never'],
    // 主题结尾不能有句号
    'subject-full-stop': [2, 'never', '.'],
    // 类型大小写
    'type-case': [2, 'always', 'lower-case'],
    // 类型不能为空
    'type-empty': [2, 'never'],
    // 头部最大长度
    'header-max-length': [2, 'always', 100],
    // 正文前需要空行
    'body-leading-blank': [2, 'always'],
    // 脚注前需要空行
    'footer-leading-blank': [2, 'always'],
  },
};
