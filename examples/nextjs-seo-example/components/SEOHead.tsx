import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSEO, SEOData } from '../hooks/useSEO';

interface SEOHeadProps {
  seoData?: Partial<SEOData>;
  path?: string;
  locale?: string;
  title?: string;
  description?: string;
  image?: string;
}

export function SEOHead({ 
  seoData: propSeoData, 
  path, 
  locale, 
  title, 
  description, 
  image 
}: SEOHeadProps) {
  const router = useRouter();
  const { seoData: fetchedSeoData, loading } = useSEO({ path, locale });
  
  // Merge prop data with fetched data, giving priority to props
  const seoData = {
    ...fetchedSeoData,
    ...propSeoData,
    ...(title && { title }),
    ...(description && { description }),
    ...(image && { ogImage: image }),
  };
  
  if (loading && !propSeoData && !title) {
    return (
      <Head>
        <title>Loading...</title>
      </Head>
    );
  }

  const currentUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${router.asPath}`;
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Your Site';
  
  // Fallback values
  const finalTitle = seoData?.title || title || 'Page Title';
  const finalDescription = seoData?.description || description || 'Page description';
  const finalImage = seoData?.ogImage || image || `${process.env.NEXT_PUBLIC_SITE_URL}/og-default.jpg`;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      {seoData?.keywords && (
        <meta name="keywords" content={seoData.keywords.join(', ')} />
      )}
      
      {/* Viewport and mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#000000" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={seoData?.canonical || currentUrl} />
      
      {/* Open Graph Tags */}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content={seoData?.ogType || 'website'} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content={router.locale || 'en'} />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={seoData?.twitterCard || 'summary_large_image'} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      
      {/* Additional Twitter tags if available */}
      {process.env.NEXT_PUBLIC_TWITTER_SITE && (
        <meta name="twitter:site" content={process.env.NEXT_PUBLIC_TWITTER_SITE} />
      )}
      
      {/* Hreflang Tags */}
      {seoData?.hreflangTags?.map((tag, index) => (
        <link
          key={index}
          rel="alternate"
          hrefLang={tag.hreflang}
          href={tag.href}
        />
      ))}
      
      {/* Structured Data */}
      {seoData?.structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(seoData.structuredData),
          }}
        />
      )}
      
      {/* Favicon and app icons */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
      
      {/* Preconnect to external domains for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* DNS prefetch for better performance */}
      <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_BASE_URL} />
    </Head>
  );
}