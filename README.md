# JIRA Ticket Analyzer

A modern web application to find all JIRA tickets commented by a specific user.

## 🚀 Quick Start

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open your browser:**
   ```
   http://localhost:3000
   ```

3. **Test authentication first** before searching

## 🔧 Features

- 🔍 **Smart Search**: Finds all tickets where a specific user has commented
- 💬 **Comment Analysis**: Displays actual comments made by the user
- 📊 **Beautiful UI**: Modern, responsive design with gradient backgrounds
- � **Ticket Cards**: Clean presentation of ticket information
- 🔗 **Direct Links**: Click-through to actual JIRA tickets
- 📱 **Mobile-Friendly**: Works great on all devices
- 🗓️ **Date Range**: Filter by time periods
- 🔐 **Authentication Test**: Verify credentials before searching

## 🔐 Authentication Setup

### 1. API Token Generation
1. Go to https://jira.arubanetworks.com
2. Click your profile picture → Account Settings
3. Navigate to Security → API Tokens
4. Click "Create API Token"
5. Copy the generated token

### 2. Email Configuration
The application is pre-configured with:
- **JIRA URL**: `https://jira.arubanetworks.com`
- **API Token**: Already filled in
- **Email**: Try both formats:
  - `your.name@arubanetworks.com`
  - `your.name@hpe.com`

## 🛠️ Troubleshooting

### Authentication Issues

**❌ 401 Unauthorized Error**
- ✅ Verify your email address format
- ✅ Try both `@arubanetworks.com` and `@hpe.com` domains
- ✅ Generate a new API token
- ✅ Check if you have access to the JIRA instance

**❌ User Not Found**
- ✅ Use exact email addresses
- ✅ Check if the user has JIRA access
- ✅ Try searching by display name instead

**❌ No Results Found**
- ✅ Extend the date range
- ✅ Verify the user has actually commented on tickets
- ✅ Check if tickets are in projects you have access to

### Testing Authentication

Use the **"Test Authentication"** button to verify your credentials:
```bash
# Or run the test script directly
npm test
```

### Interactive Testing

Run the interactive test for step-by-step diagnosis:
```bash
node interactive-test.js
```

## 📱 Usage

1. **Fill in your credentials**:
   - Your email (pre-filled)
   - API token (pre-filled)

2. **Test authentication** using the green button

3. **Enter search details**:
   - Email to search for
   - Optional date range

4. **View results** with detailed ticket information and comments

## 🎯 Search Features

- **Email-based search**: Find users by exact email match
- **Comment filtering**: Only shows tickets with actual user comments
- **Time range filtering**: Search within specific date ranges
- **Comprehensive results**: Shows ticket details, status, priority, and comments

## 📂 Project Structure

```
jira-ticket-analyzer/
├── server.js              # Express backend server
├── index.html             # Frontend interface
├── styles.css             # Responsive styling
├── script.js              # Frontend JavaScript
├── test-auth.js           # Authentication test
├── interactive-test.js    # Interactive debugging
└── package.json           # Dependencies
```

## 🔧 API Endpoints

- `POST /api/test-auth` - Test JIRA authentication
- `POST /api/search-tickets` - Search for tickets with user comments

## 📝 Example Search Flow

1. **Authentication**: Verify your JIRA credentials
2. **User Lookup**: Find the target user by email
3. **JQL Search**: Execute JIRA Query Language search
4. **Comment Filtering**: Filter results to tickets with actual user comments
5. **Results Display**: Show formatted results with ticket details

## 🌐 CORS Solution

This application includes a Node.js backend that acts as a proxy to resolve CORS issues when making direct API calls to JIRA from the browser.

## 🔍 Advanced Features

- **Smart Filtering**: Automatically filters out tickets without relevant comments
- **Priority Indicators**: Color-coded priority levels
- **Status Badges**: Visual status indicators
- **Responsive Design**: Works on desktop and mobile
- **Error Handling**: Comprehensive error messages and debugging info

## 📊 Supported JIRA Features

- ✅ Comments search and display
- ✅ Ticket metadata (status, priority, assignee, reporter)
- ✅ Date range filtering
- ✅ Multiple user formats (email, username, display name)
- ✅ Direct ticket links
- ✅ Project-based filtering

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## ⚠️ Security Notes

- Never commit API tokens to version control
- Use environment variables in production
- Consider OAuth for enhanced security
- API tokens should be rotated regularly
