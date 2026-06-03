<?php
session_start();
if (!isset($_SESSION['user'])) {
    header("Location: login.php");
    exit;
}
$user = $_SESSION['user'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoTrade - Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .glass-panel {
            background: rgba(31, 41, 55, 0.7);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(75, 85, 99, 0.4);
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        
        /* Toast animation */
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        .toast-enter { animation: slideInRight 0.3s ease-out forwards; }
        .toast-exit { animation: fadeOut 0.3s ease-out forwards; }
    </style>
</head>
<body class="bg-gray-900 text-white font-sans antialiased h-screen overflow-hidden flex flex-col">
    
    <!-- Toast Container -->
    <div id="toast-container" class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"></div>

    <!-- Navbar -->
    <header class="border-b border-gray-800 bg-gray-900/90 z-20 shrink-0">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center">
                    <i class="fa-solid fa-leaf text-emerald-500 text-2xl mr-2"></i>
                    <span class="font-bold text-xl tracking-tight text-white hidden sm:block">EcoTrade</span>
                </div>
                
                <div class="flex items-center space-x-4">
                    <div class="text-sm">
                        <span class="text-gray-400">Pincode:</span>
                        <span class="text-emerald-400 font-bold bg-emerald-900/30 px-2 py-1 rounded-md"><?php echo htmlspecialchars($user['pincode']); ?></span>
                    </div>
                    <div class="h-6 w-px bg-gray-700"></div>
                    <div class="flex items-center space-x-2">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold shadow-lg">
                            <?php echo strtoupper(substr($user['username'], 0, 1)); ?>
                        </div>
                        <span class="font-medium hidden sm:block"><?php echo htmlspecialchars($user['username']); ?></span>
                        <div class="text-[10px] font-bold ml-2 bg-gray-800 px-2 py-1 rounded border border-gray-700 hidden sm:flex items-center gap-2">
                            <span class="text-emerald-400" id="header-pos">0 <i class="fa-solid fa-thumbs-up"></i></span>
                            <span class="text-red-400" id="header-neg">0 <i class="fa-solid fa-thumbs-down"></i></span>
                        </div>
                    </div>
                    <button id="logout-btn" class="text-gray-400 hover:text-white transition-colors ml-2" title="Logout">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-20 sm:w-64 border-r border-gray-800 bg-gray-900 flex flex-col shrink-0">
            <nav class="flex-1 px-2 py-6 space-y-2">
                <button data-tab="market" class="tab-btn w-full flex items-center px-2 sm:px-4 py-3 text-emerald-400 bg-emerald-900/20 rounded-xl transition-all">
                    <i class="fa-solid fa-shop text-xl sm:text-lg sm:mr-3 mx-auto sm:mx-0"></i>
                    <span class="font-medium hidden sm:block">Marketplace</span>
                </button>
                <button data-tab="my-items" class="tab-btn w-full flex items-center px-2 sm:px-4 py-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-xl transition-all">
                    <i class="fa-solid fa-box-open text-xl sm:text-lg sm:mr-3 mx-auto sm:mx-0"></i>
                    <span class="font-medium hidden sm:block">My Items</span>
                </button>
                <button data-tab="trades" class="tab-btn w-full flex items-center px-2 sm:px-4 py-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-xl transition-all">
                    <i class="fa-solid fa-handshake-angle text-xl sm:text-lg sm:mr-3 mx-auto sm:mx-0"></i>
                    <span class="font-medium hidden sm:block">My Trades</span>
                </button>
                <button data-tab="profile" class="tab-btn w-full flex items-center px-2 sm:px-4 py-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-xl transition-all mt-4 border border-gray-800">
                    <i class="fa-solid fa-user text-xl sm:text-lg sm:mr-3 mx-auto sm:mx-0 text-blue-400"></i>
                    <span class="font-medium hidden sm:block">My Profile</span>
                </button>
                <button data-tab="champion" class="tab-btn w-full flex items-center px-2 sm:px-4 py-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-xl transition-all border border-gray-800 relative overflow-hidden group">
                    <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <i class="fa-solid fa-trophy text-xl sm:text-lg sm:mr-3 mx-auto sm:mx-0 text-yellow-500"></i>
                    <span class="font-medium hidden sm:block">Eco Champions</span>
                </button>
            </nav>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto bg-gray-950 p-4 sm:p-8 relative">
            
            <!-- Marketplace Tab -->
            <div id="tab-market" class="tab-content block">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Local Market</h2>
                    <div class="relative">
                        <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="search-tags" placeholder="Search tags..." class="pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-full text-sm focus:outline-none focus:border-emerald-500 text-white w-48 sm:w-64 transition-all">
                    </div>
                </div>
                <div id="market-grid" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                    <div class="col-span-full text-center py-10 text-gray-500"><i class="fa-solid fa-spinner fa-spin text-3xl"></i></div>
                </div>
            </div>

            <!-- My Items Tab -->
            <div id="tab-my-items" class="tab-content hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">My Items</h2>
                    <button onclick="openItemModal()" class="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all">
                        <i class="fa-solid fa-plus mr-1"></i> Add Item
                    </button>
                </div>
                <div id="my-items-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20"></div>
            </div>

            <!-- Trades Tab -->
            <div id="tab-trades" class="tab-content hidden">
                <h2 class="text-2xl font-bold mb-6">Active Trades</h2>
                <div class="space-y-4" id="trades-list"></div>
            </div>

            <!-- Profile Tab -->
            <div id="tab-profile" class="tab-content hidden">
                <h2 class="text-2xl font-bold mb-6">My Profile</h2>
                <div class="glass-panel p-8 rounded-2xl max-w-2xl mx-auto text-center relative overflow-hidden">
                    <div class="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                    <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"></div>
                    
                    <div class="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-full mx-auto flex items-center justify-center text-4xl font-bold shadow-lg mb-4 relative z-10">
                        <?php echo strtoupper(substr($user['username'], 0, 1)); ?>
                    </div>
                    <h3 class="text-3xl font-extrabold text-white relative z-10 mb-6"><?php echo htmlspecialchars($user['username']); ?></h3>
                    
                    <div class="grid grid-cols-3 gap-4 relative z-10">
                        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
                            <div class="text-gray-400 text-sm mb-1">Trades Done</div>
                            <div class="text-2xl font-bold text-emerald-400" id="prof-trades"><i class="fa-solid fa-spinner fa-spin text-sm"></i></div>
                        </div>
                        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
                            <div class="text-gray-400 text-sm mb-1">Positive Feedback</div>
                            <div class="text-2xl font-bold text-emerald-400" id="prof-pos"><i class="fa-solid fa-spinner fa-spin text-sm"></i></div>
                        </div>
                        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
                            <div class="text-gray-400 text-sm mb-1">Negative Feedback</div>
                            <div class="text-2xl font-bold text-red-400" id="prof-neg"><i class="fa-solid fa-spinner fa-spin text-sm"></i></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Eco Champion Tab -->
            <div id="tab-champion" class="tab-content hidden">
                <div class="max-w-3xl mx-auto text-center py-6">
                    <div class="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full mx-auto flex items-center justify-center mb-4 shadow-[0_0_50px_rgba(234,179,8,0.2)] border-4 border-gray-900">
                        <i class="fa-solid fa-crown text-4xl text-white"></i>
                    </div>
                    <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2">Eco Champions Leaderboard</h2>
                    <p class="text-gray-400 mb-8">Top 10 traders in pincode <?php echo htmlspecialchars($user['pincode']); ?>. The #1 user wins a monthly gift!</p>
                    
                    <div class="glass-panel p-6 rounded-2xl">
                        <div id="champion-list" class="space-y-3 text-left">
                            <div class="animate-pulse"><div class="h-10 bg-gray-800 rounded w-full"></div></div>
                        </div>
                    </div>
                </div>
            </div>

        </main>
    </div>

    <!-- Add/Edit Item Modal -->
    <div id="add-item-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
        <div class="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
            <div class="p-6 border-b border-gray-700 flex justify-between items-center">
                <h3 class="text-xl font-bold" id="item-modal-title">List an Item</h3>
                <button onclick="closeModal('add-item-modal')" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="p-6 max-h-[80vh] overflow-y-auto hide-scrollbar">
                <form id="add-item-form" class="space-y-4">
                    <input type="hidden" id="edit-item-id">
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Item Title</label>
                        <input type="text" id="item-title" required class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Description</label>
                        <textarea id="item-desc" rows="3" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Tags (comma separated)</label>
                        <input type="text" id="item-tags" placeholder="e.g. books, vintage" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-emerald-400 mb-1"><i class="fa-solid fa-bullseye"></i> Looking For (Tags)</label>
                        <input type="text" id="item-looking-for" placeholder="e.g. guitar, tools, plant" class="w-full bg-gray-900 border border-emerald-900 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none">
                        <p class="text-[10px] text-gray-500 mt-1">Specify what you'd like to trade this for. Others can still offer anything.</p>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Image <span id="img-edit-hint" class="text-xs hidden">(Leave blank to keep current)</span></label>
                        <input type="file" id="item-image" accept="image/*" class="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-900/30 file:text-emerald-400 hover:file:bg-emerald-900/50">
                    </div>
                    <div class="flex gap-2 mt-4">
                        <button type="button" id="delete-item-btn" class="hidden w-1/3 bg-red-900/50 hover:bg-red-600 text-red-400 hover:text-white py-3 rounded-lg font-bold transition-colors border border-red-900/50">
                            Delete
                        </button>
                        <button type="submit" class="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold flex justify-center items-center">
                            <span id="add-item-btn-text">Post Item</span>
                            <i id="add-item-spinner" class="fa-solid fa-spinner fa-spin hidden ml-2"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Trade Propose Modal -->
    <div id="propose-trade-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
        <div class="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
            <div class="p-6 border-b border-gray-700 flex justify-between items-center shrink-0">
                <h3 class="text-xl font-bold">Propose a Trade</h3>
                <button onclick="closeModal('propose-trade-modal')" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="p-6 overflow-y-auto hide-scrollbar">
                <p class="text-sm text-gray-400 mb-1">You want: <span id="wanted-item-title" class="text-white font-bold"></span></p>
                <p class="text-[11px] text-emerald-400 mb-4" id="wanted-looking-for"></p>
                <p class="text-sm text-gray-400 mb-2">Select an item to offer in return:</p>
                <div id="offer-items-list" class="space-y-2"></div>
                <input type="hidden" id="wanted-item-id">
            </div>
            <div class="p-6 border-t border-gray-700 shrink-0">
                <button id="submit-trade-btn" disabled class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-bold">
                    Send Request
                </button>
            </div>
        </div>
    </div>

    <!-- Rating Modal -->
    <div id="rating-modal" class="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] hidden flex items-center justify-center p-4">
        <div class="bg-gray-800 rounded-2xl w-full max-w-sm border border-emerald-900/50 shadow-2xl text-center p-8">
            <h3 class="text-2xl font-bold mb-2">Trade Completed!</h3>
            <p class="text-sm text-gray-400 mb-6">Please rate your experience with this user. This is required.</p>
            <input type="hidden" id="rating-trade-id">
            
            <div class="grid grid-cols-3 gap-3 mb-6">
                <button onclick="submitRating(1)" class="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:bg-emerald-900/40 hover:border-emerald-500 transition-all flex flex-col items-center gap-2 group">
                    <i class="fa-solid fa-thumbs-up text-2xl text-gray-500 group-hover:text-emerald-400 transition-colors"></i>
                    <span class="text-xs font-bold text-gray-400 group-hover:text-emerald-400">Positive</span>
                </button>
                <button onclick="submitRating(0)" class="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:bg-gray-700 transition-all flex flex-col items-center gap-2 group">
                    <i class="fa-solid fa-minus text-2xl text-gray-500 group-hover:text-white transition-colors"></i>
                    <span class="text-xs font-bold text-gray-400 group-hover:text-white">Neutral</span>
                </button>
                <button onclick="submitRating(-1)" class="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:bg-red-900/40 hover:border-red-500 transition-all flex flex-col items-center gap-2 group">
                    <i class="fa-solid fa-thumbs-down text-2xl text-gray-500 group-hover:text-red-400 transition-colors"></i>
                    <span class="text-xs font-bold text-gray-400 group-hover:text-red-400">Negative</span>
                </button>
            </div>
            <p class="text-[10px] text-gray-500">Leaving a rating will finalize the trade for both parties.</p>
        </div>
    </div>

    <!-- Trade Details & Chat Modal -->
    <div id="trade-chat-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[40] hidden flex justify-end">
        <div class="bg-gray-900 border-l border-gray-800 w-full sm:w-[450px] h-full flex flex-col shadow-2xl transform translate-x-full transition-transform duration-300" id="chat-panel">
            <div class="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800 shrink-0">
                <div>
                    <h3 class="text-lg font-bold">Trade Chat</h3>
                    <p class="text-xs text-gray-400" id="chat-status-text">Status</p>
                </div>
                <button onclick="closeChat()" class="text-gray-400 hover:text-white bg-gray-700 p-2 rounded-lg"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <div class="p-4 bg-gray-800/50 border-b border-gray-800 shrink-0 flex justify-between items-center">
                <div class="text-sm text-gray-300" id="chat-trade-details"></div>
                <div id="chat-actions"></div>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-4" id="chat-messages"></div>

            <div class="p-4 border-t border-gray-800 bg-gray-900 shrink-0">
                <form id="chat-form" class="flex gap-2">
                    <input type="hidden" id="chat-trade-id">
                    <input type="text" id="chat-input" required placeholder="Type a message..." class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none" autocomplete="off">
                    <button type="submit" class="bg-emerald-600 hover:bg-emerald-500 px-4 rounded-lg text-white"><i class="fa-solid fa-paper-plane"></i></button>
                </form>
            </div>
        </div>
    </div>

    <script>const CURRENT_USER_ID = "<?php echo $user['id']; ?>";</script>
    <script src="assets/app.js"></script>
</body>
</html>
