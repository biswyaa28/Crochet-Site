/**
 * Sanity CMS Client Configuration
 * Single source of truth for all Sanity CMS interactions
 * Uses fetch API directly for browser compatibility
 */

/**
 * Sanity configuration object
 */
export const sanityConfig = {
  projectId: '2r50s816',
  dataset: 'production',
  apiVersion: '2026-03-23',
  useCdn: true
}

// Build API URL
const SANITY_API_URL = `https://${sanityConfig.projectId}.${sanityConfig.useCdn ? 'apicdn' : 'api'}.sanity.io/v${sanityConfig.apiVersion}/data/query/${sanityConfig.dataset}`

/**
 * Execute a GROQ query against Sanity API
 * @param {string} query - GROQ query string
 * @param {Object} params - Query parameters
 * @returns {Promise<any>} - Query result
 */
async function sanityFetch(query, params = {}) {
  try {
    const encodedQuery = encodeURIComponent(query)
    let url = `${SANITY_API_URL}?query=${encodedQuery}`

    // Add parameters
    Object.entries(params).forEach(([key, value]) => {
      url += `&$${key}=${encodeURIComponent(JSON.stringify(value))}`
    })

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Sanity API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.result
  } catch (error) {
    console.error('Sanity fetch error:', error)
    throw error
  }
}

/**
 * Sanity client-like interface for compatibility
 */
export const sanityClient = {
  fetch: sanityFetch
}

/**
 * Generate image URL from Sanity image reference
 * @param {Object} source - Sanity image object with asset reference
 * @returns {Object} Image URL builder chain
 */
export function urlFor(source) {
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

  let options = {}
  
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
        let url = source.asset.url
        const params = Object.entries(options)
          .map(([k, v]) => `${k}=${v}`)
          .join('&')
        return params ? `${url}?${params}` : url
      }
      
      // Handle asset reference
      const ref = source.asset?._ref || source._ref
      if (!ref) return ''
      
      // Parse: image-{id}-{dimensions}-{format}
      const [, id, dimensions, format] = ref.split('-')
      if (!id || !dimensions || !format) return ''
      
      let url = `https://cdn.sanity.io/images/${sanityConfig.projectId}/${sanityConfig.dataset}/${id}-${dimensions}.${format}`
      
      const params = Object.entries(options)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
      
      return params ? `${url}?${params}` : url
    }
  }
  
  return builder
}

/**
 * Helper function to get optimized image URLs
 * @param {Object} image - Sanity image asset
 * @param {Object} options - Image transformation options
 * @returns {string} Optimized image URL
 */
export function getOptimizedImageUrl(image, options = {}) {
  const { width = 800, height, quality = 80, format = 'webp' } = options

  let imageBuilder = urlFor(image).auto('format').format(format)

  if (width) imageBuilder = imageBuilder.width(width)
  if (height) imageBuilder = imageBuilder.height(height)
  if (quality) imageBuilder = imageBuilder.quality(quality)

  return imageBuilder.url()
}

export default sanityClient

/**
 * Fetch products from Sanity with optional filters
 * @param {Object} filters - Filter options
 * @param {boolean} [filters.featured] - Filter for featured products only
 * @param {boolean} [filters.inStock] - Filter for in-stock products only
 * @param {string} [filters.category] - Filter by category slug
 * @param {number} [filters.limit] - Limit number of results
 * @returns {Promise<Array>} Array of product documents
 */
export async function fetchProducts(filters = {}) {
  const { featured, inStock, category, limit } = filters

  let filterConditions = ['_type == "product"']

  if (featured === true) {
    filterConditions.push(`featured == true`)
  }

  // Only filter by inStock if explicitly requested - treat undefined as in stock
  if (inStock === true) {
    filterConditions.push(`(inStock == true || !defined(inStock))`)
  } else if (inStock === false) {
    filterConditions.push(`inStock == false`)
  }

  if (category) {
    filterConditions.push(`category->slug.current == "${category}"`)
  }

  const filterString = filterConditions.join(' && ')
  const limitString = limit ? `[0...${limit}]` : ''

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
  `

  try {
    const products = await sanityFetch(query)
    return products || []
  } catch (error) {
    console.error('Error fetching products from Sanity:', error)
    throw error
  }
}

/**
 * Fetch gallery images from Sanity
 * @param {Object} options - Fetch options
 * @param {number} [options.limit] - Limit number of results
 * @returns {Promise<Array>} Array of gallery documents
 */
export async function fetchGallery(options = {}) {
  const { limit } = options
  const limitString = limit ? `[0...${limit}]` : ''

  const query = `
    *[_type == "gallery"] | order(publishedAt desc) ${limitString} {
      _id,
      title,
      slug,
      images[] {
        asset->{
          _id,
          url,
          metadata
        },
        alt,
        caption
      },
      publishedAt
    }
  `

  try {
    const gallery = await sanityFetch(query)
    return gallery || []
  } catch (error) {
    console.error('Error fetching gallery from Sanity:', error)
    throw error
  }
}
