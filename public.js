const notice = document.getElementById('notice');
const year = document.getElementById('year');

year.textContent = new Date().getFullYear();

function showNotice(text, good = true) {
  notice.textContent = text;
  notice.style.background = good ? 'rgba(7,29,15,.96)' : 'rgba(41,10,10,.96)';
  notice.style.color = good ? '#b1f3be' : '#ffc8c8';
  notice.classList.add('show');
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => notice.classList.remove('show'), 2500);
}

async function loadContent() {
  const res = await fetch('/api/content');
  const data = await res.json();
  document.getElementById('hero_title').innerHTML = `${escapeHtml(data.hero_title).replace('forte', '<span class="gradient">forte</span>')}`;
  document.getElementById('hero_subtitle').textContent = data.hero_subtitle;
  document.getElementById('intro_title').textContent = data.intro_title;
  document.getElementById('intro_text').textContent = data.intro_text;
  document.getElementById('section_one_title').textContent = data.section_one_title;
  document.getElementById('section_one_text').textContent = data.section_one_text;
  document.getElementById('section_two_title').textContent = data.section_two_title;
  document.getElementById('section_two_text').textContent = data.section_two_text;
  document.getElementById('section_three_title').textContent = data.section_three_title;
  document.getElementById('section_three_text').textContent = data.section_three_text;
  document.getElementById('contact_email').textContent = data.contact_email;
  document.getElementById('contact_note').textContent = data.contact_note;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const body = Object.fromEntries(new FormData(form).entries());

  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) {
    showNotice(data.error || 'Qualcosa non ha funzionato.', false);
    return;
  }

  form.reset();
  showNotice('Messaggio inviato con successo.');
});

loadContent().catch(() => showNotice('Non sono riuscito a caricare i contenuti.', false));
