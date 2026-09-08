# SharePoint Integration Guide

This guide covers setting up SharePoint integration for the Two-Way Comment Sync POC.

## Prerequisites

- Access to a SharePoint site
- Permissions to read/write files in the target library
- Basic understanding of SharePoint structure
- For this POC, you can use local file operations without SharePoint

## Option 1: Local File Operations (Recommended for POC)

For initial testing and POC development, you can skip SharePoint integration entirely:

1. The system will use local Excel files
2. Manual file transfer can simulate SharePoint sync
3. No additional setup required

Simply use the sample Excel file provided:

```bash
python create_sample_excel.py
```

## Option 2: Full SharePoint Integration

### Step 1: Prepare SharePoint Site

1. Ensure you have access to a SharePoint site
2. Create or identify a document library for Excel files
3. Note the site URL and library path

### Step 2: Upload Excel File

1. Create your Excel file with the required structure
2. Upload it to the SharePoint document library
3. Note the exact file URL

**Excel File Structure:**
- Sheet name: "Comments"
- Headers (row 1): comment_id, comment_text, created_date, modified_date, status
- Data starts from row 2

### Step 3: Get SharePoint Credentials

The POC supports basic authentication (for testing):

**For On-Premises SharePoint:**
- Username: `DOMAIN\username`
- Password: Your network password

**For SharePoint Online:**
- Username: `your.email@company.com`
- Password: Your Microsoft 365 password

**Note:** For production use, consider using OAuth/App registrations instead of basic auth.

### Step 4: Configure SharePoint URLs

Identify the following URLs:

**Site URL:**
```
https://yourcompany.sharepoint.com/sites/yoursite
```

**File URL:**
```
https://yourcompany.sharepoint.com/sites/yoursite/Shared%20Documents/comments.xlsx
```

### Step 5: Configure the POC

Add your SharePoint credentials to `.env`:

```bash
# .env file
SHAREPOINT_SITE_URL=https://yourcompany.sharepoint.com/sites/yoursite
SHAREPOINT_FILE_URL=https://yourcompany.sharepoint.com/sites/yoursite/Shared%20Documents/comments.xlsx
SHAREPOINT_USERNAME=your.email@company.com
SHAREPOINT_PASSWORD=your_password
```

Or update `config.py`:

```python
SHAREPOINT_SITE_URL = "https://yourcompany.sharepoint.com/sites/yoursite"
SHAREPOINT_FILE_URL = "https://yourcompany.sharepoint.com/sites/yoursite/Shared%20Documents/comments.xlsx"
SHAREPOINT_USERNAME = "your.email@company.com"
SHAREPOINT_PASSWORD = "your_password"
```

### Step 6: Test SharePoint Connection

Run the SharePoint client test:

```bash
python sharepoint_client.py
```

You should see output indicating SharePoint client initialization.

## Authentication Methods

### Basic Authentication (Current Implementation)

The current POC uses basic authentication for simplicity:

**Pros:**
- Easy to set up
- No additional configuration
- Works for testing

**Cons:**
- Less secure
- May be disabled in some organizations
- Not recommended for production

### OAuth 2.0 (Recommended for Production)

For production deployment, implement OAuth 2.0:

1. Register an app in Azure AD
2. Configure permissions for SharePoint
3. Implement OAuth flow in the Python client
4. Use access tokens instead of basic auth

### App-Only Authentication

For service accounts:

1. Use client credentials flow
2. Grant app permissions to SharePoint
3. Use certificate-based authentication

## Common Issues

### Authentication Failures

**Problem:** 401 Unauthorized errors

**Solutions:**
- Verify username and password
- Check if MFA is enabled (basic auth doesn't work with MFA)
- Ensure account is not locked
- Try accessing SharePoint in browser first

### File Not Found

**Problem:** 404 errors when accessing files

**Solutions:**
- Verify file URL is correct
- Check file exists in SharePoint
- Ensure you have permissions to the file
- Check if URL encoding is correct (spaces as %20)

### Permission Issues

**Problem:** 403 Forbidden errors

**Solutions:**
- Verify user has read/write permissions
- Check library settings for external sharing
- Ensure file is not checked out by another user
- Verify user account is not blocked

### Network Issues

**Problem:** Connection timeouts or network errors

**Solutions:**
- Check network connectivity
- Verify firewall settings
- Try accessing SharePoint in browser
- Check proxy settings if applicable

## Testing SharePoint Integration

### Manual Testing

1. **Download Test:**
   ```python
   from sharepoint_client import SharePointClient
   
   client = SharePointClient()
   local_path = client.download_excel_file()
   print(f"Downloaded to: {local_path}")
   ```

2. **Upload Test:**
   ```python
   from sharepoint_client import SharePointClient
   
   client = SharePointClient()
   success = client.upload_excel_file(local_path="sample_data/comments_sample.xlsx")
   print(f"Upload successful: {success}")
   ```

3. **Read/Write Test:**
   ```python
   from sharepoint_client import SharePointClient
   
   client = SharePointClient()
   comments = client.read_excel_comments("sample_data/comments_sample.xlsx")
   print(f"Read {len(comments)} comments")
   ```

## Security Considerations

### Credentials Management

- Never commit credentials to version control
- Use environment variables or secure vaults
- Rotate credentials regularly
- Use separate accounts for different environments

### Access Control

- Use principle of least privilege
- Grant only necessary permissions
- Regularly audit access
- Implement IP restrictions if possible

### Data Protection

- Ensure HTTPS is used
- Validate SSL certificates
- Encrypt sensitive data at rest
- Implement audit logging

## Troubleshooting

### Enable Debug Logging

Add this to your code for detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Test with curl

Test SharePoint connectivity:

```bash
curl -u username:password "https://yourcompany.sharepoint.com/sites/yoursite"
```

### Check SharePoint Health

- Verify SharePoint site is accessible
- Check service health status
- Verify no maintenance windows

## Alternative Approaches

If SharePoint integration proves problematic:

1. **Use Network Share:** Map SharePoint as network drive
2. **Use OneDrive Sync:** Sync SharePoint library locally
3. **Use Microsoft Graph API:** More modern approach
4. **Use Power Automate:** Workflow-based sync

## Next Steps

Once SharePoint is configured:

1. Test file download/upload operations
2. Verify Excel file structure compatibility
3. Test end-to-end sync with Smartsheets
4. Implement error handling for network issues
5. Add retry logic for transient failures

## Additional Resources

- [SharePoint REST API Documentation](https://docs.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-started-working-with-the-sharepoint-rest-service)
- [Office 365 Python Client](https://github.com/vgrem/Office365-REST-Python-Client)
- [SharePoint Authentication Patterns](https://docs.microsoft.com/en-us/sharepoint/dev/solution-guidance/security-best-practices)