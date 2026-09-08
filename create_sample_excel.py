"""
Script to create sample Excel file with comment data for testing
"""

import openpyxl
from datetime import datetime, timedelta
import uuid
import os

def create_sample_excel():
    # Create a new workbook
    wb = openpyxl.Workbook()
    
    # Get the active sheet and rename it
    ws = wb.active
    ws.title = "Comments"
    
    # Add headers
    headers = ["comment_id", "comment_text", "created_date", "modified_date", "status"]
    ws.append(headers)
    
    # Generate sample data
    sample_comments = [
        "This is a great feature request for the dashboard.",
        "We need to improve the sync performance for large datasets.",
        "The user interface is intuitive and easy to use.",
        "Please add more filtering options for the comments.",
        "Consider adding export functionality to Excel.",
        "The two-way sync is working perfectly.",
        "We should implement conflict resolution in future versions.",
        "The API integration with Smartsheets is seamless.",
        "Add support for bulk operations in the next release.",
        "Documentation is clear and helpful for setup."
    ]
    
    # Add sample comments
    base_date = datetime.now() - timedelta(days=30)
    for i, comment_text in enumerate(sample_comments):
        comment_id = str(uuid.uuid4())
        created_date = base_date + timedelta(days=i)
        modified_date = created_date + timedelta(hours=2)
        status = "active" if i % 3 != 0 else "archived"
        
        ws.append([
            comment_id,
            comment_text,
            created_date.isoformat(),
            modified_date.isoformat(),
            status
        ])
    
    # Save the file
    output_path = os.path.join(os.path.dirname(__file__), "sample_data", "comments_sample.xlsx")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    wb.save(output_path)
    
    print(f"Sample Excel file created at: {output_path}")
    print(f"Created {len(sample_comments)} sample comments")
    return output_path

if __name__ == "__main__":
    create_sample_excel()