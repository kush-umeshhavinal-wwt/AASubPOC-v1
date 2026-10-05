import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from comment_sync import config
from comment_sync.clients.smartsheet import SmartsheetsClient


class SmartsheetsClientTests(unittest.TestCase):
    fields = config.EXCEL_HEADERS

    def create_sheet(self, values=None):
        columns = [SimpleNamespace(title=field, id=index + 1) for index, field in enumerate(self.fields)]
        cells = [SimpleNamespace(column_id=index + 1, value=value) for index, value in enumerate(values or [])]
        rows = [SimpleNamespace(id=99, cells=cells)] if values else []
        return SimpleNamespace(columns=columns, rows=rows)

    def test_get_all_comments_maps_columns_by_title(self):
        client = SmartsheetsClient.__new__(SmartsheetsClient)
        client.client = Mock()
        client.client.Sheets.get_sheet.return_value = self.create_sheet([
            "comment-1",
            "Northwind Renewal",
            "Waiting for payment",
            61,
            "61-90",
            "2025-08-01",
            "ACCT-100",
            "Revenue",
            "SP-7",
            "2026-09-01",
            "2026-09-02",
            "comment-2",
            "Credit offsets invoice",
            "2026-10-02"
        ])

        self.assertEqual(client.get_all_comments("sheet-id"), [{
            "row_id": 99,
            "comment_id": "comment-1",
            "comment_name": "Northwind Renewal",
            "comment_text": "Waiting for payment",
            "age": "61",
            "aging_bucket": "61-90",
            "start_date": "2025-08-01",
            "account": "ACCT-100",
            "pl_name": "Revenue",
            "sub_program": "SP-7",
            "created_date": "2026-09-01",
            "modified_date": "2026-09-02",
            "paired_comment_id": "comment-2",
            "flag_reason": "Credit offsets invoice",
            "flagged_date": "2026-10-02"
        }])

    def test_create_comment_writes_all_fields_by_column_title(self):
        client = SmartsheetsClient.__new__(SmartsheetsClient)
        client.client = Mock()
        client.client.Sheets.get_sheet.return_value = self.create_sheet()
        client.client.Sheets.add_rows.return_value = SimpleNamespace(data=[SimpleNamespace(id=101)])
        comment = {
            "comment_id": "comment-1",
            "comment_name": "Northwind Renewal",
            "comment_text": "Waiting for payment",
            "age": 61,
            "aging_bucket": "61-90",
            "start_date": "2025-08-01",
            "account": "ACCT-100",
            "pl_name": "Revenue",
            "sub_program": "SP-7",
            "created_date": "2026-09-01",
            "modified_date": "2026-09-02",
            "paired_comment_id": "",
            "flag_reason": "",
            "flagged_date": ""
        }

        result = client.create_comment(comment, "sheet-id")

        row = client.client.Sheets.add_rows.call_args.args[1][0]
        values = {cell.column_id: cell.value for cell in row.cells}
        expected_values = {index + 1: comment[field] for index, field in enumerate(self.fields)}
        expected_values[self.fields.index("flagged_date") + 1] = None
        self.assertEqual(values, expected_values)
        self.assertEqual(result, {**comment, "row_id": 101})

    def test_missing_required_column_is_rejected(self):
        client = SmartsheetsClient.__new__(SmartsheetsClient)
        sheet = self.create_sheet()
        sheet.columns = sheet.columns[:-1]

        with self.assertRaisesRegex(ValueError, "flagged_date"):
            client._get_column_map(sheet)

    def test_delete_comment_uses_bulk_delete_sdk_method(self):
        client = SmartsheetsClient.__new__(SmartsheetsClient)
        client.client = Mock()

        self.assertTrue(client.delete_comment(123, "sheet-id"))

        client.client.Sheets.delete_rows.assert_called_once_with("sheet-id", [123])


if __name__ == "__main__":
    unittest.main()
