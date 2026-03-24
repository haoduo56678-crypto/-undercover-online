(() => {
  const announcementSection = document.getElementById('announcement-section');  // 不需要再渲染游戏链接的部分
  const announcementLabel = document.getElementById('announcement-label');
  const announcementTitle = document.getElementById('announcement-title');
  const announcementBody = document.getElementById('announcement-body');
  const announcementLink = document.getElementById('announcement-link');

  // 添加游戏入口的逻辑
  const gamesList = [
    { name: 'Snake', link: 'snake/index.html' },
    { name: 'Minesweeper', link: 'minesweeper/index.html' },
    { name: 'Chess', link: 'chess/index.html' },
    { name: 'Who is the Undercover (Online Version)', link: 'undercover-fast/index.html' },
  ];

  function renderGameLinks() {
    const gamesContainer = document.getElementById('games-section');
    gamesList.forEach(game => {
      const gameLink = document.createElement('a');
      gameLink.href = game.link;
      gameLink.className = 'card';
      gameLink.innerHTML = `<h3>${game.name}</h3><p>进入${game.name}游戏</p>`;
      gamesContainer.appendChild(gameLink);
    });
  }

  // 执行游戏链接渲染
  renderGameLinks();

  function setAnnouncement(announcement) {
    if (!announcementSection) return;

    const hasText = announcement.enabled && (announcement.title || announcement.body);
    announcementSection.hidden = !hasText;
    if (!hasText) return;

    announcementLabel.textContent = announcement.label || 'Update';
    announcementTitle.textContent = announcement.title || 'Announcement';
    announcementBody.textContent = announcement.body || '';

    if (announcement.linkText && announcement.linkUrl) {
      announcementLink.hidden = false;
      announcementLink.textContent = announcement.linkText;
      announcementLink.href = announcement.linkUrl;
    } else {
      announcementLink.hidden = true;
      announcementLink.removeAttribute('href');
      announcementLink.textContent = '';
    }
  }

  function setTerms(terms) {
    //... existing terms setting code ...
  }

  loadSiteContent().then((content) => {
    setAnnouncement(content.announcement);
    setTerms(content.terms);
  });
})();