# Two-Way Comment Sync POC

A proof-of-concept system that migrates an accrued-liabilities Excel snapshot into Smartsheet, then uses Smartsheet as the source of truth for comment management and flag pairing.

## System Overview

This POC implements a one-time migration followed by Smartsheet-native management:

- **Excel Migration Snapshot**: Reads `Details AUG-26` without modifying the source workbook
- **Smartsheet**: Source of truth after migration
- **HTML Dashboard**: Full CRUD, aging analysis, and reciprocal comment flag pairing

### Data Flow

```
Excel snapshot → Smartsheet ↔ HTML Dashboard
 (read-only)   source       CRUD + flags
```

## Features

- ✅ Dry-run-first real Excel migration with backup and rollback safeguards
- ✅ Full CRUD operations in HTML dashboard
- ✅ Smartsheet-backed reciprocal comment flagging
- ✅ Search and filter functionality
- ✅ Polished, responsive UI
- ✅ Basic error handling
- ✅ Real aging KPIs and long-name presentation

## Project Structure

```
v1-POC/
├── comment_sync/                  # Python application package
│   ├── config.py                  # Configuration and shared paths
│   ├── sync.py                    # Main sync orchestration logic
│   └── clients/                   # External service integrations
│       ├── sharepoint.py          # SharePoint/Excel client
│       └── smartsheet.py          # Smartsheets API client
├── scripts/                       # Executable utilities
│   ├── import_real_excel.py       # Dry-run-first real-data migration
│   ├── run_sync.py                # Legacy normalized-workbook sync
│   └── create_sample_excel.py     # Test fixture generator
├── dashboard/                     # HTML dashboard application
│   ├── index.html
│   ├── dashboard.js
│   ├── styles.css
│   └── api.js
├── tests/                         # Automated Python tests
├── sample_data/                   # Sample workbooks
├── docs/                          # Setup, testing, and support guides
├── README.md
├── requirements.txt
└── .env.example
```

## Quick Start

### Prerequisites

