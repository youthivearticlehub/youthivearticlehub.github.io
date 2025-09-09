// config.js 
const SUPABASE_URL = 'https://dnsgcmjeajyyszmmjzyi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuc2djbWplYWp5eXN6bW1qenlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDA0NDMsImV4cCI6MjA3MjQxNjQ0M30.fU01mfeVw1bIwEj5OtX8-_MD27Mv3afvtGlLifzwzpQ';

// Supabase client oluştur - PERSIST SESSION özelliğini etkinleştir
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'youthive-auth'
  }
});

// Global değişkenler
let currentUser = null;

// Storage bucket adı
const STORAGE_BUCKET = 'article-pdfs';

// Uygulama ayarları
const APP_CONFIG = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['application/pdf'],
    defaultPageSize: 20,
    autoRedirectDelay: 5000 // 5 saniye
};

console.log('Supabase bağlantısı kuruldu:', SUPABASE_URL);