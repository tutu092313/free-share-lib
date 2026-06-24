/* =============================================================
   随心资料分享库 — 主程序（v4 升级版）
   技术栈：原生 JS + Tailwind（CDN）+ PDF.js + mammoth.js
   存储：localStorage（实践作品无后端）
   升级：装饰 / 官方权威资料 / 思维导图 / 视觉升级
   ============================================================= */

(function () {
  'use strict';

  /* ---------- 存储 ---------- */
  const LS = {
    USERS:    'sxsx.users',
    SESSION:  'sxsx.session',
    RESOURCES:'sxsx.resources',
    COMMENTS: 'sxsx.comments',
    COMMENT_LIKES: 'sxsx.commentLikes',
    LIKES:    'sxsx.likes',
    FAVS:     'sxsx.favs',
    NOTIFS:   'sxsx.notifs',
    MAJORS:   'sxsx.majors',
    FIELDS:   'sxsx.fields',
    USER_MINDMAPS: 'sxsx.userMindmaps',
    HOT_LOG:  'sxsx.hotLog',
    SEEDED:   'sxsx.seeded.v10'
  };
  const get = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  /* ---------- 工具 ---------- */
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  /* 内容高亮：@ 用户名 */
  function formatContent(text) {
    const safe = escapeHtml(text || '');
    return safe.replace(/@([\u4e00-\u9fa5A-Za-z0-9_]+)/g, '<span class="text-brand-600 font-medium">@$1</span>');
  }
  const fmtTime = ts => {
    const d = new Date(ts), now = Date.now();
    const diff = (now - ts) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 604800) return Math.floor(diff / 86400) + ' 天前';
    return d.toLocaleDateString('zh-CN');
  };
  const fmtSize = b => {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1024 / 1024).toFixed(2) + ' MB';
  };
  const toast = msg => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  };
  /* SVG 坐标转换工具 */
  function svgPoint(svg, e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  /* ---------- 字典：专业 / 领域 ---------- */
  const DEFAULT_MAJORS = [
    '新闻学', '传播学', '汉语言文学', '广告学', '广播电视学',
    '法学', '计算机科学与技术', '软件工程', '电子信息', '人工智能',
    '数学与应用数学', '英语', '工商管理', '会计学', '金融学',
    '心理学', '教育学', '医学', '护理学', '其他'
  ];
  const DEFAULT_FIELDS = [
    { id: 'all',     name: '全部',   icon: '🌐' },
    { id: 'period',  name: '专业课', icon: '📘' },
    { id: 'exam',    name: '期末复习', icon: '📝' },
    { id: 'kaoyan',  name: '考研',   icon: '🎓' },
    { id: 'jiaozi',  name: '教资',   icon: '👩‍🏫' },
    { id: 'cet',     name: '四六级', icon: '🅰️' },
    { id: 'fakao',   name: '法考',   icon: '⚖️' },
    { id: 'cpa',     name: 'CPA',   icon: '💼' },
    { id: 'gwy',     name: '公务员', icon: '🏛️' },
    { id: 'teacher', name: '教师招聘', icon: '🏫' },
    { id: 'ielts',   name: '雅思',   icon: '🌍' },
    { id: 'toefl',   name: '托福',   icon: '🛫' },
    { id: 'gmat',    name: 'GMAT',  icon: '📊' },
    { id: 'postgrad',name: '保研',   icon: '🏆' },
    { id: 'other',   name: '其他',   icon: '📦' }
  ];
  const Dict = {
    majors() { return get(LS.MAJORS, DEFAULT_MAJORS.slice()); },
    fields() { return get(LS.FIELDS, DEFAULT_FIELDS.slice()); },
    addMajor(name) { const n = (name || '').trim(); if (!n) return null; const list = this.majors(); if (!list.includes(n)) { list.push(n); set(LS.MAJORS, list); } return n; },
    addField(name) {
      const n = (name || '').trim(); if (!n) return null;
      const list = this.fields();
      if (!list.find(x => x.name === n)) {
        list.push({ id: 'fld_' + Date.now() + '_' + Math.floor(Math.random()*999), name: n, icon: '🗂️' });
        set(LS.FIELDS, list);
      }
      return n;
    },
    fieldIdByName(name) {
      const f = this.fields().find(x => x.name === name || x.id === name);
      return f ? f.id : null;
    },
    fieldNameById(id) {
      const f = this.fields().find(x => x.id === id);
      return f ? f : null;
    }
  };

  /* ---------- 资料库分类树（侧边栏导航） ---------- */
  const LIBRARY_CATEGORIES = [
    {
      label: '🌟 推荐',
      expanded: true,
      children: [
        { label: '🔥 今日热门', icon: 'hot', filter: { sort: 'hot' } },
        { label: '⬇️ 最多下载', icon: 'downloads', filter: { sort: 'downloads' } },
        { label: '🆕 最新上传', icon: 'new', filter: { sort: 'new' } },
        { label: '📌 官方权威', icon: 'official', filter: { credibility: '官方' } }
      ]
    },
    {
      label: '📚 按考试分类',
      expanded: true,
      children: [
        { label: '🎓 考研', icon: 'kaoyan', filter: { field: 'kaoyan' } },
        { label: '🏛️ 考公', icon: 'gwy', filter: { field: 'gwy' } },
        { label: '📖 四六级', icon: 'cet', filter: { field: 'cet' } },
        { label: '🍎 教资', icon: 'jiaozi', filter: { field: 'jiaozi' } },
        { label: '💰 会计/CPA', icon: 'cpa', filter: { field: 'cpa' } },
        { label: '⚖️ 法考', icon: 'fakao', filter: { field: 'fakao' } },
        { label: '🏥 医学考试', icon: 'medical', filter: { field: 'medical' } },
        { label: '💻 计算机等级', icon: 'computer', filter: { field: 'computer' } },
        { label: '🌍 雅思/托福', icon: 'ielts', filter: { field: 'ielts' } },
        { label: '📦 其他考试', icon: 'other', filter: { field: 'other' } }
      ]
    },
    {
      label: '📁 按资料类型',
      expanded: false,
      children: [
        { label: '🔗 官方链接', icon: 'link', filter: { type: 'link' } },
        { label: '📄 PDF 文档', icon: 'pdf', filter: { type: 'pdf' } },
        { label: '📝 Word 文档', icon: 'docx', filter: { type: 'docx' } },
        { label: '🖼️ 图片资料', icon: 'image', filter: { type: 'image' } }
      ]
    }
  ];

  /* ---------- 封面图图标映射（按专业/类型） ---------- */
  const COVER_ICONS = {
    // 考试类
    '考研': 'https://img.icons8.com/color/96/000000/graduation-cap.png',
    '考公': 'https://img.icons8.com/color/96/000000/badge.png',
    '四六级': 'https://img.icons8.com/color/96/000000/book.png',
    '教资': 'https://img.icons8.com/color/96/000000/teacher.png',
    '会计': 'https://img.icons8.com/color/96/000000/calculator.png',
    '法考': 'https://img.icons8.com/color/96/000000/gavel.png',
    '医学': 'https://img.icons8.com/color/96/000000/stethoscope.png',
    '计算机': 'https://img.icons8.com/color/96/000000/laptop.png',
    '语言': 'https://img.icons8.com/color/96/000000/language.png',
    // 学科类
    '新闻学': 'https://img.icons8.com/color/96/000000/news.png',
    '汉语言文学': 'https://img.icons8.com/color/96/000000/literature.png',
    '广告学': 'https://img.icons8.com/color/96/000000/advertisement.png',
    '金融学': 'https://img.icons8.com/color/96/000000/money.png',
    '心理学': 'https://img.icons8.com/color/96/000000/brain.png',
    '教育学': 'https://img.icons8.com/color/96/000000/school.png',
    '数学': 'https://img.icons8.com/color/96/000000/mathematics.png',
    '英语': 'https://img.icons8.com/color/96/000000/english.png',
    '工商管理': 'https://img.icons8.com/color/96/000000/business.png',
    '护理学': 'https://img.icons8.com/color/96/000000/nurse.png',
    '软件工程': 'https://img.icons8.com/color/96/000000/code.png',
    '人工智能': 'https://img.icons8.com/color/96/000000/robot.png',
    '广播电视学': 'https://img.icons8.com/color/96/000000/tv.png',
    // 综合/默认
    '综合': 'https://img.icons8.com/color/96/000000/archive.png',
    'default': 'https://img.icons8.com/color/96/000000/document.png'
  };

  /* 获取资料封面图（优先使用资料自带的 cover，否则根据专业生成 SVG 图标） */
  function getResourceCover(r) {
    if (r.cover) return r.cover;
    // 使用本地生成的 SVG 图标（不依赖外部服务）
    return generateSvgCover(r.major || '综合', r.title);
  }

  /* 生成 SVG 封面图（备用方案，不依赖外部服务） */
  function generateSvgCover(major, title) {
    const colors = {
      '考研': '#3b82f6', '考公': '#ef4444', '四六级': '#f59e0b', '教资': '#10b981',
      '会计': '#8b5cf6', '法考': '#ec4899', '医学': '#06b6d4', '计算机': '#84cc16',
      '语言': '#f97316', '新闻学': '#6366f1', '汉语言文学': '#14b8a6', '广告学': '#d946ef',
      '金融学': '#22c55e', '心理学': '#a855f7', '教育学': '#0ea5e9', '数学': '#f43f5e',
      '英语': '#84cc16', '工商管理': '#64748b', '护理学': '#06b6d4', '软件工程': '#3b82f6',
      '人工智能': '#8b5cf6', '广播电视学': '#ef4444', '综合': '#6b7280'
    };
    const color = colors[major] || '#6b7280';
    const letter = (title || major || '?')[0];
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="${color}"/><text x="48" y="64" font-family="Arial" font-size="48" fill="white" text-anchor="middle">${letter}</text></svg>`)}`;
  }

  /* ---------- 字典：大学（覆盖 985/211/双一流 + 各省头部院校） ---------- */
  const UNIVERSITIES = [
    // 985 / 双一流
    '北京大学', '清华大学', '中国人民大学', '北京航空航天大学', '北京理工大学',
    '中国农业大学', '北京师范大学', '中央民族大学', '南开大学', '天津大学',
    '大连理工大学', '东北大学', '吉林大学', '哈尔滨工业大学', '复旦大学',
    '同济大学', '上海交通大学', '华东师范大学', '南京大学', '东南大学',
    '浙江大学', '中国科学技术大学', '厦门大学', '山东大学', '中国海洋大学',
    '武汉大学', '华中科技大学', '中南大学', '湖南大学', '国防科技大学',
    '中山大学', '华南理工大学', '四川大学', '重庆大学', '电子科技大学',
    '西安交通大学', '西北工业大学', '西北农林科技大学', '兰州大学', '中央民族大学',
    // 211 / 知名双一流
    '北京交通大学', '北京工业大学', '北京科技大学', '北京化工大学', '北京邮电大学',
    '北京林业大学', '北京中医药大学', '北京外国语大学', '中国传媒大学', '中央财经大学',
    '对外经济贸易大学', '北京体育大学', '中央音乐学院', '中国政法大学', '华北电力大学',
    '中国矿业大学（北京）', '中国石油大学（北京）', '中国地质大学（北京）',
    '天津医科大学', '河北工业大学', '太原理工大学', '内蒙古大学',
    '辽宁大学', '大连海事大学', '东北师范大学', '东北农业大学', '东北林业大学',
    '华东理工大学', '东华大学', '上海财经大学', '上海外国语大学', '上海大学',
    '上海海事大学', '上海音乐学院', '上海体育学院',
    '苏州大学', '南京理工大学', '南京航空航天大学', '河海大学', '江南大学',
    '南京农业大学', '南京师范大学', '中国药科大学', '中国矿业大学（徐州）',
    '安徽大学', '合肥工业大学', '福州大学', '南昌大学',
    '河南大学', '华中农业大学', '华中师范大学', '武汉理工大学', '中国地质大学（武汉）',
    '湖南师范大学', '暨南大学', '华南师范大学', '华南农业大学', '广西大学',
    '海南大学', '西南大学', '西南交通大学', '西南财经大学', '四川农业大学',
    '贵州大学', '云南大学', '西藏大学', '西北大学', '长安大学',
    '陕西师范大学', '青海大学', '宁夏大学', '新疆大学', '石河子大学',
    // 各省头部非 211 院校
    '深圳大学', '南方科技大学', '上海科技大学', '中国科学院大学',
    '首都师范大学', '首都经济贸易大学', '首都医科大学', '北京建筑大学',
    '北京工商大学', '北京信息科技大学',
    '华东政法大学', '上海理工大学', '上海师范大学', '上海工程技术大学',
    '南京邮电大学', '南京医科大学', '南京中医药大学', '南京工业大学',
    '浙江工业大学', '浙江工商大学', '浙江理工大学', '宁波大学',
    '杭州电子科技大学', '中国计量大学',
    '山东师范大学', '青岛大学', '青岛科技大学', '山东财经大学', '山东农业大学',
    '河南师范大学', '河南科技大学', '河南工业大学', '河南财经政法大学',
    '湖北大学', '武汉科技大学', '中南民族大学', '湖北工业大学',
    '湖南科技大学', '长沙理工大学', '湖南农业大学',
    '汕头大学', '广州大学', '广州中医药大学', '广东工业大学', '广东外语外贸大学',
    '南方医科大学', '深圳技术大学',
    '成都理工大学', '成都中医药大学', '西华大学', '成都信息工程大学',
    '重庆邮电大学', '重庆交通大学', '重庆医科大学',
    '西安建筑科技大学', '西安理工大学', '西安电子科技大学', '陕西科技大学',
    '兰州交通大学', '兰州理工大学', '西北师范大学',
    '河北大学', '燕山大学', '河北师范大学',
    '山西大学', '中北大学', '山西财经大学',
    // 其他
    '其他高校 / 暂未列出'
  ];
  // 预设头像 emoji
  const AVATAR_OPTIONS = [
    '🐱','🐶','🐰','🐻','🐼','🐨','🦊','🐯','🐮','🐷','🐸','🐵',
    '🦁','🐔','🐧','🐦','🦄','🐙','🦋','🌸','🌟','🌈','☀️','🌙',
    '🍀','🌻','🌺','🌷','🌹','🍓','🍎','🍊','🍋','🍇','🍉','🍑',
    '🎨','🎭','🎪','🎯','🎲','🎵','📚','✏️','💡','💎','🚀','⚽'
  ];

  /* ---------- 投喂：通用入库工具 ---------- */
  function iconThumb(kind) {
    const color = { pdf: '#dc2626', docx: '#2563eb', image: '#059669', file: '#64748b', link: '#7c3aed' }[kind] || '#64748b';
    const label = { pdf: 'PDF', docx: 'DOCX', image: 'IMG', file: 'FILE', link: '🔗' }[kind] || 'FILE';
    const c = document.createElement('canvas');
    c.width = 320; c.height = 220;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, 320, 220);
    ctx.fillStyle = color; ctx.font = 'bold 56px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, 160, 110);
    return c.toDataURL('image/jpeg', 0.8);
  }
  const Feed = {
    normalizeOne(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const title = (raw.title || raw.名称 || raw.name || '').toString().trim();
      if (!title) return null;
      const major = (raw.major || raw.专业 || '').toString().trim() || '其他';
      const m = Dict.addMajor(major) || '其他';
      let fInput = (raw.field || raw.领域 || '').toString().trim();
      let fieldId = Dict.fieldIdByName(fInput);
      if (!fieldId) {
        const added = Dict.addField(fInput || '其他');
        fieldId = Dict.fieldIdByName(added);
      }
      const type = (raw.type || raw.类型 || '').toString().toLowerCase();
      const t = ['pdf','docx','image','link'].includes(type) ? type :
        (type === 'jpg' || type === 'jpeg' || type === 'png' || type === 'gif' || type === 'webp' ? 'image' :
        (type === 'word' ? 'docx' : (raw.url ? 'link' : 'pdf')));
      const size = Number(raw.size || raw.大小 || 0) || 0;
      const desc = (raw.desc || raw.描述 || '').toString();
      const tags = (raw.tags || raw.标签 || []);
      const tagsArr = Array.isArray(tags) ? tags.map(String) : String(tags).split(/[,，]/).map(s => s.trim()).filter(Boolean);
      return {
        id: raw.id || uid(),
        title, desc,
        major: m,
        field: fieldId,
        type: t,
        size,
        url: raw.url || null,
        fileName: raw.fileName || raw.文件名 || (title + (t === 'link' ? '' : '.' + (t === 'image' ? 'png' : t))),
        fileData: raw.fileData || null,
        thumb: iconThumb(t),
        uploaderId: raw.uploaderId || (currentUser() ? currentUser().id : 'u_demo'),
        uploaderName: raw.uploaderName || (currentUser() ? currentUser().name : '社区贡献'),
        createdAt: raw.createdAt || Date.now(),
        downloads: raw.downloads || 0,
        tags: tagsArr,
        sourceName: raw.sourceName || null,
        sourceUrl: raw.sourceUrl || null,
        sourceIcon: raw.sourceIcon || null,
        credibility: raw.credibility || null
      };
    },
    addOne(raw) {
      const r = this.normalizeOne(raw);
      if (!r) return null;
      Resource.add(r);
      return r;
    },
    addMany(arr) {
      const list = Array.isArray(arr) ? arr : [arr];
      let ok = 0, fail = 0;
      list.forEach(it => { if (this.addOne(it)) ok++; else fail++; });
      return { ok, fail, total: list.length };
    }
  };

  /* ---------- 当前用户 ---------- */
  const currentUser = () => {
    const s = get(LS.SESSION, null);
    if (!s) return null;
    return get(LS.USERS, []).find(u => u.id === s.userId) || null;
  };

  /* ---------- 资源（资料） ---------- */
  const Resource = {
    all() { return get(LS.RESOURCES, []).sort((a, b) => b.createdAt - a.createdAt); },
    byId(id) { return this.all().find(r => r.id === id); },
    byUser(uid) { return this.all().filter(r => r.uploaderId === uid); },
    add(r) {
      const list = get(LS.RESOURCES, []);
      // 同 id 不重复入库
      if (list.find(x => x.id === r.id)) return;
      list.unshift(r);
      set(LS.RESOURCES, list);
    },
    remove(id) {
      set(LS.RESOURCES, get(LS.RESOURCES, []).filter(r => r.id !== id));
      set(LS.COMMENTS, get(LS.COMMENTS, []).filter(c => c.resourceId !== id));
      // 清理点赞
      const likes = get(LS.LIKES, {}); delete likes[id]; set(LS.LIKES, likes);
      // ⭐ 清理所有用户的收藏
      const favs = get(LS.FAVS, {});
      for (const uid in favs) {
        if (Array.isArray(favs[uid])) favs[uid] = favs[uid].filter(x => x !== id);
      }
      set(LS.FAVS, favs);
      // ⭐ 清理引用该资源的通知
      const notifs = get(LS.NOTIFS, {});
      for (const uid in notifs) {
        if (Array.isArray(notifs[uid])) notifs[uid] = notifs[uid].filter(n => n.rid !== id);
      }
      set(LS.NOTIFS, notifs);
      // ⭐ 清理热门打点
      const hot = get(LS.HOT_LOG, []).filter(h => h.rid !== id);
      set(LS.HOT_LOG, hot);
    },
    update(r) {
      const list = get(LS.RESOURCES, []);
      const idx = list.findIndex(x => x.id === r.id);
      if (idx === -1) return false;
      list[idx] = { ...list[idx], ...r };
      set(LS.RESOURCES, list);
      return true;
    },
    incDownload(id) {
      const list = get(LS.RESOURCES, []);
      const r = list.find(x => x.id === id);
      if (r) { r.downloads = (r.downloads || 0) + 1; set(LS.RESOURCES, list); }
      Hot.log(id, 'download');
    }
  };

  /* ---------- 每日热门（基于当日下载 + 点赞 计算热度） ---------- */
  const Hot = {
    /* 写入打点 */
    log(rid, kind) {
      const all = get(LS.HOT_LOG, []);
      all.push({ rid, kind, t: Date.now() });
      // 7 天前的清掉
      const cutoff = Date.now() - 7 * 86400000;
      const trimmed = all.filter(x => x.t > cutoff);
      set(LS.HOT_LOG, trimmed);
    },
    /* 获取今日热门（按热度倒序） */
    today(topN = 5) {
      const all = get(LS.HOT_LOG, []);
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const cutoff = dayStart.getTime();
      const today = all.filter(x => x.t >= cutoff);
      // 统计
      const score = {};
      today.forEach(x => {
        score[x.rid] = (score[x.rid] || 0) + (x.kind === 'like' ? 3 : 1);
      });
      // 加入资源基础分（避免冷启动零分）
      const list = Object.entries(score)
        .map(([rid, s]) => ({ rid, s, r: Resource.byId(rid) }))
        .filter(x => x.r)
        .sort((a, b) => b.s - a.s)
        .slice(0, topN)
        .map(x => x.r);
      return list;
    }
  };

  /* ---------- 评论（支持楼中楼 + 点赞） ---------- */
  const Comment = {
    byResource(rid) { return get(LS.COMMENTS, []).filter(c => c.resourceId === rid).sort((a, b) => a.createdAt - b.createdAt); },
    add(c) { const list = get(LS.COMMENTS, []); list.push(c); set(LS.COMMENTS, list); },
    byId(id) { return get(LS.COMMENTS, []).find(c => c.id === id); },
    /* 楼中楼：返回 {top: [], repliesByParent: {parentId: []}} */
    tree(rid) {
      const all = this.byResource(rid);
      const top = all.filter(c => !c.parentId);
      const replies = {};
      all.filter(c => c.parentId).forEach(c => {
        (replies[c.parentId] = replies[c.parentId] || []).push(c);
      });
      return { top, replies };
    },
    /* 点赞 */
    isLiked(cid, uid) { return (get(LS.COMMENT_LIKES, {})[cid] || []).includes(uid); },
    likeCount(cid) { return (get(LS.COMMENT_LIKES, {})[cid] || []).length; },
    toggleLike(cid, uid) {
      const all = get(LS.COMMENT_LIKES, {});
      const arr = all[cid] || [];
      const i = arr.indexOf(uid);
      if (i >= 0) arr.splice(i, 1); else arr.push(uid);
      all[cid] = arr; set(LS.COMMENT_LIKES, all);
      return i < 0;
    },
    /* 最近的评论（按时间倒序），用于动态流 */
    recent(limit = 30) {
      return get(LS.COMMENTS, [])
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    }
  };

  /* ---------- 通知（@ 和回复 提醒） ---------- */
  const Notification = {
    list(uid) { return get(LS.NOTIFS, []).filter(n => n.toUserId === uid).sort((a, b) => b.createdAt - a.createdAt); },
    unreadCount(uid) { return this.list(uid).filter(n => !n.read).length; },
    add(n) { const list = get(LS.NOTIFS, []); list.push(n); set(LS.NOTIFS, list); },
    markAllRead(uid) { const list = get(LS.NOTIFS, []).map(n => n.toUserId === uid ? { ...n, read: true } : n); set(LS.NOTIFS, list); },
    /* 自动生成 @ 和回复 通知 */
    pushFromComment(c, r, fromUser) {
      const targetUid = c.replyToUserId;
      if (!targetUid || targetUid === fromUser.id) return;
      Notification.add({
        id: uid(), toUserId: targetUid, fromUserId: fromUser.id,
        type: c.parentId ? 'reply' : 'mention',
        resourceId: r.id, resourceTitle: r.title,
        commentId: c.id, snippet: (c.content || '').slice(0, 50),
        createdAt: Date.now(), read: false
      });
    }
  };

  /* ---------- 点赞 / 收藏 ---------- */
  const Like = {
    isLiked(rid, uid) { return (get(LS.LIKES, {})[rid] || []).includes(uid); },
    count(rid) { return (get(LS.LIKES, {})[rid] || []).length; },
    toggle(rid, uid) {
      const all = get(LS.LIKES, {});
      const arr = all[rid] || [];
      const i = arr.indexOf(uid);
      if (i >= 0) arr.splice(i, 1); else arr.push(uid);
      all[rid] = arr; set(LS.LIKES, all);
      if (i < 0) Hot.log(rid, 'like');  // 新增点赞时打点
      return i < 0;
    }
  };
  const Fav = {
    list(uid) { return (get(LS.FAVS, {})[uid] || []); },
    has(rid, uid) { return this.list(uid).includes(rid); },
    toggle(rid, uid) {
      const all = get(LS.FAVS, {});
      const arr = all[uid] || [];
      const i = arr.indexOf(rid);
      if (i >= 0) arr.splice(i, 1); else arr.push(rid);
      all[uid] = arr; set(LS.FAVS, all);
      return i < 0;
    }
  };

  /* ---------- 上传：把文件读为 base64 ---------- */
  const MAX_SIZE = 8 * 1024 * 1024;
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      if (file.size > MAX_SIZE) return reject(new Error('文件超过 8MB'));
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error('读取失败'));
      fr.readAsDataURL(file);
    });
  }
  async function makeThumbnail(file) {
    const type = (file.type || '').toLowerCase();
    const name = file.name.toLowerCase();
    try {
      if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/.test(name)) {
        return await new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = e => {
            const img = new Image();
            img.onload = () => {
              const c = document.createElement('canvas');
              c.width = 320; c.height = 220;
              const ctx = c.getContext('2d');
              ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, 320, 220);
              const ratio = Math.min(320 / img.width, 220 / img.height);
              const w = img.width * ratio, h = img.height * ratio;
              ctx.drawImage(img, (320 - w) / 2, (220 - h) / 2, w, h);
              resolve(c.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => resolve(iconThumb('image'));
            img.src = e.target.result;
          };
          fr.readAsDataURL(file);
        });
      }
      if (type.includes('pdf') || name.endsWith('.pdf')) {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const canvas = document.createElement('canvas');
        const ratio = Math.min(320 / viewport.width, 220 / viewport.height);
        canvas.width = 320; canvas.height = 220;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: page.getViewport({ scale: ratio }) }).promise;
        return canvas.toDataURL('image/jpeg', 0.8);
      }
      if (name.endsWith('.docx') || type.includes('word')) {
        return iconThumb('docx');
      }
      return iconThumb('file');
    } catch (e) {
      console.warn('缩略图生成失败：', e);
      return iconThumb(name.endsWith('.pdf') ? 'pdf' : (name.endsWith('.docx') ? 'docx' : 'file'));
    }
  }

  /* ---------- 鉴权 ---------- */
  const Auth = {
    mode: 'login',
    open(mode = 'login') {
      this.mode = mode;
      $('#authTitle').textContent = mode === 'login' ? '登录' : '注册';
      $('#authSubmit').textContent = mode === 'login' ? '登录' : '注册并登录';
      $('#authSubtitle').textContent = mode === 'login' ? '登录后即可投喂资料、评论互动' : '注册后即享完整功能';
      $('#authToggleText').textContent = mode === 'login' ? '还没有账号？' : '已有账号？';
      $('#authToggleLink').textContent = mode === 'login' ? '立即注册' : '直接登录';
      // 注册模式才显示学校/昵称字段
      const extras = $('#authRegisterExtras');
      if (extras) extras.classList.toggle('hidden', mode !== 'register');
      // 注入学校选项
      if (mode === 'register') this.fillSchoolOptions('#authSchool');
      $('#authModal').classList.remove('hidden');
      setTimeout(() => $('#authUsername').focus(), 50);
    },
    fillSchoolOptions(selector) {
      const sel = $(selector);
      if (!sel) return;
      // 保留第一个占位 option
      const placeholder = sel.options[0] ? sel.options[0].outerHTML : '<option value="">🏫 选择你的学校（选填）</option>';
      sel.innerHTML = placeholder + UNIVERSITIES.map(u => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('');
    },
    close() { $('#authModal').classList.add('hidden'); $('#authForm').reset(); },
    toggle() { this.open(this.mode === 'login' ? 'register' : 'login'); },
    demoLogin() {
      const users = get(LS.USERS, []);
      let demo = users.find(u => u.account === 'demo');
      if (!demo) {
        demo = { id: 'u_demo', account: 'demo', password: 'demo', name: '体验同学', nickname: '体验同学', bio: '这就是体验账号', avatar: '🐱', school: '', createdAt: Date.now() };
        users.push(demo); set(LS.USERS, users);
      }
      set(LS.SESSION, { userId: demo.id });
      this.close();
      App.renderUserArea();
      App.reRender();
      toast('已以体验账号登录');
    },
    submit(e) {
      e.preventDefault();
      const account = $('#authUsername').value.trim();
      const password = $('#authPassword').value.trim();
      if (!account || account.length < 3) return toast('用户名至少 3 个字符');
      if (!password || password.length < 6) return toast('密码至少 6 位');
      const users = get(LS.USERS, []);
      if (this.mode === 'register') {
        if (users.find(u => u.account === account)) return toast('该账号已注册');
        const nickname = ($('#authNickname')?.value || '').trim() || account;
        const school   = ($('#authSchool')?.value || '').trim();
        const u = {
          id: uid(), account, password,
          name: nickname, nickname,
          bio: school ? school + ' · 这家伙很懒，什么也没留下~' : '这家伙很懒，什么也没留下~',
          avatar: AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)],
          school, createdAt: Date.now()
        };
        users.push(u); set(LS.USERS, users);
        set(LS.SESSION, { userId: u.id });
        toast('注册成功，欢迎 ' + u.name);
      } else {
        const u = users.find(u => u.account === account && u.password === password);
        if (!u) return toast('账号或密码错误');
        set(LS.SESSION, { userId: u.id });
        toast('登录成功，欢迎回来 ' + u.name);
      }
      this.close();
      App.renderUserArea();
      App.reRender();
    }
  };
  Auth.logout = function () {
    localStorage.removeItem(LS.SESSION);
    App.renderUserArea();
    App.go('home');
    toast('已退出登录');
  };

  // ---------- 头像辅助：把 emoji 当头像渲染（无图片） ----------
  function userAvatarHtml(u, size) {
    const px = size || 40;
    if (u && u.avatar) {
      return `<div class="rounded-full text-white flex items-center justify-center font-bold flex-shrink-0" style="width:${px}px;height:${px}px;font-size:${px*0.5}px;background:linear-gradient(135deg,#5cc56a,#34bcd6,#7a5cd9);">${escapeHtml(u.avatar)}</div>`;
    }
    const letter = (u && (u.name || u.account) ? (u.name || u.account) : '?').slice(0, 1);
    return `<div class="rounded-full text-white flex items-center justify-center font-bold flex-shrink-0" style="width:${px}px;height:${px}px;font-size:${px*0.42}px;background:linear-gradient(135deg,#5cc56a,#34bcd6,#7a5cd9);">${escapeHtml(letter)}</div>`;
  }

  /* ---------- 种子数据（含官方权威资料）---------- */
  function seedIfNeeded() {
    // 已经是 v7，跳过
    if (localStorage.getItem(LS.SEEDED) === 'sxsx.seeded.v10') return;

    // 升级到 v7：先把旧资源清空，确保权威资料能重新入库
    if (localStorage.getItem(LS.SEEDED) && localStorage.getItem(LS.SEEDED) !== 'sxsx.seeded.v10') {
      // 保留用户 / 评论 / 通知 / 自绘导图，只清掉资料数据
      set(LS.RESOURCES, []);
      set(LS.HOT_LOG, []);
    }

    // 首次：插入用户和示例数据
    if (!localStorage.getItem(LS.SEEDED)) {
      const users = get(LS.USERS, []);
      const demo = { id: 'u_demo', account: 'demo', password: 'demo', name: '体验同学', bio: '我就是来逛逛的～', createdAt: Date.now() - 86400000 * 5 };
      const lulu = { id: 'u_lulu', account: 'lulu', password: '1234', name: '噜噜学姐', bio: '新闻学大四，分享学习资料ing', createdAt: Date.now() - 86400000 * 30 };
      const ming = { id: 'u_ming', account: 'ming', password: '1234', name: '小明同学', bio: '爱整理笔记的考研党', createdAt: Date.now() - 86400000 * 15 };
      users.push(demo, lulu, ming);
      set(LS.USERS, users);

      // 内置示例资料
      const samples = [
        { title: '新闻学概论·第三章 重点笔记', desc: '马克思主义新闻观与中国新闻业的实际结合。包含课后思考题答案。', major: '新闻学', field: 'period', tags: ['笔记', '期末复习', '重点'], uploaderId: 'u_lulu', type: 'pdf', size: 320000, downloads: 42 },
        { title: '传播学教程·框架理论 PPT', desc: '老师课上用的PPT，补充了大量案例分析。', major: '传播学', field: 'period', tags: ['PPT', '案例'], uploaderId: 'u_ming', type: 'docx', size: 1280000, downloads: 28 },
        { title: '新闻采访与写作 期末复习提纲', desc: '整理了全书 8 章的考点与答题模板。', major: '新闻学', field: 'exam', tags: ['提纲', '期末'], uploaderId: 'u_lulu', type: 'pdf', size: 540000, downloads: 67 },
        { title: '新媒体概论·短视频专题', desc: '短视频传播机制与平台对比分析，配图。', major: '新闻学', field: 'period', tags: ['短视频', '专题'], uploaderId: 'u_ming', type: 'image', size: 210000, downloads: 15 },
        { title: '新闻评论 优秀范文 50 篇', desc: '包含人民时评、光明时评的精选评论。', major: '新闻学', field: 'period', tags: ['范文', '评论写作'], uploaderId: 'u_lulu', type: 'docx', size: 320000, downloads: 89 },
        { title: '新闻摄影构图技巧（图解）', desc: '9 种常用构图法，配实拍示例图。', major: '新闻学', field: 'period', tags: ['摄影', '图解'], uploaderId: 'u_lulu', type: 'image', size: 460000, downloads: 51 },
        { title: '新闻学概论·完整思维导图', desc: '全书 12 章导图合集，XMind 可编辑。', major: '新闻学', field: 'exam', tags: ['思维导图', 'XMind'], uploaderId: 'u_ming', type: 'pdf', size: 720000, downloads: 76 },
        { title: '考研政治·马原精讲笔记', desc: '马克思主义原理高频考点 + 思维框架，适合冲刺阶段。', major: '其他', field: 'kaoyan', tags: ['考研', '政治', '马原'], uploaderId: 'u_ming', type: 'pdf', size: 880000, downloads: 132 },
        { title: '2025 教资·中学教育知识与能力 真题', desc: '近 5 年真题汇总 + 详细答案解析。', major: '教育学', field: 'jiaozi', tags: ['教资', '真题', '中学'], uploaderId: 'u_lulu', type: 'pdf', size: 1520000, downloads: 256 },
        { title: '英语六级 高频词汇 800 核心', desc: '按话题分类，配真题例句。', major: '英语', field: 'cet', tags: ['六级', '词汇'], uploaderId: 'u_ming', type: 'docx', size: 240000, downloads: 198 },
        { title: '法考·民法总则 高频考点', desc: '结合《民法典》整理的核心考点与易错点。', major: '法学', field: 'fakao', tags: ['法考', '民法'], uploaderId: 'u_lulu', type: 'pdf', size: 690000, downloads: 87 },
        { title: 'CPA·会计 长期股权投资 专题突破', desc: '长投 + 合并报表一体化讲义，附例题。', major: '会计学', field: 'cpa', tags: ['CPA', '会计'], uploaderId: 'u_ming', type: 'pdf', size: 1100000, downloads: 76 },
        { title: '国考·行测 数量关系 秒杀技巧', desc: '12 大题型、22 个核心公式，配真题演练。', major: '其他', field: 'gwy', tags: ['公务员', '行测'], uploaderId: 'u_lulu', type: 'docx', size: 480000, downloads: 145 },
        { title: '计算机考研·数据结构 1800 题', desc: '选择题 + 应用题 + 算法设计题，按章节分类。', major: '计算机科学与技术', field: 'kaoyan', tags: ['考研', '数据结构', '刷题'], uploaderId: 'u_ming', type: 'pdf', size: 2100000, downloads: 312 },
        { title: '汉语言文学·现代文学三十年 复习笔记', desc: '按作家 + 流派整理，附作品分析。', major: '汉语言文学', field: 'exam', tags: ['现当代文学', '笔记'], uploaderId: 'u_lulu', type: 'docx', size: 760000, downloads: 64 },
        { title: '雅思口语·Part 2 话题库 + 范例', desc: '2025 年 1-4 月换题季全部话题，含 8 分范例。', major: '英语', field: 'ielts', tags: ['雅思', '口语'], uploaderId: 'u_ming', type: 'pdf', size: 1200000, downloads: 178 }
      ];
      const list = samples.map((s, i) => ({
        id: 'r_' + (i + 1),
        title: s.title, desc: s.desc,
        major: s.major, field: s.field,
        tags: s.tags, type: s.type, size: s.size,
        fileName: s.title + '.' + s.type,
        fileData: null,
        thumb: iconThumb(s.type),
        uploaderId: s.uploaderId,
        createdAt: Date.now() - (i + 1) * 86400000 / 2,
        downloads: s.downloads
      }));
      set(LS.RESOURCES, list);

      // 楼中楼示例评论
      const cmts = [
        // r_1 资料评论（带回复）
        { id: 'c1', resourceId: 'r_1', userId: 'u_ming', content: '排版很清晰，复习效率 up！', createdAt: Date.now() - 86400000 * 2 },
        { id: 'c2', resourceId: 'r_1', userId: 'u_lulu', parentId: 'c1', replyToUserId: 'u_ming', replyToUserName: '小明同学', content: '哈哈有用就好~有其他需要随时戳我', createdAt: Date.now() - 86400000 * 1.8 },
        { id: 'c3', resourceId: 'r_1', userId: 'u_demo', content: '已收藏，谢谢学姐～', createdAt: Date.now() - 3600 * 1000 },
        { id: 'c4', resourceId: 'r_1', userId: 'u_ming', parentId: 'c3', replyToUserId: 'u_demo', replyToUserName: '体验同学', content: '@体验同学 同道中人～', createdAt: Date.now() - 1800 * 1000 },
        // r_3 资料评论
        { id: 'c5', resourceId: 'r_3', userId: 'u_ming', content: '救命稻草般的提纲。', createdAt: Date.now() - 7200 * 1000 },
        { id: 'c6', resourceId: 'r_3', userId: 'u_lulu', parentId: 'c5', replyToUserId: 'u_ming', replyToUserName: '小明同学', content: '加油加油！', createdAt: Date.now() - 3600 * 1000 },
        // r_5 资料评论
        { id: 'c7', resourceId: 'r_5', userId: 'u_demo', content: '评论写得真犀利，学到了。', createdAt: Date.now() - 1800 * 1000 },
        { id: 'c8', resourceId: 'r_5', userId: 'u_ming', content: '求更新范文！', createdAt: Date.now() - 600 * 1000 },
        // r_9 教资资料
        { id: 'c9', resourceId: 'r_9', userId: 'u_demo', content: '教资党路过，感谢分享！', createdAt: Date.now() - 43200 * 1000 },
        { id: 'c10', resourceId: 'r_9', userId: 'u_lulu', parentId: 'c9', replyToUserId: 'u_demo', replyToUserName: '体验同学', content: '祝一次过～', createdAt: Date.now() - 40000 * 1000 }
      ];
      set(LS.COMMENTS, cmts);
      set(LS.COMMENT_LIKES, { c1: ['u_lulu','u_demo'], c2: ['u_demo','u_ming'], c3: ['u_ming'], c5: ['u_lulu','u_demo'], c7: ['u_ming'] });
      set(LS.LIKES, { 'r_1': ['u_ming','u_demo'], 'r_3': ['u_lulu','u_ming','u_demo'], 'r_5': ['u_demo'] });
      set(LS.FAVS, { u_demo: ['r_1', 'r_3'] });

      // 示例通知
      const notifs = [
        { id: 'n1', toUserId: 'u_ming', fromUserId: 'u_lulu', type: 'reply', resourceId: 'r_1', resourceTitle: '新闻学概论·第三章 重点笔记', commentId: 'c2', snippet: '哈哈有用就好~有其他需要随时戳我', createdAt: Date.now() - 86400000 * 1.8, read: false },
        { id: 'n2', toUserId: 'u_demo', fromUserId: 'u_ming', type: 'reply', resourceId: 'r_1', resourceTitle: '新闻学概论·第三章 重点笔记', commentId: 'c4', snippet: '@体验同学 同道中人～', createdAt: Date.now() - 1800 * 1000, read: false }
      ];
      set(LS.NOTIFS, notifs);
    }

    // 注入官方权威资料（如有 AUTHORITATIVE_RESOURCES）
    if (window.AUTHORITATIVE_RESOURCES && Array.isArray(window.AUTHORITATIVE_RESOURCES)) {
      // 根据专业自动推断领域
      const majorToField = (major) => {
        const mapping = {
          '考研': 'kaoyan',
          '考公': 'gwy',
          '四六级': 'cet',
          '教资': 'jiaozi',
          '会计': 'cpa',
          '法考': 'fakao',
          '医学': 'medical',
          '计算机': 'computer',
          '语言': 'ielts',
          '新闻学': 'other',
          '汉语言文学': 'other',
          '广告学': 'other',
          '金融学': 'other',
          '心理学': 'other',
          '教育学': 'teacher',
          '数学': 'other',
          '英语': 'cet',
          '工商管理': 'other',
          '护理学': 'medical',
          '软件工程': 'computer',
          '人工智能': 'computer',
          '广播电视学': 'other',
          '综合': 'other'
        };
        return mapping[major] || 'other';
      };
      
      const existingUrls = new Set((get(LS.RESOURCES, []) || []).map(r => r.url).filter(Boolean));
      window.AUTHORITATIVE_RESOURCES.forEach(item => {
        if (!item.url || existingUrls.has(item.url)) return;
        existingUrls.add(item.url);
        // 自动添加 field 字段
        const field = item.field || majorToField(item.major);
        // 标准化入库（链接类型）
        const r = Feed.normalizeOne({
          ...item,
          field: field,
          type: 'link',
          uploaderId: 'u_official',
          uploaderName: '官方权威',
          createdAt: Date.now() - Math.floor(Math.random() * 86400000 * 5)
        });
        if (r) Resource.add(r);
      });
    }

    localStorage.setItem(LS.SEEDED, 'sxsx.seeded.v10');
  }

  /* =========================================================
     渲染
     ========================================================= */
  const App = {
    state: { view: 'home', major: '全部', field: 'all', keyword: '', sort: 'latest', profileTab: 'uploads', currentMapId: 'kaoyan-zhengzhi' },

    init() {
      seedIfNeeded();
      this.bindNav();
      this.bindSearch();
      this.bindUpload();
      this.bindAuth();
      this.bindFeed();
      this.bindMobileNav();
      this.bindHashRoute();
      this.renderUserArea();
      this.renderHome();
    },

    /* 顶部导航 */
    bindNav() {
      $$('#topNav .nav-item').forEach(b => {
        b.addEventListener('click', () => this.go(b.dataset.view));
      });
    },
    /* 底部移动导航 */
    bindMobileNav() {
      $$('.nav-item-mobile').forEach(b => {
        b.addEventListener('click', () => this.go(b.dataset.view));
      });
    },

    go(view, params) {
      // 别名：upload → donate（统一"投喂"）
      if (view === 'upload') view = 'donate';
      // 别名：mindmapEditor → mindmap-editor（HTML 容器 ID 用连字符）
      if (view === 'mindmapEditor') view = 'mindmap-editor';
      this.state.view = view;
      this.state.params = params;
      $$('.view').forEach(v => v.classList.remove('active'));
      const el = $('#view-' + view);
      if (el) el.classList.add('active');
      $$('#topNav .nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
      $$('.nav-item-mobile').forEach(n => n.classList.toggle('active', n.dataset.view === view));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.reRender();
      if (view === 'detail' && params) location.hash = '#/r/' + params;
      else if (view === 'library') location.hash = '#/library';
      else if (view === 'profile') location.hash = '#/me';
      else if (view === 'donate') location.hash = '#/donate';
      else if (view === 'feed') location.hash = '#/feed';
      else if (view === 'mindmap') location.hash = '#/mindmap';
      else if (view === 'mindmapEditor') location.hash = '#/mindmap/editor';
      else location.hash = '';
    },
    bindHashRoute() {
      window.addEventListener('hashchange', () => this.handleHash());
      this.handleHash();
    },
    handleHash() {
      const h = location.hash || '';
      if (h.startsWith('#/r/')) this.go('detail', h.slice(4));
      else if (h === '#/library') this.go('library');
      else if (h === '#/me') this.requireAuth(() => this.go('profile'));
      else if (h === '#/upload' || h === '#/donate') this.requireAuth(() => this.go('donate'));
      else if (h === '#/feed') this.go('feed');
      else if (h === '#/mindmap') this.go('mindmap');
      else if (h === '#/mindmap/editor') this.requireAuth(() => this.go('mindmapEditor'));
      else this.go('home');
    },

    /* 搜索 */
    bindSearch() {
      const input = $('#libSearch');
      if (!input) return;
      let t;
      input.addEventListener('input', e => {
        clearTimeout(t);
        t = setTimeout(() => { this.state.keyword = e.target.value.trim().toLowerCase(); this.renderLibrary(); }, 200);
      });
    },

    /* 专业 / 领域双维度筛选 */
    renderCategoryTabs() {
      const majors = ['全部', ...Dict.majors()];
      const fields = Dict.fields();
      const tabs = $('#categoryTabs');
      if (!tabs) return;
      // 领域（核心筛选）
      const fHtml = `<div class="flex items-center gap-2 mr-2 text-xs text-slate-500 font-medium">🎯 领域：</div>` +
        fields.map(f =>
          `<button data-field="${f.id}" class="badge ${this.state.field === f.id ? 'badge-field shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} transition">${f.icon} ${escapeHtml(f.name)}</button>`
        ).join('');
      const mHtml = `<div class="w-full basis-full h-0"></div><div class="flex items-center gap-2 mr-2 text-xs text-slate-500 font-medium">📚 专业：</div>` +
        majors.map(m =>
          `<button data-major="${escapeHtml(m)}" class="badge ${this.state.major === m ? 'badge-major shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} transition">${escapeHtml(m)}</button>`
        ).join('');
      tabs.innerHTML = fHtml + mHtml;
      tabs.querySelectorAll('[data-field]').forEach(b => {
        b.addEventListener('click', () => { this.state.field = b.dataset.field; this.renderCategoryTabs(); this.renderLibrary(); });
      });
      tabs.querySelectorAll('[data-major]').forEach(b => {
        b.addEventListener('click', () => { this.state.major = b.dataset.major; this.renderCategoryTabs(); this.renderLibrary(); });
      });
    },

    /* 资料库侧边栏分类树 */
    renderLibrarySidebar() {
      const tree = $('#categoryTree');
      if (!tree) return;
      const all = Resource.all();
      let html = '';
      LIBRARY_CATEGORIES.forEach((group, gi) => {
        html += `<div class="mb-3">
          <div class="font-semibold text-xs text-slate-500 mb-1.5 flex items-center gap-1 cursor-pointer sidebar-group-toggle" data-group="${gi}">
            <span class="sidebar-arrow ${group.expanded ? 'rotate-90' : ''} transition-transform">▶</span>
            ${group.label}
          </div>
          <div class="sidebar-group-children ${group.expanded ? '' : 'hidden'} ml-1 space-y-0.5">`;
        group.children.forEach((item, ci) => {
          const isActive = item.filter.field ? this.state.field === item.filter.field :
                           item.filter.sort ? this.state.sort === item.filter.sort :
                           item.filter.credibility ? this.state.credibility === item.filter.credibility :
                           item.filter.type ? this.state.type === item.filter.type : false;
          html += `<div class="sidebar-item ${isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-slate-50 text-slate-600'} rounded-lg px-2 py-1 cursor-pointer text-xs flex items-center gap-1.5 transition" data-group="${gi}" data-index="${ci}">
            <span>${item.label.split(' ')[0]}</span>
            <span class="truncate">${item.label.split(' ').slice(1).join(' ')}</span>
          </div>`;
        });
        html += `</div></div>`;
      });
      tree.innerHTML = html;
      // 分组折叠/展开
      tree.querySelectorAll('.sidebar-group-toggle').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.group);
          LIBRARY_CATEGORIES[idx].expanded = !LIBRARY_CATEGORIES[idx].expanded;
          this.renderLibrarySidebar();
        });
      });
      // 分类项点击
      tree.querySelectorAll('.sidebar-item').forEach(el => {
        el.addEventListener('click', () => {
          const gi = parseInt(el.dataset.group);
          const ci = parseInt(el.dataset.index);
          const item = LIBRARY_CATEGORIES[gi].children[ci];
          // 重置其他筛选，应用当前筛选
          this.state.field = 'all';
          this.state.major = '全部';
          this.state.credibility = null;
          this.state.type = null;
          this.state.sort = null;
          if (item.filter.field) this.state.field = item.filter.field;
          if (item.filter.credibility) this.state.credibility = item.filter.credibility;
          if (item.filter.type) this.state.type = item.filter.type;
          if (item.filter.sort) this.state.sort = item.filter.sort;
          this.renderCategoryTabs();
          this.renderLibrary();
          this.renderLibrarySidebar();
        });
      });
    },

    /* 用户区 */
    renderUserArea() {
      const u = currentUser();
      const el = $('#userArea');
      if (!el) return;
      if (u) {
        const unread = Notification.unreadCount(u.id);
        const badge = unread > 0
          ? `<span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow">${unread > 99 ? '99+' : unread}</span>`
          : '';
        el.innerHTML = `
          <button onclick="App.go('feed')" class="relative w-9 h-9 rounded-full hover:bg-white/60 flex items-center justify-center" title="动态/通知">
            <span class="text-xl">🔔</span>
            ${badge}
          </button>
          <button onclick="App.requireAuth(()=>App.go('profile'))" class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/60">
            <div class="w-7 h-7 rounded-full text-white text-xs flex items-center justify-center font-semibold overflow-hidden" style="background:linear-gradient(135deg,#5cc56a,#34bcd6,#7a5cd9);">${u.avatar ? escapeHtml(u.avatar) : escapeHtml((u.name || u.account).slice(0,1))}</div>
            <span class="text-sm text-slate-700">${escapeHtml(u.nickname || u.name || u.account)}</span>
          </button>
          <button onclick="App.requireAuth(()=>App.go('profile'))" class="md:hidden w-9 h-9 rounded-full text-white text-xs flex items-center justify-center font-semibold overflow-hidden" style="background:linear-gradient(135deg,#5cc56a,#34bcd6,#7a5cd9);">${u.avatar ? escapeHtml(u.avatar) : escapeHtml((u.name || u.account).slice(0,1))}</button>
        `;
      } else {
        el.innerHTML = `
          <button onclick="Auth.open('login')" class="hidden md:inline-block btn-ghost text-sm">登录</button>
          <button onclick="Auth.open('register')" class="btn-grad text-sm">注册</button>
        `;
      }
    },
    requireAuth(cb) {
      if (currentUser()) return cb && cb();
      Auth.open('login');
      toast('请先登录');
    },

    /* ============ 渲染：首页 ============ */
    renderHome() {
      const all = Resource.all();
      const users = get(LS.USERS, []);
      const totalDownloads = all.reduce((s, r) => s + (r.downloads || 0), 0);
      const official = all.filter(r => r.credibility === '官方').length;
      const fields = Dict.fields().length - 1;
      // 数字角标
      const s1 = $('#statResources'); if (s1) s1.textContent = all.length;
      const s2 = $('#statOfficial'); if (s2) s2.textContent = official;
      const s3 = $('#statFields'); if (s3) s3.textContent = fields;
      const s4 = $('#statDownloads'); if (s4) s4.textContent = totalDownloads;

      // 推荐官方权威资料（取前 6 个）
      const featured = all.filter(r => r.credibility === '官方').slice(0, 6);
      const f = $('#featuredResources');
      if (f) {
        f.innerHTML = featured.length ? featured.map(r => officialResourceCardHtml(r)).join('') :
          '<div class="col-span-full text-center text-slate-400 py-10">暂无推荐资料</div>';
        f.querySelectorAll('.resource-card').forEach(c => c.addEventListener('click', () => this.go('detail', c.dataset.id)));
      }

      // 今日热门 Top 5
      this.renderDailyHot();
    },

    renderDailyHot() {
      const el = $('#dailyHot');
      if (!el) return;
      const list = Hot.today(5);
      if (!list.length) {
        el.innerHTML = '<div class="text-center text-slate-400 py-6 text-sm">今天还没有互动哦，去 <a href="javascript:void(0)" onclick="App.go(\'library\')" class="text-brand-600 font-medium">资料库</a> 看看 →</div>';
        return;
      }
      el.innerHTML = `
        <div class="space-y-2.5">
          ${list.map((r, i) => `
            <div class="hot-row flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border border-transparent hover:border-brand-200 hover:bg-brand-50/40" data-id="${r.id}">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-base flex-shrink-0
                ${i === 0 ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-300/40' :
                  i === 1 ? 'bg-gradient-to-br from-orange-400 to-amber-500 shadow-md' :
                  i === 2 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' :
                  'bg-gradient-to-br from-slate-300 to-slate-400'}">
                ${i + 1}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate text-slate-700">${escapeHtml(r.title)}</div>
                <div class="text-xs text-slate-400 mt-0.5">
                  <span class="badge badge-major" style="font-size:10px;padding:1px 6px">${escapeHtml(r.major || '')}</span>
                  <span class="ml-1">❤ ${Like.count(r.id)}</span>
                  <span class="ml-2">⬇ ${r.downloads || 0}</span>
                </div>
              </div>
              <div class="text-lg">${i < 3 ? '🔥' : '⭐'}</div>
            </div>
          `).join('')}
        </div>`;
      el.querySelectorAll('.hot-row').forEach(c => c.addEventListener('click', () => this.go('detail', c.dataset.id)));
    },

    /* ============ 渲染：资料库 ============ */
    renderLibrary() {
      this.renderLibrarySidebar();
      const tabs = $('#categoryTabs');
      if (tabs && !tabs.children.length) this.renderCategoryTabs();
      let list = Resource.all();
      if (this.state.major && this.state.major !== '全部') {
        list = list.filter(r => r.major === this.state.major);
      }
      if (this.state.field && this.state.field !== 'all') {
        list = list.filter(r => r.field === this.state.field);
      }
      if (this.state.credibility) {
        list = list.filter(r => r.credibility === this.state.credibility);
      }
      if (this.state.type) {
        list = list.filter(r => r.type === this.state.type);
      }
      if (this.state.keyword) {
        const kw = this.state.keyword;
        list = list.filter(r =>
          (r.title + ' ' + r.desc + ' ' + (r.major || '') + ' ' + (r.tags || []).join(' ')).toLowerCase().includes(kw)
        );
      }
      if (this.state.sort === 'hot') list.sort((a, b) => Like.count(b.id) - Like.count(a.id));
      else if (this.state.sort === 'downloads') list.sort((a, b) => (b.downloads||0) - (a.downloads||0));
      else if (this.state.sort === 'new') list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const g = $('#resourceGrid');
      if (!g) return;
      g.innerHTML = list.length
        ? list.map(r => r.credibility === '官方' ? officialResourceCardHtml(r) : resourceCardHtml(r)).join('')
        : '<div class="col-span-full text-center text-slate-400 py-12">没有匹配的资料，换个筛选条件试试～</div>';
      g.querySelectorAll('.resource-card').forEach(c => c.addEventListener('click', () => this.go('detail', c.dataset.id)));
    },

    /* ============ 渲染：官方权威网址导航 ============ */
    renderOfficial() {
      const el = $('#view-official');
      if (!el) return;
      const resources = window.AUTHORITATIVE_RESOURCES || [];
      // 按专业分组
      const grouped = {};
      resources.forEach(r => {
        const major = r.major || '综合';
        if (!grouped[major]) grouped[major] = [];
        grouped[major].push(r);
      });
      // 分组顺序
      const order = ['考研', '考公', '四六级', '教资', '会计', '法考', '计算机', '医学', '语言', '新闻学', '教育学', '心理学', '金融学', '工商管理', '汉语言文学', '广告学', '电子信息', '建筑工程', '护理学', '软件工程', '人工智能', '广播电视学', '数学与应用数学', '英语', '综合'];
      const sortedGroups = [];
      order.forEach(key => {
        if (grouped[key]) sortedGroups.push({ major: key, items: grouped[key] });
      });
      // 补齐未列出的专业
      Object.keys(grouped).forEach(key => {
        if (!order.includes(key)) sortedGroups.push({ major: key, items: grouped[key] });
      });

      el.innerHTML = `
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gradient mb-2">🌐 官方权威网址导航</h2>
          <p class="text-sm text-slate-500">收录各大考试、各学科官方权威网站，点击即可直达。所有链接均经过人工核对，确保安全可靠。</p>
        </div>
        <div class="space-y-6">
          ${sortedGroups.map(g => `
            <div class="card p-5">
              <h3 class="font-bold text-lg mb-3 flex items-center gap-2">
                <span class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style="background:linear-gradient(135deg,#5cc56a,#34bcd6);">${g.major.charAt(0)}</span>
                ${g.major}
                <span class="text-xs text-slate-400 font-normal ml-1">（${g.items.length} 个）</span>
              </h3>
              <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                ${g.items.map(r => `
                  <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand-300 hover:bg-brand-50/30 transition group">
                    <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-100 to-sky-100 flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition">🔗</div>
                    <div class="min-w-0">
                      <div class="font-medium text-sm text-slate-800 group-hover:text-brand-700 transition line-clamp-1">${escapeHtml(r.title)}</div>
                      <div class="text-xs text-slate-500 mt-0.5 line-clamp-2">${escapeHtml(r.desc)}</div>
                      <div class="flex flex-wrap gap-1 mt-1.5">
                        ${(r.tags || []).slice(0, 3).map(t => `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">${escapeHtml(t)}</span>`).join('')}
                      </div>
                    </div>
                  </a>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="mt-6 text-center">
          <p class="text-xs text-slate-400">💡 提示：如果你有好的官方权威网址推荐，欢迎通过"投喂"功能分享给大家！</p>
        </div>
      `;
    },

    /* ============ 渲染：思维导图（多学科精细化） ============ */
    renderMindmap() {
      const svg = $('#mindmapSvg');
      const subject = window.SUBJECT_MAPS || [];
      if (!svg || !subject.length) return;
      const id = this.state.currentMapId || subject[0].id;
      const map = subject.find(m => m.id === id) || subject[0];

      // 渲染学科选择器
      const sel = $('#subjectSelector');
      if (sel) {
        sel.innerHTML = subject.map(m => `
          <button class="subj-chip ${m.id === map.id ? 'active' : ''}" data-id="${m.id}"
                  style="${m.id === map.id ? 'background:' + m.color + ';color:#fff;border-color:' + m.color : ''}">
            ${m.icon} ${m.label}
          </button>
        `).join('');
        sel.querySelectorAll('.subj-chip').forEach(b => {
          b.addEventListener('click', () => {
            this.state.currentMapId = b.dataset.id;
            this.renderMindmap();
          });
        });
      }

      // 渲染用户自绘列表入口
      const me = currentUser();
      const myMaps = me ? get(LS.USER_MINDMAPS, []).filter(m => m.userId === me.id) : [];
      const myMapsBar = $('#myMindmapsBar');
      if (myMapsBar) {
        myMapsBar.innerHTML = `
          <div class="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
            <span>🖌️ 我的导图：</span>
            ${myMaps.length ? myMaps.slice(0, 5).map(m => `<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${escapeHtml(m.title)}</span>`).join('') : '<span class="text-slate-400">还没有，去绘制一个吧～</span>'}
            <button onclick="${me ? "App.go('mindmapEditor')" : "Auth.open('login')"}" class="ml-auto btn-ghost text-xs">${me ? '+ 新建/管理' : '🔒 登录后绘制'}</button>
          </div>`;
      }

      this.drawRadialMindmap(svg, map);
    },

    /* 径向思维导图：根在中央，1 级节点在外圈，2 级节点在外外圈 */
    drawRadialMindmap(svg, map) {
      svg.innerHTML = '';
      const W = 1200, H = 800;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      const cx = W / 2, cy = H / 2;
      const root = map.root;
      const rootColor = map.color;
      const r1 = 220;  // 一级节点半径
      const r2 = 360;  // 二级节点半径

      // 中心：根节点
      svg.appendChild(this.mindCenterNodeEl(cx, cy, root.label, map.icon, rootColor));

      const firstLevel = root.children;
      const n1 = firstLevel.length;
      const angle1 = (i) => -Math.PI / 2 + (2 * Math.PI / n1) * i;
      firstLevel.forEach((c1, i) => {
        const a1 = angle1(i);
        const x1 = cx + r1 * Math.cos(a1);
        const y1 = cy + r1 * Math.sin(a1);
        // 边
        const edge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        edge.setAttribute('d', `M${cx},${cy} L${x1},${y1}`);
        edge.setAttribute('stroke', c1.color || rootColor);
        edge.setAttribute('stroke-width', '2');
        edge.setAttribute('opacity', '.5');
        edge.setAttribute('fill', 'none');
        edge.classList.add('mind-edge');
        svg.appendChild(edge);

        // 一级节点
        svg.appendChild(this.mindBranchNodeEl(x1, y1, c1.label, c1.icon, c1.color || rootColor));

        // 二级节点
        if (c1.children && c1.children.length) {
          const c2Count = c1.children.length;
          const spread = Math.min(Math.PI / 1.6, Math.PI * 0.9);
          c1.children.forEach((c2, j) => {
            const t = c2Count === 1 ? 0 : (j / (c2Count - 1) - 0.5);
            const a2 = a1 + t * spread;
            const x2 = cx + r2 * Math.cos(a2);
            const y2 = cy + r2 * Math.sin(a2);
            // 边
            const e2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            e2.setAttribute('d', `M${x1},${y1} L${x2},${y2}`);
            e2.setAttribute('stroke', c1.color || rootColor);
            e2.setAttribute('stroke-width', '1.2');
            e2.setAttribute('opacity', '.4');
            e2.setAttribute('fill', 'none');
            e2.classList.add('mind-edge');
            svg.appendChild(e2);
            // 节点
            svg.appendChild(this.mindLeafNodeEl(x2, y2, c2.label, c1.color || rootColor, a2));
          });
        }
      });
    },

    mindCenterNodeEl(x, y, label, icon, color) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${x},${y})`);
      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo.setAttribute('r', '70'); halo.setAttribute('fill', color); halo.setAttribute('opacity', '.08');
      g.appendChild(halo);
      const halo2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo2.setAttribute('r', '54'); halo2.setAttribute('fill', color); halo2.setAttribute('opacity', '.15');
      g.appendChild(halo2);
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', '42'); c.setAttribute('fill', color); c.classList.add('mind-node');
      g.appendChild(c);
      const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('y', -2); t1.setAttribute('font-size', '20');
      t1.textContent = icon || '📚'; g.appendChild(t1);
      const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('y', 18); t2.setAttribute('font-size', '14');
      t2.setAttribute('font-weight', '700'); t2.setAttribute('fill', '#fff'); t2.textContent = label;
      g.appendChild(t2);
      return g;
    },

    mindBranchNodeEl(x, y, label, icon, color) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${x},${y})`);
      // 智能断行
      const lines = this.splitLabel(label, 7);
      const w = 95, rh = lines.length > 1 ? 30 : 24;
      // 阴影
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      s.setAttribute('x', -w); s.setAttribute('y', -rh); s.setAttribute('width', w*2); s.setAttribute('height', rh*2);
      s.setAttribute('rx', 14); s.setAttribute('fill', color); s.setAttribute('opacity', '.12');
      g.appendChild(s);
      // 主体
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', -w); r.setAttribute('y', -rh); r.setAttribute('width', w*2); r.setAttribute('height', rh*2);
      r.setAttribute('rx', 14); r.setAttribute('fill', '#fff');
      r.setAttribute('stroke', color); r.setAttribute('stroke-width', '2');
      r.classList.add('mind-node');
      g.appendChild(r);
      // 左侧色块
      const accent = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      accent.setAttribute('x', -w); accent.setAttribute('y', -rh);
      accent.setAttribute('width', '4'); accent.setAttribute('height', rh*2);
      accent.setAttribute('rx', 2); accent.setAttribute('fill', color);
      g.appendChild(accent);
      // 文字：icon + label
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('text-anchor', 'middle');
      const offsetY = lines.length > 1 ? 2 : 1;
      t.setAttribute('y', offsetY);
      lines.forEach((line, idx) => {
        const ti = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        ti.setAttribute('x', 0);
        ti.setAttribute('dy', idx === 0 ? (idx === 0 && icon ? 0 : 0) : '1.1em');
        if (idx === 0 && icon) {
          ti.setAttribute('dy', '-0.4em');
          ti.setAttribute('font-size', '13');
          ti.textContent = icon + ' ';
        }
        ti.setAttribute('font-size', '12'); ti.setAttribute('font-weight', '600'); ti.setAttribute('fill', color);
        ti.textContent = (idx === 0 && icon ? '' : '') + line;
        t.appendChild(ti);
      });
      g.appendChild(t);
      // 简化：如果只有一行
      if (lines.length === 1) {
        t.innerHTML = '';
        const ti = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        ti.setAttribute('font-size', '13'); ti.setAttribute('font-weight', '600'); ti.setAttribute('fill', color);
        ti.textContent = (icon ? icon + ' ' : '') + label;
        t.appendChild(ti);
        t.setAttribute('y', 5);
      } else {
        t.setAttribute('y', 0);
      }
      return g;
    },

    mindLeafNodeEl(x, y, label, color, angle) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${x},${y})`);
      const lines = this.splitLabel(label, 8);
      const w = 90, h = lines.length > 1 ? 26 : 18;
      // 圆角矩形
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', -w); r.setAttribute('y', -h); r.setAttribute('width', w*2); r.setAttribute('height', h*2);
      r.setAttribute('rx', h); r.setAttribute('fill', '#fff');
      r.setAttribute('stroke', color); r.setAttribute('stroke-width', '1.2');
      r.setAttribute('opacity', '.95');
      r.classList.add('mind-node');
      g.appendChild(r);
      // 文字
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('y', lines.length > 1 ? 2 : 4);
      lines.forEach((line, idx) => {
        const ti = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        ti.setAttribute('x', 0); ti.setAttribute('dy', idx === 0 ? '0' : '1.1em');
        ti.setAttribute('font-size', '10.5'); ti.setAttribute('fill', '#475569');
        ti.textContent = line;
        t.appendChild(ti);
      });
      g.appendChild(t);
      return g;
    },

    splitLabel(label, maxLen) {
      if (!label) return [''];
      if (label.length <= maxLen) return [label];
      // 找最近的标点或中点
      let cut = Math.ceil(label.length / 2);
      for (let k = cut; k > cut - 3 && k < label.length; k++) {
        if (/[、 （(：:，,）)]/.test(label[k])) { cut = k + 1; break; }
      }
      const first = label.slice(0, cut);
      const second = label.slice(cut);
      // 递归
      if (first.length > maxLen) return this.splitLabel(first, maxLen);
      if (second.length > maxLen * 2) {
        const sub = this.splitLabel(second, maxLen);
        return [first, ...sub];
      }
      return second ? [first, second] : [first];
    },

    mindEdgeEl(d, color) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d); p.setAttribute('fill', 'none');
      p.setAttribute('stroke', color); p.setAttribute('stroke-width', '1.8');
      p.setAttribute('opacity', '.55');
      p.classList.add('mind-edge');
      return p;
    },

    /* ============ 渲染：详情 ============ */
    renderDetail(id) {
      const r = Resource.byId(id);
      const el = $('#view-detail');
      if (!el) return;
      if (!r) {
        el.innerHTML = '<div class="text-center text-slate-400 py-20">资料不存在或已被删除</div>';
        return;
      }
      const uploader = get(LS.USERS, []).find(u => u.id === r.uploaderId);
      const me = currentUser();
      const liked = me ? Like.isLiked(r.id, me.id) : false;
      const faved = me ? Fav.has(r.id, me.id) : false;
      const { top: topComments, replies: repliesMap } = Comment.tree(r.id);
      const allCmtsCount = topComments.reduce((acc, c) => acc + 1 + ((repliesMap[c.id] || []).length), 0);

      /* 评论渲染：单条评论（含回复列表） */
      function renderComment(c, isReply = false) {
        const cu = get(LS.USERS, []).find(u => u.id === c.userId);
        const cLiked = me ? Comment.isLiked(c.id, me.id) : false;
        const cLikes = Comment.likeCount(c.id);
        const childReplies = repliesMap[c.id] || [];
        const childHtml = childReplies.map(rc => renderComment(rc, true)).join('');
        const replyHint = c.replyToUserName ? `<span class="text-brand-600 font-medium">@${escapeHtml(c.replyToUserName)}</span> ` : '';
        const indentClass = isReply ? 'ml-8 pl-3 border-l-2 border-brand-200' : '';
        const cAvatarBg = isReply ? 'from-lilac-300 to-sky-300' : 'from-mint-400 to-sky-400';
        const cAvatarStyle = `background:linear-gradient(135deg,${isReply ? '#cfb8ff,#b3edff' : '#a8f08b,#82f0f9'});`;

        return `
          <div class="py-3 ${indentClass}" data-cid="${c.id}">
            <div class="flex gap-3">
              <div class="w-8 h-8 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0 overflow-hidden" style="${cAvatarStyle}">${cu?.avatar ? escapeHtml(cu.avatar) : escapeHtml((cu?.name || '?').slice(0,1))}</div>
              <div class="flex-1 min-w-0">
                <div class="text-sm flex items-center gap-2 flex-wrap">
                  <span class="font-medium text-slate-700">${escapeHtml(cu?.name || '匿名')}</span>
                  <span class="text-xs text-slate-400">${fmtTime(c.createdAt)}</span>
                </div>
                <div class="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-words leading-relaxed">${replyHint}${formatContent(c.content)}</div>
                <div class="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <button class="comment-action comment-like ${cLiked ? 'text-pink-500' : 'hover:text-pink-500'}" data-cid="${c.id}">
                    <span>${cLiked ? '❤' : '♡'}</span><span>${cLikes > 0 ? ' ' + cLikes : ' 点赞'}</span>
                  </button>
                  <button class="comment-action comment-reply hover:text-brand-500" data-cid="${c.id}" data-cname="${escapeHtml(cu?.name || '匿名')}">
                    <span>💬</span><span>回复</span>
                  </button>
                </div>
              </div>
            </div>
            ${childHtml ? `<div class="mt-1">${childHtml}</div>` : ''}
          </div>`;
      }
      const commentListHtml = topComments.length
        ? topComments.map(c => renderComment(c, false)).join('')
        : '<div class="py-6 text-sm text-slate-400 text-center">还没有评论，来抢沙发～</div>';

      const fileTypeBadge = { pdf: 'bg-red-100 text-red-700', docx: 'bg-blue-100 text-blue-700', image: 'bg-emerald-100 text-emerald-700', link: 'bg-purple-100 text-purple-700' }[r.type] || 'bg-slate-100 text-slate-600';
      const fieldInfo = Dict.fields().find(f => f.id === r.field);
      const fieldName = fieldInfo ? (fieldInfo.icon + ' ' + fieldInfo.name) : r.field;

      // 来源卡片（官方权威资料）
      const isOfficial = r.credibility === '官方';
      const sourceCard = (isOfficial && r.sourceName) ? `
        <div class="mt-4 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
          <div class="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-2">
            <span class="text-base">${escapeHtml(r.sourceIcon || '✅')}</span>
            <span>官方权威出处</span>
          </div>
          <div class="text-sm font-medium text-slate-700">${escapeHtml(r.sourceName)}</div>
          <a href="${escapeHtml(r.url || r.sourceUrl)}" target="_blank" rel="noopener" class="source-link mt-2 inline-flex">
            🔗 打开官方页面 →
          </a>
        </div>
      ` : '';

      el.innerHTML = `
        <div class="grid md:grid-cols-3 gap-6">
          <div class="md:col-span-2 card overflow-hidden">
            <!-- 预览头部：tab + 工具栏 -->
            <div class="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/50">
              <div class="flex items-center gap-1 text-xs" id="previewTabs"></div>
              <div class="flex items-center gap-1">
                <button id="prevZoomOut" class="w-7 h-7 rounded hover:bg-slate-200 text-slate-500" title="缩小">−</button>
                <span id="prevZoomLvl" class="text-xs text-slate-500 w-10 text-center">100%</span>
                <button id="prevZoomIn" class="w-7 h-7 rounded hover:bg-slate-200 text-slate-500" title="放大">+</button>
                <button id="prevReset" class="w-7 h-7 rounded hover:bg-slate-200 text-slate-500" title="还原">↺</button>
                <button id="prevFull" class="w-7 h-7 rounded hover:bg-slate-200 text-slate-500" title="全屏">⛶</button>
              </div>
            </div>
            <!-- 预览主区 -->
            <div id="previewArea" class="aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden relative" style="min-height: 360px;">
              ${r.thumb ? `<img src="${r.thumb}" class="w-full h-full object-contain" alt="预览" id="previewImg" style="transition: transform 0.2s;"/>` : ''}
            </div>
            <div class="p-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span class="text-xs px-2 py-0.5 rounded ${fileTypeBadge}">${(r.type || '').toUpperCase()}</span>
              <span class="text-sm text-slate-700">${escapeHtml(r.fileName || r.title + '.' + r.type)}</span>
              <span class="text-xs text-slate-400">· ${fmtSize(r.size || 0)}</span>
              <div class="flex-1"></div>
              <button id="btnDownload" class="text-sm flex items-center gap-1 px-4 py-2 rounded-full text-white" style="background:linear-gradient(90deg,#5cc56a,#34bcd6,#7a5cd9);">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                ${r.type === 'link' ? '🔗 打开' : '⬇ 下载原文件'}
              </button>
            </div>
          </div>

          <div class="card p-5">
            <h1 class="text-lg font-semibold leading-snug">${escapeHtml(r.title)}</h1>
            <div class="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
              <span class="badge badge-major">📚 ${escapeHtml(r.major || '未分类')}</span>
              <span class="badge badge-field">${escapeHtml(fieldName)}</span>
              ${isOfficial ? '<span class="badge badge-official">✅ 官方权威</span>' : ''}
            </div>
            <div class="text-[11px] text-slate-400 mt-2">${fmtTime(r.createdAt)} · ${r.downloads || 0} 次浏览</div>
            <p class="text-sm text-slate-600 mt-3 leading-relaxed">${escapeHtml(r.desc) || '<span class="text-slate-400">暂无描述</span>'}</p>
            <div class="flex flex-wrap gap-1.5 mt-3">
              ${(r.tags || []).map(t => `<span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">#${escapeHtml(t)}</span>`).join('')}
            </div>
            ${sourceCard}

            <div class="mt-4 flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
              <div class="w-9 h-9 rounded-full text-white text-sm flex items-center justify-center overflow-hidden" style="background:linear-gradient(135deg,#5cc56a,#34bcd6,#7a5cd9);">${uploader?.avatar ? escapeHtml(uploader.avatar) : escapeHtml((uploader?.name || r.uploaderName || '?').slice(0,1))}</div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">${escapeHtml(uploader?.name || r.uploaderName || '匿名')}</div>
                <div class="text-xs text-slate-400 truncate">${escapeHtml(uploader?.bio || (r.uploaderName === '官方权威' ? '权威机构官方发布' : ''))}</div>
              </div>
            </div>

            <div class="mt-4 flex gap-2">
              <button id="btnLike" class="flex-1 py-2 text-sm rounded-full border ${liked ? 'border-pink-300 bg-pink-50 text-pink-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} flex items-center justify-center gap-1">
                <span>${liked ? '❤' : '♡'}</span><span id="likeCount">${Like.count(r.id)}</span>
              </button>
              <button id="btnFav" class="flex-1 py-2 text-sm rounded-full border ${faved ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} flex items-center justify-center gap-1">
                <span>${faved ? '★' : '☆'}</span><span>${faved ? '已收藏' : '收藏'}</span>
              </button>
              ${me && me.id === r.uploaderId
                ? `<button id="btnDelete" class="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-full border border-slate-200">删除</button>`
                : ''}
            </div>
          </div>
        </div>

        <div class="mt-6 card p-5">
          <h3 class="font-semibold mb-3 flex items-center gap-2">
            <span>💬 评论</span>
            <span class="text-sm text-slate-400">(${allCmtsCount})</span>
          </h3>
          <form id="commentForm" class="space-y-2">
            <input type="hidden" name="parentId" value="" id="cf-parentId" />
            <input type="hidden" name="replyToUserId" value="" id="cf-replyToUserId" />
            <input type="hidden" name="replyToUserName" value="" id="cf-replyToUserName" />
            <div id="replyHint" class="hidden text-xs text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg flex items-center justify-between">
              <span>正在回复 <b id="replyHintName"></b></span>
              <button type="button" id="cancelReply" class="text-slate-400 hover:text-slate-600">取消</button>
            </div>
            <div class="flex gap-2 items-start">
              <div class="w-8 h-8 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden" style="background:linear-gradient(135deg,#5cc56a,#34bcd6,#7a5cd9);">${me?.avatar ? escapeHtml(me.avatar) : escapeHtml((me?.name || '?').slice(0,1))}</div>
              <div class="flex-1 relative">
                <textarea name="content" required maxlength="500" rows="2" placeholder="${me ? '说点什么吧… 输入 @ 提醒他人' : '登录后参与评论'}"
                          class="w-full px-3 py-2 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none"
                          ${me ? '' : 'disabled'}></textarea>
                <div class="flex items-center justify-between mt-1.5">
                  <div class="flex items-center gap-1">
                    <button type="button" id="emojiBtn" class="text-lg hover:bg-slate-100 w-7 h-7 rounded-full flex items-center justify-center ${me ? '' : 'hidden'}" title="表情">😊</button>
                    <button type="button" id="atBtn" class="text-sm hover:bg-slate-100 px-2 h-7 rounded-full flex items-center justify-center text-slate-500 ${me ? '' : 'hidden'}" title>@ 提醒">@</button>
                    <span class="text-[10px] text-slate-300 ml-1" id="charCount">0/500</span>
                  </div>
                  <button type="submit" class="btn-grad text-xs px-4" ${me ? '' : 'disabled'}>发布</button>
                </div>
                <!-- 表情面板 -->
                <div id="emojiPanel" class="hidden absolute z-10 mt-1 p-2 bg-white border border-slate-200 shadow-lg rounded-xl w-72">
                  <div class="grid grid-cols-8 gap-1 text-xl" id="emojiGrid"></div>
                </div>
                <!-- @ 选择面板 -->
                <div id="atPanel" class="hidden absolute z-10 mt-1 p-2 bg-white border border-slate-200 shadow-lg rounded-xl w-56 max-h-60 overflow-y-auto"></div>
              </div>
            </div>
          </form>
          <div class="mt-4 divide-y divide-slate-100">${commentListHtml}</div>
        </div>
      `;

      $('#btnLike')?.addEventListener('click', () => {
        if (!me) return Auth.open('login');
        const likedNow = Like.toggle(r.id, me.id);
        $('#btnLike').className = 'flex-1 py-2 text-sm rounded-full border ' +
          (likedNow ? 'border-pink-300 bg-pink-50 text-pink-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50') +
          ' flex items-center justify-center gap-1';
        $('#btnLike').innerHTML = `<span>${likedNow ? '❤' : '♡'}</span><span id="likeCount">${Like.count(r.id)}</span>`;
        toast(likedNow ? '已点赞' : '已取消点赞');
      });
      $('#btnFav')?.addEventListener('click', () => {
        if (!me) return Auth.open('login');
        const favedNow = Fav.toggle(r.id, me.id);
        $('#btnFav').className = 'flex-1 py-2 text-sm rounded-full border ' +
          (favedNow ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50') +
          ' flex items-center justify-center gap-1';
        $('#btnFav').innerHTML = `<span>${favedNow ? '★' : '☆'}</span><span>${favedNow ? '已收藏' : '收藏'}</span>`;
        toast(favedNow ? '已加入收藏' : '已取消收藏');
      });
      $('#btnDownload')?.addEventListener('click', () => this.downloadResource(r));
      // ⭐ 升级后的预览：tab 切换 + 缩放 + 全屏 + DOCX/PDF/TXT 渲染
      this.bindPreviewEnhance(r);
      if (me && me.id === r.uploaderId) {
        $('#btnDelete')?.addEventListener('click', () => {
          if (confirm('确定要删除这份资料吗？此操作不可恢复。')) {
            Resource.remove(r.id);
            toast('已删除');
            this.go('library');
          }
        });
      }
      const cf = $('#commentForm');
      if (cf) {
        cf.addEventListener('submit', e => {
          e.preventDefault();
          if (!me) return Auth.open('login');
          const fd = new FormData(cf);
          const txt = (fd.get('content') || '').toString().trim();
          if (!txt) return;
          const parentId = (fd.get('parentId') || '').toString();
          const replyToUserId = (fd.get('replyToUserId') || '').toString();
          const replyToUserName = (fd.get('replyToUserName') || '').toString();
          const newCmt = {
            id: uid(), resourceId: r.id, userId: me.id, content: txt,
            parentId: parentId || null,
            replyToUserId: replyToUserId || null,
            replyToUserName: replyToUserName || null,
            createdAt: Date.now()
          };
          Comment.add(newCmt);
          Notification.pushFromComment(newCmt, r, me);
          toast(parentId ? '回复成功' : '评论已发布');
          this.renderDetail(r.id);
          this.renderUserArea();
        });

        // 字数统计
        const ta = cf.querySelector('textarea[name=content]');
        const cc = $('#charCount');
        ta?.addEventListener('input', () => { if (cc) cc.textContent = ta.value.length + '/500'; });

        // 表情选择器
        const emojiBtn = $('#emojiBtn');
        const emojiPanel = $('#emojiPanel');
        const emojiGrid = $('#emojiGrid');
        if (emojiGrid && !emojiGrid.dataset.built) {
          const emojis = ['😀','😂','🥰','😎','🤔','😢','😡','🤯','🥳','😴','🤩','😭','😱','🤗','😏','😬','👍','👎','👏','🙌','🤝','✌️','🤞','🙏','💪','🔥','✨','⭐','❤️','💔','🎉','🎊','📚','📖','✏️','📝','💡','🎓','🏆','🥇'];
          emojiGrid.innerHTML = emojis.map(e => `<button type="button" class="emoji-item hover:bg-slate-100 rounded p-1">${e}</button>`).join('');
          emojiGrid.dataset.built = '1';
          emojiGrid.addEventListener('click', e => {
            const btn = e.target.closest('.emoji-item');
            if (!btn) return;
            const start = ta.selectionStart, end = ta.selectionEnd;
            ta.value = ta.value.slice(0, start) + btn.textContent + ta.value.slice(end);
            ta.dispatchEvent(new Event('input'));
            ta.focus();
            ta.selectionStart = ta.selectionEnd = start + btn.textContent.length;
            emojiPanel.classList.add('hidden');
          });
        }
        emojiBtn?.addEventListener('click', () => {
          emojiPanel.classList.toggle('hidden');
          $('#atPanel')?.classList.add('hidden');
        });

        // @ 选择器
        const atBtn = $('#atBtn');
        const atPanel = $('#atPanel');
        function buildAtPanel() {
          if (!atPanel) return;
          const users = get(LS.USERS, []).filter(u => u.id !== me?.id);
          // 去重：根据 userId
          const seen = new Set();
          const uniqueUsers = users.filter(u => {
            if (seen.has(u.id)) return false;
            seen.add(u.id); return true;
          }).slice(0, 12);
          atPanel.innerHTML = uniqueUsers.map(u =>
            `<button type="button" class="at-user block w-full text-left px-3 py-1.5 text-sm hover:bg-brand-50 rounded" data-uid="${u.id}" data-uname="${escapeHtml(u.name)}">@${escapeHtml(u.name)}</button>`
          ).join('') || '<div class="text-xs text-slate-400 p-2">暂无其他用户</div>';
        }
        atBtn?.addEventListener('click', () => {
          buildAtPanel();
          atPanel.classList.toggle('hidden');
          $('#emojiPanel')?.classList.add('hidden');
        });
        atPanel?.addEventListener('click', e => {
          const btn = e.target.closest('.at-user');
          if (!btn) return;
          const start = ta.selectionStart, end = ta.selectionEnd;
          const mention = '@' + btn.dataset.uname + ' ';
          ta.value = ta.value.slice(0, start) + mention + ta.value.slice(end);
          ta.dispatchEvent(new Event('input'));
          ta.focus();
          ta.selectionStart = ta.selectionEnd = start + mention.length;
          atPanel.classList.add('hidden');
        });

        // 点击外部关闭面板
        document.addEventListener('click', e => {
          if (!e.target.closest('#emojiPanel') && !e.target.closest('#emojiBtn')) emojiPanel?.classList.add('hidden');
          if (!e.target.closest('#atPanel') && !e.target.closest('#atBtn')) atPanel?.classList.add('hidden');
        }, { once: false });
      }

      // 评论点赞
      $$('.comment-like').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!me) return Auth.open('login');
          const cid = btn.dataset.cid;
          Comment.toggleLike(cid, me.id);
          this.renderDetail(r.id);
        });
      });

      // 回复按钮
      $$('.comment-reply').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!me) return Auth.open('login');
          $('#cf-parentId').value = btn.dataset.cid;
          $('#cf-replyToUserId').value = btn.dataset.cid === r.uploaderId ? 'u_official' : get(LS.USERS, []).find(u => u.id === Comment.byId(btn.dataset.cid)?.userId)?.id || '';
          $('#cf-replyToUserName').value = btn.dataset.cname;
          const hint = $('#replyHint');
          $('#replyHintName').textContent = btn.dataset.cname;
          hint.classList.remove('hidden');
          $('#commentForm textarea[name=content]')?.focus();
        });
      });

      // 取消回复
      $('#cancelReply')?.addEventListener('click', () => {
        $('#cf-parentId').value = '';
        $('#cf-replyToUserId').value = '';
        $('#cf-replyToUserName').value = '';
        $('#replyHint').classList.add('hidden');
      });

      this.renderPreview(r);
    },

    /* 详情页预览（真实文件） */
    async renderPreview(r) {
      const area = $('#previewArea');
      if (!area) return;
      const btn = $('#btnDownload');
      if (r.type === 'link') {
        area.innerHTML = `
          <div class="text-center p-8">
            <div class="text-6xl mb-4">${escapeHtml(r.sourceIcon || '🔗')}</div>
            <div class="text-base text-slate-700 font-medium mb-2">${escapeHtml(r.sourceName || '官方权威资料')}</div>
            <p class="text-sm text-slate-500 mb-6 max-w-md mx-auto">${escapeHtml(r.desc)}</p>
            <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener" class="btn-grad inline-flex items-center gap-2">
              🔗 打开官方页面
            </a>
          </div>`;
        if (btn) { btn.disabled = false; btn.classList.add('btn-grad'); btn.classList.remove('opacity-50','cursor-not-allowed'); btn.dataset.ready = '1'; }
        return;
      }
      if (!r.fileData) {
        if (btn) { btn.disabled = true; btn.classList.add('opacity-50','cursor-not-allowed'); }
        return;
      }
      // 标记为预览中
      if (btn) { btn.disabled = true; btn.classList.add('opacity-50','cursor-not-allowed'); btn.innerHTML = '⏳ 预览中…'; }
      try {
        if (r.type === 'image') {
          area.innerHTML = `<img src="${r.fileData}" class="w-full h-full object-contain" alt="预览"/>`;
        } else if (r.type === 'pdf') {
          const buf = await fetch(r.fileData).then(res => res.arrayBuffer());
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1 });
          const ratio = Math.min(area.clientWidth / viewport.width, area.clientHeight / viewport.height);
          const canvas = document.createElement('canvas');
          canvas.width = area.clientWidth;
          canvas.height = area.clientHeight;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: page.getViewport({ scale: ratio }) }).promise;
          area.innerHTML = '';
          area.appendChild(canvas);
        } else if (r.type === 'docx') {
          const buf = await fetch(r.fileData).then(res => res.arrayBuffer());
          const result = await mammoth.convertToHtml({ arrayBuffer: buf });
          area.innerHTML = `<div class="w-full h-full overflow-auto p-4 text-left text-sm bg-white">${result.value}</div>`;
        }
        // 预览完成 → 启用下载
        if (btn) {
          btn.disabled = false;
          btn.classList.remove('opacity-50','cursor-not-allowed');
          btn.classList.add('btn-grad');
          btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ✅ 预览完成 · 下载`;
          btn.dataset.ready = '1';
        }
      } catch (e) {
        console.warn('预览失败：', e);
        // 失败也允许下载
        if (btn) {
          btn.disabled = false;
          btn.classList.remove('opacity-50','cursor-not-allowed');
          btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ⚠️ 预览失败 · 仍可下载`;
        }
      }
    },

    /* 下载 / 打开资料 */
    downloadResource(r) {
      Resource.incDownload(r.id);
      if (r.type === 'link' && r.url) {
        window.open(r.url, '_blank', 'noopener');
        toast('已打开：' + r.title);
        return;
      }
      if (r.fileData) {
        const a = document.createElement('a');
        a.href = r.fileData;
        a.download = r.fileName || (r.title + '.' + r.type);
        a.click();
      } else {
        const blob = new Blob([
          `${r.title}\n\n类别：${r.major}\n标签：${(r.tags||[]).join(', ')}\n描述：${r.desc}\n\n—— 来自 随心资料分享库 示例数据`
        ], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (r.title + '.txt').replace(/[\\/:*?"<>|]/g, '_');
        a.click();
        URL.revokeObjectURL(a.href);
      }
      toast('已' + (r.type === 'link' ? '打开' : '开始下载') + '：' + r.title);
      this.renderDetail(r.id);
    },

    /* ⭐ 升级版预览控制：tab 切换 + 缩放 + 全屏 + DOCX/PDF/TXT 渲染 */
    bindPreviewEnhance(r) {
      const area = $('#previewArea');
      const tabsEl = $('#previewTabs');
      if (!area || !tabsEl) return;
      // 缩放/全屏按钮（仅图片有意义）
      const isImage = r.type === 'image' || r.thumb;
      const zoomBtns = ['prevZoomIn', 'prevZoomOut', 'prevReset', 'prevFull'].map(id => document.getElementById(id));
      let zoom = 1, panX = 0, panY = 0;
      const applyTransform = () => {
        const img = document.getElementById('previewImg');
        if (img) {
          img.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
          const lvl = document.getElementById('prevZoomLvl');
          if (lvl) lvl.textContent = Math.round(zoom * 100) + '%';
        }
      };
      zoomBtns[0]?.addEventListener('click', () => { zoom = Math.min(5, zoom + 0.25); applyTransform(); });
      zoomBtns[1]?.addEventListener('click', () => { zoom = Math.max(0.25, zoom - 0.25); applyTransform(); });
      zoomBtns[2]?.addEventListener('click', () => { zoom = 1; panX = 0; panY = 0; applyTransform(); });
      zoomBtns[3]?.addEventListener('click', () => {
        const target = document.getElementById('previewImg') || area;
        if (target.requestFullscreen) target.requestFullscreen();
      });
      if (isImage) {
        // 图片：拖拽平移
        const img = document.getElementById('previewImg');
        if (img) {
          let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
          img.addEventListener('mousedown', e => { dragging = true; sx = e.clientX; sy = e.clientY; ox = panX; oy = panY; img.style.cursor = 'grabbing'; });
          window.addEventListener('mousemove', e => { if (!dragging) return; panX = ox + (e.clientX - sx); panY = oy + (e.clientY - sy); applyTransform(); });
          window.addEventListener('mouseup', () => { dragging = false; if (img) img.style.cursor = 'grab'; });
          img.style.cursor = 'grab';
        }
      } else {
        // 非图片：灰掉缩放按钮
        zoomBtns.forEach(b => { if (b) { b.disabled = true; b.classList.add('opacity-30', 'cursor-not-allowed'); } });
      }

      // Tabs：缩略图 / 原图 / PDF / 文档内容 / 文本
      const tabs = [];
      if (r.thumb) tabs.push({ id: 'thumb', label: '🖼️ 缩略图', render: () => `<img src="${r.thumb}" class="w-full h-full object-contain"/>` });
      if (r.type === 'image' && r.fileData) tabs.push({ id: 'image', label: '🎞️ 原图', render: () => `<img src="${r.fileData}" class="w-full h-full object-contain" id="previewImg" style="transition: transform 0.2s;"/>` });
      if (r.type === 'pdf' && r.fileData) tabs.push({ id: 'pdf', label: '📕 PDF 阅读', render: () => `<iframe src="${r.fileData}" class="w-full h-full bg-white" style="min-height: 480px; border: 0;" title="PDF"></iframe>` });
      if (r.type === 'docx' && r.fileData) tabs.push({ id: 'docx', label: '📝 文档内容', render: () => `<div id="docxRender" class="w-full h-full overflow-auto p-6 bg-white text-sm leading-relaxed text-slate-700" style="min-height: 480px;">⏳ 正在解析 DOCX…</div>` });
      if ((r.type === 'txt' || r.type === 'md' || r.type === 'text') && r.fileData) tabs.push({ id: 'text', label: '📃 文本', render: () => `<div id="textRender" class="w-full h-full overflow-auto p-6 bg-white text-sm leading-relaxed text-slate-700 whitespace-pre-wrap" style="min-height: 480px;">⏳ 正在加载…</div>` });
      if (r.type === 'link' && r.url) tabs.push({ id: 'link', label: '🔗 打开链接', render: () => `<iframe src="${escapeHtml(r.url)}" class="w-full h-full bg-white" style="min-height: 480px; border: 0;" title="link"></iframe>` });
      if (!tabs.length && r.thumb) tabs.push({ id: 'thumb', label: '预览', render: () => `<img src="${r.thumb}" class="w-full h-full object-contain"/>` });

      if (tabs.length <= 1) {
        tabsEl.innerHTML = `<span class="text-slate-500 text-xs px-2 py-1">${tabs[0]?.label || '预览'}</span>`;
        if (tabs[0]) area.innerHTML = tabs[0].render();
        this._renderPreviewLazy(r, tabs[0]?.id);
        return;
      }

      let activeId = tabs[0].id;
      const renderTabs = () => {
        tabsEl.innerHTML = tabs.map(t =>
          `<button data-tid="${t.id}" class="px-2.5 py-1 text-xs rounded font-medium ${t.id === activeId ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}">${t.label}</button>`
        ).join('');
        tabsEl.querySelectorAll('[data-tid]').forEach(b => b.addEventListener('click', () => {
          activeId = b.dataset.tid;
          const t = tabs.find(x => x.id === activeId);
          if (t) { area.innerHTML = t.render(); this._renderPreviewLazy(r, activeId); }
          renderTabs();
          // 切回原图时重绑缩放
          if (activeId === 'image' || (activeId === 'thumb' && r.type === 'image')) {
            const img = document.getElementById('previewImg');
            if (img) {
              img.style.cursor = 'grab';
              img.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
            }
          }
        }));
      };
      renderTabs();
      this._renderPreviewLazy(r, activeId);
    },

    /* 异步懒渲染：DOCX 解析 / TXT 文本读取 */
    async _renderPreviewLazy(r, activeId) {
      if (!r.fileData) return;
      if (activeId === 'docx') {
        const el = document.getElementById('docxRender');
        if (!el) return;
        try {
          // 把 base64 转 Blob
          const base64 = r.fileData.split(',')[1];
          const bin = atob(base64);
          const len = bin.length;
          const buf = new Uint8Array(len);
          for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i);
          const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
          // 动态加载 mammoth.js
          if (!window.mammoth) {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
              s.onload = resolve; s.onerror = () => reject(new Error('mammoth 加载失败'));
              document.head.appendChild(s);
            });
          }
          const result = await window.mammoth.extractRawText({ arrayBuffer: buf.buffer });
          el.innerHTML = `<div class="prose max-w-none">${escapeHtml(result.value || '（文档为空）').replace(/\n/g, '<br>')}</div>`;
        } catch (e) {
          el.innerHTML = `<div class="text-center text-slate-400 py-12">
            <div class="text-3xl mb-2">😢</div>
            <div>DOCX 解析失败：${escapeHtml(e.message)}</div>
            <div class="text-xs mt-2">提示：可下载原文件到本地用 Word/WPS 打开</div>
          </div>`;
        }
      } else if (activeId === 'text') {
        const el = document.getElementById('textRender');
        if (!el) return;
        try {
          const base64 = r.fileData.split(',')[1];
          const txt = decodeURIComponent(escape(atob(base64)));
          el.innerHTML = escapeHtml(txt) || '<div class="text-center text-slate-400 py-12">（文本为空）</div>';
        } catch (e) {
          el.innerHTML = `<div class="text-center text-slate-400 py-12">文本加载失败：${escapeHtml(e.message)}</div>`;
        }
      }
    },

    /* ============ 渲染：上传 ============ */
    bindUpload() {
      const form = $('#uploadForm');
      if (!form) return;
      // ⭐ 维护一个"待上传文件列表"，可多选、可单独删除
      form.__pendingFiles = [];
      form.innerHTML = `
        <div>
          <label class="text-sm font-medium text-slate-700">标题 <span class="text-red-500">*</span></label>
          <input name="title" required maxlength="80" placeholder="给你的资料起个名字吧～（多文件会作为同主题合集）" class="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">简介</label>
          <textarea name="desc" maxlength="200" rows="2" placeholder="一句话介绍这份资料～" class="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400"></textarea>
        </div>
        
        <!-- 快速分类选择 -->
        <div class="upload-category-section">
          <label class="text-sm font-medium text-slate-700 mb-2 block">选择分类 <span class="text-red-500">*</span></label>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div class="text-xs text-slate-500 mb-1">领域（考试类型）</div>
              <select name="field" id="uploadFieldSelect" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm">
                <option value="">请选择领域</option>
              </select>
            </div>
            <div>
              <div class="text-xs text-slate-500 mb-1">专业</div>
              <select name="major" id="uploadMajorSelect" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm">
                <option value="">请选择专业</option>
              </select>
            </div>
          </div>
          <!-- 快速分类标签 -->
          <div class="mb-3">
            <div class="text-xs text-slate-500 mb-1">快速选择领域</div>
            <div id="quickFieldTags" class="flex flex-wrap gap-1.5"></div>
          </div>
          <div class="mb-3">
            <div class="text-xs text-slate-500 mb-1">快速选择专业</div>
            <div id="quickMajorTags" class="flex flex-wrap gap-1.5"></div>
          </div>
          <!-- 自定义输入 -->
          <div class="grid grid-cols-2 gap-3">
            <input name="fieldNew" placeholder="或输入新领域" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            <input name="majorNew" placeholder="或输入新专业" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
        </div>
        
        <div>
          <label class="text-sm font-medium text-slate-700">标签（逗号分隔）</label>
          <input name="tags" placeholder="如：笔记,期末复习,重点" class="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400" />
        </div>
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-sm font-medium text-slate-700">文件 <span class="text-red-500">*</span>
              <span class="text-xs text-slate-400 font-normal ml-2" id="fileCount">未选</span>
            </label>
            <span class="text-xs text-slate-400">PDF / DOCX / PNG / JPG · 单文件 ≤ 8MB · 一次最多 8 个</span>
          </div>
          <div id="dropZone" class="mt-1 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-300 transition">
            <input type="file" id="fileInput" accept=".pdf,.docx,.png,.jpg,.jpeg,.gif,.webp" multiple class="hidden" />
            <div id="fileInfo" class="text-sm text-slate-500">
              <svg class="mx-auto mb-2 text-slate-300" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              点击或拖拽文件到这里<br/>
              <span class="text-xs text-slate-400">支持多选 · 每个文件独立管理</span>
            </div>
          </div>
          <!-- 已选文件列表 -->
          <div id="fileList" class="mt-3 space-y-2"></div>
        </div>
        <div class="flex items-center justify-end gap-2">
          <button type="button" onclick="App.go('feed')" class="btn-ghost text-sm">用投喂更快？</button>
          <button type="submit" id="btnSubmitUpload" class="btn-grad">📤 上传 <span id="btnCount"></span></button>
        </div>
      `;
      
      const fillUploadSelects = () => {
        const ms = Dict.majors();
        const mSel = $('#uploadMajorSelect'); 
        if (mSel) {
          mSel.innerHTML = '<option value="">请选择专业</option>' + ms.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
        }
        
        const fs = Dict.fields().filter(f => f.id !== 'all');
        const fSel = $('#uploadFieldSelect'); 
        if (fSel) {
          fSel.innerHTML = '<option value="">请选择领域</option>' + fs.map(f => `<option value="${f.id}">${f.icon} ${escapeHtml(f.name)}</option>`).join('');
        }
        
        // 填充快速选择标签
        const quickFieldTags = $('#quickFieldTags');
        if (quickFieldTags) {
          quickFieldTags.innerHTML = fs.map(f => `
            <button type="button" class="quick-field-tag px-2.5 py-1 rounded-full text-xs border border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition" data-field="${f.id}">
              ${f.icon} ${escapeHtml(f.name)}
            </button>
          `).join('');
          
          quickFieldTags.querySelectorAll('.quick-field-tag').forEach(btn => {
            btn.addEventListener('click', () => {
              const field = btn.dataset.field;
              if (fSel) fSel.value = field;
              quickFieldTags.querySelectorAll('.quick-field-tag').forEach(b => {
                b.classList.remove('border-brand-500', 'bg-brand-50', 'text-brand-700');
                b.classList.add('border-slate-200', 'hover:border-brand-400');
              });
              btn.classList.add('border-brand-500', 'bg-brand-50', 'text-brand-700');
              btn.classList.remove('border-slate-200', 'hover:border-brand-400');
            });
          });
        }
        
        const quickMajorTags = $('#quickMajorTags');
        if (quickMajorTags) {
          // 显示前 15 个热门专业
          const hotMajors = ms.slice(0, 15);
          quickMajorTags.innerHTML = hotMajors.map(m => `
            <button type="button" class="quick-major-tag px-2.5 py-1 rounded-full text-xs border border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition" data-major="${escapeHtml(m)}">
              ${escapeHtml(m)}
            </button>
          `).join('');
          
          quickMajorTags.querySelectorAll('.quick-major-tag').forEach(btn => {
            btn.addEventListener('click', () => {
              const major = btn.dataset.major;
              if (mSel) mSel.value = major;
              quickMajorTags.querySelectorAll('.quick-major-tag').forEach(b => {
                b.classList.remove('border-brand-500', 'bg-brand-50', 'text-brand-700');
                b.classList.add('border-slate-200', 'hover:border-brand-400');
              });
              btn.classList.add('border-brand-500', 'bg-brand-50', 'text-brand-700');
              btn.classList.remove('border-slate-200', 'hover:border-brand-400');
            });
          });
        }
      };
      
      fillUploadSelects();

      const dz = $('#dropZone'), input = $('#fileInput');
      const fileListEl = $('#fileList'), fileCountEl = $('#fileCount'), btnCountEl = $('#btnCount');
      dz.addEventListener('click', () => input.click());
      ;['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('border-brand-400', 'bg-brand-50'); }));
      ;['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('border-brand-400', 'bg-brand-50'); }));
      dz.addEventListener('drop', e => { if (e.dataTransfer.files?.length) { addFiles(e.dataTransfer.files); } });
      input.addEventListener('change', () => { if (input.files?.length) addFiles(input.files); });

      // ⭐ 核心：把选择的 FileList 累加到 form.__pendingFiles
      const addFiles = (fileList) => {
        for (const f of fileList) {
          // 上限 8 个
          if (form.__pendingFiles.length >= 8) { toast('一次最多上传 8 个文件'); break; }
          if (f.size > 8 * 1024 * 1024) { toast(`「${f.name}」超过 8MB，已跳过`); continue; }
          form.__pendingFiles.push(f);
        }
        renderFileList();
      };
      const removeFile = (idx) => {
        form.__pendingFiles.splice(idx, 1);
        renderFileList();
      };
      const renderFileList = () => {
        const arr = form.__pendingFiles;
        if (!arr.length) {
          fileListEl.innerHTML = '';
          fileCountEl.textContent = '未选';
          btnCountEl.textContent = '';
          $('#fileInfo').style.display = '';
          return;
        }
        $('#fileInfo').style.display = 'none';
        fileCountEl.textContent = `已选 ${arr.length} 个`;
        btnCountEl.textContent = `(${arr.length})`;
        fileListEl.innerHTML = arr.map((f, i) => {
          const ext = (f.name.split('.').pop() || '').toLowerCase();
          const typeBadge = { pdf: 'bg-red-100 text-red-700', docx: 'bg-blue-100 text-blue-700' }[ext]
            || (f.type.startsWith('image/') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600');
          const icon = { pdf: '📄', docx: '📝' }[ext] || (f.type.startsWith('image/') ? '🖼️' : '📎');
          const preview = f.type.startsWith('image/')
            ? `<div class="w-10 h-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0"><img class="w-full h-full object-cover" id="up-prev-${i}"/></div>`
            : `<div class="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-lg flex-shrink-0">${icon}</div>`;
          return `
            <div class="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg" data-idx="${i}">
              ${preview}
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-slate-700 truncate">${escapeHtml(f.name)}</div>
                <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span class="px-1.5 py-0.5 rounded ${typeBadge}">${ext.toUpperCase()}</span>
                  <span>${fmtSize(f.size)}</span>
                </div>
              </div>
              <button type="button" data-rm="${i}" class="text-red-500 hover:bg-red-50 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" title="移除">✕</button>
            </div>`;
        }).join('');
        // 缩略图渲染（异步，避免阻塞）
        arr.forEach((f, i) => {
          if (!f.type.startsWith('image/')) return;
          const r = new FileReader();
          r.onload = e => { const el = document.getElementById('up-prev-' + i); if (el) el.src = e.target.result; };
          r.readAsDataURL(f);
        });
        // 绑定删除
        fileListEl.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', e => {
          e.stopPropagation();
          removeFile(parseInt(b.dataset.rm, 10));
        }));
      };

      form.addEventListener('submit', async e => {
        e.preventDefault();
        if (!currentUser()) return Auth.open('login');
        const files = form.__pendingFiles;
        if (!files.length) return toast('请选择文件');
        const fd = new FormData(form);
        const title = (fd.get('title') || '').toString().trim();
        if (!title) return toast('请填写标题');
        const major = ((fd.get('majorNew') || '').toString().trim()) || (fd.get('major') || '').toString();
        const fieldNew = (fd.get('fieldNew') || '').toString().trim();
        let field;
        if (fieldNew) {
          Dict.addField(fieldNew);
          field = Dict.fieldIdByName(fieldNew);
        } else {
          field = (fd.get('field') || '').toString();
        }
        if (!major) return toast('请选择或填写专业');
        if (!field) return toast('请选择或填写领域');
        const majorFinal = Dict.addMajor(major) || major;
        const tags = (fd.get('tags') || '').toString().split(/[,，]/).map(s => s.trim()).filter(Boolean);

        const submitBtn = $('#btnSubmitUpload');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="inline-block animate-spin mr-1">⏳</span> 上传中…';

        try {
          const createdIds = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            submitBtn.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> 上传中 ${i + 1}/${files.length}`;
            const data = await readFileAsDataURL(file);
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            const type = ext === 'pdf' ? 'pdf' : (ext === 'docx' ? 'docx' : (file.type.startsWith('image/') ? 'image' : ext));
            const thumb = await makeThumbnail(file);
            const itemTitle = files.length > 1 ? `${title}（${i + 1}/${files.length}）` : title;
            const r = {
              id: uid(), title: itemTitle,
              desc: (fd.get('desc') || '').toString().trim(),
              major: majorFinal, field, tags: [...tags],
              type, size: file.size,
              fileName: file.name, fileData: data, thumb,
              uploaderId: currentUser().id,
              createdAt: Date.now(), downloads: 0,
              groupId: files.length > 1 ? (createdIds[0] || 'g_' + uid()) : null
            };
            if (files.length > 1 && i === 0) r.groupId = 'g_' + uid();
            Resource.add(r);
            createdIds.push(r.id);
          }
          toast(`✅ 成功上传 ${createdIds.length} 个文件`);
          form.reset();
          form.__pendingFiles = [];
          renderFileList();
          fillUploadSelects();
          this.renderCategoryTabs();
          this.go('detail', createdIds[0]);
        } catch (err) {
          toast(err.message || '上传失败');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '📤 上传 <span id="btnCount"></span>';
          btnCountEl.textContent = `(${form.__pendingFiles.length})`;
        }
      });
    },

    /* ============ 渲染：个人中心 ============ */
    renderProfile() {
      const me = currentUser();
      const el = $('#view-profile');
      if (!el) return;
      if (!me) return;
      const myUploads = Resource.byUser(me.id);
      const myFavs = Fav.list(me.id).map(id => Resource.byId(id)).filter(Boolean);
      const myCmts = get(LS.COMMENTS, []).filter(c => c.userId === me.id);
      const tab = (this.state.profileTab || 'uploads');

      const tabBtn = (k, label) =>
        `<button data-tab="${k}" class="px-4 py-1.5 text-sm rounded-full font-medium ${tab === k ? 'text-white shadow' : 'text-slate-600 hover:bg-slate-100'}" style="${tab === k ? 'background:linear-gradient(90deg,#5cc56a,#34bcd6,#7a5cd9);' : ''}">${label}</button>`;

      const card = r => `
        <div class="resource-card card cursor-pointer overflow-hidden" data-id="${r.id}">
          <div class="aspect-[4/3] bg-slate-100">${r.thumb ? `<img src="${r.thumb}" class="w-full h-full object-cover"/>` : ''}</div>
          <div class="p-2.5">
            <div class="text-sm font-medium line-clamp-2">${escapeHtml(r.title)}</div>
            <div class="text-xs text-slate-400 mt-1 flex justify-between"><span>${fmtTime(r.createdAt)}</span><span>${r.downloads || 0} ⬇</span></div>
          </div>
        </div>`;

      // ⭐ 我投喂的资料：表格视图（批量管理） / 卡片视图（切换）
      const myUploadsRows = myUploads.length
        ? `<div class="card overflow-hidden">
            <div class="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/50">
              <div class="flex items-center gap-2">
                <label class="text-sm text-slate-600 flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" id="selAll" class="rounded"/> 全选
                </label>
                <span class="text-xs text-slate-400" id="selCount">已选 0 / ${myUploads.length}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <button id="btnBatchDelete" disabled class="text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-600 disabled:opacity-40 disabled:cursor-not-allowed">🗑️ 批量删除</button>
                <button id="btnViewToggle" class="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">▦ 切卡片视图</button>
              </div>
            </div>
            <div class="divide-y divide-slate-100" id="myUploadsTable">
              ${myUploads.map(r => `
                <div class="flex items-center gap-3 p-3 hover:bg-slate-50/50 transition" data-rid="${r.id}">
                  <input type="checkbox" class="row-check rounded" data-rid="${r.id}"/>
                  <div class="w-12 h-12 rounded bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer" data-act="preview" data-rid="${r.id}">
                    ${r.thumb ? `<img src="${r.thumb}" class="w-full h-full object-cover"/>` : `<span class="text-xl">${r.type === 'pdf' ? '📄' : r.type === 'docx' ? '📝' : r.type === 'link' ? '🔗' : '📎'}</span>`}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-slate-800 truncate">${escapeHtml(r.title)}</div>
                    <div class="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span class="px-1.5 py-0.5 rounded ${({pdf:'bg-red-100 text-red-700',docx:'bg-blue-100 text-blue-700',image:'bg-emerald-100 text-emerald-700',link:'bg-purple-100 text-purple-700'})[r.type] || 'bg-slate-100 text-slate-600'}">${(r.type || 'FILE').toUpperCase()}</span>
                      <span>${fmtSize(r.size || 0)}</span>
                      <span>·</span>
                      <span>${fmtTime(r.createdAt)}</span>
                      <span>· ${r.downloads || 0} ⬇</span>
                      <span>· ${Like.count(r.id)} ❤</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <button data-act="edit" data-rid="${r.id}" class="text-xs px-2.5 py-1.5 rounded-full text-slate-600 hover:bg-slate-100" title="编辑">✏️</button>
                    <button data-act="togglePub" data-rid="${r.id}" class="text-xs px-2.5 py-1.5 rounded-full text-slate-600 hover:bg-slate-100" title="切换可见性">${r.hidden ? '🔒' : '🌐'}</button>
                    <button data-act="delete" data-rid="${r.id}" class="text-xs px-2.5 py-1.5 rounded-full text-red-500 hover:bg-red-50" title="删除">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>`
        : '<div class="text-center text-slate-400 py-12">还没上传过资料，去 <a class="text-brand-600 cursor-pointer" onclick="App.go(\'upload\')">上传</a> 第一份吧～</div>';

      const content = tab === 'uploads'
        ? myUploadsRows
        : tab === 'favs'
        ? (myFavs.length ? `<div class="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">${myFavs.map(card).join('')}</div>` : '<div class="text-center text-slate-400 py-12">还没有收藏的资料</div>')
        : (myCmts.length
            ? `<div class="divide-y divide-slate-100">${myCmts.map(c => {
                const r = Resource.byId(c.resourceId);
                return `<div class="py-3">
                  <div class="text-xs text-slate-400">在 <a class="text-brand-600 cursor-pointer" onclick="App.go('detail','${c.resourceId}')">${escapeHtml(r?.title || '已删除的资料')}</a> · ${fmtTime(c.createdAt)}</div>
                  <div class="text-sm text-slate-700 mt-1">${escapeHtml(c.content)}</div>
                </div>`;
              }).join('')}</div>`
            : '<div class="text-center text-slate-400 py-12">还没有评论过</div>');

      el.innerHTML = `
        <div class="card p-6">
          <div class="flex items-center gap-4">
            ${userAvatarHtml(me, 64)}
            <div class="flex-1 min-w-0">
              <div class="text-lg font-semibold flex items-center gap-2 flex-wrap">
                <span>${escapeHtml(me.nickname || me.name)}</span>
                ${me.school ? `<span class="badge badge-field">${escapeHtml(me.school)}</span>` : ''}
                <button id="editName" class="text-xs text-slate-400 hover:text-brand-600">⚙️ 修改资料</button>
              </div>
              <div class="text-xs text-slate-400">账号：${escapeHtml(me.account)} · 加入于 ${fmtTime(me.createdAt)}</div>
            </div>
            <button onclick="Auth.logout()" class="text-sm text-slate-500 hover:text-red-500">退出登录</button>
          </div>
          <div class="mt-3 text-sm text-slate-600">${escapeHtml(me.bio || '这家伙很懒，什么也没留下~')}</div>
          <div class="grid grid-cols-3 gap-3 mt-5">
            <div class="bg-slate-50 rounded-xl p-3 text-center"><div class="text-2xl font-bold text-gradient">${myUploads.length}</div><div class="text-xs text-slate-500">投喂资料</div></div>
            <div class="bg-slate-50 rounded-xl p-3 text-center"><div class="text-2xl font-bold text-gradient">${myFavs.length}</div><div class="text-xs text-slate-500">收藏资料</div></div>
            <div class="bg-slate-50 rounded-xl p-3 text-center"><div class="text-2xl font-bold text-gradient">${myCmts.length}</div><div class="text-xs text-slate-500">发布评论</div></div>
          </div>
        </div>
        <div class="mt-5 flex items-center gap-2">${tabBtn('uploads', '🍱 我投喂的')}${tabBtn('favs', '⭐ 我的收藏')}${tabBtn('comments', '💬 我的评论')}</div>
        <div class="mt-4">${content}</div>
      `;
      el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { this.state.profileTab = b.dataset.tab; this.renderProfile(); }));
      el.querySelectorAll('.resource-card').forEach(c => c.addEventListener('click', () => this.go('detail', c.dataset.id)));
      $('#editName')?.addEventListener('click', () => this.editProfile(me));
      // ⭐ 资源管理表行交互
      if (tab === 'uploads') this.bindMyUploadsManager(myUploads);
    },

    /* 个人中心 · 我投喂的资源管理 */
    bindMyUploadsManager(myUploads) {
      const view = $('#view-profile'); if (!view) return;
      const selAll = view.querySelector('#selAll');
      const rowChecks = view.querySelectorAll('.row-check');
      const selCount = view.querySelector('#selCount');
      const btnBatchDel = view.querySelector('#btnBatchDelete');
      const btnViewToggle = view.querySelector('#btnViewToggle');

      const updateCount = () => {
        const checked = view.querySelectorAll('.row-check:checked').length;
        if (selCount) selCount.textContent = `已选 ${checked} / ${rowChecks.length}`;
        if (btnBatchDel) btnBatchDel.disabled = checked === 0;
        if (selAll) selAll.checked = checked === rowChecks.length && checked > 0;
      };
      selAll?.addEventListener('change', () => {
        rowChecks.forEach(c => c.checked = selAll.checked);
        updateCount();
      });
      rowChecks.forEach(c => c.addEventListener('change', updateCount));

      // 批量删除
      btnBatchDel?.addEventListener('click', () => {
        const ids = Array.from(view.querySelectorAll('.row-check:checked')).map(c => c.dataset.rid);
        if (!ids.length) return;
        if (!confirm(`确定删除 ${ids.length} 个资料？相关评论/收藏/点赞也会清理。`)) return;
        ids.forEach(id => Resource.remove(id));
        toast(`✅ 已删除 ${ids.length} 个资料`);
        this.renderProfile();
      });

      // 切卡片视图
      btnViewToggle?.addEventListener('click', () => {
        const wrap = view.querySelector('#myUploadsTable');
        if (!wrap) return;
        const isCard = wrap.dataset.view === 'card';
        if (isCard) {
          // 切回表格
          this.renderProfile();
        } else {
          // 卡片视图
          const cards = myUploads.map(r => `
            <div class="resource-card card cursor-pointer overflow-hidden" data-id="${r.id}">
              <div class="aspect-[4/3] bg-slate-100">${r.thumb ? `<img src="${r.thumb}" class="w-full h-full object-cover"/>` : ''}</div>
              <div class="p-2.5">
                <div class="text-sm font-medium line-clamp-2">${escapeHtml(r.title)}</div>
                <div class="text-xs text-slate-400 mt-1 flex justify-between"><span>${fmtTime(r.createdAt)}</span><span>${r.downloads || 0} ⬇</span></div>
                <div class="flex gap-1 mt-2">
                  <button data-act="edit" data-rid="${r.id}" class="text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200">编辑</button>
                  <button data-act="delete" data-rid="${r.id}" class="text-xs px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100">删除</button>
                </div>
              </div>
            </div>`).join('');
          wrap.outerHTML = `<div class="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="myUploadsTable" data-view="card">${cards}</div>`;
          btnViewToggle.textContent = '☰ 切表格视图';
          // 重新绑定事件
          this.bindMyUploadsManager(myUploads);
          // 卡片整体点击预览
          view.querySelectorAll('#myUploadsTable .resource-card').forEach(c => c.addEventListener('click', e => {
            if (e.target.closest('[data-act]')) return;
            this.go('detail', c.dataset.id);
          }));
        }
      });

      // 单行操作
      view.querySelectorAll('[data-act]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const act = btn.dataset.act, rid = btn.dataset.rid;
          const r = Resource.byId(rid);
          if (!r) return;
          if (act === 'preview') return this.go('detail', rid);
          if (act === 'edit') return this.editResource(r);
          if (act === 'delete') {
            if (confirm(`确定删除「${r.title}」？相关评论/收藏/点赞会一起清理。`)) {
              Resource.remove(rid);
              toast('✅ 已删除');
              this.renderProfile();
            }
          }
          if (act === 'togglePub') {
            r.hidden = !r.hidden;
            Resource.update(r);
            toast(r.hidden ? '🔒 已设为私密' : '🌐 已设为公开');
            this.renderProfile();
          }
        });
      });
    },

    /* 资源编辑（标题/简介/标签/可见性） */
    editResource(r) {
      const html = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" id="editResModal">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold">✏️ 编辑资料</h3>
              <button id="erClose" class="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>
            <div class="space-y-3">
              <div>
                <label class="text-sm font-medium text-slate-700">标题</label>
                <input id="erTitle" value="${escapeHtml(r.title)}" class="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400" />
              </div>
              <div>
                <label class="text-sm font-medium text-slate-700">简介</label>
                <textarea id="erDesc" rows="2" class="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400">${escapeHtml(r.desc || '')}</textarea>
              </div>
              <div>
                <label class="text-sm font-medium text-slate-700">标签（逗号分隔）</label>
                <input id="erTags" value="${escapeHtml((r.tags || []).join(', '))}" class="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400" />
              </div>
              <div class="flex items-center gap-2">
                <label class="text-sm text-slate-700 flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" id="erHidden" ${r.hidden ? 'checked' : ''} class="rounded"/> 设为私密（不公开在资料库）
                </label>
              </div>
            </div>
            <div class="mt-5 flex items-center justify-end gap-2">
              <button id="erCancel" class="btn-ghost text-sm">取消</button>
              <button id="erSave" class="btn-grad text-sm">💾 保存</button>
            </div>
          </div>
        </div>`;
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      document.body.appendChild(wrap);
      const close = () => wrap.remove();
      wrap.querySelector('#erClose').onclick = close;
      wrap.querySelector('#erCancel').onclick = close;
      wrap.querySelector('#erSave').onclick = () => {
        r.title = wrap.querySelector('#erTitle').value.trim() || r.title;
        r.desc = wrap.querySelector('#erDesc').value.trim();
        r.tags = wrap.querySelector('#erTags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
        r.hidden = wrap.querySelector('#erHidden').checked;
        Resource.update(r);
        toast('✅ 已保存');
        close();
        this.renderProfile();
      };
    },
    editProfile(me) {
      // 打开编辑弹窗
      const m = $('#profileEditModal');
      if (!m) return;
      // 注入学校
      Auth.fillSchoolOptions('#peSchool');
      // 填字段
      $('#peName').value = me.nickname || me.name || '';
      $('#peSchool').value = me.school || '';
      $('#peBio').value = (me.bio || '').replace(/^.*?·\s*/, '');   // 去掉前缀
      // 渲染头像选择
      const picker = $('#avatarPicker');
      const current = me.avatar || '';
      picker.innerHTML = AVATAR_OPTIONS.map(a => `
        <button type="button" class="avatar-opt w-9 h-9 rounded-lg text-xl flex items-center justify-center border-2 ${current === a ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-brand-300'}" data-avatar="${a}">${a}</button>
      `).join('');
      picker.querySelectorAll('.avatar-opt').forEach(b => {
        b.addEventListener('click', () => {
          picker.querySelectorAll('.avatar-opt').forEach(x => { x.classList.remove('border-brand-500', 'bg-brand-50'); x.classList.add('border-slate-200', 'bg-slate-50'); });
          b.classList.add('border-brand-500', 'bg-brand-50');
          b.classList.remove('border-slate-200', 'bg-slate-50');
        });
      });
      m.classList.remove('hidden');
    },

    /* 鉴权弹窗 */
    bindAuth() {
      $('#authForm')?.addEventListener('submit', Auth.submit.bind(Auth));
      // 个人资料编辑表单
      const peForm = $('#profileEditForm');
      if (peForm && !peForm.dataset.bound) {
        peForm.dataset.bound = '1';
        peForm.addEventListener('submit', e => {
          e.preventDefault();
          const me = currentUser();
          if (!me) return;
          const users = get(LS.USERS, []);
          const u = users.find(x => x.id === me.id);
          if (!u) return;
          const newName = $('#peName').value.trim();
          const newSchool = $('#peSchool').value.trim();
          const newBio = $('#peBio').value.trim();
          const pickedAvatar = $('#avatarPicker .avatar-opt.border-brand-500');
          if (newName) { u.name = newName; u.nickname = newName; }
          u.school = newSchool;
          u.bio = newBio;
          if (pickedAvatar) u.avatar = pickedAvatar.dataset.avatar;
          set(LS.USERS, users);
          $('#profileEditModal').classList.add('hidden');
          this.renderUserArea();
          this.renderProfile();
          toast('个人资料已更新');
        });
      }
    },

    /* ============ 投喂资料 ============ */
    feedFiles: [],
    bindFeed() {
      const root = $('#feedForms');
      if (!root) return;
      root.innerHTML = `
        <div class="card p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gradient">📋 方式 1 · 粘贴 JSON</h3>
            <div class="flex gap-1">
              <button id="feedTemplateBtn" class="text-xs px-2 py-1 rounded bg-brand-50 text-brand-700 hover:bg-brand-100">填入模板</button>
              <button id="feedJsonClear" class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">清空</button>
            </div>
          </div>
          <textarea id="feedJson" rows="8" placeholder='[{"title":"...","major":"...","field":"...","type":"pdf","size":320000,"desc":"...","tags":["笔记","考研"]}]' class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-brand-400"></textarea>
          <button id="feedJsonSubmit" class="btn-grad w-full">入库 JSON</button>
        </div>
        <div class="card p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gradient">📊 方式 2 · 填表投喂</h3>
            <div class="flex gap-1">
              <button id="feedLoadSample" class="text-xs px-2 py-1 rounded bg-brand-50 text-brand-700 hover:bg-brand-100">载入示例</button>
              <button id="feedAddRow" class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">+ 添加行</button>
            </div>
          </div>
          <datalist id="feedFilesMajorList"></datalist>
          <datalist id="feedFilesFieldList"></datalist>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="text-slate-500">
                <tr class="border-b border-slate-200">
                  <th class="py-1 pr-2 text-left">#</th>
                  <th class="py-1 pr-2 text-left">标题</th>
                  <th class="py-1 pr-2 text-left">专业</th>
                  <th class="py-1 pr-2 text-left">领域</th>
                  <th class="py-1 pr-2 text-left">类型</th>
                  <th class="py-1 pr-2 text-left">大小</th>
                  <th class="py-1 pr-2 text-left">标签</th>
                  <th class="py-1 text-left">说明</th>
                </tr>
              </thead>
              <tbody id="feedTbody"></tbody>
            </table>
          </div>
          <div class="flex items-center justify-between text-xs text-slate-500">
            <span id="feedHint">已填写 0 条</span>
            <button id="feedTableSubmit" class="btn-grad text-sm">入库表格</button>
          </div>
        </div>
        <div class="card p-5 space-y-3">
          <h3 class="font-bold text-gradient">📁 方式 3 · 批量拖文件</h3>
          <p class="text-xs text-slate-500">拖一堆文件过来，自动按扩展名归类，统一入库</p>
          <div id="feedFilesDrop" class="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-300 transition">
            <input type="file" id="feedFilesInput" multiple class="hidden" />
            <div class="text-sm text-slate-500">点击或拖拽文件到这里<br/><span class="text-xs">支持 PDF / DOCX / 图片</span></div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input id="feedFilesMajor" list="feedFilesMajorList" placeholder="📚 专业（默认其他）" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            <input id="feedFilesField" list="feedFilesFieldList" placeholder="🎯 领域（默认其他）" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div id="feedFilesList" class="text-xs"></div>
          <button id="feedFilesSubmit" class="btn-grad w-full">批量入库</button>
        </div>
        <div class="md:col-span-3 card p-5">
          <h3 class="font-bold mb-3">🕘 最近入库的资料</h3>
          <div id="feedRecent" class="space-y-2"></div>
        </div>
      `;

      $('#feedTemplateBtn')?.addEventListener('click', () => {
        const tpl = JSON.stringify([
          { title: '考研英语·高频词 800', major: '英语', field: 'kaoyan', type: 'pdf', size: 320000, desc: '近 5 年真题词频统计', tags: ['考研', '词汇'] },
          { title: '教资·小学综合素质 2024 真题', major: '教育学', field: 'jiaozi', type: 'docx', size: 540000, tags: ['教资', '真题'] }
        ], null, 2);
        $('#feedJson').value = tpl;
        toast('已填入模板，可直接修改后入库');
      });
      $('#feedJsonClear')?.addEventListener('click', () => { $('#feedJson').value = ''; });
      $('#feedJsonSubmit')?.addEventListener('click', () => this.feedJsonSubmit());
      $('#feedAddRow')?.addEventListener('click', () => this.feedAddRow());
      $('#feedLoadSample')?.addEventListener('click', () => this.feedLoadSample());
      $('#feedTableSubmit')?.addEventListener('click', () => this.feedTableSubmit());

      const dz = $('#feedFilesDrop'), input = $('#feedFilesInput');
      const fillDatalist = () => {
        const m = $('#feedFilesMajorList'); if (m) m.innerHTML = Dict.majors().map(x => `<option value="${escapeHtml(x)}">`).join('');
        const f = $('#feedFilesFieldList'); if (f) f.innerHTML = Dict.fields().filter(x => x.id !== 'all').map(x => `<option value="${escapeHtml(x.name)}">`).join('');
      };
      fillDatalist();
      this.feedFillDatalist = fillDatalist;
      dz?.addEventListener('click', () => input.click());
      ;['dragenter','dragover'].forEach(ev => dz?.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('border-brand-400','bg-brand-50'); }));
      ;['dragleave','drop'].forEach(ev => dz?.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('border-brand-400','bg-brand-50'); }));
      dz?.addEventListener('drop', e => { if (e.dataTransfer.files) { this.feedAddFiles(e.dataTransfer.files); } });
      input?.addEventListener('change', () => { this.feedAddFiles(input.files); input.value = ''; });
      $('#feedFilesSubmit')?.addEventListener('click', () => this.feedFilesSubmit());
    },
    feedJsonSubmit() {
      const txt = $('#feedJson').value.trim();
      if (!txt) return toast('请粘贴 JSON 内容');
      let arr;
      try { arr = JSON.parse(txt); }
      catch (e) { return toast('JSON 解析失败：' + e.message); }
      if (!Array.isArray(arr) && typeof arr === 'object') arr = [arr];
      if (!Array.isArray(arr)) return toast('需要 JSON 数组（或单条对象）');
      const res = Feed.addMany(arr);
      if (res.ok > 0) {
        toast('成功入库 ' + res.ok + ' 条' + (res.fail ? '，失败 ' + res.fail : ''));
        $('#feedJson').value = '';
        this.renderCategoryTabs();
        this.renderFeed();
      } else {
        toast('入库失败，请检查每条至少包含 title / major / field / type');
      }
    },
    feedAddRow(data) {
      const tbody = $('#feedTbody');
      if (!tbody) return;
      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-100 align-top';
      tr.innerHTML = `
        <td class="py-1.5 pr-2 text-slate-400 row-idx"></td>
        <td class="py-1.5 pr-2"><input class="cell w-full px-2 py-1 border border-slate-200 rounded text-xs" data-k="title" placeholder="标题"></td>
        <td class="py-1.5 pr-2"><input class="cell w-full px-2 py-1 border border-slate-200 rounded text-xs" data-k="major" list="feedFilesMajorList" placeholder="专业"></td>
        <td class="py-1.5 pr-2"><input class="cell w-full px-2 py-1 border border-slate-200 rounded text-xs" data-k="field" list="feedFilesFieldList" placeholder="领域"></td>
        <td class="py-1.5 pr-2">
          <select class="cell w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white" data-k="type">
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
            <option value="image">IMG</option>
          </select>
        </td>
        <td class="py-1.5 pr-2"><input class="cell w-full px-2 py-1 border border-slate-200 rounded text-xs" data-k="size" placeholder="0"></td>
        <td class="py-1.5 pr-2"><input class="cell w-full px-2 py-1 border border-slate-200 rounded text-xs" data-k="tags" placeholder="标签,逗号"></td>
        <td class="py-1.5 pr-2"><input class="cell w-full px-2 py-1 border border-slate-200 rounded text-xs" data-k="desc" placeholder="一句话"></td>
        <td class="py-1.5"><button class="del text-slate-300 hover:text-red-500">✕</button></td>
      `;
      tbody.appendChild(tr);
      if (data) {
        Object.keys(data).forEach(k => {
          const input = tr.querySelector(`[data-k="${k}"]`);
          if (input) input.value = data[k];
        });
      }
      tr.querySelector('.del').addEventListener('click', () => { tr.remove(); this.feedUpdateHint(); });
      this.feedUpdateHint();
    },
    feedLoadSample() {
      $('#feedTbody').innerHTML = '';
      [
        { title: '考研政治·马原精讲', major: '其他', field: 'kaoyan', type: 'pdf', size: 880000, tags: '考研,政治,马原', desc: '高频考点 + 思维框架' },
        { title: '2025 教资·中学教育知识与能力', major: '教育学', field: 'jiaozi', type: 'pdf', size: 1520000, tags: '教资,真题', desc: '近 5 年真题 + 答案' },
        { title: '英语六级·高频词汇', major: '英语', field: 'cet', type: 'docx', size: 240000, tags: '六级,词汇', desc: '按话题分类' }
      ].forEach(d => this.feedAddRow(d));
      toast('已载入 3 条示例，可直接修改后入库');
    },
    feedUpdateHint() {
      const n = $('#feedTbody')?.children.length || 0;
      const h = $('#feedHint'); if (h) h.textContent = '已填写 ' + n + ' 条';
    },
    feedTableSubmit() {
      const rows = Array.from($('#feedTbody')?.children || []);
      if (!rows.length) return toast('请先添加行');
      const list = rows.map(tr => {
        const obj = {};
        tr.querySelectorAll('.cell').forEach(inp => { obj[inp.dataset.k] = inp.value; });
        return obj;
      });
      const res = Feed.addMany(list);
      toast('成功入库 ' + res.ok + ' 条' + (res.fail ? '，失败 ' + res.fail : ''));
      if (res.ok > 0) {
        $('#feedTbody').innerHTML = '';
        this.feedUpdateHint();
        this.renderCategoryTabs();
        this.renderFeed();
      }
    },
    feedAddFiles(fileList) {
      Array.from(fileList).forEach(f => {
        if (f.size > MAX_SIZE) { toast('跳过：' + f.name + ' 超过 8MB'); return; }
        this.feedFiles.push(f);
      });
      this.renderFeedFilesList();
    },
    renderFeedFilesList() {
      const el = $('#feedFilesList');
      if (!el) return;
      if (!this.feedFiles.length) { el.innerHTML = ''; return; }
      el.innerHTML = '<div class="font-medium text-slate-600 mt-2 mb-1">待入库文件：</div>' +
        this.feedFiles.map((f, i) => `<div class="flex items-center gap-2 py-0.5"><span class="truncate flex-1">${escapeHtml(f.name)}</span><span class="text-slate-400">${fmtSize(f.size)}</span><button data-i="${i}" class="rm text-slate-300 hover:text-red-500">✕</button></div>`).join('');
      el.querySelectorAll('.rm').forEach(b => b.addEventListener('click', () => { this.feedFiles.splice(+b.dataset.i, 1); this.renderFeedFilesList(); }));
    },
    async feedFilesSubmit() {
      if (!this.feedFiles.length) return toast('请先选择文件');
      const major = $('#feedFilesMajor').value.trim() || '其他';
      const fieldName = $('#feedFilesField').value.trim() || '其他';
      Dict.addMajor(major);
      Dict.addField(fieldName);
      const fieldId = Dict.fieldIdByName(fieldName);
      let ok = 0, fail = 0;
      for (const f of this.feedFiles) {
        try {
          const data = await readFileAsDataURL(f);
          const ext = (f.name.split('.').pop() || '').toLowerCase();
          const t = ext === 'pdf' ? 'pdf' : (ext === 'docx' ? 'docx' : 'image');
          const thumb = await makeThumbnail(f);
          const title = f.name.replace(/\.[^.]+$/, '');
          Resource.add({
            id: uid(), title, desc: '',
            major, field: fieldId, tags: [],
            type: t, size: f.size,
            fileName: f.name, fileData: data, thumb,
            uploaderId: currentUser() ? currentUser().id : 'u_demo',
            uploaderName: currentUser() ? currentUser().name : '社区贡献',
            createdAt: Date.now(), downloads: 0
          });
          ok++;
        } catch (e) { fail++; }
      }
      toast('成功入库 ' + ok + ' 个文件' + (fail ? '，失败 ' + fail : ''));
      this.feedFiles = [];
      this.renderFeedFilesList();
      this.renderCategoryTabs();
      this.renderFeed();
      if (this.feedFillDatalist) this.feedFillDatalist();
    },
    renderDonate() {
      const recent = Resource.all().slice(0, 6);
      const el = $('#feedRecent');
      if (!el) return;
      el.innerHTML = recent.length
        ? recent.map(r => {
            const f = Dict.fieldNameById(r.field);
            return `<div class="resource-card flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3 cursor-pointer hover:shadow-sm hover:border-brand-300 transition" data-id="${r.id}">
              <div class="w-10 h-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden">${r.thumb ? `<img src="${r.thumb}" class="w-full h-full object-cover"/>` : ''}</div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">${escapeHtml(r.title)}</div>
                <div class="text-xs text-slate-400 truncate">${escapeHtml(r.major || '')} · ${escapeHtml(f?.name || r.field || '')} · ${fmtTime(r.createdAt)} · by ${escapeHtml(r.uploaderName || '社区贡献')}</div>
              </div>
              ${r.credibility === '官方' ? '<span class="badge badge-official">官方</span>' : ''}
            </div>`;
          }).join('')
        : '<div class="text-center text-slate-400 py-6 text-sm">还没有投喂记录</div>';
      el.querySelectorAll('.resource-card').forEach(c => c.addEventListener('click', () => this.go('detail', c.dataset.id)));
      if (!$('#feedTbody')?.children.length) this.feedAddRow();
    },

    /* 重新渲染当前视图 */
    reRender() {
      this.renderUserArea();
      if (this.state.view === 'home') this.renderHome();
      else if (this.state.view === 'library') this.renderLibrary();
      else if (this.state.view === 'mindmap' || this.state.view === 'mindmap-editor') this.renderMindmap();
      else if (this.state.view === 'mindmapEditor' || this.state.view === 'mindmap-editor') this.renderMindmapEditor();
      else if (this.state.view === 'detail') this.renderDetail(this.state.params);
      else if (this.state.view === 'profile') this.renderProfile();
      else if (this.state.view === 'feed') this.renderFeed();
      else if (this.state.view === 'donate') this.renderDonate();
      else if (this.state.view === 'official') this.renderOfficial();
    },

    /* ============ 渲染：社区动态流 ============ */
    renderFeed() {
      const me = currentUser();
      const el = $('#view-feed');
      if (!el) return;

      // 标记通知已读
      if (me) Notification.markAllRead(me.id);

      // 合并最近活动：评论 + 通知 + 新上传
      const recentCmts = Comment.recent(30);
      const notifs = me ? Notification.list(me.id).slice(0, 20) : [];
      const recentRes = Resource.all()
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10);

      // 组装 timeline
      const timeline = [];
      recentCmts.forEach(c => {
        const r = Resource.byId(c.resourceId);
        if (!r) return;
        const u = get(LS.USERS, []).find(x => x.id === c.userId);
        timeline.push({
          ts: c.createdAt,
          kind: c.parentId ? 'reply' : 'comment',
          user: u,
          target: r,
          content: c.content,
          parent: c.parentId ? Comment.byId(c.parentId) : null
        });
      });
      recentRes.forEach(r => {
        const u = get(LS.USERS, []).find(x => x.id === r.uploaderId);
        timeline.push({ ts: r.createdAt, kind: 'upload', user: u, target: r });
      });
      timeline.sort((a, b) => b.ts - a.ts);
      const tlHtml = timeline.length ? timeline.slice(0, 50).map(item => {
        const u = item.user;
        const r = item.target;
        if (!u || !r) return '';
        const actionText = {
          comment: '评论了',
          reply: '回复了',
          upload: '上传了'
        }[item.kind] || '更新了';
        const replyPrefix = item.parent && item.kind === 'reply' ? (() => {
          const pu = get(LS.USERS, []).find(x => x.id === item.parent.userId);
          return `<div class="text-xs text-slate-400 bg-slate-50 rounded p-2 my-1 border-l-2 border-slate-200">回复 <b>${escapeHtml(pu?.name || '匿名')}</b>: ${escapeHtml((item.parent.content || '').slice(0, 60))}</div>`;
        })() : '';
        const typeColor = { pdf: '🔴', docx: '🔵', image: '🟢', link: '🟣' }[r.type] || '⚪';
        return `
          <div class="card p-4 flex gap-3 hover:shadow-md transition cursor-pointer feed-item" data-rid="${r.id}">
            <div class="w-10 h-10 rounded-full text-white text-sm flex items-center justify-center flex-shrink-0 overflow-hidden" style="background:linear-gradient(135deg,#5cc56a,#34bcd6,#7a5cd9);">${u.avatar ? escapeHtml(u.avatar) : escapeHtml((u.name || '?').slice(0,1))}</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm">
                <b class="text-slate-700">${escapeHtml(u.name || '匿名')}</b>
                <span class="text-slate-500">${actionText}</span>
                <span class="text-slate-700">${typeColor} ${escapeHtml(r.title)}</span>
                ${r.credibility === '官方' ? '<span class="badge badge-official ml-1">官方</span>' : ''}
              </div>
              ${item.content ? `<div class="text-sm text-slate-600 mt-1.5">${formatContent(item.content)}</div>` : ''}
              ${replyPrefix}
              <div class="text-xs text-slate-400 mt-1.5">${fmtTime(item.ts)}</div>
            </div>
          </div>`;
      }).filter(Boolean).join('') : '<div class="card p-10 text-center text-slate-400">📭 社区暂时还没有动态，来发第一条评论吧～</div>';

      // 通知列表
      const notifHtml = me ? (notifs.length ? notifs.map(n => {
        const fromU = get(LS.USERS, []).find(u => u.id === n.fromUserId);
        const icon = n.type === 'reply' ? '💬' : '🔔';
        return `
          <div class="card p-3 flex gap-3 items-center hover:shadow-md transition cursor-pointer feed-item" data-rid="${n.resourceId}">
            <div class="text-2xl">${icon}</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm"><b>${escapeHtml(fromU?.name || '匿名')}</b> ${n.type === 'reply' ? '回复了你' : '提到了你'}</div>
              <div class="text-xs text-slate-400 truncate">《${escapeHtml(n.resourceTitle || '')}》 · ${escapeHtml(n.snippet || '')}</div>
            </div>
            <div class="text-xs text-slate-400 whitespace-nowrap">${fmtTime(n.createdAt)}</div>
          </div>`;
      }).join('') : '<div class="text-center text-slate-400 py-6 text-sm">暂无新通知</div>') : '<div class="text-center text-slate-400 py-6 text-sm">登录后查看通知</div>';

      el.innerHTML = `
        <div class="card p-5 mb-5 bg-gradient-to-r from-brand-50 via-pink-50 to-orange-50 border-brand-200">
          <h1 class="text-xl font-bold flex items-center gap-2">
            <span>🌊 社区动态</span>
            <span class="text-sm font-normal text-slate-500">看看同学们都在聊什么</span>
          </h1>
          <p class="text-xs text-slate-500 mt-1">最新评论、最新上传、@ 你的消息都在这里</p>
        </div>
        <div class="grid md:grid-cols-3 gap-5">
          <div class="md:col-span-2">
            <h2 class="text-sm font-semibold text-slate-600 mb-3">📰 最新动态</h2>
            <div class="space-y-3">${tlHtml}</div>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-slate-600 mb-3">🔔 我的通知</h2>
            <div class="space-y-2">${notifHtml}</div>
          </div>
        </div>
      `;
      el.querySelectorAll('.feed-item').forEach(item => {
        item.addEventListener('click', () => this.go('detail', item.dataset.rid));
      });
    }
  };

  /* ---------- 通用 HTML 片段 ---------- */
  function resourceCardHtml(r) {
    const uploader = get(LS.USERS, []).find(u => u.id === r.uploaderId);
    const typeBadge = { pdf: 'bg-red-100 text-red-700', docx: 'bg-blue-100 text-blue-700', image: 'bg-emerald-100 text-emerald-700', link: 'bg-purple-100 text-purple-700' }[r.type] || 'bg-slate-100 text-slate-600';
    const f = Dict.fieldNameById(r.field);
    const cover = r.thumb || getResourceCover(r);
    return `
      <div class="resource-card card overflow-hidden cursor-pointer" data-id="${r.id}">
        <div class="aspect-[4/3] bg-slate-100 relative">
          <img src="${cover}" alt="${escapeHtml(r.title)}" class="w-full h-full object-cover"/>
          <span class="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-semibold ${typeBadge}">${(r.type || '').toUpperCase()}</span>
          ${f ? `<span class="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-white/90 text-slate-700 font-medium">${f.icon} ${escapeHtml(f.name)}</span>` : ''}
        </div>
        <div class="p-3">
          <div class="text-sm font-semibold line-clamp-2 leading-snug">${escapeHtml(r.title)}</div>
          <div class="text-[11px] text-slate-500 mt-1 truncate">📚 ${escapeHtml(r.major || '其他')}</div>
          <div class="text-xs text-slate-400 mt-1.5 flex items-center justify-between">
            <span class="truncate">${escapeHtml(uploader?.name || r.uploaderName || '社区贡献')}</span>
            <span class="whitespace-nowrap">${Like.count(r.id)} ❤ · ${r.downloads || 0} ⬇</span>
          </div>
        </div>
      </div>`;
  }
  function officialResourceCardHtml(r) {
    const f = Dict.fieldNameById(r.field);
    const cover = getResourceCover(r);
    return `
      <div class="resource-card card card-grad-cool overflow-hidden cursor-pointer" data-id="${r.id}">
        <div class="relative">
          <div class="aspect-[4/3] bg-slate-100 relative">
            <img src="${cover}" alt="${escapeHtml(r.title)}" class="w-full h-full object-cover"/>
            <span class="absolute top-2 left-2 badge badge-official">✅ 官方</span>
            ${f ? `<span class="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-white/90 text-slate-700 font-medium">${f.icon} ${escapeHtml(f.name)}</span>` : ''}
          </div>
        </div>
        <div class="p-3">
          <div class="text-sm font-semibold line-clamp-2 leading-snug">${escapeHtml(r.title)}</div>
          <div class="text-[11px] text-slate-500 mt-1 truncate">📚 ${escapeHtml(r.major || '通用')}</div>
          <div class="text-xs text-emerald-700 mt-1.5 flex items-center gap-1">
            <span>🔗</span>
            <span class="truncate">${escapeHtml(r.sourceName || '官方权威')}</span>
          </div>
        </div>
      </div>`;
  }

  /* =========================================================
     用户自绘思维导图（完善版：模板 + 文字样式 + 节点形状）
     ========================================================= */
  App.userMindmapDraft = null; // 当前正在编辑的导图
  App.selectedNodeId = null;
  App.mindmapStep = 1;       // 1=选文件/模板, 2=编辑, 3=保存
  App.mindmapWelcomeTab = 'file'; // file/template/library

  // ---------- 模板：6 种导图版式 ----------
  // 模板分类：layout = 纯布局版式，content = 带预设内容结构
  App.MINDMAP_TEMPLATES = [
    // --- 布局模板（6 种，从零开始画）---
    { id: 'blank',    cat: 'layout', label: '空白画布', icon: '⬜', desc: '从零开始自由布局',    defaultColor: '#34bcd6' },
    { id: 'radial',   cat: 'layout', label: '径向辐射', icon: '🌟', desc: '中心→四周发散',      defaultColor: '#5cc56a' },
    { id: 'tree',     cat: 'layout', label: '组织架构', icon: '🌳', desc: '左→右树状层级',      defaultColor: '#7a5cd9' },
    { id: 'timeline', cat: 'layout', label: '时间轴',   icon: '⏳', desc: '时间顺序排列',        defaultColor: '#1e9bb8' },
    { id: 'fishbone', cat: 'layout', label: '鱼骨图',   icon: '🐟', desc: '因果 / 5Why 分析',   defaultColor: '#3da355' },
    { id: 'logic',    cat: 'layout', label: '逻辑图',   icon: '🧩', desc: '概念关联 / 流程',     defaultColor: '#b69bff' },

    // --- 学习笔记类（5 种内容模板）---
    { id: 'c_book',     cat: 'study', label: '读书笔记', icon: '📖', desc: '书名/作者/核心观点/摘录/启发',         defaultColor: '#5cc56a' },
    { id: 'c_words',    cat: 'study', label: '单词背诵', icon: '🔤', desc: '单词/音标/释义/例句/易混点',           defaultColor: '#34bcd6' },
    { id: 'c_error',    cat: 'study', label: '错题本',   icon: '❌', desc: '错题/正解/错因/知识点/同类型题',       defaultColor: '#dc2626' },
    { id: 'c_exam',     cat: 'study', label: '考点梳理', icon: '📝', desc: '章节/高频考点/题型/分值/难度',         defaultColor: '#7a5cd9' },
    { id: 'c_subject',  cat: 'study', label: '学科复习', icon: '🎓', desc: '学科/板块/重点/难点/复习方法',         defaultColor: '#1e9bb8' },

    // --- 工作/项目类（4 种内容模板）---
    { id: 'c_project',  cat: 'work',  label: '项目计划', icon: '📋', desc: '目标/阶段/任务/负责人/里程碑',         defaultColor: '#34bcd6' },
    { id: 'c_swot',     cat: 'work',  label: 'SWOT 分析',icon: '⚖️', desc: '优势/劣势/机会/威胁',                  defaultColor: '#3da355' },
    { id: 'c_5w2h',     cat: 'work',  label: '5W2H',     icon: '❓', desc: 'What/Why/Who/When/Where/How/How much', defaultColor: '#7a5cd9' },
    { id: 'c_persona',  cat: 'work',  label: '用户画像', icon: '👤', desc: '人口属性/行为/痛点/需求/触点',         defaultColor: '#b69bff' },
    { id: 'c_flow',     cat: 'work',  label: '流程图',   icon: '🔁', desc: '起点/步骤/判断/分支/终点',             defaultColor: '#1e9bb8' },

    // --- 个人成长类（5 种内容模板）---
    { id: 'c_goal',     cat: 'life',  label: '目标规划', icon: '🎯', desc: '长期目标/中期/本月/本周/今天',         defaultColor: '#dc2626' },
    { id: 'c_habit',    cat: 'life',  label: '习惯养成', icon: '🌱', desc: '微习惯/触发/行动/奖励/打卡',           defaultColor: '#5cc56a' },
    { id: 'c_year',     cat: 'life',  label: '年度复盘', icon: '🗓️', desc: '成就/遗憾/反思/感恩/明年目标',         defaultColor: '#7a5cd9' },
    { id: 'c_okr',      cat: 'life',  label: 'OKR',      icon: '🚀', desc: '目标 O/关键结果 KR1-3',                defaultColor: '#34bcd6' },
    { id: 'c_readlist', cat: 'life',  label: '阅读书单', icon: '📚', desc: '书名/作者/进度/笔记/推荐理由',         defaultColor: '#b69bff' }
  ];

  // 模板分类元数据
  App.MINDMAP_TEMPLATE_CATS = [
    { id: 'layout', label: '🎨 布局版式', desc: '6 种基础版式，从零开始画' },
    { id: 'study',  label: '📚 学习笔记', desc: '读书/单词/错题/考点，开箱即用' },
    { id: 'work',   label: '💼 工作项目', desc: '项目/SWOT/5W2H/用户画像/流程' },
    { id: 'life',   label: '🌱 个人成长', desc: '目标/习惯/复盘/OKR/书单' }
  ];

  // ---------- 文字素材库（4 大类 100+ 条） ----------
  App.WORD_LIBRARY = {
    subjects: {
      label: '📖 学科关键词',
      desc: '考研 / 教资 / 四六级 / 期末复习常用词',
      groups: [
        {
          name: '考研政治',
          icon: '🏛️',
          words: ['马原', '毛中特', '史纲', '思修法基', '马克思主义哲学', '唯物辩证法', '资本论', '剩余价值', '社会主义初级阶段', '新发展理念', '共同富裕', '人类命运共同体']
        },
        {
          name: '考研英语',
          icon: '🔤',
          words: ['词汇', '长难句', '阅读理解', '新题型', '完形填空', '翻译', '写作', '小作文', '大作文', '真题', '高频词', '熟词僻义', '词根词缀', '阅读细节题', '主旨题', '推理题', '作者态度题']
        },
        {
          name: '考研数学',
          icon: '📐',
          words: ['极限', '连续', '导数', '微分', '积分', '多元函数', '级数', '微分方程', '线性代数', '行列式', '矩阵', '特征值', '概率论', '数理统计', '参数估计', '假设检验']
        },
        {
          name: '教师资格证',
          icon: '👩‍🏫',
          words: ['教育学基础', '教育心理学', '教学设计', '教学实施', '教学评价', '德育', '班级管理', '教师专业发展', '教育法律法规', '教师职业道德', '综合素质', '学科知识', '教案撰写', '说课', '试讲']
        },
        {
          name: '四六级英语',
          icon: '🇬🇧',
          words: ['听力', '新闻听力', '长对话', '短文听力', '阅读', '选词填空', '匹配题', '仔细阅读', '翻译', '段落翻译', '写作', '图表作文', '议论文', '书信', '通知', '高频词组']
        },
        {
          name: '期末复习',
          icon: '📝',
          words: ['课堂笔记', 'PPT 重点', '教材章节', '例题', '习题', '错题', '思维导图', '复习计划', '知识框架', '高频考点', '课后题', '往年真题', '模拟卷', '答疑', '小组讨论']
        }
      ]
    },
    connectors: {
      label: '🔗 连接词 / 逻辑短语',
      desc: '写论述、做总结的过渡词',
      groups: [
        {
          name: '顺序 / 时间',
          icon: '⏳',
          words: ['首先', '其次', '然后', '接着', '随后', '最后', '最终', '与此同时', '在此之前', '在此之后', '与此同时', '当……时', '当……之后', '一开始', '接下来']
        },
        {
          name: '因果 / 推理',
          icon: '🔁',
          words: ['因为', '所以', '因此', '故', '由于', '致使', '导致', '造成', '结果', '于是', '可见', '故而', '之所以', '其原因在于', '根本原因']
        },
        {
          name: '转折 / 递进',
          icon: '↔️',
          words: ['但是', '然而', '不过', '可是', '尽管', '虽然', '即使', '即便', '不但…而且', '不仅…还', '更进一步', '更重要的是', '尤其', '特别是', '与此同时']
        },
        {
          name: '条件 / 假设',
          icon: '❓',
          words: ['如果', '假如', '要是', '倘若', '只要', '除非', '只有', '无论', '不管', '只要…就', '一旦…就', '假如…那么', '在……条件下', '假设', '即便']
        },
        {
          name: '总结 / 强调',
          icon: '✨',
          words: ['总之', '综上', '综上所述', '总的来看', '整体而言', '一言以蔽之', '换言之', '也就是说', '即', '亦即', '值得注意的是', '应当指出', '不可忽视的是', '事实上', '毫无疑问']
        },
        {
          name: '并列 / 举例',
          icon: '📋',
          words: ['第一', '第二', '第三', '一方面…另一方面', '其一', '其二', '其三', '例如', '比如', '譬如', '诸如', '以……为例', '具体表现为', '主要包括', '总的来说']
        }
      ]
    },
    expressions: {
      label: '💬 论述句式',
      desc: '议论文 / 总结 / 计划常用句式',
      groups: [
        {
          name: '议论文起承',
          icon: '✍️',
          words: [
            '随着……的发展，……已成为……',
            '近年来，……现象日益普遍',
            '众所周知，……是……的核心',
            '关于……，历来众说纷纭',
            '在当今社会，……扮演着重要角色',
            '……是……的必然趋势',
            '古语有云：……',
            '……既是……也是……'
          ]
        },
        {
          name: '分析论证',
          icon: '🔍',
          words: [
            '从……角度分析，……',
            '究其原因，主要有三点',
            '……的本质在于……',
            '之所以出现……，是因为……',
            '……与……存在密切关联',
            '进一步分析，……',
            '反观当下，……',
            '对此，我认为……'
          ]
        },
        {
          name: '总结升华',
          icon: '🌟',
          words: [
            '综上所述，……',
            '由此可见，……',
            '总而言之，……',
            '一言以蔽之，……',
            '展望未来，……',
            '路漫漫其修远兮，……',
            '千里之行，始于足下',
            '……任重而道远'
          ]
        },
        {
          name: '计划 / 目标',
          icon: '🎯',
          words: [
            '短期目标：……',
            '中期目标：……',
            '长期愿景：……',
            '本周重点：……',
            '关键结果 KR1：……',
            '成功标准：……',
            '资源需求：……',
            '风险预案：……'
          ]
        }
      ]
    },
    emojis: {
      label: '🎨 符号 / 字体样式',
      desc: '图标 + 标题/小标题/正文预设',
      groups: [
        {
          name: '常用图标',
          icon: '⭐',
          words: ['⭐', '🌟', '✨', '💡', '🔥', '🎯', '📌', '📍', '✅', '❌', '⚠️', '❗', '❓', '💬', '🎉', '🎊', '📚', '📖', '✏️', '🖊️', '📝', '📋', '🗂️', '🧠', '💭', '🪄', '🚀', '🌱', '🌿', '🌳', '🏆', '🥇', '🎖️', '🏅', '⏰', '⏳', '📅', '🗓️']
        },
        {
          name: '分类标签',
          icon: '🏷️',
          words: ['#核心', '#重点', '#难点', '#高频考点', '#易错点', '#拓展', '#复习', '#作业', '#考试', '#提纲', '#总结', '#回顾', '#计划', '#目标', '#复盘', '#TODO', '#待办', '#已完成', '#进行中', '#暂停']
        }
      ]
    }
  };

  // ---------- 字体样式预设（点击应用至选中节点） ----------
  App.FONT_PRESETS = [
    { id: 'title',    label: '大标题',  size: 'xl',  style: 'bold',     color: '#1e9bb8', bg: '#5cc56a' },
    { id: 'subtitle', label: '小标题',  size: 'lg',  style: 'bold',     color: '#1f2937', bg: '#82f0f9' },
    { id: 'body',     label: '正文',    size: 'md',  style: 'normal',   color: '#1f2937', bg: '#ebffd7' },
    { id: 'note',     label: '注释',    size: 'sm',  style: 'italic',   color: '#475569', bg: '#e7d8ff' },
    { id: 'key',      label: '重点',    size: 'md',  style: 'bold',     color: '#fff',    bg: '#dc2626' },
    { id: 'tip',      label: '小贴士',  size: 'sm',  style: 'normal',   color: '#fff',    bg: '#f29900' }
  ];

  // ---------- 上传文件 → 解析内容 → 生成导图节点 ----------
  function setMmFileStatus(text, isErr) {
    const el = document.getElementById('mmFileStatus');
    if (!el) return;
    el.textContent = text;
    el.style.color = isErr ? '#dc2626' : '#1e9bb8';
  }

  App.parseTextToMindmap = function(text, fileName) {
    const me = currentUser();
    if (!me) { toast('请先登录'); return; }
    text = (text || '').replace(/\r\n/g, '\n').trim();
    if (!text) { setMmFileStatus('❌ 文件内容为空', true); return; }
    const lines = text.split('\n');
    const stack = []; const nodes = []; const edges = [];
    const rootId = 'n0';
    const rootLabel = (fileName || '导入的导图').replace(/\.[^.]+$/, '');
    nodes.push({
      id: rootId, label: rootLabel, x: 600, y: 400, color: '#7a5cd9',
      isRoot: true, shape: 'round', fontSize: 'lg', fontStyle: 'bold', textColor: '#fff'
    });
    stack.push({ level: 0, id: rootId });
    const palette = ['#5cc56a', '#34bcd6', '#1e9bb8', '#b69bff', '#3da355', '#ffd86b', '#7a5cd9'];
    let colorIdx = 0; let nodeCount = 1;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i]; const line = raw.trim();
      if (!line) continue;
      if (/^```/.test(line)) continue;
      const h = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
      if (h) {
        const level = h[1].length; const label = h[2].trim();
        const id = 'n' + (++nodeCount);
        nodes.push({ id, label, x: 0, y: 0, color: palette[colorIdx++ % palette.length],
          isRoot: false, parentId: null, shape: 'rect',
          fontSize: level === 1 ? 'md' : (level === 2 ? 'sm' : 'xs'),
          fontStyle: level === 1 ? 'bold' : 'normal', textColor: '#1f2937' });
        while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
        const parent = stack[stack.length - 1];
        nodes[nodes.length - 1].parentId = parent.id;
        edges.push({ from: parent.id, to: id });
        stack.push({ level, id, label });
        continue;
      }
      const li = line.match(/^([-*+·•]|\d+\.)\s+(.+)$/);
      if (li) {
        const indent = raw.length - raw.trimLeft().length;
        const listLevel = 7 + Math.floor(indent / 2);
        const label = li[2].trim();
        const id = 'n' + (++nodeCount);
        nodes.push({ id, label, x: 0, y: 0, color: palette[colorIdx++ % palette.length],
          isRoot: false, parentId: null, shape: 'circle',
          fontSize: 'xs', fontStyle: 'normal', textColor: '#1f2937' });
        while (stack.length > 1 && stack[stack.length - 1].level >= listLevel) stack.pop();
        const parent = stack[stack.length - 1];
        nodes[nodes.length - 1].parentId = parent.id;
        edges.push({ from: parent.id, to: id });
        continue;
      }
      if (line.length > 0 && line.length < 50) {
        const id = 'n' + (++nodeCount);
        nodes.push({ id, label: line, x: 0, y: 0, color: palette[colorIdx++ % palette.length],
          isRoot: false, parentId: rootId, shape: 'circle',
          fontSize: 'sm', fontStyle: 'normal', textColor: '#1f2937' });
        edges.push({ from: rootId, to: id });
      }
    }
    // 自动布局（BFS 排版）
    const childrenOf = {};
    nodes.forEach(n => { if (n.parentId) (childrenOf[n.parentId] = childrenOf[n.parentId] || []).push(n); });
    const levelNodes = {}; const nodeLevel = { [rootId]: 0 };
    const bfs = [rootId];
    while (bfs.length) {
      const id = bfs.shift();
      const lv = nodeLevel[id];
      (levelNodes[lv] = levelNodes[lv] || []).push(nodes.find(n => n.id === id));
      (childrenOf[id] || []).forEach(c => { nodeLevel[c.id] = lv + 1; bfs.push(c.id); });
    }
    const maxLevel = Math.max(...Object.keys(levelNodes).map(Number), 0);
    const xGap = 1200 / Math.max(1, maxLevel + 1);
    Object.keys(levelNodes).forEach(lv => {
      const arr = levelNodes[lv];
      const yGap = 740 / Math.max(1, arr.length);
      arr.forEach((n, i) => { n.x = 80 + xGap * parseInt(lv); n.y = 60 + yGap * (i + 0.5); });
    });
    this.userMindmapDraft = {
      id: uid(), title: rootLabel, template: 'logic',
      createdAt: Date.now(), updatedAt: Date.now(), userId: me.id, nodes, edges
    };
    // 存储文件信息和原始文本供"智能解析"页面展示
    this._mmParseFileInfo = { name: fileName || '导入的导图', ext: (fileName || '').split('.').pop() || '' };
    this._mmParsedText = text;
    this.mindmapStep = 1.5; // 进入智能解析预览页（而非直接进编辑页）
    this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft);
    setMmFileStatus(`✅ 已从文件生成 ${nodes.length} 个节点 · ${edges.length} 条连线`, false);
    toast('智能解析完成：' + rootLabel + '，共 ' + nodes.length + ' 个节点');
  };

  App.parseFileToMindmap = function(file) {
    const name = (file.name || '').toLowerCase();
    // 存储文件信息供智能解析页面使用
    this._mmParseFileInfo = {
      name: file.name || '',
      ext: name.split('.').pop() || '',
      size: file.size || 0
    };
    setMmFileStatus(`⏳ 正在解析：${file.name} (${(file.size/1024).toFixed(1)} KB)`, false);
    if (name.endsWith('.docx')) {
      if (window.mammoth) {
        const reader = new FileReader();
        reader.onload = e => {
          window.mammoth.extractRawText({ arrayBuffer: e.target.result })
            .then(res => this.parseTextToMindmap(res.value || '', file.name))
            .catch(err => setMmFileStatus('❌ .docx 解析失败：' + (err.message || err), true));
        };
        reader.readAsArrayBuffer(file);
      } else {
        setMmFileStatus('❌ mammoth.js 未加载，无法解析 .docx', true);
      }
    } else if (name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = e => {
        try { this.importJsonMindmap(JSON.parse(String(e.target.result || '{}')), file.name); }
        catch (err) { setMmFileStatus('❌ JSON 解析失败：' + err.message, true); }
      };
      reader.readAsText(file, 'utf-8');
    } else {
      const reader = new FileReader();
      reader.onload = e => this.parseTextToMindmap(String(e.target.result || ''), file.name);
      reader.onerror = () => setMmFileStatus('❌ 文件读取失败', true);
      reader.readAsText(file, 'utf-8');
    }
  };

  App.importJsonMindmap = function(obj, fileName) {
    const me = currentUser();
    if (!me) { toast('请先登录'); return; }
    let nodes = obj.nodes || []; let edges = obj.edges || [];
    if (!nodes.length && Array.isArray(obj)) {
      const convert = (list, parentId, depth) => {
        list.forEach(it => {
          const id = 'n' + uid();
          nodes.push({ id, label: it.label || it.text || it.title || '未命名',
            x: 0, y: 0, color: ['#5cc56a','#34bcd6','#7a5cd9','#1e9bb8','#b69bff','#ffd86b'][depth % 6],
            isRoot: !parentId, parentId, shape: depth === 0 ? 'round' : 'rect',
            fontSize: depth === 0 ? 'lg' : (depth === 1 ? 'md' : 'sm'),
            fontStyle: depth === 0 ? 'bold' : 'normal', textColor: depth === 0 ? '#fff' : '#1f2937' });
          if (parentId) edges.push({ from: parentId, to: id });
          if (Array.isArray(it.children) && it.children.length) convert(it.children, id, depth + 1);
        });
      };
      convert(obj, null, 0);
    }
    if (!nodes.length) { setMmFileStatus('❌ JSON 中未找到 nodes', true); return; }
    const childrenOf = {};
    nodes.forEach(n => { if (n.parentId) (childrenOf[n.parentId] = childrenOf[n.parentId] || []).push(n); });
    const root = nodes.find(n => n.isRoot) || nodes[0];
    const levelNodes = {}; const nodeLevel = { [root.id]: 0 };
    const bfs = [root.id];
    while (bfs.length) {
      const id = bfs.shift();
      const lv = nodeLevel[id];
      (levelNodes[lv] = levelNodes[lv] || []).push(nodes.find(n => n.id === id));
      (childrenOf[id] || []).forEach(c => { nodeLevel[c.id] = lv + 1; bfs.push(c.id); });
    }
    const maxLevel = Math.max(...Object.keys(levelNodes).map(Number), 0);
    const xGap = 1200 / Math.max(1, maxLevel + 1);
    Object.keys(levelNodes).forEach(lv => {
      const arr = levelNodes[lv];
      const yGap = 740 / Math.max(1, arr.length);
      arr.forEach((n, i) => { n.x = 80 + xGap * parseInt(lv); n.y = 60 + yGap * (i + 0.5); });
    });
    this.userMindmapDraft = {
      id: uid(), title: (fileName || '导入的导图').replace(/\.[^.]+$/, ''),
      template: 'logic', createdAt: Date.now(), updatedAt: Date.now(), userId: me.id, nodes, edges
    };
    this.mindmapStep = 2; // 导入后直接进第 2 步
    this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft);
    setMmFileStatus(`✅ 已从 JSON 导入 ${nodes.length} 个节点 · ${edges.length} 条连线`, false);
  };

  // ---------- 节点形状：5 种 ----------
  App.NODE_SHAPES = [
    { id: 'circle',  label: '圆形', icon: '⭕' },
    { id: 'rect',    label: '矩形', icon: '▭' },
    { id: 'round',   label: '胶囊', icon: '💊' },
    { id: 'diamond', label: '菱形', icon: '◆' },
    { id: 'cloud',   label: '云朵', icon: '☁️' }
  ];

  // ---------- 字体大小 5 档 ----------
  App.FONT_SIZES = [
    { id: 'xs',  label: '极小', px: 11 },
    { id: 'sm',  label: '小',   px: 13 },
    { id: 'md',  label: '中',   px: 15 },
    { id: 'lg',  label: '大',   px: 18 },
    { id: 'xl',  label: '特大', px: 22 }
  ];

  // ---------- 字体样式 ----------
  App.FONT_STYLES = [
    { id: 'normal',   label: '常规',   style: 'normal' },
    { id: 'bold',     label: '加粗',   style: 'bold' },
    { id: 'italic',   label: '斜体',   style: 'italic' },
    { id: 'underline',label: '下划线', style: 'underline' }
  ];

  // ---------- 文字颜色 10 色 ----------
  App.TEXT_COLORS = [
    '#1f2937', '#7a5cd9', '#3da355', '#1e9bb8', '#dc2626',
    '#f29900', '#475569', '#000000', '#ffffff', '#5cc56a'
  ];

  // ---------- 内容模板：预设结构树（学习/工作/生活） ----------
  App.CONTENT_TEMPLATES = {
    c_book: {
      label: '读书笔记',
      root: '📖 读书笔记',
      tree: [
        { label: '📕 书名', kids: [
          { label: '作者：', kids: [] },
          { label: '出版社 / 出版年', kids: [] }
        ]},
        { label: '🎯 核心观点', kids: [
          { label: '观点 1', kids: [] },
          { label: '观点 2', kids: [] },
          { label: '观点 3', kids: [] }
        ]},
        { label: '✨ 金句摘录', kids: [
          { label: '"……"', kids: [] },
          { label: '"……"', kids: [] }
        ]},
        { label: '💡 个人启发', kids: [
          { label: '我学到了什么', kids: [] },
          { label: '行动改进', kids: [] }
        ]}
      ]
    },
    c_words: {
      label: '单词背诵',
      root: '🔤 单词本',
      tree: [
        { label: 'Word 1', kids: [
          { label: '音标 /ə/', kids: [] },
          { label: '释义：n. ……', kids: [] },
          { label: '例句：……', kids: [] },
          { label: '易混：……', kids: [] }
        ]},
        { label: 'Word 2', kids: [
          { label: '音标 /ə/', kids: [] },
          { label: '释义：v. ……', kids: [] },
          { label: '例句：……', kids: [] }
        ]},
        { label: 'Word 3', kids: [
          { label: '音标 /ə/', kids: [] },
          { label: '释义：adj. ……', kids: [] },
          { label: '例句：……', kids: [] }
        ]}
      ]
    },
    c_error: {
      label: '错题本',
      root: '❌ 错题本',
      tree: [
        { label: '错题 1', kids: [
          { label: '题目 / 题号', kids: [] },
          { label: '✅ 正解', kids: [] },
          { label: '❌ 错因', kids: [] },
          { label: '📌 知识点', kids: [] },
          { label: '🔁 同类型', kids: [] }
        ]},
        { label: '错题 2', kids: [
          { label: '题目 / 题号', kids: [] },
          { label: '✅ 正解', kids: [] },
          { label: '❌ 错因', kids: [] },
          { label: '📌 知识点', kids: [] }
        ]},
        { label: '错题 3', kids: [
          { label: '题目 / 题号', kids: [] },
          { label: '✅ 正解', kids: [] },
          { label: '❌ 错因', kids: [] },
          { label: '📌 知识点', kids: [] }
        ]}
      ]
    },
    c_exam: {
      label: '考点梳理',
      root: '📝 考点梳理',
      tree: [
        { label: '第 1 章', kids: [
          { label: '高频考点', kids: [
            { label: '考点 1', kids: [] },
            { label: '考点 2', kids: [] }
          ]},
          { label: '题型 / 分值', kids: [] },
          { label: '难度 ⭐⭐⭐', kids: [] }
        ]},
        { label: '第 2 章', kids: [
          { label: '高频考点', kids: [] },
          { label: '题型 / 分值', kids: [] },
          { label: '难度 ⭐⭐', kids: [] }
        ]},
        { label: '第 3 章', kids: [
          { label: '高频考点', kids: [] },
          { label: '题型 / 分值', kids: [] },
          { label: '难度 ⭐⭐⭐⭐', kids: [] }
        ]}
      ]
    },
    c_subject: {
      label: '学科复习',
      root: '🎓 学科复习',
      tree: [
        { label: '板块 1', kids: [
          { label: '重点', kids: [] },
          { label: '难点', kids: [] },
          { label: '复习方法', kids: [] }
        ]},
        { label: '板块 2', kids: [
          { label: '重点', kids: [] },
          { label: '难点', kids: [] },
          { label: '复习方法', kids: [] }
        ]},
        { label: '板块 3', kids: [
          { label: '重点', kids: [] },
          { label: '难点', kids: [] },
          { label: '复习方法', kids: [] }
        ]}
      ]
    },
    c_project: {
      label: '项目计划',
      root: '📋 项目计划',
      tree: [
        { label: '🎯 项目目标', kids: [
          { label: '总目标', kids: [] },
          { label: '成功标准', kids: [] }
        ]},
        { label: '🪜 阶段', kids: [
          { label: '阶段 1：启动', kids: [{ label: '任务', kids: [] }, { label: '负责人', kids: [] }] },
          { label: '阶段 2：执行', kids: [{ label: '任务', kids: [] }, { label: '负责人', kids: [] }] },
          { label: '阶段 3：收尾', kids: [{ label: '任务', kids: [] }, { label: '负责人', kids: [] }] }
        ]},
        { label: '🏁 里程碑', kids: [
          { label: 'M1：……', kids: [] },
          { label: 'M2：……', kids: [] }
        ]},
        { label: '⚠️ 风险预案', kids: [] }
      ]
    },
    c_swot: {
      label: 'SWOT 分析',
      root: '⚖️ SWOT 分析',
      tree: [
        { label: '💪 S 优势', kids: [
          { label: '内部资源', kids: [] },
          { label: '核心能力', kids: [] }
        ]},
        { label: '😟 W 劣势', kids: [
          { label: '短板', kids: [] },
          { label: '待改进', kids: [] }
        ]},
        { label: '🌟 O 机会', kids: [
          { label: '外部趋势', kids: [] },
          { label: '潜在合作', kids: [] }
        ]},
        { label: '⚡ T 威胁', kids: [
          { label: '竞争对手', kids: [] },
          { label: '政策风险', kids: [] }
        ]}
      ]
    },
    c_5w2h: {
      label: '5W2H',
      root: '❓ 5W2H 分析',
      tree: [
        { label: 'What：是什么', kids: [] },
        { label: 'Why：为什么', kids: [] },
        { label: 'Who：谁负责', kids: [] },
        { label: 'When：何时', kids: [] },
        { label: 'Where：何地', kids: [] },
        { label: 'How：怎么做', kids: [] },
        { label: 'How much：多少', kids: [] }
      ]
    },
    c_persona: {
      label: '用户画像',
      root: '👤 用户画像',
      tree: [
        { label: '🧑 人口属性', kids: [
          { label: '年龄 / 性别', kids: [] },
          { label: '职业 / 收入', kids: [] },
          { label: '城市 / 学历', kids: [] }
        ]},
        { label: '🎯 行为特征', kids: [
          { label: '使用场景', kids: [] },
          { label: '使用频率', kids: [] }
        ]},
        { label: '😣 痛点', kids: [
          { label: '痛点 1', kids: [] },
          { label: '痛点 2', kids: [] }
        ]},
        { label: '💡 核心需求', kids: [
          { label: '功能需求', kids: [] },
          { label: '情感需求', kids: [] }
        ]},
        { label: '📲 触点', kids: [
          { label: '触点 1', kids: [] },
          { label: '触点 2', kids: [] }
        ]}
      ]
    },
    c_flow: {
      label: '流程图',
      root: '🔁 流程图',
      tree: [
        { label: '🚩 起点', kids: [] },
        { label: '步骤 1', kids: [] },
        { label: '❓ 判断条件', kids: [
          { label: '是 → ……', kids: [] },
          { label: '否 → ……', kids: [] }
        ]},
        { label: '步骤 2', kids: [] },
        { label: '步骤 3', kids: [] },
        { label: '🏁 终点', kids: [] }
      ]
    },
    c_goal: {
      label: '目标规划',
      root: '🎯 目标规划',
      tree: [
        { label: '🌟 长期愿景（3-5 年）', kids: [
          { label: '我想成为……', kids: [] }
        ]},
        { label: '⛰️ 中期目标（1 年）', kids: [
          { label: '目标 A', kids: [] },
          { label: '目标 B', kids: [] }
        ]},
        { label: '📆 本月重点', kids: [
          { label: '聚焦 1', kids: [] },
          { label: '聚焦 2', kids: [] }
        ]},
        { label: '📅 本周计划', kids: [
          { label: '周一 - ……', kids: [] },
          { label: '周三 - ……', kids: [] },
          { label: '周五 - ……', kids: [] }
        ]},
        { label: '☀️ 今天必做', kids: [
          { label: 'Todo 1', kids: [] },
          { label: 'Todo 2', kids: [] }
        ]}
      ]
    },
    c_habit: {
      label: '习惯养成',
      root: '🌱 习惯养成',
      tree: [
        { label: '💧 微习惯', kids: [
          { label: '每天 1 分钟', kids: [] },
          { label: '触发动作', kids: [] }
        ]},
        { label: '⏰ 触发', kids: [
          { label: '时间触发', kids: [] },
          { label: '场景触发', kids: [] }
        ]},
        { label: '🏃 行动', kids: [
          { label: '具体动作', kids: [] }
        ]},
        { label: '🎁 奖励', kids: [
          { label: '即时奖励', kids: [] }
        ]},
        { label: '📅 打卡', kids: [
          { label: 'Day 1 ✅', kids: [] },
          { label: 'Day 2 ✅', kids: [] },
          { label: 'Day 3 ☐', kids: [] }
        ]}
      ]
    },
    c_year: {
      label: '年度复盘',
      root: '🗓️ 年度复盘',
      tree: [
        { label: '🏆 成就', kids: [
          { label: '职业 / 学习', kids: [] },
          { label: '生活 / 兴趣', kids: [] }
        ]},
        { label: '😔 遗憾', kids: [
          { label: '没做的事', kids: [] },
          { label: '做错的事', kids: [] }
        ]},
        { label: '🪞 反思', kids: [
          { label: '学到了什么', kids: [] },
          { label: '下次怎么做', kids: [] }
        ]},
        { label: '🙏 感恩', kids: [
          { label: '感谢的人', kids: [] }
        ]},
        { label: '🚀 明年目标', kids: [
          { label: '目标 1', kids: [] },
          { label: '目标 2', kids: [] },
          { label: '目标 3', kids: [] }
        ]}
      ]
    },
    c_okr: {
      label: 'OKR',
      root: '🚀 OKR',
      tree: [
        { label: '🎯 Objective 1：……', kids: [
          { label: 'KR1.1：……', kids: [] },
          { label: 'KR1.2：……', kids: [] },
          { label: 'KR1.3：……', kids: [] }
        ]},
        { label: '🎯 Objective 2：……', kids: [
          { label: 'KR2.1：……', kids: [] },
          { label: 'KR2.2：……', kids: [] }
        ]},
        { label: '🎯 Objective 3：……', kids: [
          { label: 'KR3.1：……', kids: [] },
          { label: 'KR3.2：……', kids: [] }
        ]}
      ]
    },
    c_readlist: {
      label: '阅读书单',
      root: '📚 阅读书单',
      tree: [
        { label: '📖 书 1', kids: [
          { label: '作者', kids: [] },
          { label: '进度 30%', kids: [] },
          { label: '推荐理由', kids: [] },
          { label: '我的笔记', kids: [] }
        ]},
        { label: '📖 书 2', kids: [
          { label: '作者', kids: [] },
          { label: '进度 0%', kids: [] },
          { label: '推荐理由', kids: [] }
        ]},
        { label: '📖 书 3', kids: [
          { label: '作者', kids: [] },
          { label: '进度 80%', kids: [] },
          { label: '推荐理由', kids: [] }
        ]},
        { label: '🆕 待加入', kids: [] }
      ]
    }
  };

  // ---------- 把 CONTENT_TEMPLATES 树形结构转成 nodes + edges ----------
  App.buildContentTree = function(templateId, palette) {
    palette = palette || ['#5cc56a', '#34bcd6', '#7a5cd9', '#1e9bb8', '#b69bff', '#3da355', '#ffd86b', '#82f0f9'];
    const t = (this.CONTENT_TEMPLATES || {})[templateId];
    if (!t) return { nodes: [], edges: [] };
    const nodes = []; const edges = [];
    const rootId = 'n0';
    nodes.push({
      id: rootId, label: t.root, x: 600, y: 400,
      color: '#7a5cd9', isRoot: true, shape: 'round',
      fontSize: 'lg', fontStyle: 'bold', textColor: '#fff'
    });
    let counter = 0;
    const walk = (item, parentId, depth) => {
      counter++;
      const id = 'n' + counter;
      const c = palette[(depth - 1) % palette.length];
      const isLeaf = !item.kids || item.kids.length === 0;
      nodes.push({
        id, label: item.label, x: 0, y: 0,
        color: depth === 1 ? c : (depth === 2 ? '#ebffd7' : '#fff'),
        isRoot: false, parentId,
        shape: depth === 1 ? 'rect' : 'circle',
        fontSize: depth === 1 ? 'md' : (depth === 2 ? 'sm' : 'xs'),
        fontStyle: depth === 1 ? 'bold' : 'normal',
        textColor: depth === 1 ? '#fff' : '#1f2937',
        _leaf: isLeaf
      });
      if (parentId) edges.push({ from: parentId, to: id });
      (item.kids || []).forEach(k => walk(k, id, depth + 1));
    };
    (t.tree || []).forEach(it => walk(it, rootId, 1));
    return { nodes, edges };
  };

  // ---------- 模板 → 初始节点生成 ----------
  App.applyTemplate = function(templateId, me) {
    const t = (this.MINDMAP_TEMPLATES || []).find(x => x.id === templateId) || this.MINDMAP_TEMPLATES[0];
    const color = t.defaultColor;
    const base = {
      id: uid(),
      title: t.label + '导图',
      template: templateId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: me.id,
      edges: []
    };
    if (templateId === 'blank') {
      base.nodes = [
        { id: 'n0', label: '中心主题', x: 600, y: 400, color, isRoot: true, shape: 'circle', fontSize: 'lg', fontStyle: 'bold', textColor: '#1f2937' }
      ];
    } else if (templateId === 'radial') {
      // 中心 + 6 个外圈节点
      base.nodes = [
        { id: 'n0', label: '中心主题', x: 600, y: 400, color, isRoot: true, shape: 'circle', fontSize: 'lg', fontStyle: 'bold', textColor: '#1f2937' }
      ];
      const labels = ['板块一', '板块二', '板块三', '板块四', '板块五', '板块六'];
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const r = 260;
        const id = uid();
        base.nodes.push({
          id, label: labels[i],
          x: 600 + Math.cos(ang) * r,
          y: 400 + Math.sin(ang) * r,
          color: ['#5cc56a','#34bcd6','#7a5cd9','#ffd86b','#1e9bb8','#b69bff'][i],
          isRoot: false, parentId: 'n0', shape: 'round',
          fontSize: 'md', fontStyle: 'normal', textColor: '#1f2937'
        });
        base.edges.push({ from: 'n0', to: id });
      }
    } else if (templateId === 'tree') {
      // 中心 + 3 个一级 + 各 2 个二级（左右铺开）
      base.nodes = [
        { id: 'n0', label: '总主题', x: 600, y: 400, color, isRoot: true, shape: 'round', fontSize: 'lg', fontStyle: 'bold', textColor: '#1f2937' }
      ];
      const lvl1 = [
        { y: 200, label: 'A 部门', color: '#5cc56a' },
        { y: 400, label: 'B 部门', color: '#34bcd6' },
        { y: 600, label: 'C 部门', color: '#b69bff' }
      ];
      lvl1.forEach((l, i) => {
        const aId = uid();
        base.nodes.push({
          id: aId, label: l.label, x: 920, y: l.y, color: l.color,
          isRoot: false, parentId: 'n0', shape: 'rect',
          fontSize: 'md', fontStyle: 'bold', textColor: '#fff'
        });
        base.edges.push({ from: 'n0', to: aId });
        // 2 个子节点
        for (let j = 0; j < 2; j++) {
          const cId = uid();
          base.nodes.push({
            id: cId, label: '子项 ' + (j + 1),
            x: 1100, y: l.y + (j === 0 ? -35 : 35),
            color: l.color, isRoot: false, parentId: aId, shape: 'rect',
            fontSize: 'sm', fontStyle: 'normal', textColor: '#1f2937'
          });
          base.edges.push({ from: aId, to: cId });
        }
      });
    } else if (templateId === 'timeline') {
      base.nodes = [
        { id: 'n0', label: '开始', x: 150, y: 400, color: '#5cc56a', isRoot: true, shape: 'circle', fontSize: 'md', fontStyle: 'bold', textColor: '#fff' }
      ];
      const steps = ['阶段 1', '阶段 2', '阶段 3', '阶段 4', '结束'];
      const colors = ['#34bcd6', '#7a5cd9', '#1e9bb8', '#3da355', '#b69bff'];
      steps.forEach((s, i) => {
        const id = uid();
        base.nodes.push({
          id, label: s,
          x: 300 + i * 200, y: 400,
          color: colors[i], isRoot: false, parentId: 'n0', shape: 'round',
          fontSize: 'md', fontStyle: 'normal', textColor: '#1f2937'
        });
        base.edges.push({ from: i === 0 ? 'n0' : base.nodes[base.nodes.length - 2].id, to: id });
      });
    } else if (templateId === 'fishbone') {
      // 主骨 + 上 3 下 3
      base.nodes = [
        { id: 'n0', label: '问题 / 结果', x: 1000, y: 400, color: '#dc2626', isRoot: true, shape: 'round', fontSize: 'lg', fontStyle: 'bold', textColor: '#fff' }
      ];
      const up = ['原因 1', '原因 2', '原因 3'];
      const dn = ['原因 4', '原因 5', '原因 6'];
      up.forEach((s, i) => {
        const id = uid();
        base.nodes.push({
          id, label: s, x: 400 + i * 200, y: 200,
          color: '#5cc56a', isRoot: false, parentId: 'n0', shape: 'rect',
          fontSize: 'sm', fontStyle: 'normal', textColor: '#fff'
        });
        base.edges.push({ from: 'n0', to: id });
      });
      dn.forEach((s, i) => {
        const id = uid();
        base.nodes.push({
          id, label: s, x: 400 + i * 200, y: 600,
          color: '#34bcd6', isRoot: false, parentId: 'n0', shape: 'rect',
          fontSize: 'sm', fontStyle: 'normal', textColor: '#fff'
        });
        base.edges.push({ from: 'n0', to: id });
      });
    } else if (templateId === 'logic') {
      base.nodes = [
        { id: 'n0', label: '概念 A', x: 300, y: 200, color: '#7a5cd9', isRoot: true, shape: 'round', fontSize: 'md', fontStyle: 'bold', textColor: '#fff' },
        { id: 'n1', label: '概念 B', x: 300, y: 600, color: '#34bcd6', isRoot: false, parentId: 'n0', shape: 'round', fontSize: 'md', fontStyle: 'bold', textColor: '#fff' }
      ];
      base.edges.push({ from: 'n0', to: 'n1' });
      ['结论 1', '结论 2', '结论 3'].forEach((s, i) => {
        const id = uid();
        base.nodes.push({
          id, label: s, x: 700, y: 200 + i * 200,
          color: ['#5cc56a', '#1e9bb8', '#b69bff'][i],
          isRoot: false, parentId: 'n1', shape: 'rect',
          fontSize: 'sm', fontStyle: 'normal', textColor: '#1f2937'
        });
        base.edges.push({ from: 'n1', to: id });
      });
    } else if ((this.CONTENT_TEMPLATES || {})[templateId]) {
      // 内容模板（c_xxx）：从 CONTENT_TEMPLATES 树形结构生成
      const t = this.CONTENT_TEMPLATES[templateId];
      const palette = ['#5cc56a', '#34bcd6', '#7a5cd9', '#1e9bb8', '#b69bff', '#3da355', '#ffd86b', '#82f0f9'];
      const built = this.buildContentTree(templateId, palette);
      base.nodes = built.nodes;
      base.edges = built.edges;
      base.title = t.label + '导图';
    }
    return base;
  };

  // ---------- 字段默认值兜底（兼容旧数据） ----------
  App.normalizeDraft = function(draft) {
    if (!draft.template) draft.template = 'blank';
    draft.nodes.forEach(n => {
      if (!n.shape) n.shape = n.isRoot ? 'circle' : 'circle';
      if (!n.fontSize) n.fontSize = n.isRoot ? 'lg' : 'md';
      if (!n.fontStyle) n.fontStyle = n.isRoot ? 'bold' : 'normal';
      if (!n.textColor) n.textColor = n.isRoot ? '#1f2937' : '#1f2937';
    });
    return draft;
  };

  App.renderMindmapEditor = function(templateId) {
    const me = currentUser();
    const el = $('#view-mindmap-editor');
    if (!el) return;
    if (!me) {
      el.innerHTML = '<div class="card p-10 text-center text-slate-500">请先登录后再绘制思维导图</div>';
      return;
    }
    // 向导模式：第 1 步必须先选文件/模板/素材，才能进第 2 步
    if (templateId) {
      this.userMindmapDraft = this.normalizeDraft(this.applyTemplate(templateId, me));
      this.mindmapStep = 2;
    } else if (this.userMindmapDraft && this.userMindmapDraft.nodes && this.userMindmapDraft.nodes.length > 0) {
      this.userMindmapDraft = this.normalizeDraft(this.userMindmapDraft);
      this.mindmapStep = 2;
    } else {
      this.mindmapStep = 1;
    }
    this.renderMindmapEditorView(el, this.userMindmapDraft);
  };

  App.renderMindmapEditorView = function(el, draft) {
    if (!el) return;
    const step = this.mindmapStep || 1;
    if (step === 1) return this.renderMindmapStep1(el);
    if (step === 1.5) return this.renderMindmapParsePreview(el, draft);
    if (step === 3) return this.renderMindmapStep3(el, draft);
    return this.renderMindmapStep2(el, draft);
  },

  // ---------- 向导 · 第 1 步：选文件 / 选模板 / 选素材 ----------
  App.renderMindmapStep1 = function(el) {
    const tab = this.mindmapWelcomeTab || 'file';
    el.innerHTML = `
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gradient">🖌️ 创建我的思维导图</h2>
          <p class="text-sm text-slate-500 mt-1">第 1 步 / 共 3 步 · 选择一种方式开始</p>
        </div>
        <div class="flex gap-2">
          <button onclick="App.showUserMindmapsList && App.showUserMindmapsList()" class="btn-ghost text-sm">📂 我的作品</button>
        </div>
      </div>

      <!-- 步骤指示器 -->
      <div class="flex items-center gap-2 mb-5">
        <div class="flex items-center gap-2 flex-1">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style="background: linear-gradient(135deg, #5cc56a, #34bcd6);">1</div>
          <div class="font-semibold text-sm text-brand-700">选择起点</div>
        </div>
        <div class="h-0.5 flex-1 bg-slate-200"></div>
        <div class="flex items-center gap-2 flex-1">
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 text-slate-400 text-sm font-bold">2</div>
          <div class="font-semibold text-sm text-slate-400">编辑内容</div>
        </div>
        <div class="h-0.5 flex-1 bg-slate-200"></div>
        <div class="flex items-center gap-2 flex-1">
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 text-slate-400 text-sm font-bold">3</div>
          <div class="font-semibold text-sm text-slate-400">保存作品</div>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="flex gap-2 mb-4 flex-wrap">
        <button class="mm-tab px-4 py-2 rounded-xl text-sm font-semibold border-2 transition" data-tab="file" style="${tab==='file'?'background:linear-gradient(135deg,#5cc56a,#34bcd6);color:#fff;border-color:transparent;':'background:#fff;color:#475569;border-color:#e2e8f0;'}">📤 上传文件</button>
        <button class="mm-tab px-4 py-2 rounded-xl text-sm font-semibold border-2 transition" data-tab="template" style="${tab==='template'?'background:linear-gradient(135deg,#7a5cd9,#b69bff);color:#fff;border-color:transparent;':'background:#fff;color:#475569;border-color:#e2e8f0;'}">📐 模板库</button>
        <button class="mm-tab px-4 py-2 rounded-xl text-sm font-semibold border-2 transition" data-tab="library" style="${tab==='library'?'background:linear-gradient(135deg,#f29900,#ffd86b);color:#fff;border-color:transparent;':'background:#fff;color:#475569;border-color:#e2e8f0;'}">📚 文字素材</button>
      </div>

      ${tab === 'file' ? this._renderMmStep1File() : ''}
      ${tab === 'template' ? this._renderMmStep1Template() : ''}
      ${tab === 'library' ? this._renderMmStep1Library() : ''}
    `;
    this.bindMindmapStep1Events();
  },

  // Tab 1：上传文件（参考截图风格优化）
  App._renderMmStep1File = function() {
    return `
      <div class="card p-6 md:p-7" style="background: linear-gradient(135deg, #ebffd7 0%, #d0f6ff 50%, #e7d8ff 100%); border-color: rgba(130,240,249,0.55);">
        <h3 class="font-bold text-xl mb-1" style="color:#164521;">把学习资料丢进来，导图自己长出来</h3>
        <p class="text-sm text-slate-600 mb-4 leading-relaxed">支持 <b>.docx / .pdf / .txt / .md</b>，AI 自动提炼层级、生成一张可编辑的思维导图。<br/>
          <span class="text-xs text-slate-500">${this.MINDMAP_TEMPLATES?.length || 21} 种版式 · ${Object.keys(this.WORD_LIBRARY||{}).length || 14} 个内容模板 · 100+ 词条素材库 · 5 种节点形状 · 改字号/改字色/改形状自由发挥</span></p>

        <div class="flex flex-wrap gap-3 mb-5">
          <label class="btn-grad cursor-pointer text-sm" style="padding:10px 24px;">
            📤 立即上传生成
            <input id="mmFileInput" type="file" accept=".txt,.md,.markdown,.docx,.pdf,.xmind,.opml,.json" class="hidden" />
          </label>
          <button id="mmFileDemo" class="btn-ghost text-sm" style="padding:10px 20px;">🧭 浏览学科导图</button>
        </div>

        <!-- 三步骤引导卡片 -->
        <div class="grid grid-cols-3 gap-3 mt-2">
          <div class="bg-white/75 rounded-2xl py-4 px-3 text-center border border-white/60">
            <div class="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-lg font-bold mb-2" style="background: linear-gradient(135deg, #5cc56a, #34bcd6); color: white;">①</div>
            <div class="text-sm font-semibold text-slate-700">上传 / 粘贴</div>
            <div class="text-[10px] text-slate-400 mt-0.5">选择本地文件或粘贴文本</div>
          </div>
          <div class="bg-white/75 rounded-2xl py-4 px-3 text-center border border-white/60">
            <div class="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-lg font-bold mb-2" style="background: linear-gradient(135deg, #f29900, #ffd86b); color: white;">②</div>
            <div class="text-sm font-semibold text-slate-700">智能解析</div>
            <div class="text-[10px] text-slate-400 mt-0.5">AI 自动提炼内容层级结构</div>
          </div>
          <div class="bg-white/75 rounded-2xl py-4 px-3 text-center border border-white/60">
            <div class="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-lg font-bold mb-2" style="background: linear-gradient(135deg, #7a5cd9, #b69bff); color: white;">③</div>
            <div class="text-sm font-semibold text-slate-700">编辑 / 导出</div>
            <div class="text-[10px] text-slate-400 mt-0.5">调整样式、保存或导出图片</div>
          </div>
        </div>

        <div id="mmFileStatus" class="text-[12px] text-slate-500 mt-3 text-center">未选择文件</div>

        <div class="mt-4 p-4 rounded-xl" style="background: rgba(255,255,255,0.65);">
          <h4 class="font-semibold text-sm mb-2">💡 提示：什么样的文件效果最好？</h4>
          <ul class="text-xs text-slate-600 space-y-1 list-disc pl-5">
            <li>用 <b># 标题</b> 划分章节（最多 6 级），每个标题生成一个节点</li>
            <li>用 <b>- 列表项</b> / <b>1. 数字列表</b> 列出要点，每条生成子节点</li>
            <li>章节缩进越多，离根节点越远</li>
            <li>支持 .docx（Word 文档）— 自动提取纯文本再生成</li>
          </ul>
        </div>
      </div>
    `;
  },

  // Tab 2：模板库
  App._renderMmStep1Template = function() {
    const cats = this.MINDMAP_TEMPLATE_CATS || [];
    return `
      <div class="card p-6" style="background: linear-gradient(135deg, #ebffd7 0%, #d0f6ff 50%, #e7d8ff 100%); border-color: rgba(122,92,217,0.35);">
        <h3 class="font-bold text-lg mb-1" style="color:#164521;">📐 模板库 · 一键套用</h3>
        <p class="text-sm text-slate-500 mb-4">${this.MINDMAP_TEMPLATES.length} 种模板 · 4 大分类 · 内容模板带预设结构</p>
        ${cats.map(cat => `
          <div class="mb-4">
            <div class="flex items-baseline gap-2 mb-2">
              <h4 class="font-semibold text-sm">${cat.label}</h4>
              <span class="text-[11px] text-slate-500">${cat.desc}</span>
            </div>
            <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
              ${this.MINDMAP_TEMPLATES.filter(t => t.cat === cat.id).map(t => `
                <button class="mm-tpl-welcome p-3 rounded-xl border-2 text-center transition hover:shadow-md" data-tpl="${t.id}"
                        style="border-color:${t.defaultColor}; background:#fff;">
                  <div class="text-2xl mb-1">${t.icon}</div>
                  <div class="text-xs font-semibold" style="color:${t.defaultColor};">${t.label}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">${t.desc}</div>
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // Tab 3：文字素材库
  App._renderMmStep1Library = function() {
    const lib = this.WORD_LIBRARY || {};
    const cats = Object.keys(lib);
    return `
      <div class="card p-6" style="background: linear-gradient(135deg, #ebffd7 0%, #d0f6ff 50%, #e7d8ff 100%); border-color: rgba(242,153,0,0.35);">
        <h3 class="font-bold text-lg mb-1" style="color:#164521;">📚 文字素材库</h3>
        <p class="text-sm text-slate-500 mb-4">点词条即可「创建新导图并插入」· ${cats.length} 大类 100+ 词条</p>
        <div id="mmLibAccordion" class="space-y-3">
          ${cats.map(catId => {
            const cat = lib[catId];
            return `
              <div class="rounded-xl overflow-hidden border" style="border-color:#e2e8f0; background:#fff;">
                <div class="mm-lib-head flex items-center justify-between p-3 cursor-pointer" data-cat="${catId}">
                  <div>
                    <div class="font-semibold text-sm">${cat.label}</div>
                    <div class="text-[11px] text-slate-500">${cat.desc}</div>
                  </div>
                  <div class="text-slate-400 text-sm mm-lib-toggle">▾</div>
                </div>
                <div class="mm-lib-body p-3 pt-0" style="display:none;">
                  ${cat.groups.map(g => `
                    <div class="mb-3">
                      <div class="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">${g.icon} ${g.name} <span class="text-[10px] text-slate-400 font-normal">(${g.words.length})</span></div>
                      <div class="flex flex-wrap gap-1.5">
                        ${g.words.map(w => `<button class="mm-lib-word px-2.5 py-1 rounded-full text-xs border border-slate-200 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 transition" data-word="${escapeHtml(w)}" data-cat="${catId}" data-group="${escapeHtml(g.name)}">${escapeHtml(w)}</button>`).join('')}
                      </div>
                    </div>
                  `).join('')}
                  <div class="mt-3 pt-3 border-t border-slate-100">
                    <div class="text-[11px] text-slate-500 mb-2">字体样式预设（应用于选中节点）：</div>
                    <div class="flex flex-wrap gap-1.5">
                      ${this.FONT_PRESETS.map(p => `<button class="mm-font-preset px-2.5 py-1 rounded text-xs border-2" data-preset="${p.id}" style="background:${p.bg};color:${p.color};border-color:${p.bg};font-size:${p.size==='xl'?'13':(p.size==='lg'?'12':(p.size==='md'?'11':(p.size==='sm'?'10':'9')))}px;font-weight:${p.style==='bold'?700:500};font-style:${p.style==='italic'?'italic':'normal'};text-decoration:${p.style==='underline'?'underline':'none'};">${p.label}</button>`).join('')}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="mt-5 p-4 rounded-xl" style="background: rgba(255,255,255,0.7);">
          <h4 class="font-semibold text-sm mb-2">🎯 用法</h4>
          <ul class="text-xs text-slate-600 space-y-1 list-disc pl-5">
            <li>展开分类后，<b>点词条</b>立即创建一份新导图，词条作为根节点</li>
            <li>再进入第 2 步编辑面板，可以继续从素材库点选更多词条</li>
            <li>在第 2 步选中节点后，<b>字体样式预设</b>会应用到该节点</li>
          </ul>
        </div>
      </div>
    `;
  },

  App.bindMindmapStep1Events = function() {
    document.querySelectorAll('.mm-tab').forEach(b => {
      b.addEventListener('click', () => {
        this.mindmapWelcomeTab = b.dataset.tab;
        this.renderMindmapStep1($('#view-mindmap-editor'));
      });
    });
    // 文件上传
    $('#mmFileInput')?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) this.parseFileToMindmap(file);
    });
    // 试试示例
    $('#mmFileDemo')?.addEventListener('click', () => {
      const demoText = `# 考研英语复习计划
## 单词
- 词根词缀记忆法
- 高频核心词汇 2000+
- 熟词僻义专项突破
## 语法
- 长难句拆解技巧
- 十大时态语态系统
- 虚拟语气与倒装
## 阅读
- 细节定位题解法
- 主旨大意题套路
- 推理判断题陷阱
## 写作
- 小作文模板（图表/书信）
- 大作文框架（正面/负面）
- 高分替换词汇集
# 复习时间线
## 基础阶段（3-6月）
- 单词过两遍 + 语法入门
- 每天2小时阅读训练
## 强化阶段（7-9月）
- 真题刷题（2010-2020）
- 写作积累素材库
## 冲刺阶段（10-12月）
- 模考 + 查漏补缺
- 作文模板背诵`;
      this._mmParseFileInfo = { name: '考研英语复习示例.md', ext: 'md', size: demoText.length };
      this.parseTextToMindmap(demoText, '考研英语复习示例');
    });
    // 模板点击：直接用模板
    document.querySelectorAll('.mm-tpl-welcome').forEach(b => {
      b.addEventListener('click', () => {
        const tplId = b.dataset.tpl;
        const me = currentUser();
        this.userMindmapDraft = this.normalizeDraft(this.applyTemplate(tplId, me));
        this.mindmapStep = 2;
        this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft);
        toast('已应用模板：' + (this.MINDMAP_TEMPLATES.find(t => t.id === tplId) || {}).label);
      });
    });
    // 素材库展开/折叠
    document.querySelectorAll('.mm-lib-head').forEach(b => {
      b.addEventListener('click', () => {
        const body = b.nextElementSibling;
        const tog = b.querySelector('.mm-lib-toggle');
        if (!body) return;
        const open = body.style.display === 'block';
        body.style.display = open ? 'none' : 'block';
        if (tog) tog.textContent = open ? '▾' : '▴';
      });
    });
    // 词条点击：创建新导图（根节点=词条）
    document.querySelectorAll('.mm-lib-word').forEach(b => {
      b.addEventListener('click', () => {
        const word = b.dataset.word;
        const me = currentUser();
        const draft = {
          id: uid(),
          title: word + ' 导图',
          template: 'blank',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          userId: me.id,
          nodes: [
            { id: 'n0', label: word, x: 600, y: 400, color: '#5cc56a', isRoot: true,
              shape: 'round', fontSize: 'lg', fontStyle: 'bold', textColor: '#fff' }
          ],
          edges: []
        };
        this.userMindmapDraft = this.normalizeDraft(draft);
        this.mindmapStep = 2;
        this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft);
        toast('已创建：' + word);
      });
    });
  },

  // ========== 向导 · 第 1.5 步：智能解析预览 ==========
  App._mmParseFileInfo = null; // 存储上传文件信息，供解析页展示
  App._mmParsedText = '';      // 存储原始文本

  App.renderMindmapParsePreview = function(el, draft) {
    if (!draft || !draft.nodes || draft.nodes.length === 0) {
      this.mindmapStep = 1;
      return this.renderMindmapStep1(el);
    }
    draft = this.normalizeDraft(draft);
    const fi = this._mmParseFileInfo || {};
    const rawText = this._mmParsedText || '';

    // 计算层级深度
    const childrenOf = {};
    draft.nodes.forEach(n => { if (n.parentId) (childrenOf[n.parentId] = childrenOf[n.parentId] || []).push(n); });
    const maxDepth = (() => {
      let md = 0;
      const visit = (id, d) => { if (d > md) md = d; (childrenOf[id] || []).forEach(c => visit(c.id, d+1)); };
      visit(draft.nodes[0]?.id || 'n0', 0);
      return md;
    })();

    // 构建结构树 HTML（用于左侧展示）
    const buildTreeHtml = (parentId, depth=0) => {
      const kids = draft.nodes.filter(n => n.parentId === parentId);
      if (!kids.length) return '';
      return `<ul class="${depth===0?'':'ml-4 border-l-2 border-brand-200 pl-3'}">` +
        kids.map(n => `
          <li class="mb-1">
            <div class="flex items-center gap-1.5 text-xs py-1 px-2 rounded hover:bg-brand-50 transition cursor-default" style="padding-left:${depth*8}px">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${n.color}"></span>
              <span class="truncate ${n.fontStyle==='bold'?'font-semibold':''}" style="color:${n.textColor||'#1f2937'}">${escapeHtml(n.label)}</span>
              <span class="text-[10px] text-slate-400 ml-auto">${(childrenOf[n.id]||[]).length} 子</span>
            </div>
            ${buildTreeHtml(n.id, depth+1)}
          </li>`).join('') + `</ul>`;
    };

    el.innerHTML = `
      <!-- 顶部导航 -->
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <button id="mmBackTo1" class="btn-ghost text-sm">← 返回重选</button>
          <div>
            <h2 class="text-xl font-bold text-gradient">🧠 智能解析 · 导图预览</h2>
            <p class="text-xs text-slate-500 mt-0.5">第 2 步 / 共 3 步 · AI 已自动提炼内容层级结构</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button id="mmReparse" class="btn-ghost text-sm">🔄 重新解析</button>
          <button id="mmConfirmDraft" class="btn-grad text-sm">✅ 确认生成导图 →</button>
        </div>
      </div>

      <!-- 步骤指示器 -->
      <div class="flex items-center gap-2 mb-5">
        <div class="flex items-center gap-2 flex-1 cursor-pointer" id="ppStep1Jump">
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 text-slate-500 text-sm font-bold">✓</div>
          <div class="font-semibold text-sm text-slate-500">① 上传/粘贴</div>
        </div>
        <div class="h-0.5 flex-1" style="background: linear-gradient(90deg, #5cc56a, #34bcd6);"></div>
        <div class="flex items-center gap-2 flex-1">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold animate-pulse-slow" style="background: linear-gradient(135deg, #f29900, #ffd86b);">②</div>
          <div class="font-semibold text-sm" style="color:#d97706;">智能解析</div>
        </div>
        <div class="h-0.5 flex-1 bg-slate-200"></div>
        <div class="flex items-center gap-2 flex-1">
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 text-slate-400 text-sm font-bold">3</div>
          <div class="font-semibold text-sm text-slate-400">③ 编辑 / 导出</div>
        </div>
      </div>

      <!-- 主内容区：左右布局 -->
      <div class="grid lg:grid-cols-5 gap-4">

        <!-- 左侧：文件信息 + 结构树 -->
        <div class="lg:col-span-2 space-y-3">
          <!-- 文件信息卡片 -->
          <div class="card p-4" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%); border-color: rgba(217,119,6,0.25);">
            <div class="flex items-start gap-3">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                ${fi.ext === 'pdf'?'📄':(fi.ext==='docx'?'📝':(fi.ext==='md'||fi.ext==='txt'?'📃':'📁'))}
              </div>
              <div class="min-w-0 flex-1">
                <div class="font-bold text-sm truncate" style="color:#92400e;">${escapeHtml(fi.name || '导入的内容')}</div>
                <div class="text-[11px] text-amber-700 mt-0.5 space-y-0.5">
                  <div>格式：<span class="font-medium uppercase">${(fi.ext||'').toUpperCase()}</span> · 大小：${fi.size ? fmtSize(fi.size) : '-'}</div>
                  ${rawText ? `<div>提取字符数：<span class="font-bold">${rawText.length.toLocaleString()}</span></div>` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- 统计面板 -->
          <div class="card p-4">
            <h4 class="font-semibold text-sm mb-3 flex items-center gap-1">📊 解析统计</h4>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-center p-2.5 rounded-xl" style="background: #ebffd7;">
                <div class="text-2xl font-bold" style="color:#3da355;">${draft.nodes.length}</div>
                <div class="text-[10px] text-slate-500">节点数</div>
              </div>
              <div class="text-center p-2.5 rounded-xl" style="background: #d0f6ff;">
                <div class="text-2xl font-bold" style="color:#1e9bb8;">${draft.edges.length}</div>
                <div class="text-[10px] text-slate-500">连线数</div>
              </div>
              <div class="text-center p-2.5 rounded-xl" style="background: #e7d8ff;">
                <div class="text-2xl font-bold" style="color:#7a5cd9;">${maxDepth}</div>
                <div class="text-[10px] text-slate-500">层级深度</div>
              </div>
            </div>
          </div>

          <!-- 结构树 -->
          <div class="card p-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-sm flex items-center gap-1">🌳 层级结构</h4>
              <span class="text-[10px] text-slate-400">共 ${draft.nodes.length} 个节点</span>
            </div>
            <div class="max-h-64 overflow-y-auto pr-1 text-xs" id="ppStructureTree">
              <div class="flex items-center gap-1.5 py-1 px-2 rounded font-semibold" style="color:#7a5cd9;">
                <span class="w-3 h-3 rounded-full" style="background:#7a5cd9;"></span>
                ${escapeHtml(draft.title || '根节点')}
              </div>
              ${buildTreeHtml(draft.nodes[0]?.id)}
            </div>
          </div>

          <!-- 原始文本（可折叠） -->
          ${rawText ? `
          <div class="card p-4">
            <details>
              <summary class="cursor-pointer font-semibold text-sm flex items-center gap-1 list-none">
                📄 原始提取文本
                <span class="text-[10px] text-slate-400 font-normal">（点击展开查看）</span>
              </summary>
              <pre class="mt-2 p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600 whitespace-pre-wrap overflow-auto max-h-48 leading-relaxed">${escapeHtml(rawText)}</pre>
            </details>
          </div>
          ` : ''}

          <!-- 解析选项调整 -->
          <div class="card p-4">
            <h4 class="font-semibold text-sm mb-2 flex items-center gap-1">⚙️ 解析选项</h4>
            <div class="space-y-2">
              <label class="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" id="ppOptMergeShort" checked class="rounded"/>
                合并短节点（&lt;3字的子节点合并到父节点）
              </label>
              <label class="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" id="ppOptMaxDepth" class="rounded"/>
                限制最大层级为 ${Math.min(maxDepth, 6)} 层
              </label>
              <label class="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" id="ppOptSmartGroup" checked class="rounded"/>
                智能分组相似节点
              </label>
            </div>
          </div>
        </div>

        <!-- 右侧：思维导图预览画布 -->
        <div class="lg:col-span-3 space-y-3">
          <div class="card p-3 relative overflow-hidden" style="background: linear-gradient(135deg, #ebffd7 0%, #d0f6ff 50%, #e7d8ff 100%);">
            <div class="absolute top-2 left-2 z-10 px-2 py-1 rounded-full bg-white/80 backdrop-blur text-[10px] font-semibold text-amber-600 shadow-sm">
              ✨ 预览模式 · 可在下一步编辑调整
            </div>
            <svg id="mmCanvasPreview" viewBox="0 0 1200 800" class="w-full" style="min-height:520px; border-radius: 10px;"></svg>
          </div>

          <!-- 操作提示条 -->
          <div class="card p-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span class="font-semibold text-brand-700">💡 下一步可以：</span>
            <span>🖱️ 双击节点编辑文字</span>
            <span>✏️ 拖拽改变位置</span>
            <span>🎨 改颜色/字号/形状</span>
            <span>➕ 增删节点</span>
            <span>📐 切换版式模板</span>
            <span>💾 导出 PNG/SVG</span>
          </div>

          <!-- 快捷操作按钮组 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button id="ppBtnConfirm" class="card p-3 text-center hover:shadow-md transition group" style="border: 2px solid #5cc56a;">
              <div class="text-2xl mb-1 group-hover:scale-110 transition-transform">✅</div>
              <div class="text-xs font-semibold" style="color:#3da355;">确认生成导图</div>
              <div class="text-[10px] text-slate-400">进入编辑模式</div>
            </button>
            <button id="ppBtnReparse" class="card p-3 text-center hover:shadow-md transition group" style="border: 2px solid #f59e0b;">
              <div class="text-2xl mb-1 group-hover:scale-110 transition-transform">🔄</div>
              <div class="text-xs font-semibold" style="color:#d97706;">重新解析</div>
              <div class="text-[10px] text-slate-400">换一种方式提取</div>
            </button>
            <button id="ppBtnEditTxt" class="card p-3 text-center hover:shadow-md transition group" style="border: 2px solid #34bcd6;">
              <div class="text-2xl mb-1 group-hover:scale-110 transition-transform">✏️</div>
              <div class="text-xs font-semibold" style="color:#1e9bb8;">手动编辑文本</div>
              <div class="text-[10px] text-slate-400">修改后重新生成</div>
            </button>
            <button id="ppBtnTemplate" class="card p-3 text-center hover:shadow-md transition group" style="border: 2px solid #7a5cd9;">
              <div class="text-2xl mb-1 group-hover:scale-110 transition-transform">📐</div>
              <div class="text-xs font-semibold" style="color:#7a5cd9;">切换版式</div>
              <div class="text-[10px] text-slate-400">${this.MINDMAP_TEMPLATES?.length || 21} 种模板可选</div>
            </button>
          </div>
        </div>
      </div>
    `;

    // 绘制预览画布
    this.drawMindmapCanvas(draft, 'mmCanvasPreview');

    // 绑定事件
    $('#mmBackTo1')?.addEventListener('click', () => { this.mindmapStep = 1; this.renderMindmapEditorView(el, null); });
    $('#mmReparse')?.addEventListener('click', () => { this.mindmapStep = 1; this.mindmapWelcomeTab = 'file'; this._mmParsedText = ''; this._mmParseFileInfo = null; this.renderMindmapEditorView(el, null); });
    $('#mmConfirmDraft')?.addEventListener('click', () => { this.mindmapStep = 2; this.renderMindmapEditorView(el, draft); });
    $('#ppBtnConfirm')?.addEventListener('click', () => { this.mindmapStep = 2; this.renderMindmapEditorView(el, draft); });
    $('#ppBtnReparse')?.addEventListener('click', () => { this.mindmapStep = 1; this.mindmapWelcomeTab = 'file'; this._mmParsedText = ''; this._mmParseFileInfo = null; this.renderMindmapEditorView(el, null); });
    $('#ppBtnTemplate')?.addEventListener('click', () => {
      // 弹出版式选择浮层
      const tplHtml = `
        <div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" id="ppTplModal">
          <div class="card p-5 w-full max-w-lg animate-scale-in max-h-[80vh] overflow-y-auto">
            <h3 class="font-bold text-lg mb-3 text-gradient">📐 选择导图版式</h3>
            <div class="grid grid-cols-3 gap-2">
              ${(this.MINDMAP_TEMPLATES || []).map(t => `
                <button class="pp-tpl-item p-3 rounded-xl border-2 text-center transition hover:shadow-md" data-tpl="${t.id}"
                        style="border-color:${t.defaultColor};background:#fff;">
                  <div class="text-xl mb-1">${t.icon}</div>
                  <div class="text-xs font-semibold" style="color:${t.defaultColor};">${t.label}</div>
                  <div class="text-[9px] text-slate-400">${t.desc}</div>
                </button>
              `).join('')}
            </div>
            <button onclick="document.getElementById('ppTplModal').remove()" class="mt-3 btn-ghost w-full text-sm">取消</button>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', tplHtml);
      document.querySelectorAll('.pp-tpl-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const tid = btn.dataset.tpl;
          draft.template = tid;
          draft = this.normalizeDraft(this.applyTemplate(tid, currentUser(), draft));
          this.userMindmapDraft = draft;
          document.getElementById('ppTplModal')?.remove();
          this.renderMindmapParsePreview(el, draft);
        });
      });
    });

    // 手动编辑文本
    $('#ppBtnEditTxt')?.addEventListener('click', () => {
      const editModal = `
        <div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" id="ppEditTxtModal">
          <div class="card p-5 w-full max-w-2xl animate-scale-in max-h-[85vh] flex flex-col">
            <h3 class="font-bold text-lg mb-2 text-gradient">✏️ 手动编辑提取的文本</h3>
            <p class="text-xs text-slate-500 mb-3">使用 <b># 标题</b> 划分章节，<b>- 列表</b> 列出要点。修改后点"重新生成"。</p>
            <textarea id="ppEditTextarea" rows="16" class="flex-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-brand-400 font-mono leading-relaxed resize-none">${escapeHtml(rawText)}</textarea>
            <div class="flex gap-2 mt-3 justify-end">
              <button onclick="document.getElementById('ppEditTxtModal').remove()" class="btn-ghost text-sm">取消</button>
              <button id="ppReGenFromTxt" class="btn-grad text-sm">🔄 重新生成导图</button>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', editModal);
      $('#ppReGenFromTxt')?.addEventListener('click', () => {
        const txt = $('#ppEditTextarea')?.value || '';
        if (!txt.trim()) { toast('文本不能为空'); return; }
        document.getElementById('ppEditTxtModal')?.remove();
        this._mmParsedText = txt;
        this.parseTextToMindmap(txt, fi.name || '手动编辑');
      });
    });
  },  // ---------- 向导 · 第 2 步：编辑画布 ----------
  App.renderMindmapStep2 = function(el, draft) {
    if (!draft || !draft.nodes || draft.nodes.length === 0) {
      this.mindmapStep = 1;
      return this.renderMindmapStep1(el);
    }
    draft = this.normalizeDraft(draft);
    const sel = () => draft.nodes.find(n => n.id === this.selectedNodeId) || {};
    const selectedNode = sel();
    const currentSize = selectedNode.fontSize || 'md';
    const currentStyle = selectedNode.fontStyle || 'normal';
    const currentShape = selectedNode.shape || 'circle';
    const currentTextColor = selectedNode.textColor || '#1f2937';
    const currentAlign = selectedNode.align || 'center';
    const hasSel = !!selectedNode.id;

    el.innerHTML = `
      <!-- 顶部：返回 + 步骤指示 + 操作按钮 -->
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <button id="mmBack" class="btn-ghost text-sm">← 上一步</button>
          <div>
            <h2 class="text-xl font-bold text-gradient">🖌️ 编辑思维导图</h2>
            <p class="text-xs text-slate-500">第 3 步 / 共 3 步 · ${draft.nodes.length} 节点 · ${draft.edges.length} 连线 · 可编辑/导出</p>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button id="mmNew"  class="btn-ghost text-sm">+ 新建空白</button>
          <button id="mmLoad" class="btn-ghost text-sm">📂 我的导图</button>
          <button id="mmNext" class="btn-grad text-sm">💾 保存 / 导出 →</button>
        </div>
      </div>

      <!-- 步骤指示器 -->
      <div class="flex items-center gap-2 mb-4">
        <div class="flex items-center gap-2 flex-1 cursor-pointer" id="mmStep1Jump">
          <div class="w-7 h-7 rounded-full flex items-center justify-center bg-slate-200 text-slate-500 text-xs font-bold">✓</div>
          <div class="font-semibold text-sm text-slate-500">① 上传</div>
        </div>
        <div class="h-0.5 flex-1 bg-slate-200"></div>
        <div class="flex items-center gap-2 flex-1 cursor-pointer" id="mmStepParseJump">
          <div class="w-7 h-7 rounded-full flex items-center justify-center bg-slate-200 text-slate-500 text-xs font-bold">✓</div>
          <div class="font-semibold text-sm text-slate-500">② 解析</div>
        </div>
        <div class="h-0.5 flex-1" style="background: linear-gradient(90deg, #5cc56a, #34bcd6);"></div>
        <div class="flex items-center gap-2 flex-1">
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background: linear-gradient(135deg, #5cc56a, #34bcd6);">3</div>
          <div class="font-semibold text-sm text-brand-700">③ 编辑 / 导出</div>
        </div>
      </div>

      <!-- 模板切换条（编辑时仍可改模板，保留） -->
      <div class="card p-3 mb-3">
        <div class="flex items-center gap-2 mb-2">
          <h4 class="font-semibold text-sm">📐 切换模板</h4>
          <span class="text-[11px] text-slate-400">当前：${(this.MINDMAP_TEMPLATES.find(t => t.id === draft.template) || {}).label || '自定义'}</span>
        </div>
        <div class="flex gap-1.5 overflow-x-auto pb-1">
          ${this.MINDMAP_TEMPLATES.map(t => `
            <button class="mm-tpl-btn flex-shrink-0 px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition" data-tpl="${t.id}"
                    style="border-color:${draft.template === t.id ? t.defaultColor : '#e2e8f0'};
                           background:${draft.template === t.id ? t.defaultColor + '14' : '#fff'};
                           color:${draft.template === t.id ? t.defaultColor : '#475569'};">
              ${t.icon} ${t.label}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="grid lg:grid-cols-4 gap-4">
        <!-- 左侧：编辑面板 + 素材库抽屉 -->
        <div class="lg:col-span-1 space-y-3">
          <div class="card p-4">
            <label class="text-xs font-medium text-slate-600">导图标题</label>
            <input id="mmTitle" value="${escapeHtml(draft.title)}" class="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-brand-400" />
          </div>

          <!-- 📚 素材库抽屉（可折叠） -->
          <div class="card p-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-sm flex items-center gap-1">📚 文字素材库</h4>
              <button id="mmDrawerToggle" class="text-[11px] text-brand-600 hover:text-brand-700">展开 ▾</button>
            </div>
            <div id="mmDrawerBody" style="display:none;">
              <div class="text-[11px] text-slate-500 mb-2">点词条 → 插入为新子节点（默认在选中节点下）</div>
              <div class="flex gap-1 mb-2 flex-wrap">
                ${Object.keys(this.WORD_LIBRARY).map(catId => `
                  <button class="mm-lib-cat px-2 py-0.5 rounded-full text-[10px] border border-slate-200 hover:border-brand-400" data-cat="${catId}">${this.WORD_LIBRARY[catId].label}</button>
                `).join('')}
              </div>
              <div id="mmDrawerList" class="max-h-40 overflow-y-auto"></div>
            </div>
          </div>

          <!-- 文字样式面板 -->
          <div class="card p-4">
            <h4 class="font-semibold text-sm mb-2 flex items-center gap-1">✍️ 文字样式 <span class="text-[11px] text-slate-400 font-normal">${hasSel ? '（已选）' : '（请先选节点）'}</span></h4>

            <div class="mb-3">
              <div class="text-[11px] text-slate-500 mb-1.5">字号</div>
              <div class="grid grid-cols-5 gap-1" id="mmFontSizePicker">
                ${this.FONT_SIZES.map(f => `
                  <button class="mm-size-btn py-1.5 rounded text-[11px] font-semibold border ${currentSize === f.id && hasSel ? 'bg-brand-100 border-brand-400 text-brand-700' : 'bg-slate-50 border-slate-200 text-slate-600'} hover:border-brand-300" data-size="${f.id}">${f.label}</button>
                `).join('')}
              </div>
            </div>

            <div class="mb-3">
              <div class="text-[11px] text-slate-500 mb-1.5">字型</div>
              <div class="grid grid-cols-4 gap-1" id="mmFontStylePicker">
                ${this.FONT_STYLES.map(f => `
                  <button class="mm-style-btn py-1.5 rounded text-[11px] border ${currentStyle === f.id && hasSel ? 'bg-brand-100 border-brand-400 text-brand-700' : 'bg-slate-50 border-slate-200 text-slate-600'} hover:border-brand-300" data-style="${f.id}" style="${f.id==='bold'?'font-weight:700':''}${f.id==='italic'?'font-style:italic':''}${f.id==='underline'?'text-decoration:underline':''}">${f.label}</button>
                `).join('')}
              </div>
            </div>

            <div class="mb-3">
              <div class="text-[11px] text-slate-500 mb-1.5">字色</div>
              <div class="flex flex-wrap gap-1.5" id="mmTextColorPicker">
                ${this.TEXT_COLORS.map(c => `
                  <button class="mm-tc-btn w-6 h-6 rounded-full border-2 ${currentTextColor === c && hasSel ? 'ring-2 ring-offset-1 ring-brand-400' : 'border-white shadow'}" data-color="${c}" style="background:${c}"></button>
                `).join('')}
              </div>
            </div>

            <div class="mb-1">
              <div class="text-[11px] text-slate-500 mb-1.5">节点形状</div>
              <div class="grid grid-cols-5 gap-1" id="mmShapePicker">
                ${this.NODE_SHAPES.map(s => `
                  <button class="mm-shape-btn py-1.5 rounded text-[14px] border ${currentShape === s.id && hasSel ? 'bg-brand-100 border-brand-400' : 'bg-slate-50 border-slate-200'} hover:border-brand-300" data-shape="${s.id}" title="${s.label}">${s.icon}</button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- 节点背景色 -->
          <div class="card p-4">
            <h4 class="font-semibold text-sm mb-2">🎨 背景色</h4>
            <div class="flex flex-wrap gap-2" id="mmColorPicker">
              ${['#5cc56a','#34bcd6','#7a5cd9','#ffd86b','#3da355','#1e9bb8','#b69bff','#82f0f9','#a8f08b','#e7d8ff','#dc2626','#f29900'].map(c => `
                <button class="mm-color-btn w-7 h-7 rounded-full border-2 border-white shadow hover:scale-110 transition" data-color="${c}" style="background:${c}"></button>
              `).join('')}
            </div>
          </div>

          <!-- 节点列表 -->
          <div class="card p-4">
            <h4 class="font-semibold text-sm mb-2">📋 当前节点（${draft.nodes.length}）</h4>
            <div class="space-y-1.5 max-h-48 overflow-y-auto" id="mmNodeList">
              ${draft.nodes.map(n => `
                <div class="flex items-center gap-2 p-2 rounded-lg ${n.isRoot ? 'bg-brand-50 border border-brand-200' : 'bg-slate-50'} cursor-pointer mm-node-item" data-id="${n.id}">
                  <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:${n.color}"></span>
                  <span class="text-xs flex-1 truncate" style="${(n.fontStyle==='bold'?'font-weight:700;':'')+(n.fontStyle==='italic'?'font-style:italic;':'')+(n.fontStyle==='underline'?'text-decoration:underline;':'')}">${escapeHtml(n.label)}</span>
                  ${n.isRoot ? '' : `<button class="mm-del text-red-400 hover:text-red-600 text-xs" data-id="${n.id}">×</button>`}
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- 右侧：画布 -->
        <div class="lg:col-span-3">
          <div class="card p-2">
            <svg id="mmCanvas" viewBox="0 0 1200 800" class="w-full" style="min-height:600px; cursor: crosshair; background: linear-gradient(135deg, #ebffd7 0%, #d0f6ff 50%, #e7d8ff 100%); border-radius: 12px;"></svg>
          </div>
          <div class="text-xs text-slate-500 mt-2 flex items-center gap-3 flex-wrap">
            <span>🖱️ <b>双击空白</b>：新增子节点</span>
            <span>👆 <b>点击节点</b>：选中</span>
            <span>✏️ <b>双击节点</b>：编辑文字</span>
            <span>🖐️ <b>拖拽节点</b>：改变位置</span>
            <span>🗑️ <b>×按钮</b>：删除节点</span>
          </div>
        </div>
      </div>
    `;
    this.drawMindmapCanvas(draft);
    this.bindMindmapEditorEvents();
  },

  // ---------- 向导 · 第 3 步：保存 ----------
  App.renderMindmapStep3 = function(el, draft) {
    if (!draft || !draft.nodes || draft.nodes.length === 0) {
      this.mindmapStep = 1;
      return this.renderMindmapStep1(el);
    }
    draft = this.normalizeDraft(draft);
    const me = currentUser();
    const existing = (get(LS.USER_MINDMAPS, []) || []).find(m => m.id === draft.id);
    el.innerHTML = `
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <button id="mmBack" class="btn-ghost text-sm">← 返回编辑</button>
          <div>
            <h2 class="text-xl font-bold text-gradient">💾 保存 & 导出思维导图</h2>
            <p class="text-xs text-slate-500 mt-0.5">第 3 步 / 共 3 步 · 保存作品或导出为图片</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="App.go('mindmap')" class="btn-ghost text-sm">🧭 学科导图</button>
        </div>
      </div>

      <!-- 步骤指示器（完整三步） -->
      <div class="flex items-center gap-2 mb-5">
        <div class="flex items-center gap-2 flex-1 cursor-pointer" id="mmStep1Jump">
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 text-slate-500 text-sm font-bold">✓</div>
          <div class="font-semibold text-sm text-slate-500">① 上传/粘贴</div>
        </div>
        <div class="h-0.5 flex-1 bg-slate-200"></div>
        <div class="flex items-center gap-2 flex-1 cursor-pointer" id="mmStepParseJump">
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 text-slate-500 text-sm font-bold">✓</div>
          <div class="font-semibold text-sm text-slate-500">② 智能解析</div>
        </div>
        <div class="h-0.5 flex-1" style="background: linear-gradient(90deg, #34bcd6, #7a5cd9);"></div>
        <div class="flex items-center gap-2 flex-1">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style="background: linear-gradient(135deg, #7a5cd9, #b69bff);">③</div>
          <div class="font-semibold text-sm" style="color:#7a5cd9;">编辑 / 导出</div>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-4">
        <div class="lg:col-span-1 space-y-3">
          <div class="card p-4">
            <label class="text-xs font-medium text-slate-600">导图标题</label>
            <input id="mmTitle" value="${escapeHtml(draft.title)}" class="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-brand-400" />
          </div>

          <div class="card p-4">
            <h4 class="font-semibold text-sm mb-2">📊 统计信息</h4>
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="p-2 rounded-lg" style="background: #ebffd7;">
                <div class="text-xl font-bold" style="color:#3da355;">${draft.nodes.length}</div>
                <div class="text-[10px] text-slate-500">节点</div>
              </div>
              <div class="p-2 rounded-lg" style="background: #d0f6ff;">
                <div class="text-xl font-bold" style="color:#1e9bb8;">${draft.edges.length}</div>
                <div class="text-[10px] text-slate-500">连线</div>
              </div>
              <div class="p-2 rounded-lg" style="background: #e7d8ff;">
                <div class="text-xl font-bold" style="color:#7a5cd9;">${Math.max(...draft.nodes.map(n => this._nodeDepth(draft, n.id)), 0) + 1}</div>
                <div class="text-[10px] text-slate-500">层级</div>
              </div>
            </div>
          </div>

          <div class="card p-4">
            <h4 class="font-semibold text-sm mb-2">💾 保存作品</h4>
            <div class="space-y-2">
              <button id="mmSave" class="btn-grad w-full text-sm justify-center flex items-center gap-1">
                💾 保存到我的作品
              </button>
              ${existing ? '<div class="text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg text-center">⚠️ 已存在同名作品，保存将覆盖更新</div>' : '<div class="text-[10px] text-green-600 bg-green-50 p-2 rounded-lg text-center">✨ 新作品，首次保存</div>'}
            </div>
          </div>

          <div class="card p-4">
            <h4 class="font-semibold text-sm mb-2">📥 导出图片</h4>
            <div class="space-y-2">
              <button id="mmDownloadPng" class="btn-ghost w-full text-sm justify-center flex items-center gap-1 border-2" style="border-color:#e2e8f0;">
                🖼️ 下载 PNG 图片
              </button>
              <button id="mmDownloadSvg" class="btn-ghost w-full text-sm justify-center flex items-center gap-1 border-2" style="border-color:#e2e8f0;">
                📐 下载 SVG 矢量图
              </button>
              <button id="mmCopyJson" class="btn-ghost w-full text-sm justify-center flex items-center gap-1 border-2" style="border-color:#e2e8f0;">
                📋 复制 JSON 数据
              </button>
            </div>
          </div>

          <div class="card p-4">
            <h4 class="font-semibold text-sm mb-2">🔧 其他操作</h4>
            <div class="space-y-2">
              <button id="mmBackEdit" class="btn-ghost w-full text-sm">← 返回继续编辑</button>
              <button id="mmNewOne" class="btn-ghost w-full text-sm">+ 创建新导图</button>
            </div>
          </div>
        </div>

        <div class="lg:col-span-2 space-y-3">
          <div class="card p-2 relative overflow-hidden" style="background: linear-gradient(135deg, #ebffd7 0%, #d0f6ff 50%, #e7d8ff 100%);">
            <div class="absolute top-2 right-2 z-10 px-2 py-1 rounded-full bg-white/80 backdrop-blur text-[10px] font-semibold shadow-sm text-purple-600">
              最终预览 · 确认后导出
            </div>
            <svg id="mmCanvas" viewBox="0 0 1200 800" class="w-full" style="min-height:600px; border-radius: 12px;"></svg>
          </div>
          <div class="text-xs text-slate-500 text-center space-x-3">
            <span>作者：${escapeHtml(me.nickname || me.username || '匿名')}</span>
            <span>·</span>
            <span>模板：${(this.MINDMAP_TEMPLATES.find(t => t.id === draft.template) || {}).label || '自定义'}</span>
            <span>·</span>
            <span>${draft.nodes.length} 节点 · ${draft.edges.length} 连线</span>
          </div>
        </div>
      </div>
    `;
    this.drawMindmapCanvas(draft);
    this.bindMindmapStep3Events();
  },

  App._nodeDepth = function(draft, id) {
    let d = 0; let cur = draft.nodes.find(n => n.id === id);
    while (cur && cur.parentId) {
      d++;
      cur = draft.nodes.find(n => n.id === cur.parentId);
    }
    return d;
  },

  App.bindMindmapStep3Events = function() {
    const draft = this.userMindmapDraft;
    const goEdit = () => {
      this.mindmapStep = 2;
      this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft);
    };
    $('#mmBack')?.addEventListener('click', goEdit);
    $('#mmBackEdit')?.addEventListener('click', goEdit);
    $('#mmStep1Jump')?.addEventListener('click', () => {
      this.mindmapStep = 1;
      this.renderMindmapEditorView($('#view-mindmap-editor'), null);
    });
    $('#mmStepParseJump')?.addEventListener('click', () => {
      if (this.userMindmapDraft) { this.mindmapStep = 1.5; this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft); }
    });
    $('#mmSave')?.addEventListener('click', () => {
      this.saveUserMindmap && this.saveUserMindmap();
    });
    $('#mmDownloadPng')?.addEventListener('click', () => {
      this.downloadMindmapPng && this.downloadMindmapPng();
    });
    // 新增：SVG 矢量图下载
    $('#mmDownloadSvg')?.addEventListener('click', () => {
      const svgEl = document.getElementById('mmCanvas');
      if (!svgEl) return;
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = (draft?.title || '思维导图') + '.svg';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('✅ SVG 已下载');
    });
    // 新增：复制 JSON
    $('#mmCopyJson')?.addEventListener('click', () => {
      if (!draft) return;
      const jsonStr = JSON.stringify(draft, null, 2);
      navigator.clipboard?.writeText(json_str).then(() => {
        toast('✅ JSON 已复制到剪贴板');
      }).catch(() => {
        // fallback: 用 textarea 复制
        const ta = document.createElement('textarea'); ta.value = jsonStr;
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta); toast('✅ JSON 已复制到剪贴板');
      });
    });
    // 新增：创建新导图
    $('#mmNewOne')?.addEventListener('click', () => {
      this.userMindmapDraft = null; this._mmParsedText = ''; this._mmParseFileInfo = null;
      this.mindmapStep = 1; this.mindmapWelcomeTab = 'file';
      this.renderMindmapEditorView($('#view-mindmap-editor'), null);
    });
  },

  // ---------- 辅助：根据节点形状 + 字号返回 SVG 元素 ----------
  App.mmNodeElForShape = function(g, n, isSelected) {
    const NS = 'http://www.w3.org/2000/svg';
    const fontSizeMap = { xs: 11, sm: 13, md: 15, lg: 18, xl: 22 };
    const px = fontSizeMap[n.fontSize] || 15;
    const txt = n.label || '';
    const isBold = n.fontStyle === 'bold';
    const isItalic = n.fontStyle === 'italic';
    const isUnderline = n.fontStyle === 'underline';
    const weight = isBold ? 700 : 500;
    const fStyle = isItalic ? 'italic' : 'normal';
    const decoration = isUnderline ? 'underline' : 'none';
    const label = txt.length > 10 ? txt.slice(0, 10) + '…' : txt;
    const textColor = n.textColor || '#1f2937';
    const fillColor = n.color || '#34bcd6';
    const w = Math.max(label.length * (px * 0.6) + 24, 64);
    const h = px + 18;

    // 阴影
    const sh = document.createElementNS(NS, 'ellipse');
    sh.setAttribute('cx', 0); sh.setAttribute('cy', h / 2 + 2);
    sh.setAttribute('rx', w / 2 + 2); sh.setAttribute('ry', h / 2 - 2);
    sh.setAttribute('fill', fillColor); sh.setAttribute('opacity', '.18');
    g.appendChild(sh);

    let body;
    if (n.shape === 'rect') {
      body = document.createElementNS(NS, 'rect');
      body.setAttribute('x', -w / 2); body.setAttribute('y', -h / 2);
      body.setAttribute('width', w); body.setAttribute('height', h);
      body.setAttribute('rx', 4); body.setAttribute('fill', fillColor);
    } else if (n.shape === 'round') {
      body = document.createElementNS(NS, 'rect');
      body.setAttribute('x', -w / 2); body.setAttribute('y', -h / 2);
      body.setAttribute('width', w); body.setAttribute('height', h);
      body.setAttribute('rx', h / 2); body.setAttribute('fill', fillColor);
    } else if (n.shape === 'diamond') {
      body = document.createElementNS(NS, 'polygon');
      const r = Math.max(w, h) / 2 + 6;
      body.setAttribute('points', `0,${-r} ${r},0 0,${r} ${-r},0`);
      body.setAttribute('fill', fillColor);
    } else if (n.shape === 'cloud') {
      // 用 path 画云
      body = document.createElementNS(NS, 'path');
      const r = h / 2;
      body.setAttribute('d', `M ${-w/2 + r} ${-h/2} q 0 ${-r} ${r} ${-r} q ${r} 0 ${r} ${r} q ${r} 0 ${r} ${r} q 0 ${r} ${-r} ${r} L ${-w/2 + r} ${h/2} q ${-r} 0 ${-r} ${-r} q 0 ${-r} ${r} ${-r} z`);
      body.setAttribute('fill', fillColor);
    } else {
      // circle
      body = document.createElementNS(NS, 'circle');
      const r = Math.max(w, h) / 2;
      body.setAttribute('r', r); body.setAttribute('fill', '#fff');
      body.setAttribute('stroke', fillColor); body.setAttribute('stroke-width', '3');
    }

    body.classList.add('mm-node');
    body.setAttribute('data-id', n.id);

    // 矩形/胶囊/云朵：填充色为底色 → 字色取白或反色
    if (n.shape !== 'circle') {
      // 字色如果是默认深色但背景是深色，自动调整
      let finalTextColor = textColor;
      if ((fillColor === '#1f2937' || fillColor === '#000000') && textColor === '#1f2937') finalTextColor = '#ffffff';
      n._renderTextColor = finalTextColor;
      n._renderFill = fillColor;
    } else {
      n._renderTextColor = fillColor;
      n._renderFill = '#ffffff';
    }

    // 选中描边
    if (isSelected) {
      if (n.shape === 'circle') body.setAttribute('stroke-width', '4');
      else { body.setAttribute('stroke', '#34bcd6'); body.setAttribute('stroke-width', '3'); }
    }
    g.appendChild(body);

    const t = document.createElementNS(NS, 'text');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('y', px / 3);
    t.setAttribute('font-size', px);
    t.setAttribute('font-weight', weight);
    t.setAttribute('font-style', fStyle);
    t.setAttribute('text-decoration', decoration);
    t.setAttribute('fill', n._renderTextColor);
    t.classList.add('mm-node');
    t.setAttribute('data-id', n.id);
    t.textContent = label;
    g.appendChild(t);
  },

  App.drawMindmapCanvas = function(draft, canvasId) {
    const svg = $('#' + (canvasId || 'mmCanvas'));
    if (!svg) return;
    svg.innerHTML = '';
    // 自动连接孤立子节点
    const root = draft.nodes.find(n => n.isRoot);
    if (root) {
      draft.nodes.filter(n => !n.isRoot && !n.parentId).forEach(n => {
        draft.edges.push({ from: root.id, to: n.id });
        n.parentId = root.id;
      });
    }
    const nodeById = Object.fromEntries(draft.nodes.map(n => [n.id, n]));
    // 画边（统一薄荷系调色板，避免多色拼接）
    const EDGE_COLORS = ['#5cc56a', '#34bcd6', '#7a5cd9', '#1e9bb8', '#82f0f9', '#3da355', '#b69bff'];
    draft.edges.forEach((e, idx) => {
      const a = nodeById[e.from], b = nodeById[e.to];
      if (!a || !b) return;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      path.setAttribute('d', `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`);
      // 统一调色（按索引循环），选中节点相关边用主品牌色高亮
      const isHighlighted = (this.selectedNodeId === a.id || this.selectedNodeId === b.id);
      path.setAttribute('stroke', isHighlighted ? '#34bcd6' : EDGE_COLORS[idx % EDGE_COLORS.length]);
      path.setAttribute('stroke-width', isHighlighted ? '2.8' : '1.8');
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', isHighlighted ? '.85' : '.5');
      path.classList.add('mm-edge');
      svg.appendChild(path);
    });
    // 画节点
    draft.nodes.forEach(n => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${n.x},${n.y})`);
      g.setAttribute('data-id', n.id);
      g.classList.add('mm-node-g');
      g.style.cursor = 'move';
      const isSel = this.selectedNodeId === n.id;
      this.mmNodeElForShape(g, n, isSel);
      svg.appendChild(g);
    });
  },

  App.bindMindmapEditorEvents = function() {
    const me = currentUser();
    const draft = this.userMindmapDraft;
    if (!draft) return;

    // 标题
    $('#mmTitle')?.addEventListener('input', e => { draft.title = e.target.value.trim() || '未命名导图'; draft.updatedAt = Date.now(); });

    // 上一步
    $('#mmBack')?.addEventListener('click', () => {
      if (this.mindmapStep === 3) {
        this.mindmapStep = 2;
        this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft);
      } else if (this.mindmapStep === 2) {
        if (confirm('放弃当前编辑，回到选择起点？')) {
          this.mindmapStep = 1;
          this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft);
        }
      }
    });

    // 下一步：保存
    $('#mmNext')?.addEventListener('click', () => {
      this.mindmapStep = 3;
      this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft);
    });

    // 步骤指示器可点
    $('#mmStep1Jump')?.addEventListener('click', () => {
      this.mindmapStep = 1;
      this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft);
    });
    $('#mmStep2Jump')?.addEventListener('click', () => {
      this.mindmapStep = 2;
      this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft);
    });

    // 保存
    $('#mmSave')?.addEventListener('click', () => {
      const list = get(LS.USER_MINDMAPS, []);
      const idx = list.findIndex(m => m.id === draft.id);
      draft.updatedAt = Date.now();
      if (idx >= 0) list[idx] = draft; else list.push(draft);
      set(LS.USER_MINDMAPS, list);
      toast('已保存：' + draft.title);
    });

    // 新建
    $('#mmNew')?.addEventListener('click', () => {
      if (confirm('放弃当前编辑，新建空白导图？')) {
        this.userMindmapDraft = null;
        this.mindmapStep = 1;
        this.renderMindmapEditorView($('#view-mindmap-editor'), null);
      }
    });

    // 加载列表
    $('#mmLoad')?.addEventListener('click', () => this.showUserMindmapsList());

    // 素材库抽屉切换
    const drawerBody = $('#mmDrawerBody');
    const drawerToggle = $('#mmDrawerToggle');
    drawerToggle?.addEventListener('click', () => {
      if (!drawerBody) return;
      const open = drawerBody.style.display === 'block';
      drawerBody.style.display = open ? 'none' : 'block';
      if (drawerToggle) drawerToggle.textContent = open ? '展开 ▾' : '收起 ▴';
    });
    // 默认显示第 1 个分类
    const renderDrawer = catId => {
      const cat = (this.WORD_LIBRARY || {})[catId || 'subjects'];
      if (!cat) return;
      const list = $('#mmDrawerList');
      if (!list) return;
      list.innerHTML = cat.groups.map(g => `
        <div class="mb-2">
          <div class="text-[10px] text-slate-500 mb-1">${g.icon} ${g.name}</div>
          <div class="flex flex-wrap gap-1">
            ${g.words.map(w => `<button class="mm-drawer-word px-2 py-0.5 rounded-full text-[10px] border border-slate-200 hover:border-brand-400 hover:bg-brand-50" data-word="${escapeHtml(w)}">${escapeHtml(w)}</button>`).join('')}
          </div>
        </div>
      `).join('');
      list.querySelectorAll('.mm-drawer-word').forEach(b => {
        b.addEventListener('click', () => {
          const word = b.dataset.word;
          this._insertWordAsNode(word);
        });
      });
    };
    renderDrawer('subjects');
    document.querySelectorAll('.mm-lib-cat').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.mm-lib-cat').forEach(x => {
          x.style.background = '#fff'; x.style.color = ''; x.style.borderColor = '#e2e8f0';
        });
        b.style.background = 'linear-gradient(135deg, #5cc56a, #34bcd6)';
        b.style.color = '#fff'; b.style.borderColor = 'transparent';
        renderDrawer(b.dataset.cat);
      });
    });
    // 默认 active 第一个分类
    const firstCat = document.querySelector('.mm-lib-cat');
    if (firstCat) {
      firstCat.style.background = 'linear-gradient(135deg, #5cc56a, #34bcd6)';
      firstCat.style.color = '#fff'; firstCat.style.borderColor = 'transparent';
    }

    // 模板切换
    document.querySelectorAll('.mm-tpl-btn').forEach(b => {
      b.addEventListener('click', () => {
        const tplId = b.dataset.tpl;
        if (tplId === draft.template) return;
        if (draft.nodes.length > 1 && !confirm('切换模板将重新生成节点布局，确定继续？')) return;
        draft.title = (this.MINDMAP_TEMPLATES.find(t => t.id === tplId) || {}).label + '导图';
        const me2 = currentUser();
        const newDraft = this.applyTemplate(tplId, me2);
        // 保留原 ID
        newDraft.id = draft.id;
        newDraft.createdAt = draft.createdAt;
        this.userMindmapDraft = this.normalizeDraft(newDraft);
        this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft);
        toast('已切换到：' + newDraft.title);
      });
    });

    // 字号
    document.querySelectorAll('.mm-size-btn').forEach(b => {
      b.addEventListener('click', () => {
        if (!this.selectedNodeId) { toast('请先选中一个节点'); return; }
        const n = draft.nodes.find(x => x.id === this.selectedNodeId);
        if (n) { n.fontSize = b.dataset.size; this.drawMindmapCanvas(draft); this.renderMindmapEditorView($('#view-mindmap-editor'), draft); }
      });
    });

    // 字型
    document.querySelectorAll('.mm-style-btn').forEach(b => {
      b.addEventListener('click', () => {
        if (!this.selectedNodeId) { toast('请先选中一个节点'); return; }
        const n = draft.nodes.find(x => x.id === this.selectedNodeId);
        if (n) { n.fontStyle = b.dataset.style; this.drawMindmapCanvas(draft); this.renderMindmapEditorView($('#view-mindmap-editor'), draft); }
      });
    });

    // 字色
    document.querySelectorAll('.mm-tc-btn').forEach(b => {
      b.addEventListener('click', () => {
        if (!this.selectedNodeId) { toast('请先选中一个节点'); return; }
        const n = draft.nodes.find(x => x.id === this.selectedNodeId);
        if (n) { n.textColor = b.dataset.color; this.drawMindmapCanvas(draft); this.renderMindmapEditorView($('#view-mindmap-editor'), draft); }
      });
    });

    // 形状
    document.querySelectorAll('.mm-shape-btn').forEach(b => {
      b.addEventListener('click', () => {
        if (!this.selectedNodeId) { toast('请先选中一个节点'); return; }
        const n = draft.nodes.find(x => x.id === this.selectedNodeId);
        if (n) { n.shape = b.dataset.shape; this.drawMindmapCanvas(draft); this.renderMindmapEditorView($('#view-mindmap-editor'), draft); }
      });
    });

    // 字体样式预设（编辑器内的：选中节点 → 应用预设）
    document.querySelectorAll('.mm-font-preset').forEach(b => {
      b.addEventListener('click', () => {
        if (!this.selectedNodeId) { toast('请先选中一个节点'); return; }
        const n = draft.nodes.find(x => x.id === this.selectedNodeId);
        if (!n) return;
        const p = (this.FONT_PRESETS || []).find(x => x.id === b.dataset.preset);
        if (!p) return;
        n.fontSize = p.size;
        n.fontStyle = p.style;
        n.textColor = p.color;
        n.color = p.bg;
        this.drawMindmapCanvas(draft);
        this.renderMindmapEditorView($('#view-mindmap-editor'), draft);
      });
    });

    // 删除节点
    document.querySelectorAll('.mm-del').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        const id = b.dataset.id;
        draft.nodes = draft.nodes.filter(n => n.id !== id);
        draft.edges = draft.edges.filter(e => e.from !== id && e.to !== id);
        if (this.selectedNodeId === id) this.selectedNodeId = null;
        this.drawMindmapCanvas(draft);
        this.renderMindmapEditorView($('#view-mindmap-editor'), draft);
      });
    });

    // 节点列表点击：选中
    document.querySelectorAll('.mm-node-item').forEach(b => {
      b.addEventListener('click', () => {
        this.selectedNodeId = b.dataset.id;
        this.drawMindmapCanvas(draft);
      });
    });

    // 背景色选择
    document.querySelectorAll('.mm-color-btn').forEach(b => {
      b.addEventListener('click', () => {
        const color = b.dataset.color;
        if (this.selectedNodeId) {
          const n = draft.nodes.find(x => x.id === this.selectedNodeId);
          if (n) { n.color = color; this.drawMindmapCanvas(draft); this.renderMindmapEditorView($('#view-mindmap-editor'), draft); }
        } else {
          toast('请先选中一个节点');
        }
      });
    });

    // 画布事件
    const svg = $('#mmCanvas');
    if (!svg) return;
    let dragging = null;
    let dragOffset = { x: 0, y: 0 };

    svg.addEventListener('dblclick', e => {
      // 先判断是否点中节点（双击节点 → 编辑文字）
      const g = e.target.closest('.mm-node-g');
      if (g) {
        const id = g.dataset.id;
        const n = draft.nodes.find(x => x.id === id);
        if (!n) return;
        this.selectedNodeId = id;
        const newLabel = prompt('✏️ 编辑节点文字：', n.label);
        if (newLabel !== null && newLabel.trim()) {
          n.label = newLabel.trim();
          this.drawMindmapCanvas(draft);
          this.renderMindmapEditorView($('#view-mindmap-editor'), draft);
        }
        return;
      }
      // 空白处双击：新增节点
      const pt = svgPoint(svg, e);
      const parent = this.selectedNodeId ? draft.nodes.find(n => n.id === this.selectedNodeId) : draft.nodes.find(n => n.isRoot);
      if (!parent) return;
      const newNode = {
        id: uid(),
        label: '新节点',
        x: pt.x, y: pt.y,
        color: parent.color,
        parentId: parent.id,
        shape: 'circle', fontSize: 'md', fontStyle: 'normal', textColor: '#1f2937'
      };
      draft.nodes.push(newNode);
      draft.edges.push({ from: parent.id, to: newNode.id });
      this.drawMindmapCanvas(draft);
      this.renderMindmapEditorView($('#view-mindmap-editor'), draft);
    });

    svg.addEventListener('mousedown', e => {
      const g = e.target.closest('.mm-node-g');
      if (!g) return;
      const id = g.dataset.id;
      this.selectedNodeId = id;
      const n = draft.nodes.find(x => x.id === id);
      if (!n) return;
      dragging = id;
      const pt = svgPoint(svg, e);
      dragOffset.x = pt.x - n.x;
      dragOffset.y = pt.y - n.y;
      this.drawMindmapCanvas(draft);
    });
    svg.addEventListener('mousemove', e => {
      if (!dragging) return;
      const n = draft.nodes.find(x => x.id === dragging);
      if (!n) return;
      const pt = svgPoint(svg, e);
      n.x = pt.x - dragOffset.x;
      n.y = pt.y - dragOffset.y;
      this.drawMindmapCanvas(draft);
    });
    svg.addEventListener('mouseup', () => { dragging = null; });
    svg.addEventListener('mouseleave', () => { dragging = null; });

    // 节点单击：选中（不弹窗，双击才编辑）
    svg.querySelectorAll('.mm-node-g').forEach(g => {
      g.addEventListener('click', e => {
        e.stopPropagation();
        this.selectedNodeId = g.dataset.id;
        this.drawMindmapCanvas(draft);
      });
    });
  },

  // ---------- 辅助：在选中节点下（或根下）插入一个词条作为新子节点 ----------
  App._insertWordAsNode = function(word) {
    const draft = this.userMindmapDraft;
    if (!draft) { toast('请先创建或加载导图'); return; }
    const parent = this.selectedNodeId
      ? draft.nodes.find(n => n.id === this.selectedNodeId)
      : draft.nodes.find(n => n.isRoot);
    if (!parent) { toast('请先选中一个节点'); return; }
    // 计算插入位置（同级下方）
    const siblings = draft.nodes.filter(n => n.parentId === parent.id);
    const newNode = {
      id: uid(),
      label: word,
      x: parent.x + 220,
      y: parent.y + (siblings.length % 6) * 60 + 40,
      color: ['#5cc56a', '#34bcd6', '#7a5cd9', '#1e9bb8', '#b69bff', '#3da355', '#ffd86b'][siblings.length % 7],
      isRoot: false, parentId: parent.id,
      shape: 'rect', fontSize: 'sm', fontStyle: 'normal', textColor: '#1f2937'
    };
    draft.nodes.push(newNode);
    draft.edges.push({ from: parent.id, to: newNode.id });
    this.selectedNodeId = newNode.id;
    this.drawMindmapCanvas(draft);
    if (this.mindmapStep === 1) {
      this.mindmapStep = 2;
      this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft);
    } else {
      this.renderMindmapEditorView($('#view-mindmap-editor'), this.userMindmapDraft);
    }
    toast('已插入：' + word);
  },

  App.showUserMindmapsList = function() {
    const me = currentUser();
    const list = get(LS.USER_MINDMAPS, []).filter(m => m.userId === me.id);
    const w = document.createElement('div');
    w.className = 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4';
    w.innerHTML = `
      <div class="card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-scale-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg">📂 我的导图（${list.length}）</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        ${list.length ? list.map(m => `
          <div class="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100 mb-2">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">${escapeHtml(m.title)}</div>
              <div class="text-xs text-slate-400 mt-0.5">${m.nodes.length} 节点 · ${new Date(m.updatedAt).toLocaleString('zh-CN')}</div>
            </div>
            <div class="flex gap-1">
              <button class="px-3 py-1 text-xs rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100" onclick="App.loadUserMindmap('${m.id}')">编辑</button>
              <button class="px-3 py-1 text-xs rounded-full bg-red-50 text-red-500 hover:bg-red-100" onclick="App.deleteUserMindmap('${m.id}')">删除</button>
            </div>
          </div>
        `).join('') : '<div class="text-center text-slate-400 py-8">还没有保存的导图</div>'}
      </div>`;
    document.body.appendChild(w);
  },

  App.loadUserMindmap = function(id) {
    const list = get(LS.USER_MINDMAPS, []);
    const m = list.find(x => x.id === id);
    if (m) {
      this.userMindmapDraft = JSON.parse(JSON.stringify(m));
      this.mindmapStep = 2;
      document.querySelector('.fixed.inset-0')?.remove();
      this.renderMindmapEditor();
      toast('已加载：' + m.title);
    }
  },
  App.deleteUserMindmap = function(id) {
    if (!confirm('确定删除这个导图吗？')) return;
    const list = get(LS.USER_MINDMAPS, []).filter(m => m.id !== id);
    set(LS.USER_MINDMAPS, list);
    document.querySelector('.fixed.inset-0')?.remove();
    this.showUserMindmapsList();
    toast('已删除');
  },
  App.saveUserMindmap = function() {
    const draft = this.userMindmapDraft;
    if (!draft || !draft.nodes || draft.nodes.length === 0) { toast('没有可保存的内容'); return; }
    const list = get(LS.USER_MINDMAPS, []);
    const idx = list.findIndex(m => m.id === draft.id);
    draft.updatedAt = Date.now();
    if (idx >= 0) list[idx] = draft; else list.push(draft);
    set(LS.USER_MINDMAPS, list);
    toast('已保存：' + draft.title);
  },
  App.downloadMindmapPng = function() {
    const svg = document.getElementById('mmCanvas');
    if (!svg) { toast('找不到画布'); return; }
    try {
      const xml = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([xml], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200; canvas.height = 800;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1200, 800);
        ctx.drawImage(img, 0, 0, 1200, 800);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = (this.userMindmapDraft?.title || '思维导图') + '.png';
          a.click();
          URL.revokeObjectURL(a.href);
          toast('已下载 PNG');
        }, 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); toast('导出失败，请重试'); };
      img.src = url;
    } catch (e) {
      toast('导出失败：' + e.message);
    }
  },

  /* 启动 */
  document.addEventListener('DOMContentLoaded', () => App.init());
  window.App = App; window.Auth = Auth;
})();
