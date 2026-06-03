// --- UI Helpers ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bg = type === 'success' ? 'bg-emerald-600' : 'bg-red-600';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation';
    
    toast.className = `toast-enter flex items-center p-4 mb-2 text-white ${bg} rounded-lg shadow-xl border border-white/10`;
    toast.innerHTML = `<i class="fa-solid ${icon} mr-3"></i> <span class="font-medium">${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.replace('toast-enter', 'toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// --- Global State & Polling ---
let allItems = [];
let myItems = [];
let allTrades = [];
let currentTab = 'market';
let globalPollInterval = null;

let allChampions = [];

function startPolling() {
    if (globalPollInterval) clearInterval(globalPollInterval);
    globalPollInterval = setInterval(() => {
        loadProfile(true);
        loadMarketplace(true);
        loadMyItems(true);
        loadTrades(true);
        loadChampion(true);
    }, 1000); 
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => {
            if(b.getAttribute('data-tab') === 'profile') b.classList.remove('bg-gray-800', 'text-white');
            else b.classList.remove('text-emerald-400', 'bg-emerald-900/20');
            b.classList.add('text-gray-400');
        });
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        
        currentTab = btn.getAttribute('data-tab');
        if(currentTab === 'profile') {
            btn.classList.remove('text-gray-400');
            btn.classList.add('bg-gray-800', 'text-white');
        } else {
            btn.classList.remove('text-gray-400');
            btn.classList.add('text-emerald-400', 'bg-emerald-900/20');
        }
        document.getElementById('tab-' + currentTab).classList.remove('hidden');

        if (currentTab === 'market') loadMarketplace();
        if (currentTab === 'my-items') loadMyItems();
        if (currentTab === 'trades') loadTrades();
        if (currentTab === 'champion') loadChampion();
        if (currentTab === 'profile') loadProfile();
    });
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('api/auth.php?action=logout', { method: 'POST' });
    window.location.href = 'login.php';
});

async function init() {
    await loadProfile(); 
    loadMarketplace();
    startPolling();
}

async function loadProfile(silent = false) {
    const res = await fetch('api/users.php?action=profile');
    const data = await res.json();
    if (data.success) {
        document.getElementById('header-pos').innerHTML = `${data.profile.positive_reviews} <i class="fa-solid fa-thumbs-up"></i>`;
        document.getElementById('header-neg').innerHTML = `${data.profile.negative_reviews} <i class="fa-solid fa-thumbs-down"></i>`;
        
        if (document.getElementById('prof-pos')) {
            document.getElementById('prof-trades').textContent = data.profile.completed_trades;
            document.getElementById('prof-pos').textContent = data.profile.positive_reviews;
            document.getElementById('prof-neg').textContent = data.profile.negative_reviews;
        }
    }
}

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
    
    // items must not be my own, and must not be locked
    const items = allItems.filter(i => i.owner_id !== CURRENT_USER_ID && !i.is_locked); 
    let html = '';
    let count = 0;
    
    items.forEach(item => {
        if (query && !item.tags.some(t => t.toLowerCase().includes(query)) && !item.title.toLowerCase().includes(query)) return;
        count++;
        
        let lookingForHtml = '';
        if (item.looking_for_tags && item.looking_for_tags.length > 0) {
            lookingForHtml = `<div class="mb-2 text-xs text-gray-400">
                <span class="text-emerald-400 font-bold"><i class="fa-solid fa-bullseye"></i> Looking for:</span> 
                ${item.looking_for_tags.join(', ')}
            </div>`;
        }

        html += `
            <div class="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg hover:border-emerald-500 transition-colors flex flex-col">
                <div class="h-48 bg-gray-900 relative">
                    ${item.image ? `<img src="${item.image}" class="w-full h-full object-cover">` : `<div class="flex items-center justify-center h-full text-gray-600"><i class="fa-solid fa-image text-4xl"></i></div>`}
                    <div class="absolute top-2 right-2 bg-gray-900/90 backdrop-blur text-xs px-2 py-1 rounded border border-gray-700 shadow flex items-center gap-2">
                        <span class="text-gray-300 font-medium">${item.owner_username}</span>
                        <div class="flex gap-1">
                            <span class="text-emerald-400">${item.owner_pos} <i class="fa-solid fa-thumbs-up"></i></span>
                            <span class="text-gray-500">|</span>
                            <span class="text-red-400">${item.owner_neg} <i class="fa-solid fa-thumbs-down"></i></span>
                        </div>
                    </div>
                </div>
                <div class="p-4 flex-1 flex flex-col">
                    <h3 class="font-bold text-lg text-white mb-1">${item.title}</h3>
                    <p class="text-sm text-gray-400 mb-3 line-clamp-2 flex-1">${item.description}</p>
                    ${lookingForHtml}
                    <div class="flex flex-wrap gap-1 mb-4">
                        ${item.tags.map(t => `<span class="bg-gray-700 text-[10px] px-2 py-1 rounded text-gray-300 border border-gray-600">${t}</span>`).join('')}
                    </div>
                    <button onclick="proposeTrade('${item.id}', '${item.title.replace(/'/g, "\\'")}', '${(item.looking_for_tags || []).join(', ').replace(/'/g, "\\'")}')" class="w-full bg-emerald-900/30 text-emerald-400 hover:bg-emerald-600 hover:text-white py-2 rounded-lg font-semibold transition-colors border border-emerald-900/50">
                        Request Trade
                    </button>
                </div>
            </div>
        `;
    });

    if (count === 0) {
        html = '<div class="col-span-full text-center py-10 text-gray-500">No available items found matching your criteria.</div>';
    }
    grid.innerHTML = html;
}

async function loadMyItems(silent = false) {
    const res = await fetch('api/items.php?action=list');
    const data = await res.json();
    if (data.success) {
        if (silent && JSON.stringify(allItems) === JSON.stringify(data.items)) return;
        allItems = data.items;
        myItems = data.items.filter(i => i.owner_id === CURRENT_USER_ID);
        const grid = document.getElementById('my-items-grid');
        
        let html = '';
        if (myItems.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">You haven\'t listed any items yet.</div>';
            return;
        }

        myItems.forEach(item => {
            html += `
                <div class="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg opacity-90 group relative">
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 items-center justify-center z-10 backdrop-blur-sm">
                        <button onclick='openEditItemModal(${JSON.stringify(item).replace(/'/g, "\\'")})' class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
                            <i class="fa-solid fa-pen mr-1"></i> Edit Item
                        </button>
                        ${item.is_locked ? `<span class="bg-yellow-900/80 text-yellow-400 text-xs px-2 py-1 rounded border border-yellow-500/50"><i class="fa-solid fa-lock"></i> In Active Trade</span>` : ''}
                    </div>
                    <div class="h-40 bg-gray-900 relative">
                        ${item.image ? `<img src="${item.image}" class="w-full h-full object-cover">` : `<div class="flex items-center justify-center h-full text-gray-600"><i class="fa-solid fa-image text-3xl"></i></div>`}
                        ${item.is_locked ? `<div class="absolute top-2 left-2 bg-yellow-900 text-yellow-400 text-xs px-2 py-1 rounded-full"><i class="fa-solid fa-lock"></i> Locked</div>` : ''}
                    </div>
                    <div class="p-4">
                        <h3 class="font-bold text-white mb-1">${item.title}</h3>
                        ${item.looking_for_tags?.length ? `<p class="text-[10px] text-emerald-400 mb-2">Looking for: ${item.looking_for_tags.join(', ')}</p>` : ''}
                        <div class="flex flex-wrap gap-1">
                            ${item.tags.map(t => `<span class="bg-gray-700 text-[10px] px-2 py-1 rounded text-gray-400">${t}</span>`).join('')}
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

