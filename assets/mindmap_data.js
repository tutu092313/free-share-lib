// 资料分类思维导图 —— 多学科精细化版本
// 每个学科一个独立导图，含具体板块、章节、重点内容
// 结构：SUBJECT_MAPS = [{ id, label, icon, color, root: { label, children: [...] } }, ...]

window.SUBJECT_MAPS = [
  /* ============ 考研政治 ============ */
  {
    id: 'kaoyan-zhengzhi',
    label: '考研政治',
    icon: '🎯',
    color: '#5cc56a',
    root: {
      label: '考研政治',
      children: [
        {
          label: '马克思主义基本原理',
          icon: '📕',
          children: [
            { label: '哲学（唯物论 / 辩证法 / 认识论）' },
            { label: '政治经济学（劳动价值 / 剩余价值）' },
            { label: '科学社会主义' }
          ]
        },
        {
          label: '毛泽东思想',
          icon: '⭐',
          children: [
            { label: '新民主主义革命理论' },
            { label: '社会主义改造理论' },
            { label: '毛泽东思想活的灵魂' }
          ]
        },
        {
          label: '中国特色社主义理论',
          icon: '🇨🇳',
          children: [
            { label: '邓小平理论' },
            { label: '三个代表重要思想' },
            { label: '科学发展观' }
          ]
        },
        {
          label: '习近平新时代思想',
          icon: '✨',
          children: [
            { label: '十四个坚持' },
            { label: '五位一体总体布局' },
            { label: '四个全面战略布局' }
          ]
        },
        {
          label: '形势与政策',
          icon: '🌐',
          children: [
            { label: '国内重大时事' },
            { label: '国际重大时事' }
          ]
        }
      ]
    }
  },

  /* ============ 考研英语 ============ */
  {
    id: 'kaoyan-yingyu',
    label: '考研英语',
    icon: '🌍',
    color: '#34bcd6',
    root: {
      label: '考研英语',
      children: [
        {
          label: '阅读理解',
          icon: '📖',
          children: [
            { label: '细节题 / 主旨题 / 推断题' },
            { label: '词义猜测题 / 态度题' },
            { label: '长难句拆分（主干+修饰）' }
          ]
        },
        {
          label: '写作',
          icon: '✍️',
          children: [
            { label: '小作文（书信 / 通知 / 备忘录）' },
            { label: '大作文（图表 / 现象分析）' },
            { label: '万能模板与替换词' }
          ]
        },
        {
          label: '完形填空',
          icon: '🧩',
          children: [
            { label: '上下文逻辑' },
            { label: '固定搭配 / 词组' },
            { label: '高频词辨析' }
          ]
        },
        {
          label: '新题型',
          icon: '🔀',
          children: [
            { label: '七选五（段落填空）' },
            { label: '排序题' },
            { label: '小标题对应' }
          ]
        },
        {
          label: '翻译',
          icon: '🔤',
          children: [
            { label: '定语从句译法' },
            { label: '被动语态处理' },
            { label: '专有名词积累' }
          ]
        }
      ]
    }
  },

  /* ============ 考研数学 ============ */
  {
    id: 'kaoyan-shuxue',
    label: '考研数学',
    icon: '📐',
    color: '#7a5cd9',
    root: {
      label: '考研数学',
      children: [
        {
          label: '高等数学',
          icon: '∫',
          children: [
            { label: '极限与连续' },
            { label: '一元函数微分学' },
            { label: '一元函数积分学' },
            { label: '多元函数微分 / 积分' },
            { label: '无穷级数' }
          ]
        },
        {
          label: '线性代数',
          icon: '🔢',
          children: [
            { label: '行列式与矩阵' },
            { label: '向量组的线性相关性' },
            { label: '线性方程组' },
            { label: '特征值与特征向量' },
            { label: '二次型' }
          ]
        },
        {
          label: '概率论与数理统计',
          icon: '🎲',
          children: [
            { label: '随机事件与概率' },
            { label: '一维 / 二维随机变量' },
            { label: '大数定律与中心极限定理' },
            { label: '参数估计与假设检验' }
          ]
        }
      ]
    }
  },

  /* ============ 教师资格证（中学） ============ */
  {
    id: 'jiaozi-zhongxue',
    label: '中学教资',
    icon: '👩‍🏫',
    color: '#3da355',
    root: {
      label: '中学教师资格证',
      children: [
        {
          label: '综合素质（中学）',
          icon: '📘',
          children: [
            { label: '职业理念（教育观 / 教师观 / 学生观）' },
            { label: '教育法律法规' },
            { label: '教师职业道德规范' },
            { label: '文化素养（历史 / 科技 / 艺术）' },
            { label: '基本能力（阅读 / 写作 / 逻辑）' }
          ]
        },
        {
          label: '教育知识与能力',
          icon: '📗',
          children: [
            { label: '教育基础（教育学 / 心理学）' },
            { label: '教学设计 / 教学实施' },
            { label: '教学评价 / 反思' },
            { label: '中学生发展心理' }
          ]
        },
        {
          label: '学科知识与教学能力',
          icon: '📕',
          children: [
            { label: '学科专业知识（按所报学科）' },
            { label: '课程标准解读' },
            { label: '教学案例分析' }
          ]
        },
        {
          label: '面试',
          icon: '🎤',
          children: [
            { label: '结构化问答（5 大题型）' },
            { label: '试讲（10 分钟）' },
            { label: '答辩' }
          ]
        }
      ]
    }
  },

  /* ============ 大学英语四六级 ============ */
  {
    id: 'cet',
    label: '四六级',
    icon: '🎓',
    color: '#f29900',
    root: {
      label: '大学英语四 / 六级',
      children: [
        {
          label: '听力',
          icon: '🎧',
          children: [
            { label: '新闻听力（长对话）' },
            { label: '篇章听力（短文）' },
            { label: '视听一致 / 同义替换' },
            { label: '高频场景词汇' }
          ]
        },
        {
          label: '阅读',
          icon: '📰',
          children: [
            { label: '选词填空（词性 + 上下文）' },
            { label: '长篇阅读（信息匹配）' },
            { label: '仔细阅读（细节 / 推断）' },
            { label: '高频核心词汇' }
          ]
        },
        {
          label: '翻译',
          icon: '🔤',
          children: [
            { label: '中国传统文化（剪纸 / 四大发明）' },
            { label: '社会经济（电商 / 共享经济）' },
            { label: '长难句切分' }
          ]
        },
        {
          label: '写作',
          icon: '✍️',
          children: [
            { label: '议论文三段式' },
            { label: '图表作文（柱状 / 饼图）' },
            { label: '名言警句 / 万能理由' }
          ]
        }
      ]
    }
  },

  /* ============ 雅思 ============ */
  {
    id: 'ielts',
    label: '雅思 IELTS',
    icon: '🛫',
    color: '#1e9bb8',
    root: {
      label: '雅思 IELTS',
      children: [
        {
          label: '听力 Listening',
          icon: '🎧',
          children: [
            { label: 'Section 1-4 题型拆解' },
            { label: '填空 / 选择 / 匹配' },
            { label: '地图题 / 流程图' },
            { label: '同义替换积累' }
          ]
        },
        {
          label: '阅读 Reading',
          icon: '📖',
          children: [
            { label: '判断题（TRUE / FALSE / NOT GIVEN）' },
            { label: '段落匹配 / 小标题' },
            { label: '摘要填空 / 选词' },
            { label: '学术词汇（同义替换）' }
          ]
        },
        {
          label: '写作 Writing',
          icon: '✍️',
          children: [
            { label: 'Task 1（小作文：图表 / 流程）' },
            { label: 'Task 2（大作文：议论文）' },
            { label: '四评分标准：TR / CC / LR / GRA' },
            { label: '高分句式 / 替换词' }
          ]
        },
        {
          label: '口语 Speaking',
          icon: '🗣️',
          children: [
            { label: 'Part 1 日常话题（30 题库）' },
            { label: 'Part 2 卡片题（人物 / 地点 / 事件）' },
            { label: 'Part 3 深入讨论' },
            { label: '发音 / 连读 / 重音' }
          ]
        }
      ]
    }
  },

  /* ============ 法考 ============ */
  {
    id: 'fakao',
    label: '法考',
    icon: '⚖️',
    color: '#82f0f9',
    root: {
      label: '国家统一法律职业资格考试',
      children: [
        {
          label: '客观题',
          icon: '📝',
          children: [
            { label: '刑法（总则 / 分则）' },
            { label: '民法（总则 / 物权 / 合同 / 侵权）' },
            { label: '行政法（行政行为 / 复议 / 诉讼）' },
            { label: '民诉 / 刑诉 / 行政诉' },
            { label: '商经知（公司法 / 知识产权）' },
            { label: '三国法（国际公法 / 国际私法 / 国际经济法）' }
          ]
        },
        {
          label: '主观题',
          icon: '✍️',
          children: [
            { label: '案例分析题（刑法 / 民法）' },
            { label: '论述题（法理学 / 法治思想）' },
            { label: '文书题（判决书 / 起诉书）' }
          ]
        }
      ]
    }
  },

  /* ============ CPA 注会 ============ */
  {
    id: 'cpa',
    label: 'CPA 注会',
    icon: '💼',
    color: '#b69bff',
    root: {
      label: '注册会计师 CPA',
      children: [
        {
          label: '专业阶段 6 门',
          icon: '📚',
          children: [
            { label: '会计（长期股权投资 / 合并报表）' },
            { label: '审计（风险评估 / 内部控制）' },
            { label: '财务成本管理（资本预算 / 本量利）' },
            { label: '税法（增值税 / 企业所得税）' },
            { label: '经济法（公司法 / 证券法）' },
            { label: '公司战略与风险管理' }
          ]
        },
        {
          label: '综合阶段',
          icon: '🎓',
          children: [
            { label: '职业能力综合测试（试卷一）' },
            { label: '职业能力综合测试（试卷二）' }
          ]
        }
      ]
    }
  },

  /* ============ 公务员 ============ */
  {
    id: 'gongwuyuan',
    label: '公务员',
    icon: '🏛️',
    color: '#5e3fc2',
    root: {
      label: '国家公务员考试',
      children: [
        {
          label: '行测',
          icon: '📊',
          children: [
            { label: '常识判断（法律 / 政治 / 经济）' },
            { label: '言语理解与表达（逻辑填空 / 语句表达）' },
            { label: '数量关系（工程 / 行程 / 利润）' },
            { label: '判断推理（图形 / 定义 / 类比 / 逻辑）' },
            { label: '资料分析（增长率 / 比重大小）' }
          ]
        },
        {
          label: '申论',
          icon: '✍️',
          children: [
            { label: '归纳概括题' },
            { label: '提出对策题' },
            { label: '综合分析题' },
            { label: '贯彻执行题（公文写作）' },
            { label: '大作文（议论文）' }
          ]
        },
        {
          label: '面试',
          icon: '🎤',
          children: [
            { label: '结构化面试（5 大题型）' },
            { label: '无领导小组讨论' },
            { label: '公务员礼仪 / 时政热点' }
          ]
        }
      ]
    }
  },

  /* ============ 计算机专业 ============ */
  {
    id: 'jisuanji',
    label: '计算机',
    icon: '💻',
    color: '#9a7cf0',
    root: {
      label: '计算机专业',
      children: [
        {
          label: '基础课',
          icon: '📘',
          children: [
            { label: '数据结构（线性表 / 树 / 图）' },
            { label: '计算机组成原理' },
            { label: '操作系统（进程 / 内存 / 文件）' },
            { label: '计算机网络（TCP/IP / HTTP）' }
          ]
        },
        {
          label: '编程语言',
          icon: '⌨️',
          children: [
            { label: 'C / C++（指针 / 内存管理）' },
            { label: 'Java（集合 / 多线程 / JVM）' },
            { label: 'Python（语法 / 库 / 数据分析）' },
            { label: 'JavaScript（ES6 / 异步）' }
          ]
        },
        {
          label: '方向选修',
          icon: '🚀',
          children: [
            { label: '前端（Vue / React / 浏览器原理）' },
            { label: '后端（Spring / 数据库 / 中间件）' },
            { label: '算法（LeetCode / 动态规划）' },
            { label: 'AI（机器学习 / 深度学习）' }
          ]
        }
      ]
    }
  }
];
