import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate that it's a valid video URL (more permissive)
    const validDomains = ["instagram", "cdninstagram", "fbcdn", "scontent"]
    const isValidUrl = validDomains.some(domain => url.includes(domain)) || url.startsWith("https://")
    
    if (!isValidUrl) {
      return NextResponse.json({ error: "Invalid video URL" }, { status: 400 })
    }

    // Fetch the video through our proxy with better headers
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept": "video/mp4,video/webm,video/*;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        "Referer": "https://www.instagram.com/",
        "Origin": "https://www.instagram.com",
        "Sec-Fetch-Dest": "video",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site"
      },
      redirect: "follow"
    })

    if (!response.ok) {
      console.error(`Failed to fetch video: ${response.status} ${response.statusText}`)
      return NextResponse.json({ error: `Failed to fetch video: ${response.status}` }, { status: response.status })
    }

    const contentType = response.headers.get("content-type") || "video/mp4"
    const contentLength = response.headers.get("content-length")

    // Determine file extension based on content type
    let extension = "mp4"
    if (contentType.includes("webm")) extension = "webm"
    else if (contentType.includes("mov")) extension = "mov"

    // Stream the response
    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="instagram-video-${Date.now()}.${extension}"`,
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*"
    })

    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }

    return new NextResponse(response.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("[v0] Proxy download error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Download failed" 
    }, { status: 500 })
  }
}
