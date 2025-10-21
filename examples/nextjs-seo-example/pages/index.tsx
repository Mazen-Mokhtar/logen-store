import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { SEOHead } from '../components/SEOHead';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { HealthStatus } from '../components/HealthStatus';
import { useSEO } from '../hooks/useSEO';

interface HomePageProps {
  initialSeoData?: any;
  locale: string;
}

export default function HomePage({ initialSeoData, locale }: HomePageProps) {
  const [showHealthMetrics, setShowHealthMetrics] = useState(false);
  const { seoData, loading, error, generateStructuredData } = useSEO({
    locale,
    enabled: !initialSeoData, // Only fetch if we don't have initial data
  });

  // Use initial data from SSR or fetched data from hook
  const finalSeoData = initialSeoData || seoData;

  // Generate structured data for the homepage
  const handleGenerateStructuredData = () => {
    generateStructuredData('WebSite', {
      name: process.env.NEXT_PUBLIC_SITE_NAME || 'Your Site',
      url: process.env.NEXT_PUBLIC_SITE_URL,
      description: finalSeoData?.description || 'Welcome to our website',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${process.env.NEXT_PUBLIC_SITE_URL}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });
  };

  return (
    <>
      <SEOHead 
        seoData={finalSeoData}
        title="Welcome to Our Site"
        description="Discover amazing content and features on our platform"
      />
      
      <div className="container">
        <header className="header">
          <div className="header-content">
            <h1>Welcome to Our Site</h1>
            <LanguageSwitcher />
          </div>
          
          {/* Health Status Indicator */}
          <div className="health-indicator">
            <HealthStatus 
              showMetrics={showHealthMetrics} 
              interval={30000} 
            />
            <button 
              onClick={() => setShowHealthMetrics(!showHealthMetrics)}
              className="toggle-metrics-btn"
            >
              {showHealthMetrics ? 'Hide' : 'Show'} Metrics
            </button>
          </div>
        </header>

        <main className="main-content">
          <section className="hero">
            <h2>Enhanced SEO & Health Monitoring</h2>
            <p>
              This example demonstrates integration with our backend SEO and health check system.
              The page automatically fetches SEO metadata, hreflang tags, and monitors system health.
            </p>
          </section>

          <section className="features">
            <h3>Features Demonstrated</h3>
            <div className="feature-grid">
              <div className="feature-card">
                <h4>🔍 SEO Optimization</h4>
                <p>Automatic meta tags, Open Graph, Twitter Cards, and structured data</p>
                <ul>
                  <li>Dynamic title and description</li>
                  <li>Hreflang tags for internationalization</li>
                  <li>Canonical URLs</li>
                  <li>Structured data (JSON-LD)</li>
                </ul>
              </div>

              <div className="feature-card">
                <h4>🌍 Internationalization</h4>
                <p>Multi-language support with automatic locale detection</p>
                <ul>
                  <li>Language switcher component</li>
                  <li>Localized URLs</li>
                  <li>RTL language support</li>
                  <li>Locale-specific SEO metadata</li>
                </ul>
              </div>

              <div className="feature-card">
                <h4>💚 Health Monitoring</h4>
                <p>Real-time system health checks and metrics</p>
                <ul>
                  <li>Basic health status</li>
                  <li>Detailed system metrics</li>
                  <li>Database connectivity</li>
                  <li>Memory and CPU usage</li>
                </ul>
              </div>

              <div className="feature-card">
                <h4>⚡ Performance</h4>
                <p>Optimized for speed and user experience</p>
                <ul>
                  <li>Server-side rendering</li>
                  <li>API response caching</li>
                  <li>Image optimization</li>
                  <li>Lazy loading</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="seo-debug">
            <h3>SEO Debug Information</h3>
            {loading && <p>Loading SEO data...</p>}
            {error && <p className="error">Error: {error}</p>}
            
            {finalSeoData && (
              <div className="seo-data">
                <h4>Current SEO Data:</h4>
                <pre>{JSON.stringify(finalSeoData, null, 2)}</pre>
                
                <button 
                  onClick={handleGenerateStructuredData}
                  className="generate-structured-data-btn"
                >
                  Generate Structured Data
                </button>
              </div>
            )}
          </section>

          <section className="api-examples">
            <h3>API Integration Examples</h3>
            <p>
              This page demonstrates various API integrations:
            </p>
            <ul>
              <li><strong>GET /seo/metadata</strong> - Fetch SEO metadata for current page</li>
              <li><strong>GET /seo/locale/hreflang</strong> - Get hreflang tags</li>
              <li><strong>GET /seo/locale/config</strong> - Fetch locale configuration</li>
              <li><strong>GET /health</strong> - Basic health check</li>
              <li><strong>GET /health/health-metrics</strong> - Detailed system metrics</li>
            </ul>
          </section>
        </main>

        <footer className="footer">
          <p>&copy; 2024 Your Site. All rights reserved.</p>
          <p>Powered by Next.js with enhanced SEO and health monitoring.</p>
        </footer>
      </div>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }

        .header-content h1 {
          margin: 0;
          color: #333;
        }

        .health-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .toggle-metrics-btn {
          padding: 8px 16px;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .toggle-metrics-btn:hover {
          background: #0051cc;
        }

        .hero {
          text-align: center;
          margin-bottom: 60px;
        }

        .hero h2 {
          font-size: 2.5rem;
          margin-bottom: 20px;
          color: #333;
        }

        .hero p {
          font-size: 1.2rem;
          color: #666;
          max-width: 800px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .features {
          margin-bottom: 60px;
        }

        .features h3 {
          text-align: center;
          font-size: 2rem;
          margin-bottom: 40px;
          color: #333;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 30px;
        }

        .feature-card {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .feature-card h4 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #333;
          font-size: 1.3rem;
        }

        .feature-card p {
          color: #666;
          margin-bottom: 15px;
        }

        .feature-card ul {
          color: #555;
          padding-left: 20px;
        }

        .feature-card li {
          margin-bottom: 5px;
        }

        .seo-debug, .api-examples {
          margin-bottom: 40px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .seo-debug h3, .api-examples h3 {
          margin-top: 0;
          color: #333;
        }

        .seo-data pre {
          background: #fff;
          padding: 15px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 12px;
          border: 1px solid #ddd;
        }

        .generate-structured-data-btn {
          margin-top: 10px;
          padding: 10px 20px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .generate-structured-data-btn:hover {
          background: #218838;
        }

        .error {
          color: #dc3545;
          font-weight: bold;
        }

        .footer {
          text-align: center;
          padding-top: 40px;
          border-top: 1px solid #eee;
          color: #666;
        }

        .footer p {
          margin: 5px 0;
        }

        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            gap: 20px;
          }

          .hero h2 {
            font-size: 2rem;
          }

          .feature-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  try {
    // Fetch initial SEO data on the server
    const seoResponse = await fetch(
      `${process.env.API_BASE_URL}/seo/metadata?path=/&locale=${locale}`
    );
    
    let initialSeoData = null;
    if (seoResponse.ok) {
      initialSeoData = await seoResponse.json();
    }

    return {
      props: {
        initialSeoData,
        locale: locale || 'en',
      },
    };
  } catch (error) {
    console.error('Failed to fetch initial SEO data:', error);
    
    return {
      props: {
        locale: locale || 'en',
      },
    };
  }
};