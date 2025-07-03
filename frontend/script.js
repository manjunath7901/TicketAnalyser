class JiraTicketAnalyzer {
    constructor() {
        this.backendUrl = 'http://localhost:3001'; // Backend API URL
        this.form = document.getElementById('jiraForm');
        this.resultsSection = document.getElementById('results');
        this.errorSection = document.getElementById('error');
        this.authSection = document.getElementById('authResult');
        this.searchBtn = document.getElementById('searchBtn');
        this.testAuthBtn = document.getElementById('testAuthBtn');
        this.btnText = document.getElementById('btnText');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.testBtnText = document.getElementById('testBtnText');
        this.testLoadingSpinner = document.getElementById('testLoadingSpinner');
        
        this.init();
    }

    init() {
        // Pre-fill search email field
        document.getElementById('searchEmail').value = 'manjunath.kallatti@hpe.com';
        document.getElementById('jiraUrl').value = 'https://jira.arubanetworks.com';
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.testAuthBtn.addEventListener('click', this.handleTestAuth.bind(this));
    }

    async handleTestAuth() {
        this.setTestLoading(true);
        this.hideError();
        this.hideAuthResult();

        try {
            console.log('Testing authentication with backend...');
            
            const response = await fetch(`${this.backendUrl}/api/test-auth`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (data.success) {
                console.log('Authentication successful:', data.user);
                this.showAuthResult(true, data.message, data.user);
            } else {
                console.error('Authentication failed:', data);
                this.showAuthResult(false, data.error, data.details);
            }
        } catch (error) {
            console.error('Network error:', error);
            this.showAuthResult(false, `Network error: ${error.message}`, 'Could not connect to backend server. Make sure it\'s running on port 3001.');
        } finally {
            this.setTestLoading(false);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const searchEmail = document.getElementById('searchEmail').value.trim();
        const fromDate = document.getElementById('fromDate').value;
        const toDate = document.getElementById('toDate').value;

        if (!searchEmail) {
            this.showError('Please enter an email address to search for');
            return;
        }

        this.setLoading(true);
        this.hideError();
        this.hideResults();
        this.hideAuthResult();

        try {
            console.log(`Searching for tickets by: ${searchEmail}`);
            
            const response = await fetch(`${this.backendUrl}/api/search-tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    searchEmail,
                    fromDate,
                    toDate
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log('Search successful:', data);
                this.displayResults(data.tickets, data.user, data.totalFound, data.filteredCount, data.jqlQuery, data.commentStats, data.stats);
            } else {
                console.error('Search failed:', data);
                this.showError(data.message || data.error || 'Search failed');
            }
        } catch (error) {
            console.error('Network error:', error);
            this.showError(`Network error: ${error.message}. Make sure the backend server is running.`);
        } finally {
            this.setLoading(false);
        }
    }

    displayResults(tickets, user, totalFound, filteredCount, jqlQuery, commentStats, stats) {
        const resultsContainer = document.getElementById('ticketsContainer');
        const summaryContainer = document.getElementById('resultsSummary');
        
        // Show results section
        this.resultsSection.style.display = 'block';
        
        // Handle both old and new ticket structure
        const analyticalTickets = tickets.analytical || (Array.isArray(tickets) ? tickets : []);
        const administrativeTickets = tickets.administrative || [];
        const allTickets = tickets.all || analyticalTickets;
        
        console.log('Ticket data:', {
            analytical: analyticalTickets.length,
            administrative: administrativeTickets.length,
            all: allTickets.length,
            originalStructure: typeof tickets
        });
        
        // Enhanced summary with comprehensive stats
        let overallStatsSection = '';
        if (stats) {
            overallStatsSection = `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <h3 style="margin: 0 0 15px 0; text-align: center;">📊 JIRA Comment Analysis (Excluding Assigned Tickets)</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2.2em; font-weight: bold;">${stats.totalTicketsFound}</div>
                            <div style="font-size: 0.85em; opacity: 0.9;">Total Tickets Found</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2.2em; font-weight: bold;">${stats.assignedTickets}</div>
                            <div style="font-size: 0.85em; opacity: 0.9;">Assigned to You (Excluded)</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2.2em; font-weight: bold;">${stats.commentedTickets}</div>
                            <div style="font-size: 0.85em; opacity: 0.9;">Commented (Not Assigned)</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2.2em; font-weight: bold;">${stats.analyticalTickets}</div>
                            <div style="font-size: 0.85em; opacity: 0.9;">Analytical Tickets</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2.2em; font-weight: bold;">${stats.administrativeTickets}</div>
                            <div style="font-size: 0.85em; opacity: 0.9;">Administrative Tickets</div>
                        </div>
                    </div>
                    <div style="text-align: center; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
                        <small style="opacity: 0.9;">📝 Analysis focuses on tickets where you commented but are not the assignee</small>
                    </div>
                </div>
            `;
        }
        
        // Enhanced analytical insights
        let analyticsSection = '';
        if (commentStats) {
            analyticsSection = `
                <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 15px 0; border-left: 4px solid #28a745;">
                    <h4 style="margin: 0 0 15px 0; color: #28a745; display: flex; align-items: center; justify-content: space-between;">
                        <span style="display: flex; align-items: center;">
                            🧠 Comment Analysis Overview
                            <span style="margin-left: 10px; font-size: 0.8em; background: #28a745; color: white; padding: 4px 8px; border-radius: 12px;">
                                ${commentStats.analyticalPercentage}% Analytical
                            </span>
                        </span>
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <div style="font-size: 2.5em; font-weight: bold; color: #28a745;">${commentStats.analyticalComments}</div>
                            <div style="color: #666; font-size: 0.9em; margin-top: 5px;">Analytical Comments</div>
                            <div style="color: #28a745; font-size: 0.8em; margin-top: 2px;">Problem-solving & Technical</div>
                        </div>
                        <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <div style="font-size: 2.5em; font-weight: bold; color: #dc3545;">${commentStats.administrativeComments}</div>
                            <div style="color: #666; font-size: 0.9em; margin-top: 5px;">Administrative Comments</div>
                            <div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">Status & Process Updates</div>
                        </div>
                        <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <div style="font-size: 2.5em; font-weight: bold; color: #17a2b8;">${commentStats.totalComments}</div>
                            <div style="color: #666; font-size: 0.9em; margin-top: 5px;">Total Comments</div>
                            <div style="color: #17a2b8; font-size: 0.8em; margin-top: 2px;">All Your Activity</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Display summary
        summaryContainer.innerHTML = `
            <h3>📊 JIRA Comment Analysis for ${user.displayName}</h3>
            ${overallStatsSection}
            ${analyticsSection}
            <div style="background: #e9ecef; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p><strong>Analysis Focus:</strong> ${allTickets.length} tickets where you commented but are not assigned (${stats.analyticalTickets} analytical + ${stats.administrativeTickets} administrative)</p>
                <p><strong>User:</strong> ${user.displayName} (${user.emailAddress})</p>
                <p style="color: #666; font-size: 0.9em; margin-top: 10px;">📝 <strong>Note:</strong> This analysis excludes tickets assigned to you to focus on your contributions to others' tickets.</p>
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; color: #667eea; font-weight: bold;">🔍 JQL Query Used</summary>
                    <code style="background: #f8f9fa; padding: 10px; border-radius: 4px; display: block; margin-top: 5px; font-size: 0.85rem; word-break: break-all;">${jqlQuery}</code>
                </details>
            </div>
        `;

        if (allTickets.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results" style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 12px; margin: 20px 0;">
                    <h3 style="color: #6c757d;">🔍 No Comments Found</h3>
                    <p style="color: #6c757d; margin: 15px 0;">No tickets were found with comments by '${user.emailAddress}'</p>
                    <p style="color: #6c757d; margin-top: 15px;">Try expanding the date range or check if there are comments on other tickets.</p>
                </div>
            `;
            return;
        }

        // Create tabbed interface for different ticket types
        resultsContainer.innerHTML = `
            <div class="tabs-container" style="margin: 20px 0;">
                <div class="tabs-header" style="display: flex; border-bottom: 2px solid #e9ecef; margin-bottom: 20px;">
                    <button class="tab-button active" data-tab="all" style="padding: 12px 24px; border: none; background: #667eea; color: white; cursor: pointer; margin-right: 2px; border-radius: 8px 8px 0 0;">
                        All Tickets (${allTickets.length})
                    </button>
                    <button class="tab-button" data-tab="analytical" style="padding: 12px 24px; border: none; background: #e9ecef; color: #666; cursor: pointer; margin-right: 2px; border-radius: 8px 8px 0 0;">
                        🧠 Analytical (${analyticalTickets.length})
                    </button>
                    <button class="tab-button" data-tab="administrative" style="padding: 12px 24px; border: none; background: #e9ecef; color: #666; cursor: pointer; border-radius: 8px 8px 0 0;">
                        📋 Administrative (${administrativeTickets.length})
                    </button>
                </div>
                
                <div id="tab-all" class="tab-content active">
                    <div class="tickets-grid">
                        ${allTickets.map(ticket => this.renderTicket(ticket, user)).join('')}
                    </div>
                </div>
                
                <div id="tab-analytical" class="tab-content" style="display: none;">
                    <div class="tickets-grid">
                        ${analyticalTickets.map(ticket => this.renderTicket(ticket, user)).join('')}
                    </div>
                </div>
                
                <div id="tab-administrative" class="tab-content" style="display: none;">
                    <div class="tickets-grid">
                        ${administrativeTickets.map(ticket => this.renderTicket(ticket, user)).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners to tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetTab = e.target.getAttribute('data-tab');
                this.showTab(targetTab);
            });
        });
    }

    showTab(tabName) {
        console.log(`Switching to tab: ${tabName}`);
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });
        
        // Remove active class from all buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.style.background = '#e9ecef';
            button.style.color = '#666';
            button.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(`tab-${tabName}`);
        if (selectedTab) {
            selectedTab.style.display = 'block';
            selectedTab.classList.add('active');
            console.log(`Showing tab: tab-${tabName}`);
        } else {
            console.error(`Tab not found: tab-${tabName}`);
        }
        
        // Activate selected button
        const activeButton = document.querySelector(`button[data-tab="${tabName}"]`);
        if (activeButton) {
            activeButton.style.background = '#667eea';
            activeButton.style.color = 'white';
            activeButton.classList.add('active');
            console.log(`Activated button for tab: ${tabName}`);
        } else {
            console.error(`Button not found for tab: ${tabName}`);
        }
    }

    renderTicket(ticket, user) {
        const fields = ticket.fields;
        const key = ticket.key;
        const summary = fields.summary || 'No title';
        const status = fields.status ? fields.status.name : 'Unknown';
        const priority = fields.priority ? fields.priority.name : 'Unknown';
        const assignee = fields.assignee ? fields.assignee.displayName : 'Unassigned';
        const reporter = fields.reporter ? fields.reporter.displayName : 'Unknown';
        const created = fields.created ? new Date(fields.created).toLocaleDateString() : 'Unknown';
        const updated = fields.updated ? new Date(fields.updated).toLocaleDateString() : 'Unknown';
        const issueType = fields.issuetype ? fields.issuetype.name : 'Unknown';
        const labels = fields.labels ? fields.labels.join(', ') : 'None';
        
        // Get analytical comments (already filtered by backend)
        const analyticalComments = fields.comment && fields.comment.comments ? fields.comment.comments : [];
        const analyticalCount = fields.comment ? fields.comment.analyticalCount || analyticalComments.length : 0;
        const administrativeCount = fields.comment ? fields.comment.administrativeCount || 0 : 0;
        const totalUserComments = fields.comment ? fields.comment.totalUserComments || analyticalComments.length : 0;
        const isAssigned = ticket.isAssigned || false;
        
        // Calculate comment insight
        let commentInsight = '';
        let engagementBadge = '';
        
        // Calculate engagement level (define outside if block)
        const engagementLevel = totalUserComments >= 5 ? 'High' : totalUserComments >= 3 ? 'Medium' : 'Low';
        
        // Get overall analysis for this ticket
        const overallAnalysis = ticket.overallAnalysis || {
            analytical: analyticalCount,
            administrative: administrativeCount,
            total: totalUserComments,
            isAnalytical: analyticalCount >= administrativeCount
        };
        
        if (totalUserComments > 0) {
            const analyticalRatio = Math.round((analyticalCount / totalUserComments) * 100);
            const engagementColor = totalUserComments >= 5 ? '#28a745' : totalUserComments >= 3 ? '#ffc107' : '#6c757d';
            
            commentInsight = `
                <div class="comment-analysis">
                    <div class="comment-analysis-header">
                        <strong style="color: #17a2b8;">Overall Ticket Analysis</strong>
                        <div class="comment-badges">
                            <span class="comment-badge analytical">
                                ${overallAnalysis.analytical} Analytical
                            </span>
                            <span class="comment-badge administrative">
                                ${overallAnalysis.administrative} Administrative
                            </span>
                            <span class="comment-badge percentage">
                                ${analyticalRatio}% Analytical
                            </span>
                        </div>
                    </div>
                    <div class="engagement-note ${overallAnalysis.isAnalytical ? 'high' : 'low'}">
                        ${overallAnalysis.isAnalytical ? 
                            '🧠 Overall: Analytical ticket (majority of comments are technical)' : 
                            '� Overall: Administrative ticket (majority of comments are process-related)'
                        }
                    </div>
                </div>
            `;
        }

        const ticketUrl = `https://jira.arubanetworks.com/browse/${key}`;

        return `
            <div class="ticket-card" data-ticket-type="${ticket.ticketType || 'unknown'}">
                <div class="ticket-header">
                    <div>
                        <a href="${ticketUrl}" target="_blank" class="ticket-key">${key}</a>
                        <span class="ticket-priority priority-${priority.toLowerCase()}">${priority}</span>
                        <span class="ticket-type">${issueType}</span>
                        <span class="engagement-badge">
                            <span class="engagement-${engagementLevel.toLowerCase()}">
                                ${totalUserComments} Comments
                            </span>
                            ${ticket.overallAnalysis && ticket.overallAnalysis.isAnalytical ? 
                                '<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">🧠 Analytical</span>' : 
                                '<span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">� Administrative</span>'
                            }
                        </span>
                    </div>
                    <span class="ticket-status status-${status.toLowerCase().replace(/\s+/g, '-')}">${status}</span>
                </div>
                
                <div class="ticket-title">${summary}</div>
                
                <div class="ticket-meta">
                    <div class="meta-item">
                        <span>👤</span>
                        <span><strong>Assignee:</strong> ${assignee}</span>
                    </div>
                    <div class="meta-item">
                        <span>📝</span>
                        <span><strong>Reporter:</strong> ${reporter}</span>
                    </div>
                    <div class="meta-item">
                        <span>📅</span>
                        <span><strong>Created:</strong> ${created}</span>
                    </div>
                    <div class="meta-item">
                        <span>🔄</span>
                        <span><strong>Updated:</strong> ${updated}</span>
                    </div>
                    ${labels !== 'None' ? `
                    <div class="meta-item">
                        <span>🏷️</span>
                        <span><strong>Labels:</strong> ${labels}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${commentInsight}
                
                <div class="comments-section">
                    <div class="comments-title">🧠 Analytical Comments by ${user.displayName} (${analyticalComments.length})</div>
                    ${analyticalComments.length > 0 ? 
                        analyticalComments.slice(0, 3).map(comment => `
                            <div class="comment">
                                <div>
                                    <span class="comment-author">${comment.author.displayName}</span>
                                    <span class="comment-date">${new Date(comment.created).toLocaleString()}</span>
                                </div>
                                <div class="comment-body">${this.truncateText(this.stripHtml(comment.body), 200)}</div>
                            </div>
                        `).join('') : 
                        '<p>No analytical comments found by this user</p>'
                    }
                    ${analyticalComments.length > 3 ? `<p><em>... and ${analyticalComments.length - 3} more analytical comments</em></p>` : ''}
                </div>
            </div>
        `;
    }

    stripHtml(html) {
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    setLoading(isLoading) {
        this.searchBtn.disabled = isLoading;
        this.btnText.style.display = isLoading ? 'none' : 'inline';
        this.loadingSpinner.style.display = isLoading ? 'inline' : 'none';
    }

    setTestLoading(isLoading) {
        this.testAuthBtn.disabled = isLoading;
        this.testBtnText.style.display = isLoading ? 'none' : 'inline';
        this.testLoadingSpinner.style.display = isLoading ? 'inline' : 'none';
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        this.errorSection.style.display = 'block';
    }

    hideError() {
        this.errorSection.style.display = 'none';
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
    }

    showAuthResult(success, message, details) {
        const authSection = this.authSection;
        const authTitle = document.getElementById('authTitle');
        const authMessage = document.getElementById('authMessage');
        const authDetails = document.getElementById('authDetails');
        
        authSection.className = `auth-result ${success ? 'success' : 'error'}`;
        authTitle.textContent = success ? '✅ Authentication Successful' : '❌ Authentication Failed';
        authMessage.textContent = message;
        
        if (details) {
            if (success) {
                authDetails.innerHTML = `
                    <strong>User Details:</strong><br>
                    Name: ${details.displayName}<br>
                    Email: ${details.emailAddress}<br>
                    Username: ${details.name}<br>
                    Account ID: ${details.accountId}<br>
                    Account Type: ${details.accountType}
                `;
            } else {
                authDetails.textContent = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
            }
        } else {
            authDetails.innerHTML = '';
        }
        
        authSection.style.display = 'block';
    }

    hideAuthResult() {
        this.authSection.style.display = 'none';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new JiraTicketAnalyzer();
});

// Add helpful console tips
console.log(`
🎫 JIRA Ticket Analyzer - Updated with Bearer Token Authentication

✅ Fixed Issues:
- Now using Bearer token authentication (like your working Python code)
- Separate backend and frontend architecture
- Improved error handling and debugging

🔧 Architecture:
- Backend: http://localhost:3001 (Express API)
- Frontend: Static files served by backend
- Authentication: Bearer token (working approach)

🧪 Testing:
1. Test authentication first with the green button
2. Search for tickets by email address
3. Use time range filters for specific periods

📡 API Endpoints:
- GET /api/test-auth - Test authentication
- POST /api/search-tickets - Search for tickets
- GET /api/issue/:key - Get specific issue details
`);
