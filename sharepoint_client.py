"""
SharePoint/Excel Client for Comment Operations
Handles SharePoint API integration and Excel file manipulation
"""

import openpyxl
import requests
import logging
from datetime import datetime
from typing import List, Dict, Optional
import os
import config
import urllib3

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SSL verification workaround for corporate environments
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class SharePointClient:
    """Client for interacting with SharePoint and Excel files"""
    
    def __init__(self, site_url: str = None, username: str = None, password: str = None):
        """
        Initialize SharePoint client
        
        Args:
            site_url: SharePoint site URL (uses config if not provided)
            username: SharePoint username (uses config if not provided)
            password: SharePoint password (uses config if not provided)
        """
        self.site_url = site_url or config.SHAREPOINT_SITE_URL
        self.username = username or config.SHAREPOINT_USERNAME
        self.password = password or config.SHAREPOINT_PASSWORD
        
        if not all([self.site_url, self.username, self.password]):
            logger.warning("SharePoint credentials not fully configured - will use local file operations only")
            self.sharepoint_enabled = False
        else:
            self.sharepoint_enabled = True
    
    def connect_to_sharepoint(self) -> bool:
        """
        Test connection to SharePoint
        
        Returns:
            bool: True if connection successful
        """
        if not self.sharepoint_enabled:
            logger.info("SharePoint integration not configured")
            return False
        
        try:
            # Test connection by making a simple request
            response = requests.get(
                self.site_url,
                auth=(self.username, self.password),
                timeout=10,
                verify=False  # Disable SSL verification for corporate environments
            )
            
            if response.status_code in [200, 401]:  # 401 means server is responding but auth failed
                logger.info(f"Connected to SharePoint at: {self.site_url}")
                return True
            else:
                logger.error(f"Failed to connect to SharePoint: Status {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to connect to SharePoint: {e}")
            return False
    
    def download_excel_file(self, file_url: str = None, local_path: str = None) -> str:
        """
        Download Excel file from SharePoint
        
        Args:
            file_url: SharePoint file URL (uses config if not provided)
            local_path: Local path to save the file (uses config if not provided)
            
        Returns:
            Local file path
        """
        if not self.sharepoint_enabled:
            logger.warning("SharePoint integration not enabled - using local file")
            return local_path or config.LOCAL_EXCEL_FILE
        
        file_url = file_url or config.SHAREPOINT_FILE_URL
        local_path = local_path or config.LOCAL_EXCEL_FILE
        
        if not file_url:
            raise ValueError("SharePoint file URL is required")
        
        try:
            response = requests.get(
                file_url,
                auth=(self.username, self.password),
                timeout=30,
                verify=False  # Disable SSL verification for corporate environments
            )
            
            if response.status_code == 200:
                # Ensure directory exists
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                
                with open(local_path, 'wb') as f:
                    f.write(response.content)
                
                logger.info(f"Downloaded Excel file to: {local_path}")
                return local_path
            else:
                raise Exception(f"Failed to download file: Status {response.status_code}")
                
        except Exception as e:
            logger.error(f"Failed to download Excel file from SharePoint: {e}")
            raise
    
    def upload_excel_file(self, file_url: str = None, local_path: str = None) -> bool:
        """
        Upload Excel file to SharePoint
        
        Args:
            file_url: SharePoint file URL (uses config if not provided)
            local_path: Local file path to upload (uses config if not provided)
            
        Returns:
            bool: True if upload successful
        """
        if not self.sharepoint_enabled:
            logger.warning("SharePoint integration not enabled - skipping upload")
            return False
        
        file_url = file_url or config.SHAREPOINT_FILE_URL
        local_path = local_path or config.LOCAL_EXCEL_FILE
        
        if not file_url or not local_path:
            raise ValueError("Both file URL and local path are required")
        
        try:
            with open(local_path, 'rb') as f:
                files = {'file': (os.path.basename(local_path), f)}
                response = requests.put(
                    file_url,
                    auth=(self.username, self.password),
                    files=files,
                    timeout=30,
                    verify=False  # Disable SSL verification for corporate environments
                )
            
            if response.status_code in [200, 201]:
                logger.info(f"Uploaded Excel file to SharePoint: {file_url}")
                return True
            else:
                raise Exception(f"Failed to upload file: Status {response.status_code}")
                
        except Exception as e:
            logger.error(f"Failed to upload Excel file to SharePoint: {e}")
            raise
    
    def read_excel_comments(self, local_path: str = None) -> List[Dict]:
        """
        Read comments from Excel file
        
        Args:
            local_path: Local Excel file path (uses config if not provided)
            
        Returns:
            List of comment dictionaries
        """
        local_path = local_path or config.LOCAL_EXCEL_FILE
        
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Excel file not found: {local_path}")
        
        try:
            workbook = openpyxl.load_workbook(local_path)
            
            # Get the Comments sheet
            if config.EXCEL_SHEET_NAME in workbook.sheetnames:
                sheet = workbook[config.EXCEL_SHEET_NAME]
            else:
                # Use first sheet if Comments sheet doesn't exist
                sheet = workbook.active
                logger.warning(f"Sheet '{config.EXCEL_SHEET_NAME}' not found, using active sheet")
            
            comments = []
            headers = None
            
            for row_num, row in enumerate(sheet.iter_rows(values_only=True), 1):
                if row_num == 1:
                    # First row is headers
                    headers = [str(cell) if cell is not None else '' for cell in row]
                    continue
                
                # Skip empty rows
                if not any(row):
                    continue
                
                # Create comment dictionary
                comment = {}
                for i, (header, value) in enumerate(zip(headers, row)):
                    if i < len(config.EXCEL_HEADERS):
                        comment[config.EXCEL_HEADERS[i]] = str(value) if value is not None else ''
                
                # Only include rows with comment_id
                if comment.get('comment_id'):
                    comments.append(comment)
            
            workbook.close()
            logger.info(f"Read {len(comments)} comments from Excel file")
            return comments
            
        except Exception as e:
            logger.error(f"Failed to read comments from Excel file: {e}")
            raise
    
    def write_excel_comments(self, comments: List[Dict], local_path: str = None) -> str:
        """
        Write comments to Excel file
        
        Args:
            comments: List of comment dictionaries
            local_path: Local Excel file path (uses config if not provided)
            
        Returns:
            Local file path
        """
        local_path = local_path or config.LOCAL_EXCEL_FILE
        
        try:
            # Create new workbook
            workbook = openpyxl.Workbook()
            sheet = workbook.active
            sheet.title = config.EXCEL_SHEET_NAME
            
            # Write headers
            sheet.append(config.EXCEL_HEADERS)
            
            # Write comments
            for comment in comments:
                row = [
                    comment.get('comment_id', ''),
                    comment.get('comment_text', ''),
                    comment.get('created_date', ''),
                    comment.get('modified_date', ''),
                    comment.get('status', 'active')
                ]
                sheet.append(row)
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            
            # Save workbook
            workbook.save(local_path)
            workbook.close()
            
            logger.info(f"Wrote {len(comments)} comments to Excel file: {local_path}")
            return local_path
            
        except Exception as e:
            logger.error(f"Failed to write comments to Excel file: {e}")
            raise


# Convenience functions for easier usage
def connect_to_sharepoint(site_url: str = None, username: str = None, password: str = None) -> SharePointClient:
    """
    Create and return a connected SharePoint client
    
    Args:
        site_url: SharePoint site URL
        username: SharePoint username
        password: SharePoint password
        
    Returns:
        Connected SharePointClient instance
    """
    client = SharePointClient(site_url, username, password)
    if client.connect_to_sharepoint():
        return client
    else:
        logger.warning("SharePoint connection failed - client will use local file operations only")
        return client


if __name__ == "__main__":
    # Test the client
    try:
        client = connect_to_sharepoint()
        print("SharePoint client initialized")
        
        # Test reading from local file
        local_excel = os.path.join(os.path.dirname(__file__), "sample_data", "comments_sample.xlsx")
        if os.path.exists(local_excel):
            comments = client.read_excel_comments(local_excel)
            print(f"Read {len(comments)} comments from sample Excel file")
            for comment in comments[:3]:
                print(f"  - {comment.get('comment_text', '')[:50]}...")
        
    except Exception as e:
        print(f"Error: {e}")