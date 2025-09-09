// articles.js 
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Makaleler sayfası yükleniyor...');
    
    try {
        // Kullanıcı oturum kontrolü
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            await loadUserProfile();
        }
        
        // UI'ı güncelle
        updateAuthUI();
        
        // Makaleleri yükle
        await loadArticles();
        
        // Event listener'ları başlat
        initializeArticleEvents();
        
        // Favorileri güncelle (giriş yapılmışsa)
        if (currentUser) {
            await updateFavoriteButtons();
        }
        
    } catch (error) {
        console.error('Sayfa yükleme hatası:', error);
        showErrorState();
    }
});

// Makaleleri veritabanından yükle
async function loadArticles() {
    try {
        showLoadingState();
        
        const { data: articles, error } = await supabase
            .from('articles')
            .select(`
                *,
                users!articles_author_id_fkey(full_name, username),
                categories!articles_category_id_fkey(name)
            `)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayArticles(articles || []);
        
        // Sayfa yüklendikten sonra filtreleri aktif et
        setTimeout(() => {
            const savedFilters = loadSavedFilters();
            applyFilters(savedFilters);
        }, 100);

    } catch (error) {
        console.error('Makaleler yüklenemedi:', error);
        showErrorState();
    }
}

// Loading durumunu göster
function showLoadingState() {
    const articlesGrid = document.getElementById('articlesGrid');
    if (articlesGrid) {
        articlesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 40px; color: #3a4f66; margin-bottom: 20px;"></i>
                <p style="color: #657b92;">Makaleler yükleniyor...</p>
            </div>
        `;
    }
}

// Hata durumunu göster
function showErrorState() {
    const articlesGrid = document.getElementById('articlesGrid');
    if (articlesGrid) {
        articlesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 60px; color: #e74c3c; margin-bottom: 20px;"></i>
                <h3 style="color: #e74c3c; margin-bottom: 10px;">Makaleler Yüklenemedi</h3>
                <p style="color: #64748b; margin-bottom: 20px;">Bağlantı sorunu yaşanıyor. Lütfen sayfayı yenileyin.</p>
                <button onclick="window.location.reload()" style="padding: 10px 20px; background: #3a4f66; color: white; border: none; border-radius: 4px; cursor: pointer;">Sayfayı Yenile</button>
            </div>
        `;
    }
}

// Makaleleri ekranda göster
function displayArticles(articles) {
    const articlesGrid = document.getElementById('articlesGrid');
    if (!articlesGrid) return;

    if (articles.length === 0) {
        showEmptyState();
        return;
    }

    articlesGrid.innerHTML = articles.map(article => `
        <div class="article-card" data-category="${article.categories.name.toLowerCase()}" data-title="${article.title.toLowerCase()}" data-id="${article.id}">
            <div class="article-category">${article.categories.name}</div>
            <h3 class="article-title">${escapeHtml(article.title)}</h3>
            <p class="article-excerpt">${escapeHtml(article.abstract || 'Bu makale için özet bulunmuyor.')}</p>
            <div class="article-meta">
                <span class="article-author">${escapeHtml(article.users.full_name)}</span>
                <span class="article-date">${formatDate(article.created_at)}</span>
                <span class="article-views">
                    <i class="fas fa-eye"></i> ${article.view_count || 0}
                </span>
            </div>
            <div class="article-actions">
                <button class="article-btn read-btn" data-article-id="${article.id}" data-pdf-url="${article.pdf_url}">
                    <i class="fas fa-book-open"></i> Oku
                </button>
                <button class="article-btn save-btn" data-article-id="${article.id}">
                    <i class="fas fa-bookmark"></i> Kaydet
                </button>
            </div>
        </div>
    `).join('');

    // Button event'lerini yeniden bağla
    attachArticleButtons();
}

