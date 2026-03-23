const loginView = document.getElementById('loginView');
const adminView = document.getElementById('adminView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const contentForm = document.getElementById('contentForm');
const messagesBody = document.getElementById('messagesBody');
const visitsValue = document.getElementById('visitsValue');
const pageviewsValue = document.getElementById('pageviewsValue');
const messagesValue = document.getElementById('messagesValue');
const logoutBtn = document.getElementById('logoutBtn');
const notice = document.getElementById('notice');

function showNotice(text, good = true) {
  notice.textContent = text;
  notice.style.background = good ? 'rgba(7,29,15,.96)' : 'rgba(41,10,10,.96)';
  notice.style.color = good ? '#b1f3be' : '#ffc8c8';
  notice.classList.add('show');
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => notice.classList.remove('show'), 2500);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function checkSession() {
  const { res } = await api('/api/admin/me');
  if (res.ok) {
    loginView.classList.add('hidden');
    adminView.classList.remove('hidden');
    await loadAdmin();
  } else {
    loginView.classList.remove('hidden');
    adminView.classList.add('hidden');
  }
}

async function loadAdmin() {
  const [statsReq, contentReq, messagesReq] = await Promise.all([
    api('/api/admin/stats'),
    api('/api/content'),
    api('/api/admin/messages')
  ]);

  if (statsReq.res.ok) {
    visitsValue.textContent = Number(statsReq.data.visits || 0).toLocaleString('it-IT');
    pageviewsValue.textContent = Number(statsReq.data.pageviews || 0).toLocaleString('it-IT');
    messagesValue.textContent = Number(statsReq.data.messages || 0).toLocaleString('it-IT');
  }

  if (contentReq.res.ok) {
    Object.entries(contentReq.data).forEach(([key, value]) => {
      if (contentForm.elements[key]) contentForm.elements[key].value = value;
    });
  }

  if (messagesReq.res.ok) {
    messagesBody.innerHTML = messagesReq.data.length
      ? messagesReq.data.map((row) => `
          <tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.email)}</td>
            <td>${escapeHtml(row.need)}</td>
            <td>${escapeHtml(row.message)}</td>
            <td>${new Date(row.created_at).toLocaleString('it-IT')}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="5">Nessun messaggio ricevuto.</td></tr>';
  }
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.style.display = 'none';
  const body = Object.fromEntries(new FormData(loginForm).entries());
  const { res, data } = await api('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    loginError.textContent = data.error || 'Accesso non riuscito.';
    loginError.style.display = 'block';
    return;
  }

  loginForm.reset();
  showNotice('Accesso effettuato con successo.');
  await checkSession();
});

contentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(contentForm).entries());
  const { res, data } = await api('/api/admin/content', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    showNotice(data.error || 'Salvataggio non riuscito.', false);
    return;
  }
  showNotice('Contenuti aggiornati.');
  await loadAdmin();
});

logoutBtn.addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  showNotice('Sei uscito dall’area riservata.');
  await checkSession();
});

checkSession();
