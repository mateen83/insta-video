import { type NextRequest, NextResponse } from "next/server"

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT = 10 // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, lastReset: now })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

function extractShortcode(url: string): string | null {
  const patterns = [
    /instagram\.com\/p\/([\w-]+)/,
    /instagram\.com\/reel\/([\w-]+)/,
    /instagram\.com\/reels\/([\w-]+)/,
    /instagram\.com\/tv\/([\w-]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// ============================================
// FACEBOOK DOWNLOADER - NEW FUNCTIONALITY
// ============================================

function isFacebookURL(url: string): boolean {
  const fbPatterns = [
    /facebook\.com\/reel\//,
    /facebook\.com\/.*\/videos\//,
    /fb\.watch\//,
    /facebook\.com\/watch\//,
    /facebook\.com\/share\//,
    /m\.facebook\.com\/share\//,
  ]
  return fbPatterns.some(pattern => pattern.test(url))
}

function isFacebookShareURL(url: string): boolean {
  const sharePatterns = [
    /facebook\.com\/share\/r\//,
    /facebook\.com\/share\/v\//,
    /facebook\.com\/share\/reel\//,
    /facebook\.com\/share\//,
    /m\.facebook\.com\/share\/r\//,
  ]
  return sharePatterns.some((pattern) => pattern.test(url))
}

// ============================================
// HELPER: Base62 Decoder for Facebook Share IDs
// ============================================
function base62ToDecimal(base62: string): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let decimal = BigInt(0)
  const base = BigInt(62)
  
  for (let i = 0; i < base62.length; i++) {
    const char = base62[i]
    const value = alphabet.indexOf(char)
    
    if (value === -1) {
      throw new Error(`Invalid base62 character: ${char}`)
    }
    
    decimal = decimal * base + BigInt(value)
  }
  
  return decimal.toString()
}

// ============================================
// IMPROVED: Multi-Strategy Facebook Share URL Resolver
// ============================================
async function resolveFacebookShareURL_Improved(url: string): Promise<string> {
  console.log("[FB-SHARE] Starting resolution for:", url)
  
  // Extract share ID from URL
  const shareIdMatch = url.match(/\/share\/[rv]\/([A-Za-z0-9]+)/i)
  const shareId = shareIdMatch ? shareIdMatch[1] : null
  
  if (shareId) {
    console.log("[FB-SHARE] Extracted share ID:", shareId)
  }

  // ============================================
  // STRATEGY 1: Direct Cobalt API
  // ============================================
  try {
    console.log("[FB-SHARE] Strategy 1 (Direct Cobalt): Attempting...")
    
    const cobaltResponse = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        vCodec: "h264",
        vQuality: "max"
      }),
      signal: AbortSignal.timeout(8000) // 8 second timeout
    })

    if (cobaltResponse.ok) {
      const data = await cobaltResponse.json()
      
      if (data.status === "redirect" || data.status === "stream" || data.status === "tunnel") {
        if (data.url) {
          console.log("[FB-SHARE] Strategy 1 succeeded: Got video URL directly")
          return url // Return original URL since Cobalt can handle it
        }
      }
    }
    
    console.log("[FB-SHARE] Strategy 1 failed: Cobalt couldn't process share URL directly")
  } catch (e) {
    console.log("[FB-SHARE] Strategy 1 failed:", e instanceof Error ? e.message : String(e))
  }

  // ============================================
  // STRATEGY 2: Base62 Share ID Decoding
  // ============================================
  if (shareId) {
    try {
      console.log("[FB-SHARE] Strategy 2 (Base62 Decode): Attempting...")
      
      const decimalId = base62ToDecimal(shareId)
      const constructedUrl = `https://www.facebook.com/reel/${decimalId}`
      
      console.log("[FB-SHARE] Strategy 2: Extracted ID:", shareId, "Decimal:", decimalId)
      console.log("[FB-SHARE] Strategy 2: Constructed URL:", constructedUrl)
      
      // Test if this URL works with Cobalt
      const testResponse = await fetch("https://api.cobalt.tools/api/json", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: constructedUrl,
          vCodec: "h264",
          vQuality: "max"
        }),
        signal: AbortSignal.timeout(8000)
      })

      if (testResponse.ok) {
        const data = await testResponse.json()
        
        if (data.status === "redirect" || data.status === "stream" || data.status === "tunnel") {
          if (data.url) {
            console.log("[FB-SHARE] Strategy 2 succeeded: Resolved to", constructedUrl)
            return constructedUrl
          }
        }
      }
      
      console.log("[FB-SHARE] Strategy 2 failed: Constructed URL didn't work")
    } catch (e) {
      console.log("[FB-SHARE] Strategy 2 failed:", e instanceof Error ? e.message : String(e))
    }
  }

  // ============================================
  // STRATEGY 3: HTTP Redirect Tracking
  // ============================================
  try {
    console.log("[FB-SHARE] Strategy 3 (Redirect Tracking): Attempting...")
    
    // Try manual redirect first
    const manualResponse = await fetch(url, {
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000)
    })

    // Check Location header
    const location = manualResponse.headers.get('location')
    if (location && !isFacebookShareURL(location) && isFacebookURL(location)) {
      console.log("[FB-SHARE] Strategy 3 succeeded: Found redirect in Location header:", location)
      return location
    }

    // Try following redirects
    const followResponse = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000)
    })

    if (followResponse.ok) {
      const finalUrl = followResponse.url
      
      // Check if we got redirected to a proper URL
      if (finalUrl && !isFacebookShareURL(finalUrl) && isFacebookURL(finalUrl)) {
        console.log("[FB-SHARE] Strategy 3 succeeded: Followed redirect to:", finalUrl)
        return finalUrl
      }

      // Check HTML for meta refresh
      const html = await followResponse.text()
      const metaRefreshMatch = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i)
      
      if (metaRefreshMatch && metaRefreshMatch[1]) {
        const refreshUrl = metaRefreshMatch[1].replace(/&amp;/g, "&")
        if (!isFacebookShareURL(refreshUrl) && isFacebookURL(refreshUrl)) {
          console.log("[FB-SHARE] Strategy 3 succeeded: Found meta refresh:", refreshUrl)
          return refreshUrl
        }
      }

      // Extract from Open Graph or canonical tags
      const ogUrlPatterns = [
        /property="og:url"[^>]*content="([^"]+)"/i,
        /meta[^>]*content="([^"]+)"[^>]*property="og:url"/i,
        /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i,
      ]
      
      for (const pattern of ogUrlPatterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          const canonicalUrl = match[1].replace(/&amp;/g, "&")
          if (!isFacebookShareURL(canonicalUrl) && isFacebookURL(canonicalUrl)) {
            console.log("[FB-SHARE] Strategy 3 succeeded: Found in OG tags:", canonicalUrl)
            return canonicalUrl
          }
        }
      }

      // Extract reel ID from HTML
      const reelIdPatterns = [
        /"video_id":"(\d+)"/,
        /"videoID":"(\d+)"/,
        /\/reel\/(\d+)/,
        /"fbid":"(\d+)"/,
      ]

      for (const pattern of reelIdPatterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          const reelId = match[1]
          const constructedUrl = `https://www.facebook.com/reel/${reelId}`
          console.log("[FB-SHARE] Strategy 3 succeeded: Extracted reel ID from HTML:", constructedUrl)
          return constructedUrl
        }
      }
    }
    
    console.log("[FB-SHARE] Strategy 3 failed: No redirect or ID found")
  } catch (e) {
    console.log("[FB-SHARE] Strategy 3 failed:", e instanceof Error ? e.message : String(e))
  }

  // ============================================
  // STRATEGY 4: Headless Browser Resolution (Optional)
  // ============================================
  const backendUrl = process.env.BACKEND_URL
  if (backendUrl) {
    try {
      console.log("[FB-SHARE] Strategy 4 (Headless Browser): Attempting...")
      
      const backendResponse = await fetch(`${backendUrl}/api/facebook-resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(15000) // 15 second timeout for browser
      })

      if (backendResponse.ok) {
        const data = await backendResponse.json()
        
        if (data.resolved_url && !isFacebookShareURL(data.resolved_url) && isFacebookURL(data.resolved_url)) {
          console.log("[FB-SHARE] Strategy 4 succeeded: Backend resolved to:", data.resolved_url)
          return data.resolved_url
        }
      }
      
      console.log("[FB-SHARE] Strategy 4 failed: Backend couldn't resolve")
    } catch (e) {
      console.log("[FB-SHARE] Strategy 4 failed:", e instanceof Error ? e.message : String(e))
    }
  } else {
    console.log("[FB-SHARE] Strategy 4 skipped: No backend configured (BACKEND_URL not set)")
  }

  // ============================================
  // STRATEGY 5: Return Original URL
  // ============================================
  console.log("[FB-SHARE] All strategies failed, returning original URL for fallback methods")
  return url
}

// Keep old function for backward compatibility (just calls new one)
async function resolveFacebookShareURL(url: string): Promise<string> {
  return resolveFacebookShareURL_Improved(url)
}

async function fetchFacebookVideo(url: string) {
  console.log("[FB] Starting Facebook video fetch for:", url)
  
  const originalUrl = url
  let resolvedUrl = url

  if (isFacebookShareURL(url)) {
    console.log("[FB] Detected share-style URL, attempting to resolve...")
    const resolved = await resolveFacebookShareURL_Improved(url)
    if (resolved !== url) {
      console.log("[FB] Share URL resolved to:", resolved)
      resolvedUrl = resolved
      url = resolved
    } else {
      console.log("[FB] Share URL resolution returned original URL, will try both")
    }
  }
  
  // Try multiple methods for Facebook video download
  const methods = [
    () => fetchViaFacebookAPI(url),
    () => fetchViaCobalAPI(url),
    () => fetchViaFacebookDirect(url),
    () => fetchViaSnapSave(url)
  ]

  // First, try with the resolved URL
  for (const method of methods) {
    try {
      const result = await method()
      if (result && result.video_url) {
        console.log("[FB] Successfully fetched video!")
        
        // If no thumbnail was found, try to extract from the original URL
        if (!result.thumbnail) {
          console.log("[FB] No thumbnail found, attempting to extract from URL")
          const thumbnailResult = await extractFacebookThumbnail(originalUrl)
          if (thumbnailResult) {
            result.thumbnail = thumbnailResult
          }
        }
        
        return result
      }
    } catch (e) {
      console.log("[FB] Method failed, trying next:", e)
      continue
    }
  }

  // If resolved URL failed and it's different from original, try with original share URL
  if (isFacebookShareURL(originalUrl) && originalUrl !== resolvedUrl) {
    console.log("[FB] Resolved URL failed, trying original share URL with download methods")
    
    for (const method of [() => fetchViaCobalAPI(originalUrl), () => fetchViaSnapSave(originalUrl)]) {
      try {
        const result = await method()
        if (result && result.video_url) {
          console.log("[FB] Successfully fetched video using original share URL!")
          
          if (!result.thumbnail) {
            const thumbnailResult = await extractFacebookThumbnail(originalUrl)
            if (thumbnailResult) {
              result.thumbnail = thumbnailResult
            }
          }
          
          return result
        }
      } catch (e) {
        console.log("[FB] Method with original URL failed, trying next:", e)
        continue
      }
    }
  }

  throw new Error("Unable to fetch Facebook video. The post may be private or unavailable.")
}

// Extract thumbnail from Facebook URL
async function extractFacebookThumbnail(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow"
    })

    if (!response.ok) return null

    const html = await response.text()
    
    // Look for Open Graph image (thumbnail)
    const ogImageMatch = html.match(/property="og:image"[^>]*content="([^"]+)"/) ||
                        html.match(/meta[^>]*content="([^"]+)"[^>]*property="og:image"/)
    
    if (ogImageMatch) {
      return ogImageMatch[1].replace(/&amp;/g, "&")
    }

    return null
  } catch (e) {
    console.log("[FB] Thumbnail extraction failed:", e)
    return null
  }
}

// New method using a simple API approach
async function fetchViaFacebookAPI(url: string) {
  try {
    console.log("[FB] Trying Facebook API method for:", url)
    
    // Use a simple downloader API
    const apiUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`
    
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow"
    })

    if (!response.ok) {
      console.log("[FB] API response not ok:", response.status)
      return null
    }

    const html = await response.text()
    
    // PRIORITY: Extract HD quality first, then fallback to SD
    // Look for HD quality URLs first
    const hdPatterns = [
      /"playable_url_quality_hd":"([^"]+)"/,
      /"browser_native_hd_url":"([^"]+)"/,
      /"hd_src":"([^"]+)"/,
      /hd_src:"([^"]+)"/,
      /"playable_url":"([^"]+)"/
    ]

    // Extract thumbnail
    const thumbnailPatterns = [
      /"preferred_thumbnail":{"image":{"uri":"([^"]+)"/,
      /"thumbnailImage":{"uri":"([^"]+)"/,
      /"og:image"[^>]*content="([^"]+)"/,
      /"thumbnail_url":"([^"]+)"/,
      /property="og:image"[^>]*content="([^"]+)"/
    ]
    
    let thumbnail: string | undefined
    for (const pattern of thumbnailPatterns) {
      const match = html.match(pattern)
      if (match) {
        thumbnail = match[1].replace(/\\/g, "").replace(/&amp;/g, "&")
        break
      }
    }

    // Try HD patterns first
    for (const pattern of hdPatterns) {
      const match = html.match(pattern)
      if (match) {
        const videoUrl = match[1]
          .replace(/\\u0025/g, "%")
          .replace(/\\u0026/g, "&")
          .replace(/\\u002F/g, "/")
          .replace(/\\/g, "")
        
        console.log("[FB] API method found HD video:", videoUrl.substring(0, 100))
        
        return {
          video_url: videoUrl,
          thumbnail: thumbnail,
          quality: "HD"
        }
      }
    }

    // Fallback to SD if HD not found
    const sdPatterns = [
      /"browser_native_sd_url":"([^"]+)"/,
      /"sd_src":"([^"]+)"/,
      /sd_src:"([^"]+)"/,
      /"video_url":"([^"]+)"/
    ]

    for (const pattern of sdPatterns) {
      const match = html.match(pattern)
      if (match) {
        const videoUrl = match[1]
          .replace(/\\u0025/g, "%")
          .replace(/\\u0026/g, "&")
          .replace(/\\u002F/g, "/")
          .replace(/\\/g, "")
        
        console.log("[FB] API method found SD video (HD not available):", videoUrl.substring(0, 100))
        
        return {
          video_url: videoUrl,
          thumbnail: thumbnail,
          quality: "SD"
        }
      }
    }

    console.log("[FB] API method: No video URL found")

  } catch (e) {
    console.log("[FB] Facebook API method failed:", e)
  }
  return null
}

