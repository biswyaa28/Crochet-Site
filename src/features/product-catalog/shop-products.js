/**
 * Shop Products Module
 * Fetches and renders products from Sanity CMS
 */

import { fetchProducts, urlFor } from '../../services/sanity/client.js'

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
  } = product

  const productName = title || name || 'Untitled Product'
  const imageUrl = productImageUrl 
    ? `${productImageUrl}?w=400&h=400&fit=crop` 
    : getProductImageUrl(product)
  const displayPrice = salePrice || price
  const delayClass = index % 3 === 1 ? 'delay-1' : index % 3 === 2 ? 'delay-2' : ''
  const productSlug = slug?.current || _id

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
  `
}

/**
 * Render error state
 * @param {HTMLElement} container - Container element
 * @param {Error} error - Error object
 */
function renderError(container, error) {
  console.error('Failed to load products:', error)
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
  `
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
    `
    return
  }

  const productCards = products.map((product, index) => createProductCard(product, index)).join('')
  container.innerHTML = productCards + createCustomOrderCard()

  // Re-initialize cart buttons for dynamically added products
  initializeCartButtons()
}

/**
 * Initialize cart button event listeners
 */
function initializeCartButtons() {
  const cartButtons = document.querySelectorAll('.btn-add-to-cart')
  cartButtons.forEach(button => {
    // Remove existing listeners by cloning
    const newButton = button.cloneNode(true)
    button.parentNode.replaceChild(newButton, button)

    newButton.addEventListener('click', (e) => {
      e.preventDefault()
      const productName = newButton.dataset.product
      const price = parseInt(newButton.dataset.price, 10)
      const productId = newButton.dataset.productId

      // Dispatch custom event for cart system
      window.dispatchEvent(new CustomEvent('addToCart', {
        detail: { productName, price, productId }
      }))

      // Show feedback
      showToast(`${productName} added to cart!`)
    })
  })
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 */
function showToast(message) {
  const toast = document.getElementById('toast')
  const toastMessage = document.getElementById('toastMessage')

  if (toast && toastMessage) {
    toastMessage.textContent = message
    toast.hidden = false
    toast.classList.add('show')

    setTimeout(() => {
      toast.classList.remove('show')
      toast.hidden = true
    }, 3000)
  }
}

/**
 * Initialize shop products
 * Fetches products from Sanity and renders them
 */
export async function initShopProducts() {
  const container = document.querySelector('.shop-grid')

  if (!container) {
    console.warn('Shop grid container not found')
    return
  }

  // Show loading state
  renderLoading(container)

  try {
    // Fetch in-stock products from Sanity
    const products = await fetchProducts({ inStock: true })
    renderProducts(container, products)
  } catch (error) {
    renderError(container, error)
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShopProducts)
} else {
  initShopProducts()
}

export default initShopProducts
