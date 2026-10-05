import unittest

from comment_sync.sync import CommentSync


class FakeSharePoint:
    def __init__(self, events, comments):
        self.events = events
        self.comments = comments
        self.written = None

    def download_excel_file(self, local_path):
        self.events.append("download")
        return local_path

    def read_excel_comments(self, local_path):
        self.events.append("read")
        return self.comments

    def write_excel_comments(self, comments, local_path):
        self.events.append("write")
        self.written = comments
        return local_path

    def upload_excel_file(self, local_path):
        self.events.append("upload")
        return True


class FakeSmartsheet:
    def __init__(self, events, comments):
        self.events = events
        self.comments = comments
        self.created = []
        self.updated = []
        self.deleted = []

    def get_all_comments(self):
        self.events.append("fetch_smartsheet")
        return self.comments

    def create_comment(self, comment):
        self.events.append("create_smartsheet")
        self.created.append(comment)

    def update_comment(self, row_id, comment):
        self.events.append("update_smartsheet")
        self.updated.append((row_id, comment))

    def delete_comment(self, row_id):
        self.events.append("delete_smartsheet")
        self.deleted.append(row_id)


class SharePointSyncIntegrationTests(unittest.TestCase):
    def create_sync(self, excel_comments, smartsheet_comments):
        events = []
        sync = CommentSync.__new__(CommentSync)
        sync.sharepoint_client = FakeSharePoint(events, excel_comments)
        sync.smartsheets_client = FakeSmartsheet(events, smartsheet_comments)
        return sync, events

    def test_excel_push_downloads_sharepoint_file_before_reading(self):
        excel_comments = [{
            "comment_id": "excel-new",
            "comment_name": "SharePoint Account",
            "comment_text": "From SharePoint",
            "age": "61",
            "aging_bucket": "61-90",
            "created_date": "2026-09-14T10:00:00",
            "modified_date": "2026-09-14T10:00:00",
            "paired_comment_id": "excel-pair",
            "flag_reason": "Offsets another comment",
            "flagged_date": "2026-10-02"
        }]
        sync, events = self.create_sync(excel_comments, [])

        stats = sync.sync_excel_to_smartsheet("working.xlsx")

        self.assertEqual(stats["added"], 1)
        self.assertEqual(events, ["download", "read", "fetch_smartsheet", "create_smartsheet"])
        self.assertEqual(sync.smartsheets_client.created[0]["comment_id"], "excel-new")
        self.assertEqual(sync.smartsheets_client.created[0]["comment_name"], "SharePoint Account")
        self.assertEqual(sync.smartsheets_client.created[0]["age"], "61")
        self.assertEqual(sync.smartsheets_client.created[0]["aging_bucket"], "61-90")

    def test_smartsheet_pull_downloads_then_writes_and_uploads(self):
        smartsheet_comments = [{
            "row_id": 123,
            "comment_id": "dashboard-new",
            "comment_name": "Dashboard Account",
            "comment_text": "From dashboard",
            "age": "501",
            "aging_bucket": "481-510",
            "created_date": "2026-09-14T11:00:00",
            "modified_date": "2026-09-14T11:00:00",
            "paired_comment_id": "dashboard-pair",
            "flag_reason": "Offsets another comment",
            "flagged_date": "2026-10-02"
        }]
        sync, events = self.create_sync([], smartsheet_comments)

        stats = sync.sync_smartsheet_to_excel("working.xlsx")

        self.assertEqual(stats["added"], 1)
        self.assertEqual(events, ["download", "read", "fetch_smartsheet", "write", "upload"])
        self.assertEqual(sync.sharepoint_client.written, [{
            "comment_id": "dashboard-new",
            "comment_name": "Dashboard Account",
            "comment_text": "From dashboard",
            "age": "501",
            "aging_bucket": "481-510",
            "created_date": "2026-09-14T11:00:00",
            "modified_date": "2026-09-14T11:00:00",
            "paired_comment_id": "dashboard-pair",
            "flag_reason": "Offsets another comment",
            "flagged_date": "2026-10-02"
        }])


if __name__ == "__main__":
    unittest.main()
