"""
Main Sync Script for Two-Way Comment Sync
Handles bidirectional synchronization between Excel and Smartsheets
"""

import logging
import os
from datetime import datetime
from typing import List, Dict, Tuple
import uuid
from comment_sync import config
from comment_sync.clients.smartsheet import SmartsheetsClient
from comment_sync.clients.sharepoint import SharePointClient, connect_to_sharepoint

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CommentSync:
    """Handles synchronization between Excel and Smartsheets"""
    
    def __init__(self):
        """Initialize sync clients"""
        self.smartsheets_client = None
        self.sharepoint_client = None
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize Smartsheets and SharePoint clients"""
        try:
            self.smartsheets_client = SmartsheetsClient()
            logger.info("Smartsheets client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Smartsheets client: {e}")
            self.smartsheets_client = None
        
        try:
            self.sharepoint_client = connect_to_sharepoint()
            logger.info("SharePoint client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize SharePoint client: {e}")
            self.sharepoint_client = None
    
    def sync_excel_to_smartsheet(self, excel_path: str = None) -> Dict[str, int]:
        """
        Sync comments from Excel to Smartsheets
        
        Args:
            excel_path: Local Excel file path (uses config if not provided)
            
        Returns:
            Dictionary with sync statistics (added, updated, deleted)
        """
        if not self.smartsheets_client or not self.sharepoint_client:
            raise Exception("Clients not properly initialized")
        
        stats = {'added': 0, 'updated': 0, 'deleted': 0, 'skipped': 0}
        
        try:
            # Download Excel from SharePoint (or use local)
            logger.info("Downloading Excel file from SharePoint...")
            local_excel = self.sharepoint_client.download_excel_file(
                local_path=excel_path or config.LOCAL_EXCEL_FILE
            )
            
            # Read comments from Excel
            logger.info("Reading comments from Excel...")
            excel_comments = self.sharepoint_client.read_excel_comments(local_excel)
            logger.info(f"Found {len(excel_comments)} comments in Excel")
            
            # Get existing comments from Smartsheets
            logger.info("Fetching existing comments from Smartsheets...")
            smartsheet_comments = self.smartsheets_client.get_all_comments()
            smartsheet_dict = {c['comment_id']: c for c in smartsheet_comments}
            
            # Sync each Excel comment to Smartsheets
            for excel_comment in excel_comments:
                comment_id = excel_comment.get('comment_id')
                
                if not comment_id:
                    stats['skipped'] += 1
                    continue
                
                # Update modified date
                excel_comment['modified_date'] = datetime.now().isoformat()
                
                if comment_id in smartsheet_dict:
                    # Update existing comment
                    smartsheet_row_id = smartsheet_dict[comment_id].get('row_id')
                    if smartsheet_row_id:
                        self.smartsheets_client.update_comment(
                            smartsheet_row_id,
                            excel_comment
                        )
                        stats['updated'] += 1
                        logger.info(f"Updated comment: {comment_id}")
                else:
                    # Create new comment
                    self.smartsheets_client.create_comment(excel_comment)
                    stats['added'] += 1
                    logger.info(f"Added comment: {comment_id}")
            
            # Handle deletions (comments in Smartsheets but not in Excel)
            for smartsheet_comment in smartsheet_comments:
                comment_id = smartsheet_comment.get('comment_id')
                if comment_id and comment_id not in [c.get('comment_id') for c in excel_comments]:
                    row_id = smartsheet_comment.get('row_id')
                    if row_id:
                        self.smartsheets_client.delete_comment(row_id)
                        stats['deleted'] += 1
                        logger.info(f"Deleted comment: {comment_id}")
            
            logger.info(f"Excel to Smartsheets sync complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Failed to sync Excel to Smartsheets: {e}")
            raise
    
    def sync_smartsheet_to_excel(self, excel_path: str = None) -> Dict[str, int]:
        """
        Sync comments from Smartsheets to Excel
        
        Args:
            excel_path: Local Excel file path (uses config if not provided)
            
        Returns:
            Dictionary with sync statistics (added, updated, deleted)
        """
        if not self.smartsheets_client or not self.sharepoint_client:
            raise Exception("Clients not properly initialized")
        
        stats = {'added': 0, 'updated': 0, 'deleted': 0, 'skipped': 0}
        
        try:
            # Download Excel from SharePoint (or use local)
            logger.info("Downloading Excel file from SharePoint...")
            local_excel = self.sharepoint_client.download_excel_file(
                local_path=excel_path or config.LOCAL_EXCEL_FILE
            )
            
            # Read comments from Excel
            logger.info("Reading comments from Excel...")
            excel_comments = self.sharepoint_client.read_excel_comments(local_excel)
            excel_dict = {c['comment_id']: c for c in excel_comments}
            
            # Get comments from Smartsheets
            logger.info("Fetching comments from Smartsheets...")
            smartsheet_comments = self.smartsheets_client.get_all_comments()
            logger.info(f"Found {len(smartsheet_comments)} comments in Smartsheets")
            
            # Sync each Smartsheet comment to Excel
            synced_comments = []
            for smartsheet_comment in smartsheet_comments:
                comment_id = smartsheet_comment.get('comment_id')
                
                if not comment_id:
                    stats['skipped'] += 1
                    continue
                
                # Remove row_id before storing in Excel
                excel_comment = {k: v for k, v in smartsheet_comment.items() if k != 'row_id'}
                
                synced_comments.append(excel_comment)
                
                if comment_id in excel_dict:
                    stats['updated'] += 1
                    logger.info(f"Updated comment: {comment_id}")
                else:
                    stats['added'] += 1
                    logger.info(f"Added comment: {comment_id}")
            
            # Handle deletions (comments in Excel but not in Smartsheets)
            excel_ids = set(c.get('comment_id') for c in excel_comments)
            smartsheet_ids = set(c.get('comment_id') for c in smartsheet_comments)
            deleted_ids = excel_ids - smartsheet_ids
            
            for deleted_id in deleted_ids:
                stats['deleted'] += 1
                logger.info(f"Deleted comment: {deleted_id}")
            
            # Write synced comments to Excel
            logger.info("Writing comments to Excel...")
            self.sharepoint_client.write_excel_comments(synced_comments, local_excel)
            
            # Upload updated Excel to SharePoint
            logger.info("Uploading Excel file to SharePoint...")
            self.sharepoint_client.upload_excel_file(local_path=local_excel)
            
            logger.info(f"Smartsheets to Excel sync complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Failed to sync Smartsheets to Excel: {e}")
            raise
    
    def bidirectional_sync(self, excel_path: str = None) -> Dict[str, Dict[str, int]]:
        """
        Perform bidirectional sync between Excel and Smartsheets
        
        Args:
            excel_path: Local Excel file path (uses config if not provided)
            
        Returns:
            Dictionary with sync statistics for both directions
        """
        logger.info("Starting bidirectional sync...")
        
        results = {}
        
        # Excel to Smartsheets
        try:
            results['excel_to_smartsheet'] = self.sync_excel_to_smartsheet(excel_path)
        except Exception as e:
            logger.error(f"Excel to Smartsheets sync failed: {e}")
            results['excel_to_smartsheet'] = {'error': str(e)}
        
        # Smartsheets to Excel
        try:
            results['smartsheet_to_excel'] = self.sync_smartsheet_to_excel(excel_path)
        except Exception as e:
            logger.error(f"Smartsheets to Excel sync failed: {e}")
            results['smartsheet_to_excel'] = {'error': str(e)}
        
        logger.info("Bidirectional sync complete")
        return results


def format_sync_results(results: Dict) -> str:
    """
    Format sync results for display
    
    Args:
        results: Dictionary with sync statistics
        
    Returns:
        Formatted string
    """
    output = []
    
    for direction, stats in results.items():
        if 'error' in stats:
            output.append(f"{direction}: ERROR - {stats['error']}")
        else:
            output.append(f"{direction}:")
            output.append(f"  Added: {stats.get('added', 0)}")
            output.append(f"  Updated: {stats.get('updated', 0)}")
            output.append(f"  Deleted: {stats.get('deleted', 0)}")
            output.append(f"  Skipped: {stats.get('skipped', 0)}")
    
    return '\n'.join(output)


if __name__ == "__main__":
    # Test the sync script
    try:
        sync = CommentSync()
        
        # Test with local Excel file
        local_excel = os.path.join(config.PROJECT_ROOT, "sample_data", "comments_sample.xlsx")
        
        print("Testing Excel to Smartsheets sync...")
        results = sync.sync_excel_to_smartsheet(local_excel)
        print(format_sync_results({'excel_to_smartsheet': results}))
        
    except Exception as e:
        print(f"Error: {e}")
        logger.error(f"Sync test failed: {e}")