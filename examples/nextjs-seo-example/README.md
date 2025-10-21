# Next.js SEO & Health Check Integration Example

This is a comprehensive example demonstrating how to integrate with the enhanced SEO and health check system from your backend API. The example showcases best practices for SEO optimization, internationalization, and system monitoring in a Next.js application.

## Features

### 🔍 SEO Integration
- **Dynamic SEO Meta Tags**: Automatically generated based on page content and API data
- **Open Graph & Twitter Cards**: Rich social media previews
- **Structured Data**: JSON-LD schema markup for better search engine understanding
- **Canonical URLs**: Proper URL canonicalization
- **Hreflang Tags**: Multi-language SEO support

### 🌍 Internationalization
- **Multi-language Support**: English, Spanish, and French locales
- **Dynamic Language Switching**: Seamless locale transitions
- **Localized URLs**: SEO-friendly localized paths
- **RTL Support**: Right-to-left language compatibility
- **Currency & Date Formatting**: Locale-specific formatting

### 🏥 Health Monitoring
- **Real-time Health Status**: Live system health monitoring
- **Detailed Health Checks**: Database, Redis, memory, and disk monitoring
- **System Metrics**: CPU, memory, and application performance metrics
- **Auto-refresh**: Configurable automatic health status updates
- **Visual Indicators**: Color-coded status indicators

### ⚡ Performance & Best Practices
- **Server-Side Rendering**: SEO-optimized initial page loads
- **TypeScript**: Full type safety and better developer experience
- **Responsive Design**: Mobile-first responsive components
- **Accessibility**: WCAG compliant components
- **Error Handling**: Comprehensive error boundaries and fallbacks

## Getting Started

### Prerequisites
- Node.js 16.x or later
- npm or yarn
- Your backend API running (with the enhanced SEO and health check endpoints)

### Installation

1. **Clone or copy the example project**:
   ```bash
   cd examples/nextjs-seo-example
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   # Backend API Configuration
   NEXT_PUBLIC_API_URL=http://localhost:3001
   
   # Site Configuration
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_SITE_NAME=My E-commerce Site
   NEXT_PUBLIC_DEFAULT_LOCALE=en
   
   # Optional: Analytics
   NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
examples/nextjs-seo-example/
├── components/
│   ├── SEOHead.tsx          # SEO meta tags component
│   ├── LanguageSwitcher.tsx # Language switching component
│   └── HealthStatus.tsx     # Health monitoring component
├── hooks/
│   ├── useSEO.ts           # SEO data management hook
│   ├── useLocale.ts        # Internationalization hook
│   └── useHealth.ts        # Health monitoring hook
├── lib/
│   └── api-client.ts       # API client with interceptors
├── pages/
│   ├── api/
│   │   ├── health.ts       # Health check API route
│   │   └── seo/[...slug].ts # SEO API routes
│   ├── _app.tsx            # App configuration
│   └── index.tsx           # Home page example
├── types/
│   └── index.ts            # TypeScript type definitions
├── .env.example            # Environment variables template
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## Usage Examples

### SEO Integration

#### Basic SEO Setup
```tsx
import { SEOHead } from '../components/SEOHead';
import { useSEO } from '../hooks/useSEO';

export default function MyPage() {
  const { seoData, loading } = useSEO('/my-page');

  return (
    <>
      <SEOHead seoData={seoData} path="/my-page" />
      <main>
        <h1>My Page</h1>
        {/* Your page content */}
      </main>
    </>
  );
}
```

#### Server-Side SEO Data
```tsx
import { GetServerSideProps } from 'next';
import { SEOData } from '../types';

export const getServerSideProps: GetServerSideProps = async ({ locale, query }) => {
  try {
    const response = await fetch(`${process.env.API_URL}/seo/metadata?path=${query.path}&locale=${locale}`);
    const seoData: SEOData = await response.json();
    
    return {
      props: {
        seoData,
        locale
      }
    };
  } catch (error) {
    return {
      props: {
        seoData: null,
        locale
      }
    };
  }
};
```

### Health Monitoring

#### Basic Health Status
```tsx
import { HealthStatus } from '../components/HealthStatus';

export default function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <HealthStatus autoRefresh={true} refreshInterval={30000} />
    </div>
  );
}
```

#### Custom Health Hook Usage
```tsx
import { useHealth } from '../hooks/useHealth';

export default function SystemStatus() {
  const { 
    basicHealth, 
    isHealthy, 
    hasWarnings, 
    hasCriticalIssues,
    refreshHealth 
  } = useHealth(true, 15000); // Auto-refresh every 15 seconds

  return (
    <div>
      <h2>System Status: {isHealthy ? '✅ Healthy' : '❌ Issues Detected'}</h2>
      {hasWarnings && <p>⚠️ Warnings detected</p>}
      {hasCriticalIssues && <p>🚨 Critical issues detected</p>}
      <button onClick={refreshHealth}>Refresh Status</button>
    </div>
  );
}
```

### Internationalization

#### Language Switcher
```tsx
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export default function Header() {
  return (
    <header>
      <nav>
        {/* Your navigation */}
        <LanguageSwitcher />
      </nav>
    </header>
  );
}
```

#### Locale Hook Usage
```tsx
import { useLocale } from '../hooks/useLocale';

