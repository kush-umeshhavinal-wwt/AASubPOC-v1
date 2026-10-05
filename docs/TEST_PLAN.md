# Test Plan - Two-Way Comment Sync POC

Comprehensive manual testing procedures for validating the two-way comment sync system.

## Test Environment Setup

### Prerequisites
- Python 3.7+ installed
- Smartsheets account with API access
- Sample Excel file generated
- All dependencies installed

### Setup Steps
1. Install dependencies: `pip install -r requirements.txt`
2. Dry-run the real workbook: `python -m scripts.import_real_excel --file "C:\\path\\to\\workbook.xlsx"`
3. Configure API credentials in `.env` or `comment_sync/config.py`
4. Set up Smartsheets sheet with correct structure
5. (Optional) Configure SharePoint integration

### Test Data
- Use the supplied workbook and exact `Details AUG-26` worksheet
- Expect 56 imported rows, 42 base IDs, and 14 deterministic suffixes
- Retain the timestamped pre-migration backup and state file for rollback

## Test Scenarios

### Test 1: Excel to Smartsheets Sync

**Objective:** Verify comments can be synced from Excel to Smartsheets

**Preconditions:**
- Sample Excel file exists with comments
- Smartsheets sheet is empty or has different data
- API credentials configured

**Steps:**
1. Open terminal/command prompt
2. Run: `python -m scripts.run_sync`
3. Select option 1 (Excel → Smartsheets)
4. Wait for sync to complete
5. Check Smartsheets sheet in browser

**Expected Results:**
- Sync completes without errors
- All 56 transformed records appear in Smartsheet
- A/B/D/G/H mappings, suffixed IDs, and audit dates match the dry-run report
- Success message displays statistics

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 2: Smartsheets → Excel Sync

**Objective:** Verify comments can be synced from Smartsheets to Excel

**Preconditions:**
- Smartsheets sheet contains comments
- Local Excel file may have different data
- API credentials configured

**Steps:**
1. Add a new comment directly in Smartsheets
2. Modify an existing comment in Smartsheets
3. Open terminal/command prompt
4. Run: `python -m scripts.run_sync`
5. Select option 2 (Smartsheets → Excel)
6. Wait for sync to complete
7. Open local Excel file

**Expected Results:**
- Sync completes without errors
- New comment appears in Excel
- Modified comment reflects changes in Excel
- Excel file is updated with latest data

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 3: Dashboard Create Comment

**Objective:** Verify dashboard can create new comments in Smartsheets

**Preconditions:**
- Dashboard accessible in browser
- API credentials configured in dashboard
- Smartsheets sheet exists

**Steps:**
1. Open `dashboard/index.html` in browser
2. Enter API credentials if prompted
3. Confirm **User view** is selected and click "Add Comment"
4. Fill in comment form:
   - Comment name: "Test account"
   - Comment text: "Test comment from dashboard"
   - Age: 75
5. Click "Save comment"
6. Check Smartsheets sheet in browser

**Expected Results:**
- Modal closes successfully
- Success toast notification appears
- New comment appears in dashboard list
- Comment appears in Smartsheets with correct data
- comment_id is generated and valid
- Age is saved as 75 and aging_bucket is automatically calculated as 61-90

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 4: Dashboard Update Comment

**Objective:** Verify dashboard can update existing comments

**Preconditions:**
- Dashboard has existing comments loaded
- Smartsheets sheet has matching comments

**Steps:**
1. Open dashboard with comments loaded
2. Click "Edit" on a comment in User view
3. Modify the comment name, comment text, and age
4. Set age to 120
5. Click "Save comment"
6. Check Smartsheets sheet in browser

**Expected Results:**
- Modal closes successfully
- Success toast notification appears
- Comment updates in dashboard list
- Changes reflect in Smartsheets
- Modified date updates
- Age updates to 120 and aging bucket recalculates to 91-120
- Existing comment ID and created date remain unchanged

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 5: Dashboard Delete Comment

**Objective:** Verify dashboard can delete comments

**Preconditions:**
- Dashboard has existing comments loaded
- Smartsheets sheet has matching comments

**Steps:**
1. Open dashboard with comments loaded
2. Click "Delete" button on a comment
3. Confirm deletion in modal
4. Check Smartsheets sheet in browser

**Expected Results:**
- Delete modal closes
- Success toast notification appears
- Comment removed from dashboard list
- Comment removed from Smartsheets
- No other comments affected

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 6: Full Round-Trip Sync

**Objective:** Verify complete data flow: Dashboard → Smartsheets → Excel → Smartsheets → Dashboard

**Preconditions:**
- All systems configured and accessible
- Sample data in place

**Steps:**
1. **Dashboard → Smartsheets:**
   - Create comment in dashboard
   - Verify in Smartsheets

