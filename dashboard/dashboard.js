/**
 * Dashboard JavaScript
 * Handles all UI interactions and comment management
 */

class Dashboard {
    constructor() {
        this.api = null;
        this.comments = [];
        this.filteredComments = [];
        this.currentSort = { field: 'modified_date', direction: 'desc' };
        this.deleteTargetId = null;
        
        this.initializeElements();
        this.loadConfiguration();
        this.bindEvents();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        // Header elements
        this.syncStatus = document.getElementById('syncStatus');
        this.refreshBtn = document.getElementById('refreshBtn');
        
        // Control elements
        this.searchInput = document.getElementById('searchInput');
        this.statusFilter = document.getElementById('statusFilter');
        this.addCommentBtn = document.getElementById('addCommentBtn');
        
        // Comments elements
        this.commentsList = document.getElementById('commentsList');
        this.commentsCount = document.getElementById('commentsCount');
        this.loadingState = document.getElementById('loadingState');
        this.emptyState = document.getElementById('emptyState');
        
        // Modal elements
        this.commentModal = document.getElementById('commentModal');
        this.deleteModal = document.getElementById('deleteModal');
        this.configModal = document.getElementById('configModal');
        
        // Form elements
        this.commentForm = document.getElementById('commentForm');
        this.commentRowId = document.getElementById('commentRowId');
        this.commentId = document.getElementById('commentId');
        this.commentText = document.getElementById('commentText');
        this.commentStatus = document.getElementById('commentStatus');
        this.modalTitle = document.getElementById('modalTitle');
        
        // Config form elements
        this.configForm = document.getElementById('configForm');
        this.apiTokenInput = document.getElementById('apiToken');
        this.sheetIdInput = document.getElementById('sheetId');
    }

    /**
     * Load configuration from localStorage
     */
    loadConfiguration() {
        const apiToken = localStorage.getItem('smartsheet_api_token');
        const sheetId = localStorage.getItem('smartsheet_sheet_id');
        
        if (apiToken && sheetId) {
            this.apiTokenInput.value = apiToken;
            this.sheetIdInput.value = sheetId;
            this.initializeAPI(apiToken, sheetId);
        } else {
            this.showConfigModal();
        }
    }

    /**
     * Initialize API client
     */
    initializeAPI(apiToken, sheetId) {
        try {
            this.api = new SmartsheetsAPI(apiToken, sheetId);
            this.updateSyncStatus('connected');
            this.loadComments();
        } catch (error) {
            console.error('Failed to initialize API:', error);
            this.updateSyncStatus('error');
            this.showToast('Failed to connect to Smartsheets', 'error');
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Refresh button
        this.refreshBtn.addEventListener('click', () => this.loadComments());
        
        // Search input
        this.searchInput.addEventListener('input', (e) => this.filterComments(e.target.value));
        
        // Status filter
        this.statusFilter.addEventListener('change', () => this.applyFilters());
        
        // Add comment button
        this.addCommentBtn.addEventListener('click', () => this.showCommentModal());
        
        // Modal close buttons
        document.getElementById('modalClose').addEventListener('click', () => this.hideCommentModal());
        document.getElementById('deleteModalClose').addEventListener('click', () => this.hideDeleteModal());
        document.getElementById('configModalClose').addEventListener('click', () => this.hideConfigModal());
        
        // Cancel buttons
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideCommentModal());
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.hideDeleteModal());
        document.getElementById('cancelConfigBtn').addEventListener('click', () => this.hideConfigModal());
        
        // Form submissions
        this.commentForm.addEventListener('submit', (e) => this.handleCommentSubmit(e));
        this.configForm.addEventListener('submit', (e) => this.handleConfigSubmit(e));
        
