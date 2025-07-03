class JiraTicketAnalyzer {
    constructor() {
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
        // Pre-fill the form with provided values
        document.getElementById('jiraUrl').value = 'https://jira.arubanetworks.com';
        document.getElementById('token').value = 'MDkxMTk5MTY4MDUwOrCPBAl51+xdJpjyPn4zaPaeWqFs';
        document.getElementById('email').value = 'manjunath.kallatti@hpe.com';
        
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.testAuthBtn.addEventListener('click', this.handleTestAuth.bind(this));
    }

    async handleTestAuth() {
        const jiraUrl = document.getElementById('jiraUrl').value.trim();
        const token = document.getElementById('token').value.trim();
        const email = document.getElementById('email').value.trim();

        if (!jiraUrl || !token || !email) {
            this.showError('Please fill in JIRA URL, API Token, and Email to test authentication');
            return;
        }

        this.setTestLoading(true);
        this.hideError();
        this.hideAuthResult();

        try {
            const response = await fetch('/api/test-auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jiraUrl,
                    email,
                    token
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showAuthResult(true, data.message, data.user);
            } else {
                this.showAuthResult(false, data.error, data.details);
            }
        } catch (error) {
            this.showAuthResult(false, error.message);
        } finally {
            this.setTestLoading(false);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const jiraUrl = document.getElementById('jiraUrl').value.trim();
        const searchEmail = document.getElementById('searchEmail').value.trim();
        const token = document.getElementById('token').value.trim();
        const email = document.getElementById('email').value.trim();
        const fromDate = document.getElementById('fromDate').value;
        const toDate = document.getElementById('toDate').value;

        if (!jiraUrl || !searchEmail || !token || !email) {
            this.showError('Please fill in all required fields');
            return;
        }

        this.setLoading(true);
        this.hideError();
        this.hideResults();
        this.hideAuthResult();

        try {
            const response = await fetch('/api/search-tickets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jiraUrl,
                    email,
                    token,
                    searchEmail,
                    fromDate,
                    toDate
                })
            });

            const data = await response.json();

            if (data.success) {
                this.displayResults(data.tickets, data.user, data.totalFound, data.filteredCount);
            } else {
                this.showError(data.message || 'Search failed');
            }
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setLoading(false);
        }
    }

    displayResults(tickets, user, totalFound, filteredCount) {
        const resultsContainer = document.getElementById('ticketsContainer');
        const summaryContainer = document.getElementById('resultsSummary');
        
        // Show results section
        this.resultsSection.style.display = 'block';
        
        // Display summary
        summaryContainer.innerHTML = `
            <h3>📊 Search Summary</h3>
            <p>Found <strong>${filteredCount}</strong> tickets with comments by <strong>${user.displayName}</strong> (${user.emailAddress})</p>
            <p>Total tickets found in search: <strong>${totalFound}</strong></p>
            <p>User: <strong>${user.displayName}</strong> (${user.name})</p>
        `;

        if (tickets.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <h3>🔍 No Results Found</h3>
                    <p>No tickets were found with comments by '${user.emailAddress}'</p>
                </div>
            `;
            return;
        }

        // Display tickets
        resultsContainer.innerHTML = tickets.map(ticket => this.renderTicket(ticket, user)).join('');
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
        
        // Filter comments by the specified user (using email match)
        const userComments = fields.comment && fields.comment.comments ? 
            fields.comment.comments.filter(comment => 
                comment.author && 
                (comment.author.emailAddress === user.emailAddress ||
                 comment.author.name === user.name ||
                 comment.author.displayName === user.displayName)
            ) : [];

        const jiraBaseUrl = document.getElementById('jiraUrl').value.replace(/\/$/, '');
        const ticketUrl = `${jiraBaseUrl}/browse/${key}`;

        return `
            <div class="ticket-card">
                <div class="ticket-header">
                    <div>
                        <a href="${ticketUrl}" target="_blank" class="ticket-key">${key}</a>
                        <span class="ticket-priority priority-${priority.toLowerCase()}">${priority}</span>
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
                </div>
                
                <div class="comments-section">
                    <div class="comments-title">💬 Comments by ${user.displayName} (${userComments.length})</div>
                    ${userComments.length > 0 ? 
                        userComments.slice(0, 3).map(comment => `
                            <div class="comment">
                                <div>
                                    <span class="comment-author">${comment.author.displayName}</span>
                                    <span class="comment-date">${new Date(comment.created).toLocaleString()}</span>
                                </div>
                                <div class="comment-body">${this.truncateText(comment.body, 200)}</div>
                            </div>
                        `).join('') : 
                        '<p>No comments found by this user</p>'
                    }
                    ${userComments.length > 3 ? `<p><em>... and ${userComments.length - 3} more comments</em></p>` : ''}
                </div>
            </div>
        `;
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
                    Account ID: ${details.accountId}
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

// Add some helpful tips
console.log(`
🎫 JIRA Ticket Analyzer Tips:

1. Due to CORS restrictions, direct API calls may be blocked by browsers
2. For production use, consider:
   - Running from a web server
   - Using a CORS proxy
   - Building a backend API

3. The search looks for tickets where the user has:
   - Added comments
   - Been assigned
   - Been the reporter

4. API Token can be generated from:
   JIRA Profile → Account Settings → Security → API Tokens
`);