2. **Smartsheets → Excel:**
   - Run sync: Smartsheets → Excel
   - Verify in Excel file

3. **Excel → Smartsheets:**
   - Modify comment in Excel
   - Run sync: Excel → Smartsheets
   - Verify in Smartsheets

4. **Smartsheets → Dashboard:**
   - Refresh dashboard
   - Verify changes appear

**Expected Results:**
- All sync operations complete successfully
- Data integrity maintained throughout
- No data loss or corruption
- comment_id remains consistent
- Dates update appropriately

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 7: Search Functionality

**Objective:** Verify shared search works in both dashboard views

**Preconditions:**
- Dashboard loaded with multiple comments

**Steps:**
1. Search for part of a comment name
2. Verify only matching comments display
3. Search for text contained in a comment body
4. Switch to Leadership view and verify the filtered result remains
5. Enter a nonexistent term and verify the empty state
6. Clear search and verify all comments return

**Expected Results:**
- Filtering occurs in real time and is case-insensitive
- Comment names, text, and IDs are searchable
- Result count and leadership KPIs reflect the filtered records
- Filter state is preserved when switching views
- Clearing search restores all comments

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 8: Age and Aging Bucket Filters

**Objective:** Verify age range and aging bucket filters work together

**Preconditions:**
- Dashboard loaded with comments across multiple aging buckets

**Steps:**
1. Enter minimum age 61 and maximum age 90
2. Verify only comments between 61 and 90 days display
3. Select the 61-90 aging bucket
4. Verify results remain in that bucket
5. Switch to Leadership view
6. Verify KPI totals and bucket counts match the filtered records
7. Click "Clear filters"

**Expected Results:**
- Age bounds are inclusive and apply immediately
- Bucket options are sorted by numeric range
- Combined filters update both views and the result count
- Clearing filters restores the full dataset

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 9: Leadership View Permissions and KPIs

**Objective:** Verify the leadership view is read-only and reports aging metrics

**Preconditions:**
- Dashboard loaded with real records across multiple aging buckets, including an age above 500

**Steps:**
1. Select Leadership view
2. Review total, 365+, average-age, over-500, and flagged-pairs KPI cards
3. Compare the aging distribution and unique pair count to the visible records
4. Confirm the account comments are ordered oldest first
5. Inspect the page for Add, Edit, or Delete controls

**Expected Results:**
- KPI values match the loaded or filtered comments
- Every populated aging bucket appears in numeric order
- Accounts older than 500 days are called out
- Each valid reciprocal pair is counted once without changing existing KPI totals
- No CRUD or pair-management controls are available in Leadership view

---

### Flagged Comment Pair Workflow

**Objective:** Verify two comments can be paired, reviewed, filtered, and unpaired safely

**Steps:**
1. In User view, select **Flag pair** on an unpaired comment
2. Search for and select another unpaired comment
3. Enter an optional reason and save
4. Verify both cards show reciprocal pair details
5. Verify both Smartsheet rows contain reciprocal `paired_comment_id` values and matching reason/date
6. Select Leadership view and verify **Flagged pairs** increases by one while existing KPIs remain unchanged
7. Filter to Paired comments
8. Return to User view, select **Manage flag**, and remove the pair

**Expected Results:**
- A comment cannot pair with itself or an already paired comment
- Both rows update together and the pair is counted once
- Leadership can view but not manage the relationship
- Unflagging clears all three pair fields on both rows
- Duplicate comment IDs disable new pair creation with a clear warning

---

### Test 10: Error Handling - Invalid API Credentials

**Objective:** Verify proper error handling for invalid credentials

**Preconditions:**
- Dashboard open

**Steps:**
1. Open dashboard
2. Enter invalid API token
3. Enter invalid sheet ID
4. Save configuration
5. Observe behavior

**Expected Results:**
- Error message displays
- Clear indication of authentication failure
- System doesn't crash
- User can re-enter credentials
- Appropriate error toast notification

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 11: Error Handling - Network Issues

**Objective:** Verify behavior when network is unavailable

**Preconditions:**
- Dashboard configured and working

**Steps:**
1. Disconnect network (or block API requests)
2. Try to load comments
3. Try to create comment
4. Reconnect network
5. Retry operations

**Expected Results:**
- Appropriate error messages
- Loading states handle gracefully
- No application crashes
- Recovery after network restoration
- Clear error toast notifications

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 12: Excel File Structure Validation

**Objective:** Verify Excel file structure handling

**Preconditions:**
- Sample Excel file available

**Steps:**
1. Test with correct structure
2. Test with missing sheet
3. Test with wrong headers
4. Test with missing columns
5. Test with empty file

**Expected Results:**
- Correct structure: Works normally
- Missing sheet: Uses first sheet with warning
- Wrong headers: Unknown fields are ignored
- Missing columns: Missing values remain empty without shifting other fields
- Empty file: Returns empty list

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 13: Smartsheets Column Mapping

