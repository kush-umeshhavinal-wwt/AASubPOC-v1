class SmartsheetsAPI {
    constructor(apiToken, sheetId) {
        this.apiToken = apiToken;
        this.sheetId = sheetId;
        this.baseUrl = 'https://api.smartsheet.com/2.0';
        this.fields = [
            'comment_id',
            'comment_name',
            'comment_text',
            'age',
            'aging_bucket',
            'start_date',
            'account',
            'pl_name',
            'sub_program',
            'created_date',
            'modified_date',
            'paired_comment_id',
            'flag_reason',
            'flagged_date'
        ];
    }

    getHeaders() {
        return {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
        };
    }

    async fetchComments() {
        try {
            const data = await this.getSheet();
            return this.parseComments(data);
        } catch (error) {
            console.error('Error fetching comments:', error);
            throw error;
        }
    }

    async createComment(commentData) {
        try {
            const sheet = await this.getSheet();
            const columnMap = this.getColumnMap(sheet);
            const rowData = {
                toBottom: true,
                cells: this.buildCells(commentData, columnMap)
            };

            const response = await fetch(`${this.baseUrl}/sheets/${this.sheetId}/rows`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify([rowData])
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return {
                ...commentData,
                row_id: result.result[0].id
            };
        } catch (error) {
            console.error('Error creating comment:', error);
            throw error;
        }
    }

    async updateComment(rowId, commentData) {
        return this.updateComments([{ rowId, commentData }]);
    }

    async updateComments(updates) {
        try {
            const sheet = await this.getSheet();
            const columnMap = this.getColumnMap(sheet);
            const rows = updates.map(({ rowId, commentData }) => ({
                id: rowId,
                cells: this.buildCells(commentData, columnMap)
            }));

            const response = await fetch(`${this.baseUrl}/sheets/${this.sheetId}/rows`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(rows)
            });

            if (!response.ok) {
                const details = await response.text();
                throw new Error(`Smartsheet update failed (${response.status}): ${details}`);
            }

            return true;
        } catch (error) {
            console.error('Error updating comments:', error);
            throw error;
        }
    }

    async deleteComment(rowId) {
        try {
            console.log('Deleting row ID:', rowId, 'Type:', typeof rowId);
            
            const response = await fetch(`${this.baseUrl}/sheets/${this.sheetId}/rows/${rowId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            console.log('Delete response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Delete failed:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
    }

    async getSheet() {
        const response = await fetch(`${this.baseUrl}/sheets/${this.sheetId}`, {
            method: 'GET',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    parseComments(data) {
        const comments = [];
        const columnMap = this.getColumnMap(data);

        for (const row of data.rows) {
            if (!row.cells || row.cells.length === 0) continue;

            const comment = { row_id: row.id };
            for (const field of this.fields) {
                comment[field] = this.getCellValue(row, columnMap[field]);
            }

            if (comment.comment_id) {
                comments.push(comment);
            }
        }

        return comments;
    }

    getColumnMap(sheetData) {
        const map = {};
        for (const column of sheetData.columns) {
            map[column.title] = column.id;
        }
        const missing = this.fields.filter(field => !map[field]);
        if (missing.length) {
            throw new Error(`Smartsheet is missing required columns: ${missing.join(', ')}`);
        }
        return map;
    }

    buildCells(commentData, columnMap) {
        return this.fields.map(field => {
            const value = commentData[field] ?? '';
            return {
                columnId: columnMap[field],
                value: value === '' ? null : value
            };
        });
    }

    getCellValue(row, columnId) {
        if (!row.cells) return '';
        const cell = row.cells.find(candidate => candidate.columnId === columnId);
        return cell ? (cell.value ?? '') : '';
    }
}