function openEditItemModal(item) {
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
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ item_id: editId }) 
    });
    const data = await res.json();
    if(data.success) {
        closeModal('add-item-modal');
        showToast("Item deleted");
        loadMyItems();
    } else {
        showToast(data.error, 'error');
    }
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
    if(editId) formData.append('item_id', editId);
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
            showToast(editId ? 'Item updated successfully!' : 'Item posted successfully!');
            loadMyItems();
            loadMarketplace();
        } else {
            showToast(data.error, 'error');
        }
    } catch(err) {
        showToast("Error saving item", 'error');
    } finally {
        btnText.textContent = originalText;
        spinner.classList.add('hidden');
    }
});

function proposeTrade(wantedId, wantedTitle, wantedLookingFor) {
    document.getElementById('wanted-item-id').value = wantedId;
    document.getElementById('wanted-item-title').textContent = wantedTitle;
    document.getElementById('wanted-looking-for').innerHTML = wantedLookingFor ? `<i class="fa-solid fa-bullseye"></i> They are looking for: <span class="font-bold text-white">${wantedLookingFor}</span>` : 'They are open to offers';
    
    const list = document.getElementById('offer-items-list');
    list.innerHTML = '';
    
    const availableItems = myItems.filter(i => !i.is_locked);

    if (availableItems.length === 0) {
        list.innerHTML = '<p class="text-sm text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-900">You have no unlocked items to offer. List a new item first!</p>';
        document.getElementById('submit-trade-btn').disabled = true;
    } else {
        availableItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'flex items-center p-3 border border-gray-700 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors offer-item-select group';
            div.innerHTML = `
                <input type="radio" name="offer_item" value="${item.id}" class="mr-3 accent-emerald-500 w-4 h-4">
                <span class="text-white font-medium group-hover:text-emerald-400 transition-colors">${item.title}</span>
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

    document.getElementById('submit-trade-btn').disabled = true;
    document.getElementById('submit-trade-btn').textContent = "Sending...";

    const res = await fetch('api/trades.php?action=propose', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ offered_item_id: offerId, wanted_item_id: wantedId })
    });
    const data = await res.json();
    if(data.success) {
        closeModal('propose-trade-modal');
        showToast("Trade request sent! Check My Trades.");
        loadTrades();
        loadMarketplace(); // will update locks
        loadMyItems();
    } else {
        showToast(data.error, 'error');
    }
    document.getElementById('submit-trade-btn').textContent = "Send Request";
});

async function loadTrades(silent = false) {
    const res = await fetch('api/trades.php?action=list');
    const data = await res.json();
    if(data.success) {
        data.trades.sort((a,b) => b.created_at - a.created_at);
        if(silent && JSON.stringify(allTrades) === JSON.stringify(data.trades)) return;
        allTrades = data.trades;
        
        const list = document.getElementById('trades-list');
        const activeTrades = allTrades.filter(t => t.status !== 'cancelled');
        
        if (activeTrades.length === 0) {
            list.innerHTML = '<div class="text-center py-10 text-gray-500">No active trades.</div>';
            return;
        }

        let html = '';
        activeTrades.forEach(trade => {
            const isProposer = trade.proposer_id === CURRENT_USER_ID;
            const otherUser = isProposer ? trade.receiver_username : trade.proposer_username;
            const myItem = isProposer ? trade.offered_item_title : trade.wanted_item_title;
            const theirItem = isProposer ? trade.wanted_item_title : trade.offered_item_title;
            
            let statusBadge = '';
            let borderCol = 'border-gray-700 hover:border-gray-500';
            if (trade.status === 'pending') {
                statusBadge = '<span class="bg-yellow-900/50 text-yellow-400 px-2 py-1 rounded text-xs border border-yellow-900/50"><i class="fa-solid fa-clock mr-1"></i> Pending</span>';
                borderCol = 'border-yellow-900/50 hover:border-yellow-500/50';
            }
            if (trade.status === 'accepted') {
                statusBadge = '<span class="bg-blue-900/50 text-blue-400 px-2 py-1 rounded text-xs border border-blue-900/50"><i class="fa-solid fa-handshake mr-1"></i> Meeting Setup</span>';
                borderCol = 'border-blue-900/50 hover:border-blue-500/50';
            }
            if (trade.status === 'completed') {
                statusBadge = '<span class="bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded text-xs border border-emerald-900/50"><i class="fa-solid fa-check-double mr-1"></i> Completed</span>';
                borderCol = 'border-emerald-900/50';
            }

            html += `
                <div class="bg-gray-800 border ${borderCol} rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-white font-bold"><i class="fa-solid fa-user-circle text-gray-400"></i> ${otherUser}</span>
                            ${statusBadge}
                        </div>
                        <div class="text-sm text-gray-400 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span class="bg-gray-900 px-2 py-1 rounded"><i class="fa-solid fa-arrow-down text-emerald-500 mr-1"></i> Get: <strong class="text-white">${theirItem}</strong></span>
                            <span class="bg-gray-900 px-2 py-1 rounded"><i class="fa-solid fa-arrow-up text-red-400 mr-1"></i> Give: <strong class="text-white">${myItem}</strong></span>
                        </div>
                    </div>
                    <div class="flex shrink-0 gap-2 w-full sm:w-auto">
                        <button onclick='openChat(${JSON.stringify(trade).replace(/'/g, "\\'")})' class="flex-1 sm:flex-none bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg text-sm font-bold transition-all shadow-lg flex items-center justify-center">
                            <i class="fa-solid fa-comments text-emerald-400 mr-2"></i> ${trade.status === 'completed' ? 'View History' : 'Open Chat'}
                        </button>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
        
        if (currentChatTrade) {
            const updatedTrade = allTrades.find(t => t.id === currentChatTrade.id);
            if (updatedTrade && updatedTrade.status !== currentChatTrade.status) {
                currentChatTrade = updatedTrade;
                renderChatHeader(updatedTrade);
            }
        }
    }
}

