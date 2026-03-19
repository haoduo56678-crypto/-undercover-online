(() => {
  const announcementSection = document.getElementById('announcement-section');
  const announcementLabel = document.getElementById('announcement-label');
  const announcementTitle = document.getElementById('announcement-title');
  const announcementBody = document.getElementById('announcement-body');
  const announcementLink = document.getElementById('announcement-link');

  const termsTitle = document.getElementById('terms-title');
  const termsIntro = document.getElementById('terms-intro');
  const termsList = document.getElementById('terms-list');
  const termsUpdated = document.getElementById('terms-updated');

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
    if (termsTitle) termsTitle.textContent = terms.title || 'Rules and Terms';
    if (termsIntro) termsIntro.textContent = terms.intro || '';
    if (termsList) {
      termsList.innerHTML = '';
      (terms.items || []).forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        termsList.appendChild(li);
      });
    }
    if (termsUpdated) {
      termsUpdated.textContent = terms.lastUpdated ? `Last updated: ${terms.lastUpdated}` : '';
    }
  }

  loadSiteContent().then((content) => {
    setAnnouncement(content.announcement);
    setTerms(content.terms);
  });
})();
