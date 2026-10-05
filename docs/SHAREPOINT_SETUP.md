# SharePoint Online Setup

This guide applies only to the legacy normalized `Comments` workbook workflow. Do not run it against the real `Details AUG-26` workbook: the real workbook is a read-only, one-time migration source and must be imported with `python -m scripts.import_real_excel`.

## Target workbook

- Site: `https://wwt.sharepoint.com/sites/fsapowerflowtest`
- Server-relative path: `/sites/fsapowerflowtest/Shared Documents/AA Sub POC 2026/comments_sample.xlsx`

The server-relative path is not the browser URL containing `Forms/AllItems.aspx`.

## Administrator request

Ask a Microsoft 365 administrator to create a single-tenant Entra ID app registration for manual interactive use.

The registration needs:

1. A **Mobile and desktop application** platform.
2. Redirect URI `http://localhost`.
3. Public client flow enabled.
4. Delegated SharePoint permission that allows the signed-in user to read and update the target workbook.
5. Admin consent if required by organizational policy.

Least privilege is preferred. Ask for a site-selected delegated permission with write access granted only to `https://wwt.sharepoint.com/sites/fsapowerflowtest`. If site-selected delegated access is unavailable in the tenant, the administrator must choose an organization-approved delegated SharePoint write permission for the POC.

No client secret should be placed in this repository for interactive authentication.

Request these values from the administrator:

- Directory/tenant ID or verified tenant domain
- Application/client ID
- Confirmation that `http://localhost` is registered as the desktop redirect URI
- Confirmation that the app and your user can read and update the target site

## Local configuration

Copy `.env.example` to `.env`, then configure:

```dotenv
SHAREPOINT_AUTH_MODE=interactive
SHAREPOINT_SITE_URL=https://wwt.sharepoint.com/sites/fsapowerflowtest
SHAREPOINT_FILE_PATH="/sites/fsapowerflowtest/Shared Documents/AA Sub POC 2026/comments_sample.xlsx"
SHAREPOINT_TENANT=your_tenant_id_or_verified_domain
SHAREPOINT_CLIENT_ID=your_application_client_id
SHAREPOINT_USERNAME=
SHAREPOINT_PASSWORD=
```

Keep `.env` out of source control. `SHAREPOINT_AUTH_MODE=local` retains the existing local-file behavior.

## Test authentication and download

Close the workbook in Excel, then run:

```powershell
python -c "from comment_sync.clients.sharepoint import connect_to_sharepoint; c=connect_to_sharepoint(); p=c.download_excel_file(); rows=c.read_excel_comments(p); print(f'Downloaded {len(rows)} comments to {p}')"
```

A Microsoft sign-in window should open. After authentication, the command should download the workbook to `temp/comments.xlsx` and print its comment count.

## Excel to Smartsheet

Edit the workbook in SharePoint, close it, and run:

```powershell
python -c "from comment_sync.sync import CommentSync, format_sync_results; r=CommentSync().sync_excel_to_smartsheet(); print(format_sync_results({'excel_to_smartsheet': r}))"
```

The script downloads the latest SharePoint workbook before reading it. Excel-to-Smartsheet remains a mirror operation: Smartsheet rows absent from Excel are deleted. Use a test sheet and review backups before running it.

## Smartsheet to SharePoint Excel

Add a comment in the dashboard, verify it in Smartsheet, close the SharePoint workbook, and run:

```powershell
python -c "from comment_sync.sync import CommentSync, format_sync_results; r=CommentSync().sync_smartsheet_to_excel(); print(format_sync_results({'smartsheet_to_excel': r}))"
```

The script downloads the current workbook, rewrites the local working copy from Smartsheet, and uploads it to the same SharePoint path.

## Expected failures

- `AADSTS...`: Entra app registration, redirect URI, consent, or tenant configuration is incomplete.
- `401` or `403`: the app or signed-in user lacks access.
- `404`: the server-relative workbook path is wrong.
- Locked-file or upload conflict: close the workbook and retry.

Do not bypass TLS certificate validation. Configure the corporate CA trust chain if HTTPS inspection causes certificate errors.