let currentChatTrade = null;
let chatMessagesCache = [];
let chatPollInterval = null;

function openChat(trade) {
    currentChatTrade = trade;
    document.getElementById('trade-chat-modal').classList.remove('hidden');
    setTimeout(() => { document.getElementById('chat-panel').classList.remove('translate-x-full'); }, 10);
    document.getElementById('chat-trade-id').value = trade.id;
    
    renderChatHeader(trade);
    
    chatMessagesCache = []; 
    pollMessages();
    if(chatPollInterval) clearInterval(chatPollInterval);
    chatPollInterval = setInterval(pollMessages, 1000); // 1s polling for real-time chat
}

function renderChatHeader(trade) {
    const isProposer = trade.proposer_id === CURRENT_USER_ID;
    const otherUser = isProposer ? trade.receiver_username : trade.proposer_username;
    document.getElementById('chat-trade-details').innerHTML = `Trading with <strong>${otherUser}</strong>`;
    
    const actions = document.getElementById('chat-actions');
    actions.innerHTML = '';
    
    if (trade.status === 'pending') {
        document.getElementById('chat-status-text').textContent = 'Pending';
        if (!isProposer) {
            actions.innerHTML = `
                <div class="flex gap-2">
                    <button onclick="cancelTrade('${trade.id}')" class="bg-gray-700 hover:bg-red-600 text-xs font-bold px-3 py-2 rounded-lg shadow"><i class="fa-solid fa-xmark"></i> Decline</button>
                    <button onclick="acceptTrade('${trade.id}')" class="bg-blue-600 hover:bg-blue-500 text-xs font-bold px-4 py-2 rounded-lg shadow-lg"><i class="fa-solid fa-check"></i> Accept</button>
                </div>
            `;
        } else {
            actions.innerHTML = `
                <div class="flex gap-2 items-center">
                    <button onclick="cancelTrade('${trade.id}')" class="text-red-400 hover:text-red-300 text-xs px-2"><i class="fa-solid fa-xmark"></i> Cancel</button>
                    <span class="text-xs text-yellow-400 font-medium">Waiting...</span>
                </div>
            `;
        }
    } else if (trade.status === 'accepted') {
        document.getElementById('chat-status-text').textContent = 'Meeting Setup';
        const myCompleted = isProposer ? trade.proposer_completed : trade.receiver_completed;
        const theirCompleted = isProposer ? trade.receiver_completed : trade.proposer_completed;
        
        if (!myCompleted) {
            actions.innerHTML = `<button onclick="openRatingModal('${trade.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold px-4 py-2 rounded-lg shadow-lg"><i class="fa-solid fa-check"></i> Complete Trade</button>`;
        } else {
            actions.innerHTML = `<span class="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded border border-emerald-900"><i class="fa-solid fa-check-double"></i> Waiting for ${otherUser}</span>`;
        }
    } else {
        document.getElementById('chat-status-text').textContent = 'Completed';
        actions.innerHTML = `<span class="text-xs text-emerald-400 font-bold bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-500/50"><i class="fa-solid fa-lock"></i> Trade Finished</span>`;
        document.getElementById('chat-form').classList.add('hidden'); 
    }
}

