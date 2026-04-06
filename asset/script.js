// =========================================
// 🚀 1. INITIALIZE SUPABASE
// =========================================
// REPLACE THESE WITH YOUR NEW PROJECT KEYS FROM THE SUPABASE DASHBOARD
const SUPABASE_URL = 'https://ueaiwswzgzvkncjpxrxe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlYWl3c3d6Z3p2a25janB4cnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzc3OTUsImV4cCI6MjA5MDgxMzc5NX0.CPDAZDwT80ft2w1GfpscK3Q7s0-a__x5mDEuG_kZKIE';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================
// 🛡️ SECURITY: XSS SANITIZER
// =========================================
function escapeHTML(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// =========================================
// 🚀 2. AUTHENTICATION INTERCEPTOR
// =========================================
async function requireLogin(targetUrl) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = targetUrl;
    } else {
        window.location.href = "login/index.html";
    }
}

// =========================================
// 🚀 3. LOAD DATA ON PAGE LOAD
// =========================================
document.addEventListener("DOMContentLoaded", () => {
    setupSearch();
    fetchItems();
    fetchVendors();
    fetchReviews();
    fetchBlogs();
    setupExpandableFooter(); 
    checkGlobalBadges();
    fetchAdPopup(); // 🚀 Added Ad Fetcher
});

// =========================================
// 🚀 4. THE SMART BADGE CHECKER
// =========================================
async function checkGlobalBadges() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;
    const uid = session.user.id;

    try {
        // 1. Check Unread Messages in the 'chats' table
        const { data: chats } = await supabaseClient.from('chats')
            .select('customer_id, vendor_id, unread_by_customer, unread_by_vendor')
            .or(`customer_id.eq.${uid},vendor_id.eq.${uid}`);

        if (chats) {
            const hasUnreadMsg = chats.some(c => 
                (c.customer_id === uid && c.unread_by_customer === true) || 
                (c.vendor_id === uid && c.unread_by_vendor === true)
            );
            if (hasUnreadMsg) {
                document.querySelectorAll('.msg-dot').forEach(dot => dot.style.display = 'block');
            }
        }

        // 2. Check Unread Notifications (Both Private & Global Broadcasts)
        const lastClearedTime = new Date(localStorage.getItem('notifs_cleared_time') || '2000-01-01');
        
        const { data: notifs } = await supabaseClient.from('notifications')
            .select('user_id, is_read, created_at')
            .or(`user_id.eq.${uid},user_id.is.null`);
            
        if (notifs) {
            const hasUnreadNotif = notifs.some(n => {
                const notifTime = new Date(n.created_at);
                // It is unread if it was created after the last cleared time AND is not explicitly marked as read
                return (notifTime > lastClearedTime) && (n.is_read !== true);
            });

            if (hasUnreadNotif) {
                document.querySelectorAll('.notify-dot').forEach(dot => dot.style.display = 'block');
            }
        }
        
    } catch (e) { console.error("Badge check failed:", e); }
}

function setupSearch() {
    const searchInput = document.getElementById('main-search');
    const searchIcon = document.getElementById('search-btn-icon');

    if (!searchInput || !searchIcon) return;

    function executeSearch() {
        const query = searchInput.value.trim();
        if (query) window.location.href = `search/index.html?q=${encodeURIComponent(query)}`;
    }

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') executeSearch();
    });
    
    searchIcon.addEventListener('click', executeSearch);
}

