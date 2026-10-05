class Dashboard {
    constructor() {
        this.api = null;
        this.comments = [];
        this.currentView = 'user';
        this.deleteTargetId = null;
        this.flagSourceId = null;
        this.selectedPairId = null;
        this.duplicateCommentIds = new Set();
        this.asOfDate = this.todayIso();
        this.AGING_BUCKETS = ['0-30', '31-60', '61-90', '91-180', '180+'];

        this.init();
    }

    init() {
        // Load API credentials from localStorage
        const apiToken = localStorage.getItem('smartsheet_api_token');
        const sheetId = localStorage.getItem('smartsheet_sheet_id');

        this.bindEvents();
        document.getElementById('asOfInput').value = this.asOfDate;

        if (apiToken && sheetId) {
            this.api = new SmartsheetsAPI(apiToken, sheetId);
            this.loadComments();
        } else {
            this.showConfigModal();
        }
    }

    bindEvents() {
        document.querySelectorAll('[data-view]').forEach(button => {
            button.addEventListener('click', () => this.switchView(button.dataset.view));
        });
        document.getElementById('addBtn').addEventListener('click', () => this.showAddModal());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadComments());
        document.getElementById('searchInput').addEventListener('input', () => this.render());
        document.getElementById('accountFilter').addEventListener('change', () => this.render());
        document.getElementById('plFilter').addEventListener('change', () => this.render());
        document.getElementById('subProgramFilter').addEventListener('change', () => this.render());
        document.getElementById('bucketFilter').addEventListener('change', () => this.render());
        document.getElementById('calculateBtn').addEventListener('click', () => this.recalculateAging());
        document.getElementById('asOfInput').addEventListener('change', event => {
            if (event.target.value) {
                this.asOfDate = event.target.value;
                this.render();
            }
        });
        document.getElementById('pairFilter').addEventListener('change', () => this.render());
        document.getElementById('clearFiltersBtn').addEventListener('click', () => this.clearFilters());
        document.getElementById('commentForm').addEventListener('submit', event => this.handleFormSubmit(event));
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal('commentModal'));
        document.getElementById('closeModal').addEventListener('click', () => this.hideModal('commentModal'));
        document.getElementById('pairSearchInput').addEventListener('input', event => this.renderPairCandidates(event.target.value));
        document.getElementById('confirmFlag').addEventListener('click', () => this.confirmFlagPair());
        document.getElementById('removeFlag').addEventListener('click', () => this.removeFlagPair());
        document.getElementById('cancelFlag').addEventListener('click', () => this.hideModal('flagModal'));
        document.getElementById('closeFlagModal').addEventListener('click', () => this.hideModal('flagModal'));
        document.getElementById('closeManageFlag').addEventListener('click', () => this.hideModal('flagModal'));
        document.getElementById('confirmDelete').addEventListener('click', () => this.confirmDelete());
        document.getElementById('cancelDelete').addEventListener('click', () => this.hideModal('deleteModal'));
        document.getElementById('closeDeleteModal').addEventListener('click', () => this.hideModal('deleteModal'));
    }

    async loadComments() {
        if (!this.api) return;
        const loadState = document.getElementById('loadState');
        loadState.textContent = 'Loading...';
        try {
            const comments = await this.api.fetchComments();
            this.comments = comments.map(comment => this.normalizeComment(comment));
            this.duplicateCommentIds = this.findDuplicateIds(this.comments);
            this.populateBucketFilter();
            this.populateDropdownFilters();
            this.renderDataWarning();
            this.render();
            loadState.textContent = 'Updated just now';
            this.showToast('Comments loaded', 'success');
        } catch (error) {
            console.error('Failed to load comments:', error);
            loadState.textContent = 'Unable to load data';
            this.showToast(error.message || 'Failed to load comments', 'error');
        }
    }

    recalculateAging() {
        const asOfInput = document.getElementById('asOfInput');
        if (asOfInput.value) {
            this.asOfDate = asOfInput.value;
        }
        this.render();
        this.showToast(`Aging recalculated as of ${this.formatDate(this.asOfDate)}`, 'success');
    }

    render() {
        const comments = this.getFilteredComments();
        const label = comments.length === 1 ? 'account' : 'accounts';
        document.getElementById('resultCount').textContent = `${comments.length} ${label}`;
        this.renderUserComments(comments);
        this.renderLeadership(comments);
    }

    renderUserComments(comments) {
        const tbody = document.getElementById('commentsGridBody');
        const grid = document.getElementById('commentsGrid');
        const emptyState = document.getElementById('gridEmptyState');
        tbody.replaceChildren();
        emptyState.replaceChildren();

        if (comments.length === 0) {
            grid.style.display = 'none';
            emptyState.appendChild(this.createEmptyState('No comments match the current filters.'));
            return;
        }
        grid.style.display = '';

        comments.forEach(comment => {
            const pairState = this.getPairState(comment);
            const row = this.createElement('tr', pairState.hasReference ? (pairState.issue ? 'grid-row pair-issue' : 'grid-row paired-comment') : 'grid-row');
            row.id = `comment-row-${comment.row_id}`;

            const accountCell = this.createElement('td', 'grid-account', comment.account || '—');
            accountCell.title = comment.account || '';
            const plCell = this.createElement('td', '', comment.pl_name || '—');
            plCell.title = comment.pl_name || '';
            const subProgramCell = this.createElement('td', '', comment.sub_program || '—');
            subProgramCell.title = comment.sub_program || '';

            const nameCell = this.createElement('td', 'grid-name');
            const name = this.createElement('span', 'comment-name', this.getDisplayName(comment.comment_name));
            name.title = comment.comment_name || 'Unnamed comment';
            nameCell.appendChild(name);
            nameCell.appendChild(this.createElement('span', 'comment-id', this.shortId(comment.comment_id)));
            const occurrence = this.getOccurrenceNumber(comment.comment_id);
            if (occurrence > 1) nameCell.appendChild(this.createElement('span', 'occurrence-badge', `Occurrence ${occurrence}`));
            if (pairState.hasReference) {
                nameCell.appendChild(this.createElement('span', pairState.issue ? 'pair-badge pair-badge-warning' : 'pair-badge', pairState.issue ? 'Pair issue' : 'Paired'));
            }

            const startCell = this.createElement('td', '', comment.start_date ? this.formatDate(comment.start_date) : '—');
            const age = this.effectiveAge(comment);
            const ageCell = this.createElement('td', age > 180 ? 'age-alert' : '', `${age}`);
            const bucketCell = this.createElement('td');
            bucketCell.appendChild(this.createElement('span', 'bucket-pill', this.effectiveBucket(comment)));

            const commentCell = this.createElement('td', 'grid-comment');
            const text = comment.comment_text || 'No comment text';
            const truncated = text.length > 80 ? `${text.slice(0, 77)}…` : text;
            const textSpan = this.createElement('span', 'grid-comment-text', truncated);
            textSpan.title = text;
            textSpan.addEventListener('click', () => this.editComment(comment.comment_id));
            commentCell.appendChild(textSpan);

            const actionsCell = this.createElement('td');
            const actions = this.createElement('div', 'comment-actions');
            const editButton = this.createElement('button', '', 'Edit');
            editButton.type = 'button';
            editButton.addEventListener('click', () => this.editComment(comment.comment_id));
            const flagButton = this.createElement('button', 'flag-action', pairState.hasReference ? 'Manage flag' : 'Flag pair');
            flagButton.type = 'button';
            flagButton.disabled = !pairState.hasReference && this.duplicateCommentIds.size > 0;
            flagButton.title = flagButton.disabled ? 'Repair duplicate comment IDs before creating pairs' : '';
            flagButton.addEventListener('click', () => this.showFlagModal(comment.comment_id));
            const deleteButton = this.createElement('button', 'delete', 'Delete');
            deleteButton.type = 'button';
            deleteButton.addEventListener('click', () => this.deleteComment(comment.row_id));
            actions.append(editButton, flagButton, deleteButton);
            actionsCell.appendChild(actions);

            row.append(accountCell, plCell, subProgramCell, nameCell, startCell, ageCell, bucketCell, commentCell, actionsCell);
            tbody.appendChild(row);
        });
    }

    renderLeadership(comments) {
        document.getElementById('totalKpi').textContent = comments.length;
        document.getElementById('bucket180Kpi').textContent = comments.filter(comment => this.effectiveBucket(comment) === '180+').length;
        const averageAge = comments.length
            ? Math.round((comments.reduce((total, comment) => total + this.effectiveAge(comment), 0) / comments.length) * 10) / 10
            : 0;
        document.getElementById('averageAgeKpi').textContent = `${averageAge} days`;
        document.getElementById('over500Kpi').textContent = comments.filter(comment => this.effectiveAge(comment) > 500).length;
        document.getElementById('pairedKpi').textContent = this.getValidPairKeys(comments).size;
        this.renderBucketDistribution(comments);
        this.renderLeadershipList(comments);
    }

    renderBucketDistribution(comments) {
        const container = document.getElementById('bucketDistribution');
        container.replaceChildren();
        if (comments.length === 0) {
            container.appendChild(this.createEmptyState('No aging data to summarize.'));
            return;
        }

        const counts = comments.reduce((totals, comment) => {
            const bucket = this.effectiveBucket(comment);
            totals[bucket] = (totals[bucket] || 0) + 1;
            return totals;
        }, {});
        const maximum = Math.max(...Object.values(counts));

        Object.entries(counts)
            .sort(([left], [right]) => this.bucketStart(left) - this.bucketStart(right))
            .forEach(([bucket, count]) => {
                const row = this.createElement('div', 'bucket-row');
                row.append(
                    this.createElement('span', 'bucket-label', bucket),
                    this.createElement('span', 'bucket-count', `${count} ${count === 1 ? 'account' : 'accounts'}`)
                );
                const track = this.createElement('div', 'bucket-track');
                const bar = this.createElement('div', 'bucket-bar');
                bar.style.width = `${Math.max((count / maximum) * 100, 8)}%`;
                track.appendChild(bar);
                row.appendChild(track);
                container.appendChild(row);
            });
    }

    renderLeadershipList(comments) {
        const container = document.getElementById('leadershipList');
        container.replaceChildren();
        if (comments.length === 0) {
            container.appendChild(this.createEmptyState('No comments match the current filters.'));
            return;
        }

        [...comments].sort((left, right) => this.effectiveAge(right) - this.effectiveAge(left)).forEach(comment => {
            const age = this.effectiveAge(comment);
            const item = this.createElement('article', `leadership-item${comment.paired_comment_id ? ' leadership-item-paired' : ''}`);
            const heading = this.createElement('div', 'leadership-item-heading');
            const name = this.createElement('h4', '', this.getDisplayName(comment.comment_name));
            name.title = comment.comment_name || 'Unnamed comment';
            heading.append(
                name,
                this.createElement('strong', age > 500 ? 'age-alert' : '', `${age} days`)
            );
            item.append(
                heading,
                this.createElement('p', '', comment.comment_text || 'No comment text'),
                this.createElement('span', 'bucket-pill', this.effectiveBucket(comment))
            );
            const pairSummary = this.createPairSummary(comment, true);
            if (pairSummary) item.appendChild(pairSummary);
            container.appendChild(item);
        });
    }

    getFilteredComments() {
        const term = document.getElementById('searchInput').value.trim().toLowerCase();
        const account = document.getElementById('accountFilter').value;
        const plName = document.getElementById('plFilter').value;
        const subProgram = document.getElementById('subProgramFilter').value;
        const bucket = document.getElementById('bucketFilter').value;
        const pairFilter = document.getElementById('pairFilter').value;

        return this.comments
            .filter(comment => {
                const partner = this.getCommentById(comment.paired_comment_id);
                const searchable = [
                    comment.comment_name,
                    comment.comment_text,
                    comment.comment_id,
                    comment.account,
                    comment.pl_name,
                    comment.sub_program,
                    comment.flag_reason,
                    partner?.comment_name
                ].join(' ').toLowerCase();
                const paired = Boolean(comment.paired_comment_id);
                return (!term || searchable.includes(term))
                    && (!account || comment.account === account)
                    && (!plName || comment.pl_name === plName)
                    && (!subProgram || comment.sub_program === subProgram)
                    && (!bucket || this.effectiveBucket(comment) === bucket)
                    && (!pairFilter || (pairFilter === 'paired' ? paired : !paired));
            })
            .sort((left, right) => new Date(right.modified_date || 0) - new Date(left.modified_date || 0));
    }

    populateBucketFilter() {
        const select = document.getElementById('bucketFilter');
        const selected = select.value;
        select.replaceChildren(new Option('All buckets', ''));
        this.AGING_BUCKETS.forEach(bucket => select.add(new Option(bucket, bucket)));
        select.value = this.AGING_BUCKETS.includes(selected) ? selected : '';
    }

    populateDropdownFilters() {
        const dropdowns = [
            ['accountFilter', 'account', 'All accounts'],
            ['plFilter', 'pl_name', 'All P&L names'],
            ['subProgramFilter', 'sub_program', 'All sub programs']
        ];
        dropdowns.forEach(([elementId, field, placeholder]) => {
            const select = document.getElementById(elementId);
            const selected = select.value;
            const values = [...new Set(this.comments.map(comment => comment[field]).filter(Boolean))].sort();
            select.replaceChildren(new Option(placeholder, ''));
            values.forEach(value => select.add(new Option(value, value)));
            select.value = values.includes(selected) ? selected : '';
        });
    }

    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('accountFilter').value = '';
        document.getElementById('plFilter').value = '';
        document.getElementById('subProgramFilter').value = '';
        document.getElementById('bucketFilter').value = '';
        document.getElementById('pairFilter').value = '';
        this.render();
    }

    switchView(view) {
        this.currentView = view;
        document.getElementById('userView').hidden = view !== 'user';
        document.getElementById('leadershipView').hidden = view !== 'leadership';
        document.getElementById('addBtn').hidden = view !== 'user';
        document.getElementById('viewContext').textContent = view === 'user' ? 'Editing enabled' : 'Read-only leadership mode';
        document.querySelectorAll('[data-view]').forEach(button => {
            const active = button.dataset.view === view;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', String(active));
        });
    }

    showAddModal() {
        document.getElementById('modalTitle').textContent = 'Add Comment';
        document.getElementById('commentForm').reset();
        document.getElementById('commentRowId').value = '';
        document.getElementById('commentId').value = this.generateUUID();
        document.getElementById('commentStartDate').value = this.todayIso();
        document.getElementById('commentModal').style.display = 'block';
        document.getElementById('commentName').focus();
    }

    editComment(commentId) {
        const comment = this.getCommentById(commentId);
        if (comment) {
            document.getElementById('modalTitle').textContent = 'Edit Comment';
            document.getElementById('commentRowId').value = comment.row_id;
            document.getElementById('commentId').value = comment.comment_id;
            document.getElementById('commentName').value = comment.comment_name;
            document.getElementById('commentText').value = comment.comment_text;
            document.getElementById('commentStartDate').value = comment.start_date || '';
            document.getElementById('commentModal').style.display = 'block';
            document.getElementById('commentName').focus();
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        const rowId = document.getElementById('commentRowId').value;
        const existing = rowId ? this.comments.find(comment => String(comment.row_id) === rowId) : null;
        const now = this.todayIso();
        const startDate = document.getElementById('commentStartDate').value || now;
        const age = this.ageBetween(startDate, now);
        const editableFields = {
            comment_name: document.getElementById('commentName').value.trim(),
            comment_text: document.getElementById('commentText').value.trim(),
            start_date: startDate,
            age,
            aging_bucket: this.getAgingBucket(age),
            modified_date: now
        };
        const commentData = existing ? {
            ...existing,
            ...editableFields
        } : {
            comment_id: document.getElementById('commentId').value,
            ...editableFields,
            account: '',
            pl_name: '',
            sub_program: '',
            created_date: now,
            paired_comment_id: '',
            flag_reason: '',
            flagged_date: ''
        };
        delete commentData.row_id;
        
        try {
            if (rowId) {
                await this.api.updateComment(Number(rowId), commentData);
                this.showToast('Comment updated', 'success');
            } else {
                await this.api.createComment(commentData);
                this.showToast('Comment created', 'success');
            }
            
            this.hideModal('commentModal');
            await this.loadComments();
        } catch (error) {
            console.error('Failed to save comment:', error);
            this.showToast(error.message || 'Failed to save comment', 'error');
        }
    }

    showFlagModal(commentId) {
        const source = this.getCommentById(commentId);
        if (!source) return;
        if (!source.paired_comment_id && this.duplicateCommentIds.size > 0) {
            this.showToast('Repair duplicate comment IDs before creating pairs', 'error');
            return;
        }

        this.flagSourceId = source.comment_id;
        this.selectedPairId = null;
        document.getElementById('flagModalTitle').textContent = source.paired_comment_id ? 'Manage flagged pair' : 'Flag comment pair';
        const sourceSummary = document.getElementById('flagSourceSummary');
        sourceSummary.replaceChildren(
            this.createElement('span', 'pair-kicker', 'Source comment'),
            this.createElement('strong', '', this.getDisplayName(source.comment_name)),
            this.createElement('p', '', source.comment_text || 'No comment text')
        );

        const createSection = document.getElementById('flagCreateSection');
        const manageSection = document.getElementById('flagManageSection');
        if (source.paired_comment_id) {
            createSection.hidden = true;
            manageSection.hidden = false;
            const details = document.getElementById('flagPartnerDetails');
            details.replaceChildren();
            const summary = this.createPairSummary(source);
            if (summary) details.appendChild(summary);
        } else {
            createSection.hidden = false;
            manageSection.hidden = true;
            document.getElementById('pairSearchInput').value = '';
            document.getElementById('flagReason').value = '';
            document.getElementById('confirmFlag').disabled = true;
            this.renderPairCandidates('');
        }
        document.getElementById('flagModal').style.display = 'block';
    }

    renderPairCandidates(searchTerm) {
        const source = this.getCommentById(this.flagSourceId);
        const container = document.getElementById('pairCandidates');
        container.replaceChildren();
        if (!source) return;
        const term = searchTerm.trim().toLowerCase();
        const candidates = this.getEligiblePairComments(source).filter(comment => {
            const text = `${comment.comment_name} ${comment.comment_text} ${comment.comment_id}`.toLowerCase();
            return !term || text.includes(term);
        });

        if (candidates.length === 0) {
            container.appendChild(this.createEmptyState('No eligible unpaired comments found.'));
            return;
        }

        candidates.forEach(comment => {
            const button = this.createElement('button', `pair-candidate${this.selectedPairId === comment.comment_id ? ' selected' : ''}`);
            button.type = 'button';
            button.append(
                this.createElement('strong', '', this.getDisplayName(comment.comment_name)),
                this.createElement('span', '', comment.comment_text || 'No comment text'),
                this.createElement('small', '', `${this.effectiveAge(comment)} days · ${this.effectiveBucket(comment)}`)
            );
            button.addEventListener('click', () => {
                this.selectedPairId = comment.comment_id;
                document.getElementById('confirmFlag').disabled = false;
                this.renderPairCandidates(document.getElementById('pairSearchInput').value);
            });
            container.appendChild(button);
        });
    }

    async confirmFlagPair() {
        const confirmButton = document.getElementById('confirmFlag');
        if (!this.flagSourceId || !this.selectedPairId) return;
        confirmButton.disabled = true;
        try {
            const freshComments = (await this.api.fetchComments()).map(comment => this.normalizeComment(comment));
            const duplicates = this.findDuplicateIds(freshComments);
            if (duplicates.size > 0) throw new Error('Duplicate comment IDs must be repaired before pairing');
            const source = freshComments.find(comment => comment.comment_id === this.flagSourceId);
            const partner = freshComments.find(comment => comment.comment_id === this.selectedPairId);
            if (!source || !partner) throw new Error('One of the selected comments no longer exists');
            if (source.comment_id === partner.comment_id) throw new Error('A comment cannot pair with itself');
            if (source.paired_comment_id || partner.paired_comment_id) throw new Error('One of the comments was paired by another user. Refresh and try again.');

            const reason = document.getElementById('flagReason').value.trim();
            const flaggedDate = new Date().toISOString().slice(0, 10);
            const sourceData = this.serializeComment({
                ...source,
                paired_comment_id: partner.comment_id,
                flag_reason: reason,
                flagged_date: flaggedDate
            });
            const partnerData = this.serializeComment({
                ...partner,
                paired_comment_id: source.comment_id,
                flag_reason: reason,
                flagged_date: flaggedDate
            });
            await this.api.updateComments([
                { rowId: Number(source.row_id), commentData: sourceData },
                { rowId: Number(partner.row_id), commentData: partnerData }
            ]);
            this.hideModal('flagModal');
            await this.loadComments();
            this.showToast('Comment pair flagged', 'success');
        } catch (error) {
            console.error('Failed to flag comment pair:', error);
            this.showToast(error.message || 'Failed to flag comment pair', 'error');
            confirmButton.disabled = false;
        }
    }

    async removeFlagPair() {
        if (!this.flagSourceId || !window.confirm('Remove this flagged pair from both comments?')) return;
        const removeButton = document.getElementById('removeFlag');
        removeButton.disabled = true;
        try {
            const freshComments = (await this.api.fetchComments()).map(comment => this.normalizeComment(comment));
            const source = freshComments.find(comment => comment.comment_id === this.flagSourceId);
            if (!source) throw new Error('The source comment no longer exists');
            const partner = freshComments.find(comment => comment.comment_id === source.paired_comment_id);
            const updates = [{
                rowId: Number(source.row_id),
                commentData: this.serializeComment(this.clearPairFields(source))
            }];
            if (partner && partner.paired_comment_id === source.comment_id) {
                updates.push({
                    rowId: Number(partner.row_id),
                    commentData: this.serializeComment(this.clearPairFields(partner))
                });
            }
            await this.api.updateComments(updates);
            this.hideModal('flagModal');
            await this.loadComments();
            this.showToast('Comment pair removed', 'success');
        } catch (error) {
            console.error('Failed to remove comment pair:', error);
            this.showToast(error.message || 'Failed to remove comment pair', 'error');
        } finally {
            removeButton.disabled = false;
        }
    }

    deleteComment(rowId) {
        const comment = this.comments.find(candidate => String(candidate.row_id) === String(rowId));
        this.deleteTargetId = rowId;
        document.getElementById('deleteMessage').textContent = comment?.paired_comment_id
            ? 'Deleting this comment will also remove the flag from its counterpart. This action cannot be undone.'
            : 'Are you sure you want to delete this comment? This action cannot be undone.';
        document.getElementById('deleteModal').style.display = 'block';
    }

    async confirmDelete() {
        if (!this.deleteTargetId) return;
        const source = this.comments.find(comment => String(comment.row_id) === String(this.deleteTargetId));
        let partner = null;
        let partnerCleared = false;
        try {
            if (source?.paired_comment_id) {
                partner = this.getCommentById(source.paired_comment_id);
                if (partner?.paired_comment_id === source.comment_id) {
                    await this.api.updateComment(Number(partner.row_id), this.serializeComment(this.clearPairFields(partner)));
                    partnerCleared = true;
                }
            }
            await this.api.deleteComment(Number(this.deleteTargetId));
            this.showToast('Comment deleted', 'success');
            this.hideModal('deleteModal');
            this.deleteTargetId = null;
            await this.loadComments();
        } catch (error) {
            if (partnerCleared && partner) {
                try {
                    await this.api.updateComment(Number(partner.row_id), this.serializeComment(partner));
                } catch (rollbackError) {
                    console.error('Failed to restore paired comment after delete failure:', rollbackError);
                }
            }
            console.error('Failed to delete comment:', error);
            this.showToast(error.message || 'Failed to delete comment', 'error');
        }
    }

    renderDataWarning() {
        const warning = document.getElementById('dataWarning');
        const brokenPairs = this.comments.filter(comment => this.getPairState(comment).issue).length;
        const messages = [];
        if (this.duplicateCommentIds.size > 0) {
            messages.push(`Duplicate comment IDs detected: ${[...this.duplicateCommentIds].join(', ')}. New pairs are disabled until IDs are unique.`);
        }
        if (brokenPairs > 0) {
            messages.push(`${brokenPairs} comment${brokenPairs === 1 ? ' has' : 's have'} a broken or one-sided pair reference.`);
        }
        warning.textContent = messages.join(' ');
        warning.hidden = messages.length === 0;
    }

    getEligiblePairComments(source) {
        const counts = this.getCommentIdCounts(this.comments);
        return this.comments.filter(comment => comment.comment_id !== source.comment_id
            && counts.get(comment.comment_id) === 1
            && !comment.paired_comment_id);
    }

    getPairState(comment) {
        if (!comment.paired_comment_id) return { hasReference: false, partner: null, issue: '' };
        const partner = this.getCommentById(comment.paired_comment_id);
        if (!partner) return { hasReference: true, partner: null, issue: 'Counterpart not found' };
        if (partner.paired_comment_id !== comment.comment_id) {
            return { hasReference: true, partner, issue: 'Pair reference is not reciprocal' };
        }
        return { hasReference: true, partner, issue: '' };
    }

    getValidPairKeys(comments) {
        const keys = new Set();
        comments.forEach(comment => {
            const state = this.getPairState(comment);
            if (!state.issue && state.partner) {
                keys.add([comment.comment_id, state.partner.comment_id].sort().join('::'));
            }
        });
        return keys;
    }

    createPairSummary(comment, compact = false) {
        const state = this.getPairState(comment);
        if (!state.hasReference) return null;
        const summary = this.createElement('div', `pair-summary${state.issue ? ' pair-summary-warning' : ''}${compact ? ' pair-summary-compact' : ''}`);
        summary.appendChild(this.createElement('span', 'pair-kicker', state.issue ? 'Pairing issue' : 'Flagged pair'));
        summary.appendChild(this.createElement('strong', '', state.partner
            ? `Paired with ${this.getDisplayName(state.partner.comment_name) || this.shortId(state.partner.comment_id)}`
            : `Missing counterpart ${this.shortId(comment.paired_comment_id)}`));
        if (comment.flag_reason) summary.appendChild(this.createElement('p', '', comment.flag_reason));
        if (comment.flagged_date) summary.appendChild(this.createElement('small', '', `Flagged ${this.formatDate(comment.flagged_date)}`));
        if (state.issue) summary.appendChild(this.createElement('small', 'pair-error-text', state.issue));
        if (!compact && state.partner) {
            const showButton = this.createElement('button', 'pair-link-button', 'Show counterpart');
            showButton.type = 'button';
            showButton.addEventListener('click', () => this.showCounterpart(state.partner));
            summary.appendChild(showButton);
        }
        return summary;
    }

    showCounterpart(partner) {
        this.hideModal('flagModal');
        document.getElementById('searchInput').value = '';
        document.getElementById('accountFilter').value = '';
        document.getElementById('plFilter').value = '';
        document.getElementById('subProgramFilter').value = '';
        document.getElementById('bucketFilter').value = '';
        document.getElementById('pairFilter').value = '';
        this.render();
        const card = document.getElementById(`comment-row-${partner.row_id}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('comment-highlight');
            setTimeout(() => card.classList.remove('comment-highlight'), 1800);
        }
    }

    getCommentById(commentId) {
        if (!commentId) return null;
        return this.comments.find(comment => comment.comment_id === commentId) || null;
    }

    getCommentIdCounts(comments) {
        return comments.reduce((counts, comment) => {
            counts.set(comment.comment_id, (counts.get(comment.comment_id) || 0) + 1);
            return counts;
        }, new Map());
    }

    findDuplicateIds(comments) {
        return new Set([...this.getCommentIdCounts(comments)].filter(([, count]) => count > 1).map(([commentId]) => commentId));
    }

    normalizeComment(comment) {
        return {
            ...comment,
            age: this.toAge(comment.age),
            aging_bucket: String(comment.aging_bucket || ''),
            start_date: this.normalizeDate(comment.start_date),
            account: String(comment.account || ''),
            pl_name: String(comment.pl_name || ''),
            sub_program: String(comment.sub_program || ''),
            paired_comment_id: String(comment.paired_comment_id || ''),
            flag_reason: String(comment.flag_reason || ''),
            flagged_date: String(comment.flagged_date || '')
        };
    }

    serializeComment(comment) {
        const data = { ...comment };
        delete data.row_id;
        return data;
    }

    clearPairFields(comment) {
        return {
            ...comment,
            paired_comment_id: '',
            flag_reason: '',
            flagged_date: ''
        };
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
        } else {
            document.getElementById('loadState').textContent = 'Smartsheet credentials required';
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

    createEmptyState(message) {
        return this.createElement('div', 'empty-state', message);
    }

    createElement(tag, className = '', text = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== '') element.textContent = text;
        return element;
    }

    toAge(value) {
        const age = Number(value);
        return Number.isFinite(age) && age >= 0 ? Math.floor(age) : 0;
    }

    todayIso() {
        return new Date().toISOString().slice(0, 10);
    }

    normalizeDate(value) {
        const text = String(value || '').trim();
        if (!text) return '';
        const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
        if (iso) return iso[1];
        const date = new Date(text);
        return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
    }

    ageBetween(startDate, endDate) {
        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
        return Math.max(0, Math.floor((end - start) / 86400000));
    }

    effectiveAge(comment) {
        return comment.start_date ? this.ageBetween(comment.start_date, this.asOfDate) : this.toAge(comment.age);
    }

    effectiveBucket(comment) {
        return this.getAgingBucket(this.effectiveAge(comment));
    }

    getAgingBucket(value) {
        const age = this.toAge(value);
        if (age <= 30) return '0-30';
        if (age <= 60) return '31-60';
        if (age <= 90) return '61-90';
        if (age <= 180) return '91-180';
        return '180+';
    }

    bucketStart(bucket) {
        return Number.parseInt(String(bucket), 10) || 0;
    }

    getDisplayName(value) {
        const fullName = String(value || '').trim().replace(/^\(|\)$/g, '').replace(/\s+/g, ' ');
        if (!fullName) return 'Unnamed comment';
        const firstSpace = fullName.indexOf(' ');
        const code = firstSpace === -1 ? fullName : fullName.slice(0, firstSpace);
        let description = firstSpace === -1 ? '' : fullName.slice(firstSpace + 1);
        description = description.split(/\s+(?:Spreadsheet|Recvue)\s+[A-Z]\b|\s+EBS\b/i, 1)[0].replace(/^\s*-\s*|\s*-\s*$/g, '');
        let displayName = description ? `${code} - ${description}` : code;
        if (displayName.length > 64) {
            displayName = `${displayName.slice(0, 65).replace(/\s+\S*$/, '')}…`;
        }
        return displayName;
    }

    getOccurrenceNumber(commentId) {
        const match = String(commentId || '').match(/#(\d+)$/);
        return match ? Number(match[1]) : 1;
    }

    shortId(commentId) {
        return commentId ? `${commentId.substring(0, 8)}...` : 'No ID';
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(character) {
            const random = Math.random() * 16 | 0;
            const value = character === 'x' ? random : (random & 0x3 | 0x8);
            return value.toString(16);
        });
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('-').map(Number);
            return new Date(year, month - 1, day).toLocaleDateString();
        }
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return dateString;
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
}

// Initialize
window.dashboard = new Dashboard();
