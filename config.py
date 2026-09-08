"""
Configuration file for the Two-Way Comment Sync POC
Contains API credentials and system settings
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Smartsheets Configuration
SMARTSHEET_API_TOKEN = os.getenv("SMARTSHEET_API_TOKEN", "")
SMARTSHEET_SHEET_ID = os.getenv("SMARTSHEET_SHEET_ID", "")

# SharePoint Configuration
SHAREPOINT_SITE_URL = os.getenv("SHAREPOINT_SITE_URL", "")
SHAREPOINT_FILE_URL = os.getenv("SHAREPOINT_FILE_URL", "")
SHAREPOINT_USERNAME = os.getenv("SHAREPOINT_USERNAME", "")
SHAREPOINT_PASSWORD = os.getenv("SHAREPOINT_PASSWORD", "")

# Local File Paths
LOCAL_TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp")
LOCAL_EXCEL_FILE = os.path.join(LOCAL_TEMP_DIR, "comments.xlsx")

# Create temp directory if it doesn't exist
os.makedirs(LOCAL_TEMP_DIR, exist_ok=True)

# Data Schema Constants
STATUS_ACTIVE = "active"
STATUS_ARCHIVED = "archived"
VALID_STATUSES = [STATUS_ACTIVE, STATUS_ARCHIVED]

# Excel Sheet Configuration
EXCEL_SHEET_NAME = "Comments"
EXCEL_HEADERS = ["comment_id", "comment_text", "created_date", "modified_date", "status"]

# Sync Configuration
SYNC_BATCH_SIZE = 100  # Number of records to process in each batch