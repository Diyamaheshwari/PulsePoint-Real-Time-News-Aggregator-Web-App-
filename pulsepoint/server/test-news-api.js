require('dotenv').config();
const { fetchTopHeadlines, searchNews } = require('./services/newsService');

async function testNewsAPI() {
  console.log('Testing News API...\n');
  
  try {
    console.log('1. Testing Top Headlines...');
    const headlines = await fetchTopHeadlines({
      country: 'us',
      pageSize: 3
    });
    
    console.log('✅ Top Headlines Test Passed!');
    console.log('Sample Headlines:');
    headlines.slice(0, 2).forEach((article, index) => {
      console.log(`\n${index + 1}. ${article.title}`);
      console.log(`   Source: ${article.source?.name || 'N/A'}`);
      console.log(`   Published: ${article.publishedAt}`);
    });
    
    console.log('\n2. Testing News Search...');
    const searchResults = await searchNews('technology', {
      pageSize: 2
    });
    
    console.log('✅ News Search Test Passed!');
    console.log('Search Results:');
    searchResults.slice(0, 2).forEach((article, index) => {
      console.log(`\n${index + 1}. ${article.title}`);
      console.log(`   Source: ${article.source?.name || 'N/A'}`);
      console.log(`   Published: ${article.publishedAt}`);
    });
    
    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

testNewsAPI();
