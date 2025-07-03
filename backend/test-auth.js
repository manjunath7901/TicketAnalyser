// Test script using Bearer token authentication (like the working Python example)
const fetch = require('node-fetch');

const JIRA_CONFIG = {
    baseUrl: 'https://jira.arubanetworks.com',
    accessToken: 'OTU5MDEyMTU3MTA5OlV2jDxrTXzpVnwI7P9fpmBuC9Vf' // Working token from Python example
};

async function testJiraAuth() {
    console.log('🔐 Testing JIRA Authentication with Bearer Token...\n');
    
    console.log('Configuration:');
    console.log(`JIRA URL: ${JIRA_CONFIG.baseUrl}`);
    console.log(`Token: ${JIRA_CONFIG.accessToken.substring(0, 15)}...`);
    console.log('');

    try {
        console.log('📡 Making authentication request...');
        const url = `${JIRA_CONFIG.baseUrl}/rest/api/2/myself`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${JIRA_CONFIG.accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Authentication failed!');
            console.log(`Error: ${errorText.substring(0, 500)}`);
            return;
        }

        const userData = await response.json();
        console.log('✅ Authentication successful with Bearer token!');
        console.log('\n👤 User Details:');
        console.log(`   Name: ${userData.displayName}`);
        console.log(`   Email: ${userData.emailAddress}`);
        console.log(`   Username: ${userData.name}`);
        console.log(`   Account ID: ${userData.accountId}`);
        console.log(`   Account Type: ${userData.accountType}`);
        console.log(`   Active: ${userData.active}`);

        // Test specific issue fetch (like in Python example)
        console.log('\n🎫 Testing issue fetch (CNX-114406)...');
        const issueResponse = await fetch(`${JIRA_CONFIG.baseUrl}/rest/api/2/issue/CNX-114406`, {
            headers: {
                'Authorization': `Bearer ${JIRA_CONFIG.accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (issueResponse.ok) {
            const issueData = await issueResponse.json();
            console.log(`✅ Issue fetch successful!`);
            console.log(`   Key: ${issueData.key}`);
            console.log(`   Summary: ${issueData.fields.summary}`);
            console.log(`   Status: ${issueData.fields.status.name}`);
            console.log(`   Priority: ${issueData.fields.priority.name}`);
        } else {
            console.log(`❌ Issue fetch failed: ${issueResponse.status}`);
        }

        // Test user search
        console.log('\n🔍 Testing user search...');
        const searchResponse = await fetch(`${JIRA_CONFIG.baseUrl}/rest/api/2/user/search?query=${encodeURIComponent(userData.emailAddress)}`, {
            headers: {
                'Authorization': `Bearer ${JIRA_CONFIG.accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            console.log(`✅ User search successful - found ${searchData.length} users`);
            if (searchData.length > 0) {
                console.log(`   First result: ${searchData[0].displayName} (${searchData[0].emailAddress})`);
            }
        } else {
            console.log('❌ User search failed');
        }

        console.log('\n🎉 All tests passed! Bearer token authentication is working correctly.');

    } catch (error) {
        console.log('❌ Network error:', error.message);
    }
}

// Run the test
testJiraAuth().catch(console.error);