        // Delete confirmation
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());
        
        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target === this.commentModal) this.hideCommentModal();
            if (e.target === this.deleteModal) this.hideDeleteModal();
            if (e.target === this.configModal) this.hideConfigModal();
        });
    }

    /**
     * Load comments from Smartsheets
     */
    async loadComments() {
        this.showLoading();
        
        try {
            this.comments = await this.api.fetchComments();
            this.applyFilters();
            this.updateSyncStatus('connected');
            this.showToast('Comments loaded successfully', 'success');
        } catch (error) {
            console.error('Failed to load comments:', error);
            this.updateSyncStatus('error');
            this.showToast('Failed to load comments', 'error');
            this.showEmpty();
        }
    }

    /**
     * Apply filters and search
     */
    applyFilters() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const statusFilter = this.statusFilter.value;
        
        this.filteredComments = this.comments.filter(comment => {
            const matchesSearch = comment.comment_text.toLowerCase().includes(searchTerm);
            const matchesStatus = statusFilter === 'all' || comment.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
        
        this.sortComments();
        this.renderComments();
    }

    /**
     * Filter comments by search term
     */
    filterComments(searchTerm) {
        this.applyFilters();
    }

    /**
     * Sort comments
     */
    sortComments() {
        this.filteredComments.sort((a, b) => {
            const aVal = a[this.currentSort.field] || '';
            const bVal = b[this.currentSort.field] || '';
            
            if (this.currentSort.direction === 'asc') {
                return aVal.localeCompare(bVal);
            } else {
                return bVal.localeCompare(aVal);
            }
        });
    }

    /**
     * Render comments to the DOM
     */
    renderComments() {
        this.hideLoading();
        
        if (this.filteredComments.length === 0) {
            this.showEmpty();
            this.commentsCount.textContent = '0 comments';
            return;
        }
        
        this.hideEmpty();
        this.commentsCount.textContent = `${this.filteredComments.length} comment${this.filteredComments.length !== 1 ? 's' : ''}`;
        
        this.commentsList.innerHTML = this.filteredComments.map(comment => this.createCommentCard(comment)).join('');
        
        // Bind edit and delete buttons
        this.filteredComments.forEach(comment => {
            const editBtn = document.getElementById(`edit-${comment.row_id}`);
            const deleteBtn = document.getElementById(`delete-${comment.row_id}`);
            
            if (editBtn) {
                editBtn.addEventListener('click', () => this.showCommentModal(comment));
            }
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.showDeleteModal(comment));
            }
        });
    }

    /**
     * Create HTML for a comment card
     */
    createCommentCard(comment) {
        const statusClass = comment.status === 'active' ? 'status-active' : 'status-archived';
        const formattedDate = this.formatDate(comment.modified_date);
        
        return `
            <div class="comment-card" data-row-id="${comment.row_id}">
                <div class="comment-header">
                    <span class="comment-id">${comment.comment_id.substring(0, 8)}...</span>
                    <span class="comment-status ${statusClass}">${comment.status}</span>
                </div>
                <div class="comment-body">
                    <p class="comment-text">${this.escapeHtml(comment.comment_text)}</p>
                </div>
                <div class="comment-footer">
                    <span class="comment-date">Modified: ${formattedDate}</span>
                    <div class="comment-actions">
                        <button class="btn btn-sm btn-secondary" id="edit-${comment.row_id}">Edit</button>
                        <button class="btn btn-sm btn-danger" id="delete-${comment.row_id}">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show comment modal for add/edit
     */
    showCommentModal(comment = null) {
        if (comment) {
            this.modalTitle.textContent = 'Edit Comment';
            this.commentRowId.value = comment.row_id;
            this.commentId.value = comment.comment_id;
            this.commentText.value = comment.comment_text;
            this.commentStatus.value = comment.status;
        } else {
            this.modalTitle.textContent = 'Add Comment';
            this.commentForm.reset();
            this.commentRowId.value = '';
            this.commentId.value = this.generateUUID();
            this.commentStatus.value = 'active';
        }
        
        this.commentModal.style.display = 'block';
        this.commentText.focus();
    }

    /**
     * Hide comment modal
     */
    hideCommentModal() {
        this.commentModal.style.display = 'none';
        this.commentForm.reset();
    }

    /**
     * Handle comment form submission
     */
    async handleCommentSubmit(e) {
        e.preventDefault();
        
        const commentData = {
            comment_id: this.commentId.value,
            comment_text: this.commentText.value,
            status: this.commentStatus.value,
            created_date: new Date().toISOString(),
            modified_date: new Date().toISOString()
        };
        
        const rowId = this.commentRowId.value;
        
        try {
            if (rowId) {
                // Update existing comment
                await this.api.updateComment(parseInt(rowId), commentData);
                this.showToast('Comment updated successfully', 'success');
            } else {
                // Create new comment
                await this.api.createComment(commentData);
                this.showToast('Comment created successfully', 'success');
            }
            
            this.hideCommentModal();
            this.loadComments();
        } catch (error) {
            console.error('Failed to save comment:', error);
            this.showToast('Failed to save comment', 'error');
        }
    }

    /**
     * Show delete confirmation modal
     */
    showDeleteModal(comment) {
        this.deleteTargetId = comment.row_id;
        this.deleteModal.style.display = 'block';
    }

    /**
     * Hide delete modal
     */
    hideDeleteModal() {
        this.deleteModal.style.display = 'none';
        this.deleteTargetId = null;
    }

    /**
     * Confirm delete action
     */
    async confirmDelete() {
        if (!this.deleteTargetId) return;
        
        try {
            await this.api.deleteComment(this.deleteTargetId);
            this.showToast('Comment deleted successfully', 'success');
            this.hideDeleteModal();
            this.loadComments();
        } catch (error) {
            console.error('Failed to delete comment:', error);
            this.showToast('Failed to delete comment', 'error');
        }
    }

    /**
     * Show configuration modal
     */
    showConfigModal() {
        this.configModal.style.display = 'block';
    }

    /**
     * Hide configuration modal
     */
    hideConfigModal() {
        this.configModal.style.display = 'none';
    }

    /**
     * Handle configuration form submission
     */
    handleConfigSubmit(e) {
        e.preventDefault();
        
        const apiToken = this.apiTokenInput.value;
        const sheetId = this.sheetIdInput.value;
        
        localStorage.setItem('smartsheet_api_token', apiToken);
        localStorage.setItem('smartsheet_sheet_id', sheetId);
        
        this.initializeAPI(apiToken, sheetId);
        this.hideConfigModal();
        this.showToast('Configuration saved', 'success');
    }

    /**
     * Update sync status indicator
     */
    updateSyncStatus(status) {
        const indicator = this.syncStatus.querySelector('.status-indicator');
        const text = this.syncStatus.querySelector('.status-text');
        
        indicator.className = 'status-indicator';
        
        switch (status) {
            case 'connected':
                indicator.classList.add('status-connected');
                text.textContent = 'Connected';
                break;
            case 'error':
                indicator.classList.add('status-error');
                text.textContent = 'Error';
                break;
            default:
                text.textContent = 'Not connected';
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.loadingState.style.display = 'block';
        this.emptyState.style.display = 'none';
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.loadingState.style.display = 'none';
    }

    /**
     * Show empty state
     */
    showEmpty() {
        this.emptyState.style.display = 'block';
    }

    /**
     * Hide empty state
     */
    hideEmpty() {
        this.emptyState.style.display = 'none';
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.getElementById('toastContainer').appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Generate UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});