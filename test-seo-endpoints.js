const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testSeoEndpoints() {
  console.log('🧪 Testing SEO API Endpoints for Logen Store\n');

  try {
    // Test 1: GET /seo/metadata endpoint
    console.log('1️⃣ Testing GET /seo/metadata endpoint...');
    
    const metadataTests = [
      { path: '/', locale: 'en', description: 'Homepage in English' },
      { path: '/', locale: 'ar', description: 'Homepage in Arabic' },
      { path: '/products/smartphone', locale: 'en', description: 'Product page in English' },
      { path: '/categories/electronics', locale: 'ar', description: 'Category page in Arabic' },
    ];

    for (const test of metadataTests) {
      try {
        const response = await axios.get(`${BASE_URL}/seo/metadata`, {
          params: {
            path: test.path,
            locale: test.locale,
            includeStructuredData: true,
            includeHreflang: true
          }
        });
        
        console.log(`✅ ${test.description}:`);
        console.log(`   - Title: ${response.data.meta?.title}`);
        console.log(`   - Description: ${response.data.meta?.description}`);
        console.log(`   - Locale: ${response.data.locale}`);
        console.log(`   - Page Type: ${response.data.pageType}`);
        console.log(`   - Has Structured Data: ${!!response.data.structuredData}`);
        console.log(`   - Has Hreflang: ${!!response.data.hreflang}`);
        console.log(`   - Breadcrumbs Count: ${response.data.breadcrumbs?.length || 0}\n`);
      } catch (error) {
        console.log(`❌ ${test.description}: ${error.message}\n`);
      }
    }

    // Test 2: GET /seo/locale/config endpoint
    console.log('2️⃣ Testing GET /seo/locale/config endpoint...');
    try {
      const response = await axios.get(`${BASE_URL}/seo/locale/config`);
      console.log(`✅ Locale Configuration:`);
      console.log(`   - Default Locale: ${response.data.defaultLocale}`);
      console.log(`   - Available Locales: ${response.data.locales?.length || 0}`);
      console.log(`   - Detection Enabled: ${response.data.detectionEnabled}`);
      console.log(`   - Hreflang Enabled: ${response.data.hreflangEnabled}`);
      
      if (response.data.locales) {
        response.data.locales.forEach(locale => {
          console.log(`     • ${locale.code}: ${locale.name} (${locale.nativeName}) - ${locale.direction}`);
        });
      }
      console.log('');
    } catch (error) {
      console.log(`❌ Locale Config: ${error.message}\n`);
    }

    // Test 3: GET /seo/locale/hreflang endpoint
    console.log('3️⃣ Testing GET /seo/locale/hreflang endpoint...');
    
    const hreflangTests = [
      { url: '/', locale: 'en', description: 'Homepage hreflang' },
      { url: '/products/smartphone', locale: 'ar', description: 'Product page hreflang' },
      { url: 'https://logenstore.com/categories/electronics', locale: 'en', description: 'Full URL hreflang' },
    ];

    for (const test of hreflangTests) {
      try {
        const response = await axios.get(`${BASE_URL}/seo/locale/hreflang`, {
          params: {
            url: test.url,
            locale: test.locale,
            includeDefault: true
          }
        });
        
        console.log(`✅ ${test.description}:`);
        console.log(`   - Current URL: ${response.data.currentUrl}`);
        console.log(`   - Current Locale: ${response.data.currentLocale}`);
        console.log(`   - Hreflang Tags: ${response.data.hreflangTags?.length || 0}`);
        
        if (response.data.hreflangTags) {
          response.data.hreflangTags.forEach(tag => {
            console.log(`     • ${tag.hreflang}: ${tag.href}`);
          });
        }
        console.log('');
      } catch (error) {
        console.log(`❌ ${test.description}: ${error.message}\n`);
      }
    }

    // Test 4: Error handling
    console.log('4️⃣ Testing error handling...');
    
    try {
      await axios.get(`${BASE_URL}/seo/metadata`); // Missing required path parameter
    } catch (error) {
      if (error.response?.status === 400) {
        console.log(`✅ Bad Request handling: ${error.response.data.message}`);
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }

    try {
      await axios.get(`${BASE_URL}/seo/metadata`, {
        params: { path: '/', locale: 'invalid' }
      }); // Invalid locale
    } catch (error) {
      if (error.response?.status === 400) {
        console.log(`✅ Invalid locale handling: ${error.response.data.message}`);
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }

    console.log('\n🎉 SEO API testing completed!');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Performance test
async function performanceTest() {
  console.log('\n⚡ Performance Testing...');
  
  const startTime = Date.now();
  const promises = [];
  
  // Test concurrent requests
  for (let i = 0; i < 10; i++) {
    promises.push(
      axios.get(`${BASE_URL}/seo/metadata`, {
        params: { path: '/', locale: 'en' }
      })
    );
  }
  
  try {
    await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ 10 concurrent requests completed in ${duration}ms`);
    console.log(`   Average response time: ${duration / 10}ms per request`);
  } catch (error) {
    console.log(`❌ Performance test failed: ${error.message}`);
  }
}

// Run tests
async function runAllTests() {
  await testSeoEndpoints();
  await performanceTest();
}

runAllTests().catch(console.error);