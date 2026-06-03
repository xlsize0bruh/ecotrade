// ============================================================
//  EcoTrade dashboard — trades, borrows, donations (real-time)
// ============================================================

// --- UI Helpers ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const icon = type === 'success' ? 'fa-check' : 'fa-circle-exclamation';

    toast.className = 'toast-enter pointer-events-auto flex items-center gap-3 pl-4 pr-5 py-3 text-sm text-neutral-100 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-xs';
    toast.innerHTML = `
        <span class="w-6 h-6 rounded-full ${type === 'success' ? 'bg-white text-neutral-950' : 'bg-neutral-700 text-white'} flex items-center justify-center shrink-0">
            <i class="fa-solid ${icon} text-[11px]"></i>
        </span>
        <span class="font-medium">${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.replace('toast-enter', 'toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, s => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
}

function fmtDate(ts) {
    if (!ts) return '';
    return new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dueInfo(ts) {
    if (!ts) return { text: 'Not started', overdue: false };
    const now = Math.floor(Date.now() / 1000);
    const diff = ts - now;
    const days = Math.ceil(diff / 86400);
    if (diff <= 0) {
        const od = Math.max(0, Math.floor(-diff / 86400));
        return { text: `Overdue by ${od} day${od === 1 ? '' : 's'}`, overdue: true };
    }
    return { text: `Due in ${days} day${days === 1 ? '' : 's'} · ${fmtDate(ts)}`, overdue: false };
}

function reviewBadge(pos, neg) {
    return `
        <span class="inline-flex items-center gap-1.5 text-[11px] text-neutral-400">
            <span class="inline-flex items-center gap-1 text-neutral-200"><i class="fa-solid fa-thumbs-up text-[9px]"></i>${pos || 0}</span>
            <span class="text-neutral-700">·</span>
            <span class="inline-flex items-center gap-1 text-neutral-500"><i class="fa-solid fa-thumbs-down text-[9px]"></i>${neg || 0}</span>
        </span>
    `;
}

// --- Global State ---
let allItems = [];
let myItems = [];
let allRequests = [];   // unified trades + borrows
let allChampions = [];
let currentTab = 'market';
let currentReqFilter = 'all';
let globalPollInterval = null;

// --- Real-time polling ---
function startPolling() {
    if (globalPollInterval) clearInterval(globalPollInterval);
    globalPollInterval = setInterval(() => {
        loadProfile(true);
        loadMarketplace(true);
        loadMyItems(true);
        loadRequests(true);
        loadChampion(true);
        loadDonations(true);
    }, 1000);
}

// --- Tabs ---
function setActiveTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        const on = b.getAttribute('data-tab') === tabName;
        b.classList.toggle('text-white', on);
        b.classList.toggle('sm:bg-neutral-900', on);
        b.classList.toggle('text-neutral-400', !on);
    });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        currentTab = tab;
        setActiveTab(tab);
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById('tab-' + tab).classList.remove('hidden');

        if (tab === 'market') loadMarketplace();
        if (tab === 'my-items') loadMyItems();
        if (tab === 'requests') loadRequests();
        if (tab === 'champion') loadChampion();
        if (tab === 'profile') loadProfile();
        if (tab === 'donate') loadDonations();
    });
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('api/auth.php?action=logout', { method: 'POST' });
    window.location.href = 'login.php';
});

async function init() {
    setActiveTab('market');
    await loadProfile();
    await loadMarketplace();
    loadRequests();
    loadDonations();
    startPolling();
}

// --- Profile ---
async function loadProfile(silent = false) {
    const res = await fetch('api/users.php?action=profile');
    const data = await res.json();
    if (data.success) {
        document.getElementById('header-pos').innerHTML = `${data.profile.positive_reviews} <i class="fa-solid fa-thumbs-up text-[9px]"></i>`;
        document.getElementById('header-neg').innerHTML = `${data.profile.negative_reviews} <i class="fa-solid fa-thumbs-down text-[9px]"></i>`;
        if (document.getElementById('prof-pos')) {
            document.getElementById('prof-trades').textContent = data.profile.completed_trades;
            document.getElementById('prof-pos').innerHTML = `${data.profile.positive_reviews} <i class="fa-solid fa-thumbs-up text-sm text-neutral-500"></i>`;
            document.getElementById('prof-neg').textContent = data.profile.negative_reviews;
        }
    }
}

// --- Marketplace ---
async function loadMarketplace(silent = false) {
    const res = await fetch('api/items.php?action=list');
    const data = await res.json();
    if (data.success) {
        if (silent && JSON.stringify(allItems) === JSON.stringify(data.items)) return;
        allItems = data.items;
        renderMarketplace();
    }
}

document.getElementById('search-tags').addEventListener('input', renderMarketplace);

function renderMarketplace() {
    const grid = document.getElementById('market-grid');
    const query = document.getElementById('search-tags').value.toLowerCase();
    // Items in an active trade are hidden; borrowed items stay visible (trade still allowed).
    const items = allItems.filter(i => i.owner_id !== CURRENT_USER_ID && !i.in_trade);
    let html = '';
    let count = 0;

    items.forEach(item => {
        if (query && !item.tags.some(t => t.toLowerCase().includes(query)) && !item.title.toLowerCase().includes(query)) return;
        count++;

        // Borrow state badge + button
        let borrowTag = '';
        let borrowBtn = `<button onclick="openBorrowModal('${item.id}')" class="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 py-2 rounded-lg text-sm font-medium transition-colors border border-neutral-700"><i class="fa-solid fa-clock-rotate-left text-[11px] mr-1"></i> Borrow</button>`;
        let borrowNote = '';
        if (item.borrow_status === 'accepted') {
            const di = dueInfo(item.borrow_due);
            borrowTag = `<div class="absolute top-2.5 left-2.5 bg-neutral-900/90 backdrop-blur text-neutral-100 text-[10px] font-semibold px-2 py-1 rounded-md border border-neutral-700 flex items-center gap-1.5"><i class="fa-solid fa-clock-rotate-left text-[9px]"></i> Borrowed${item.borrow_due ? ' · free ' + fmtDate(item.borrow_due) : ''}</div>`;
            borrowBtn = `<button disabled title="On loan${item.borrow_due ? ' until ' + fmtDate(item.borrow_due) : ''}" class="bg-neutral-900 text-neutral-600 py-2 rounded-lg text-sm font-medium border border-neutral-800 cursor-not-allowed"><i class="fa-solid fa-lock text-[10px] mr-1"></i> Borrowed</button>`;
            borrowNote = `<p class="text-[10px] text-neutral-600 mt-2 text-center">On loan — you can still request a trade and swap once it's returned.</p>`;
        } else if (item.borrow_status === 'pending') {
            borrowTag = `<div class="absolute top-2.5 left-2.5 bg-neutral-900/90 backdrop-blur text-neutral-400 text-[10px] font-medium px-2 py-1 rounded-md border border-neutral-700 flex items-center gap-1.5"><i class="fa-solid fa-hourglass-half text-[9px]"></i> Borrow requested</div>`;
            borrowBtn = `<button disabled class="bg-neutral-900 text-neutral-600 py-2 rounded-lg text-sm font-medium border border-neutral-800 cursor-not-allowed"><i class="fa-solid fa-hourglass-half text-[10px] mr-1"></i> Requested</button>`;
        }

        let lookingForHtml = '';
        if (item.looking_for_tags && item.looking_for_tags.length > 0) {
            lookingForHtml = `<div class="mb-3 text-xs text-neutral-500">
                <i class="fa-solid fa-bullseye text-[10px] mr-1 text-neutral-400"></i> Wants:
                <span class="text-neutral-300">${escapeHtml(item.looking_for_tags.join(', '))}</span>
            </div>`;
        }

        html += `
            <div class="group bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 transition-colors flex flex-col">
                <div class="h-44 bg-neutral-950 relative overflow-hidden">
                    ${item.image ? `<img src="${escapeHtml(item.image)}" class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300">` : `<div class="flex items-center justify-center h-full text-neutral-700"><i class="fa-solid fa-image text-3xl"></i></div>`}
                    ${borrowTag}
                </div>
                <div class="p-4 flex-1 flex flex-col">
                    <h3 class="font-semibold text-[15px] text-white leading-tight mb-1">${escapeHtml(item.title)}</h3>
                    <p class="text-sm text-neutral-500 mb-3 line-clamp-2 flex-1">${escapeHtml(item.description)}</p>
                    ${lookingForHtml}
                    <div class="flex flex-wrap gap-1.5 mb-4">
                        ${item.tags.map(t => `<span class="bg-neutral-800 text-[10px] px-2 py-0.5 rounded-md text-neutral-400">${escapeHtml(t)}</span>`).join('')}
                    </div>
                    <div class="flex items-center justify-between border-t border-neutral-800 pt-3 mb-3">
                        <div class="flex items-center gap-2 min-w-0">
                            <div class="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-semibold shrink-0">${escapeHtml((item.owner_username || '?').charAt(0).toUpperCase())}</div>
                            <span class="text-xs text-neutral-300 font-medium truncate">${escapeHtml(item.owner_username)}</span>
                        </div>
                        ${reviewBadge(item.owner_pos, item.owner_neg)}
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="proposeTrade('${item.id}')" class="bg-white text-neutral-950 hover:bg-neutral-200 py-2 rounded-lg text-sm font-semibold transition-colors">
                            <i class="fa-solid fa-arrow-right-arrow-left text-[11px] mr-1"></i> Trade
                        </button>
                        ${borrowBtn}
                    </div>
                    ${borrowNote}
                </div>
            </div>
        `;
    });

    if (count === 0) {
        html = '<div class="col-span-full text-center py-16 text-neutral-600 text-sm">No available items match your criteria.</div>';
    }
    grid.innerHTML = html;
}

// --- My Items ---
async function loadMyItems(silent = false) {
    const res = await fetch('api/items.php?action=list');
    const data = await res.json();
    if (data.success) {
        if (silent && JSON.stringify(allItems) === JSON.stringify(data.items)) return;
        allItems = data.items;
        myItems = data.items.filter(i => i.owner_id === CURRENT_USER_ID);
        const grid = document.getElementById('my-items-grid');
        if (myItems.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-16 text-neutral-600 text-sm">You haven\'t listed any items yet.</div>';
            return;
        }
        let html = '';
        myItems.forEach(item => {
            let lockLabel = '';
            let imgBadge = '';
            if (item.in_trade) {
                lockLabel = `<span class="text-[11px] text-neutral-300 bg-neutral-800 px-2.5 py-1 rounded-md border border-neutral-700"><i class="fa-solid fa-arrow-right-arrow-left text-[9px] mr-1"></i> In a trade</span>`;
                imgBadge = `<div class="absolute top-2.5 left-2.5 bg-neutral-900/90 text-neutral-300 text-[10px] px-2 py-1 rounded-md border border-neutral-700"><i class="fa-solid fa-lock text-[9px] mr-1"></i> In trade</div>`;
            } else if (item.borrow_status === 'accepted') {
                lockLabel = `<span class="text-[11px] text-neutral-100 bg-neutral-800 px-2.5 py-1 rounded-md border border-neutral-600"><i class="fa-solid fa-clock-rotate-left text-[9px] mr-1"></i> On loan${item.borrow_due ? ' · free ' + fmtDate(item.borrow_due) : ''}</span>`;
                imgBadge = `<div class="absolute top-2.5 left-2.5 bg-neutral-900/90 text-neutral-100 text-[10px] px-2 py-1 rounded-md border border-neutral-700"><i class="fa-solid fa-clock-rotate-left text-[9px] mr-1"></i> Lent out</div>`;
            } else if (item.borrow_status === 'pending') {
                lockLabel = `<span class="text-[11px] text-neutral-400 bg-neutral-800 px-2.5 py-1 rounded-md border border-neutral-700"><i class="fa-solid fa-hourglass-half text-[9px] mr-1"></i> Borrow requested</span>`;
            }
            html += `
                <div class="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden group relative">
                    <div class="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 items-center justify-center z-10 backdrop-blur-sm">
                        <button onclick="openEditItemModal('${item.id}')" class="bg-white hover:bg-neutral-200 text-neutral-950 px-4 py-2 rounded-lg text-sm font-semibold">
                            <i class="fa-solid fa-pen mr-1.5 text-xs"></i> Edit
                        </button>
                        ${lockLabel}
                    </div>
                    <div class="h-36 bg-neutral-950 relative">
                        ${item.image ? `<img src="${escapeHtml(item.image)}" class="w-full h-full object-cover">` : `<div class="flex items-center justify-center h-full text-neutral-700"><i class="fa-solid fa-image text-2xl"></i></div>`}
                        ${imgBadge}
                    </div>
                    <div class="p-4">
                        <h3 class="font-semibold text-white mb-1.5">${escapeHtml(item.title)}</h3>
                        ${item.looking_for_tags?.length ? `<p class="text-[11px] text-neutral-500 mb-2"><i class="fa-solid fa-bullseye text-[9px] mr-1"></i> ${escapeHtml(item.looking_for_tags.join(', '))}</p>` : ''}
                        <div class="flex flex-wrap gap-1.5">
                            ${item.tags.map(t => `<span class="bg-neutral-800 text-[10px] px-2 py-0.5 rounded-md text-neutral-400">${escapeHtml(t)}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    }
}

function openItemModal() {
    document.getElementById('add-item-form').reset();
    document.getElementById('edit-item-id').value = '';
    document.getElementById('item-modal-title').textContent = 'List an Item';
    document.getElementById('add-item-btn-text').textContent = 'Post Item';
    document.getElementById('img-edit-hint').classList.add('hidden');
    document.getElementById('delete-item-btn').classList.add('hidden');
    openModal('add-item-modal');
}

function openEditItemModal(itemId) {
    const item = myItems.find(i => i.id === itemId) || allItems.find(i => i.id === itemId);
    if (!item) return;
    document.getElementById('edit-item-id').value = item.id;
    document.getElementById('item-title').value = item.title;
    document.getElementById('item-desc').value = item.description;
    document.getElementById('item-tags').value = (item.tags || []).join(', ');
    document.getElementById('item-looking-for').value = (item.looking_for_tags || []).join(', ');
    document.getElementById('item-modal-title').textContent = 'Edit Item';
    document.getElementById('add-item-btn-text').textContent = 'Save Changes';
    document.getElementById('img-edit-hint').classList.remove('hidden');
    document.getElementById('delete-item-btn').classList.remove('hidden');
    openModal('add-item-modal');
}

document.getElementById('delete-item-btn').addEventListener('click', async () => {
    const editId = document.getElementById('edit-item-id').value;
    if (!editId) return;
    const res = await fetch(`api/items.php?action=delete`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ item_id: editId })
    });
    const data = await res.json();
    if (data.success) {
        closeModal('add-item-modal');
        showToast("Item deleted");
        loadMyItems(); loadMarketplace();
    } else { showToast(data.error, 'error'); }
});

document.getElementById('add-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnText = document.getElementById('add-item-btn-text');
    const spinner = document.getElementById('add-item-spinner');
    const originalText = btnText.textContent;
    btnText.textContent = 'Saving...';
    spinner.classList.remove('hidden');

    const editId = document.getElementById('edit-item-id').value;
    const action = editId ? 'edit' : 'create';
    const formData = new FormData();
    if (editId) formData.append('item_id', editId);
    formData.append('title', document.getElementById('item-title').value);
    formData.append('description', document.getElementById('item-desc').value);
    formData.append('tags', document.getElementById('item-tags').value);
    formData.append('looking_for_tags', document.getElementById('item-looking-for').value);
    const fileField = document.getElementById('item-image');
    if (fileField.files[0]) formData.append('image', fileField.files[0]);

    try {
        const res = await fetch(`api/items.php?action=${action}`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            closeModal('add-item-modal');
            showToast(editId ? 'Item updated' : 'Item posted');
            loadMyItems(); loadMarketplace();
        } else { showToast(data.error, 'error'); }
    } catch (err) {
        showToast("Error saving item", 'error');
    } finally {
        btnText.textContent = originalText;
        spinner.classList.add('hidden');
    }
});

// --- Trade proposal ---
function proposeTrade(wantedId) {
    const wanted = allItems.find(i => i.id === wantedId);
    if (!wanted) return;
    const wantedLookingFor = (wanted.looking_for_tags || []).join(', ');

    document.getElementById('wanted-item-id').value = wantedId;
    document.getElementById('wanted-item-title').textContent = wanted.title;
    document.getElementById('wanted-looking-for').innerHTML = wantedLookingFor ? `<i class="fa-solid fa-bullseye text-[10px] mr-1"></i> Looking for: <span class="text-neutral-300 font-medium">${escapeHtml(wantedLookingFor)}</span>` : 'Open to any offers';

    const list = document.getElementById('offer-items-list');
    list.innerHTML = '';
    const availableItems = myItems.filter(i => !i.is_locked);

    if (availableItems.length === 0) {
        list.innerHTML = '<p class="text-sm text-neutral-400 bg-neutral-800/50 p-3 rounded-lg border border-neutral-700">You have no unlocked items to offer. List a new item first.</p>';
        document.getElementById('submit-trade-btn').disabled = true;
    } else {
        availableItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'flex items-center p-3 border border-neutral-800 rounded-lg hover:border-neutral-600 hover:bg-neutral-800/50 cursor-pointer transition-colors group';
            div.innerHTML = `
                <input type="radio" name="offer_item" value="${item.id}" class="mr-3 accent-white w-4 h-4">
                <span class="text-neutral-200 text-sm font-medium group-hover:text-white transition-colors">${escapeHtml(item.title)}</span>
            `;
            div.addEventListener('click', () => {
                div.querySelector('input').checked = true;
                document.getElementById('submit-trade-btn').disabled = false;
            });
            list.appendChild(div);
        });
        document.getElementById('submit-trade-btn').disabled = true;
    }
    openModal('propose-trade-modal');
}

document.getElementById('submit-trade-btn').addEventListener('click', async () => {
    const wantedId = document.getElementById('wanted-item-id').value;
    const selectedOffer = document.querySelector('input[name="offer_item"]:checked');
    if (!selectedOffer) return;
    const offerId = selectedOffer.value;
    const btn = document.getElementById('submit-trade-btn');
    btn.disabled = true; btn.textContent = "Sending...";

    const res = await fetch('api/trades.php?action=propose', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ offered_item_id: offerId, wanted_item_id: wantedId })
    });
    const data = await res.json();
    if (data.success) {
        closeModal('propose-trade-modal');
        showToast("Trade request sent");
        loadRequests(); loadMarketplace(); loadMyItems();
    } else { showToast(data.error, 'error'); }
    btn.textContent = "Send request";
});

// --- Borrow request ---
function openBorrowModal(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;
    document.getElementById('borrow-item-id').value = itemId;
    document.getElementById('borrow-item-title').textContent = item.title;
    document.getElementById('borrow-days').value = 7;
    openModal('borrow-modal');
}

function setBorrowDays(d) { document.getElementById('borrow-days').value = d; }

document.getElementById('submit-borrow-btn').addEventListener('click', async () => {
    const itemId = document.getElementById('borrow-item-id').value;
    const days = parseInt(document.getElementById('borrow-days').value, 10);
    if (!days || days < 1) { showToast('Enter a valid borrow period', 'error'); return; }
    const btn = document.getElementById('submit-borrow-btn');
    btn.disabled = true; btn.textContent = 'Sending...';

    const res = await fetch('api/borrows.php?action=request', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ item_id: itemId, days })
    });
    const data = await res.json();
    if (data.success) {
        closeModal('borrow-modal');
        showToast('Borrow request sent');
        loadRequests(); loadMarketplace(); loadMyItems();
    } else { showToast(data.error, 'error'); }
    btn.disabled = false; btn.textContent = 'Send borrow request';
});

// --- Unified Requests (trades + borrows) ---
document.querySelectorAll('.req-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        currentReqFilter = btn.getAttribute('data-filter');
        renderRequests();
    });
});

async function loadRequests(silent = false) {
    const [tr, br] = await Promise.all([
        fetch('api/trades.php?action=list').then(r => r.json()).catch(() => ({})),
        fetch('api/borrows.php?action=list').then(r => r.json()).catch(() => ({}))
    ]);
    let reqs = [];
    if (tr.success) tr.trades.forEach(t => reqs.push(Object.assign({ _kind: 'trade' }, t)));
    if (br.success) br.borrows.forEach(b => reqs.push(Object.assign({ _kind: 'borrow' }, b)));
    reqs.sort((a, b) => b.created_at - a.created_at);

    if (silent && JSON.stringify(allRequests) === JSON.stringify(reqs)) return;
    allRequests = reqs;
    renderRequests();
    updateRequestsBadge();

    if (currentChatReq) {
        const upd = allRequests.find(r => r.id === currentChatReq.id);
        if (upd && JSON.stringify(upd) !== JSON.stringify(currentChatReq)) {
            currentChatReq = upd;
            renderChatHeader(upd);
        }
    }
}

function updateRequestsBadge() {
    let n = 0;
    allRequests.forEach(r => {
        if (r._kind === 'trade' && r.status === 'pending' && r.receiver_id === CURRENT_USER_ID) n++;
        if (r._kind === 'borrow' && r.status === 'pending' && r.lender_id === CURRENT_USER_ID) n++;
        if (r._kind === 'borrow' && r.status === 'accepted' && r.lender_id === CURRENT_USER_ID && r.extension && r.extension.status === 'pending') n++;
    });
    ['requests-badge', 'requests-badge-m'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (n > 0) { el.textContent = n; el.classList.remove('hidden'); }
        else el.classList.add('hidden');
    });
}

function renderReqFilters() {
    document.querySelectorAll('.req-filter').forEach(b => {
        const on = b.getAttribute('data-filter') === currentReqFilter;
        b.classList.toggle('bg-white', on);
        b.classList.toggle('text-neutral-950', on);
        b.classList.toggle('text-neutral-400', !on);
    });
}

function statusBadge(status) {
    if (status === 'pending') return '<span class="bg-neutral-800 text-neutral-400 px-2.5 py-1 rounded-md text-[11px] font-medium border border-neutral-700"><i class="fa-solid fa-clock text-[9px] mr-1"></i> Pending</span>';
    if (status === 'accepted') return '<span class="bg-neutral-800 text-neutral-100 px-2.5 py-1 rounded-md text-[11px] font-medium border border-neutral-600"><i class="fa-solid fa-handshake text-[9px] mr-1"></i> Active</span>';
    if (status === 'completed') return '<span class="bg-white text-neutral-950 px-2.5 py-1 rounded-md text-[11px] font-semibold"><i class="fa-solid fa-check text-[9px] mr-1"></i> Completed</span>';
    return '';
}

function kindPill(kind) {
    if (kind === 'borrow') return '<span class="text-[10px] font-semibold uppercase tracking-wide bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700"><i class="fa-solid fa-clock-rotate-left text-[8px] mr-1"></i>Borrow</span>';
    return '<span class="text-[10px] font-semibold uppercase tracking-wide bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700"><i class="fa-solid fa-arrow-right-arrow-left text-[8px] mr-1"></i>Trade</span>';
}

function renderRequests() {
    renderReqFilters();
    const list = document.getElementById('requests-list');
    const active = allRequests.filter(r => r.status !== 'cancelled')
        .filter(r => currentReqFilter === 'all' ? true : r._kind === currentReqFilter);

    if (active.length === 0) {
        list.innerHTML = '<div class="text-center py-16 text-neutral-600 text-sm">No requests yet. Trade or borrow something from the marketplace.</div>';
        return;
    }

    let html = '';
    active.forEach(r => {
        if (r._kind === 'trade') {
            const isProposer = r.proposer_id === CURRENT_USER_ID;
            const otherUser = isProposer ? r.receiver_username : r.proposer_username;
            const myItem = isProposer ? r.offered_item_title : r.wanted_item_title;
            const theirItem = isProposer ? r.wanted_item_title : r.offered_item_title;
            html += requestCard(r, otherUser, kindPill('trade'), statusBadge(r.status), `
                <span class="bg-neutral-950 border border-neutral-800 px-2.5 py-1.5 rounded-lg"><i class="fa-solid fa-arrow-down text-neutral-500 mr-1.5 text-[9px]"></i> Get <span class="text-white font-medium">${escapeHtml(theirItem)}</span></span>
                <span class="bg-neutral-950 border border-neutral-800 px-2.5 py-1.5 rounded-lg"><i class="fa-solid fa-arrow-up text-neutral-500 mr-1.5 text-[9px]"></i> Give <span class="text-white font-medium">${escapeHtml(myItem)}</span></span>
            `);
        } else {
            const amBorrower = r.borrower_id === CURRENT_USER_ID;
            const otherUser = amBorrower ? r.lender_username : r.borrower_username;
            const roleLine = amBorrower
                ? `<span class="bg-neutral-950 border border-neutral-800 px-2.5 py-1.5 rounded-lg"><i class="fa-solid fa-hand-holding text-neutral-500 mr-1.5 text-[9px]"></i> Borrowing <span class="text-white font-medium">${escapeHtml(r.item_title)}</span></span>`
                : `<span class="bg-neutral-950 border border-neutral-800 px-2.5 py-1.5 rounded-lg"><i class="fa-solid fa-hand-holding-heart text-neutral-500 mr-1.5 text-[9px]"></i> Lending <span class="text-white font-medium">${escapeHtml(r.item_title)}</span></span>`;
            let extra = roleLine;
            if (r.status === 'accepted' && r.due_date) {
                const di = dueInfo(r.due_date);
                extra += `<span class="px-2.5 py-1.5 rounded-lg ${di.overdue ? 'bg-neutral-800 text-neutral-100 border border-neutral-600' : 'bg-neutral-950 border border-neutral-800'}"><i class="fa-solid fa-calendar-day text-neutral-500 mr-1.5 text-[9px]"></i> ${di.text}</span>`;
            }
            if (r.extension && r.extension.status === 'pending') {
                extra += `<span class="bg-neutral-800 text-neutral-200 border border-neutral-600 px-2.5 py-1.5 rounded-lg"><i class="fa-solid fa-hourglass-half text-[9px] mr-1.5"></i> +${r.extension.days}d requested</span>`;
            }
            html += requestCard(r, otherUser, kindPill('borrow'), statusBadge(r.status), extra);
        }
    });
    list.innerHTML = html;
}

function requestCard(r, otherUser, pill, badge, detailHtml) {
    return `
        <div class="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-neutral-700 transition-colors">
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2.5 mb-2.5 flex-wrap">
                    <div class="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[11px] font-semibold">${escapeHtml((otherUser || '?').charAt(0).toUpperCase())}</div>
                    <span class="text-white font-medium text-sm">${escapeHtml(otherUser)}</span>
                    ${pill}
                    ${badge}
                </div>
                <div class="text-xs text-neutral-400 flex flex-col sm:flex-row sm:items-center gap-1.5 flex-wrap">${detailHtml}</div>
            </div>
            <div class="flex shrink-0 gap-2 w-full sm:w-auto">
                <button onclick="openChat('${r.id}')" class="flex-1 sm:flex-none bg-neutral-800 hover:bg-neutral-700 text-neutral-100 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <i class="fa-solid fa-comment text-xs"></i> ${r.status === 'completed' ? 'History' : 'Open chat'}
                </button>
            </div>
        </div>
    `;
}

// --- Chat (trades & borrows) ---
let currentChatReq = null;
let chatMessagesCache = [];
let chatPollInterval = null;

function openChat(reqId) {
    const req = allRequests.find(r => r.id === reqId);
    if (!req) return;
    currentChatReq = req;
    document.getElementById('trade-chat-modal').classList.remove('hidden');
    setTimeout(() => { document.getElementById('chat-panel').classList.remove('translate-x-full'); }, 10);
    document.getElementById('chat-trade-id').value = req.id;

    renderChatHeader(req);
    chatMessagesCache = [];
    pollMessages();
    if (chatPollInterval) clearInterval(chatPollInterval);
    chatPollInterval = setInterval(pollMessages, 1000);
}

function renderChatHeader(req) {
    document.getElementById('chat-kind-badge').innerHTML = kindPill(req._kind);
    document.getElementById('chat-form').classList.remove('hidden');
    const actions = document.getElementById('chat-actions');
    const borrowInfo = document.getElementById('chat-borrow-info');
    actions.innerHTML = '';
    borrowInfo.classList.add('hidden');
    borrowInfo.innerHTML = '';

    if (req._kind === 'trade') {
        const isProposer = req.proposer_id === CURRENT_USER_ID;
        const otherUser = isProposer ? req.receiver_username : req.proposer_username;
        document.getElementById('chat-title').textContent = otherUser;
        document.getElementById('chat-trade-details').innerHTML = `Trade with <strong class="text-white">${escapeHtml(otherUser)}</strong>`;

        if (req.status === 'pending') {
            document.getElementById('chat-status-text').textContent = 'Pending';
            if (!isProposer) {
                actions.innerHTML = `
                    <div class="flex gap-2">
                        <button onclick="tradeCancel('${req.id}')" class="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors"><i class="fa-solid fa-xmark mr-1"></i> Decline</button>
                        <button onclick="tradeAccept('${req.id}')" class="bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"><i class="fa-solid fa-check mr-1"></i> Accept</button>
                    </div>`;
            } else {
                actions.innerHTML = `<div class="flex gap-2 items-center"><button onclick="tradeCancel('${req.id}')" class="text-neutral-500 hover:text-neutral-300 text-xs px-2 transition-colors"><i class="fa-solid fa-xmark mr-1"></i> Cancel</button><span class="text-xs text-neutral-400 font-medium">Waiting…</span></div>`;
            }
        } else if (req.status === 'accepted') {
            document.getElementById('chat-status-text').textContent = 'Active — arrange the swap';
            const myCompleted = isProposer ? req.proposer_completed : req.receiver_completed;
            if (!myCompleted) {
                actions.innerHTML = `<button onclick="openRatingModal('trade','${req.id}')" class="bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"><i class="fa-solid fa-check mr-1"></i> Complete</button>`;
            } else {
                actions.innerHTML = `<span class="text-xs text-neutral-300 bg-neutral-800 px-2.5 py-1.5 rounded-lg border border-neutral-700"><i class="fa-solid fa-check-double mr-1"></i> Waiting for ${escapeHtml(otherUser)}</span>`;
            }
        } else {
            document.getElementById('chat-status-text').textContent = 'Completed';
            actions.innerHTML = `<span class="text-xs text-neutral-950 font-semibold bg-white px-3 py-1.5 rounded-full"><i class="fa-solid fa-lock mr-1"></i> Finished</span>`;
            document.getElementById('chat-form').classList.add('hidden');
        }
        return;
    }

    // ---- Borrow ----
    const amBorrower = req.borrower_id === CURRENT_USER_ID;
    const otherUser = amBorrower ? req.lender_username : req.borrower_username;
    document.getElementById('chat-title').textContent = otherUser;
    document.getElementById('chat-trade-details').innerHTML = `${amBorrower ? 'Borrowing from' : 'Lending to'} <strong class="text-white">${escapeHtml(otherUser)}</strong>`;

    // info strip
    let info = `<i class="fa-solid fa-box text-neutral-500 mr-1.5"></i> <span class="text-neutral-200 font-medium">${escapeHtml(req.item_title)}</span> · ${req.days} day period`;
    if (req.status === 'accepted' && req.due_date) {
        const di = dueInfo(req.due_date);
        info += ` · <span class="${di.overdue ? 'text-neutral-100 font-medium' : 'text-neutral-400'}">${di.text}</span>`;
    }
    if (req.extension && req.extension.status === 'approved') {
        info += ` · <span class="text-neutral-400">extension granted</span>`;
    } else if (req.extension && req.extension.status === 'denied') {
        info += ` · <span class="text-neutral-500">extension denied</span>`;
    }
    borrowInfo.innerHTML = info;
    borrowInfo.classList.remove('hidden');

    if (req.status === 'pending') {
        document.getElementById('chat-status-text').textContent = 'Pending approval';
        if (!amBorrower) {
            actions.innerHTML = `
                <div class="flex gap-2">
                    <button onclick="borrowCancel('${req.id}')" class="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors"><i class="fa-solid fa-xmark mr-1"></i> Decline</button>
                    <button onclick="borrowAccept('${req.id}')" class="bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"><i class="fa-solid fa-check mr-1"></i> Lend it</button>
                </div>`;
        } else {
            actions.innerHTML = `<div class="flex gap-2 items-center"><button onclick="borrowCancel('${req.id}')" class="text-neutral-500 hover:text-neutral-300 text-xs px-2 transition-colors"><i class="fa-solid fa-xmark mr-1"></i> Cancel</button><span class="text-xs text-neutral-400 font-medium">Waiting…</span></div>`;
        }
    } else if (req.status === 'accepted') {
        document.getElementById('chat-status-text').textContent = 'On loan';
        const myCompleted = amBorrower ? req.borrower_completed : req.lender_completed;
        let btns = '';

        // Extension handling
        if (req.extension && req.extension.status === 'pending') {
            if (!amBorrower) {
                btns += `
                    <button onclick="respondExtension('${req.id}', false)" class="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors">Deny</button>
                    <button onclick="respondExtension('${req.id}', true)" class="bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">Grant +${req.extension.days}d</button>`;
            } else {
                btns += `<span class="text-xs text-neutral-400 bg-neutral-800 px-2.5 py-1.5 rounded-lg border border-neutral-700"><i class="fa-solid fa-hourglass-half mr-1"></i> +${req.extension.days}d pending</span>`;
            }
        } else if (amBorrower) {
            btns += `<button onclick="openExtensionModal('${req.id}')" class="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium px-3 py-2 rounded-lg transition-colors border border-neutral-700"><i class="fa-solid fa-hourglass-half mr-1"></i> Extend</button>`;
        }

        if (!myCompleted) {
            btns += `<button onclick="openRatingModal('borrow','${req.id}')" class="bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"><i class="fa-solid fa-check mr-1"></i> ${amBorrower ? 'Mark returned' : 'Complete'}</button>`;
        } else {
            btns += `<span class="text-xs text-neutral-300 bg-neutral-800 px-2.5 py-1.5 rounded-lg border border-neutral-700"><i class="fa-solid fa-check-double mr-1"></i> Waiting</span>`;
        }
        actions.innerHTML = `<div class="flex gap-2 items-center flex-wrap justify-end">${btns}</div>`;
    } else {
        document.getElementById('chat-status-text').textContent = 'Completed';
        actions.innerHTML = `<span class="text-xs text-neutral-950 font-semibold bg-white px-3 py-1.5 rounded-full"><i class="fa-solid fa-lock mr-1"></i> Returned</span>`;
        document.getElementById('chat-form').classList.add('hidden');
    }
}

function closeChat() {
    document.getElementById('chat-panel').classList.add('translate-x-full');
    setTimeout(() => { document.getElementById('trade-chat-modal').classList.add('hidden'); }, 300);
    currentChatReq = null;
    document.getElementById('chat-form').classList.remove('hidden');
    if (chatPollInterval) clearInterval(chatPollInterval);
}

async function pollMessages() {
    if (!currentChatReq) return;
    const res = await fetch(`api/messages.php?action=list&trade_id=${currentChatReq.id}`);
    const data = await res.json();
    if (data.success) {
        if (JSON.stringify(data.messages) === JSON.stringify(chatMessagesCache)) return;
        chatMessagesCache = data.messages;
        const container = document.getElementById('chat-messages');
        const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 50;
        let html = '';
        if (data.messages.length === 0) {
            html = '<p class="text-center text-xs text-neutral-600 mt-10"><i class="fa-solid fa-comment-dots text-2xl mb-2 block"></i> Start the conversation.</p>';
        } else {
            data.messages.forEach(m => {
                const isMe = m.sender_id === CURRENT_USER_ID;
                html += `
                    <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
                        <div class="${isMe ? 'bg-white text-neutral-950 rounded-2xl rounded-br-sm' : 'bg-neutral-800 text-neutral-100 rounded-2xl rounded-bl-sm'} px-3.5 py-2.5 max-w-[80%] shadow-sm">
                            ${!isMe ? `<div class="text-[10px] text-neutral-400 font-semibold mb-0.5">${escapeHtml(m.sender_username)}</div>` : ''}
                            <div class="text-sm leading-snug">${escapeHtml(m.text)}</div>
                        </div>
                    </div>`;
            });
        }
        container.innerHTML = html;
        if (isScrolledToBottom) container.scrollTop = container.scrollHeight;
    }
}

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value;
    const tradeId = document.getElementById('chat-trade-id').value;
    input.value = '';
    await fetch('api/messages.php?action=send', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ trade_id: tradeId, text: text })
    });
    pollMessages();
});

// --- Trade actions ---
async function tradeAccept(id) {
    await fetch('api/trades.php?action=accept', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ trade_id: id }) });
    showToast('Trade accepted'); loadRequests();
}
async function tradeCancel(id) {
    await fetch('api/trades.php?action=cancel', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ trade_id: id }) });
    showToast('Trade cancelled', 'error'); closeChat(); loadRequests(); loadMarketplace(); loadMyItems();
}

// --- Borrow actions ---
async function borrowAccept(id) {
    await fetch('api/borrows.php?action=accept', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ borrow_id: id }) });
    showToast('Item lent — return clock started'); loadRequests();
}
async function borrowCancel(id) {
    await fetch('api/borrows.php?action=cancel', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ borrow_id: id }) });
    showToast('Borrow cancelled', 'error'); closeChat(); loadRequests(); loadMarketplace(); loadMyItems();
}

function openExtensionModal(id) {
    document.getElementById('extension-borrow-id').value = id;
    document.getElementById('extension-days').value = 3;
    openModal('extension-modal');
}

document.getElementById('submit-extension-btn').addEventListener('click', async () => {
    const id = document.getElementById('extension-borrow-id').value;
    const days = parseInt(document.getElementById('extension-days').value, 10);
    if (!days || days < 1) { showToast('Enter valid days', 'error'); return; }
    const res = await fetch('api/borrows.php?action=request_extension', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ borrow_id: id, days })
    });
    const data = await res.json();
    if (data.success) { closeModal('extension-modal'); showToast('Extension requested'); loadRequests(); }
    else { showToast(data.error, 'error'); }
});

async function respondExtension(id, approve) {
    const res = await fetch('api/borrows.php?action=respond_extension', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ borrow_id: id, approve })
    });
    const data = await res.json();
    if (data.success) { showToast(approve ? 'Extension granted' : 'Extension denied', approve ? 'success' : 'error'); loadRequests(); }
    else { showToast(data.error, 'error'); }
}

// --- Rating (shared) ---
let currentRatingContext = { kind: 'trade', id: null };

function openRatingModal(kind, id) {
    currentRatingContext = { kind, id };
    document.getElementById('rating-trade-id').value = id;
    document.getElementById('rating-title').textContent = kind === 'borrow' ? 'Rate this borrow' : 'Rate this trade';
    openModal('rating-modal');
}

async function submitRating(rating) {
    const { kind, id } = currentRatingContext;
    closeModal('rating-modal');
    closeChat();
    const endpoint = kind === 'borrow' ? 'api/borrows.php?action=complete' : 'api/trades.php?action=complete';
    const key = kind === 'borrow' ? 'borrow_id' : 'trade_id';
    const payload = { rating }; payload[key] = id;
    await fetch(endpoint, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
    showToast('Submitted & rated');
    loadRequests(); loadProfile(); loadMarketplace(); loadMyItems();
}

// --- Champions ---
async function loadChampion(silent = false) {
    const res = await fetch('api/users.php?action=leaderboard');
    const data = await res.json();
    if (data.success) {
        if (silent && JSON.stringify(allChampions) === JSON.stringify(data.topUsers)) return;
        allChampions = data.topUsers;
        const list = document.getElementById('champion-list');
        if (!data.topUsers || data.topUsers.length === 0) {
            list.innerHTML = `<p class="text-center text-neutral-600 py-10 text-sm">No trading activity in your area yet. Be the first!</p>`;
            return;
        }
        let html = '';
        data.topUsers.forEach((user, index) => {
            const pos = user.positive_reviews || 0;
            const neg = user.negative_reviews || 0;
            let rank = `<span class="text-sm font-bold text-neutral-600 w-7 text-center">${index + 1}</span>`;
            if (index === 0) rank = `<span class="w-7 h-7 rounded-full bg-white text-neutral-950 flex items-center justify-center text-xs font-bold"><i class="fa-solid fa-crown"></i></span>`;
            else if (index === 1) rank = `<span class="w-7 h-7 rounded-full bg-neutral-700 text-white flex items-center justify-center text-xs font-bold">2</span>`;
            else if (index === 2) rank = `<span class="w-7 h-7 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-bold">3</span>`;
            const topStyle = index === 0 ? 'border-neutral-600 bg-neutral-900' : 'border-neutral-800 bg-neutral-900/60';
            html += `
                <div class="flex items-center justify-between p-4 rounded-xl border ${topStyle} hover:border-neutral-700 transition-colors">
                    <div class="flex items-center gap-3.5">
                        ${rank}
                        <div class="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-semibold">${escapeHtml((user.username || '?').charAt(0).toUpperCase())}</div>
                        <div>
                            <div class="font-medium text-white text-sm">${escapeHtml(user.username)}</div>
                            <div class="text-[11px] text-neutral-500">Pincode ${escapeHtml(user.pincode)}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 text-xs">
                        <span class="inline-flex items-center gap-1 text-neutral-200"><i class="fa-solid fa-thumbs-up text-[10px]"></i> ${pos}</span>
                        <span class="inline-flex items-center gap-1 text-neutral-500"><i class="fa-solid fa-thumbs-down text-[10px]"></i> ${neg}</span>
                    </div>
                </div>`;
        });
        list.innerHTML = html;
    }
}

// --- Donations ---
let donationCache = null;

async function loadDonations(silent = false) {
    const res = await fetch('api/donations.php?action=stats');
    const data = await res.json();
    if (!data.success) return;
    if (silent && JSON.stringify(donationCache) === JSON.stringify(data)) return;
    donationCache = data;

    document.getElementById('don-total').textContent = 'Rs. ' + data.total;
    document.getElementById('don-count').textContent = data.count;
    document.getElementById('don-trees').textContent = data.total; // Rs.1 ≈ 1 sapling contribution

    const champ = document.getElementById('don-champion');
    if (data.champion) {
        champ.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-white text-neutral-950 flex items-center justify-center font-bold">${escapeHtml((data.champion.username || '?').charAt(0).toUpperCase())}</div>
                <div>
                    <div class="text-white font-medium">${escapeHtml(data.champion.username)}</div>
                    <div class="text-[11px] text-neutral-500">${data.champion.positive_reviews} positive reviews · gets this month's sapling</div>
                </div>
            </div>`;
    } else {
        champ.textContent = 'No champion yet — start trading to earn reviews!';
    }

    const recent = document.getElementById('don-recent');
    if (data.recent && data.recent.length) {
        recent.innerHTML = data.recent.map(d => `
            <div class="flex items-center justify-between">
                <span class="text-neutral-300"><i class="fa-solid fa-heart text-[10px] text-neutral-500 mr-2"></i>${escapeHtml(d.name)}</span>
                <span class="text-neutral-500">Rs. ${d.amount}</span>
            </div>`).join('');
    } else {
        recent.textContent = 'No donations yet. Be the first to plant a tree!';
    }
}

document.getElementById('donate-btn').addEventListener('click', async () => {
    const btn = document.getElementById('donate-btn');
    const name = document.getElementById('donate-name').value;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Donating...';
    const res = await fetch('api/donations.php?action=donate', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.success) {
        showToast('Thank you! Rs. 1 donated 🌱');
        document.getElementById('donate-name').value = '';
        loadDonations();
    } else { showToast('Donation failed', 'error'); }
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-heart text-xs"></i> Donate Rs. 1';
});

// Kick everything off
init();
