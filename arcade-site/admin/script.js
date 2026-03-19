(() => {
  const loginPanel = document.getElementById('login-panel');
  const editorPanel = document.getElementById('editor-panel');
  const loginForm = document.getElementById('login-form');
  const loginStatus = document.getElementById('login-status');
  const saveStatus = document.getElementById('save-status');
  const refreshBtn = document.getElementById('refresh-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const copyBtn = document.getElementById('copy-command-btn');
  const copyStatus = document.getElementById('copy-status');
  const contentForm = document.getElementById('content-form');

  let token = sessionStorage.getItem('adminToken') || '';

  const fields = {
    announcementEnabled: document.getElementById('announcement-enabled'),
    announcementLabel: document.getElementById('announcement-label'),
    announcementTitle: document.getElementById('announcement-title'),
    announcementBody: document.getElementById('announcement-body'),
    announcementLinkText: document.getElementById('announcement-link-text'),
    announcementLinkUrl: document.getElementById('announcement-link-url'),
    termsTitle: document.getElementById('terms-title'),
    termsIntro: document.getElementById('terms-intro'),
    termsItems: document.getElementById('terms-items'),
    termsLastUpdated: document.getElementById('terms-last-updated')
  };

  function setEditorVisible(visible) {
    loginPanel.hidden = visible;
    editorPanel.hidden = !visible;
  }

  function applyContent(data) {
    fields.announcementEnabled.checked = !!data.announcement.enabled;
    fields.announcementLabel.value = data.announcement.label || '';
    fields.announcementTitle.value = data.announcement.title || '';
    fields.announcementBody.value = data.announcement.body || '';
    fields.announcementLinkText.value = data.announcement.linkText || '';
    fields.announcementLinkUrl.value = data.announcement.linkUrl || '';
    fields.termsTitle.value = data.terms.title || '';
    fields.termsIntro.value = data.terms.intro || '';
    fields.termsItems.value = (data.terms.items || []).join('\n');
    fields.termsLastUpdated.value = data.terms.lastUpdated || '';
  }

  async function authorizedFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (token) headers.set('x-admin-token', token);
    return fetch(url, { ...options, headers });
  }

  async function loadAdminContent() {
    saveStatus.textContent = '正在加载内容…';
    try {
      const response = await authorizedFetch('/admin-api/content');
      if (response.status === 401) {
        sessionStorage.removeItem('adminToken');
        token = '';
        setEditorVisible(false);
        saveStatus.textContent = '登录已过期，请重新解锁。';
        return;
      }
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || '无法加载内容。');
      applyContent(payload.content);
      saveStatus.textContent = '已加载当前文件内容。';
    } catch (error) {
      saveStatus.textContent = error.message || '无法加载内容。';
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginStatus.textContent = '正在解锁后台…';
    try {
      const response = await fetch('/admin-api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: document.getElementById('password').value })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || '密码错误。');
      token = payload.token;
      sessionStorage.setItem('adminToken', token);
      document.getElementById('password').value = '';
      loginStatus.textContent = '后台已解锁。';
      setEditorVisible(true);
      await loadAdminContent();
    } catch (error) {
      loginStatus.textContent = error.message || '无法解锁后台。';
    }
  });

  refreshBtn.addEventListener('click', loadAdminContent);

  logoutBtn.addEventListener('click', () => {
    token = '';
    sessionStorage.removeItem('adminToken');
    setEditorVisible(false);
    saveStatus.textContent = '';
    loginStatus.textContent = '后台已锁定。';
  });

  contentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    saveStatus.textContent = '正在保存…';

    const content = {
      announcement: {
        enabled: fields.announcementEnabled.checked,
        label: fields.announcementLabel.value.trim(),
        title: fields.announcementTitle.value.trim(),
        body: fields.announcementBody.value.trim(),
        linkText: fields.announcementLinkText.value.trim(),
        linkUrl: fields.announcementLinkUrl.value.trim()
      },
      terms: {
        title: fields.termsTitle.value.trim(),
        intro: fields.termsIntro.value.trim(),
        items: fields.termsItems.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
        lastUpdated: fields.termsLastUpdated.value
      }
    };

    try {
      const response = await authorizedFetch('/admin-api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || '无法保存内容。');
      applyContent(payload.content);
      saveStatus.textContent = '已保存到 content/site-content.json。';
    } catch (error) {
      saveStatus.textContent = error.message || '无法保存内容。';
    }
  });

  copyBtn.addEventListener('click', async () => {
    const command = 'git add content/site-content.json index.html style.css content-loader.js home-content.js admin && git commit -m "Update homepage content"';
    try {
      await navigator.clipboard.writeText(command);
      copyStatus.textContent = '已复制 git 命令。';
    } catch (error) {
      copyStatus.textContent = '自动复制失败，请手动选择复制。';
    }
  });

  async function bootstrap() {
    if (!token) {
      setEditorVisible(false);
      return;
    }
    setEditorVisible(true);
    await loadAdminContent();
  }

  bootstrap();
})();