// =========================================
// --- FETCH ITEMS (Products Table) ---
// =========================================
async function fetchItems() {
    const grid = document.getElementById('product-grid');
    if (!grid) return; 
    try {
        const { data: products, error } = await supabaseClient
            .from('products')
            .select('id, name, price, image_urls, category, is_pinned')
            .eq('status', 'Active')
            .order('is_pinned', { ascending: false }) 
            .limit(100);

        if (error) throw error;
        grid.innerHTML = ""; 

        if (products.length === 0) {
            grid.innerHTML = `<p style="grid-column: span 2; text-align: center; color: #888;">No items posted yet.</p>`;
            return;
        }

        const pinnedItems = products.filter(p => p.is_pinned === true);
        let unpinnedItems = products.filter(p => p.is_pinned !== true);
        
        unpinnedItems = shuffleArray(unpinnedItems);
        const finalItemsToDisplay = [...pinnedItems, ...unpinnedItems].slice(0, 50);

        finalItemsToDisplay.forEach(p => {
            const imgUrl = (p.image_urls && p.image_urls.length > 0) ? p.image_urls[0] : 'https://via.placeholder.com/300?text=No+Image';
            const formattedPrice = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p.price);
            
            const pinBadge = p.is_pinned ? `<div style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 3px 8px; border-radius: 8px; font-size: 10px; font-weight: 800; backdrop-filter: blur(4px);">Featured</div>` : '';

            grid.innerHTML += `
                <div class="card" style="position: relative;" onclick="window.location.href='product/index.html?id=${p.id}'">
                    ${pinBadge}
                    <img src="${imgUrl}" class="card-img" onerror="this.src='https://via.placeholder.com/300'">
                    <div class="card-price">${formattedPrice}</div>
                    <div style="width: 100%; overflow: hidden;">
                        <div class="card-title">${p.name}</div>
                        <div class="card-desc">${p.category}</div>
                    </div>
                </div>
            `;
        });
    } catch (error) { grid.innerHTML = `<p style="grid-column: span 2; text-align: center; color: red;">Failed to load items.</p>`; }
}


// =========================================
// --- FETCH VENDORS (With Pinning) ---
// =========================================
async function fetchVendors() {
    const grid = document.getElementById('vendor-grid');
    if (!grid) return;
    try {
        const { data: vendors, error } = await supabaseClient
            .from('vendors')
            .select('id, vendor_code, business_name, description, logo_url, subscription_plan, is_pinned')
            .eq('is_active', true)
            .order('is_pinned', { ascending: false }) // Pinned come first
            .limit(100);

        if (error) throw error;
        grid.innerHTML = "";

        if (vendors.length === 0) {
            grid.innerHTML = `<p style="grid-column: span 2; text-align: center; color: #888;">No vendors registered yet.</p>`;
            return;
        }

        // 🚀 Separate and shuffle logic
        const pinnedVendors = vendors.filter(v => v.is_pinned === true);
        let unpinnedVendors = vendors.filter(v => v.is_pinned !== true);
        unpinnedVendors = shuffleArray(unpinnedVendors);
        
        const finalVendors = [...pinnedVendors, ...unpinnedVendors].slice(0, 30);

        finalVendors.forEach(v => {
            const logo = v.logo_url || "https://via.placeholder.com/100";
            const nameTxt = v.business_name ? v.business_name : 'Unknown';
            const descTxt = v.description ? v.description.substring(0, 25) + '...' : 'Verified Seller';

            let badgeColor = "#38bdf8"; 
            if (v.subscription_plan === "Influencer") badgeColor = "#fbbf24"; 
            if (v.subscription_plan === "Icon") badgeColor = "#1e293b"; 
            
            // 🚀 The Pin Badge
            const pinBadge = v.is_pinned ? `<div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: #fbbf24; padding: 3px 8px; border-radius: 8px; font-size: 10px; font-weight: 800; backdrop-filter: blur(4px); z-index: 10;"><i class="fas fa-thumbtack"></i> Featured</div>` : '';

            grid.innerHTML += `
                <div class="card" style="text-align: center; display: flex; flex-direction: column; align-items: center; height: 100%; position: relative;" onclick="window.location.href='vendors/profile/?id=${v.id}'">
                    ${pinBadge}
                    <img src="${logo}" style="width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 10px; flex-shrink: 0; object-fit: cover;" onerror="this.src='https://via.placeholder.com/100'">
                    <div style="width: 100%; overflow: hidden;">
                        <div style="font-size: 13px; font-weight: 800; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${escapeHTML(nameTxt)} <i class="fas fa-check-circle" style="color: ${badgeColor};"></i>
                        </div>
                        <div style="margin-top: 5px; font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(descTxt)}</div>
                    </div>
                </div>
            `;
        });
    } catch (error) { grid.innerHTML = `<p style="grid-column: span 2; text-align: center; color: red;">Failed to load vendors.</p>`; }
}

