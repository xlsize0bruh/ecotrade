<?php
session_start();
if (isset($_SESSION['user'])) {
    header("Location: dashboard.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoTrade - Login / Register</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-900 text-white font-sans antialiased min-h-screen flex items-center justify-center">
    
    <div class="w-full max-w-md p-8 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 relative overflow-hidden">
        <!-- Decoration -->
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl"></div>

        <div class="relative z-10">
            <div class="text-center mb-8">
                <a href="index.php" class="inline-flex items-center text-emerald-400 hover:text-emerald-300 mb-4 transition-colors">
                    <i class="fa-solid fa-arrow-left mr-2"></i> Back to Home
                </a>
                <h2 class="text-3xl font-extrabold text-white" id="form-title">Welcome Back</h2>
                <p class="text-gray-400 mt-2" id="form-subtitle">Sign in to continue to EcoTrade.</p>
            </div>

            <form id="auth-form" class="space-y-6">
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-300">Username</label>
                    <input type="text" id="username" required class="mt-1 block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-emerald-500 focus:border-emerald-500 transition-colors">
                </div>

                <div id="pincode-group" class="hidden">
                    <label for="pincode" class="block text-sm font-medium text-gray-300">Pincode (ZIP)</label>
                    <input type="text" id="pincode" class="mt-1 block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-emerald-500 focus:border-emerald-500 transition-colors" placeholder="e.g. 10001">
                    <p class="text-xs text-gray-500 mt-1">This ensures you only see local trades.</p>
                </div>

                <div>
                    <label for="password" class="block text-sm font-medium text-gray-300">Password</label>
                    <input type="password" id="password" required class="mt-1 block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-emerald-500 focus:border-emerald-500 transition-colors">
                </div>

                <div id="error-msg" class="text-red-400 text-sm hidden bg-red-900/30 p-3 rounded-lg border border-red-900/50"></div>

                <button type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-gray-900 transition-all shadow-emerald-500/20">
                    <span id="btn-text">Sign In</span>
                </button>
            </form>

            <div class="mt-6 text-center text-sm">
                <span class="text-gray-400" id="toggle-text">Don't have an account?</span>
                <button type="button" id="toggle-btn" class="font-medium text-emerald-400 hover:text-emerald-300 transition-colors ml-1">Sign up</button>
            </div>
        </div>
    </div>

    <script>
        const urlParams = new URLSearchParams(window.location.search);
        let isSignup = urlParams.get('signup') === '1';

        const formTitle = document.getElementById('form-title');
        const formSubtitle = document.getElementById('form-subtitle');
        const pincodeGroup = document.getElementById('pincode-group');
        const btnText = document.getElementById('btn-text');
        const toggleText = document.getElementById('toggle-text');
        const toggleBtn = document.getElementById('toggle-btn');
        const pincodeInput = document.getElementById('pincode');
        const errorMsg = document.getElementById('error-msg');
        const authForm = document.getElementById('auth-form');

        function updateUI() {
            if (isSignup) {
                formTitle.textContent = 'Create Account';
                formSubtitle.textContent = 'Join EcoTrade and start trading locally.';
                pincodeGroup.classList.remove('hidden');
                pincodeInput.required = true;
                btnText.textContent = 'Sign Up';
                toggleText.textContent = 'Already have an account?';
                toggleBtn.textContent = 'Sign in';
            } else {
                formTitle.textContent = 'Welcome Back';
                formSubtitle.textContent = 'Sign in to continue to EcoTrade.';
                pincodeGroup.classList.add('hidden');
                pincodeInput.required = false;
                btnText.textContent = 'Sign In';
                toggleText.textContent = "Don't have an account?";
                toggleBtn.textContent = 'Sign up';
            }
            errorMsg.classList.add('hidden');
        }

        toggleBtn.addEventListener('click', () => {
            isSignup = !isSignup;
            updateUI();
        });

        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMsg.classList.add('hidden');
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const pincode = document.getElementById('pincode').value;

            const action = isSignup ? 'register' : 'login';
            const payload = { username, password };
            if (isSignup) payload.pincode = pincode;

            try {
                const res = await fetch(`api/auth.php?action=${action}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                
                if (data.success) {
                    window.location.href = 'dashboard.php';
                } else {
                    errorMsg.textContent = data.error || 'Authentication failed.';
                    errorMsg.classList.remove('hidden');
                }
            } catch (err) {
                errorMsg.textContent = 'Network error. Please try again.';
                errorMsg.classList.remove('hidden');
            }
        });

        updateUI();
    </script>
</body>
</html>
