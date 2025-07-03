const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration - Using Bearer token approach that works in Python
const JIRA_CONFIG = {
    baseUrl: 'https://jira.arubanetworks.com',
    // Using the working Bearer token (the one that actually works)
    accessToken: 'MDkxMTk5MTY4MDUwOrCPBAl51+xdJpjyPn4zaPaeWqFs'
};

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to filter out basic administrative comments
function isAnalyticalComment(commentBody, userCommentCount = 0) {
    if (!commentBody || typeof commentBody !== 'string') {
        return false;
    }

    const comment = commentBody.toLowerCase().trim();
    
    // Check if comment contains multiple images/screenshots (always consider analytical)
    const imagePatterns = [
        /!\[.*\]\(.*\)/g,  // Markdown images
        /\[image\]/gi,     // JIRA image attachments
        /\[screenshot\]/gi, // Screenshot attachments
        /\.(png|jpg|jpeg|gif|bmp|svg)/gi  // Image file extensions
    ];
    
    let imageCount = 0;
    for (const pattern of imagePatterns) {
        const matches = comment.match(pattern);
        if (matches) {
            imageCount += matches.length;
        }
    }
    
    // If comment has multiple images, consider it analytical (effort to document)
    if (imageCount >= 2) {
        return true;
    }
    
    // If user has made 3+ comments on this ticket, don't ignore even if last one seems admin
    // This preserves tickets where user has been actively engaged
    if (userCommentCount >= 3) {
        // Still filter out very short or purely administrative comments
        if (comment.length < 10) {
            return false;
        }
        
        // But allow longer comments that might be admin but show engagement
        if (comment.length >= 20) {
            return true;
        }
    }
    
    // Exclude very short comments (likely not analytical)
    if (comment.length < 20) {
        return false;
    }

    // Common administrative patterns to exclude
    const administrativePatterns = [
        // Team movements
        /moving to .* team/,
        /assigning to .* team/,
        /keeping with .* team/,
        /transferring to .*/,
        /redirecting to .*/,
        
        // Status changes
        /making it rs/,
        /changing to rs/,
        /marking as rs/,
        /setting to rs/,
        /rs\s*-\s*release stopper/,
        
        // Label and category changes
        /removing .* label/,
        /adding .* label/,
        /updating labels/,
        /changing priority/,
        /updating component/,
        
        // Basic acknowledgments
        /^(ok|okay|thanks?|noted|done|fixed|closed)\.?$/,
        /^(will do|on it|working on it)\.?$/,
        
        // Generic status updates without analysis
        /^(verified|testing|complete)\.?$/,
        /^(duplicate|invalid|wont.?fix)\.?$/,
        
        // Automated comments patterns
        /^https?:\/\/.*\/pull-requests?\//,
        /cd jenkins job/i,
        /build overview/i,
        /confluence/i,
        
        // Simple confirmations
        /^(yes|no|correct|incorrect)\.?$/,
        /^(agreed|disagree)\.?$/,
    ];

    // Check if comment matches any administrative pattern
    for (const pattern of administrativePatterns) {
        if (pattern.test(comment)) {
            return false;
        }
    }

    // Check for comments that are just URLs or references
    if (/^https?:\/\//.test(comment.trim())) {
        return false;
    }

    // Check for comments that are just JIRA issue references
    if (/^[A-Z]+-\d+$/.test(comment.trim())) {
        return false;
    }

    // Exclude comments that are mostly mentions without content
    const mentionOnlyPattern = /^(@\w+\s*)+\.?$/;
    if (mentionOnlyPattern.test(comment)) {
        return false;
    }

    // Consider it analytical if it contains technical keywords
    const technicalKeywords = [
        'issue', 'problem', 'error', 'bug', 'defect', 'failure', 'fault',
        'solution', 'fix', 'resolve', 'analysis', 'debug', 'investigate',
        'test', 'verify', 'validate', 'reproduce', 'root cause', 'rca',
        'implementation', 'approach', 'design', 'architecture',
        'performance', 'optimization', 'improvement',
        'log', 'trace', 'stack', 'exception', 'timeout',
        'configuration', 'setting', 'parameter', 'threshold',
        'data', 'result', 'output', 'behavior', 'scenario'
    ];

    const hasAnalyticalContent = technicalKeywords.some(keyword => 
        comment.includes(keyword)
    );

    // If it has analytical content, consider it valid
    if (hasAnalyticalContent) {
        return true;
    }

    // Check for questions or detailed explanations (usually analytical)
    if (comment.includes('?') || comment.includes('because') || comment.includes('since')) {
        return true;
    }

    // If comment is long enough and doesn't match exclusion patterns, likely analytical
    return comment.length > 50;
}

