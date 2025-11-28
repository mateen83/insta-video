const axios = require('axios');

// Test script for the Instagram Reel API
async function testAPI() {
  const baseURL = 'http://localhost:3001';
  
  console.log('🧪 Testing Instagram Reel Scraper API...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // Test 2: Missing URL parameter
    console.log('2️⃣ Testing missing URL parameter...');
    try {
      await axios.get(`${baseURL}/api/reel`);
    } catch (error) {
      console.log('✅ Correctly handled missing URL:', error.response.data);
    }
    console.log('');

    // Test 3: Invalid URL
    console.log('3️⃣ Testing invalid URL...');
    try {
      await axios.get(`${baseURL}/api/reel?url=https://example.com`);
    } catch (error) {
      console.log('✅ Correctly handled invalid URL:', error.response.data);
    }
    console.log('');

    // Test 4: Valid Instagram URL (you'll need to replace with a real URL)
    console.log('4️⃣ Testing valid Instagram URL...');
    console.log('⚠️  Please replace the URL below with a real Instagram Reel URL to test');
    
    const testURL = 'https://www.instagram.com/reel/XXXXXXXXX/'; // Replace with real URL
    console.log(`Testing URL: ${testURL}`);
    
    try {
      const response = await axios.get(`${baseURL}/api/reel?url=${encodeURIComponent(testURL)}`);
      console.log('✅ API Response:', response.data);
    } catch (error) {
      console.log('❌ Error (expected with placeholder URL):', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAPI();
}

module.exports = testAPI;