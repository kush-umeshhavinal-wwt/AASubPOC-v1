import hashlib
import os
import tempfile
import unittest
from datetime import date

import openpyxl

from scripts.import_real_excel import load_real_records


class RealDataImportTests(unittest.TestCase):
    def create_workbook(self, path, rows):
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.title = "Details AUG-26"
        for _ in range(5):
            sheet.append([])
        headers = [None] * 37
        headers[0] = "Age"
        headers[1] = "Aging Bucket"
        headers[2] = "CA Manager Comments"
        headers[3] = "Cost Accountant Comments"
        headers[4] = "Analyst"
        headers[5] = "P And L Name Curr"
        headers[6] = "Je Batch Name"
        headers[7] = "Je Name"
        headers[19] = "Sub Program"
        headers[24] = "Account Code"
        headers[36] = "Je Effective Date"
        sheet.append(headers)
        for row in rows:
            sheet.append(row)
        workbook.save(path)
        workbook.close()

    def make_row(self, age=45, bucket="31-60", comment_text="First comment",
                 comment_name="TJM-1 Full technical name Spreadsheet A 123",
                 comment_id="JE Adjustment", pl_name="Revenue",
                 sub_program="SP-7", account="ACCT-100", start_serial=46177):
        row = [None] * 37
        row[0] = age
        row[1] = bucket
        row[3] = comment_text
        row[5] = pl_name
        row[6] = comment_name
        row[7] = comment_id
        row[19] = sub_program
        row[24] = account
        row[36] = start_serial
        return row

    def file_hash(self, path):
        with open(path, "rb") as source:
            return hashlib.sha256(source.read()).hexdigest()

    def test_maps_real_columns_and_suffixes_duplicate_ids_without_mutating_source(self):
        rows = [
            self.make_row(),
            self.make_row(),
            self.make_row(age=100, bucket="91-180", comment_text="Anomalous comment",
                          comment_name="TJM-2 Another name", comment_id="Another Adjustment",
                          start_serial=45000)
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "real.xlsx")
            self.create_workbook(path, rows)
            before = self.file_hash(path)

            records, report = load_real_records(path, migration_date=date(2026, 10, 2))

            self.assertEqual(before, self.file_hash(path))
            self.assertEqual([record["comment_id"] for record in records], [
                "JE Adjustment",
                "JE Adjustment#2",
                "Another Adjustment"
            ])
            self.assertEqual(records[0], {
                "comment_id": "JE Adjustment",
                "comment_name": "TJM-1 Full technical name Spreadsheet A 123",
                "comment_text": "First comment",
                "age": 45,
                "aging_bucket": "31-60",
                "start_date": "2026-06-04",
                "account": "ACCT-100",
                "pl_name": "Revenue",
                "sub_program": "SP-7",
                "created_date": "2026-10-02",
                "modified_date": "2026-10-02",
                "paired_comment_id": "",
                "flag_reason": "",
                "flagged_date": ""
            })
            self.assertEqual(records[2]["age"], 100)
            self.assertEqual(records[2]["aging_bucket"], "91-180")
            self.assertEqual(report["source_rows"], 3)
            self.assertEqual(report["base_ids"], 2)
            self.assertEqual(report["suffixed_ids"], 1)
            self.assertEqual(report["column_headers"]["start_date"]["column"], 37)
            self.assertEqual(report["column_headers"]["account"]["header"], "Account Code")

    def test_excel_serial_converts_to_expected_date(self):
        rows = [self.make_row(start_serial=46177)]
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "real.xlsx")
            self.create_workbook(path, rows)
            records, _ = load_real_records(path)
            self.assertEqual(records[0]["start_date"], "2026-06-04")

    def test_rejects_invalid_start_date(self):
        rows = [self.make_row(start_serial="not-a-date")]
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "real.xlsx")
            self.create_workbook(path, rows)
            with self.assertRaisesRegex(ValueError, "start date.*row 7"):
                load_real_records(path)

    def test_rejects_missing_required_mapped_value(self):
        rows = [self.make_row(comment_text="")]
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "real.xlsx")
            self.create_workbook(path, rows)

            with self.assertRaisesRegex(ValueError, "comment_text.*row 7"):
                load_real_records(path)

    def test_allows_missing_optional_fields(self):
        rows = [self.make_row(pl_name=None, sub_program=None, account=None)]
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "real.xlsx")
            self.create_workbook(path, rows)
            records, _ = load_real_records(path)
            self.assertEqual(records[0]["account"], "")
            self.assertEqual(records[0]["pl_name"], "")
            self.assertEqual(records[0]["sub_program"], "")

    def test_rejects_wrong_sheet_name(self):
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "real.xlsx")
            self.create_workbook(path, [])

            with self.assertRaisesRegex(ValueError, "Missing worksheet"):
                load_real_records(path, sheet_name="Details Aug 26")


if __name__ == "__main__":
    unittest.main()
