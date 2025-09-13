// script.js - Supabase entegrasyonlu + Mobile Optimized
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Sayfa yüklendi, başlatılıyor...');
    
    // Mobil optimizasyonları başlat
    initializeMobileOptimizations();
    
    try {
        // Mevcut oturumu kontrol et
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            await loadUserProfile();
        }
    } catch (error) {
        console.error('Session kontrol hatası:', error);
    } finally {
        // UI'ı her durumda güncelle ve event'leri kur (ESC kapatma dahil)
        updateAuthUI();
        initializeEventListeners();
        loadThemeSettings();
        console.log('Başlangıç işlemleri tamamlandı');
    }
});

// Mobil cihaz tespiti
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
}

// Touch cihaz tespiti
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Viewport meta tag'ını dinamik güncelleme
function updateViewport() {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        document.head.appendChild(viewport);
    }
    
    if (isMobile()) {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
    } else {
        viewport.content = 'width=device-width, initial-scale=1.0';
    }
}

// Mobil menü toggle fonksiyonu
function initializeMobileMenu() {
    if (!isMobile()) return;
    
    // Header'ı sticky yapmak için scroll dinleyicisi
    let lastScrollTop = 0;
    const header = document.querySelector('.fixed-header');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Aşağı kaydırırken header'ı gizle, yukarı kaydırırken göster
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            if (header) header.style.transform = 'translateY(-100%)';
        } else {
            if (header) header.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });
    
    // Dropdown menüleri için touch events
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('a');
        const content = dropdown.querySelector('.dropdown-content');
        
        if (toggle && content) {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Diğer açık menüleri kapat
                dropdowns.forEach(other => {
                    if (other !== dropdown) {
                        const otherContent = other.querySelector('.dropdown-content');
                        if (otherContent) otherContent.style.display = 'none';
                    }
                });
                
                // Bu menüyü toggle et
                if (content.style.display === 'block') {
                    content.style.display = 'none';
                } else {
                    content.style.display = 'block';
                }
            });
        }
    });
    
    // Dışarı tıklandığında menüleri kapat
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            dropdowns.forEach(dropdown => {
                const content = dropdown.querySelector('.dropdown-content');
                if (content) content.style.display = 'none';
            });
        }
    });
}

// Modal'ların mobil optimizasyonu
function optimizeModalsForMobile() {
    const modals = document.querySelectorAll('.login-modal');
    
    modals.forEach(modal => {
        // Touch events ile kapatma
        modal.addEventListener('touchstart', function(e) {
            if (e.target === modal) {
                closeAllModals();
            }
        });
        
        // Modal içeriğinde kaydırmayı optimize et
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent && isMobile()) {
            modalContent.style.maxHeight = '90vh';
            modalContent.style.overflowY = 'auto';
        }
    });
}

// Form input'larını mobil için optimize etme
function optimizeFormsForMobile() {
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        // iOS'ta zoom'u önlemek için font-size'ı 16px yap
        if (isMobile() && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            input.style.fontSize = '16px';
        }
        
        // Touch cihazlarda daha iyi deneyim için
        if (isTouchDevice()) {
            input.addEventListener('focus', function() {
                setTimeout(() => {
                    this.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }, 300);
            });
        }
    });
}

// Lazy loading için intersection observer
function initializeLazyLoading() {
    if ('IntersectionObserver' in window) {
        const images = document.querySelectorAll('img[loading="lazy"]');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
}

// Swipe gesture desteği
function addSwipeSupport() {
    if (!isTouchDevice()) return;
    
    let startX = 0;
    let startY = 0;
    
    document.addEventListener('touchstart', function(e) {
        if (e.touches && e.touches[0]) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
        if (!startX || !startY || !e.changedTouches || !e.changedTouches[0]) return;
        
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        
        const diffX = startX - endX;
        const diffY = startY - endY;
        
        // Yatay swipe (sağa/sola)
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (diffX > 0) {
                // Sola swipe - sonraki sayfa
                console.log('Swipe left detected');
            } else {
                // Sağa swipe - önceki sayfa  
                console.log('Swipe right detected');
            }
        }
        
        startX = 0;
        startY = 0;
    }, { passive: true });
}