async function fetchViaCobalAPI(url: string) {
  try {
    console.log("[FB] Trying Cobalt API for:", url)
    
    const response = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        vCodec: "h264",
        vQuality: "max",  // Request maximum quality
        aFormat: "best",   // Best audio format
        filenamePattern: "basic",
        isAudioOnly: false,
        disableMetadata: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[FB] Cobalt API response not ok:", response.status, errorText.substring(0, 200))
      return null
    }

    const data = await response.json()
    console.log("[FB] Cobalt API full response:", JSON.stringify(data))

    // Check for error status
    if (data.status === "error") {
      console.log("[FB] Cobalt API returned error:", data.text || data.error)
      return null
    }

    // Cobalt API returns different response structures
    if (data.status === "redirect" || data.status === "stream" || data.status === "tunnel") {
      console.log("[FB] Cobalt API success with status:", data.status)
      return {
        video_url: data.url,
        thumbnail: data.thumb || undefined,
        quality: "HD",  // Cobalt returns max quality when requested
        duration: undefined
      }
    }

    if (data.url) {
      console.log("[FB] Cobalt API success with direct URL")
      return {
        video_url: data.url,
        thumbnail: data.thumb || undefined,
        quality: "HD"
      }
    }

    console.log("[FB] Cobalt API: No video URL in response")

  } catch (e) {
    console.log("[FB] Cobalt API failed with exception:", e)
  }
  return null
}

