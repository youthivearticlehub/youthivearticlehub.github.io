// editor.js 
let isEditor = false;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      showUnauthorized();
      return;
    }
    currentUser = session.user;
    await loadUserProfileEditor();

    // Yetki kontrolü 
    isEditor = !!currentUser.profile?.is_editor;
    if (!isEditor) {
      showUnauthorized();
      return;
    }

    hideUnauthorized();
    updateAuthUI();

    await loadCategories();
    await loadPendingArticles();

    bindFilters();
  } catch (err) {
    console.error('Editör paneli başlangıç hatası:', err);
    showUnauthorized();
  }
});

async function loadUserProfileEditor() {
  if (!currentUser) return;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', currentUser.email)
    .single();
  if (data) currentUser.profile = data;
}

function showUnauthorized() {
  const unauth = document.getElementById('unauthorized');
  const list = document.querySelector('.panel');
  if (list) list.style.display = 'none';
  if (unauth) unauth.style.display = 'block';
}

function hideUnauthorized() {
  const unauth = document.getElementById('unauthorized');
  const list = document.querySelector('.panel');
  if (list) list.style.display = 'block';
  if (unauth) unauth.style.display = 'none';
}

function bindFilters() {
  const searchTerm = document.getElementById('searchTerm');
  const categorySelect = document.getElementById('categorySelect');
  const statusSelect = document.getElementById('statusSelect');
  const sortSelect = document.getElementById('sortSelect');
  [searchTerm, categorySelect, statusSelect, sortSelect].forEach(el => {
    if (el) el.addEventListener('input', debounce(refreshList, 200));
    if (el) el.addEventListener('change', debounce(refreshList, 200));
  });
}

async function refreshList() { await loadPendingArticles(); }

async function loadCategories() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) throw error;
    const sel = document.getElementById('categorySelect');
    if (sel && data) {
      data.forEach(c => {
        const opt = document.createElement('option');
        opt.value = String(c.id);
        opt.textContent = c.name;
        sel.appendChild(opt);
      });
    }
  } catch (e) {
    console.error('Kategori yüklenemedi:', e);
  }
}

async function loadPendingArticles() {
  const list = document.getElementById('listContainer');
  const countEl = document.getElementById('pendingCount');
  if (list) list.innerHTML = '<div class="empty">Yükleniyor...</div>';

  try {
    const searchTerm = document.getElementById('searchTerm')?.value?.toLowerCase() || '';
    const categoryId = document.getElementById('categorySelect')?.value || '';
    const sort = document.getElementById('sortSelect')?.value || 'newest';
    const status = document.getElementById('statusSelect')?.value || '';

    let query = supabase
      .from('articles')
      .select('*, users!articles_author_id_fkey(full_name, username), categories!articles_category_id_fkey(name)');

    if (status) query = query.eq('status', status);
    if (categoryId) query = query.eq('category_id', parseInt(categoryId));

    // Sıralama
    if (sort === 'oldest') query = query.order('created_at', { ascending: true });
    else query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    let rows = (data || []);
    if (searchTerm) {
      rows = rows.filter(r => (r.title || '').toLowerCase().includes(searchTerm));
    }

    if (!rows.length) {
      if (list) list.innerHTML = '<div class="empty">Bekleyen makale bulunmuyor.</div>';
      if (countEl) countEl.textContent = '0 makale';
      return;
    }

    if (countEl) countEl.textContent = `${rows.length} makale`;
    if (list) list.innerHTML = renderTable(rows);
    bindRowActions();
  } catch (err) {
    console.error('Makaleler yüklenemedi:', err);
    if (list) list.innerHTML = '<div class="empty">Liste yüklenemedi.</div>';
  }
}