// Mobil klavye açılınca layout düzenleme
function handleMobileKeyboard() {
    if (!isMobile()) return;
    
    const inputs = document.querySelectorAll('input, textarea');
    let originalHeight = window.innerHeight;
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            setTimeout(() => {
                if (window.innerHeight < originalHeight * 0.75) {
                    document.body.classList.add('keyboard-open');
                }
            }, 300);
        });
        
        input.addEventListener('blur', function() {
            document.body.classList.remove('keyboard-open');
        });
    });
}

// Pull-to-refresh desteği
function addPullToRefresh() {
    if (!isMobile()) return;
    
    let startY = 0;
    let pulling = false;
    
    document.addEventListener('touchstart', function(e) {
        if (window.scrollY === 0 && e.touches && e.touches[0]) {
            startY = e.touches[0].clientY;
            pulling = true;
        }
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
        if (!pulling || !e.touches || !e.touches[0]) return;
        
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 100 && window.scrollY === 0) {
            // Pull-to-refresh göstergesi göster
            console.log('Pull to refresh triggered');
        }
    }, { passive: true });
    
    document.addEventListener('touchend', function() {
        pulling = false;
        startY = 0;
    }, { passive: true });
}

// Toast bildirimlerini mobil için optimize etme
function showToastMobile(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.classList.add('hiding');
        setTimeout(() => existingToast.remove(), 300);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Mobil için özel stil
    if (isMobile()) {
        toast.style.cssText = `
            position: fixed;
            left: 20px;
            right: 20px;
            bottom: 20px;
            z-index: 9999;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            transform: translateY(100px);
            transition: transform 0.3s ease;
        `;
    } else {
        toast.style.cssText = `
            position: fixed;
            top: 90px;
            right: 20px;
            z-index: 9999;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            font-size: 14px;
            max-width: 350px;
            min-width: 250px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
    }
    
    // Tip'e göre renk
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    toast.style.backgroundColor = colors[type] || colors.info;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="${icons[type]}"></i>
                <span>${message}</span>
            </div>
            <button onclick="this.closest('.toast').remove()" 
                    style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; margin-left: 10px;">&times;</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animasyon
    setTimeout(() => {
        if (isMobile()) {
            toast.style.transform = 'translateY(0)';
        } else {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }
    }, 100);
    
    // Otomatik kapat
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('hiding');
            if (isMobile()) {
                toast.style.transform = 'translateY(100px)';
            } else {
                toast.style.transform = 'translateX(100%)';
                toast.style.opacity = '0';
            }
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// Tüm mobil optimizasyonları başlat
function initializeMobileOptimizations() {
    updateViewport();
    initializeMobileMenu();
    optimizeModalsForMobile();
    optimizeFormsForMobile();
    initializeLazyLoading();
    addSwipeSupport();
    handleMobileKeyboard();
    addPullToRefresh();
    
    // Mobil cihazlarda showToast fonksiyonunu override et
    if (isMobile()) {
        window.showToast = showToastMobile;
    }
    
    // Mobil için özel CSS class'ı ekle
    if (isMobile()) {
        document.body.classList.add('is-mobile');
    }
    
    if (isTouchDevice()) {
        document.body.classList.add('is-touch');
    }
    
    // Service Worker registrasyonu (offline destek için)
    if ('serviceWorker' in navigator && isMobile()) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('SW registered'))
                .catch(error => console.log('SW registration failed'));
        });
    }
}

// Window resize dinleyicisi
window.addEventListener('resize', function() {
    updateViewport();
    
    // Orientation change'de layout'u yeniden hesapla
    setTimeout(() => {
        const wasMobile = document.body.classList.contains('is-mobile');
        const nowMobile = isMobile();
        if (wasMobile !== nowMobile) {
            location.reload(); // Mobil/desktop geçişinde sayfa yenile
        }
    }, 100);
});

// Kullanıcı profil bilgilerini yükle
async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', currentUser.email)
            .single();
        
        if (data) {
            currentUser.profile = data;
        } else if (error && error.code !== 'PGRST116') {
            console.warn('Profil bulunamadı:', error.message);
            // Profil yoksa oluşturalım
            await createUserProfile();
        }
    } catch (error) {
        console.error('Profil yükleme hatası:', error);
    }
}

// Kullanıcı profili oluştur
async function createUserProfile() {
    try {
        const { data, error } = await supabase
            .from('users')
            .insert([{
                email: currentUser.email,
                username: currentUser.email.split('@')[0],
                full_name: currentUser.user_metadata?.full_name || 'Kullanıcı',
                created_at: new Date()
            }])
            .select()
            .single();
            
        if (data) {
            currentUser.profile = data;
            console.log('Kullanıcı profili oluşturuldu:', data);
        }
    } catch (error) {
        console.error('Profil oluşturma hatası:', error);
    }
}

// Tüm event listener'ları başlat
function initializeEventListeners() {
    // Modal butonları
    const loginButton = document.getElementById('loginButton');
    const signupButton = document.getElementById('signupButton');
    const logoutButton = document.getElementById('logoutButton');
    
    if (loginButton) {
        loginButton.addEventListener('click', function(e) {
            e.preventDefault();
            openModal('loginModal');
        });
    }
    
    if (signupButton) {
        signupButton.addEventListener('click', function(e) {
            e.preventDefault();
            openModal('signupModal');
        });
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Modal kapatma event'leri
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            closeAllModals();
        });
    });

    document.querySelectorAll('.login-modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeAllModals();
        });
    });

    // Form event'leri
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Modal geçiş butonları
    const goToSignup = document.getElementById('goToSignup');
    if (goToSignup) {
        goToSignup.addEventListener('click', function(e) {
            e.preventDefault();
            closeAllModals();
            setTimeout(() => openModal('signupModal'), 300);
        });
    }

    // Tema değiştirme
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function(e) {
            e.preventDefault();
            toggleTheme();
        });
    }

    // Profil sayfasına yönlendirme (avatar/isim tıklaması)
    const userProfileEl = document.getElementById('userProfile');
    const userAvatarEl = document.getElementById('userAvatar');
    const userNameEl = document.getElementById('userName');
    [userProfileEl, userAvatarEl, userNameEl].forEach(el => {
        if (el && !el.dataset.profileNav) {
            el.style.cursor = 'pointer';
            el.addEventListener('click', function(e) {
                e.preventDefault();
                if (currentUser) {
                    window.location.href = 'profile.html';
                } else {
                    openModal('loginModal');
                }
            });
            el.dataset.profileNav = '1';
        }
    });

    // Dil seçimi
    document.querySelectorAll('.language-selector button').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.language-selector button').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Dil değişikliğini kaydet
            localStorage.setItem('youthive_language', this.textContent);
        });
    });

    // ESC tuşu ile modal kapatma
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeAllModals();
    });

    // Dropdown menü etkileşimleri
    setupDropdownMenus();
    
    // Smooth scroll for anchor links
    setupSmoothScroll();

    // Kategori linkleri tıklanınca yeni sekmede kategori sayfasını aç
    document.querySelectorAll('.dropdown .submenu a').forEach(link => {
        if (!link.dataset.catListener) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const name = this.textContent.trim();
                const param = encodeURIComponent(name.toLowerCase());
                window.open(`articles.html?category=${param}`, '_blank');
            });
            link.dataset.catListener = '1';
        }
    });
}

// Dropdown menüleri ayarla
function setupDropdownMenus() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const dropdownContent = dropdown.querySelector('.dropdown-content');
        let hoverTimeout;

        if (!isMobile()) {
            dropdown.addEventListener('mouseenter', function() {
                clearTimeout(hoverTimeout);
                if (dropdownContent) {
                    dropdownContent.style.visibility = 'visible';
                    dropdownContent.style.opacity = '1';
                    dropdownContent.style.transform = 'translateY(0)';
                }
            });

            dropdown.addEventListener('mouseleave', function() {
                hoverTimeout = setTimeout(() => {
                    if (dropdownContent) {
                        dropdownContent.style.opacity = '0';
                        dropdownContent.style.transform = 'translateY(-10px)';
                        setTimeout(() => {
                            dropdownContent.style.visibility = 'hidden';
                        }, 300);
                    }
                }, 100);
            });
        }
    });

    // Submenu animasyonları
    document.querySelectorAll('.has-submenu').forEach(item => {
        const submenu = item.querySelector('.submenu');
        if (submenu && !isMobile()) {
            submenu.style.opacity = '0';
            submenu.style.visibility = 'hidden';
            submenu.style.transform = 'translateX(10px)';
            submenu.style.transition = 'all 0.3s ease';
            
            item.addEventListener('mouseenter', function() {
                submenu.style.opacity = '1';
                submenu.style.visibility = 'visible';
                submenu.style.transform = 'translateX(0)';
            });
            
            item.addEventListener('mouseleave', function() {
                submenu.style.opacity = '0';
                submenu.style.transform = 'translateX(10px)';
                setTimeout(() => {
                    submenu.style.visibility = 'hidden';
                }, 300);
            });
        }
    });
}

// Smooth scroll ayarla
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Kullanıcı kayıt işlemi
async function handleSignup(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Hesap Oluşturuluyor...';
    submitBtn.disabled = true;
    
    const formData = new FormData(e.target);
    const userData = {
        email: formData.get('email'),
        password: formData.get('password'),
        full_name: formData.get('name'),
        username: formData.get('username'),
        phone: formData.get('phone'),
        country: formData.get('country'),
        city: formData.get('city')
    };

    try {
        // 1. Username benzersizlik kontrolü
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('username')
            .eq('username', userData.username)
            .single();

        if (existingUser) {
            throw new Error('Bu kullanıcı adı zaten kullanılıyor!');
        }

        // 2. Supabase Auth ile kayıt
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    full_name: userData.full_name,
                    username: userData.username
                }
            }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                throw new Error('Bu e-posta adresi zaten kayıtlı!');
            } else {
                throw new Error(authError.message);
            }
        }

        // 3. Users tablosuna profil bilgilerini ekle
        const { error: profileError } = await supabase
            .from('users')
            .insert([{
                email: userData.email,
                username: userData.username,
                full_name: userData.full_name,
                phone: userData.phone,
                country: userData.country,
                city: userData.city,
                created_at: new Date()
            }]);

        if (profileError) {
            console.error('Profil kayıt hatası:', profileError);
            showToast('Hesap oluşturuldu ancak profil bilgileri kaydedilemedi.', 'warning');
        } else {
            showToast('Hesabınız başarıyla oluşturuldu! E-posta adresinizi doğruladıktan sonra giriş yapabilirsiniz.', 'success');
        }

        e.target.reset();
        closeAllModals();

    } catch (error) {
        console.error('Kayıt hatası:', error);
        showToast(error.message || 'Kayıt işlemi başarısız.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Kullanıcı giriş işlemi
async function handleLogin(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş Yapılıyor...';
    submitBtn.disabled = true;
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const rememberMe = formData.get('rememberMe') === 'on';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('E-posta veya şifre hatalı!');
            } else if (error.message.includes('Email not confirmed')) {
                throw new Error('Lütfen e-posta adresinizi doğrulayın!');
            } else {
                throw new Error(error.message);
            }
        }

        currentUser = data.user;
        await loadUserProfile();
        updateAuthUI();
        
        // Beni hatırla özelliği
        if (rememberMe) {
            localStorage.setItem('youthive_remember_email', email);
        } else {
            localStorage.removeItem('youthive_remember_email');
        }
        
        showToast(`Hoş geldiniz, ${currentUser.profile?.full_name || currentUser.email}!`, 'success');
        closeAllModals();
        e.target.reset();
        
        // Upload sayfasındaysa sayfayı yenile (login-required içerik geri gelsin)
        if (window.location.pathname.includes('uploadarticle.html')) {
            setTimeout(() => window.location.reload(), 300);
        }

    } catch (error) {
        console.error('Giriş hatası:', error);
        showToast(error.message || 'Giriş yapılamadı.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Çıkış yapma
async function handleLogout() {
    if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Çıkış hatası:', error);
                showToast('Çıkış yapılamadı.', 'error');
                return;
            }
            
            currentUser = null;
            updateAuthUI();
            showToast('Çıkış yapıldı.', 'info');
            
            // Upload sayfasındaysa ana sayfaya yönlendir
            if (window.location.pathname.includes('uploadarticle.html')) {
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
            
        } catch (error) {
            console.error('Çıkış hatası:', error);
            showToast('Çıkış yapılamadı.', 'error');
        }
    }
}

// Modal işlevleri
function openModal(modalId) {
    try {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Önce tüm modalları kapat
            closeAllModals();
            
            // 100ms bekle, sonra yeni modalı aç
            setTimeout(() => {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
                
                // Focus first input
                const firstInput = modal.querySelector('input[type="text"], input[type="email"]');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 300);
                }
            }, 100);
        }
    } catch (error) {
        console.error('Modal açma hatası:', error);
    }
}

function closeAllModals() {
    document.querySelectorAll('.login-modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// Kullanıcı arayüzünü güncelle
function updateAuthUI() {
    const loginBtn = document.getElementById('loginButton');
    const signupBtn = document.getElementById('signupButton');
    const logoutBtn = document.getElementById('logoutButton');
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    
    if (currentUser) {
        // Giriş yapılmış durum
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (userProfile) userProfile.style.display = 'flex';
        
        // Kullanıcı bilgilerini göster
        if (userAvatar && currentUser.profile) {
            userAvatar.textContent = currentUser.profile.full_name.charAt(0).toUpperCase();
            userAvatar.title = currentUser.profile.full_name;
        }
        
        if (userName) {
            userName.textContent = currentUser.profile?.username || currentUser.email;
        }
    } else {
        // Çıkış yapılmış durum
        if (loginBtn) loginBtn.style.display = 'block';
        if (signupBtn) signupBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userProfile) userProfile.style.display = 'none';
    }
}

// Tema ayarları
function loadThemeSettings() {
    const savedTheme = localStorage.getItem('youthive_theme');
    const savedLanguage = localStorage.getItem('youthive_language');
    const rememberedEmail = localStorage.getItem('youthive_remember_email');
    
    // Tema uygula
    if (savedTheme === 'night') {
        enableNightMode();
    }
    
    // Dil ayarını uygula
    if (savedLanguage) {
        document.querySelectorAll('.language-selector button').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === savedLanguage);
        });
    }
    
    // Hatırlanan e-posta
    if (rememberedEmail) {
        const loginEmail = document.getElementById('loginEmail');
        const rememberMe = document.getElementById('rememberMe');
        if (loginEmail) loginEmail.value = rememberedEmail;
        if (rememberMe) rememberMe.checked = true;
    }
}

// Tema değiştirme
function toggleTheme() {
    document.body.style.transition = 'background-color 0.4s ease, color 0.4s ease';
    
    if (document.body.classList.contains('night-mode')) {
        disableNightMode();
    } else {
        enableNightMode();
    }
    
    // Animasyon bitince transition özelliğini kaldır
    setTimeout(() => {
        document.body.style.transition = '';
    }, 400);
}

function enableNightMode() {
    document.body.classList.add('night-mode');
    localStorage.setItem('youthive_theme', 'night');
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.title = 'Gündüz moduna geç';
    }
}

function disableNightMode() {
    document.body.classList.remove('night-mode');
    localStorage.setItem('youthive_theme', 'day');
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.title = 'Gece moduna geç';
    }
}

// Toast mesaj sistemi
function showToast(message, type = 'info', duration = 4000) {
    // Mevcut toast'ları temizle
    document.querySelectorAll('.toast').forEach(toast => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    });
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    // Mobil ve desktop için farklı pozisyonlama
    if (isMobile()) {
        toast.style.cssText = `
            position: fixed;
            left: 20px;
            right: 20px;
            bottom: 20px;
            z-index: 9999;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            transform: translateY(100px);
            transition: transform 0.3s ease;
            background: ${colors[type]};
        `;
    } else {
        toast.style.cssText = `
            position: fixed;
            top: 90px;
            right: 20px;
            z-index: 9999;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            font-size: 14px;
            max-width: 350px;
            min-width: 250px;
            display: flex;
            align-items: center;
            gap: 10px;
            background: ${colors[type]};
        `;
    }
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="${icons[type]}"></i>
                <span>${message}</span>
            </div>
            <button onclick="this.closest('.toast').remove()" 
                    style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; margin-left: 10px;">&times;</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animasyon
    setTimeout(() => {
        if (isMobile()) {
            toast.style.transform = 'translateY(0)';
        } else {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }
    }, 100);
    
    // Otomatik kapat
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('hiding');
            if (isMobile()) {
                toast.style.transform = 'translateY(100px)';
            } else {
                toast.style.transform = 'translateX(100%)';
                toast.style.opacity = '0';
            }
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// Kategori hoş geldiniz banner'ı
function showCategoryWelcome(name) {
    const msg = `${name} kategorisine hoş geldiniz!`;
    try { 
        showToast(msg, 'info'); 
    } catch (e) { 
        alert(msg); 
    }

    let banner = document.getElementById('categoryWelcome');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'categoryWelcome';
        banner.style.cssText = `
            margin: ${isMobile() ? '120' : '80'}px auto 0; 
            max-width: 1200px; 
            padding: 12px 16px; 
            background: #f0f4f8; 
            color: #3a4f66; 
            border: 1px solid #e2e8f0; 
            border-radius: 8px; 
            display: flex; 
            align-items: center; 
            gap: 10px;
            ${isMobile() ? 'margin-left: 15px; margin-right: 15px;' : ''}
        `;
        const header = document.querySelector('.fixed-header');
        if (header) {
            header.insertAdjacentElement('afterend', banner);
        } else {
            document.body.insertBefore(banner, document.body.firstChild);
        }
    }
    banner.innerHTML = `
        <i class="fas fa-folder-open"></i> 
        <strong>${name}</strong> kategorisine hoş geldiniz. 
        <button id="cwClose" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:18px;color:#64748b">&times;</button>
    `;
    const close = banner.querySelector('#cwClose');
    if (close) close.onclick = () => banner.remove();
    setTimeout(() => { 
        if (banner && banner.parentElement) banner.remove(); 
    }, 6000);
}

// Sabit konumlu kategori paneli (ayrı yerde gösterim)
function showCategoryPanel(name) {
    let panel = document.getElementById('categoryFixedPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'categoryFixedPanel';
        panel.style.cssText = `
            position: fixed; 
            ${isMobile() ? 'left: 15px; right: 15px; bottom: 15px;' : 'left: 20px; bottom: 20px; max-width: 300px;'} 
            background: #ffffff; 
            color: #3a4f66; 
            border: 1px solid #e2e8f0; 
            border-radius: 8px; 
            box-shadow: 0 8px 24px rgba(0,0,0,0.15); 
            padding: 12px 14px; 
            z-index: 10000;
        `;
        document.body.appendChild(panel);
    }
    const safe = (t) => { 
        const d = document.createElement('div'); 
        d.textContent = t || ''; 
        return d.innerHTML; 
    };
    panel.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <i class="fas fa-bookmark"></i>
            <strong>${safe(name)} Kategorisi</strong>
            <button id="cfpClose" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:16px;color:#64748b">&times;</button>
        </div>
        <div style="font-size:13px; color:#64748b;">${safe(name)} kategorisine hoş geldiniz.</div>
    `;
    const closeBtn = panel.querySelector('#cfpClose');
    if (closeBtn) closeBtn.onclick = () => panel.remove();
}
