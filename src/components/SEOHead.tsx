import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: "website" | "article" | "profile" | "event";
  canonicalUrl?: string;
  noindex?: boolean;
  structuredData?: object;
  locale?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  keywords?: string[];
}

const BASE_URL = "https://jiuflow.lovableproject.com";
const DEFAULT_OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/eKRz1NN3QtRy6vwWfmoNTmYXlqu2/social-images/social-1764815287708-Gemini_Generated_Image_o203l3o203l3o203.png";

export const SEOHead = ({
  title,
  description,
  ogImage,
  ogType = "website",
  canonicalUrl,
  noindex = false,
  structuredData,
  locale = "ja_JP",
  publishedTime,
  modifiedTime,
  author,
  keywords,
}: SEOHeadProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper function to update or create meta tag
    const setMetaTag = (selector: string, content: string, attribute = "content") => {
      let element = document.querySelector(selector) as HTMLMetaElement;
      if (element) {
        element.setAttribute(attribute, content);
      } else {
        element = document.createElement("meta");
        const parts = selector.match(/\[([^\]]+)\]/g);
        if (parts) {
          parts.forEach((part) => {
            const [key, value] = part.slice(1, -1).split("=");
            element.setAttribute(key, value?.replace(/"/g, "") || "");
          });
        }
        element.setAttribute(attribute, content);
        document.head.appendChild(element);
      }
    };

    // Helper function to update or create link tag
    const setLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (element) {
        element.href = href;
      } else {
        element = document.createElement("link");
        element.rel = rel;
        element.href = href;
        document.head.appendChild(element);
      }
    };

    // Truncate description to 160 characters for SEO
    const truncatedDescription = description.length > 160 
      ? description.slice(0, 157) + "..." 
      : description;

    // Primary Meta Tags
    setMetaTag('meta[name="description"]', truncatedDescription);
    setMetaTag('meta[name="robots"]', noindex ? "noindex, nofollow" : "index, follow");
    
    if (keywords && keywords.length > 0) {
      setMetaTag('meta[name="keywords"]', keywords.join(", "));
    }
    
    if (author) {
      setMetaTag('meta[name="author"]', author);
    }

    // Canonical URL
    if (canonicalUrl) {
      setLinkTag("canonical", canonicalUrl.startsWith("http") ? canonicalUrl : `${BASE_URL}${canonicalUrl}`);
    }

    // Open Graph Tags
    setMetaTag('meta[property="og:title"]', title);
    setMetaTag('meta[property="og:description"]', truncatedDescription);
    setMetaTag('meta[property="og:type"]', ogType);
    setMetaTag('meta[property="og:image"]', ogImage || DEFAULT_OG_IMAGE);
    setMetaTag('meta[property="og:locale"]', locale);
    
    if (canonicalUrl) {
      setMetaTag('meta[property="og:url"]', canonicalUrl.startsWith("http") ? canonicalUrl : `${BASE_URL}${canonicalUrl}`);
    }

    if (ogType === "article" || ogType === "event") {
      if (publishedTime) {
        setMetaTag('meta[property="article:published_time"]', publishedTime);
      }
      if (modifiedTime) {
        setMetaTag('meta[property="article:modified_time"]', modifiedTime);
      }
      if (author) {
        setMetaTag('meta[property="article:author"]', author);
      }
    }

    // Twitter Card Tags
    setMetaTag('meta[name="twitter:card"]', "summary_large_image");
    setMetaTag('meta[name="twitter:title"]', title);
    setMetaTag('meta[name="twitter:description"]', truncatedDescription);
    setMetaTag('meta[name="twitter:image"]', ogImage || DEFAULT_OG_IMAGE);

    // Structured Data (JSON-LD)
    if (structuredData) {
      // Remove existing dynamic structured data
      const existingScript = document.querySelector('script[data-seo-structured-data]');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-structured-data", "true");
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    // Cleanup function
    return () => {
      const dynamicScript = document.querySelector('script[data-seo-structured-data]');
      if (dynamicScript) {
        dynamicScript.remove();
      }
    };
  }, [title, description, ogImage, ogType, canonicalUrl, noindex, structuredData, locale, publishedTime, modifiedTime, author, keywords]);

  return null;
};

// Helper function to generate tournament structured data
export const generateTournamentStructuredData = (tournament: {
  name: string;
  description?: string | null;
  date_start: string;
  date_end?: string | null;
  location: string;
  venue?: string | null;
  venue_image_url?: string | null;
  organizer: string;
  registration_url?: string | null;
  entry_fee?: string | null;
}) => ({
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": tournament.name,
  "description": tournament.description || `${tournament.name} - ブラジリアン柔術大会`,
  "startDate": tournament.date_start,
  "endDate": tournament.date_end || tournament.date_start,
  "location": {
    "@type": "Place",
    "name": tournament.venue || tournament.location,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": tournament.location,
    },
  },
  "image": tournament.venue_image_url,
  "organizer": {
    "@type": "Organization",
    "name": tournament.organizer,
  },
  "sport": "Brazilian Jiu-Jitsu",
  ...(tournament.registration_url && {
    "offers": {
      "@type": "Offer",
      "url": tournament.registration_url,
      "price": tournament.entry_fee || "0",
      "priceCurrency": "JPY",
      "availability": "https://schema.org/InStock",
    },
  }),
});

// Helper function to generate dojo structured data
export const generateDojoStructuredData = (dojo: {
  name: string;
  description?: string | null;
  location?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  facebook?: string | null;
}) => ({
  "@context": "https://schema.org",
  "@type": "SportsClub",
  "name": dojo.name,
  "description": dojo.description || `${dojo.name} - ブラジリアン柔術道場`,
  "sport": "Brazilian Jiu-Jitsu",
  ...(dojo.location && {
    "address": {
      "@type": "PostalAddress",
      "streetAddress": dojo.location,
    },
  }),
  "logo": dojo.logo_url,
  "image": dojo.cover_image_url || dojo.logo_url,
  ...(dojo.website && { "url": dojo.website }),
  ...(dojo.phone && { "telephone": dojo.phone }),
  ...(dojo.email && { "email": dojo.email }),
  "sameAs": [
    dojo.instagram,
    dojo.facebook,
    dojo.website,
  ].filter(Boolean),
});

// Helper function to generate athlete/celebrity structured data
export const generateAthleteStructuredData = (athlete: {
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  titles?: { title: string }[] | null;
  home_dojo?: string | null;
  social_links?: { instagram?: string; twitter?: string; youtube?: string } | null;
}) => ({
  "@context": "https://schema.org",
  "@type": "Person",
  "name": athlete.display_name,
  "description": athlete.bio || `${athlete.display_name} - ブラジリアン柔術選手`,
  "image": athlete.avatar_url,
  "jobTitle": "ブラジリアン柔術選手",
  "knowsAbout": ["Brazilian Jiu-Jitsu", "Grappling", "Martial Arts"],
  ...(athlete.titles && athlete.titles.length > 0 && {
    "award": athlete.titles.map((t) => t.title),
  }),
  ...(athlete.home_dojo && {
    "worksFor": {
      "@type": "SportsClub",
      "name": athlete.home_dojo,
    },
  }),
  "sameAs": [
    athlete.social_links?.instagram,
    athlete.social_links?.twitter,
    athlete.social_links?.youtube,
  ].filter(Boolean),
});

// Helper function to generate breadcrumb structured data
export const generateBreadcrumbStructuredData = (
  items: { name: string; url: string }[]
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
  })),
});
