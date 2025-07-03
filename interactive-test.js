// Interactive JIRA Authentication Test
const fetch = require('node-fetch');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function testJiraAuth() {
    console.log('🔐 JIRA Authentication Interactive Test\n');
    
    console.log('Your current configuration:');
    console.log('JIRA URL: https://jira.arubanetworks.com');
    console.log('Token: YOUR_JIRA_TOCKEN\n');
    
    // Get email from user
    const email = await askQuestion('Enter your email address: ');
    
    if (!email.trim()) {
        console.log('❌ Email is required');
        rl.close();
        return;
    }

    console.log('\n📡 Testing authentication...');
    
    const config = {
        jiraUrl: 'https://jira.arubanetworks.com',
        token: 'YOUR_JIRA_TOCKEN',
        email: email.trim()
    };

    const baseUrl = config.jiraUrl.replace(/\/$/, '');
    const credentials = Buffer.from(`${config.email}:${config.token}`).toString('base64');

    try {
        console.log(`\nTesting with:`);
        console.log(`  Email: ${config.email}`);
        console.log(`  URL: ${baseUrl}/rest/api/2/myself`);
        console.log(`  Auth: Basic ${credentials.substring(0, 20)}...`);

        const response = await fetch(`${baseUrl}/rest/api/2/myself`, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log(`\n📊 Response: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const userData = await response.json();
            console.log('✅ SUCCESS! Authentication worked!');
            console.log('\n👤 Your JIRA User Details:');
            console.log(`   Name: ${userData.displayName}`);
            console.log(`   Email: ${userData.emailAddress}`);
            console.log(`   Username: ${userData.name}`);
            console.log(`   Account ID: ${userData.accountId}`);
            
            // Test searching for another user
            console.log('\n🔍 Testing user search...');
            const searchEmail = await askQuestion('\nEnter an email to search for (or press Enter to skip): ');
            
            if (searchEmail.trim()) {
                const searchResponse = await fetch(`${baseUrl}/rest/api/2/user/search?query=${encodeURIComponent(searchEmail.trim())}`, {
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Accept': 'application/json'
                    }
                });

                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    console.log(`✅ Search successful! Found ${searchData.length} users`);
                    searchData.slice(0, 3).forEach((user, index) => {
                        console.log(`   ${index + 1}. ${user.displayName} (${user.emailAddress})`);
                    });
                } else {
                    console.log(`❌ Search failed: ${searchResponse.status}`);
                }
            }
            
        } else {
            const errorText = await response.text();
            console.log('❌ Authentication FAILED!');
            
            if (response.status === 401) {
                console.log('\n💡 Common solutions:');
                console.log('   1. Double-check your email address');
                console.log('   2. Verify your API token is correct and not expired');
                console.log('   3. Try different email formats:');
                console.log(`      - ${config.email.replace('@hpe.com', '@arubanetworks.com')}`);
                console.log(`      - ${config.email.replace('@arubanetworks.com', '@hpe.com')}`);
                console.log('   4. Make sure you have access to this JIRA instance');
                console.log('   5. Generate a new API token from JIRA settings');
            }
            
            // Show detailed error
            console.log('\n📄 Error details:');
            console.log(errorText.substring(0, 500) + (errorText.length > 500 ? '...' : ''));
        }

    } catch (error) {
        console.log('❌ Network error:', error.message);
    }

    rl.close();
}

// Run the interactive test
testJiraAuth().catch(console.error);
