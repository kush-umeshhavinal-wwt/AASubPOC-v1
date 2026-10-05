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
SHAREPOINT_AUTH_MODE = os.getenv("SHAREPOINT_AUTH_MODE", "local").lower()
SHAREPOINT_SITE_URL = os.getenv("SHAREPOINT_SITE_URL", "")
SHAREPOINT_FILE_PATH = os.getenv("SHAREPOINT_FILE_PATH", "")
SHAREPOINT_TENANT = os.getenv("SHAREPOINT_TENANT", "")
SHAREPOINT_CLIENT_ID = os.getenv("SHAREPOINT_CLIENT_ID", "")
SHAREPOINT_USERNAME = os.getenv("SHAREPOINT_USERNAME", "")
SHAREPOINT_PASSWORD = os.getenv("SHAREPOINT_PASSWORD", "")

# Local File Paths
PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
LOCAL_TEMP_DIR = os.path.join(PROJECT_ROOT, "temp")
LOCAL_EXCEL_FILE = os.path.join(LOCAL_TEMP_DIR, "comments.xlsx")

# Create temp directory if it doesn't exist
os.makedirs(LOCAL_TEMP_DIR, exist_ok=True)

# Data Schema Constants

# Excel Sheet Configuration
EXCEL_SHEET_NAME = "Comments"
EXCEL_HEADERS = [
    "comment_id",
    "comment_name",
    "comment_text",
    "age",
    "aging_bucket",
    "start_date",
    "account",
    "pl_name",
    "sub_program",
    "created_date",
    "modified_date",
    "paired_comment_id",
    "flag_reason",
    "flagged_date"
]

# Sync Configuration
SYNC_BATCH_SIZE = 100  # Number of records to process in each batch