import Image from "next/image"
import { VideoDownloader } from "@/components/video-downloader"

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col" id="top">
      {/* Hero + core downloader UI (existing logic, unchanged) */}
      <div id="video-downloader-hero">
        <VideoDownloader />
      </div>

      {/* New marketing / information sections below the hero */}
      <HowItWorksSection />
      <SupportedPlatformsSection />
      <WhyChooseSection />
      <WorksOnAnyDeviceSection />
      <UsageTipsSection />
      <ContactSection />
      <FaqSection />
      <AppFooterSection />
    </main>
  )
}

function SectionWrapper({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <section
      id={id}
      className="w-full border-t border-border/40 bg-background scroll-mt-24"
    >
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
        <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-sm md:p-8">
          {children}
        </div>
      </div>
    </section>
  )
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
}) {
  return (
    <header className="mb-8 text-center md:mb-10">
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-sm text-muted-foreground md:text-base max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </header>
  )
}

function HowItWorksSection() {
  return (
    <SectionWrapper id="how-it-works">
      <SectionHeader
        eyebrow="How it works"
        title="How It Works"
        subtitle="Download any public video in three simple steps."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            step: "Step 1",
            title: "Paste Link",
            description:
              "Copy the video URL from Instagram or Facebook and paste it into the box at the top of the page.",
            icon: "🔗",
          },
          {
            step: "Step 2",
            title: "Preview & Choose Quality",
            description:
              "We fetch the video and show available quality options when the platform supports it.",
            icon: "👀",
          },
          {
            step: "Step 3",
            title: "Download Instantly",
            description:
              "Click the download button to save the MP4 file directly to your device.",
            icon: "⬇️",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="group flex h-full flex-col rounded-2xl border border-border/70 bg-card/60 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
              <span aria-hidden="true">{item.icon}</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {item.step}
            </p>
            <h3 className="mt-1 text-base font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <a
          href="#video-downloader-hero"
          className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-primary/20"
          >
          Try it now
        </a>
      </div>
    </SectionWrapper>
  )
}