async function fetchViaSnapSave(url: string) {
  try {
    console.log("[FB] Trying SnapSave for:", url)
    
    // Try using fdown.net API which is more reliable
    const apiUrl = "https://www.getfvid.com/downloader"
    
    const formData = new URLSearchParams()
    formData.append('url', url)
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Origin": "https://www.getfvid.com",
        "Referer": "https://www.getfvid.com/"
      },
      body: formData
    })

    if (!response.ok) {
      console.log("[FB] SnapSave response not ok:", response.status)
      return null
    }

    const html = await response.text()
    
    // PRIORITY: Look for HD quality links first
    const hdPatterns = [
      /href="([^"]+)"\s+download="[^"]*hd[^"]*\.mp4"/i,
      /href="([^"]+)"\s+[^>]*>.*?HD.*?<\/a>/i,
      /<a[^>]+href="([^"]+)"[^>]*class="[^"]*hd[^"]*"/i
    ]

    // Try HD patterns first
    for (const pattern of hdPatterns) {
      const match = html.match(pattern)
      if (match) {
        const videoUrl = match[1].replace(/&amp;/g, "&").replace(/\\u002F/g, "/")
        
        const thumbnailMatch = html.match(/poster="([^"]+)"/i) ||
                              html.match(/"thumbnail":"([^"]+)"/i) ||
                              html.match(/data-thumb="([^"]+)"/i)
        
        console.log("[FB] SnapSave found HD video:", videoUrl.substring(0, 100))
        
        return {
          video_url: videoUrl,
          thumbnail: thumbnailMatch ? thumbnailMatch[1] : undefined,
          quality: "HD"
        }
      }
    }

    // Fallback to any quality
    const fallbackPatterns = [
      /href="([^"]+)"\s+download="[^"]*\.mp4"/i,
      /<a[^>]+href="([^"]+)"[^>]*class="[^"]*download[^"]*"/i,
      /href="(https:\/\/[^"]+\.mp4[^"]*)"/i,
      /"downloadUrl":"([^"]+)"/i
    ]

    for (const pattern of fallbackPatterns) {
      const match = html.match(pattern)
      if (match) {
        const videoUrl = match[1].replace(/&amp;/g, "&").replace(/\\u002F/g, "/")
        
        const thumbnailMatch = html.match(/poster="([^"]+)"/i) ||
                              html.match(/"thumbnail":"([^"]+)"/i) ||
                              html.match(/data-thumb="([^"]+)"/i)
        
        console.log("[FB] SnapSave found video (HD not available):", videoUrl.substring(0, 100))
        
        return {
          video_url: videoUrl,
          thumbnail: thumbnailMatch ? thumbnailMatch[1] : undefined,
          quality: "SD"
        }
      }
    }

    console.log("[FB] SnapSave: No video URL found in response")

  } catch (e) {
    console.log("[FB] SnapSave failed:", e)
  }
  return null
}

