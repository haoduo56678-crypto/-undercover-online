(() => {
  const form = document.getElementById('feedback-form');
  if (!form) return;

  const statusEl = document.getElementById('feedback-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    statusEl.textContent = 'Sending...';
    submitBtn.disabled = true;

    const data = {
      name: form.name.value.trim(),
      game: form.game.value,
      type: form.type.value,
      message: form.message.value.trim(),
      page: window.location.href,
    };

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Unable to send feedback right now.');
      }

      form.reset();
      statusEl.textContent = 'Thanks! Your feedback was sent.';
    } catch (error) {
      statusEl.textContent = error.message || 'Unable to send feedback right now.';
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