function closeChat() {
    document.getElementById('chat-panel').classList.add('translate-x-full');
    setTimeout(() => { document.getElementById('trade-chat-modal').classList.add('hidden'); }, 300);
    currentChatTrade = null;
    document.getElementById('chat-form').classList.remove('hidden'); 
    if(chatPollInterval) clearInterval(chatPollInterval);
}

async function pollMessages() {
    if (!currentChatTrade) return;
    const res = await fetch(`api/messages.php?action=list&trade_id=${currentChatTrade.id}`);
    const data = await res.json();
    if(data.success) {
        if (JSON.stringify(data.messages) === JSON.stringify(chatMessagesCache)) return;
        chatMessagesCache = data.messages;
        
        const container = document.getElementById('chat-messages');
        const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 50;
        
        let html = '';
        if (data.messages.length === 0) {
            html = '<p class="text-center text-xs text-gray-500 mt-10"><i class="fa-solid fa-comment-dots text-2xl mb-2 block"></i> Start discussing details!</p>';
        } else {
            data.messages.forEach(m => {
                const isMe = m.sender_id === CURRENT_USER_ID;
                html += `
                    <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
                        <div class="${isMe ? 'bg-emerald-700 text-white rounded-l-2xl rounded-tr-2xl' : 'bg-gray-700 text-gray-100 rounded-r-2xl rounded-tl-2xl'} px-4 py-2.5 max-w-[80%] shadow-md">
                            ${!isMe ? `<div class="text-[10px] text-emerald-300 font-bold mb-1">${m.sender_username}</div>` : ''}
                            <div class="text-sm">${m.text}</div>
                        </div>
                    </div>
                `;
            });
        }
        container.innerHTML = html;
        if(isScrolledToBottom) container.scrollTop = container.scrollHeight;
    }
}

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value;
    const tradeId = document.getElementById('chat-trade-id').value;
    input.value = '';
    
    await fetch('api/messages.php?action=send', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ trade_id: tradeId, text: text })
    });
    pollMessages();
});

