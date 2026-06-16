// 资料分类思维导图 —— 树状结构
// 根节点 → 一级分类（专业方向）→ 二级分类（资料领域）

window.MIND_MAP = {
  root: {
    label: '随心资料分享库',
    icon: '📚',
    color: '#7c3aed',
    children: [
      {
        label: '专业方向',
        icon: '🎓',
        color: '#0ea5e9',
        children: [
          { label: '新闻传播', icon: '📰', color: '#0ea5e9' },
          { label: '教育学', icon: '👩‍🏫', color: '#10b981' },
          { label: '英语语言', icon: '🇬🇧', color: '#f59e0b' },
          { label: '法学', icon: '⚖️', color: '#ef4444' },
          { label: '会计 / 财管', icon: '💰', color: '#eab308' },
          { label: '计算机', icon: '💻', color: '#6366f1' },
          { label: '汉语言文学', icon: '✍️', color: '#ec4899' },
          { label: '理工通用', icon: '🔬', color: '#06b6d4' }
        ]
      },
      {
        label: '考试领域',
        icon: '📋',
        color: '#f59e0b',
        children: [
          { label: '考研', icon: '🎯', color: '#7c3aed' },
          { label: '教资 / 教师招聘', icon: '👨‍🏫', color: '#10b981' },
          { label: '四六级 / 雅思 / 托福', icon: '🌐', color: '#f59e0b' },
          { label: '法考', icon: '⚖️', color: '#ef4444' },
          { label: 'CPA / 会计证', icon: '💼', color: '#eab308' },
          { label: '公务员', icon: '🏛️', color: '#64748b' },
          { label: 'GMAT / 保研', icon: '📈', color: '#06b6d4' }
        ]
      },
      {
        label: '学习场景',
        icon: '📖',
        color: '#10b981',
        children: [
          { label: '期末复习', icon: '📝', color: '#10b981' },
          { label: '专业课笔记', icon: '📓', color: '#14b8a6' },
          { label: '论文 / 报告', icon: '📑', color: '#84cc16' },
          { label: '竞赛 / 实践', icon: '🏆', color: '#f97316' },
          { label: '兴趣 / 课外', icon: '🎨', color: '#ec4899' }
        ]
      }
    ]
  }
};
