// upload.js - Gelişmiş hata yönetimi ile

// Global değişken - config.js'deki currentUser kullanılacak
// DOM toggle yaklaşımı kullanılacak; form yeniden yazılmayacak

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Upload sayfası yükleniyor...');

    // Event'leri bir kez kur
    initializeUploadEvents();

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            currentUser = session.user;
            await loadUserProfileUpload();
            hideLoginRequiredOverlay();
            showUploadForm();
            updateAuthUI();
        } else {
            showLoginRequiredOverlay();
        }
    } catch (err) {
        console.error('Session kontrol hatası:', err);
        showLoginRequiredOverlay();
    }

    // Oturum değişikliklerini dinle
    supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
            currentUser = session.user;
            await loadUserProfileUpload();
            hideLoginRequiredOverlay();
            showUploadForm();
            updateAuthUI();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showLoginRequiredOverlay();
            updateAuthUI();
        }
    });
});

// Kullanıcı profilini yükle
async function loadUserProfileUpload() {
    if (!currentUser) return false;
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', currentUser.email)
            .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
            // PGRST116: no rows; diğer hatalar üst katmana
            throw error;
        }
        
        if (data) {
            currentUser.profile = data;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Profil yükleme hatası:', error);
        throw error;
    }
}

// Kullanıcı profili oluştur
async function createUserProfileUpload() {
    try {
        const { data, error } = await supabase
            .from('users')
            .insert([{
                email: currentUser.email,
                username: currentUser.email.split('@')[0],
                full_name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0],
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        if (data) {
            currentUser.profile = data;
            return data;
        }
        throw new Error('Profil oluşturma başarısız: veri döndürülmedi.');
    } catch (error) {
        console.error('Profil oluşturma hatası:', error);
        throw error;
    }
}

// Profil varlığını garanti et
async function ensureUserProfileUpload() {
    if (!currentUser) throw new Error('Oturum bulunamadı. Lütfen giriş yapın.');

    // 1) Mevcut profili yükle
    let hasProfile = await loadUserProfileUpload();

    // 2) Yoksa oluştur
    if (!hasProfile) {
        await createUserProfileUpload();
        // 3) Oluşturduktan sonra tekrar yükle ve doğrula
        hasProfile = await loadUserProfileUpload();
    }

    if (!hasProfile || !currentUser.profile?.id) {
        throw new Error('Kullanıcı profili oluşturulamadı. Supabase users tablosu için SELECT/INSERT yetkisi (RLS policy) gereklidir.');
    }
}

// Makale yükleme işlemi
async function handleArticleUpload(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showToast('Lütfen önce giriş yapınız.', 'error');
        openLoginModal();
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData(event.target);
        const file = formData.get('articleFile');
        const title = formData.get('articleTitle')?.trim();
        const categoryId = formData.get('articleCategory');
        const abstract = formData.get('articleAbstract')?.trim() || null;

        // Profilin mevcut olduğundan emin ol
        await ensureUserProfileUpload();
        if (!currentUser.profile?.id) {
            throw new Error('Kullanıcı profili bulunamadı. Lütfen çıkış yapıp tekrar giriş yapın ve tekrar deneyin.');
        }
        
        // Validasyon
        if (!title || title.length < 5) {
            throw new Error('Makale başlığı en az 5 karakter olmalıdır.');
        }
        
        if (!categoryId) {
            throw new Error('Lütfen bir kategori seçiniz.');
        }
        
        if (!file || file.size === 0) {
            throw new Error('Lütfen bir PDF dosyası seçin.');
        }
        
        if (file.type !== 'application/pdf') {
            throw new Error('Sadece PDF dosyaları yüklenebilir.');
        }
        
        if (file.size > APP_CONFIG.maxFileSize) {
            const maxSizeMB = (APP_CONFIG.maxFileSize / (1024 * 1024)).toFixed(1);
            throw new Error(`Dosya boyutu ${maxSizeMB}MB'dan büyük olamaz.`);
        }
        
        // Benzersiz dosya adı oluştur
        const fileName = generateUniqueFileName(file.name);
        
        // Dosyayı Supabase Storage'a yükle
        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: 'application/pdf'
            });

        if (uploadError) {
            throw new Error('Dosya yüklenirken hata oluştu: ' + uploadError.message);
        }
        
        // Dosyanın public URL'ini al
        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(fileName);
        
        // Article kaydını veritabanına ekle
        const articleData = {
            title: title,
            slug: generateSlug(title),
            abstract: abstract,
            category_id: parseInt(categoryId),
            author_id: currentUser.profile.id,
            pdf_url: urlData.publicUrl,
            file_name: fileName,
            file_size: file.size,
            status: 'pending',
            view_count: 0,
            created_at: new Date().toISOString()
        };
        
        const { error: articleError } = await supabase
            .from('articles')
            .insert([articleData]);

        if (articleError) {
            // Hata durumunda dosyayı storage'dan sil
            await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
            throw new Error('Makale kaydedilirken hata oluştu: ' + articleError.message);
        }
        
        // Başarı mesajı göster ve formu temizle
        showSuccessMessage();
        event.target.reset();
        resetFileUpload();
        
    } catch (error) {
        console.error('Makale yükleme hatası:', error);
        showToast(error?.message || 'Yükleme sırasında bir hata oluştu.', 'error');
    } finally {
        resetSubmitButton(submitBtn, originalText);
    }
}

