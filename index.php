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
    <title>EcoTrade - Local Item Trading</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .hero-pattern {
            background-color: #111827;
            background-image: radial-gradient(#10B981 1px, transparent 1px);
            background-size: 20px 20px;
        }
    </style>
</head>
<body class="bg-gray-900 text-white font-sans antialiased">
    <!-- Navbar -->
    <nav class="border-b border-gray-800 bg-gray-900/80 backdrop-blur-md fixed w-full z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center">
                    <i class="fa-solid fa-leaf text-emerald-500 text-2xl mr-2"></i>
                    <span class="font-bold text-xl tracking-tight text-white">EcoTrade</span>
                </div>
                <div>
                    <a href="login.php" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Sign In</a>
                    <a href="login.php?signup=1" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors ml-2 shadow-lg shadow-emerald-500/30">Get Started</a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <div class="relative pt-32 pb-20 sm:pt-40 sm:pb-24 hero-pattern min-h-screen flex items-center">
        <div class="absolute inset-0 bg-gray-900/80"></div>
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6">
                Trade Local. <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Save Global.</span>
            </h1>
            <p class="mt-4 max-w-2xl text-xl text-gray-300 mx-auto mb-10">
                Turn your unused items into something you actually need. Connect with neighbors in your pincode, trade securely, and earn rewards for protecting the environment.
            </p>
            <div class="flex justify-center gap-4">
                <a href="login.php?signup=1" class="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-full text-lg font-bold transition-all transform hover:scale-105 shadow-xl shadow-emerald-500/30">
                    Start Trading
                </a>
                <a href="#features" class="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-full text-lg font-bold transition-all border border-gray-700 hover:border-gray-600">
                    Learn More
                </a>
            </div>
        </div>
    </div>

    <!-- Features Section -->
    <div id="features" class="py-24 bg-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-3xl font-extrabold text-white">Why use EcoTrade?</h2>
                <p class="mt-4 text-gray-400 text-lg">A simple way to reduce waste and get what you want.</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
                <!-- Feature 1 -->
                <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-emerald-500 transition-colors">
                    <div class="w-14 h-14 bg-emerald-900/50 rounded-xl flex items-center justify-center mb-6">
                        <i class="fa-solid fa-map-location-dot text-emerald-400 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-3">Hyper-Local Matching</h3>
                    <p class="text-gray-400">Sign up with your pincode. We only show you items from people in your immediate neighborhood so physical trades are easy.</p>
                </div>
                <!-- Feature 2 -->
                <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-emerald-500 transition-colors">
                    <div class="w-14 h-14 bg-emerald-900/50 rounded-xl flex items-center justify-center mb-6">
                        <i class="fa-solid fa-handshake text-emerald-400 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-3">Secure Trading & Chat</h3>
                    <p class="text-gray-400">Propose trades, chat securely with your neighbors, and agree on a meeting spot to exchange items. Build your reputation.</p>
                </div>
                <!-- Feature 3 -->
                <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-emerald-500 transition-colors">
                    <div class="w-14 h-14 bg-emerald-900/50 rounded-xl flex items-center justify-center mb-6">
                        <i class="fa-solid fa-seedling text-emerald-400 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-3">Monthly Eco-Rewards</h3>
                    <p class="text-gray-400">The user with the most positive reviews in their pincode wins a free environmental gift at the end of the month!</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