// Helper function to make JIRA API calls with Bearer token
async function makeJiraRequest(endpoint, options = {}) {
    const url = `${JIRA_CONFIG.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
        'Authorization': `Bearer ${JIRA_CONFIG.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    const requestOptions = {
        headers: { ...defaultHeaders, ...options.headers },
        ...options
    };

    console.log(`Making request to: ${url}`);
    console.log(`Headers:`, requestOptions.headers);

    try {
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('JIRA Request Error:', error);
        throw error;
    }
}

// Test authentication endpoint
app.get('/api/test-auth', async (req, res) => {
    try {
        console.log('Testing JIRA authentication...');
        
        // Test with the myself endpoint
        const userData = await makeJiraRequest('/rest/api/2/myself');
        
        res.json({
            success: true,
            message: 'Authentication successful with Bearer token',
            user: userData
        });

    } catch (error) {
        console.error('Auth test failed:', error);
        res.status(401).json({
            success: false,
            error: error.message,
            details: 'Bearer token authentication failed'
        });
    }
});

// Search tickets by user email
app.post('/api/search-tickets', async (req, res) => {
    try {
        const { searchEmail, fromDate, toDate } = req.body;
        
        if (!searchEmail) {
            return res.status(400).json({
                success: false,
                error: 'Search email is required'
            });
        }

        console.log(`Searching for tickets commented by: ${searchEmail}`);

        // First, find the user by email
        const userSearchEndpoint = `/rest/api/2/user/search?username=${encodeURIComponent(searchEmail)}`;
        const users = await makeJiraRequest(userSearchEndpoint);

        const targetUser = users.find(user => 
            user.emailAddress && user.emailAddress.toLowerCase() === searchEmail.toLowerCase()
        );

        if (!targetUser) {
            return res.json({
                success: false,
                message: `User with email '${searchEmail}' not found`,
                tickets: [],
                totalFound: 0,
                filteredCount: 0
            });
        }

        console.log('Found target user:', targetUser.displayName, targetUser.emailAddress);

        // Build JQL query with time range
        let jqlQuery = `(comment ~ "${targetUser.name}" OR comment ~ "${targetUser.displayName}" OR assignee = "${targetUser.name}" OR reporter = "${targetUser.name}")`;
        
        if (fromDate && toDate) {
            jqlQuery += ` AND updated >= "${fromDate}" AND updated <= "${toDate}"`;
        } else if (fromDate) {
            jqlQuery += ` AND updated >= "${fromDate}"`;
        } else if (toDate) {
            jqlQuery += ` AND updated <= "${toDate}"`;
        }

        console.log('JQL Query:', jqlQuery);

        // Search for tickets using POST method with pagination to get all results
        let allIssues = [];
        let startAt = 0;
        const maxResults = 100;
        let totalFound = 0;

        // Fetch all tickets with pagination
        do {
            const searchData = await makeJiraRequest('/rest/api/2/search', {
                method: 'POST',
                body: JSON.stringify({
                    jql: jqlQuery,
                    expand: ['comments'],
                    maxResults: maxResults,
                    startAt: startAt,
                    fields: [
                        'summary', 'status', 'priority', 'assignee', 'reporter', 
                        'created', 'updated', 'comment', 'issuetype', 'labels'
                    ]
                })
            });

            totalFound = searchData.total;
            allIssues = allIssues.concat(searchData.issues);
            startAt += maxResults;
            
            console.log(`Fetched ${searchData.issues.length} tickets, total so far: ${allIssues.length}/${totalFound}`);
            
            // Break if we've fetched all available tickets
            if (searchData.issues.length < maxResults || allIssues.length >= totalFound) {
                break;
            }
        } while (true);

        console.log(`Found ${totalFound} total tickets, fetched ${allIssues.length} tickets`);

        // Enhanced filtering and stats collection - exclude tickets assigned to user
        const analyticalTickets = [];
        const administrativeTickets = [];
        const commentedTickets = [];
        const assignedTickets = [];
        let totalComments = 0;
        let analyticalComments = 0;
        let administrativeComments = 0;

        allIssues.forEach(issue => {
            const isAssigned = issue.fields.assignee && 
                (issue.fields.assignee.emailAddress === searchEmail ||
                 issue.fields.assignee.name === targetUser.name);
            
            if (isAssigned) {
                assignedTickets.push(issue);
            }
            
            // Skip analysis for tickets assigned to the user - only analyze tickets where user commented but is not assignee
            if (isAssigned) {
                return;
            }
            
            if (!issue.fields.comment || !issue.fields.comment.comments) {
                return;
            }
            
            const userComments = issue.fields.comment.comments.filter(comment => 
                comment.author && 
                (comment.author.emailAddress === searchEmail ||
                 comment.author.name === targetUser.name ||
                 comment.author.displayName === targetUser.displayName)
            );

            if (userComments.length > 0) {
                commentedTickets.push(issue);
                totalComments += userComments.length;
                
                // Filter for analytical comments, passing user comment count
                const analyticalUserComments = userComments.filter(comment => 
                    isAnalyticalComment(comment.body, userComments.length)
                );
                
                const adminUserComments = userComments.filter(comment => 
                    !isAnalyticalComment(comment.body, userComments.length)
                );

                analyticalComments += analyticalUserComments.length;
                administrativeComments += adminUserComments.length;

                // Determine overall ticket category based on majority of comments
                const isOverallAnalytical = analyticalUserComments.length >= adminUserComments.length;

                // Create ticket with all user comments (both analytical and admin)
                const ticketCopy = {
                    ...issue,
                    fields: {
                        ...issue.fields,
                        comment: {
                            ...issue.fields.comment,
                            comments: userComments, // Show all user comments
                            analyticalCount: analyticalUserComments.length,
                            administrativeCount: adminUserComments.length,
                            totalUserComments: userComments.length
                        }
                    },
                    isAssigned: false, // Always false since we exclude assigned tickets
                    ticketType: isOverallAnalytical ? 'analytical' : 'administrative',
                    overallAnalysis: {
                        analytical: analyticalUserComments.length,
                        administrative: adminUserComments.length,
                        total: userComments.length,
                        isAnalytical: isOverallAnalytical
                    }
                };

                if (isOverallAnalytical) {
                    analyticalTickets.push(ticketCopy);
                } else {
                    administrativeTickets.push(ticketCopy);
                }
            }
        });

        console.log(`Found ${totalComments} total comments by user, ${analyticalComments} analytical comments, ${administrativeComments} administrative comments`);
        console.log(`Assigned tickets: ${assignedTickets.length}, Commented tickets: ${commentedTickets.length}`);
        console.log(`Analytical tickets: ${analyticalTickets.length}, Administrative tickets: ${administrativeTickets.length}`);

        res.json({
            success: true,
            user: targetUser,
            tickets: {
                analytical: analyticalTickets,
                administrative: administrativeTickets,
                all: [...analyticalTickets, ...administrativeTickets]
            },
            totalFound: totalFound,
            filteredCount: analyticalTickets.length + administrativeTickets.length,
            stats: {
                totalTicketsFound: totalFound,
                assignedTickets: assignedTickets.length,
                commentedTickets: commentedTickets.length,
                analyticalTickets: analyticalTickets.length,
                administrativeTickets: administrativeTickets.length,
                totalComments: totalComments,
                analyticalComments: analyticalComments,
                administrativeComments: administrativeComments,
                analyticalPercentage: totalComments > 0 ? Math.round((analyticalComments / totalComments) * 100) : 0
            },
            // Keep legacy field for compatibility
            commentStats: {
                totalComments: totalComments,
                analyticalComments: analyticalComments,
                administrativeComments: administrativeComments,
                analyticalPercentage: totalComments > 0 ? Math.round((analyticalComments / totalComments) * 100) : 0
            },
            jqlQuery: jqlQuery
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Search for users by username/email
app.get('/api/search-user', async (req, res) => {
    try {
        const { username } = req.query;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username parameter is required'
            });
        }

        console.log(`Searching for user: ${username}`);
        
        const users = await makeJiraRequest(`/rest/api/2/user/search?username=${encodeURIComponent(username)}`);
        
        res.json({
            success: true,
            users: users,
            count: users.length
        });

    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get specific issue details (for testing)
app.get('/api/issue/:issueKey', async (req, res) => {
    try {
        const { issueKey } = req.params;
        console.log(`Fetching details for issue: ${issueKey}`);
        
        const issueData = await makeJiraRequest(`/rest/api/2/issue/${issueKey}`);
        
        res.json({
            success: true,
            issue: issueData
        });

    } catch (error) {
        console.error('Issue fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'JIRA Ticket Analyzer Backend'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`🔍 Test authentication: http://localhost:${PORT}/api/test-auth`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});
