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
    LIKES:    'sxsx.likes',
    FAVS:     'sxsx.favs',
    MAJORS:   'sxsx.majors',
    FIELDS:   'sxsx.fields',
    SEEDED:   'sxsx.seeded.v4'
  };
  const get = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  /* ---------- 工具 ---------- */
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
      const likes = get(LS.LIKES, {}); delete likes[id]; set(LS.LIKES, likes);
    },
    incDownload(id) {
      const list = get(LS.RESOURCES, []);
      const r = list.find(x => x.id === id);
      if (r) { r.downloads = (r.downloads || 0) + 1; set(LS.RESOURCES, list); }
    }
  };

  /* ---------- 评论 ---------- */
  const Comment = {
    byResource(rid) { return get(LS.COMMENTS, []).filter(c => c.resourceId === rid).sort((a, b) => a.createdAt - b.createdAt); },
    add(c) { const list = get(LS.COMMENTS, []); list.push(c); set(LS.COMMENTS, list); }
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
      $('#authSubtitle').textContent = mode === 'login' ? '登录后即可上传资料、评论互动' : '注册后即享完整功能';
      $('#authToggleText').textContent = mode === 'login' ? '还没有账号？' : '已有账号？';
      $('#authToggleLink').textContent = mode === 'login' ? '立即注册' : '直接登录';
      $('#authModal').classList.remove('hidden');
      setTimeout(() => $('#authUsername').focus(), 50);
    },
    close() { $('#authModal').classList.add('hidden'); $('#authForm').reset(); },
    toggle() { this.open(this.mode === 'login' ? 'register' : 'login'); },
    demoLogin() {
      const users = get(LS.USERS, []);
      let demo = users.find(u => u.account === 'demo');
      if (!demo) {
        demo = { id: 'u_demo', account: 'demo', password: 'demo', name: '体验同学', bio: '这就是体验账号', createdAt: Date.now() };
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
      if (!account || !password) return toast('请填写完整');
      const users = get(LS.USERS, []);
      if (this.mode === 'register') {
        if (users.find(u => u.account === account)) return toast('该账号已注册');
        const u = { id: uid(), account, password, name: account, bio: '这家伙很懒，什么也没留下~', createdAt: Date.now() };
        users.push(u); set(LS.USERS, users);
        set(LS.SESSION, { userId: u.id });
        toast('注册成功，欢迎 ' + account);
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

  /* ---------- 种子数据（含官方权威资料）---------- */
  function seedIfNeeded() {
    // v3 升级到 v4：注入新官方资料
    if (localStorage.getItem(LS.SEEDED) === 'sxsx.seeded.v4') return;

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

      const cmts = [
        { resourceId: 'r_1', userId: 'u_ming', content: '排版很清晰，复习效率 up！', createdAt: Date.now() - 86400000 },
        { resourceId: 'r_1', userId: 'u_demo', content: '已收藏，谢谢学姐～', createdAt: Date.now() - 3600 * 1000 },
        { resourceId: 'r_3', userId: 'u_ming', content: '救命稻草般的提纲。', createdAt: Date.now() - 7200 * 1000 },
        { resourceId: 'r_5', userId: 'u_demo', content: '评论写得真犀利，学到了。', createdAt: Date.now() - 1800 * 1000 }
      ];
      set(LS.COMMENTS, cmts);
      set(LS.LIKES, { 'r_1': ['u_ming','u_demo'], 'r_3': ['u_lulu','u_ming','u_demo'], 'r_5': ['u_demo'] });
      set(LS.FAVS, { u_demo: ['r_1', 'r_3'] });
    }

    // 注入官方权威资料（如有 AUTHORITATIVE_RESOURCES）
    if (window.AUTHORITATIVE_RESOURCES && Array.isArray(window.AUTHORITATIVE_RESOURCES)) {
      window.AUTHORITATIVE_RESOURCES.forEach(item => {
        // 标准化入库（链接类型）
        const r = Feed.normalizeOne({
          ...item,
          type: 'link',
          uploaderId: 'u_official',
          uploaderName: '官方权威',
          createdAt: Date.now() - Math.floor(Math.random() * 86400000 * 5)
        });
        if (r) Resource.add(r);
      });
    }

    localStorage.setItem(LS.SEEDED, 'sxsx.seeded.v4');
  }

  /* =========================================================
     渲染
     ========================================================= */
  const App = {
    state: { view: 'home', major: '全部', field: 'all', keyword: '', sort: 'latest', profileTab: 'uploads' },

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
      else if (view === 'upload') location.hash = '#/upload';
      else if (view === 'feed') location.hash = '#/feed';
      else if (view === 'mindmap') location.hash = '#/mindmap';
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
      else if (h === '#/upload') this.requireAuth(() => this.go('upload'));
      else if (h === '#/feed') this.go('feed');
      else if (h === '#/mindmap') this.go('mindmap');
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

    /* 用户区 */
    renderUserArea() {
      const u = currentUser();
      const el = $('#userArea');
      if (!el) return;
      if (u) {
        el.innerHTML = `
          <button onclick="App.requireAuth(()=>App.go('profile'))" class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/60">
            <div class="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-pink-500 text-white text-xs flex items-center justify-center font-semibold">${escapeHtml((u.name || u.account).slice(0,1))}</div>
            <span class="text-sm text-slate-700">${escapeHtml(u.name || u.account)}</span>
          </button>
          <button onclick="App.requireAuth(()=>App.go('profile'))" class="md:hidden w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-pink-500 text-white text-xs flex items-center justify-center font-semibold">${escapeHtml((u.name || u.account).slice(0,1))}</button>
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
    },

    /* ============ 渲染：资料库 ============ */
    renderLibrary() {
      const tabs = $('#categoryTabs');
      if (tabs && !tabs.children.length) this.renderCategoryTabs();
      let list = Resource.all();
      if (this.state.major && this.state.major !== '全部') {
        list = list.filter(r => r.major === this.state.major);
      }
      if (this.state.field && this.state.field !== 'all') {
        list = list.filter(r => r.field === this.state.field);
      }
      if (this.state.keyword) {
        const kw = this.state.keyword;
        list = list.filter(r =>
          (r.title + ' ' + r.desc + ' ' + (r.major || '') + ' ' + (r.tags || []).join(' ')).toLowerCase().includes(kw)
        );
      }
      if (this.state.sort === 'hot') list.sort((a, b) => Like.count(b.id) - Like.count(a.id));
      else if (this.state.sort === 'downloads') list.sort((a, b) => (b.downloads||0) - (a.downloads||0));
      const g = $('#resourceGrid');
      if (!g) return;
      g.innerHTML = list.length
        ? list.map(r => r.credibility === '官方' ? officialResourceCardHtml(r) : resourceCardHtml(r)).join('')
        : '<div class="col-span-full text-center text-slate-400 py-12">没有匹配的资料，换个筛选条件试试～</div>';
      g.querySelectorAll('.resource-card').forEach(c => c.addEventListener('click', () => this.go('detail', c.dataset.id)));
    },

    /* ============ 渲染：思维导图 ============ */
    renderMindmap() {
      const svg = $('#mindmapSvg');
      if (!svg || !window.MIND_MAP) return;
      const W = 1200, H = 720;
      svg.innerHTML = '';
      const root = window.MIND_MAP.root;
      const rootX = W/2, rootY = 60;
      // 根节点
      svg.appendChild(this.mindNodeEl(rootX, rootY, root.label, root.icon, root.color, true));

      // 一级分类：横向 3 列
      const colCount = root.children.length;
      const colGap = (W - 200) / colCount;
      root.children.forEach((c1, i) => {
        const cx = 100 + colGap * (i + 0.5);
        const cy = 280;
        // 边
        const path = `M${rootX},${rootY+30} Q${rootX},${(rootY+cy)/2} ${cx},${cy-30}`;
        svg.appendChild(this.mindEdgeEl(path, c1.color));
        // 节点
        svg.appendChild(this.mindNodeEl(cx, cy, c1.label, c1.icon, c1.color));
        // 二级：每列 8 个，纵向
        const subCount = c1.children.length;
        const subH = (H - 380) / subCount;
        c1.children.forEach((c2, j) => {
          const sx = cx;
          const sy = 380 + subH * (j + 0.5);
          const subPath = `M${cx},${cy+30} Q${cx},${(cy+sy)/2} ${sx},${sy-22}`;
          svg.appendChild(this.mindEdgeEl(subPath, c2.color));
          svg.appendChild(this.mindNodeEl(sx, sy, c2.label, c2.icon, c2.color));
        });
      });
    },
    mindNodeEl(x, y, label, icon, color, big) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${x},${y})`);
      g.classList.add('mind-node');
      const rx = big ? 80 : 60;
      const ry = big ? 28 : 22;
      // 阴影圆
      const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      shadow.setAttribute('cx', 0); shadow.setAttribute('cy', 4); shadow.setAttribute('rx', rx); shadow.setAttribute('ry', ry);
      shadow.setAttribute('fill', color); shadow.setAttribute('opacity', '.15');
      g.appendChild(shadow);
      // 主体
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', -rx); rect.setAttribute('y', -ry); rect.setAttribute('width', rx*2); rect.setAttribute('height', ry*2);
      rect.setAttribute('rx', ry); rect.setAttribute('fill', '#fff');
      rect.setAttribute('stroke', color); rect.setAttribute('stroke-width', '2');
      g.appendChild(rect);
      // 文字
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('y', 5);
      t.setAttribute('font-size', big ? 16 : 13); t.setAttribute('font-weight', '600'); t.setAttribute('fill', color);
      t.textContent = icon + ' ' + label;
      g.appendChild(t);
      return g;
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
      const cmts = Comment.byResource(r.id);
      const commentListHtml = cmts.map(c => {
        const cu = get(LS.USERS, []).find(u => u.id === c.userId);
        return `
          <div class="flex gap-3 py-3 border-t border-slate-100">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-pink-500 text-white text-xs flex items-center justify-center flex-shrink-0">${escapeHtml((cu?.name || '?').slice(0,1))}</div>
            <div class="flex-1">
              <div class="text-sm text-slate-700"><span class="font-medium">${escapeHtml(cu?.name || '匿名')}</span> <span class="text-xs text-slate-400 ml-2">${fmtTime(c.createdAt)}</span></div>
              <div class="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap">${escapeHtml(c.content)}</div>
            </div>
          </div>`;
      }).join('') || '<div class="py-6 text-sm text-slate-400 text-center">还没有评论，来抢沙发～</div>';

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
            <div class="aspect-[4/3] bg-slate-100 flex items-center justify-center" id="previewArea">
              ${r.thumb ? `<img src="${r.thumb}" class="w-full h-full object-contain" alt="预览"/>` : ''}
            </div>
            <div class="p-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span class="text-xs px-2 py-0.5 rounded ${fileTypeBadge}">${(r.type || '').toUpperCase()}</span>
              <span class="text-sm text-slate-700">${escapeHtml(r.fileName || r.title + '.' + r.type)}</span>
              <span class="text-xs text-slate-400">· ${fmtSize(r.size || 0)}</span>
              <div class="flex-1"></div>
              <button id="btnDownload" class="btn-grad text-sm flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                ${r.type === 'link' ? '打开' : '下载'}
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
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-pink-500 text-white text-sm flex items-center justify-center">${escapeHtml((uploader?.name || r.uploaderName || '?').slice(0,1))}</div>
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
          <h3 class="font-semibold mb-2">💬 评论 <span class="text-sm text-slate-400">(${cmts.length})</span></h3>
          <form id="commentForm" class="flex gap-2">
            <input name="content" required maxlength="300" placeholder="${me ? '说点什么...' : '登录后参与评论'}"
                   class="flex-1 px-3 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
                   ${me ? '' : 'disabled'} />
            <button type="submit" class="btn-grad text-sm" ${me ? '' : 'disabled'}>发布</button>
          </form>
          <div class="mt-2">${commentListHtml}</div>
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
          Comment.add({ id: uid(), resourceId: r.id, userId: me.id, content: txt, createdAt: Date.now() });
          this.renderDetail(r.id);
          toast('评论已发布');
        });
      }
      this.renderPreview(r);
    },

    /* 详情页预览（真实文件） */
    async renderPreview(r) {
      const area = $('#previewArea');
      if (!area) return;
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
        return;
      }
      if (!r.fileData) return;
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
      } catch (e) {
        console.warn('预览失败：', e);
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

    /* ============ 渲染：上传 ============ */
    bindUpload() {
      const form = $('#uploadForm');
      if (!form) return;
      form.innerHTML = `
        <div>
          <label class="text-sm font-medium text-slate-700">标题 <span class="text-red-500">*</span></label>
          <input name="title" required maxlength="80" placeholder="给你的资料起个名字吧～" class="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">简介</label>
          <textarea name="desc" maxlength="200" rows="2" placeholder="一句话介绍这份资料～" class="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-slate-700">专业</label>
            <select name="major" id="uploadMajorSelect" class="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white"></select>
            <input name="majorNew" placeholder="或新加专业" class="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700">领域</label>
            <select name="field" id="uploadFieldSelect" class="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white"></select>
            <input name="fieldNew" placeholder="或新加领域" class="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">标签（逗号分隔）</label>
          <input name="tags" placeholder="如：笔记,期末复习,重点" class="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">文件 <span class="text-red-500">*</span></label>
          <div id="dropZone" class="mt-1 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-300 transition">
            <input type="file" id="fileInput" accept=".pdf,.docx,.png,.jpg,.jpeg,.gif,.webp" class="hidden" />
            <div id="fileInfo" class="text-sm text-slate-500">
              <svg class="mx-auto mb-2 text-slate-300" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              点击或拖拽文件到这里<br/>
              <span class="text-xs text-slate-400">PDF / DOCX / PNG / JPG，最大 8MB</span>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2">
          <button type="button" onclick="App.go('feed')" class="btn-ghost text-sm">用投喂更快？</button>
          <button type="submit" class="btn-grad">📤 上传</button>
        </div>
      `;
      const fillUploadSelects = () => {
        const ms = Dict.majors();
        const mSel = $('#uploadMajorSelect'); if (mSel) mSel.innerHTML = ms.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
        const fs = Dict.fields().filter(f => f.id !== 'all');
        const fSel = $('#uploadFieldSelect'); if (fSel) fSel.innerHTML = fs.map(f => `<option value="${f.id}">${f.icon} ${escapeHtml(f.name)}</option>`).join('');
      };
      fillUploadSelects();

      const dz = $('#dropZone'), input = $('#fileInput'), info = $('#fileInfo');
      dz.addEventListener('click', () => input.click());
      ;['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('border-brand-400', 'bg-brand-50'); }));
      ;['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('border-brand-400', 'bg-brand-50'); }));
      dz.addEventListener('drop', e => { if (e.dataTransfer.files[0]) { input.files = e.dataTransfer.files; input.dispatchEvent(new Event('change')); } });
      input.addEventListener('change', () => {
        const f = input.files[0];
        if (!f) return;
        info.innerHTML = `
          <div class="text-brand-600 font-medium">${escapeHtml(f.name)}</div>
          <div class="text-xs text-slate-400 mt-1">${fmtSize(f.size)} · ${f.type || '未知类型'}</div>
          <button type="button" id="clearFile" class="text-xs text-red-500 mt-1 hover:underline">移除</button>
        `;
        $('#clearFile').addEventListener('click', e => { e.stopPropagation(); input.value = ''; });
      });
      form.addEventListener('submit', async e => {
        e.preventDefault();
        if (!currentUser()) return Auth.open('login');
        const fd = new FormData(form);
        const file = input.files[0];
        if (!file) return toast('请选择文件');
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
        fillUploadSelects();
        try {
          const data = await readFileAsDataURL(file);
          const ext = (file.name.split('.').pop() || '').toLowerCase();
          const type = ext === 'pdf' ? 'pdf' : (ext === 'docx' ? 'docx' : (file.type.startsWith('image/') ? 'image' : ext));
          const thumb = await makeThumbnail(file);
          const r = {
            id: uid(), title,
            desc: (fd.get('desc') || '').toString().trim(),
            major: majorFinal, field,
            tags: (fd.get('tags') || '').toString().split(/[,，]/).map(s => s.trim()).filter(Boolean),
            type, size: file.size,
            fileName: file.name, fileData: data, thumb,
            uploaderId: currentUser().id,
            createdAt: Date.now(), downloads: 0
          };
          Resource.add(r);
          toast('上传成功！');
          form.reset();
          this.renderCategoryTabs();
          this.go('detail', r.id);
        } catch (err) {
          toast(err.message || '上传失败');
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
        `<button data-tab="${k}" class="px-4 py-1.5 text-sm rounded-full font-medium ${tab === k ? 'bg-gradient-to-r from-brand-500 to-pink-500 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}">${label}</button>`;

      const card = r => `
        <div class="resource-card card cursor-pointer overflow-hidden" data-id="${r.id}">
          <div class="aspect-[4/3] bg-slate-100">${r.thumb ? `<img src="${r.thumb}" class="w-full h-full object-cover"/>` : ''}</div>
          <div class="p-2.5">
            <div class="text-sm font-medium line-clamp-2">${escapeHtml(r.title)}</div>
            <div class="text-xs text-slate-400 mt-1 flex justify-between"><span>${fmtTime(r.createdAt)}</span><span>${r.downloads || 0} ⬇</span></div>
          </div>
        </div>`;

      const content = tab === 'uploads'
        ? (myUploads.length ? `<div class="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">${myUploads.map(card).join('')}</div>` : '<div class="text-center text-slate-400 py-12">还没上传过资料，去 <a class="text-brand-600 cursor-pointer" onclick="App.go(\'upload\')">上传</a> 第一份吧～</div>')
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
            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-pink-500 text-white text-2xl flex items-center justify-center font-bold">${escapeHtml((me.name||me.account).slice(0,1))}</div>
            <div class="flex-1">
              <div class="text-lg font-semibold flex items-center gap-2">
                <span>${escapeHtml(me.name)}</span>
                <button id="editName" class="text-xs text-slate-400 hover:text-brand-600">编辑</button>
              </div>
              <div class="text-xs text-slate-400">账号：${escapeHtml(me.account)} · 加入于 ${fmtTime(me.createdAt)}</div>
            </div>
            <button onclick="Auth.logout()" class="text-sm text-slate-500 hover:text-red-500">退出登录</button>
          </div>
          <div class="mt-3 text-sm text-slate-600">${escapeHtml(me.bio || '')}</div>
          <div class="grid grid-cols-3 gap-3 mt-5">
            <div class="bg-slate-50 rounded-xl p-3 text-center"><div class="text-2xl font-bold text-gradient">${myUploads.length}</div><div class="text-xs text-slate-500">上传资料</div></div>
            <div class="bg-slate-50 rounded-xl p-3 text-center"><div class="text-2xl font-bold text-gradient">${myFavs.length}</div><div class="text-xs text-slate-500">收藏资料</div></div>
            <div class="bg-slate-50 rounded-xl p-3 text-center"><div class="text-2xl font-bold text-gradient">${myCmts.length}</div><div class="text-xs text-slate-500">发布评论</div></div>
          </div>
        </div>
        <div class="mt-5 flex items-center gap-2">${tabBtn('uploads', '📤 我上传的')}${tabBtn('favs', '⭐ 我的收藏')}${tabBtn('comments', '💬 我的评论')}</div>
        <div class="mt-4">${content}</div>
      `;
      el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { this.state.profileTab = b.dataset.tab; this.renderProfile(); }));
      el.querySelectorAll('.resource-card').forEach(c => c.addEventListener('click', () => this.go('detail', c.dataset.id)));
      $('#editName').addEventListener('click', () => this.editProfile(me));
    },
    editProfile(me) {
      const newName = prompt('修改昵称', me.name);
      if (newName == null) return;
      const newBio  = prompt('修改个人简介', me.bio || '');
      if (newBio == null) return;
      const users = get(LS.USERS, []);
      const u = users.find(x => x.id === me.id);
      u.name = newName.trim() || u.name;
      u.bio  = newBio.trim();
      set(LS.USERS, users);
      this.renderUserArea();
      this.renderProfile();
      toast('已更新');
    },

    /* 鉴权弹窗 */
    bindAuth() {
      $('#authForm')?.addEventListener('submit', Auth.submit.bind(Auth));
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
    renderFeed() {
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
      else if (this.state.view === 'mindmap') this.renderMindmap();
      else if (this.state.view === 'detail') this.renderDetail(this.state.params);
      else if (this.state.view === 'profile') this.renderProfile();
      else if (this.state.view === 'feed') this.renderFeed();
    }
  };

  /* ---------- 通用 HTML 片段 ---------- */
  function resourceCardHtml(r) {
    const uploader = get(LS.USERS, []).find(u => u.id === r.uploaderId);
    const typeBadge = { pdf: 'bg-red-100 text-red-700', docx: 'bg-blue-100 text-blue-700', image: 'bg-emerald-100 text-emerald-700', link: 'bg-purple-100 text-purple-700' }[r.type] || 'bg-slate-100 text-slate-600';
    const f = Dict.fieldNameById(r.field);
    return `
      <div class="resource-card card overflow-hidden cursor-pointer" data-id="${r.id}">
        <div class="aspect-[4/3] bg-slate-100 relative">
          ${r.thumb ? `<img src="${r.thumb}" class="w-full h-full object-cover"/>` : ''}
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
    const gradColor = (r.sourceIcon && /\p{Extended_Pictographic}/u.test(r.sourceIcon)) ? '#ddd6fe' : '#dbeafe';
    return `
      <div class="resource-card card card-grad-cool overflow-hidden cursor-pointer" data-id="${r.id}">
        <div class="relative">
          <div class="aspect-[4/3] flex items-center justify-center" style="background: linear-gradient(135deg, ${gradColor}, #fff);">
            <div class="text-center">
              <div class="text-5xl mb-2">${escapeHtml(r.sourceIcon || '📘')}</div>
              <div class="text-xs text-slate-600 px-3 line-clamp-2">${escapeHtml(r.sourceName || '')}</div>
            </div>
          </div>
          <span class="absolute top-2 left-2 badge badge-official">✅ 官方</span>
          ${f ? `<span class="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-white/90 text-slate-700 font-medium">${f.icon} ${escapeHtml(f.name)}</span>` : ''}
        </div>
        <div class="p-3">
          <div class="text-sm font-semibold line-clamp-2 leading-snug">${escapeHtml(r.title)}</div>
          <div class="text-[11px] text-slate-500 mt-1 truncate">📚 ${escapeHtml(r.major || '通用')}</div>
          <div class="text-xs text-emerald-700 mt-1.5 flex items-center gap-1">
            <span>${escapeHtml(r.sourceIcon || '🔗')}</span>
            <span class="truncate">${escapeHtml(r.sourceName || '官方')}</span>
          </div>
        </div>
      </div>`;
  }

  /* 启动 */
  document.addEventListener('DOMContentLoaded', () => App.init());
  window.App = App; window.Auth = Auth;
})();