function renderTable(items) {
  const rows = items.map(a => `
    <tr data-id="${a.id}">
      <td><span class="status-badge ${a.status==='approved'?'status-approved':(a.status==='rejected'?'status-rejected':'status-pending')}">${a.status==='approved'?'Onaylı':(a.status==='rejected'?'Reddedildi':'Bekliyor')}</span></td>
      <td>${escapeHtml(a.title || '')}<div class="muted">${escapeHtml(a.categories?.name || '')}</div></td>
      <td>${escapeHtml(a.users?.full_name || a.users?.username || '')}</td>
      <td>${new Date(a.created_at).toLocaleString('tr-TR')}</td>
      <td class="actions">
        <a href="${a.pdf_url}" target="_blank" class="btn" style="background:#3a4f66;color:#fff"><i class="fas fa-file-pdf"></i> PDF</a>
        <button class="btn" data-action="edit" style="background:#2563eb;color:#fff"><i class="fas fa-pen"></i> Düzenle</button>
        <button class="btn btn-approve" data-action="approve"><i class="fas fa-check"></i> Onayla</button>
        <button class="btn btn-reject" data-action="reject"><i class="fas fa-times"></i> Reddet</button>
        <button class="btn btn-delete" data-action="delete"><i class="fas fa-trash"></i> Sil</button>
      </td>
    </tr>`).join('');

  return `
    <div style="overflow:auto; max-height:70vh">
      <table class="table">
        <thead>
          <tr>
            <th>Durum</th>
            <th>Başlık</th>
            <th>Yazar</th>
            <th>Tarih</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function bindRowActions() {
  document.querySelectorAll('#listContainer [data-action="approve"]').forEach(btn => {
    btn.addEventListener('click', () => updateStatus(btn, 'approved'));
  });
  document.querySelectorAll('#listContainer [data-action="reject"]').forEach(btn => {
    btn.addEventListener('click', () => updateStatus(btn, 'rejected'));
  });
  document.querySelectorAll('#listContainer [data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn));
  });
  document.querySelectorAll('#listContainer [data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteArticle(btn));
  });
}

async function updateStatus(button, newStatus) {
  const tr = button.closest('tr');
  const id = tr?.getAttribute('data-id');
  if (!id) return;

  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const { error } = await supabase
      .from('articles')
      .update({ status: newStatus })
      .eq('id', parseInt(id));

    if (error) throw error;

    showToast(`Makale ${newStatus === 'approved' ? 'onaylandı' : 'reddedildi'}.`, 'success');
    await loadPendingArticles();
  } catch (err) {
    console.error('Durum güncellenemedi:', err);
    showToast('Durum güncellenemedi.', 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// Basit slug üretimi (başlık değişirse)
function generateSlug(title) {
  const base = String(title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
  const suffix = Date.now().toString(36).slice(-6);
  return `${base}-${suffix}`;
}

// Düzenleme modalı aç
async function openEditModal(button) {
  const tr = button.closest('tr');
  const id = tr?.getAttribute('data-id');
  if (!id) return;
  try {
    const { data: article, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', parseInt(id))
      .single();
    if (error) throw error;

    const catsSel = document.getElementById('categorySelect');
    const catOptions = catsSel ? Array.from(catsSel.options).map(o => ({ value: o.value, text: o.text })) : [];

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:3000;display:flex;align-items:center;justify-content:center;';
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:10px;max-width:600px;width:90%;padding:20px;box-shadow:0 10px 25px rgba(0,0,0,.2);';
    if (document.body.classList.contains('night-mode')) {
      modal.style.background = '#2d3748';
      modal.style.color = '#e2e8f0';
    }

    modal.innerHTML = `
      <h3 style="margin-bottom:10px;">Makale Düzenle</h3>
      <div class="form-group"><input id="editTitle" type="text" value="${escapeHtml(article.title || '')}" placeholder="Başlık" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:6px;"></div>
      <div class="form-group"><textarea id="editAbstract" rows="4" placeholder="Özet" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:6px;">${escapeHtml(article.abstract || '')}</textarea></div>
      <div class="form-group"><select id="editCategory" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:6px;">${catOptions.map(o => `<option value="${o.value}">${escapeHtml(o.text)}</option>`).join('')}</select></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="editCancel" class="btn" style="background:#6b7280;">İptal</button>
        <button id="editSave" class="btn" style="background:#2563eb;">Kaydet</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const editCategory = modal.querySelector('#editCategory');
    if (editCategory && article.category_id) {
      editCategory.value = String(article.category_id);
    }

    modal.querySelector('#editCancel').addEventListener('click', () => {
      overlay.remove();
    });

    modal.querySelector('#editSave').addEventListener('click', async () => {
      const title = modal.querySelector('#editTitle').value.trim();
      const abstract = modal.querySelector('#editAbstract').value.trim();
      const categoryId = parseInt(modal.querySelector('#editCategory').value || '0');
      if (!title || !categoryId) {
        showToast('Başlık ve kategori zorunludur.', 'error');
        return;
      }
      const updates = { title, abstract, category_id: categoryId };
      // Başlık değiştiyse slug güncelleyelim
      if (title !== article.title) {
        updates.slug = generateSlug(title);
      }
      try {
        const { error: upErr } = await supabase
          .from('articles')
          .update(updates)
          .eq('id', article.id);
        if (upErr) throw upErr;
        showToast('Makale güncellendi.', 'success');
        overlay.remove();
        await loadPendingArticles();
      } catch (e) {
        console.error('Güncelleme hatası:', e);
        showToast('Güncelleme başarısız.', 'error');
      }
    });
  } catch (err) {
    console.error('Makale alınamadı:', err);
    showToast('Makale bilgisi alınamadı.', 'error');
  }
}

// Makale silme fonksiyonu
async function deleteArticle(button) {
  const tr = button.closest('tr');
  const id = tr?.getAttribute('data-id');
  if (!id) return;
  
  if (!confirm('Bu makaleyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve makale kalıcı olarak silinecektir.')) return;

  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    // Önce makale bilgilerini al
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('id, file_name')
      .eq('id', parseInt(id))
      .single();
    
    if (fetchError) throw fetchError;

    // Storage'dan PDF'i sil (varsa)
    if (article?.file_name) {
      try {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([article.file_name]);
        
        if (storageError) {
          console.warn('Dosya storage\'dan silinemedi:', storageError);
        }
      } catch (e) {
        console.warn('Storage silme uyarısı:', e);
      }
    }

    // Veritabanından makaleyi sil
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', parseInt(id));
    
    if (deleteError) throw deleteError;

    showToast('Makale başarıyla silindi.', 'success');
    await loadPendingArticles();
  } catch (err) {
    console.error('Silme hatası:', err);
    showToast('Makale silinemedi: ' + (err.message || 'Bilinmeyen hata'), 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

function debounce(fn, wait) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
}