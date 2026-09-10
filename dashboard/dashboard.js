class Dashboard {
    constructor() {
        this.api = null;
        this.comments = [];
        this.deleteTargetId = null;
        
        this.init();
    }

    init() {
        // Load API credentials from localStorage
        const apiToken = localStorage.getItem('smartsheet_api_token');
        const sheetId = localStorage.getItem('smartsheet_sheet_id');
        
        if (apiToken && sheetId) {
            this.api = new SmartsheetsAPI(apiToken, sheetId);
            this.loadComments();
        } else {
            this.showConfigModal();
        }
        
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('addBtn').addEventListener('click', () => this.showAddModal());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadComments());
        document.getElementById('commentForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal('commentModal'));
        document.getElementById('closeModal').addEventListener('click', () => this.hideModal('commentModal'));
        document.getElementById('confirmDelete').addEventListener('click', () => this.confirmDelete());
        document.getElementById('cancelDelete').addEventListener('click', () => this.hideModal('deleteModal'));
        document.getElementById('closeDeleteModal').addEventListener('click', () => this.hideModal('deleteModal'));
    }

    async loadComments() {
        try {
            const comments = await this.api.fetchComments();
            this.comments = comments;
            this.renderComments();
            this.showToast('Comments loaded', 'success');
        } catch (error) {
            console.error('Failed to load comments:', error);
            this.showToast('Failed to load comments', 'error');
        }
    }

    renderComments() {
        const container = document.getElementById('commentsList');
        container.innerHTML = '';
        
        // Sort by modified date (newest first)
        this.comments.sort((a, b) => {
            const dateA = new Date(a.modified_date || 0).getTime();
            const dateB = new Date(b.modified_date || 0).getTime();
            return dateB - dateA;
        });
        
        if (this.comments.length === 0) {
            container.innerHTML = '<div class="empty-state">No comments found</div>';
            return;
        }
        
        this.comments.forEach(comment => {
            const div = document.createElement('div');
            div.className = 'comment';
            div.innerHTML = `
                <div class="comment-header">
                    <span class="comment-id">${comment.comment_id.substring(0, 8)}...</span>
                    <span class="comment-status status-${comment.status}">${comment.status}</span>
                </div>
                <div class="comment-text">${comment.comment_text}</div>
                <div class="comment-footer">
                    <span class="comment-date">${this.formatDate(comment.modified_date)}</span>
                    <div class="comment-actions">
                        <button onclick="window.dashboard.editComment('${comment.comment_id}')">Edit</button>
                        <button class="delete" onclick="window.dashboard.deleteComment('${comment.row_id}')">Delete</button>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    showAddModal() {
        document.getElementById('modalTitle').textContent = 'Add Comment';
        document.getElementById('commentForm').reset();
        document.getElementById('commentRowId').value = '';
        document.getElementById('commentId').value = this.generateUUID();
        document.getElementById('commentStatus').value = 'active';
        document.getElementById('commentModal').style.display = 'block';
    }

    editComment(commentId) {
        const comment = this.comments.find(c => c.comment_id === commentId);
        if (comment) {
            document.getElementById('modalTitle').textContent = 'Edit Comment';
            document.getElementById('commentRowId').value = comment.row_id;
            document.getElementById('commentId').value = comment.comment_id;
            document.getElementById('commentText').value = comment.comment_text;
            document.getElementById('commentStatus').value = comment.status;
            document.getElementById('commentModal').style.display = 'block';
        }
    }

    deleteComment(rowId) {
        this.deleteTargetId = rowId;
        document.getElementById('deleteModal').style.display = 'block';
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const commentData = {
            comment_id: document.getElementById('commentId').value,
            comment_text: document.getElementById('commentText').value,
            status: document.getElementById('commentStatus').value,
            created_date: new Date().toISOString(),
            modified_date: new Date().toISOString()
        };
        
        const rowId = document.getElementById('commentRowId').value;
        
        try {
            if (rowId) {
                await this.api.updateComment(Number(rowId), commentData);
                this.showToast('Comment updated', 'success');
            } else {
                await this.api.createComment(commentData);
                this.showToast('Comment created', 'success');
            }
            
            this.hideModal('commentModal');
            this.loadComments();
        } catch (error) {
            console.error('Failed to save comment:', error);
            this.showToast('Failed to save comment', 'error');
        }
    }

    async confirmDelete() {
        if (!this.deleteTargetId) return;
        
        try {
            await this.api.deleteComment(Number(this.deleteTargetId));
            this.showToast('Comment deleted', 'success');
            this.hideModal('deleteModal');
            this.loadComments();
        } catch (error) {
            console.error('Failed to delete comment:', error);
            this.showToast('Failed to delete comment', 'error');
        }
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showConfigModal() {
        const apiToken = prompt('Enter Smartsheets API Token:');
        const sheetId = prompt('Enter Smartsheets Sheet ID:');
        
        if (apiToken && sheetId) {
            localStorage.setItem('smartsheet_api_token', apiToken);
            localStorage.setItem('smartsheet_sheet_id', sheetId);
            this.api = new SmartsheetsAPI(apiToken, sheetId);
            this.loadComments();
        }
    }

    showToast(message, type) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast toast-${type}`;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    formatDate(dateString) {
        if (! dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
}

// Initialize
window.dashboard = new Dashboard();