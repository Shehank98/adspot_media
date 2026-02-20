/**
 * AdSpot - Main Application JavaScript
 * Landing page functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initMobileMenu();
    initAnimations();
    initContactForm();
    initNewspaperCarousel();
});

/**
 * Navigation
 */
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    
    // Scroll effect
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offset = 80; // Navbar height
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                document.querySelector('.mobile-menu')?.classList.remove('active');
                document.querySelector('.mobile-menu-btn')?.classList.remove('active');
            }
        });
    });
}

/**
 * Mobile Menu
 */
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
        });
        
        // Close menu when clicking a link
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                menuBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
}

/**
 * Scroll Animations
 */
function initAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements with animation classes
    document.querySelectorAll('.service-card, .step, .pub-item, .contact-form-wrapper').forEach(el => {
        el.classList.add('animate-on-scroll');
        observer.observe(el);
    });
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        .animate-on-scroll {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .animate-on-scroll.visible {
            opacity: 1;
            transform: translateY(0);
        }
        .service-card:nth-child(2) { transition-delay: 0.1s; }
        .service-card:nth-child(3) { transition-delay: 0.2s; }
        .step:nth-child(3) { transition-delay: 0.1s; }
        .step:nth-child(5) { transition-delay: 0.2s; }
        .step:nth-child(7) { transition-delay: 0.3s; }
        .navbar.scrolled {
            background: rgba(255, 255, 255, 0.98);
            box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Contact Form
 */
function initContactForm() {
    const form = document.getElementById('contactForm');

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const name = document.getElementById('contactName').value.trim();
            const email = document.getElementById('contactEmail').value.trim();
            const message = document.getElementById('contactMessage').value.trim();

            // Validate inputs
            if (!name || !email || !message) {
                showNotification('Please fill in all fields.', 'warning');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            try {
                // Use EmailService to send contact message to adspot77@gmail.com
                if (typeof EmailService !== 'undefined' && EmailService.isConfigured && EmailService.isConfigured()) {
                    console.log('Sending contact form via EmailService...');
                    const result = await EmailService.sendContactMessage(name, email, message);
                    console.log('Contact form email result:', result);
                } else {
                    console.warn('EmailService not configured, storing message locally');
                    // Fallback: Store in localStorage if EmailService not available
                    const messages = JSON.parse(localStorage.getItem('adspot_contact_messages') || '[]');
                    messages.push({
                        id: Date.now(),
                        name: name,
                        email: email,
                        message: message,
                        date: new Date().toISOString(),
                        read: false
                    });
                    localStorage.setItem('adspot_contact_messages', JSON.stringify(messages));
                }

                // Show success message
                showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
                form.reset();
            } catch (error) {
                console.error('Contact form error:', error);
                showNotification('Failed to send message. Please try again.', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

/**
 * Notification System
 */
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Add styles if not already added
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 90px;
                right: 20px;
                padding: 1rem 1.5rem;
                background: #1e293b;
                color: white;
                border-radius: 0.75rem;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 1rem;
                z-index: 2000;
                animation: slideIn 0.3s ease;
                max-width: 400px;
            }
            .notification-success { background: #10b981; }
            .notification-error { background: #ef4444; }
            .notification-warning { background: #f59e0b; }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.25rem;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            .notification-close:hover { opacity: 1; }
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Export for use in other files
window.showNotification = showNotification;

/**
 * FAQ Toggle Function
 */
function toggleFAQ(button) {
    const faqItem = button.closest('.faq-item');
    const allFaqItems = document.querySelectorAll('.faq-item');

    // Close all other FAQs
    allFaqItems.forEach(item => {
        if (item !== faqItem) {
            item.classList.remove('active');
        }
    });

    // Toggle current FAQ
    faqItem.classList.toggle('active');
}

// Export for use in HTML onclick
window.toggleFAQ = toggleFAQ;

/**
 * Language Translation System
 */
let currentLanguage = localStorage.getItem('adspot_language') || 'en';

function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'si' : 'en';
    localStorage.setItem('adspot_language', currentLanguage);
    updateLanguage();
}

function updateLanguage() {
    const langCode = currentLanguage;

    // Update toggle button
    const langBtn = document.getElementById('currentLang');
    if (langBtn) {
        langBtn.textContent = langCode === 'en' ? 'English' : 'සිංහල';
    }

    // Add/remove language class on body for font switching
    document.body.classList.remove('lang-en', 'lang-si');
    document.body.classList.add(`lang-${langCode}`);

    // Update HTML lang attribute
    document.documentElement.lang = langCode;

    // Update all elements with data-translate attribute
    if (typeof translations !== 'undefined') {
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = translations[langCode][key];

            // Only update if translation exists and is not empty
            if (translation && translation.trim() !== '') {
                // Handle different element types
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });

        console.log(`✅ Language updated to: ${langCode === 'en' ? 'English' : 'Sinhala'}`);
    } else {
        console.warn('⚠️ Translations not loaded yet');
    }
}

// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for translations.js to load
    setTimeout(() => {
        updateLanguage();
    }, 100);
});

// Export for use in HTML onclick
window.toggleLanguage = toggleLanguage;

/**
 * Newspaper Carousel
 * Auto-scrolling carousel showing newspaper logos
 */
async function initNewspaperCarousel() {
    const carouselTrack = document.getElementById('newspaperCarousel');
    if (!carouselTrack) return;

    try {
        // Try to load logos from Firebase
        let logos = [];

        if (typeof loadNewspaperLogos === 'function') {
            console.log('Loading newspaper logos from Firebase...');
            logos = await loadNewspaperLogos();
        } else {
            console.log('Firebase not configured, using default logos');
            logos = getDefaultLogos();
        }

        // If no logos loaded, use defaults
        if (logos.length === 0) {
            logos = getDefaultLogos();
        }

        // Duplicate logos for seamless infinite scroll
        const duplicatedLogos = [...logos, ...logos];

        // Populate carousel
        duplicatedLogos.forEach(paper => {
            const logoItem = document.createElement('div');
            logoItem.className = 'newspaper-logo-item';

            if (paper.logo) {
                // If logo URL exists, show image
                logoItem.innerHTML = `<img src="${paper.logo}" alt="${paper.name}" loading="lazy">`;
            } else {
                // If no logo, show text placeholder
                logoItem.innerHTML = `<div class="logo-placeholder">${paper.name}</div>`;
            }

            carouselTrack.appendChild(logoItem);
        });

        console.log('✅ Newspaper carousel initialized with', logos.length, 'newspapers');
    } catch (error) {
        console.error('❌ Error initializing carousel:', error);
        // Fallback to defaults on error
        const logos = getDefaultLogos();
        const duplicatedLogos = [...logos, ...logos];

        duplicatedLogos.forEach(paper => {
            const logoItem = document.createElement('div');
            logoItem.className = 'newspaper-logo-item';
            logoItem.innerHTML = `<div class="logo-placeholder">${paper.name}</div>`;
            carouselTrack.appendChild(logoItem);
        });
    }
}

/**
 * Get default newspaper logos (fallback)
 */
function getDefaultLogos() {
    return [
        { name: 'Daily News', language: 'english' },
        { name: 'Sunday Observer', language: 'english' },
        { name: 'Dinamina', language: 'sinhala' },
        { name: 'Silumina', language: 'sinhala' },
        { name: 'Lankadeepa', language: 'sinhala' },
        { name: 'Divaina', language: 'sinhala' },
        { name: 'Mawbima', language: 'sinhala' },
        { name: 'Thinakaran', language: 'tamil' },
        { name: 'Virakesari', language: 'tamil' }
    ];
}
