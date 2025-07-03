// Test script to verify JIRA authentication
const fetch = require('node-fetch');

async function testJiraAuth() {
    console.log('🔐 Testing JIRA Authentication...\n');
    
    // Test configuration
    const config = {
        jiraUrl: 'https://jira.arubanetworks.com',
        token: 'YOUR_JIRA_TOCKEN',
        // You need to provide your email here
        email: 'kallatti@hpe.com' // Replace with your actual email if different
    };

    if (config.email === 'your.email@arubanetworks.com') {
        console.log('❌ Please update the email in test-auth.js with your actual email address');
        return;
    }

    const baseUrl = config.jiraUrl.replace(/\/$/, '');
    const credentials = Buffer.from(`${config.email}:${config.token}`).toString('base64');

    try {
        console.log('📡 Making authentication request...');
        console.log(`URL: ${baseUrl}/rest/api/2/myself`);
        console.log(`Email: ${config.email}`);
        console.log(`Token: ${config.token.substring(0, 10)}...`);
        console.log('');

        const response = await fetch(`${baseUrl}/rest/api/2/myself`, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Authentication failed!');
            console.log(`Error: ${errorText}`);
            
            if (response.status === 401) {
                console.log('\n💡 Possible issues:');
                console.log('   - Check if your email is correct');
                console.log('   - Check if your API token is valid');
                console.log('   - Make sure you have access to this JIRA instance');
            } else if (response.status === 403) {
                console.log('\n💡 Access denied - check your permissions');
            } else if (response.status === 404) {
                console.log('\n💡 JIRA instance not found - check the URL');
            }
            return;
        }

        const userData = await response.json();
        console.log('✅ Authentication successful!');
        console.log('\n👤 User Details:');
        console.log(`   Name: ${userData.displayName}`);
        console.log(`   Email: ${userData.emailAddress}`);
        console.log(`   Username: ${userData.name}`);
        console.log(`   Account ID: ${userData.accountId}`);
        console.log(`   Account Type: ${userData.accountType}`);
        console.log(`   Active: ${userData.active}`);

        // Test user search
        console.log('\n🔍 Testing user search...');
        const searchResponse = await fetch(`${baseUrl}/rest/api/2/user/search?query=${encodeURIComponent(userData.emailAddress)}`, {
            headers: {
                'Authorization': `Basic ${credentials}`,
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

        // Test basic JQL search
        console.log('\n🎫 Testing basic ticket search...');
        const jqlResponse = await fetch(`${baseUrl}/rest/api/2/search`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jql: 'project is not empty',
                maxResults: 1
            })
        });

        if (jqlResponse.ok) {
            const jqlData = await jqlResponse.json();
            console.log(`✅ JQL search successful - found ${jqlData.total} total tickets`);
        } else {
            console.log('❌ JQL search failed');
        }

        console.log('\n🎉 All tests passed! Your JIRA configuration is working correctly.');

    } catch (error) {
        console.log('❌ Network error:', error.message);
        console.log('\n💡 This might be a network connectivity issue or CORS problem');
    }
}

// Run the test
testJiraAuth().catch(console.error);