- Python 3.7+
- Smartsheets account with API access
- SharePoint site with Excel file (optional for local testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kush-umeshhavinal-wwt/AASubPOC-v1.git
   cd AASubPOC-v1
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API credentials
   ```

4. **Dry-run the real workbook import**
   ```bash
   python -m scripts.import_real_excel --file "C:\\path\\to\\workbook.xlsx"
   ```
   Review the row counts, suffixed IDs, and anomaly report before staging any Smartsheet changes.

### Configuration

Edit `comment_sync/config.py` or create a `.env` file with your credentials:

```python
# Smartsheets Configuration
SMARTSHEET_API_TOKEN=your_token_here
SMARTSHEET_SHEET_ID=your_sheet_id_here

# SharePoint Configuration (optional)
SHAREPOINT_AUTH_MODE=interactive
SHAREPOINT_SITE_URL=https://wwt.sharepoint.com/sites/fsapowerflowtest
SHAREPOINT_FILE_PATH="/sites/fsapowerflowtest/Shared Documents/AA Sub POC 2026/comments_sample.xlsx"
SHAREPOINT_TENANT=your_tenant_id_or_verified_domain
SHAREPOINT_CLIENT_ID=your_entra_application_client_id
```

### Usage

#### Migrating the Real Workbook

**Dry run:**
```bash
python -m scripts.import_real_excel --file "C:\\path\\to\\workbook.xlsx"
```

**Stage rows after review:**
```bash
python -m scripts.import_real_excel --file "C:\\path\\to\\workbook.xlsx" --apply --replace
```

Staging creates a timestamped backup and verifies all real rows without deleting existing rows. Use the exact finalize command printed by the staging step only after reviewing the state file and backup. The legacy `scripts.run_sync` path is not safe for the complex `Details AUG-26` workbook.

#### Using the HTML Dashboard

1. Configure the ten required columns listed below in Smartsheet.
2. Open `dashboard/index.html` in a web browser.
3. Enter your Smartsheets API credentials when prompted.
4. Use **User view** to search, filter, add, edit, delete, pair, and unpair comments in a data grid. Pick an "as of" date and click **Calculate** to recompute each account's age from its JE effective date (start date). Aging buckets (0-30, 31-60, 61-90, 91-180, 180+) recalculate automatically.
5. Use **Leadership view** for read-only aging KPIs, flagged-pair counts, and account-level comment review.

## Data Schema

Each comment contains the following fields:

```python
{
    "comment_id": "Column H value with deterministic #2/#3 suffix when repeated",
    "comment_name": "string",
    "comment_text": "string",
    "age": "non-negative integer (days)",
    "aging_bucket": "0-30 | 31-60 | 61-90 | 91-180 | 180+",
    "start_date": "ISO 8601 date from source column AK (JE effective date)",
    "account": "account code from source column Y",
    "pl_name": "P&L name from source column F",
    "sub_program": "sub program from source column T",
    "created_date": "ISO 8601 audit date",
    "modified_date": "ISO 8601 audit date",
    "paired_comment_id": "counterpart comment UUID or empty",
    "flag_reason": "optional string",
    "flagged_date": "ISO 8601 date or empty"
}
```

## API Endpoints (Smartsheets)

- **GET**: `/sheets/{sheet_id}` - Fetch all comments
- **POST**: `/sheets/{sheet_id}/rows` - Create new comment
- **PUT**: `/sheets/{sheet_id}/rows/{row_id}` - Update comment
- **DELETE**: `/sheets/{sheet_id}/rows/{row_id}` - Delete comment

## Development

### Testing Individual Components

**Test Smartsheets client:**
```bash
python -m comment_sync.clients.smartsheet
```

**Test SharePoint client:**
```bash
python -m comment_sync.clients.sharepoint
```

**Test sync script:**
```bash
python -m comment_sync.sync
```

### Dashboard Development

The dashboard uses vanilla JavaScript and can be opened directly in a browser. For development:

1. Make changes to `dashboard/*.js` or `dashboard/*.css`
2. Refresh the browser to see changes
3. Use browser DevTools for debugging

## Documentation

- [Smartsheets API Setup Guide](docs/API_SETUP.md)
- [SharePoint Integration Guide](docs/SHAREPOINT_SETUP.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [Test Plan](docs/TEST_PLAN.md)

## Limitations

This is a POC with the following limitations:

- Excel is a one-time input snapshot; Smartsheet intentionally diverges after migration
- Cached source formula anomalies are reported but imported as-is
- No authentication/security for POC
- Single user assumption (no multi-user concurrency)
- Basic error handling (not production-grade)
- The POC stores API credentials in browser localStorage and has no production authentication boundary

## Troubleshooting

### Common Issues

1. **Smartsheets API Connection Failed**
   - Verify your API token is correct
   - Check that your sheet ID is valid
   - Ensure your sheet has the correct column structure

2. **SharePoint Connection Issues**
   - Verify SharePoint credentials
   - Check SharePoint site URL and file path
   - Ensure you have proper permissions

3. **Dashboard Not Loading Comments**
   - Check browser console for errors
   - Verify API credentials in localStorage
   - Ensure Smartsheets sheet is accessible

See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for more details.

## Future Enhancements

Potential improvements for production use:

- Real-time sync with webhooks
- Conflict resolution mechanisms
- User authentication and authorization
- Multi-user concurrency support
- Enhanced error handling and logging
- Data validation and sanitization
- Performance optimizations for large datasets
- Export/import functionality
- Advanced filtering and sorting
- Comment threading and replies

## License

This POC is provided as-is for demonstration purposes.

## Support

For issues and questions:
- Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
- Review the [test plan](docs/TEST_PLAN.md)

## Acknowledgments

Built as a proof-of-concept for demonstrating two-way data synchronization between Excel, Smartsheets, and web applications.