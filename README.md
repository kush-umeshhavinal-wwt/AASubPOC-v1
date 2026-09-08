# Two-Way Comment Sync POC

A proof-of-concept system demonstrating bidirectional synchronization between Excel (SharePoint), Smartsheets, and a web dashboard for comment management.

## System Overview

This POC implements a complete two-way write-back system:

- **Excel File (SharePoint)**: Master data source with structured comment data
- **Python Sync Script**: Bidirectional sync between SharePoint Excel and Smartsheets using APIs
- **HTML Dashboard**: Local JavaScript application with full CRUD operations

### Data Flow

```
Excel ↔ Smartsheets ↔ HTML Dashboard
   ↓           ↓              ↓
SharePoint   API          CRUD Operations
```

## Features

- ✅ Bidirectional sync between Excel and Smartsheets
- ✅ Full CRUD operations in HTML dashboard
- ✅ Manual sync triggers
- ✅ Search and filter functionality
- ✅ Polished, responsive UI
- ✅ Basic error handling
- ✅ Sample data generation

## Project Structure

```
AASubPOC-v1/
├── README.md                      # This file
├── PLAN.md                        # Detailed implementation plan
├── TEST_PLAN.md                   # Manual testing procedures
├── config.py                      # Configuration and API credentials
├── requirements.txt               # Python dependencies
├── sync_script.py                 # Main sync orchestration logic
├── run_sync.py                    # Manual sync trigger script
├── smartsheets_client.py          # Smartsheets API client
├── sharepoint_client.py           # SharePoint/Excel client
├── create_sample_excel.py         # Sample Excel file generator
├── sample_data/
│   └── comments_sample.xlsx       # Sample Excel file for testing
├── dashboard/
│   ├── index.html                 # Main HTML dashboard
│   ├── dashboard.js               # Dashboard JavaScript logic
│   ├── styles.css                 # Dashboard styling
│   └── api.js                     # Smartsheets API wrapper
├── docs/
│   ├── API_SETUP.md               # Smartsheets API setup guide
│   ├── SHAREPOINT_SETUP.md        # SharePoint integration guide
│   └── TROUBLESHOOTING.md         # Common issues and solutions
└── .env.example                   # Environment variables template
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

4. **Generate sample Excel data**
   ```bash
   python create_sample_excel.py
   ```

### Configuration

Edit `config.py` or create a `.env` file with your credentials:

```python
# Smartsheets Configuration
SMARTSHEET_API_TOKEN=your_token_here
SMARTSHEET_SHEET_ID=your_sheet_id_here

# SharePoint Configuration (optional)
SHAREPOINT_SITE_URL=https://your-sharepoint-site.com
SHAREPOINT_FILE_URL=https://your-sharepoint-site.com/path/to/comments.xlsx
SHAREPOINT_USERNAME=your_username
SHAREPOINT_PASSWORD=your_password
```

### Usage

#### Running the Sync Script

**Interactive mode:**
```bash
python run_sync.py
```

**Programmatic usage:**
```python
from sync_script import CommentSync

sync = CommentSync()
# Sync Excel to Smartsheets
sync.sync_excel_to_smartsheet()
# Sync Smartsheets to Excel
sync.sync_smartsheet_to_excel()
# Bidirectional sync
sync.bidirectional_sync()
```

#### Using the HTML Dashboard

1. Open `dashboard/index.html` in a web browser
2. Enter your Smartsheets API credentials when prompted
3. The dashboard will load comments from Smartsheets
4. Use the interface to create, edit, delete, search, and filter comments

## Data Schema

Each comment contains the following fields:

```python
{
    "comment_id": "string (UUID)",
    "comment_text": "string",
    "created_date": "ISO 8601 datetime",
    "modified_date": "ISO 8601 datetime",
    "status": "active | archived"
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
python smartsheets_client.py
```

**Test SharePoint client:**
```bash
python sharepoint_client.py
```

**Test sync script:**
```bash
python sync_script.py
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
- [Test Plan](TEST_PLAN.md)

## Limitations

This is a POC with the following limitations:

- No real-time sync (manual trigger only)
- No conflict resolution (last write wins)
- No authentication/security for POC
- Single user assumption (no multi-user concurrency)
- Basic error handling (not production-grade)
- SharePoint integration requires proper credentials

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
- Review the [test plan](TEST_PLAN.md)
- Examine the [implementation plan](PLAN.md)

## Acknowledgments

Built as a proof-of-concept for demonstrating two-way data synchronization between Excel, Smartsheets, and web applications.