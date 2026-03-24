(function () {
    'use strict';

    // js/utils/animation.js
    const initPerformanceMonitor = (fpsNode) => {
        let lastTime = performance.now();
        let frames = 0;
        const isMobile = window.innerWidth <= 768;
        let enabled = true;
        
        const monitor = (time) => {
            frames++;
            if (time >= lastTime + 1000) {
                if (isMobile && frames < 55) enabled = false;
                else if (frames > 58) enabled = true;
                frames = 0;
                lastTime = time;
            }
            requestAnimationFrame(monitor);
        };
        requestAnimationFrame(monitor);
        
        // Returns a live closure lookup
        return () => enabled;
    };

    const springPhysics = {
        bounce: 'spring(1, 400, 30, 0)',
        gentle: 'spring(1, 300, 20, 0)',
        snap: 'spring(1, 350, 25, 0)'
    };

    // js/utils/storage.js
    const storage = {
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                return false;
            }
        },
        get: (key, fallback = null) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : fallback;
            } catch (e) {
                return fallback;
            }
        },
        remove: (key) => localStorage.removeItem(key)
    };

    // js/utils/dom.js
    const $ = (selector, context = document) => context.querySelector(selector);
    const $$ = (selector, context = document) => context.querySelectorAll(selector);

    // js/core/cart.js

    class ShoppingCart {
        constructor() {
            this.items = storage.get('craftedloop_cart', []);
            
            // Modal references
            this.modal = $('#cartModal');
            this.cartItemsContainer = $('#cartItems');
            this.cartEmpty = $('#cartEmpty');
            this.cartTotalEl = $('#cartTotal');
            
            this.bindEvents();
            this.renderCart();
            this.updateBadge();
        }

        bindEvents() {
            // Add to cart buttons
            $$('.btn-add-to-cart').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const target = e.currentTarget;
                    const product = target.dataset.product;
                    const price = parseFloat(target.dataset.price);
                    
                    this.addItem({ id: Date.now().toString(), name: product, price: price });
                    
                    // Animate button bounce
                    if (typeof anime !== 'undefined') {
                        anime({
                            targets: target,
                            scale: [0.97, 1],
                            duration: 400,
                            easing: springPhysics.snap
                        });
                    }
                    
                    // Show toast notification instead of redirecting
                    this.showToast(`${product} added to cart!`);
                });
            });

            // Cart button - navigate to cart page
            $('#cartBtn')?.addEventListener('click', () => {
                window.location.href = 'public/cart.html';
            });

            // Checkout logic
            $('#checkoutBtn')?.addEventListener('click', () => this.checkout());
            
            // Remove item delegation inside modal
            this.cartItemsContainer?.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.cart-item-remove');
                if (removeBtn) {
                    const id = removeBtn.dataset.id;
                    this.removeItem(id);
                }
            });
        }

        openModal() {
            if (this.modal) {
                this.modal.removeAttribute('hidden');
                // Slight delay allows display:flex to apply before CSS transition fires
                setTimeout(() => this.modal.classList.add('is-open'), 10);
                this.renderCart(); // make sure it's up to date
            }
        }

        closeModal() {
            if (this.modal) {
                this.modal.classList.remove('is-open');
                // Wait for transition to finish before hiding completely
                setTimeout(() => this.modal.setAttribute('hidden', ''), 400);
            }
        }

        addItem(item) {
            this.items.push(item);
            this.saveAndRender();
        }

        removeItem(id) {
            this.items = this.items.filter(item => item.id !== id);
            this.saveAndRender();
        }

        saveAndRender() {
            storage.set('craftedloop_cart', this.items);
            this.updateBadge();
            this.renderCart();
        }

        updateBadge() {
            const badge = $('.cart-count');
            if (badge) {
                badge.textContent = this.items.length;
                if (typeof anime !== 'undefined' && this.items.length > 0) {
                    anime({
                        targets: badge,
                        scale: [1.3, 1],
                        duration: 400,
                        easing: springPhysics.bounce
                    });
                }
            }
        }

        renderCart() {
            if (!this.cartItemsContainer || !this.cartEmpty || !this.cartTotalEl) return;
            
            // Clean out invalid items that might have been saved in an older format
            this.items = this.items.filter(item => item && item.id);
            
            this.cartItemsContainer.innerHTML = '';
            let total = 0;
            
            if (this.items.length === 0) {
                this.cartEmpty.style.display = 'block';
                this.cartItemsContainer.style.display = 'none';
            } else {
                this.cartEmpty.style.display = 'none';
                this.cartItemsContainer.style.display = 'flex';
                
                this.items.forEach(item => {
                    const price = Number(item.price) || 0;
                    const name = item.name || item.product || 'Item';
                    
                    total += price;
                    const div = document.createElement('div');
                    div.className = 'cart-item';
                    div.innerHTML = `
                    <div class="cart-item-info">
                        <span class="cart-item-title">${name}</span>
                        <span class="cart-item-price">₹${price.toLocaleString()}</span>
                    </div>
                    <button class="cart-item-remove" data-id="${item.id}" aria-label="Remove item">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                    this.cartItemsContainer.appendChild(div);
                });
            }
            
            this.cartTotalEl.textContent = `₹${total.toLocaleString()}`;
        }
        
        checkout() {
            if (this.items.length === 0) return;
            
            let message = "Hi SutraKala, I would like to order the following items:%0A%0A";
            let total = 0;
            
            this.items.forEach((item, index) => {
                const price = Number(item.price) || 0;
                const name = item.name || item.product || 'Item';
                message += `${index + 1}. ${name} - ₹${price.toLocaleString()}%0A`;
                total += price;
            });
            
            message += `%0A*Total: ₹${total.toLocaleString()}*`;
            
            // Open WhatsApp chat in a new tab
            window.open(`https://wa.me/919103329604?text=${message}`, '_blank');
            
            // Clear cart after checkout attempt
            this.items = [];
            this.saveAndRender();
            this.closeModal();
        }
        
        showToast(message) {
            const toast = $('#toast');
            const toastMessage = $('#toastMessage');
            
            if (!toast || !toastMessage) return;
            
            toastMessage.textContent = message;
            toast.hidden = false;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    toast.hidden = true;
                }, 300);
            }, 3000);
        }
    }

    // js/core/navigation.js

    class Navigation {
        constructor() {
            this.menuOpen = false;
            this.bindMobileMenu();
            this.bindSmoothScroll();
            this.bindOutsideClose();
        }

        bindMobileMenu() {
            const toggle = $('.mobile-menu-toggle');
            const menu   = $('.mobile-menu');
            const icon   = toggle?.querySelector('i');

            if (!toggle || !menu) return;

            toggle.addEventListener('click', () => {
                this.menuOpen = !this.menuOpen;
                menu.classList.toggle('active', this.menuOpen);
                toggle.setAttribute('aria-expanded', String(this.menuOpen));

                // Swap hamburger ↔ X icon
                if (icon) {
                    icon.classList.toggle('fa-bars', !this.menuOpen);
                    icon.classList.toggle('fa-times',  this.menuOpen);
                }
            });

            // Auto-close when any mobile nav link is clicked
            $$('.mobile-nav-link').forEach(link => {
                link.addEventListener('click', () => this.closeMenu(toggle, menu, icon));
            });
        }

        closeMenu(toggle, menu, icon) {
            this.menuOpen = false;
            menu.classList.remove('active');
            toggle?.setAttribute('aria-expanded', 'false');
            if (icon) {
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            }
        }

        bindOutsideClose() {
            document.addEventListener('click', (e) => {
                const toggle = $('.mobile-menu-toggle');
                const menu   = $('.mobile-menu');
                const icon   = toggle?.querySelector('i');
                if (this.menuOpen && !menu?.contains(e.target) && !toggle?.contains(e.target)) {
                    this.closeMenu(toggle, menu, icon);
                }
            });
        }

        bindSmoothScroll() {
            $$('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
        }
    }

    // js/core/forms.js

    class FormValidator {
        constructor() {
            this.bindValidation();
        }

        bindValidation() {
            $$('.contact-form input, .contact-form textarea').forEach(input => {
                input.addEventListener('invalid', (e) => {
                    e.preventDefault();
                    this.shake(input);
                });
            });
        }

        shake(el) {
            if (typeof anime !== 'undefined') {
                anime({
                    targets: el,
                    translateX: [
                        { value: -5, duration: 50 },
                        { value: 5, duration: 50 },
                        { value: -5, duration: 50 },
                        { value: 0, duration: 50 }
                    ],
                    borderColor: '#E5A3A3',
                    easing: 'easeInOutSine'
                });
            }
        }
    }

    // js/features/product-hover.js

    class ProductHoverEngine {
        constructor(canAnimate) {
            this.canAnimate = canAnimate;
            this.bindTilt();
        }

        bindTilt() {
            $$('.product-card').forEach(card => {
                card.addEventListener('mousemove', (e) => {
                    // Instantly block 3D DOM locks if FPS controller flag fails or executing mobile
                    if (window.innerWidth <= 768 || !this.canAnimate()) return;
                    
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    
                    if (typeof anime !== 'undefined') {
                        anime({
                            targets: card,
                            rotateX: ((y - centerY) / centerY) * -3,
                            rotateY: ((x - centerX) / centerX) * 3,
                            scale: 1.02,
                            duration: 100,
                            easing: 'linear'
                        });
                    }
                });

                card.addEventListener('mouseleave', () => {
                    if (typeof anime !== 'undefined') {
                        anime({
                            targets: card,
                            rotateX: 0,
                            rotateY: 0,
                            scale: 1,
                            duration: 600,
                            easing: springPhysics.gentle
                        });
                    }
                });
            });
        }
    }

    // js/features/scroll-animations.js

    class ScrollAnimations {
        constructor(canAnimate) {
            this.canAnimate = canAnimate;
            this.initObserver();
        }

        /**
         * Initializes Hardware-accelerated IntersectionObserver to block DOM reflows until elements hit user view bounds natively decoupled from continuous JS arrays.
         */
        initObserver() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (this.canAnimate() && typeof anime !== 'undefined') {
                            anime({
                                targets: entry.target,
                                translateY: [30, 0],
                                opacity: [0, 1],
                                duration: 800,
                                easing: 'easeOutQuart'
                            });
                        } else {
                            // Instant fallback if animation drops out
                            entry.target.style.opacity = 1;
                            entry.target.style.transform = 'translateY(0)';
                        }
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });

            // Bind cleanly to DOM
            $$('.reveal-on-scroll').forEach(el => observer.observe(el));
        }
    }

    // js/firebase-init.js
    // Firebase initialization for SutraKala
    // Includes Auth, Firestore, and Performance Monitoring

    /**
     * Load environment variables from window (injected via build process)
     * For static sites, we'll use a config object that can be set before this script loads
     */
    const getEnvVar = (key, defaultValue = '') => {
      // Check window.ENV object (can be set in HTML or build process)
      if (window.ENV && window.ENV[key]) {
        return window.ENV[key];
      }
      // Fallback to default
      return defaultValue;
    };

    // Firebase configuration - uses environment variables or defaults
    const firebaseConfig = {
      apiKey: getEnvVar('FIREBASE_API_KEY', 'AIzaSyBvqX7VqXvZ8Z6YqYvZ8Z6YqYvZ8Z6YqYvZ'),
      authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN', 'sutrakala-aa44b.firebaseapp.com'),
      projectId: getEnvVar('FIREBASE_PROJECT_ID', 'sutrakala-aa44b'),
      storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET', 'sutrakala-aa44b.appspot.com'),
      messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID', '123456789012'),
      appId: getEnvVar('FIREBASE_APP_ID', '1:123456789012:web:abcdef1234567890abcdef'),
      measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID', 'G-XXXXXXXXXX')
    };

    // Detect if we're in production
    const isProduction = window.location.hostname !== 'localhost' && 
                         window.location.hostname !== '127.0.0.1' &&
                         !window.location.hostname.includes('preview');

    let app = null;
    let auth = null;
    let db = null;
    let perf = null;

    /**
     * Initialize Firebase App, Auth, Firestore, and Performance Monitoring
     * @returns {Promise<Object>} Firebase services (app, auth, db, perf)
     */
    async function initFirebase() {
      // Prevent double initialization
      if (app && auth && db) {
        return { app, auth, db, perf };
      }

      try {
        // Import Firebase modules from CDN
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

        // Initialize Firebase App
        app = initializeApp(firebaseConfig);
        
        // Initialize Auth
        auth = getAuth(app);
        
        // Initialize Firestore
        db = getFirestore(app);
        
        // Initialize Performance Monitoring (production only)
        if (isProduction) {
          try {
            const { getPerformance } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-performance.js');
            perf = getPerformance(app);
          } catch (perfError) {
          }
        } else {
        }
        
        return { app, auth, db, perf };
      } catch (error) {
        throw error;
      }
    }

    /**
     * Create a custom trace for performance monitoring
     * @param {string} traceName - Name of the trace
     * @returns {Object|null} Trace object with start() and stop() methods
     */
    function createTrace(traceName) {
      if (!perf || !isProduction) {
        return {
          start: () => {},
          stop: () => {},
          putAttribute: () => {},
          putMetric: () => {},
          incrementMetric: () => {}
        };
      }

      try {
        return perf.trace(traceName);
      } catch (error) {
        return null;
      }
    }

    /**
     * Track page load performance
     */
    function trackPageLoad() {
      if (!isProduction) return;

      const pageName = document.title.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      const trace = createTrace(`page_load_${pageName}`);
      
      if (trace) {
        trace.start();
        
        // Stop trace when page is fully loaded
        window.addEventListener('load', () => {
          trace.putMetric('dom_content_loaded', performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart);
          trace.putMetric('page_load_time', performance.timing.loadEventEnd - performance.timing.navigationStart);
          trace.stop();
        });
      }
    }

    /**
     * Track user interaction
     * @param {string} actionName - Name of the action (e.g., 'add_to_cart', 'checkout')
     * @param {Object} metadata - Optional metadata to attach to the trace
     */
    function trackUserAction(actionName, metadata = {}) {
      if (!isProduction) return;

      const trace = createTrace(`user_action_${actionName}`);
      
      if (trace) {
        trace.start();
        
        // Add metadata as attributes
        Object.entries(metadata).forEach(([key, value]) => {
          trace.putAttribute(key, String(value));
        });
        
        // Stop trace after a short delay (for quick actions)
        setTimeout(() => {
          trace.stop();
        }, 100);
      }
    }

    // Auto-initialize on script load (but don't block - let it run in background)
    initFirebase().then(() => {
      // Track initial page load (if performance monitoring is enabled)
      if (perf) {
        trackPageLoad();
      }
    }).catch(error => {
    });

    // js/performance-traces.js
    // Custom performance traces for key user interactions


    /**
     * Shop Page Performance Trace
     * Tracks shop page load time and product rendering
     */
    class ShopPageTrace {
      constructor() {
        if (!isProduction) return;
        
        this.trace = createTrace('shop_page_experience');
        this.trace?.start();
        
        // Track when products are rendered
        this.observeProductLoad();
      }

      observeProductLoad() {
        const productGrid = document.querySelector('.shop-grid');
        if (!productGrid) return;

        // Use MutationObserver to detect when products are added
        const observer = new MutationObserver(() => {
          const productCount = productGrid.querySelectorAll('.shop-card').length;
          
          if (productCount > 0) {
            this.trace?.putMetric('products_loaded', productCount);
            this.trace?.putAttribute('page', 'shop');
            this.stop();
            observer.disconnect();
          }
        });

        observer.observe(productGrid, { childList: true, subtree: true });

        // Fallback: stop after 5 seconds if products don't load
        setTimeout(() => {
          this.stop();
          observer.disconnect();
        }, 5000);
      }

      stop() {
        this.trace?.stop();
      }
    }

    /**
     * Add to Cart Performance Trace
     * Tracks add to cart interactions and cart update time
     */
    class AddToCartTrace {
      constructor() {
        this.setupListeners();
      }

      setupListeners() {
        document.addEventListener('click', (e) => {
          const addToCartBtn = e.target.closest('.btn-add-to-cart');
          
          if (addToCartBtn) {
            const productName = addToCartBtn.dataset.product;
            const productPrice = addToCartBtn.dataset.price;
            
            trackUserAction('add_to_cart', {
              product_name: productName,
              product_price: productPrice,
              page: window.location.pathname
            });
          }
        });
      }
    }

    /**
     * Cart Page Performance Trace
     * Tracks cart page load and checkout flow
     */
    class CartPageTrace {
      constructor() {
        if (!isProduction) return;
        
        this.trace = createTrace('cart_page_load');
        this.trace?.start();
        
        this.trackCartItems();
        this.trackCheckout();
      }

      trackCartItems() {
        // Wait for cart to be rendered
        const checkCart = setInterval(() => {
          const cartItems = document.querySelectorAll('.cart-item');
          
          if (cartItems.length > 0 || document.getElementById('emptyState')?.style.display !== 'none') {
            this.trace?.putMetric('cart_items_count', cartItems.length);
            this.trace?.stop();
            clearInterval(checkCart);
          }
        }, 100);

        // Timeout after 3 seconds
        setTimeout(() => {
          clearInterval(checkCart);
          this.trace?.stop();
        }, 3000);
      }

      trackCheckout() {
        const checkoutBtn = document.getElementById('checkoutBtn');
        
        if (checkoutBtn) {
          checkoutBtn.addEventListener('click', () => {
            trackUserAction('checkout_initiated', {
              cart_value: document.getElementById('totalAmount')?.textContent || '0',
              page: 'cart'
            });
          });
        }
      }
    }

    /**
     * Navigation Performance Trace
     * Tracks navigation between pages
     */
    class NavigationTrace {
      constructor() {
        this.trackNavClicks();
      }

      trackNavClicks() {
        document.addEventListener('click', (e) => {
          const navLink = e.target.closest('.nav-link, .mobile-nav-link, .btn-continue-shopping');
          
          if (navLink) {
            const destination = navLink.getAttribute('href') || navLink.textContent;
            
            trackUserAction('navigation', {
              from: window.location.pathname,
              to: destination,
              link_type: navLink.className
            });
          }
        });
      }
    }

    /**
     * Form Submission Performance Trace
     * Tracks contact form and address form submissions
     */
    class FormSubmissionTrace {
      constructor() {
        this.trackForms();
      }

      trackForms() {
        // Contact form
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
          contactForm.addEventListener('submit', (e) => {
            trackUserAction('contact_form_submit', {
              form_type: 'contact',
              page: window.location.pathname
            });
          });
        }

        // Address form (cart page)
        const addressForm = document.getElementById('addressForm');
        if (addressForm) {
          addressForm.addEventListener('submit', (e) => {
            trackUserAction('address_form_filled', {
              form_type: 'delivery_address',
              page: 'cart'
            });
          });
        }
      }
    }

    /**
     * Image Load Performance Trace
     * Tracks product image loading time
     */
    class ImageLoadTrace {
      constructor() {
        this.trackImageLoading();
      }

      trackImageLoading() {
        if (!isProduction) return;

        const trace = createTrace('product_images_load');
        trace?.start();

        const images = document.querySelectorAll('.shop-card-image img, .cart-item-image img');
        let loadedCount = 0;
        const totalImages = images.length;

        if (totalImages === 0) {
          trace?.stop();
          return;
        }

        images.forEach((img) => {
          if (img.complete) {
            loadedCount++;
          } else {
            img.addEventListener('load', () => {
              loadedCount++;
              
              if (loadedCount === totalImages) {
                trace?.putMetric('images_loaded', totalImages);
                trace?.putAttribute('page', window.location.pathname);
                trace?.stop();
              }
            });

            img.addEventListener('error', () => {
              loadedCount++;
              
              if (loadedCount === totalImages) {
                trace?.putMetric('images_loaded', totalImages);
                trace?.putMetric('images_failed', 1);
                trace?.stop();
              }
            });
          }
        });

        // Check if all images were already loaded
        if (loadedCount === totalImages) {
          trace?.putMetric('images_loaded', totalImages);
          trace?.stop();
        }

        // Timeout after 10 seconds
        setTimeout(() => {
          trace?.putMetric('images_loaded', loadedCount);
          trace?.putMetric('images_total', totalImages);
          trace?.stop();
        }, 10000);
      }
    }

    // Initialize traces based on current page
    function initPageTraces() {
      const currentPage = window.location.pathname;

      // Common traces for all pages
      new NavigationTrace();
      new FormSubmissionTrace();

      // Page-specific traces
      if (currentPage.includes('shop.html') || currentPage.endsWith('/shop')) {
        new ShopPageTrace();
        new AddToCartTrace();
        new ImageLoadTrace();
      }

      if (currentPage.includes('cart.html') || currentPage.endsWith('/cart')) {
        new CartPageTrace();
      }

      // Track initial page view
      trackUserAction('page_view', {
        page: currentPage,
        referrer: document.referrer,
        timestamp: new Date().toISOString()
      });
    }

    /**
     * Sanity CMS Client Configuration
     * Single source of truth for all Sanity CMS interactions
     * Uses fetch API directly for browser compatibility
     */

    /**
     * Sanity configuration object
     */
    const sanityConfig = {
      projectId: '2r50s816',
      dataset: 'production',
      apiVersion: '2026-03-23'};

    // Build API URL
    const SANITY_API_URL = `https://${sanityConfig.projectId}.${'apicdn' }.sanity.io/v${sanityConfig.apiVersion}/data/query/${sanityConfig.dataset}`;

    /**
     * Execute a GROQ query against Sanity API
     * @param {string} query - GROQ query string
     * @param {Object} params - Query parameters
     * @returns {Promise<any>} - Query result
     */
    async function sanityFetch(query, params = {}) {
      try {
        const encodedQuery = encodeURIComponent(query);
        let url = `${SANITY_API_URL}?query=${encodedQuery}`;

        // Add parameters
        Object.entries(params).forEach(([key, value]) => {
          url += `&$${key}=${encodeURIComponent(JSON.stringify(value))}`;
        });

        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Sanity API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json();
        return data.result
      } catch (error) {
        console.error('Sanity fetch error:', error);
        throw error
      }
    }

    /**
     * Generate image URL from Sanity image reference
     * @param {Object} source - Sanity image object with asset reference
     * @returns {Object} Image URL builder chain
     */
    function urlFor(source) {
      if (!source) {
        return {
          width: () => urlFor(source),
          height: () => urlFor(source),
          fit: () => urlFor(source),
          quality: () => urlFor(source),
          auto: () => urlFor(source),
          format: () => urlFor(source),
          url: () => ''
        }
      }

      let options = {};
      
      const builder = {
        width: (w) => { options.w = w; return builder },
        height: (h) => { options.h = h; return builder },
        fit: (f) => { options.fit = f; return builder },
        quality: (q) => { options.q = q; return builder },
        auto: (a) => { options.auto = a; return builder },
        format: (f) => { options.fm = f; return builder },
        url: () => {
          // Handle direct URL
          if (source.asset?.url) {
            let url = source.asset.url;
            const params = Object.entries(options)
              .map(([k, v]) => `${k}=${v}`)
              .join('&');
            return params ? `${url}?${params}` : url
          }
          
          // Handle asset reference
          const ref = source.asset?._ref || source._ref;
          if (!ref) return ''
          
          // Parse: image-{id}-{dimensions}-{format}
          const [, id, dimensions, format] = ref.split('-');
          if (!id || !dimensions || !format) return ''
          
          let url = `https://cdn.sanity.io/images/${sanityConfig.projectId}/${sanityConfig.dataset}/${id}-${dimensions}.${format}`;
          
          const params = Object.entries(options)
            .map(([k, v]) => `${k}=${v}`)
            .join('&');
          
          return params ? `${url}?${params}` : url
        }
      };
      
      return builder
    }

    /**
     * Fetch products from Sanity with optional filters
     * @param {Object} filters - Filter options
     * @param {boolean} [filters.featured] - Filter for featured products only
     * @param {boolean} [filters.inStock] - Filter for in-stock products only
     * @param {string} [filters.category] - Filter by category slug
     * @param {number} [filters.limit] - Limit number of results
     * @returns {Promise<Array>} Array of product documents
     */
    async function fetchProducts(filters = {}) {
      const { featured, inStock, category, limit } = filters;

      let filterConditions = ['_type == "product"'];

      if (featured === true) {
        filterConditions.push(`featured == true`);
      }

      // Only filter by inStock if explicitly requested - treat undefined as in stock
      if (inStock === true) {
        filterConditions.push(`(inStock == true || !defined(inStock))`);
      } else if (inStock === false) {
        filterConditions.push(`inStock == false`);
      }

      if (category) {
        filterConditions.push(`category->slug.current == "${category}"`);
      }

      const filterString = filterConditions.join(' && ');
      const limitString = limit ? `[0...${limit}]` : '';

      const query = `
    *[${filterString}] | order(_createdAt desc) ${limitString} {
      _id,
      _createdAt,
      title,
      "name": title,
      slug,
      description,
      price,
      salePrice,
      image,
      "imageUrl": image.asset->url,
      images,
      category->{
        _id,
        title,
        slug
      },
      inStock,
      stockCount,
      featured
    }
  `;

      try {
        const products = await sanityFetch(query);
        return products || []
      } catch (error) {
        console.error('Error fetching products from Sanity:', error);
        throw error
      }
    }

    /**
     * Shop Products Module
     * Fetches and renders products from Sanity CMS
     */


    /**
     * Format price in Indian Rupees
     * @param {number} price - Price value
     * @returns {string} Formatted price string
     */
    function formatPrice(price) {
      return `₹${price?.toLocaleString('en-IN') || '0'}`
    }

    /**
     * Get optimized image URL from Sanity
     * @param {Object} product - Product object with image data
     * @returns {string} Optimized image URL
     */
    function getProductImageUrl(product) {
      // Use pre-fetched imageUrl if available
      if (product.imageUrl) {
        return `${product.imageUrl}?w=400&h=400&fit=crop`
      }
      // Fallback to urlFor builder
      if (product.image) {
        return urlFor(product.image).width(400).height(400).fit('crop').url()
      }
      // Default placeholder
      return 'https://images.unsplash.com/photo-1606232099478-3e5d8e4c0f6e?w=400&h=400&fit=crop'
    }

    /**
     * Generate HTML for a single product card
     * @param {Object} product - Product data from Sanity
     * @param {number} index - Product index for animation delay
     * @returns {string} Product card HTML
     */
    function createProductCard(product, index) {
      const {
        _id,
        title,
        name,
        slug,
        description,
        price,
        salePrice,
        image,
        imageUrl: productImageUrl,
        inStock = true
      } = product;

      const productName = title || name || 'Untitled Product';
      const imageUrl = productImageUrl 
        ? `${productImageUrl}?w=400&h=400&fit=crop` 
        : getProductImageUrl(product);
      const displayPrice = salePrice || price;
      const delayClass = index % 3 === 1 ? 'delay-1' : index % 3 === 2 ? 'delay-2' : '';
      slug?.current || _id;

      return `
    <article class="shop-card fade-in-up ${delayClass}" data-product-id="${_id}">
      <div class="shop-card-image">
        <img 
          src="${imageUrl}"
          alt="${productName}"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1606232099478-3e5d8e4c0f6e?w=400&h=400&fit=crop'"
        >
        ${!inStock ? '<span class="out-of-stock-badge">Out of Stock</span>' : ''}
      </div>
      <div class="shop-card-body">
        <h2 class="shop-card-name">${productName}</h2>
        <p class="shop-card-desc">${description || 'Beautiful handcrafted item from SutraKala.'}</p>
      </div>
      <div class="shop-card-footer">
        <span class="shop-card-price">
          ${salePrice ? `<del style="opacity:0.5;font-size:0.9em">${formatPrice(price)}</del> ` : ''}
          ${formatPrice(displayPrice)}
        </span>
        <button 
          class="btn-inquire btn-add-to-cart" 
          data-product="${productName}" 
          data-price="${displayPrice}"
          data-product-id="${_id}"
          ${!inStock ? 'disabled' : ''}
          aria-label="Add ${productName} to cart"
        >
          <i class="fas fa-shopping-bag" aria-hidden="true"></i> 
          ${inStock ? 'Add to Cart' : 'Sold Out'}
        </button>
      </div>
    </article>
  `
    }

    /**
     * Generate custom order card HTML
     * @returns {string} Custom order card HTML
     */
    function createCustomOrderCard() {
      return `
    <article class="shop-card fade-in-up delay-2" style="background: linear-gradient(135deg, #FDFBFD, #EBDEF0); border: 1.5px dashed #8E44AD; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 2rem; min-height: 340px;">
      <i class="fas fa-paint-brush" style="font-size: 2rem; color: #8E44AD; margin-bottom: 1rem;" aria-hidden="true"></i>
      <h2 class="shop-card-name" style="margin-bottom: 0.5rem;">Custom Order</h2>
      <p class="shop-card-desc" style="color: #7A7A7A; margin-bottom: 1.5rem;">Something specific in mind? We love custom requests — your color, your size, your design.</p>
      <a href="https://wa.me/919103329604?text=Hi!+I'd+like+to+discuss+a+custom+crochet+order."
        class="btn-inquire" target="_blank" rel="noopener" aria-label="Request a custom crochet order via WhatsApp">
        <i class="fab fa-whatsapp" aria-hidden="true"></i> Let's Talk
      </a>
    </article>
  `
    }

    /**
     * Render loading state
     * @param {HTMLElement} container - Container element
     */
    function renderLoading(container) {
      container.innerHTML = `
    <div class="shop-loading" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;">
      <div class="loading-spinner" style="
        width: 48px;
        height: 48px;
        border: 3px solid #EBDEF0;
        border-top-color: #8E44AD;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1.5rem;
      "></div>
      <p style="font-family: var(--font-display); font-size: 1.1rem; color: #7A7A7A; font-style: italic;">
        Loading beautiful crafts...
      </p>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
    }

    /**
     * Render error state
     * @param {HTMLElement} container - Container element
     * @param {Error} error - Error object
     */
    function renderError(container, error) {
      console.error('Failed to load products:', error);
      container.innerHTML = `
    <div class="shop-error" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;">
      <i class="fas fa-exclamation-circle" style="font-size: 2.5rem; color: #E74C3C; margin-bottom: 1rem;"></i>
      <h3 style="font-family: var(--font-display); font-size: 1.25rem; color: #2D2D2D; margin-bottom: 0.5rem;">
        Unable to load products
      </h3>
      <p style="color: #7A7A7A; margin-bottom: 1.5rem;">
        We're having trouble connecting. Please try again later.
      </p>
      <button 
        class="btn-inquire" 
        onclick="window.location.reload()"
        style="margin: 0 auto;"
      >
        <i class="fas fa-redo" aria-hidden="true"></i> Try Again
      </button>
    </div>
  `;
    }

    /**
     * Render products grid
     * @param {HTMLElement} container - Container element
     * @param {Array} products - Array of product objects
     */
    function renderProducts(container, products) {
      if (!products || products.length === 0) {
        container.innerHTML = `
      <div class="shop-empty" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;">
        <i class="fas fa-box-open" style="font-size: 2.5rem; color: #D2B4DE; margin-bottom: 1rem;"></i>
        <h3 style="font-family: var(--font-display); font-size: 1.25rem; color: #2D2D2D; margin-bottom: 0.5rem;">
          No products available
        </h3>
        <p style="color: #7A7A7A;">Check back soon for new handcrafted items!</p>
      </div>
      ${createCustomOrderCard()}
    `;
        return
      }

      const productCards = products.map((product, index) => createProductCard(product, index)).join('');
      container.innerHTML = productCards + createCustomOrderCard();

      // Re-initialize cart buttons for dynamically added products
      initializeCartButtons();
    }

    /**
     * Initialize cart button event listeners
     */
    function initializeCartButtons() {
      const cartButtons = document.querySelectorAll('.btn-add-to-cart');
      cartButtons.forEach(button => {
        // Remove existing listeners by cloning
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener('click', (e) => {
          e.preventDefault();
          const productName = newButton.dataset.product;
          const price = parseInt(newButton.dataset.price, 10);
          const productId = newButton.dataset.productId;

          // Dispatch custom event for cart system
          window.dispatchEvent(new CustomEvent('addToCart', {
            detail: { productName, price, productId }
          }));

          // Show feedback
          showToast(`${productName} added to cart!`);
        });
      });
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     */
    function showToast(message) {
      const toast = document.getElementById('toast');
      const toastMessage = document.getElementById('toastMessage');

      if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.hidden = false;
        toast.classList.add('show');

        setTimeout(() => {
          toast.classList.remove('show');
          toast.hidden = true;
        }, 3000);
      }
    }

    /**
     * Initialize shop products
     * Fetches products from Sanity and renders them
     */
    async function initShopProducts() {
      const container = document.querySelector('.shop-grid');

      if (!container) {
        console.warn('Shop grid container not found');
        return
      }

      // Show loading state
      renderLoading(container);

      try {
        // Fetch in-stock products from Sanity
        const products = await fetchProducts({ inStock: true });
        renderProducts(container, products);
      } catch (error) {
        renderError(container, error);
      }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initShopProducts);
    } else {
      initShopProducts();
    }

    // js/main.js

    document.addEventListener('DOMContentLoaded', () => {
        // 1. Initialize Firebase Performance Monitoring (production only)
        initPageTraces();

        // 2. Mount System FPS Monitor (Resolves a live flag function hook)
        const canAnimateCheck = initPerformanceMonitor();

        // 3. Initialize Core Ecosystem
        new Navigation();
        new ShoppingCart();
        new FormValidator();

        // 4. Enable Visual Experience Interactions (Using FPS bounds closure mapping precisely decoupled naturally)
        new ProductHoverEngine(canAnimateCheck);
        new ScrollAnimations(canAnimateCheck);

        // 5. Initialize Shop Products from Sanity (if on shop page)
        if (document.querySelector('.shop-grid')) {
            initShopProducts();
        }
        
        // 6. Hero Bouquet Entrance Animation
        const heroBouquet = document.getElementById('heroBouquet');
        if (heroBouquet && typeof anime !== 'undefined') {
            anime({
                targets: heroBouquet,
                translateY: [80, 0],
                scale: [0.9, 1],
                rotate: [5, 0],
                opacity: [0, 1],
                duration: 3000,
                delay: 100,
                easing: 'easeOutQuart'
            });
        }
        
    });

})();
//# sourceMappingURL=main.js.map
