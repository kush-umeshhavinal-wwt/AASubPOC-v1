import os
import tempfile
import unittest

from comment_sync.clients.sharepoint import SharePointClient


class FakeQuery:
    def __init__(self, result=None):
        self.result = result
        self.executed = False

    def execute_query(self):
        self.executed = True
        return self.result or self


class FakeRemoteFile:
    def __init__(self, content):
        self.content = content
        self.requested_download = None

    def download(self, file_object):
        file_object.write(self.content)
        self.requested_download = FakeQuery(self)
        return self.requested_download


class FakeFolder:
    def __init__(self):
        self.uploads = []
        self.requested_upload = None

    def upload_file(self, file_name, content):
        self.uploads.append((file_name, content))
        self.requested_upload = FakeQuery(self)
        return self.requested_upload


class FakeWeb:
    def __init__(self, content=b"remote workbook"):
        self.remote_file = FakeRemoteFile(content)
        self.folder = FakeFolder()
        self.connection = None
        self.file_path = None
        self.folder_path = None

    def get(self):
        self.connection = FakeQuery(self)
        return self.connection

    def get_file_by_server_relative_path(self, file_path):
        self.file_path = file_path
        return self.remote_file

    def get_folder_by_server_relative_path(self, folder_path):
        self.folder_path = folder_path
        return self.folder


class FakeContext:
    def __init__(self, content=b"remote workbook"):
        self.web = FakeWeb(content)


class SharePointClientTests(unittest.TestCase):
    site_url = "https://example.sharepoint.com/sites/test"
    file_path = "/sites/test/Shared Documents/comments.xlsx"

    def create_remote_client(self, context):
        return SharePointClient(
            site_url=self.site_url,
            auth_mode="interactive",
            tenant="example.onmicrosoft.com",
            client_id="client-id",
            file_path=self.file_path,
            context=context
        )

    def test_local_mode_uses_requested_local_file(self):
        client = SharePointClient(auth_mode="local")
        path = os.path.join(tempfile.gettempdir(), "comments.xlsx")

        self.assertEqual(client.download_excel_file(local_path=path), path)
        self.assertFalse(client.upload_excel_file(local_path=path))

    def test_interactive_mode_requires_complete_configuration(self):
        with self.assertRaisesRegex(ValueError, "requires site URL, tenant, client ID, and file path"):
            SharePointClient(auth_mode="interactive")

    def test_connect_executes_authenticated_site_query(self):
        context = FakeContext()
        client = self.create_remote_client(context)

        self.assertTrue(client.connect_to_sharepoint())
        self.assertTrue(context.web.connection.executed)

    def test_download_replaces_local_working_copy(self):
        context = FakeContext(b"new workbook")
        client = self.create_remote_client(context)

        with tempfile.TemporaryDirectory() as directory:
            local_path = os.path.join(directory, "comments.xlsx")
            with open(local_path, "wb") as local_file:
                local_file.write(b"old workbook")

            result = client.download_excel_file(local_path=local_path)

            with open(local_path, "rb") as local_file:
                self.assertEqual(local_file.read(), b"new workbook")
            self.assertEqual(result, local_path)
            self.assertEqual(context.web.file_path, self.file_path)
            self.assertTrue(context.web.remote_file.requested_download.executed)
            self.assertFalse(os.path.exists(f"{local_path}.download"))

    def test_excel_round_trip_preserves_expanded_comment_schema(self):
        client = SharePointClient(auth_mode="local")
        comments = [{
            "comment_id": "account-1",
            "comment_name": "Northwind Renewal",
            "comment_text": "Waiting for payment confirmation",
            "age": "61",
            "aging_bucket": "61-90",
            "start_date": "2025-08-01",
            "account": "ACCT-100",
            "pl_name": "Revenue",
            "sub_program": "SP-7",
            "created_date": "2026-09-01T10:00:00",
            "modified_date": "2026-09-02T10:00:00",
            "paired_comment_id": "account-2",
            "flag_reason": "Credit offsets invoice",
            "flagged_date": "2026-10-02"
        }]

        with tempfile.TemporaryDirectory() as directory:
            local_path = os.path.join(directory, "comments.xlsx")
            client.write_excel_comments(comments, local_path)

            self.assertEqual(client.read_excel_comments(local_path), comments)

    def test_upload_targets_parent_folder_and_filename(self):
        context = FakeContext()
        client = self.create_remote_client(context)

        with tempfile.TemporaryDirectory() as directory:
            local_path = os.path.join(directory, "comments.xlsx")
            with open(local_path, "wb") as local_file:
                local_file.write(b"updated workbook")

            self.assertTrue(client.upload_excel_file(local_path=local_path))

        self.assertEqual(context.web.folder_path, "/sites/test/Shared Documents")
        self.assertEqual(context.web.folder.uploads, [("comments.xlsx", b"updated workbook")])
        self.assertTrue(context.web.folder.requested_upload.executed)


if __name__ == "__main__":
    unittest.main()
