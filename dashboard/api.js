/**
 * Smartsheets API Wrapper
 * Handles all API communication with Smartsheets for the dashboard
 */

class SmartsheetsAPI {
    constructor(apiToken, sheetId) {
        this.apiToken = apiToken;
        this.sheetId = sheetId;
        this.baseUrl = 'https://api.smartsheet.com/2.0';
    }

    /**
     * Get authentication headers
     */
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Fetch all comments from Smartsheets
     */
    async fetchComments() {
        try {
            const response = await fetch(`${this.baseUrl}/sheets/${this.sheetId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return this.parseCommentsFromSheet(data);
        } catch (error) {
            console.error('Error fetching comments:', error);
            throw error;
        }
    }

    /**
     * Create a new comment in Smartsheets
     */
    async createComment(commentData) {
        try {
            // First, get the sheet to get column IDs
            const sheet = await this.getSheet();
            const columnMap = this.getColumnMap(sheet);

            const rowData = {
                toBottom: true,
                cells: [
                    { columnId: columnMap['comment_id'], value: commentData.comment_id },
                    { columnId: columnMap['comment_text'], value: commentData.comment_text },
                    { columnId: columnMap['created_date'], value: commentData.created_date },
                    { columnId: columnMap['modified_date'], value: commentData.modified_date },
                    { columnId: columnMap['status'], value: commentData.status }
                ]
            };

            const response = await fetch(`${this.baseUrl}/sheets/${this.sheetId}/rows`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify([rowData])
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                ...commentData,
                row_id: data.result[0].id
            };
        } catch (error) {
            console.error('Error creating comment:', error);
            throw error;
        }
    }

    /**
     * Update an existing comment in Smartsheets
     */
    async updateComment(rowId, commentData) {
        try {
            const sheet = await this.getSheet();
            const columnMap = this.getColumnMap(sheet);

            const rowData = {
                id: rowId,
                cells: [
                    { columnId: columnMap['comment_id'], value: commentData.comment_id },
                    { columnId: columnMap['comment_text'], value: commentData.comment_text },
                    { columnId: columnMap['created_date'], value: commentData.created_date },
                    { columnId: columnMap['modified_date'], value: commentData.modified_date },
                    { columnId: columnMap['status'], value: commentData.status }
                ]
            };

            const response = await fetch(`${this.baseUrl}/sheets/${this.sheetId}/rows`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify([rowData])
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Error updating comment:', error);
            throw error;
        }
    }

    /**
     * Delete a comment from Smartsheets
     */
    async deleteComment(rowId) {
        try {
            const response = await fetch(`${this.baseUrl}/sheets/${this.sheetId}/rows/${rowId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
    }

    /**
     * Get sheet data (helper method)
     */
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

    /**
     * Parse comments from sheet data
     */
    parseCommentsFromSheet(sheetData) {
        const comments = [];
        const columnMap = this.getColumnMap(sheetData);

        for (const row of sheetData.rows) {
            if (!row.cells || row.cells.length === 0) continue;

            const comment = {
                row_id: row.id,
                comment_id: this.getCellValue(row, columnMap['comment_id']),
                comment_text: this.getCellValue(row, columnMap['comment_text']),
                created_date: this.getCellValue(row, columnMap['created_date']),
                modified_date: this.getCellValue(row, columnMap['modified_date']),
                status: this.getCellValue(row, columnMap['status'])
            };

            if (comment.comment_id) {
                comments.push(comment);
            }
        }

        return comments;
    }

    /**
     * Get column name to ID mapping
     */
    getColumnMap(sheetData) {
        const map = {};
        for (const column of sheetData.columns) {
            map[column.title] = column.id;
        }
        return map;
    }

    /**
     * Get cell value by column ID
     */
    getCellValue(row, columnId) {
        if (!row.cells) return '';
        const cell = row.cells.find(c => c.columnId === columnId);
        return cell ? (cell.value || '') : '';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartsheetsAPI;
}