function SupportedPlatformsSection() {
  const platforms = [
    {
      name: "Instagram",
      description: "Reels, posts, and IGTV — public content only.",
      status: "Live",
    },
    {
      name: "Facebook",
      description: "Reels and public page videos.",
      status: "Live",
    },
    {
      name: "YouTube",
      description: "Shorts and full videos support is planned.",
      status: "Coming soon",
    },
  ]

  return (
    <SectionWrapper id="supported-platforms">
      <SectionHeader
        eyebrow="Platforms"
        title="Supported Platforms"
        subtitle="Built for the most popular social platforms today, with more on the way."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((p) => (
          <div
            key={p.name}
            className="flex h-full flex-col justify-between rounded-2xl border border-border/70 bg-card p-5"
          >
            <div>
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                {p.name[0]}
              </div>
              <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  p.status === "Live"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Get notified when new platforms are added by bookmarking this page or checking back soon.
      </p>
    </SectionWrapper>
  )
}

function WhyChooseSection() {
  const benefits = [
    {
      title: "Fast & Reliable",
      description:
        "Our infrastructure is tuned to fetch videos in seconds, even for longer reels and HD clips.",
      icon: "⚡",
    },
    {
      title: "Original Quality",
      description:
        "Whenever the platform allows it, we keep the original resolution and clarity of your videos.",
      icon: "HD",
    },
    {
      title: "No Login Required",
      description:
        "You never need to sign in with your social accounts. Just paste a link and you are ready to go.",
      icon: "🔑",
    },
    {
      title: "Privacy‑Friendly",
      description:
        "We do not store your downloads or track the links you paste, beyond what is needed to process the request.",
      icon: "🛡️",
    },
  ]

  return (
    <SectionWrapper id="why-choose">
      <SectionHeader
        eyebrow="Benefits"
        title="Why Choose Our Downloader?"
        subtitle="A simple interface built for speed, quality, and privacy."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {benefits.map((b) => (
          <div key={b.title} className="flex gap-4 rounded-2xl border border-border/60 bg-card/60 p-5">
            <div className="mt-1 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-base">
              <span aria-hidden="true" className="font-semibold">
                {b.icon}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground md:text-base">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        Curious about privacy details? See the FAQ section below for a concise overview.
      </div>
    </SectionWrapper>
  )
}

function WorksOnAnyDeviceSection() {
  return (
    <SectionWrapper id="works-anywhere">
      <SectionHeader
        eyebrow="Compatibility"
        title="Download to Any Device"
        subtitle="Use the downloader on your phone, tablet, or desktop with smooth playback on most modern media players."
      />

      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div className="space-y-5 text-left">
          <p className="text-sm text-muted-foreground">
            All downloads are MP4 files, so you can save them to your camera roll, laptop, or cloud
            storage and watch them whenever you like.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {[
              "Mobile-friendly interface for quick downloads on the go.",
              "No app install required — everything runs in your browser.",
              "Save directly to your device storage or preferred folder.",
              "Share clips to messaging apps or teams in just a couple of taps.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary/80" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90"
            >
              Open on your phone
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:border-primary hover:text-foreground"
            >
              Copy link to share
            </button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border/70 bg-card">
            <Image
              src="/img.jpg"
              alt="Preview of downloads on desktop, tablet and mobile devices"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-border/60 bg-card/80 p-4 text-center text-xs text-muted-foreground">
        Preview how your downloads look across desktop, tablet, and mobile devices — the same simple
        interface everywhere.
      </div>
    </SectionWrapper>
  )
}

function UsageTipsSection() {
  const tips = [
    {
      title: "Save Your Own Reels",
      description:
        "Download your own Instagram or Facebook content for editing, archiving, or reposting on other platforms.",
    },
    {
      title: "Offline Viewing",
      description:
        "Keep tutorials, recipes, or workout videos offline so you can watch them without burning mobile data.",
    },
    {
      title: "Share With Friends & Teams",
      description:
        "Collect reference clips for campaigns, design inspiration, or content brainstorms in one shared folder.",
    },
    {
      title: "Content Inspiration",
      description:
        "Create a personal library of inspirational clips while you plan your next post or marketing idea.",
    },
  ]

  return (
    <SectionWrapper id="usage-tips">
      <SectionHeader
        eyebrow="Use cases"
        title="Smart Ways to Use the Downloader"
        subtitle="Here are a few creator‑friendly ways people use downloaded videos."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {tips.map((t) => (
          <div
            key={t.title}
            className="h-full rounded-2xl border border-border/60 bg-slate-650/60 p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-foreground md:text-base">{t.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Always respect creators&apos; copyrights and each platform&apos;s terms of service.
      </p>
    </SectionWrapper>
  )
}

function ContactSection() {
  return (
    <SectionWrapper id="contact" >
      <SectionHeader
        eyebrow="Contact"
        title="Get in Touch"
        subtitle="Have feedback, questions, or partnership ideas? Send a quick message and we’ll get back to you."
      />

      <div className="grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start">
        <form className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="contact-name" className="text-sm font-medium text-foreground">
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="contact-email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-message" className="text-sm font-medium text-foreground">
              Message
            </label>
            <textarea
              id="contact-message"
              rows={4}
              className="w-full resize-none rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Tell us how we can help…"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Send message
            </button>
            <p className="text-xs text-muted-foreground">
              We reply to most messages within 1–2 business days.
            </p>
          </div>
        </form>

        <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-5 text-sm text-muted-foreground">
          <h3 className="text-sm font-semibold text-foreground">Support & feedback</h3>
          <p>
            Use this form for general questions, feature requests, or business inquiries. For urgent
            technical issues, you can also mention details about the URL or platform that is not
            working.
          </p>
          <p className="text-xs">
            Please do not share passwords or sensitive personal information. We will never ask for
            your social media login details.
          </p>
          <p className="text-xs">
          Our support team typically responds within 24–48 hours. For complex issues, please provide as much context as possible so we can assist you efficiently.
          </p>

          


        </div>
      </div>
    </SectionWrapper>
  )
}

function FaqSection() {
  const faqs = [
    {
      q: "Is this tool free to use?",
      a: "Yes. The downloader is free for personal, non‑commercial use.",
    },
    {
      q: "Can I download private videos?",
      a: "No. Only publicly accessible videos are supported.",
    },
    {
      q: "Do you store my videos or links?",
      a: "We do not store your downloaded files or keep logs of video URLs longer than needed to process your request.",
    },
    {
      q: "The download failed. What can I do?",
      a: "Make sure the video is public, copy the full URL, and try again. Some platforms may temporarily block access.",
    },
    {
      q: "Is it legal to download videos?",
      a: "Always follow each platform’s terms and local laws. Only download videos you own or have permission to save.",
    },
    {
      q: "Do I need to log in?",
      a: "No. You never need to log in with your social media credentials to use this downloader.",
    },
  ]

  return (
    <SectionWrapper id="faq">
      <SectionHeader
        eyebrow="FAQ"
        title="Frequently Asked Questions"
        subtitle="Short answers to the most common questions about using this downloader."
      />

      <div className="space-y-3">
        {faqs.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-border/70 bg-card/60 px-4 py-3 text-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="font-medium text-foreground">{item.q}</span>
              <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
              <span className="hidden text-xs text-muted-foreground group-open:inline">Hide</span>
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        This site is not affiliated with Instagram, Facebook, or Meta Platforms, Inc. Always follow
        local laws and each platform&apos;s terms of service.
      </p>

      <p className="mt-2 text-xs text-muted-foreground">
        Still have questions? You can add a simple contact link or email here to let people reach
        out.
      </p>
    </SectionWrapper>
  )
}

function AppFooterSection() {
  return (
    <footer className="w-full border-t border-border/60 bg-background/95">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3 md:max-w-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Social Video Downloader
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            This tool was built to make it easier to save and organize your favorite public videos
            from social platforms.
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-6 text-sm min-[900px]:flex-row min-[900px]:justify-end">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Navigation
            </h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground">
                  Home
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-foreground">
                  How it works
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Legal
            </h3>
            <p className="text-xs text-muted-foreground">
              This site is not affiliated with Instagram, Facebook, or Meta Platforms, Inc. Please
              respect copyrights and platform terms.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Follow
            </h3>
            <div className="flex gap-2">
              {["IG", "FB", "YT", "X"].map((label) => (
                <a
                  key={label}
                  href="#"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                  aria-label={label}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
