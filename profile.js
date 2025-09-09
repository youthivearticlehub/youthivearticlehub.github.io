// profile.js - Kullanıcı profili, makaleler ve şifre yönetimi

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      showLoginRequired();
      return;
    }
    currentUser = session.user;

    // Profil bilgilerini yükle
    await loadUserProfileProfilePage();

    fillProfileUI();
    await loadMyArticles();
    bindPasswordForm();
    bindAvatarNav();

    updateAuthUI();
    showProfileContent();
  } catch (e) {
    console.error('Profil sayfası başlangıç hatası:', e);
    showLoginRequired();
  }
});

async function loadUserProfileProfilePage() {
  if (!currentUser) return;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', currentUser.email)
    .single();
  if (data) currentUser.profile = data;
}

function showLoginRequired() {
  const a = document.getElementById('loginRequired');
  const b = document.getElementById('profileContent');
  if (a) a.style.display = 'block';
  if (b) b.style.display = 'none';
}

function showProfileContent() {
  const a = document.getElementById('loginRequired');
  const b = document.getElementById('profileContent');
  if (a) a.style.display = 'none';
  if (b) b.style.display = 'grid';
}

function fillProfileUI() {
  const full = currentUser.profile?.full_name || currentUser.email;
  const username = currentUser.profile?.username || currentUser.email.split('@')[0];
  const email = currentUser.email;
  const created = currentUser.profile?.created_at ? new Date(currentUser.profile.created_at).toLocaleDateString('tr-TR') : '';

  const big = document.getElementById('profileBigAvatar');
  const fullEl = document.getElementById('profileFullName');
  const userEl = document.getElementById('profileUsername');
  const mailEl = document.getElementById('profileEmail');
  const createdEl = document.getElementById('profileCreated');

  if (big) big.textContent = full.charAt(0).toUpperCase();
  if (fullEl) fullEl.textContent = full;
  if (userEl) userEl.textContent = '@' + username;
  if (mailEl) mailEl.textContent = email;
  if (createdEl) createdEl.textContent = created;
}

async function loadMyArticles() {
  const container = document.getElementById('myArticles');
  if (container) container.innerHTML = '<div class="muted">Yükleniyor...</div>';

  try {
    // Kendi makaleleri: author_id = users.id (profil tablosundaki id)
    const authorId = currentUser.profile?.id;
    if (!authorId) throw new Error('Profil id bulunamadı.');

    const { data, error } = await supabase
      .from('articles')
      .select('id, title, status, created_at, pdf_url')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data || []).map(a => `
      <tr>
        <td>${escapeHtml(a.title)}</td>
        <td>
          <span class="status-badge ${statusClass(a.status)}">${statusLabel(a.status)}</span>
        </td>
        <td>${new Date(a.created_at).toLocaleString('tr-TR')}</td>
        <td><a class="btn" href="${a.pdf_url}" target="_blank">PDF</a></td>
      </tr>
    `).join('');

    const html = `
      <div style="overflow:auto; max-height:40vh;">
        <table class="table">
          <thead>
            <tr><th>Başlık</th><th>Durum</th><th>Tarih</th><th>Dosya</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="4" class="muted">Makaleniz bulunmuyor.</td></tr>'}</tbody>
        </table>
      </div>`;

    if (container) container.innerHTML = html;
  } catch (e) {
    console.error('Makaleler yüklenemedi:', e);
    if (container) container.innerHTML = '<div class="muted">Makaleler yüklenemedi.</div>';
  }
}

function statusClass(s) {
  if (s === 'approved') return 'status-approved';
  if (s === 'rejected') return 'status-rejected';
  return 'status-pending';
}
function statusLabel(s) {
  if (s === 'approved') return 'Onaylı';
  if (s === 'rejected') return 'Reddedildi';
  return 'Bekliyor';
}

function bindPasswordForm() {
  const form = document.getElementById('passwordForm');
  const sendReset = document.getElementById('sendReset');
  if (sendReset) {
    sendReset.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
          redirectTo: window.location.origin + '/profile.html'
        });
        if (error) throw error;
        showToast('Şifre sıfırlama e-postası gönderildi.', 'success');
      } catch (err) {
        console.error('Reset maili gönderilemedi:', err);
        showToast('Şifre sıfırlama e-postası gönderilemedi.', 'error');
      }
    });
  }

  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('passwordSubmit');
    const orig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
      const current = document.getElementById('currentPassword').value;
      const next = document.getElementById('newPassword').value;
      const confirm = document.getElementById('confirmPassword').value;

      if (next.length < 6) throw new Error('Yeni şifre en az 6 karakter olmalı.');
      if (next !== confirm) throw new Error('Yeni şifreler uyuşmuyor.');

      // Supabase v2: önce reauthenticate (signInWithPassword), sonra updateUser
      const email = currentUser.email;
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: current });
      if (reauthError) throw new Error('Mevcut şifre hatalı.');

      const { data, error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      showToast('Şifre başarıyla güncellendi.', 'success');
      form.reset();
    } catch (err) {
      console.error('Şifre güncelleme hatası:', err);
      showToast(err.message || 'Şifre güncellenemedi.', 'error');
    } finally {
      btn.disabled = false; btn.innerHTML = orig;
    }
  });
}

function bindAvatarNav() {
  // Header’daki avatar/isim bu sayfada zaten açık; diğer sayfalarda yönlendirme script.js içinde yapılmalı.
}

function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t ?? ''; return d.innerHTML; }