// =========================================
// --- FETCH AD POPUP ---
// =========================================
async function fetchAdPopup() {
    try {
        const { data, error } = await supabaseClient.from('ads').select('*').eq('is_active', true);
        if (error || !data || data.length === 0) return;

        // Pick a random ad from the active ones
        const randomAd = data[Math.floor(Math.random() * data.length)];

        document.getElementById('ad-title').innerText = randomAd.title;
        document.getElementById('ad-content').innerText = randomAd.content;
        
        const adBtn = document.getElementById('ad-btn');
        if(randomAd.button_text) adBtn.innerText = randomAd.button_text;
        adBtn.href = randomAd.button_link || "#";

        const adImg = document.getElementById('ad-image');
        if (randomAd.image_url) {
            adImg.src = randomAd.image_url;
            adImg.style.display = 'block';
        } else {
            adImg.style.display = 'none';
        }

        // Show popup 1.5 seconds after page loads so it feels natural
        setTimeout(() => {
            document.getElementById('ad-popup').style.display = 'flex';
        }, 1500);
        
    } catch (err) {
        console.error("Ad fetch error:", err);
    }
}

// =========================================
// --- FETCH REVIEWS ---
// =========================================
async function fetchReviews() {
    const slider = document.getElementById('reviews-slider');
    if(!slider) return;
    try {
        const { data, error } = await supabaseClient
            .from('reviews')
            .select('rating, review_text, legacy_name, legacy_avatar, profiles(full_name, avatar_url)')
            .eq('status', 'approved')
            .limit(20);

        if (error) throw error;
        slider.innerHTML = "";

        if (data.length === 0) {
            slider.innerHTML = "<p style='padding:20px; color:#94a3b8; font-size:13px;'>No reviews yet.</p>";
            return;
        }

        const randomReviews = shuffleArray(data).slice(0, 5);

        randomReviews.forEach(r => {
            const name = r.profiles?.full_name || r.legacy_name || "Student";
            const avatar = r.profiles?.avatar_url || r.legacy_avatar || "img/person.png";
            
            slider.innerHTML += `
                <div class="review-card">
                    <div class="rev-header">
                        <img src="${avatar}" class="rev-img" onerror="this.src='../img/person.png'">
                        <div>
                            <div class="rev-name">${name} <i class="fas fa-check-circle" style="color: #10b981; font-size:10px;"></i></div>
                            <div class="rev-stars">${'<i class="fas fa-star"></i>'.repeat(r.rating)}</div>
                        </div>
                    </div>
                    <div class="rev-text">"${r.review_text}"</div>
                </div>
            `;
        });

        startReviewSlider();
    } catch (error) { slider.innerHTML = "<p style='padding:20px; color:red;'>Failed to load reviews.</p>"; }
}

function startReviewSlider() {
    const slider = document.getElementById('reviews-slider');
    if(!slider) return;
    
    setInterval(() => {
        const maxScroll = slider.scrollWidth - slider.clientWidth;
        if (slider.scrollLeft >= maxScroll - 10) {
            slider.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            slider.scrollBy({ left: 275, behavior: 'smooth' });
        }
    }, 2000); 
}

