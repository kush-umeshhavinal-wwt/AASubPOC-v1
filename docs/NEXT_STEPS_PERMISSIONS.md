# Next Steps: SharePoint Permissions and Project Handoff

## Project status

The POC has demonstrated the core data flow:

- Dashboard comments can be created in Smartsheet.
- Excel comments can be pushed to Smartsheet.
- Smartsheet comments can be pulled into Excel.
- Local Excel read/write behavior works.
- SharePoint download, upload, and sync sequencing are covered by automated tests using isolated SharePoint clients.
- Direct live SharePoint Online authentication has not been tested.

The remaining blocker is authorization to access SharePoint Online programmatically.

## Why permission is required

SharePoint Online does not permit an application to download or upload a private workbook without an authenticated Microsoft identity and authorized application. This requirement cannot be safely bypassed.

The current implementation supports interactive Microsoft authentication through an Entra ID public-client application. It intentionally does not use browser cookies, copied session tokens, disabled TLS validation, or embedded Microsoft 365 passwords.

## Target resource

- Site: `https://wwt.sharepoint.com/sites/fsapowerflowtest`
- Workbook: `/sites/fsapowerflowtest/Shared Documents/AA Sub POC 2026/comments_sample.xlsx`

## Administrator request

Request a single-tenant Microsoft Entra ID app registration for manual interactive use.

Required configuration:

1. Mobile and desktop application platform.
2. Redirect URI `http://localhost`.
3. Public client flow enabled.
4. Delegated SharePoint permission allowing the signed-in user to read and update the target workbook.
5. Admin consent if required by organizational policy.
6. Prefer site-selected access restricted to `https://wwt.sharepoint.com/sites/fsapowerflowtest`.

Values needed to resume:

- Directory/tenant ID or verified tenant domain.
- Application/client ID.
- Confirmation that the app and signed-in user have write access to the target site.

Interactive authentication does not require a client secret. Do not place API tokens, passwords, private keys, or client secrets in tickets, chat, or source control.

## Configuration after approval

Update the local `.env` file:

```dotenv
SHAREPOINT_AUTH_MODE=interactive
SHAREPOINT_SITE_URL=https://wwt.sharepoint.com/sites/fsapowerflowtest
SHAREPOINT_FILE_PATH="/sites/fsapowerflowtest/Shared Documents/AA Sub POC 2026/comments_sample.xlsx"
SHAREPOINT_TENANT=your_tenant_id_or_verified_domain
SHAREPOINT_CLIENT_ID=your_application_client_id
SHAREPOINT_USERNAME=
SHAREPOINT_PASSWORD=
```

## Resume checklist

1. Install dependencies with `python -m pip install -r requirements.txt`.
2. Run `python -m unittest discover -s tests -v`.
3. Close the SharePoint workbook.
4. Test interactive authentication and download:

```powershell
python -c "from sharepoint_client import connect_to_sharepoint; c=connect_to_sharepoint(); p=c.download_excel_file(); rows=c.read_excel_comments(p); print(f'Downloaded {len(rows)} comments to {p}')"
```

5. Confirm the downloaded workbook exists at `temp/comments.xlsx`.
6. Back up both the SharePoint workbook and Smartsheet.
7. Run SharePoint Excel to Smartsheet:

```powershell
python -c "from sync_script import CommentSync, format_sync_results; r=CommentSync().sync_excel_to_smartsheet(); print(format_sync_results({'excel_to_smartsheet': r}))"
```

8. Add a dashboard comment and confirm it appears in Smartsheet.
9. Run Smartsheet to SharePoint Excel:

```powershell
python -c "from sync_script import CommentSync, format_sync_results; r=CommentSync().sync_smartsheet_to_excel(); print(format_sync_results({'smartsheet_to_excel': r}))"
```

10. Open the SharePoint workbook and verify the dashboard comment appears.

## Alternatives if app registration is unavailable

### Option 1: OneDrive sync client

Sync the SharePoint document library to the Windows computer using the approved OneDrive client. Configure the POC for local mode and run synchronization against the locally synced workbook path.

Advantages:

- Uses the user's existing Microsoft sign-in.
- Avoids application credentials in Python.
- OneDrive handles transfer to and from SharePoint.

Limitations:

- The Python application is not directly testing the SharePoint API.
- Synchronization is dependent on OneDrive being signed in and healthy.
- OneDrive upload/download delays and file conflicts must be monitored.
- This is unsuitable for an unattended server process.

### Option 2: Manual transfer checkpoint

Manually download the workbook from SharePoint, run the proven local sync, and manually upload the result.

Advantages:

- Requires no application registration.
- Sufficient for a POC demonstration.

Limitations:

- Not automated.
- Vulnerable to users selecting an old or incorrect workbook.
- Requires explicit backup and version control procedures.

### Option 3: Power Automate or another approved enterprise integration

Ask the Microsoft 365 team whether an existing approved Power Automate connection, managed integration, or enterprise application can transfer the workbook to and from a controlled location.

Advantages:

- May use infrastructure already approved by the organization.
- Can preserve centralized governance and audit history.

Limitations:

- Requires a redesigned trigger and handoff mechanism.
- Still requires authorized SharePoint access through the approved platform.

## Local demonstration while blocked

Set:

```dotenv
SHAREPOINT_AUTH_MODE=local
```

Use the explicit workbook path for Excel to Smartsheet:

```powershell
python -c "from sync_script import CommentSync, format_sync_results; r=CommentSync().sync_excel_to_smartsheet(r'C:\Users\umeshhak\Downloads\FS&A - Projects\AA Sub POC\v1-POC\sample_data\comments_sample.xlsx'); print(format_sync_results({'excel_to_smartsheet': r}))"
```

Use the explicit workbook path for Smartsheet to Excel:

```powershell
python -c "from sync_script import CommentSync, format_sync_results; r=CommentSync().sync_smartsheet_to_excel(r'C:\Users\umeshhak\Downloads\FS&A - Projects\AA Sub POC\v1-POC\sample_data\comments_sample.xlsx'); print(format_sync_results({'smartsheet_to_excel': r}))"
```

In local mode, a no-argument sync expects `temp/comments.xlsx`. It will fail if that file has not been created or copied into place.

## Known POC limitations

- Excel to Smartsheet is a mirror and deletes Smartsheet rows absent from Excel.
- The workbook writer recreates the Comments worksheet and does not preserve extra columns, formulas, or formatting.
- Duplicate `comment_id` values are not automatically rejected.
- Conflict resolution is not implemented.
- The dashboard stores the Smartsheet token in browser local storage.
- The Smartsheet client still contains a POC-only global TLS verification workaround that must be removed before production use.

## Decision

The project can be paused here without losing the completed POC work. Resume direct SharePoint QA when the tenant ID/domain, application/client ID, and approved delegated site access are available. If those permissions cannot be granted, use the OneDrive-synced-folder approach for a user-operated POC or retain manual workbook transfer as the documented boundary.
