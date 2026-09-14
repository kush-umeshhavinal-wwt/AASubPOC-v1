"""
Smartsheets API Client for Comment Operations
Handles CRUD operations with Smartsheets for comment data
"""

import smartsheet
import logging
from datetime import datetime
from typing import List, Dict, Optional
import config
import ssl

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SSL verification workaround for corporate environments
# This is needed for environments with proxy servers that intercept SSL
try:
    ssl._create_default_https_context = ssl._create_unverified_context
    logger.warning("SSL verification disabled - suitable for POC/testing only")
except Exception as e:
    logger.info(f"SSL context setup: {e}")


class SmartsheetsClient:
    """Client for interacting with Smartsheets API"""
    
    def __init__(self, api_token: str = None):
        """
        Initialize Smartsheets client
        
        Args:
            api_token: Smartsheets API token (uses config if not provided)
        """
        self.api_token = api_token or config.SMARTSHEET_API_TOKEN
        if not self.api_token:
            raise ValueError("Smartsheets API token is required")
        
        self.client = smartsheet.Smartsheet(self.api_token)
        self.client.errors_as_exceptions = True
        self._column_cache = {}
        
    def connect_to_smartsheet(self) -> bool:
        """
        Test connection to Smartsheets
        
        Returns:
            bool: True if connection successful
        """
        try:
            user = self.client.Users.get_current_user()
            logger.info(f"Connected to Smartsheets as: {user.data.email}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Smartsheets: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            if hasattr(e, 'response'):
                logger.error(f"Response status: {e.response.status_code if hasattr(e.response, 'status_code') else 'N/A'}")
                logger.error(f"Response data: {e.response.text if hasattr(e.response, 'text') else 'N/A'}")
            return False
    
    def get_all_comments(self, sheet_id: str = None) -> List[Dict]:
        """
        Fetch all comments from Smartsheets
        
        Args:
            sheet_id: Smartsheets sheet ID (uses config if not provided)
            
        Returns:
            List of comment dictionaries
        """
        sheet_id = sheet_id or config.SMARTSHEET_SHEET_ID
        if not sheet_id:
            raise ValueError("Smartsheets sheet ID is required")
        
        try:
            sheet = self.client.Sheets.get_sheet(sheet_id)
            comments = []
            
            for row in sheet.rows:
                # Skip empty rows
                if not row.cells:
                    continue
                
                comment = {
                    'row_id': row.id,
                    'comment_id': self._get_cell_value(row, 0),
                    'comment_text': self._get_cell_value(row, 1),
                    'created_date': self._get_cell_value(row, 2),
                    'modified_date': self._get_cell_value(row, 3),
                    'status': self._get_cell_value(row, 4)
                }
                
                # Only include rows with comment_id
                if comment['comment_id']:
                    comments.append(comment)
            
            logger.info(f"Retrieved {len(comments)} comments from Smartsheets")
            return comments
            
        except Exception as e:
            logger.error(f"Failed to get comments from Smartsheets: {e}")
            raise
    
    def create_comment(self, comment_data: Dict, sheet_id: str = None) -> Dict:
        """
        Create a new comment in Smartsheets
        
        Args:
            comment_data: Dictionary containing comment fields
            sheet_id: Smartsheets sheet ID (uses config if not provided)
            
        Returns:
            Created comment data with row_id
        """
        sheet_id = sheet_id or config.SMARTSHEET_SHEET_ID
        if not sheet_id:
            raise ValueError("Smartsheets sheet ID is required")
        
        try:
            # Create new row
            row = smartsheet.models.Row()
            row.to_bottom = True
            
            # Get column IDs
            try:
                col_ids = [
                    self._get_column_id(sheet_id, 0),
                    self._get_column_id(sheet_id, 1),
                    self._get_column_id(sheet_id, 2),
                    self._get_column_id(sheet_id, 3),
                    self._get_column_id(sheet_id, 4)
                ]
            except Exception as e:
                logger.error(f"Failed to get column IDs: {e}")
                raise
            
            # Set cell values
            row.cells = [
                smartsheet.models.Cell({
                    'columnId': col_ids[0],
                    'value': comment_data.get('comment_id', '')
                }),
                smartsheet.models.Cell({
                    'columnId': col_ids[1],
                    'value': comment_data.get('comment_text', '')
                }),
                smartsheet.models.Cell({
                    'columnId': col_ids[2],
                    'value': comment_data.get('created_date', '')
                }),
                smartsheet.models.Cell({
                    'columnId': col_ids[3],
                    'value': comment_data.get('modified_date', '')
                }),
                smartsheet.models.Cell({
                    'columnId': col_ids[4],
                    'value': comment_data.get('status', 'active')
                })
            ]
            
            # Add row to sheet
            result = self.client.Sheets.add_rows(sheet_id, [row])
            
            if result and result.data and len(result.data) > 0:
                created_row = result.data[0]
                logger.info(f"Created comment with row_id: {created_row.id}")
                return {
                    **comment_data,
                    'row_id': created_row.id
                }
            else:
                raise Exception("Failed to create comment - no data returned")
                
        except Exception as e:
            logger.error(f"Failed to create comment in Smartsheets: {e}")
            raise
    
    def update_comment(self, row_id: int, comment_data: Dict, sheet_id: str = None) -> bool:
        """
        Update an existing comment in Smartsheets
        
        Args:
            row_id: Smartsheets row ID
            comment_data: Dictionary containing updated comment fields
            sheet_id: Smartsheets sheet ID (uses config if not provided)
            
        Returns:
            bool: True if update successful
        """
        sheet_id = sheet_id or config.SMARTSHEET_SHEET_ID
        if not sheet_id:
            raise ValueError("Smartsheets sheet ID is required")
        
        try:
            # Update existing row
            row = smartsheet.models.Row()
            row.id = row_id
            
            # Get column IDs
            try:
                col_ids = [
                    self._get_column_id(sheet_id, 0),
                    self._get_column_id(sheet_id, 1),
                    self._get_column_id(sheet_id, 2),
                    self._get_column_id(sheet_id, 3),
                    self._get_column_id(sheet_id, 4)
                ]
            except Exception as e:
                logger.error(f"Failed to get column IDs: {e}")
                raise
            
            # Set cell values
            row.cells = [
                smartsheet.models.Cell({
                    'columnId': col_ids[0],
                    'value': comment_data.get('comment_id', '')
                }),
                smartsheet.models.Cell({
                    'columnId': col_ids[1],
                    'value': comment_data.get('comment_text', '')
                }),
                smartsheet.models.Cell({
                    'columnId': col_ids[2],
                    'value': comment_data.get('created_date', '')
                }),
                smartsheet.models.Cell({
                    'columnId': col_ids[3],
                    'value': comment_data.get('modified_date', '')
                }),
                smartsheet.models.Cell({
                    'columnId': col_ids[4],
                    'value': comment_data.get('status', 'active')
                })
            ]
            
            # Update row in sheet
            self.client.Sheets.update_rows(sheet_id, [row])
            logger.info(f"Updated comment with row_id: {row_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update comment in Smartsheets: {e}")
            raise
    
    def delete_comment(self, row_id: int, sheet_id: str = None) -> bool:
        """
        Delete a comment from Smartsheets
        
        Args:
            row_id: Smartsheets row ID
            sheet_id: Smartsheets sheet ID (uses config if not provided)
            
        Returns:
            bool: True if deletion successful
        """
        sheet_id = sheet_id or config.SMARTSHEET_SHEET_ID
        if not sheet_id:
            raise ValueError("Smartsheets sheet ID is required")
        
        try:
            self.client.Sheets.delete_rows(sheet_id, [row_id])
            logger.info(f"Deleted comment with row_id: {row_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete comment from Smartsheets: {e}")
            raise
    
    def _get_cell_value(self, row, cell_index: int) -> str:
        """
        Safely get cell value from a row
        
        Args:
            row: Smartsheet row object
            cell_index: Index of the cell
            
        Returns:
            Cell value as string or empty string
        """
        try:
            if cell_index < len(row.cells):
                return str(row.cells[cell_index].value or '')
            return ''
        except Exception:
            return ''
    
    def _get_column_id(self, sheet_id: str, column_index: int) -> str:
        """
        Get column ID by index from the sheet (with caching)
        
        Args:
            sheet_id: Smartsheets sheet ID
            column_index: Index of the column
            
        Returns:
            Column ID as string
        """
        cache_key = f"{sheet_id}_{column_index}"
        
        # Return cached value if available
        if cache_key in self._column_cache:
            return self._column_cache[cache_key]
        
        try:
            sheet = self.client.Sheets.get_sheet(sheet_id)
            if column_index < len(sheet.columns):
                column_id = sheet.columns[column_index].id
                self._column_cache[cache_key] = column_id
                return column_id
            raise Exception(f"Column index {column_index} not found")
        except Exception as e:
            logger.error(f"Failed to get column ID: {e}")
            raise


# Convenience functions for easier usage
def connect_to_smartsheet(api_token: str = None) -> SmartsheetsClient:
    """
    Create and return a Smartsheets client
    
    Args:
        api_token: Smartsheets API token
        
    Returns:
        SmartsheetsClient instance
    """
    client = SmartsheetsClient(api_token)
    # Skip user connection test since it fails in some environments
    # The actual sheet operations work fine
    return client


if __name__ == "__main__":
    # Test the client
    try:
        # Initialize client without user connection test
        client = SmartsheetsClient()
        print("Smartsheets client initialized")
        
        # Test getting comments (will fail if sheet not set up)
        comments = client.get_all_comments()
        print(f"Found {len(comments)} comments")
        
        if comments:
            print("Sample comment:")
            print(f"  ID: {comments[0].get('comment_id')}")
            print(f"  Text: {comments[0].get('comment_text', '')[:50]}...")
        
    except Exception as e:
        print(f"Error: {e}")