// SEO Types
export interface SEOData {
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  openGraph: OpenGraphData;
  twitter: TwitterCardData;
  structuredData: StructuredData[];
  hreflang: HreflangTag[];
}

export interface OpenGraphData {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  siteName: string;
  locale?: string;
  alternateLocales?: string[];
}

export interface TwitterCardData {
  card: 'summary' | 'summary_large_image' | 'app' | 'player';
  title: string;
  description: string;
  image: string;
  creator: string;
  site?: string;
}

export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export interface HreflangTag {
  hreflang: string;
  href: string;
}

// Health Check Types
export interface BasicHealthResponse {
  status: 'ok' | 'error';
  uptime: number;
  version: string;
  environment: string;
  nodeVersion: string;
  timestamp: string;
  message?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  message?: string;
  responseTime?: number;
  details?: Record<string, any>;
}

export interface DetailedHealthResponse {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    memory: HealthCheckResult;
    disk: HealthCheckResult;
    externalServices?: HealthCheckResult;
  };
  summary: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
  };
}

export interface HealthMetrics {
  memory: {
    heapUsed: number;
    heapTotal: number;
    heapUsedPercent: number;
    rss: number;
    external: number;
    systemTotal: number;
    systemFree: number;
    systemUsedPercent: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  application: {
    activeConnections: number;
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    uptime: number;
  };
  database: {
    connectionStatus: 'connected' | 'disconnected' | 'error';
    activeConnections: number;
    totalQueries: number;
    averageQueryTime: number;
  };
  timestamp: string;
}

// Locale Types
export interface Locale {
  code: string;
  name: string;
  nativeName: string;
  enabled: boolean;
  isDefault: boolean;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  timeFormat: string;
  currency: string;
  flag?: string;
}

export interface LocaleConfig {
  locales: Locale[];
  defaultLocale: string;
  fallbackLocale: string;
  enabledLocales: string[];
}

export interface LocaleUrls {
  [localeCode: string]: {
    [path: string]: string;
  };
}

// API Client Types
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

// Component Props Types
export interface SEOHeadProps {
  seoData?: Partial<SEOData>;
  path?: string;
  locale?: string;
}

export interface HealthStatusProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showDetails?: boolean;
  showMetrics?: boolean;
}

export interface LanguageSwitcherProps {
  className?: string;
  showFlags?: boolean;
  showNativeNames?: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

// Hook Return Types
export interface UseSEOReturn {
  seoData: SEOData | null;
  loading: boolean;
  error: string | null;
  updateSEO: (data: Partial<SEOData>) => void;
  refreshSEO: () => Promise<void>;
  generateStructuredData: (type: string, data: Record<string, any>) => StructuredData;
}

export interface UseHealthReturn {
  basicHealth: BasicHealthResponse | null;
  detailedHealth: DetailedHealthResponse | null;
  healthMetrics: HealthMetrics | null;
  loading: boolean;
  error: string | null;
  refreshHealth: () => Promise<void>;
  refreshDetailedHealth: () => Promise<void>;
  refreshHealthMetrics: () => Promise<void>;
  isHealthy: boolean;
  hasWarnings: boolean;
  hasCriticalIssues: boolean;
}

export interface UseLocaleReturn {
  locales: Locale[];
  currentLocale: Locale | null;
  localeConfig: LocaleConfig | null;
  localeUrls: LocaleUrls | null;
  loading: boolean;
  error: string | null;
  switchLocale: (localeCode: string) => Promise<void>;
  getLocalizedUrl: (path: string, localeCode?: string) => string;
  formatDate: (date: Date, localeCode?: string) => string;
  formatCurrency: (amount: number, localeCode?: string) => string;
  isRTL: (localeCode?: string) => boolean;
  refreshLocaleData: () => Promise<void>;
}

// Page Props Types
export interface PageProps {
  seoData?: SEOData;
  locale?: string;
  locales?: string[];
  defaultLocale?: string;
}

export interface GetServerSidePropsContext {
  params?: { [key: string]: string | string[] };
  query: { [key: string]: string | string[] };
  req: any;
  res: any;
  locale?: string;
  locales?: string[];
  defaultLocale?: string;
}

export interface GetStaticPropsContext {
  params?: { [key: string]: string | string[] };
  locale?: string;
  locales?: string[];
  defaultLocale?: string;
  preview?: boolean;
  previewData?: any;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Environment Types
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_SITE_URL: string;
  NEXT_PUBLIC_SITE_NAME: string;
  NEXT_PUBLIC_DEFAULT_LOCALE: string;
  NEXT_PUBLIC_HEALTH_CHECK_INTERVAL?: string;
  NEXT_PUBLIC_ANALYTICS_ID?: string;
}

// Next.js Specific Types
export interface NextPageWithLayout<P = {}, IP = P> {
  (props: P): JSX.Element;
  getLayout?: (page: JSX.Element) => JSX.Element;
}

export interface AppPropsWithLayout {
  Component: NextPageWithLayout;
  pageProps: any;
}

// Error Types
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export interface ErrorPageProps {
  statusCode?: number;
  hasGetInitialPropsRun?: boolean;
  err?: Error;
}

// Form Types (for potential contact/feedback forms)
export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface FormValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: FormValidationError[];
  isSubmitting: boolean;
  isValid: boolean;
}

// Search Types (for potential search functionality)
export interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'page' | 'product' | 'article';
  relevance: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  query: string;
  suggestions?: string[];
}

// Analytics Types (for potential analytics integration)
export interface AnalyticsEvent {
  name: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  customParameters?: Record<string, any>;
}

export interface PageViewEvent {
  page: string;
  title: string;
  locale?: string;
  userId?: string;
  sessionId?: string;
}