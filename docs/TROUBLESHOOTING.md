# Troubleshooting Guide

Common issues and solutions for the Two-Way Comment Sync POC.

## Table of Contents

- [Python Environment Issues](#python-environment-issues)
- [Smartsheets API Issues](#smartsheets-api-issues)
- [SharePoint Integration Issues](#sharepoint-integration-issues)
- [Dashboard Issues](#dashboard-issues)
- [Sync Script Issues](#sync-script-issues)
- [Excel File Issues](#excel-file-issues)
- [Performance Issues](#performance-issues)

## Python Environment Issues

### Module Not Found Errors

**Problem:** `ModuleNotFoundError: No module named 'smartsheet'`

**Solutions:**
```bash
# Install dependencies
pip install -r requirements.txt

# Or install individual packages
pip install smartsheet-python-sdk openpyxl office365-rest-python-client requests python-dotenv
```

### Python Version Issues

**Problem:** Syntax errors or import failures

**Solutions:**
- Ensure Python 3.7+ is installed
- Check Python version: `python --version`
- Use virtual environment: `python -m venv venv`

### SSL Certificate Errors

**Problem:** SSL certificate verification failures

**Solutions:**
```python
# For testing only (not recommended for production)
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
```

### Path Issues

**Problem:** File not found errors on Windows

**Solutions:**
- Use raw strings for paths: `r"C:\path\to\file"`
- Use forward slashes: `"C:/path/to/file"`
- Use `os.path.join()` for cross-platform compatibility

## Smartsheets API Issues

### Authentication Failures

**Problem:** 401 Unauthorized or 403 Forbidden

**Solutions:**
1. Verify API token is correct
2. Check token hasn't expired
3. Ensure token has proper permissions
4. Regenerate token if necessary

```python
# Test token manually
import requests
token = "your_token"
response = requests.get(
    "https://api.smartsheet.com/2.0/users/me",
    headers={"Authorization": f"Bearer {token}"}
)
print(response.status_code)
```

### Sheet Not Found

**Problem:** 404 Not Found for sheet ID

**Solutions:**
1. Verify sheet ID from URL
2. Check sheet exists and is accessible
3. Ensure you have sharing permissions
4. Try accessing sheet in browser first

### Column Mapping Issues

**Problem:** Data not appearing correctly

**Solutions:**
1. Verify column names match exactly (case-sensitive)
2. Ensure columns are in correct order
3. Check column types are appropriate
4. Verify sheet structure matches expected schema

### Rate Limiting

**Problem:** 429 Too Many Requests

**Solutions:**
```python
import time
import random

def add_retry_delay():
    # Add delay between requests
    time.sleep(random.uniform(0.5, 1.5))
```

### Data Type Mismatches

**Problem:** Dates or numbers not syncing correctly

**Solutions:**
1. Use ISO 8601 format for dates: `2023-01-01T12:00:00Z`
2. Ensure numeric fields contain numbers, not strings
3. Check Smartsheet column types match data types
4. Convert data before sending to API

## SharePoint Integration Issues

### Connection Failures

**Problem:** Cannot connect to SharePoint

**Solutions:**
1. Verify SharePoint URL is accessible
2. Check network connectivity
3. Test credentials in browser
4. Verify site exists and is accessible

```python
# Test SharePoint connectivity
import requests
from requests.auth import HTTPBasicAuth

response = requests.get(
    "https://yourcompany.sharepoint.com/sites/yoursite",
    auth=HTTPBasicAuth("username", "password")
)
print(response.status_code)
```

### Authentication Issues

**Problem:** 401 Unauthorized

**Solutions:**
1. Verify username and password
2. Check if MFA is enabled (basic auth doesn't work with MFA)
3. Ensure account is not locked
4. Try accessing SharePoint in browser first

### File Access Issues

**Problem:** Cannot access Excel file

**Solutions:**
1. Verify file URL is correct
2. Check file exists in SharePoint
3. Ensure you have read/write permissions
4. Check if file is checked out by another user

### Timeout Issues

**Problem:** Requests timing out

**Solutions:**
```python
# Increase timeout
response = requests.get(url, timeout=60)

# Add retry logic
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504]
)
adapter = HTTPAdapter(max_retries=retry_strategy)
```

## Dashboard Issues

### Dashboard Not Loading

**Problem:** Blank page or loading spinner stuck

**Solutions:**
1. Check browser console for errors (F12)
2. Verify API credentials are set
3. Check network requests in DevTools
4. Ensure JavaScript is enabled

### CORS Errors

**Problem:** CORS policy errors in browser console

**Solutions:**
1. Smartsheets API supports CORS - verify API is accessible
2. Check if any proxy or firewall is blocking requests
3. Try different browser
4. Ensure API token is valid

### API Credentials Not Saving

**Problem:** Credentials not persisting

**Solutions:**
1. Check if localStorage is enabled
2. Clear browser cache and try again
3. Check browser privacy settings
4. Try incognito mode to test

### Comments Not Displaying

**Problem:** No comments appear in dashboard

**Solutions:**
1. Check if Smartsheets sheet has data
2. Verify column structure matches expected
3. Check browser console for API errors
4. Test API directly with curl

```javascript
// Test API in browser console
fetch('https://api.smartsheet.com/2.0/sheets/YOUR_SHEET_ID', {
    headers: {
        'Authorization': 'Bearer YOUR_TOKEN'
    }
})
.then(r => r.json())
.then(console.log);
```

## Sync Script Issues

### Sync Fails Silent Errors

**Problem:** Script runs but no changes occur

**Solutions:**
1. Enable debug logging
2. Check logs for error messages
3. Verify configuration is correct
4. Test individual components

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Data Not Syncing

**Problem:** Changes not appearing in destination

**Solutions:**
1. Verify source data exists
2. Check field mapping is correct
3. Ensure IDs match between systems
4. Check for data validation errors

### ID Mismatches

**Problem:** Comments not matching by ID

**Solutions:**
1. Ensure comment_id is consistent across systems
2. Check for UUID format consistency
3. Verify no ID collisions
4. Check for null/empty IDs

### Broken or Unavailable Flag Pairing

**Problem:** Flag actions are disabled or a comment shows a pair issue

**Solutions:**
1. Ensure every `comment_id` is non-empty and unique
2. Verify both paired rows reference each other through `paired_comment_id`
3. Ensure `paired_comment_id`, `flag_reason`, and `flagged_date` columns exist with exact names
4. Remove one-sided values from both rows, refresh, and recreate the pair through User view

### Date Format Issues

**Problem:** Dates not syncing correctly

**Solutions:**
1. Use ISO 8601 format consistently
2. Check timezone handling
3. Verify date parsing in both systems
4. Use UTC for consistency

## Excel File Issues

### File Not Opening

**Problem:** Cannot read Excel file

**Solutions:**
1. Verify file is not corrupted
2. Check file format (.xlsx)
3. Ensure file is not password protected
4. Try opening in Excel first

### Data Not Reading

**Problem:** openpyxl cannot read data

**Solutions:**
1. Verify sheet name is correct
2. Check headers are in first row
3. Ensure data starts from row 2
4. Check for merged cells

### File Writing Errors

**Problem:** Cannot write to Excel file

**Solutions:**
1. Check file permissions
2. Ensure file is not open in Excel
3. Verify directory is writable
4. Check disk space

### Structure Mismatches

**Problem:** Excel structure doesn't match expected

**Solutions:**
1. Verify sheet name: "Comments"
2. Check headers: comment_id, comment_name, comment_text, age, aging_bucket, created_date, modified_date, paired_comment_id, flag_reason, flagged_date
3. Ensure headers are in first row
4. Verify data types are correct

## Performance Issues

### Slow Sync Performance

**Problem:** Sync operations take too long

**Solutions:**
1. Reduce batch size in config
2. Implement parallel processing
3. Add pagination for large datasets
4. Cache frequently accessed data

```python
# Reduce batch size
SYNC_BATCH_SIZE = 50  # instead of 100
```

### Memory Issues

**Problem:** Script runs out of memory

**Solutions:**
1. Process data in chunks
2. Stream data instead of loading all at once
3. Clear unused variables
4. Use generators instead of lists

### Dashboard Performance

**Problem:** Dashboard is slow or unresponsive

**Solutions:**
1. Implement pagination for large datasets
2. Add virtual scrolling
3. Debounce search input
4. Optimize rendering

```javascript
// Debounce search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
```

## Debugging Tips

### Enable Debug Logging

```python
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### Use Print Statements

```python
print(f"Debug: Variable value = {variable}")
print(f"Debug: Type = {type(variable)}")
```

### Check API Responses

```python
response = requests.get(url)
print(f"Status: {response.status_code}")
print(f"Headers: {response.headers}")
print(f"Body: {response.text}")
```

### Test Components Individually

```bash
# Test Smartsheets client
python -m comment_sync.clients.smartsheet

# Test SharePoint client
python -m comment_sync.clients.sharepoint

# Test sync script
python -m comment_sync.sync
```

## Getting Help

If you're still experiencing issues:

1. Check the error logs carefully
2. Review the relevant setup guide
3. Test with minimal configuration
4. Try alternative approaches
5. Check for known issues in documentation

## Known Limitations

- Basic authentication for SharePoint (not production-ready)
- No real-time sync
- No conflict resolution
- Single user assumption
- Basic error handling
- No retry logic for transient failures

## Reporting Issues

When reporting issues, include:

1. Python version and OS
2. Error messages and stack traces
3. Configuration (with sensitive data removed)
4. Steps to reproduce
5. Expected vs actual behavior
6. Relevant logs