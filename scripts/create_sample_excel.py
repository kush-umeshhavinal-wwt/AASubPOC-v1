"""
Script to create sample Excel file with comment data for testing
"""

import openpyxl
from datetime import datetime, timedelta
import uuid
import os


def get_aging_bucket(age):
    if age <= 30:
        return "0-30"
    if age <= 60:
        return "31-60"
    if age <= 90:
        return "61-90"
    if age <= 180:
        return "91-180"
    return "180+"


def create_sample_excel():
    # Create a new workbook
    wb = openpyxl.Workbook()
    
    # Get the active sheet and rename it
    ws = wb.active
    ws.title = "Comments"
    
    # Add headers
    headers = [
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
    ws.append(headers)
    
    # Generate sample data
    sample_comments = [
        ("Northwind Renewal", "This is a great feature request for the dashboard.", 0),
        ("Contoso Invoice", "We need to improve the sync performance for large datasets.", 15),
        ("Fabrikam Follow-up", "The user interface is intuitive and easy to use.", 30),
        ("Adventure Works", "Please add more filtering options for the comments.", 31),
        ("Tailspin Payment", "Consider adding export functionality to Excel.", 60),
        ("Woodgrove Account", "The two-way sync is working perfectly.", 61),
        ("Litware Review", "We should implement conflict resolution in future versions.", 90),
        ("Proseware Balance", "The API integration with Smartsheets is seamless.", 120),
        ("Alpine Ski House", "Add support for bulk operations in the next release.", 180),
        ("Blue Yonder", "Documentation is clear and helpful for setup.", 240),
        ("Wide World Importers", "Payment details need leadership review.", 365),
        ("Consolidated Messenger", "Account has reached the escalation threshold.", 500),
        ("Humongous Insurance", "Account is beyond the escalation threshold.", 501),
        ("Lucerne Publishing", "Long-running balance requires immediate action.", 540)
    ]
    
    # Add sample comments
    base_date = datetime.now() - timedelta(days=30)
    for i, (comment_name, comment_text, age) in enumerate(sample_comments):
        comment_id = str(uuid.uuid4())
        created_date = base_date + timedelta(days=i)
        modified_date = created_date + timedelta(hours=2)
        start_date = datetime.now() - timedelta(days=age)

        ws.append([
            comment_id,
            comment_name,
            comment_text,
            age,
            get_aging_bucket(age),
            start_date.date().isoformat(),
            f"ACCT-{1000 + i}",
            f"P&L {chr(65 + (i % 4))}",
            f"SP-{i % 5}",
            created_date.date().isoformat(),
            modified_date.date().isoformat(),
            "",
            "",
            ""
        ])
    
    # Save the file
    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_data", "comments_sample.xlsx")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    wb.save(output_path)
    
    print(f"Sample Excel file created at: {output_path}")
    print(f"Created {len(sample_comments)} sample comments")
    return output_path

if __name__ == "__main__":
    create_sample_excel()