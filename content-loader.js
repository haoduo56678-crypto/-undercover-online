async function loadSiteContent() {
  const fallback = {
    announcement: {
      enabled: false,
      label: 'Update',
      title: '',
      body: '',
      linkText: '',
      linkUrl: ''
    },
    terms: {
      title: 'Rules and Terms',
      intro: '',
      items: [],
      lastUpdated: ''
    }
  };

  try {
    const response = await fetch('./content/site-content.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load content.');
    const data = await response.json();
    return {
      announcement: { ...fallback.announcement, ...(data.announcement || {}) },
      terms: { ...fallback.terms, ...(data.terms || {}) }
    };
  } catch (error) {
    console.warn(error);
    return fallback;
  }
}
