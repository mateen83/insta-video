"use client"

import type React from "react"

import { useState } from "react"
import {
  Download,
  Instagram,
  Facebook,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Video,
  FileVideo,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { VideoResult } from "@/components/video-result"

interface VideoData {
  success: boolean
  thumbnail?: string
  video_url?: string
  quality?: string
  duration?: string
  error?: string
}

export function VideoDownloader() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { label: "How it works", href: "#how-it-works" },
    { label: "Platforms", href: "#supported-platforms" },
    { label: "Benefits", href: "#why-choose" },
    { label: "FAQ", href: "#faq" },
    { label: "Contact", href: "#contact" },
  ]

  const validateInstagramUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?instagram\.com\/p\/[\w-]+\/?/,
      /^https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+\/?/,
      /^https?:\/\/(www\.)?instagram\.com\/tv\/[\w-]+\/?/,
      /^https?:\/\/(www\.)?instagram\.com\/reels\/[\w-]+\/?/,
    ]
    return patterns.some((pattern) => pattern.test(url))
  }

  const validateFacebookUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?facebook\.com\/.*\/videos\//,
      /^https?:\/\/(www\.)?facebook\.com\/reel\//,
      /^https?:\/\/(www\.)?facebook\.com\/watch\//,
      /^https?:\/\/fb\.watch\//,
    ]
    return patterns.some((pattern) => pattern.test(url))
  }

  const validateUrl = (url: string): boolean => {
    return validateInstagramUrl(url) || validateFacebookUrl(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setVideoData(null)

    if (!url.trim()) {
      setError("Please enter an Instagram or Facebook URL")
      return
    }

    if (!validateUrl(url)) {
      setError("Invalid URL. Please enter a valid Instagram or Facebook video/reel link.")
      return
    }

    setLoading(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || `Server error: ${response.status}`)
        return
      }

      const data = await response.json()

      if (!data.success) {
        setError(data.error || "Failed to fetch video. Please try again.")
        return
      }

      if (!data.video_url) {
        setError("No video found. This might be an image post or the video is unavailable.")
        return
      }

      setVideoData(data)
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError("Request timed out. Please try again.")
        } else {
          setError("Network error. Please check your connection and try again.")
        }
      } else {
        setError("Unable to connect to server. Please try again later.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text && validateUrl(text)) {
        setUrl(text)
        setError(null)
      }
    } catch {
      // Clipboard access denied
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 pb-10 pt-4 md:pt-6 md:pb-14">
      {/* Hero navigation / header */}
      <header className="fixed inset-x-0 top-5 z-40 pl-[15px] pr-[15px]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground tracking-tight">
                Instant Social Downloader
              </p>
              <p className="text-xs text-muted-foreground">Instagram • Facebook</p>
            </div>
          </div>

          <nav className="hidden items-center gap-5 text-sm text-muted-foreground min-[900px]:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-primary transition">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex">
            <a
              href="#video-downloader-hero"
              className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground"
            >
              Download now
            </a>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-border p-2 text-foreground min-[900px]:hidden"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="mx-auto mt-2 flex w-full max-w-5xl flex-col gap-2 rounded-2xl border border-border/60 bg-card/80 p-4 text-sm text-muted-foreground min-[900px]:hidden">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 hover:bg-primary/10 hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#video-downloader-hero"
              className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground"
              onClick={() => setMenuOpen(false)}
            >
              Download now
            </a>
          </div>
        )}
      </header>

      {/* Hero copy */}
      <div className="mt-24 mb-10 text-center md:mt-28">
        <div className="mb-5 flex items-center justify-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Instagram className="h-5 w-5 text-primary" />
          </div>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Facebook className="h-5 w-5 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight md:text-4xl lg:text-5xl">
          Instagram & Facebook Video Downloader
        </h1>
        <p className="mt-4 text-base text-muted-foreground md:text-lg">
          Download reels and videos from Instagram & Facebook in seconds. No account, no watermark,
          no hassle.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Paste a public video link from Instagram or Facebook. More platforms coming soon.
        </p>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-xl bg-card border-border shadow-xl">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium text-foreground">
                Instagram or Facebook URL
              </label>
              <div className="relative">
                <Input
                  id="url"
                  type="text"
                  placeholder="Paste your video link here..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    setError(null)
                  }}
                  onPaste={handlePaste}
                  className="h-12 pl-4 pr-20 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-primary hover:text-primary/80 px-2 py-1 rounded transition-colors"
                >
                  Paste
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download Video
                </>
              )}
            </Button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Success Result */}
          {videoData && videoData.success && <VideoResult data={videoData} />}
        </CardContent>
      </Card>

      {/* Features */}
      <div className="mt-12 grid grid-cols-1 gap-6 w-full max-w-3xl md:grid-cols-3">
        <FeatureCard
          icon={<Video className="w-5 h-5" />}
          title="Multiple Platforms"
          description="Instagram & Facebook Reels, Videos, IGTV"
        />
        <FeatureCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          title="High Quality"
          description="Download videos in original quality"
        />
        <FeatureCard
          icon={<FileVideo className="w-5 h-5" />}
          title="Fast & Secure"
          description="No data stored, instant downloads"
        />
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>Only public Instagram and Facebook videos can be downloaded</p>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center text-center p-4 rounded-xl bg-card/50 border border-border/50">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
        {icon}
      </div>
      <h3 className="font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