// Dosya yükleme alanını sıfırla
function resetFileUpload() {
    const fileNameDiv = document.getElementById('fileName');
    const fileUploadLabel = document.querySelector('.file-upload-label');
    
    if (fileNameDiv) {
        fileNameDiv.innerHTML = '<span style="color: #657b92;">Henüz dosya seçilmedi</span>';
    }
    
    if (fileUploadLabel) {
        fileUploadLabel.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <span>PDF dosyasını seçin veya sürükleyin</span>
            <small style="display: block; margin-top: 5px; font-size: 12px;">
                Maksimum dosya boyutu: 10MB
            </small>
        `;
    }
}

// Slug oluştur (başlıktan, benzersiz kuyrukla)
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

// Benzersiz dosya adı oluştur
function generateUniqueFileName(originalName) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    
    // Özel karakterleri kaldır ve normalize et
    const normalizedName = nameWithoutExt
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .substring(0, 30);
    
    return `${timestamp}_${randomString}_${normalizedName}.${extension}`;
}

// Dosya adı gösterme
function displayFileName(file) {
    const fileNameDiv = document.getElementById('fileName');
    const fileUploadLabel = document.querySelector('.file-upload-label');
    
    if (!fileNameDiv) return;
    
    if (file) {
        // Tip kontrolü
        if (file.type !== 'application/pdf') {
            fileNameDiv.innerHTML = `<span style="color: #e74c3c;">Sadece PDF dosyaları yüklenebilir!</span>`;
            return;
        }
        
        // Boyut kontrolü
        if (file.size > APP_CONFIG.maxFileSize) {
            const maxSizeMB = (APP_CONFIG.maxFileSize / (1024 * 1024)).toFixed(1);
            fileNameDiv.innerHTML = `<span style="color: #e74c3c;">Dosya boyutu ${maxSizeMB}MB'dan büyük olamaz!</span>`;
            return;
        }
        
        // Başarılı durum
        const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        fileNameDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; color: #059669;">
                <i class="fas fa-file-pdf" style="font-size: 24px;"></i>
                <div>
                    <div style="font-weight: 500;">${file.name}</div>
                    <div style="font-size: 12px;">${fileSizeInMB} MB</div>
                </div>
            </div>
        `;
    } else {
        fileNameDiv.innerHTML = '<span style="color: #657b92;">Henüz dosya seçilmedi</span>';
    }
}

// Upload event'lerini başlat
function initializeUploadEvents() {
    const uploadForm = document.getElementById('articleUploadForm');
    const fileInput = document.getElementById('articleFile');
    
    if (uploadForm && !uploadForm.dataset.listenerAdded) {
        uploadForm.addEventListener('submit', handleArticleUpload);
        uploadForm.dataset.listenerAdded = '1';
    }
    
    if (fileInput && !fileInput.dataset.listenerAdded) {
        fileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            displayFileName(file);
        });
        fileInput.dataset.listenerAdded = '1';
    }
    
    // Drag & drop functionality
    const fileUploadLabel = document.querySelector('.file-upload-label');
    if (fileUploadLabel && fileInput && !fileUploadLabel.dataset.listenerAdded) {
        setupDragAndDrop(fileUploadLabel, fileInput);
        fileUploadLabel.dataset.listenerAdded = '1';
    }
}

// Drag & Drop kurulumu
function setupDragAndDrop(label, input) {
    label.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.borderColor = '#3a4f66';
        this.style.backgroundColor = '#f0f4f8';
    });
    
    label.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.borderColor = '#e2e8f0';
        this.style.backgroundColor = '#f8fafc';
    });
    
    label.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.style.borderColor = '#e2e8f0';
        this.style.backgroundColor = '#f8fafc';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            
            // File input'unun files özelliğini güncelle
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
            
            // Dosyayı göster
            displayFileName(file);
            
            // Change event'ini tetikle
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
        }
    });
}

// Formu geri yükle ve event'leri bağla
function showUploadForm() {
    const formSection = document.getElementById('uploadFormSection');
    const successSection = document.getElementById('successSection');
    if (formSection) formSection.style.display = 'block';
    if (successSection) successSection.style.display = 'none';
}

// Diğer fonksiyonlar
function showLoginRequiredOverlay() {
    const formSection = document.getElementById('uploadFormSection');
    const successSection = document.getElementById('successSection');
    if (formSection) formSection.style.display = 'none';
    if (successSection) successSection.style.display = 'none';

    let loginSection = document.getElementById('loginRequiredSection');
    if (!loginSection) {
        loginSection = document.createElement('div');
        loginSection.id = 'loginRequiredSection';
        loginSection.style.textAlign = 'center';
        loginSection.style.padding = '40px 20px';
        loginSection.innerHTML = `
            <i class="fas fa-exclamation-circle" style="font-size: 60px; color: #e74c3c; margin-bottom: 20px;"></i>
            <h2>Giriş Yapmanız Gerekiyor</h2>
            <p>Makale yüklemek için lütfen giriş yapınız veya hesap oluşturunuz.</p>
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px; flex-wrap: wrap;">
                <button onclick="openLoginModal()" class="auth-btn login">Giriş Yap</button>
                <button onclick="openSignupModal()" class="auth-btn signup">Hesap Oluştur</button>
                <a href="index.html" class="auth-btn" style="text-decoration: none; text-align: center;">Ana Sayfa</a>
            </div>
        `;
        const container = document.querySelector('.upload-container');
        if (container) container.appendChild(loginSection);
    } else {
        loginSection.style.display = 'block';
    }
}

function hideLoginRequiredOverlay() {
    const loginSection = document.getElementById('loginRequiredSection');
    if (loginSection) loginSection.style.display = 'none';
}

function showSuccessMessage() {
    const uploadFormSection = document.getElementById('uploadFormSection');
    const successSection = document.getElementById('successSection');
    
    if (uploadFormSection && successSection) {
        uploadFormSection.style.display = 'none';
        successSection.style.display = 'block';
    }
}

function resetSubmitButton(button, originalText) {
    button.innerHTML = originalText;
    button.disabled = false;
}


function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('active');
}

function openSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) modal.classList.add('active');
}


// Global fonksiyonlar
window.openLoginModal = openLoginModal;
window.openSignupModal = openSignupModal;