**Objective:** Verify Smartsheets column mapping works correctly

**Preconditions:**
- Smartsheets sheet configured

**Steps:**
1. Create sheet with exact column names
2. Test data retrieval
3. Test data creation
4. Test data update
5. Try with renamed columns

**Expected Results:**
- Exact names: Works perfectly
- Renamed columns: Error or graceful handling
- Column order: Does not affect title-based mapping
- Data types: Handled correctly

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 14: Concurrent Operations

**Objective:** Verify system handles rapid successive operations

**Preconditions:**
- All systems configured

**Steps:**
1. Create multiple comments rapidly
2. Perform immediate edits
3. Run sync in quick succession
4. Refresh dashboard repeatedly

**Expected Results:**
- All operations complete successfully
- No data corruption
- No race conditions
- Consistent final state

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 15: Data Validation

**Objective:** Verify data validation and sanitization

**Preconditions:**
- Dashboard configured

**Steps:**
1. Try empty comment text
2. Try very long comment text
3. Try special characters
4. Try HTML in comments
5. Try SQL injection patterns

**Expected Results:**
- Empty text: Form validation prevents
- Long text: Handled appropriately
- Special characters: Stored correctly
- HTML: Escaped or sanitized
- SQL patterns: Stored as text (no injection)

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

### Test 16: SharePoint Integration (If Configured)

**Objective:** Verify SharePoint file operations

**Preconditions:**
- SharePoint configured with credentials

**Steps:**
1. Test file download from SharePoint
2. Test file upload to SharePoint
3. Test with local file only (SharePoint unavailable)
4. Verify graceful fallback

**Expected Results:**
- Download: File retrieved successfully
- Upload: File uploaded successfully
- Fallback: Uses local file operations
- Error handling: Clear error messages

**Actual Results:**
- [ ] Pass / [ ] Fail / [ ] N/A

**Notes:**
- _______________________________________________________

---

## Performance Testing

### Test 17: Large Dataset Performance

**Objective:** Verify performance with larger datasets

**Preconditions:**
- System configured

**Steps:**
1. Create 100+ comments in Smartsheets
2. Load in dashboard
3. Test search performance
4. Test filter performance
5. Measure sync times

**Expected Results:**
- Dashboard loads within 5 seconds
- Search responds within 1 second
- Filter responds within 1 second
- Sync completes within reasonable time
- No memory issues

**Actual Results:**
- [ ] Pass / [ ] Fail

**Notes:**
- _______________________________________________________

---

## Browser Compatibility Testing

### Test 18: Cross-Browser Testing

**Objective:** Verify dashboard works across browsers

**Preconditions:**
- Dashboard files available

**Steps:**
1. Test in Chrome
2. Test in Firefox
3. Test in Edge
4. Test in Safari (if available)
5. Test basic functionality in each

**Expected Results:**
- All core features work
- Consistent UI appearance
- No console errors
- Responsive design works

**Actual Results:**
- Chrome: [ ] Pass / [ ] Fail
- Firefox: [ ] Pass / [ ] Fail
- Edge: [ ] Pass / [ ] Fail
- Safari: [ ] Pass / [ ] Fail / [ ] N/A

**Notes:**
- _______________________________________________________

---

## Test Summary

### Pass/Fail Results

| Test | Result | Notes |
|------|--------|-------|
| Test 1: Excel → Smartsheets Sync | | |
| Test 2: Smartsheets → Excel Sync | | |
| Test 3: Dashboard Create Comment | | |
| Test 4: Dashboard Update Comment | | |
| Test 5: Dashboard Delete Comment | | |
| Test 6: Full Round-Trip Sync | | |
| Test 7: Search Functionality | | |
| Test 8: Filter Functionality | | |
| Test 9: Error Handling - Invalid Credentials | | |
| Test 10: Error Handling - Network Issues | | |
| Test 11: Excel File Structure Validation | | |
| Test 12: Smartsheets Column Mapping | | |
| Test 13: Concurrent Operations | | |
| Test 14: Data Validation | | |
| Test 15: SharePoint Integration | | |
| Test 16: Large Dataset Performance | | |
| Test 17: Cross-Browser Testing | | |

### Overall Assessment

**Total Tests:** 17
**Passed:** ____
**Failed:** ____
**Skipped:** ____

**Ready for Production:** [ ] Yes / [ ] No

**Critical Issues:**
- _______________________________________________________

**Recommendations:**
- _______________________________________________________

## Test Execution Log

**Date:** _______________
**Tester:** _______________
**Environment:** _______________

**Configuration:**
- Python Version: _______________
- Smartsheets Sheet ID: _______________
- SharePoint Configured: [ ] Yes / [ ] No

**Notes:**
- _______________________________________________________