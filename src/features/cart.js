// js/core/cart.js
import { storage } from '../utils/storage.js';
import { springPhysics } from '../utils/animation.js';
import { $, $$ } from '../utils/dom.js';

export class ShoppingCart {
    constructor() {
        this.items = storage.get('craftedloop_cart', []);
        
        // Modal references
        this.modal = $('#cartModal');
        this.cartItemsContainer = $('#cartItems');
        this.cartEmpty = $('#cartEmpty');
        this.cartTotalEl = $('#cartTotal');
        
        this.bindEvents();
        this.bindStaticButtons();
        this.renderCart();
        this.updateBadge();
    }

    bindEvents() {
        // Listen for custom addToCart events (from dynamically loaded products)
        window.addEventListener('addToCart', (e) => {
            const { productName, price, productId } = e.detail;
            this.addItem({ 
                id: productId || Date.now().toString(), 
                name: productName, 
                price: parseFloat(price) 
            });
            this.showToast(`${productName} added to cart!`);
        });

        // Cart button - open cart modal
        const cartBtn = $('#cartBtn');
        if (cartBtn) {
            cartBtn.addEventListener('click', () => {
                this.openModal();
            });
        }
        
        // Close modal buttons
        const cartModalClose = $('#cartModalClose');
        const cartModalOverlay = $('#cartModalOverlay');
        if (cartModalClose) {
            cartModalClose.addEventListener('click', () => this.closeModal());
        }
        if (cartModalOverlay) {
            cartModalOverlay.addEventListener('click', () => this.closeModal());
        }

        // Checkout logic
        const checkoutBtn = $('#checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.checkout());
        }
        
        // Remove item delegation inside modal
        if (this.cartItemsContainer) {
            this.cartItemsContainer.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.cart-item-remove');
                if (removeBtn) {
                    const id = removeBtn.dataset.id;
                    this.removeItem(id);
                }
            });
        }
        
        // Use event delegation for add-to-cart buttons (works for dynamic content)
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-add-to-cart');
            if (btn && !btn.disabled) {
                e.preventDefault();
                const product = btn.dataset.product;
                const price = parseFloat(btn.dataset.price);
                const productId = btn.dataset.productId || Date.now().toString();
                
                this.addItem({ id: productId, name: product, price: price });
                
                // Animate button bounce
                if (typeof anime !== 'undefined') {
                    anime({
                        targets: btn,
                        scale: [0.97, 1],
                        duration: 400,
                        easing: springPhysics.snap
                    });
                }
                
                this.showToast(`${product} added to cart!`);
            }
        });
    }

    bindStaticButtons() {
        // Bind any static add-to-cart buttons that exist at page load
        $$('.btn-add-to-cart').forEach(btn => {
            // Mark as bound to avoid double-handling
            btn.dataset.cartBound = 'true';
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
        console.log('Adding item to cart:', item);
        this.items.push(item);
        console.log('Cart items after add:', this.items);
        this.saveAndRender();
    }

    removeItem(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.saveAndRender();
    }

    saveAndRender() {
        console.log('Saving items to localStorage:', this.items);
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
        console.log('Rendering cart. Items:', this.items);
        console.log('DOM elements:', {
            cartItemsContainer: this.cartItemsContainer,
            cartEmpty: this.cartEmpty,
            cartTotalEl: this.cartTotalEl
        });
        
        if (!this.cartItemsContainer || !this.cartEmpty || !this.cartTotalEl) {
            console.warn('Cart DOM elements not found, skipping render');
            return;
        }
        
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