async function fetchViaFacebookDirect(url: string) {
  try {
    console.log("[FB] Trying direct Facebook fetch for:", url)
    
    // Method 1: Try mbasic.facebook.com (mobile version)
    const mobileUrl = url.replace('www.facebook.com', 'mbasic.facebook.com').replace('m.facebook.com', 'mbasic.facebook.com')
    
    const response = await fetch(mobileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow"
    })

    if (!response.ok) {
      console.log("[FB] Direct fetch response not ok:", response.status)
      return null
    }

    const html = await response.text()

    // PRIORITY: Look for HD quality URLs first
    const hdPatterns = [
      /"playable_url_quality_hd":"([^"]+)"/,
      /"browser_native_hd_url":"([^"]+)"/,
      /hd_src:"([^"]+)"/,
      /"hd_src":"([^"]+)"/
    ]

    // Try HD patterns first
    for (const pattern of hdPatterns) {
      const match = html.match(pattern)
      if (match) {
        let videoUrl = match[1]
          .replace(/\\u0025/g, "%")
          .replace(/\\u0026/g, "&")
          .replace(/\\u002F/g, "/")
          .replace(/\\/g, "")
          .replace(/&amp;/g, "&")
        
        console.log("[FB] Direct fetch found HD video:", videoUrl.substring(0, 100))
        
        const thumbnailMatch = html.match(/"preferred_thumbnail":{"image":{"uri":"([^"]+)"/) ||
                              html.match(/"thumbnailImage":{"uri":"([^"]+)"/) ||
                              html.match(/og:image"[^>]*content="([^"]+)"/)
        
        const thumbnail = thumbnailMatch ? thumbnailMatch[1].replace(/\\/g, "").replace(/&amp;/g, "&") : undefined

        return {
          video_url: videoUrl,
          thumbnail: thumbnail,
          quality: "HD"
        }
      }
    }

    // Fallback to other quality patterns
    const fallbackPatterns = [
      /"playable_url":"([^"]+)"/,
      /"browser_native_sd_url":"([^"]+)"/,
      /sd_src:"([^"]+)"/,
      /"video_url":"([^"]+)"/,
      /src="(https:\/\/[^"]+\.mp4[^"]*)"/,
      /href="(https:\/\/video[^"]+)"/
    ]

    for (const pattern of fallbackPatterns) {
      const match = html.match(pattern)
      if (match) {
        let videoUrl = match[1]
          .replace(/\\u0025/g, "%")
          .replace(/\\u0026/g, "&")
          .replace(/\\u002F/g, "/")
          .replace(/\\/g, "")
          .replace(/&amp;/g, "&")
        
        console.log("[FB] Direct fetch found video (HD not available):", videoUrl.substring(0, 100))
        
        const thumbnailMatch = html.match(/"preferred_thumbnail":{"image":{"uri":"([^"]+)"/) ||
                              html.match(/"thumbnailImage":{"uri":"([^"]+)"/) ||
                              html.match(/og:image"[^>]*content="([^"]+)"/)
        
        const thumbnail = thumbnailMatch ? thumbnailMatch[1].replace(/\\/g, "").replace(/&amp;/g, "&") : undefined

        return {
          video_url: videoUrl,
          thumbnail: thumbnail,
          quality: "SD"
        }
      }
    }

    console.log("[FB] Direct fetch: No video URL found in response")

  } catch (e) {
    console.log("[FB] Facebook direct fetch failed:", e)
  }
  return null
}

// ============================================
// END FACEBOOK DOWNLOADER
// ============================================

async function fetchInstagramData(url: string) {
  // First try the new Puppeteer backend
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
    const response = await fetch(`${backendUrl}/api/reel?url=${encodeURIComponent(url)}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Instagram-Downloader-Frontend/1.0'
      }
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.videoUrl) {
        return {
          video_url: data.videoUrl,
          thumbnail: null, // Will be extracted separately if needed
          quality: "HD",
          method: `puppeteer-${data.method}`
        }
      }
    }
  } catch (e) {
    console.log("[v0] Puppeteer backend failed, trying fallback methods:", e)
  }

  // Fallback to existing methods
  const shortcode = extractShortcode(url)
  if (!shortcode) {
    throw new Error("Invalid Instagram URL")
  }

  const approaches = [
    () => fetchViaInstagramAPI(shortcode),
    () => fetchViaPageScrape(url),
    () => fetchViaOEmbed(url)
  ]

  for (const approach of approaches) {
    try {
      const result = await approach()
      if (result && result.video_url) return result
    } catch (e) {
      console.log("[v0] Approach failed, trying next:", e)
      continue
    }
  }

  throw new Error("Unable to fetch video. The post may be private or unavailable.")
}

// Free Instagram downloader API
async function fetchViaRapidAPI(url: string) {
  try {
    // Using a free Instagram downloader service
    const apiUrl = `https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index`
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'demo-key',
        'X-RapidAPI-Host': 'instagram-downloader-download-instagram-videos-stories.p.rapidapi.com'
      }
    })

    if (!response.ok) return null

    const data = await response.json()
    
    if (data.video_url) {
      return {
        video_url: data.video_url,
        thumbnail: data.thumbnail || data.image_url,
        quality: "HD",
        duration: data.duration
      }
    }
  } catch (e) {
    console.log("RapidAPI approach failed:", e)
  }
  return null
}

// Alternative free service approach
async function fetchViaInstagramAPI(shortcode: string) {
  try {
    // Using Instagram's embed endpoint
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`
    
    const response = await fetch(embedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    if (!response.ok) return null

    const html = await response.text()
    
    // Look for video data in the embed page
    const videoMatch = html.match(/"video_url":"([^"]+)"/) || 
                      html.match(/"src":"([^"]+\.mp4[^"]*)"/) ||
                      html.match(/videoUrl['"]\s*:\s*['"]([^'"]+)['"]/);
    
    const thumbnailMatch = html.match(/"display_url":"([^"]+)"/) || 
                          html.match(/"thumbnail_url":"([^"]+)"/) ||
                          html.match(/thumbnailUrl['"]\s*:\s*['"]([^'"]+)['"]/);

    if (videoMatch) {
      const videoUrl = videoMatch[1].replace(/\\u0026/g, "&").replace(/\\u002F/g, "/").replace(/\\/g, "")
      const thumbnail = thumbnailMatch ? thumbnailMatch[1].replace(/\\u0026/g, "&").replace(/\\u002F/g, "/").replace(/\\/g, "") : undefined

      return {
        video_url: videoUrl,
        thumbnail: thumbnail,
        quality: "HD"
      }
    }
  } catch (e) {
    console.log("Instagram API approach failed:", e)
  }
  return null
}

async function fetchViaOEmbed(url: string) {
  try {
    // Method 1: Try Instagram's oEmbed
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`

    const response = await fetch(oembedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (response.ok) {
      const data = await response.json()
      
      // Try to extract video from oEmbed HTML
      if (data.html) {
        const videoMatch = data.html.match(/src="([^"]+\.mp4[^"]*)"/) || 
                          data.html.match(/"video_url":"([^"]+)"/)
        
        if (videoMatch) {
          return {
            video_url: videoMatch[1],
            thumbnail: data.thumbnail_url,
            quality: "HD"
          }
        }
      }

      // Return at least thumbnail if available
      if (data.thumbnail_url) {
        return {
          thumbnail: data.thumbnail_url
        }
      }
    }

    // Method 2: Try alternative approach with different service
    return await fetchViaAlternativeService(url)
    
  } catch (e) {
    console.log("oEmbed approach failed:", e)
    return null
  }
}

async function fetchViaAlternativeService(url: string) {
  try {
    // Using a simple approach that mimics browser behavior
    const shortcode = extractShortcode(url)
    if (!shortcode) return null

    // Try accessing the post with mobile user agent
    const mobileUrl = `https://www.instagram.com/p/${shortcode}/`
    
    const response = await fetch(mobileUrl, {
      headers: {
        "User-Agent": "Instagram 76.0.0.15.395 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 138226743)",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    if (!response.ok) return null

    const html = await response.text()
    
    // Look for video data in mobile version
    const videoMatch = html.match(/"video_url":"([^"]+)"/) ||
                      html.match(/videoUrl['"]\s*:\s*['"]([^'"]+)['"]/) ||
                      html.match(/"src":"([^"]+\.mp4[^"]*)"/)

    if (videoMatch) {
      const videoUrl = videoMatch[1].replace(/\\u0026/g, "&").replace(/\\u002F/g, "/").replace(/\\/g, "")
      
      const thumbnailMatch = html.match(/"display_url":"([^"]+)"/) ||
                            html.match(/"thumbnail_url":"([^"]+)"/)
      
      const thumbnail = thumbnailMatch ? thumbnailMatch[1].replace(/\\u0026/g, "&").replace(/\\u002F/g, "/").replace(/\\/g, "") : undefined

      return {
        video_url: videoUrl,
        thumbnail: thumbnail,
        quality: "HD"
      }
    }

  } catch (e) {
    console.log("Alternative service failed:", e)
  }
  return null
}

async function fetchViaPageScrape(url: string) {
  try {
    // Method 1: Try with different user agents and approaches
    const userAgents = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
    ]

    for (const userAgent of userAgents) {
      try {
        const result = await tryFetchWithUserAgent(url, userAgent)
        if (result && result.video_url) return result
      } catch (e) {
        continue
      }
    }

    // Method 2: Try embed approach
    const shortcode = extractShortcode(url)
    if (shortcode) {
      const embedResult = await tryEmbedApproach(shortcode)
      if (embedResult && embedResult.video_url) return embedResult
    }

  } catch (e) {
    console.log("Page scrape failed:", e)
  }
  return null
}

async function tryFetchWithUserAgent(url: string, userAgent: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    },
    redirect: "follow",
  })

  if (!response.ok) return null

  const html = await response.text()
  return extractVideoFromHTML(html)
}

