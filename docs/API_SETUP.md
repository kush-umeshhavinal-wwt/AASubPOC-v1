   # Smartsheets API Setup Guide

This guide walks you through setting up Smartsheets API access for the Two-Way Comment Sync POC.

## Prerequisites

- A Smartsheets account (free or paid)
- Administrator access to generate API tokens
- Basic understanding of API concepts

## Step 1: Create a Smartsheets Account

If you don't already have a Smartsheets account:

1. Visit [https://www.smartsheet.com](https://www.smartsheet.com)
2. Sign up for a free account
3. Complete the registration process

## Step 2: Generate API Token

1. Log in to your Smartsheets account
2. Click on your account name (top right corner)
3. Select "Account" from the dropdown
4. In the left sidebar, click on "API Access"
5. Click "Generate New Token"
6. Enter a name for your token (e.g., "Comment Sync POC")
7. Click "Generate Token"
8. **Important**: Copy the token immediately - you won't be able to see it again

## Step 3: Create Your Smartsheet

1. Create a new sheet in Smartsheets
2. Name it "Comments POC" (or your preferred name)
3. Create columns with the following exact names (column order does not matter):

| Column Name | Column Type | Description |
|-------------|-------------|-------------|
| comment_id | Text/Number | Unique identifier for each comment |
| comment_name | Text/Number | Account-facing name for the comment |
| comment_text | Text/Number | The actual comment content |
| age | Text/Number | Age in days from source Column A or dashboard edits |
| aging_bucket | Text/Number | Aging bucket: 0-30, 31-60, 61-90, 91-180, or 180+ |
| start_date | Date | JE effective date (source column AK), converted from Excel serial |
| account | Text/Number | Account code (source column Y) |
| pl_name | Text/Number | P&L name (source column F) |
| sub_program | Text/Number | Sub program (source column T) |
| created_date | Date | Migration/creation audit date |
| modified_date | Date | Last dashboard edit date |
| paired_comment_id | Text/Number | Counterpart comment ID for a flagged pair |
| flag_reason | Text/Number | Optional reason the comments cancel or tie together |
| flagged_date | Date | Date the pair was created |

4. Make `comment_id` the primary column if possible.

## Step 4: Get Your Sheet ID

1. Open your sheet in Smartsheets
2. Look at the URL in your browser
3. The sheet ID is the number after `/sheets/` in the URL
   - Example: `https://app.smartsheet.com/sheets/ABC123456789...`
   - Sheet ID: `ABC123456789...`

## Step 5: Configure the POC

Add your credentials to the `.env` file or `comment_sync/config.py`:

```bash
# .env file
SMARTSHEET_API_TOKEN=your_generated_token_here
SMARTSHEET_SHEET_ID=your_sheet_id_here
```

Or update `comment_sync/config.py`:

```python
SMARTSHEET_API_TOKEN = "your_generated_token_here"
SMARTSHEET_SHEET_ID = "your_sheet_id_here"
```

## Step 6: Test the Connection

Run the Smartsheets client test:

```bash
python -m comment_sync.clients.smartsheet
```

You should see output indicating successful connection to Smartsheets.

## Testing API Access

You can test your API access using curl:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://api.smartsheet.com/2.0/users/me"
```

## Common Issues

### Token Not Working

- Ensure you copied the entire token
- Check that the token hasn't expired
- Verify you have the correct permissions

### Sheet ID Not Found

- Double-check the sheet ID from the URL
- Ensure the sheet exists and is accessible
- Verify you have sharing permissions on the sheet

### Column Structure Issues

- Ensure columns are in the exact order specified
- Check that column names match exactly (case-sensitive)
- Verify column types are correct

### Rate Limiting

Smartsheets has API rate limits:
- Free account: 100 requests per minute
- Paid accounts: Higher limits

If you hit rate limits, implement delays between requests.

## Security Best Practices

- Never commit API tokens to version control
- Use environment variables or secure storage
- Rotate tokens periodically
- Limit token permissions to only what's needed
- Use separate tokens for development and production

## Next Steps

Once your Smartsheets API is set up:

1. Configure the dashboard with your credentials
2. Test the sync script with sample data
3. Proceed with SharePoint integration (if needed)
4. Run the full end-to-end test plan

## Additional Resources

- [Smartsheets API Documentation](https://smartsheet-platform.github.io/api-docs/)
- [Smartsheets Python SDK](https://github.com/smartsheet-platform/smartsheet-python-sdk)
- [Smartsheets Community](https://community.smartsheet.com/)