// Boş durum göster
function showEmptyState() {
    const articlesGrid = document.getElementById('articlesGrid');
    if (articlesGrid) {
        articlesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px;">
                <i class="fas fa-newspaper" style="font-size: 60px; color: #cbd5e1; margin-bottom: 20px;"></i>
                <h3 style="color: #64748b; margin-bottom: 10px;">Henüz onaylanmış makale bulunmuyor</h3>
                <p style="color: #94a3b8; margin-bottom: 20px;">İlk makaleyi siz yükleyebilirsiniz!</p>
                <a href="uploadarticle.html" style="padding: 10px 20px; background: #3a4f66; color: white; text-decoration: none; border-radius: 4px;">
                    <i class="fas fa-plus"></i> Makale Yükle
                </a>
            </div>
        `;
    }
}

// Makale butonlarını bağla
function attachArticleButtons() {
    // Oku butonları
    document.querySelectorAll('.read-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const articleId = this.getAttribute('data-article-id');
            const pdfUrl = this.getAttribute('data-pdf-url');
            await readArticle(articleId, pdfUrl);
        });
    });

    // Kaydet butonları
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const articleId = this.getAttribute('data-article-id');
            await toggleFavorite(articleId, this);
        });
    });
}

// Makale okuma
async function readArticle(articleId, pdfUrl) {
    try {
        // Görüntülenme sayısını artır
        const { error: updateError } = await supabase.rpc('increment_view_count', {
            article_id: parseInt(articleId)
        });

        if (updateError) {
            console.error('View count güncellenemedi:', updateError);
        }

        // PDF'i yeni sekmede aç
        if (pdfUrl) {
            window.open(pdfUrl, '_blank');
        } else {
            alert('Makale dosyası bulunamadı.');
        }

        // Görüntülenme sayısını hemen güncelle (UI için)
        const articleCard = document.querySelector(`[data-id="${articleId}"]`);
        if (articleCard) {
            const viewsElement = articleCard.querySelector('.article-views');
            if (viewsElement) {
                const currentCount = parseInt(viewsElement.textContent.match(/\d+/)?.[0] || 0);
                viewsElement.innerHTML = `<i class="fas fa-eye"></i> ${currentCount + 1}`;
            }
        }

    } catch (error) {
        console.error('Makale açılamadı:', error);
        alert('Makale şu anda okunamıyor. Lütfen daha sonra tekrar deneyin.');
    }
}

// Favori toggle
async function toggleFavorite(articleId, button) {
    if (!currentUser) {
        alert('Makaleleri kaydetmek için lütfen önce giriş yapınız.');
        openModal('loginModal');
        return;
    }

    // Buton durumunu geçici olarak değiştir
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    button.disabled = true;

    try {
        // Mevcut favoride var mı kontrol et
        const { data: existing, error: checkError } = await supabase
            .from('user_favorites')
            .select('id')
            .eq('user_id', currentUser.profile.id)
            .eq('article_id', articleId)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
            // Favorilerden çıkar
            const { error: deleteError } = await supabase
                .from('user_favorites')
                .delete()
                .eq('user_id', currentUser.profile.id)
                .eq('article_id', articleId);

            if (deleteError) throw deleteError;

            button.innerHTML = '<i class="fas fa-bookmark"></i> Kaydet';
            showToast('Makale favorilerden çıkarıldı!', 'success');
        } else {
            // Favorilere ekle
            const { error: insertError } = await supabase
                .from('user_favorites')
                .insert([{
                    user_id: currentUser.profile.id,
                    article_id: parseInt(articleId)
                }]);

            if (insertError) throw insertError;

            button.innerHTML = '<i class="fas fa-bookmark-check"></i> Kaydedildi';
            showToast('Makale favorilere eklendi!', 'success');
        }

    } catch (error) {
        console.error('Favori işlemi başarısız:', error);
        button.innerHTML = originalText;
        showToast('Favori işlemi gerçekleştirilemedi.', 'error');
    } finally {
        button.disabled = false;
    }
}

// Event listener'ları başlat
function initializeArticleEvents() {
    // Yeni makale butonu
    const addArticleBtn = document.getElementById('addArticleBtn');
    if (addArticleBtn) {
        addArticleBtn.addEventListener('click', function() {
            if (currentUser) {
                window.location.href = 'uploadarticle.html';
            } else {
                alert('Yeni makale oluşturmak için lütfen giriş yapınız.');
                openModal('loginModal');
            }
        });
    }

    // Filtreleme event'leri
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterArticles, 300));
    }
    if (categoryFilter) categoryFilter.addEventListener('change', filterArticles);
    if (sortFilter) sortFilter.addEventListener('change', sortAndFilterArticles);

    // Kategori filtresini dinamik olarak yükle
    loadCategoryFilter();
    // URL'den kategori geldiyse küçük gecikmeyle uygula
    setTimeout(() => applyCategoryFromURL(), 300);
}

// Kategori filtresini yükle
async function loadCategoryFilter() {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .is('parent_id', null)
            .order('name');

        if (error) throw error;

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter && categories) {
            // Mevcut kategorileri koru, yenilerini ekle
            categories.forEach(category => {
                if (!categoryFilter.querySelector(`option[value="${category.name.toLowerCase()}"]`)) {
                    const option = document.createElement('option');
                    option.value = category.name.toLowerCase();
                    option.textContent = category.name;
                    categoryFilter.appendChild(option);
                }
            });
        }
        // URL'den kategori uygulanacaksa uygula
        applyCategoryFromURL();
    } catch (error) {
        console.error('Kategori filtresi yüklenemedi:', error);
    }
}

// URL'den kategori parametresini uygula ve hoş geldiniz mesajı göster
function applyCategoryFromURL() {
    try {
        const params = new URLSearchParams(window.location.search);
        const cat = (params.get('category') || '').toLowerCase().trim();
        if (!cat) return;
        const sel = document.getElementById('categoryFilter');
        if (!sel) return;

        let applied = false;
        const directOption = Array.from(sel.options).find(o => (o.value || '').toLowerCase() === cat);
        if (directOption) {
            sel.value = directOption.value;
            applied = true;
        } else {
            const byText = Array.from(sel.options).find(o => (o.textContent || '').toLowerCase() === cat);
            if (byText) {
                sel.value = byText.value;
                applied = true;
            }
        }

        if (applied) {
            const selText = sel.options[sel.selectedIndex]?.textContent || (cat.charAt(0).toUpperCase() + cat.slice(1));
            if (typeof showCategoryWelcome === 'function') {
                showCategoryWelcome(selText);
            }
            sortAndFilterArticles();
        }
    } catch (e) {
        console.warn('URL kategori uygulanamadı:', e);
    }
}

// Makaleleri filtrele
function filterArticles() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const selectedCategory = document.getElementById('categoryFilter')?.value || '';

    let visibleCount = 0;

    document.querySelectorAll('.article-card').forEach(card => {
        const title = card.getAttribute('data-title') || '';
        const excerpt = card.querySelector('.article-excerpt')?.textContent.toLowerCase() || '';
        const category = card.getAttribute('data-category') || '';

        const matchesSearch = title.includes(searchTerm) || excerpt.includes(searchTerm);
        const matchesCategory = selectedCategory === '' || category.includes(selectedCategory);

        if (matchesSearch && matchesCategory) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Sonuç sayısını göster
    updateResultsCount(visibleCount);
    
    // Filtreleri kaydet
    saveFilters();
}

// Sıralama ve filtreleme
function sortAndFilterArticles() {
    const sortOption = document.getElementById('sortFilter')?.value || 'newest';
    const articlesGrid = document.getElementById('articlesGrid');
    
    if (!articlesGrid) return;

    const articles = Array.from(articlesGrid.querySelectorAll('.article-card'));
    
    articles.sort((a, b) => {
        switch (sortOption) {
            case 'oldest':
                return new Date(a.querySelector('.article-date').textContent) - new Date(b.querySelector('.article-date').textContent);
            case 'az':
                return a.querySelector('.article-title').textContent.localeCompare(b.querySelector('.article-title').textContent, 'tr');
            case 'za':
                return b.querySelector('.article-title').textContent.localeCompare(a.querySelector('.article-title').textContent, 'tr');
            case 'popular':
                const viewsA = parseInt(a.querySelector('.article-views')?.textContent.match(/\d+/)?.[0] || 0);
                const viewsB = parseInt(b.querySelector('.article-views')?.textContent.match(/\d+/)?.[0] || 0);
                return viewsB - viewsA;
            case 'newest':
            default:
                return new Date(b.querySelector('.article-date').textContent) - new Date(a.querySelector('.article-date').textContent);
        }
    });

    // Sıralanmış makaleleri tekrar ekle
    articles.forEach(article => articlesGrid.appendChild(article));
    
    // Filtreleri tekrar uygula
    filterArticles();
}

// Sonuç sayısını güncelle
function updateResultsCount(count) {
    let resultInfo = document.getElementById('resultInfo');
    
    if (!resultInfo) {
        resultInfo = document.createElement('div');
        resultInfo.id = 'resultInfo';
        resultInfo.style.cssText = 'margin-bottom: 20px; color: #657b92; font-size: 14px;';
        
        const articleFilters = document.querySelector('.article-filters');
        if (articleFilters) {
            articleFilters.insertAdjacentElement('afterend', resultInfo);
        }
    }
    
    const totalArticles = document.querySelectorAll('.article-card').length;
    resultInfo.textContent = `${count} / ${totalArticles} makale gösteriliyor`;
}

// Filtreleri kaydet
function saveFilters() {
    const filters = {
        search: document.getElementById('searchInput')?.value || '',
        category: document.getElementById('categoryFilter')?.value || '',
        sort: document.getElementById('sortFilter')?.value || 'newest'
    };
    localStorage.setItem('youthive_article_filters', JSON.stringify(filters));
}

// Kaydedilmiş filtreleri yükle
function loadSavedFilters() {
    const saved = localStorage.getItem('youthive_article_filters');
    return saved ? JSON.parse(saved) : {};
}

// Filtreleri uygula
function applyFilters(filters) {
    if (filters.search) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = filters.search;
    }
    
    if (filters.category) {
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) categoryFilter.value = filters.category;
    }
    
    if (filters.sort) {
        const sortFilter = document.getElementById('sortFilter');
        if (sortFilter) sortFilter.value = filters.sort;
    }
    
    // Filtreleri uygula
    sortAndFilterArticles();
}

// Kullanıcı favorilerini yükle
async function loadUserFavorites() {
    if (!currentUser || !currentUser.profile) return [];

    try {
        const { data, error } = await supabase
            .from('user_favorites')
            .select('article_id')
            .eq('user_id', currentUser.profile.id);

        if (error) throw error;
        return data.map(fav => fav.article_id);
    } catch (error) {
        console.error('Favoriler yüklenemedi:', error);
        return [];
    }
}

// Favori butonlarını güncelle
async function updateFavoriteButtons() {
    if (!currentUser) return;

    const favorites = await loadUserFavorites();
    
    document.querySelectorAll('.save-btn').forEach(btn => {
        const articleId = parseInt(btn.getAttribute('data-article-id'));
        if (favorites.includes(articleId) && btn.textContent.includes('Kaydet')) {
            btn.innerHTML = '<i class="fas fa-bookmark-check"></i> Kaydedildi';
        } else if (!favorites.includes(articleId) && btn.textContent.includes('Kaydedildi')) {
            btn.innerHTML = '<i class="fas fa-bookmark"></i> Kaydet';
        }
    });
}

// Tarih formatla
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
    
    const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// HTML escape (güvenlik için)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Kullanıcı profil bilgilerini yükle
async function loadUserProfile() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', currentUser.email)
        .single();
    
    if (data) {
        currentUser.profile = data;
    } else if (error) {
        console.error('Profil yüklenemedi:', error);
    }
}

// Auth UI güncelle
function updateAuthUI() {
    const loginBtn = document.getElementById('loginButton');
    const signupBtn = document.getElementById('signupButton');
    const logoutBtn = document.getElementById('logoutButton');
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    
    if (currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (userProfile) userProfile.style.display = 'flex';
        
        // Kullanıcı bilgilerini güncelle
        if (userAvatar && currentUser.profile) {
            userAvatar.textContent = currentUser.profile.full_name.charAt(0).toUpperCase();
        }
        if (userName && currentUser.profile) {
            userName.textContent = currentUser.profile.username || currentUser.email;
        }
        
        // Çıkış butonu event'i
        if (logoutBtn && !logoutBtn.hasAttribute('data-listener')) {
            logoutBtn.setAttribute('data-listener', 'true');
            logoutBtn.addEventListener('click', async function() {
                if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
                    await supabase.auth.signOut();
                    window.location.href = 'index.html';
                }
            });
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (signupBtn) signupBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userProfile) userProfile.style.display = 'none';
    }
}

// Modal fonksiyonları
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeAllModals() {
    document.querySelectorAll('.login-modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// Debounce function (arama için)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}