// =========================================
// --- FETCH BLOGS (MINI-CARDS ON HOMEPAGE) ---
// =========================================
async function fetchBlogs() {
    const list = document.getElementById('blog-list');
    if (!list) return;
    try {
        const { data, error } = await supabaseClient
            .from('blogs')
            .select('id, title, snippet, category, image_url, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;
        list.innerHTML = "";

        if (data.length === 0) {
            list.innerHTML = "<p style='text-align:center; color:#94a3b8; font-size:13px;'>No news updates yet.</p>";
            return;
        }

        data.forEach(b => {
            const imgUrl = b.image_url || 'https://via.placeholder.com/100';
            const niceSlug = b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '--' + b.id;
            const postDate = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            list.innerHTML += `
                <div class="blog-card" onclick="window.location.href='blog-content/index.html?post=${niceSlug}'">
                    <img src="${imgUrl}" class="blog-img" onerror="this.src='https://via.placeholder.com/100'">
                    <div class="blog-info">
                        <div class="blog-cat-row">
                            <div class="blog-cat">${b.category || 'News'}</div>
                            <div class="blog-date">${postDate}</div>
                        </div>
                        <div class="blog-title">${b.title}</div>
                        <div class="blog-desc">${b.snippet}</div>
                    </div>
                </div>
            `;
        });
    } catch (error) { list.innerHTML = "<p style='text-align:center; color:red;'>Failed to load news.</p>"; }
}

// =========================================
// 🚀 UI: EXPANDABLE FOOTER
// =========================================
function setupExpandableFooter() {
    const footer = document.getElementById('main-app-footer');
    const toggleBtn = document.getElementById('footer-expand-btn');
    const arrowIcon = document.getElementById('footer-arrow-icon');

    if(!footer || !toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        if(footer.classList.contains('collapsed')) {
            footer.classList.remove('collapsed');
            footer.classList.add('expanded');
            arrowIcon.classList.remove('fa-chevron-down');
            arrowIcon.classList.add('fa-chevron-up'); 
        } else {
            footer.classList.remove('expanded');
            footer.classList.add('collapsed');
            arrowIcon.classList.remove('fa-chevron-up');
            arrowIcon.classList.add('fa-chevron-down'); 
        }
    });
}

// =========================================
// 🚀 PWA INSTALLATION LOGIC
// =========================================
let deferredPrompt;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// 🚀 RE-ENABLED: This registers the safe, clean sw.js
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Make sure this path points exactly to your sw.js file in your root folder
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker Registered Successfully!', reg))
            .catch(err => console.log('Service Worker Registration Failed', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

window.downloadApp = async function() {
    if (isIOS) {
        const iosPopup = document.getElementById('ios-install-popup');
        if (iosPopup) {
            iosPopup.style.display = 'flex';
        } else {
            alert("To install AFIT Market on iOS:\n\n1. Tap the 'Share' icon at the bottom of Safari.\n2. Scroll down and tap 'Add to Home Screen'.");
        }
    } else if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('AFIT Market PWA Installed!');
        }
        deferredPrompt = null;
    } else {
        alert("The app is already installed on your device or your current browser doesn't support automatic installation.");
    }
};

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

window.downloadApp = async function() {
    if (isIOS) {
        const iosPopup = document.getElementById('ios-install-popup');
        if (iosPopup) {
            iosPopup.style.display = 'flex';
        } else {
            alert("To install AFIT Market on iOS:\n\n1. Tap the 'Share' icon at the bottom of Safari.\n2. Scroll down and tap 'Add to Home Screen'.");
        }
    } else if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('AFIT Market PWA Installed!');
        }
        deferredPrompt = null;
    } else {
        alert("The app is already installed on your device or your current browser doesn't support automatic installation.");
    }
};

// =========================================
// 🌙 GLOBAL DARK MODE LOGIC
// =========================================

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

document.addEventListener("DOMContentLoaded", () => {
    const headerTop = document.querySelector('.header-top');
    
    if (headerTop) {
        const themeBtn = document.createElement('button');
        themeBtn.className = "theme-toggle-btn";
        
        const isDark = document.body.classList.contains('dark-mode');
        themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        themeBtn.style.cssText = 'background:none; border:none; font-size:22px; color:var(--brand-color); cursor:pointer; margin-left: auto; margin-right: 15px; transition: 0.2s;';
        
        themeBtn.onclick = function() {
            const darkModeActive = document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', darkModeActive ? 'dark' : 'light');
            themeBtn.innerHTML = darkModeActive ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        };
        
        const notifyIcon = document.querySelector('.notify-icon-container');
        if (notifyIcon) {
            headerTop.insertBefore(themeBtn, notifyIcon);
        } else {
            headerTop.appendChild(themeBtn);
        }
    }
});
// =========================================
// 🚀 EMERGENCY SERVICE WORKER KILL SWITCH
// =========================================
// This forcefully unregisters the buggy Service Worker that blocks Supabase
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
            console.log('Old Service Worker forcefully unregistered!');
        }
    });
}