import unittest
from unittest.mock import Mock

from smartsheets_client import SmartsheetsClient


class SmartsheetsClientTests(unittest.TestCase):
    def test_delete_comment_uses_bulk_delete_sdk_method(self):
        client = SmartsheetsClient.__new__(SmartsheetsClient)
        client.client = Mock()

        self.assertTrue(client.delete_comment(123, "sheet-id"))

        client.client.Sheets.delete_rows.assert_called_once_with("sheet-id", [123])


if __name__ == "__main__":
    unittest.main()