async function acceptTrade(tradeId) {
    await fetch('api/trades.php?action=accept', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ trade_id: tradeId })
    });
    showToast('Trade Accepted!');
    loadTrades();
}

async function cancelTrade(tradeId) {
    await fetch('api/trades.php?action=cancel', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ trade_id: tradeId })
    });
    showToast('Trade Cancelled', 'error');
    closeChat();
    loadTrades();
}

function openRatingModal(tradeId) {
    document.getElementById('rating-trade-id').value = tradeId;
    openModal('rating-modal');
}

async function submitRating(rating) {
    const tradeId = document.getElementById('rating-trade-id').value;
    closeModal('rating-modal');
    closeChat();
    
    await fetch('api/trades.php?action=complete', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ trade_id: tradeId, rating: rating })
    });
    
    showToast("Trade Completed & Rating Submitted!");
    loadTrades();
    loadProfile(); 
}

async function loadChampion(silent = false) {
    const res = await fetch('api/users.php?action=leaderboard');
    const data = await res.json();
    if (data.success) {
        if(silent && JSON.stringify(allChampions) === JSON.stringify(data.topUsers)) return;
        allChampions = data.topUsers;
        
        const list = document.getElementById('champion-list');
        
        if (!data.topUsers || data.topUsers.length === 0) {
            list.innerHTML = `<p class="text-center text-gray-400 py-4">No trading activity in your area yet. Be the first!</p>`;
            return;
        }

        let html = '';
        data.topUsers.forEach((user, index) => {
            let rankIcon = `<span class="text-xl font-bold text-gray-500 w-8 text-center">#${index + 1}</span>`;
            if (index === 0) rankIcon = `<i class="fa-solid fa-medal text-2xl text-yellow-400 w-8 text-center"></i>`;
            else if (index === 1) rankIcon = `<i class="fa-solid fa-medal text-2xl text-gray-300 w-8 text-center"></i>`;
            else if (index === 2) rankIcon = `<i class="fa-solid fa-medal text-2xl text-amber-600 w-8 text-center"></i>`;

            const pos = user.positive_reviews || 0;
            const neg = user.negative_reviews || 0;

            html += `
                <div class="flex items-center justify-between p-4 bg-gray-800 rounded-xl border border-gray-700 ${index === 0 ? 'bg-gradient-to-r from-gray-800 to-emerald-900/30 border-emerald-500/50' : ''}">
                    <div class="flex items-center gap-4">
                        ${rankIcon}
                        <div>
                            <div class="font-bold text-white text-lg">${user.username}</div>
                            <div class="text-xs text-gray-400">Pincode: ${user.pincode}</div>
                        </div>
                    </div>
                    <div class="text-right flex items-center gap-3">
                        <div class="text-emerald-400 font-bold">${pos} <i class="fa-solid fa-thumbs-up"></i></div>
                        <div class="text-red-400 font-bold">${neg} <i class="fa-solid fa-thumbs-down"></i></div>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    }
}