export default function LocalizedContent() {
  const { 
    currentLocale, 
    formatDate, 
    formatCurrency, 
    getLocalizedUrl,
    isRTL 
  } = useLocale();

  const now = new Date();
  const price = 29.99;

  return (
    <div dir={isRTL() ? 'rtl' : 'ltr'}>
      <p>Current locale: {currentLocale?.nativeName}</p>
      <p>Date: {formatDate(now)}</p>
      <p>Price: {formatCurrency(price)}</p>
      <a href={getLocalizedUrl('/products')}>
        View Products
      </a>
    </div>
  );
}
```

## API Integration

### Backend API Endpoints

The example expects your backend API to provide these endpoints:

#### SEO Endpoints
- `GET /seo/metadata?path={path}&locale={locale}` - Get SEO metadata for a page
- `GET /seo/locale/hreflang?path={path}` - Get hreflang tags
- `GET /seo/locale/config` - Get locale configuration
- `GET /seo/locale/urls` - Get localized URL mappings

#### Health Check Endpoints
- `GET /health` - Basic health status
- `GET /health/detailed` - Detailed health checks
- `GET /health/health-metrics` - System metrics

### Mock API Routes

For development and testing, the example includes mock API routes:

- `/api/health` - Mock health check endpoint
- `/api/seo/[...slug]` - Mock SEO endpoints

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | Yes | - |
| `NEXT_PUBLIC_SITE_URL` | Your site's public URL | Yes | - |
| `NEXT_PUBLIC_SITE_NAME` | Site name for SEO | Yes | - |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Default language locale | No | `en` |
| `NEXT_PUBLIC_HEALTH_CHECK_INTERVAL` | Health check refresh interval (ms) | No | `30000` |
| `NEXT_PUBLIC_ANALYTICS_ID` | Analytics tracking ID | No | - |

### Next.js Configuration

The `next.config.js` includes:
- Internationalization setup
- API rewrites to your backend
- Security headers
- Image optimization
- Performance optimizations

## Customization

### Adding New Locales

1. **Update the backend locale configuration**
2. **Add translations to your API responses**
3. **Update the mock data** in `/pages/api/seo/[...slug].ts`
4. **Add locale-specific styling** if needed

### Custom SEO Fields

1. **Extend the `SEOData` interface** in `/types/index.ts`
2. **Update the `useSEO` hook** to handle new fields
3. **Modify the `SEOHead` component** to render new meta tags
4. **Update your backend API** to provide the new fields

### Additional Health Checks

1. **Extend the health check types** in `/types/index.ts`
2. **Update the `useHealth` hook** for new endpoints
3. **Modify the `HealthStatus` component** to display new metrics
4. **Add corresponding backend endpoints**

## Best Practices

### SEO
- Always provide fallback SEO data for error cases
- Use server-side rendering for initial SEO data
- Implement proper canonical URLs
- Include structured data for rich snippets
- Optimize images with proper alt tags and lazy loading

### Performance
- Use React.memo for expensive components
- Implement proper loading states
- Cache API responses when appropriate
- Optimize bundle size with dynamic imports
- Use Next.js Image component for optimized images

### Accessibility
- Provide proper ARIA labels
- Ensure keyboard navigation works
- Use semantic HTML elements
- Test with screen readers
- Maintain proper color contrast ratios

### Error Handling
- Implement error boundaries
- Provide meaningful error messages
- Have fallback UI for failed API calls
- Log errors for debugging
- Gracefully degrade functionality

## Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production
Make sure to set all required environment variables in your deployment platform:
- Update `NEXT_PUBLIC_API_URL` to your production API
- Set `NEXT_PUBLIC_SITE_URL` to your production domain
- Configure analytics and monitoring IDs

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Check if your backend API is running
   - Verify the `NEXT_PUBLIC_API_URL` environment variable
   - Check CORS configuration on your backend

2. **SEO Data Not Loading**
   - Verify SEO API endpoints are working
   - Check browser network tab for API errors
   - Ensure proper error handling in components

3. **Locale Switching Not Working**
   - Check Next.js i18n configuration
   - Verify locale API endpoints
   - Ensure proper URL structure

4. **Health Checks Failing**
   - Verify health check endpoints are accessible
   - Check if auto-refresh is causing too many requests
   - Review error messages in browser console

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will show additional console logs for API calls and state changes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This example is provided as-is for educational and development purposes. Feel free to use and modify as needed for your projects.

## Support

For questions and support:
- Check the main project documentation
- Review the API documentation
- Open an issue in the main repository
- Check the troubleshooting section above

---

**Happy coding!** 🚀