"""
Manual Sync Trigger Script
Provides interactive command-line interface for triggering sync operations
"""

import sys
import logging
from sync_script import CommentSync, format_sync_results

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def print_menu():
    """Display the sync menu options"""
    print("\n" + "="*50)
    print("Two-Way Comment Sync - Manual Sync Trigger")
    print("="*50)
    print("1. Sync Excel to Smartsheets")
    print("2. Sync Smartsheets to Excel")
    print("3. Bidirectional Sync (Both)")
    print("4. Exit")
    print("="*50)


def get_user_choice():
    """
    Get user menu choice
    
    Returns:
        int: User's menu selection
    """
    try:
        choice = input("\nEnter your choice (1-4): ").strip()
        return int(choice)
    except ValueError:
        print("Invalid input. Please enter a number between 1 and 4.")
        return None


def run_sync_choice(choice: int):
    """
    Execute the selected sync operation
    
    Args:
        choice: Menu selection (1-4)
    """
    if choice == 4:
        print("Exiting...")
        return False
    
    try:
        sync = CommentSync()
        
        if choice == 1:
            print("\nSyncing Excel to Smartsheets...")
            results = sync.sync_excel_to_smartsheet()
            print("\nSync Results:")
            print(format_sync_results({'excel_to_smartsheet': results}))
            
        elif choice == 2:
            print("\nSyncing Smartsheets to Excel...")
            results = sync.sync_smartsheet_to_excel()
            print("\nSync Results:")
            print(format_sync_results({'smartsheet_to_excel': results}))
            
        elif choice == 3:
            print("\nRunning bidirectional sync...")
            results = sync.bidirectional_sync()
            print("\nSync Results:")
            print(format_sync_results(results))
            
        else:
            print("Invalid choice. Please try again.")
            return True
        
        print("\nSync operation completed successfully!")
        return True
        
    except Exception as e:
        print(f"\nError during sync operation: {e}")
        logger.error(f"Sync failed: {e}")
        return True


def main():
    """Main function to run the interactive sync menu"""
    print("Two-Way Comment Sync POC")
    print("This tool allows you to manually trigger sync operations between Excel and Smartsheets")
    
    running = True
    while running:
        print_menu()
        choice = get_user_choice()
        
        if choice is None:
            continue
        
        if choice == 4:
            running = False
        else:
            running = run_sync_choice(choice)
    
    print("\nThank you for using the Two-Way Comment Sync tool!")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)