async function tryEmbedApproach(shortcode: string) {
  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/`
  
  const response = await fetch(embedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; facebookexternalhit/1.1)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  })

  if (!response.ok) return null

  const html = await response.text()
  return extractVideoFromHTML(html)
}

async function fetchViaRegularScrape(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  })

  if (!response.ok) return null

  const html = await response.text()
  return extractVideoFromHTML(html)
}

function extractVideoFromJSON(data: any) {
  try {
    // Navigate through possible JSON structures
    const items = data?.items || data?.graphql?.shortcode_media || data?.data?.shortcode_media
    
    if (Array.isArray(items) && items.length > 0) {
      const item = items[0]
      const videoVersions = item.video_versions
      const imageVersions = item.image_versions2?.candidates
      
      if (videoVersions && videoVersions.length > 0) {
        return {
          video_url: videoVersions[0].url,
          thumbnail: imageVersions?.[0]?.url || item.display_url,
          quality: "HD",
          duration: item.video_duration 
            ? `${Math.floor(item.video_duration / 60)}:${String(Math.floor(item.video_duration % 60)).padStart(2, "0")}`
            : undefined,
        }
      }
    } else if (items) {
      // Single item structure
      const videoUrl = items.video_url
      const thumbnail = items.display_url || items.thumbnail_src
      
      if (videoUrl) {
        return {
          video_url: videoUrl,
          thumbnail: thumbnail,
          quality: "HD",
          duration: items.video_duration 
            ? `${Math.floor(items.video_duration / 60)}:${String(Math.floor(items.video_duration % 60)).padStart(2, "0")}`
            : undefined,
        }
      }
    }
  } catch (e) {
    console.log("Error extracting from JSON:", e)
  }
  return null
}

function extractVideoFromHTML(html: string) {
  // Clean up HTML entities first
  const cleanHtml = html.replace(/\\u0026/g, "&").replace(/\\u002F/g, "/").replace(/\\/g, "")

  // Multiple patterns to try for video URLs
  const videoPatterns = [
    /"video_url":"([^"]+)"/,
    /"playback_url":"([^"]+)"/,
    /"src":"([^"]+\.mp4[^"]*)"/,
    /"videoUrl":"([^"]+)"/,
    /property="og:video:secure_url"[^>]*content="([^"]+)"/,
    /property="og:video"[^>]*content="([^"]+)"/,
    /meta[^>]*property="og:video"[^>]*content="([^"]+)"/,
    /"video_versions":\[{"url":"([^"]+)"/,
    /"video_dash_manifest":"[^"]*","video_url":"([^"]+)"/,
    /videoUrl['"]\s*:\s*['"]([^'"]+)['"]/,
    /"contentUrl":"([^"]+\.mp4[^"]*)"/,
    /src="([^"]+\.mp4[^"]*)"/,
    /"url":"([^"]+\.mp4[^"]*)"/
  ]

  const thumbnailPatterns = [
    /"display_url":"([^"]+)"/,
    /"thumbnail_src":"([^"]+)"/,
    /"thumbnail_url":"([^"]+)"/,
    /property="og:image"[^>]*content="([^"]+)"/,
    /meta[^>]*property="og:image"[^>]*content="([^"]+)"/,
    /"image_versions2":{"candidates":\[{"url":"([^"]+)"/,
    /thumbnailUrl['"]\s*:\s*['"]([^'"]+)['"]/
  ]

  let videoUrl = null
  let thumbnail = null

  // Try to find video URL
  for (const pattern of videoPatterns) {
    const match = cleanHtml.match(pattern)
    if (match && match[1]) {
      const url = match[1]
      // Validate it's a proper video URL
      if (url.includes('.mp4') || url.includes('video') || url.includes('scontent')) {
        videoUrl = url
        break
      }
    }
  }

  // Try to find thumbnail
  for (const pattern of thumbnailPatterns) {
    const match = cleanHtml.match(pattern)
    if (match && match[1]) {
      thumbnail = match[1]
      break
    }
  }

  // If no video found, try to extract from script tags
  if (!videoUrl) {
    const scriptMatches = cleanHtml.match(/<script[^>]*>(.*?)<\/script>/g)
    if (scriptMatches) {
      for (const script of scriptMatches) {
        for (const pattern of videoPatterns) {
          const match = script.match(pattern)
          if (match && match[1]) {
            const url = match[1]
            if (url.includes('.mp4') || url.includes('video') || url.includes('scontent')) {
              videoUrl = url
              break
            }
          }
        }
        if (videoUrl) break
      }
    }
  }

  if (!videoUrl) return null

  return {
    video_url: videoUrl,
    thumbnail: thumbnail,
    quality: "HD",
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown"

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait a moment and try again." },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 })
    }

    // ============================================
    // ROUTING LOGIC: FACEBOOK OR INSTAGRAM
    // ============================================
    
    // Check if it's a Facebook URL
    if (isFacebookURL(url)) {
      console.log("[FB] Detected Facebook URL, using Facebook downloader")
      
      try {
        const videoData = await fetchFacebookVideo(url)

        if (!videoData || !videoData.video_url) {
          console.log("[FB] No video data returned")
          return NextResponse.json(
            { success: false, error: "Unable to fetch Facebook video. The post may be private or unavailable." },
            { status: 404 },
          )
        }

        console.log("[FB] Successfully returning video data")
        return NextResponse.json({
          success: true,
          ...videoData,
        })
      } catch (fbError) {
        console.error("[FB] Facebook download error:", fbError)
        return NextResponse.json(
          { success: false, error: fbError instanceof Error ? fbError.message : "Facebook video download failed" },
          { status: 500 },
        )
      }
    }

    // ============================================
    // INSTAGRAM LOGIC (UNCHANGED)
    // ============================================

    // Validate Instagram URL format
    const validPatterns = [
      /^https?:\/\/(www\.)?instagram\.com\/p\/[\w-]+/,
      /^https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+/,
      /^https?:\/\/(www\.)?instagram\.com\/reels\/[\w-]+/,
      /^https?:\/\/(www\.)?instagram\.com\/tv\/[\w-]+/,
    ]

    if (!validPatterns.some((p) => p.test(url))) {
      return NextResponse.json({ success: false, error: "Invalid Instagram or Facebook URL format" }, { status: 400 })
    }

    const videoData = await fetchInstagramData(url)

    if (!videoData || !videoData.video_url) {
      return NextResponse.json(
        { success: false, error: "Unable to fetch video. The post may be private or unavailable." },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      ...videoData,
    })
  } catch (error) {
    console.error("[v0] Error processing request:", error)

    const message = error instanceof Error ? error.message : "An unexpected error occurred"

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
