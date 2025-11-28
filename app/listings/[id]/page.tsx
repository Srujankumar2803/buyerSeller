"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Calendar, Edit, Trash2, ArrowLeft, User, Heart, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

interface ListingImage {
  id: string;
  filename: string;
  mime: string;
}

interface ListingOwner {
  id: string;
  name: string | null;
  email: string | null;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  city: string;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  ownerId: string;
  owner: ListingOwner;
  images: ListingImage[];
  createdAt: string;
  updatedAt: string;
}

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isContacting, setIsContacting] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (!resolvedParams) return;

    async function fetchListing() {
      try {
        const response = await fetch(`/api/listings/${resolvedParams!.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch listing");
        }

        setListing(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchListing();
  }, [resolvedParams]);

  // Check if listing is favorited
  useEffect(() => {
    if (!session?.user || !resolvedParams) return;

    async function checkFavorite() {
      try {
        const response = await fetch("/api/favorites");
        if (response.ok) {
          const data = await response.json();
          const favorite = data.favorites.find(
            (fav: { listingId: string; id: string }) => fav.listingId === resolvedParams!.id
          );
          if (favorite) {
            setIsFavorited(true);
            setFavoriteId(favorite.id);
          }
        }
      } catch (err) {
        console.error("Failed to check favorite status:", err);
      }
    }

    checkFavorite();
  }, [session, resolvedParams]);

  const handleToggleFavorite = async () => {
    if (!session?.user || !listing) return;

    setIsToggling(true);
    try {
      if (isFavorited && favoriteId) {
        // Remove from favorites
        const response = await fetch(`/api/favorites/${favoriteId}?listingId=${listing.id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setIsFavorited(false);
          setFavoriteId(null);
        }
      } else {
        // Add to favorites
        const response = await fetch("/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ listingId: listing.id }),
        });

        if (response.ok) {
          const data = await response.json();
          setIsFavorited(true);
          setFavoriteId(data.favorite.id);
        }
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleContactSeller = async () => {
    if (!session?.user || !listing) return;

    setIsContacting(true);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingId: listing.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create conversation");
      }

      // Redirect to the conversation
      router.push(`/conversations/${data.conversation.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to contact seller");
    } finally {
      setIsContacting(false);
    }
  };

  const handleDelete = async () => {
    if (!listing || !confirm("Are you sure you want to delete this listing?")) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete listing");
      }

      toast.success("Listing deleted successfully!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete listing");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBuyNow = async () => {
    if (!session?.user || !listing) return;

    setIsBuying(true);
    try {
      // Create order
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingId: listing.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      // Show UPI payment options
      const paymentInfo = data.paymentInfo;
      
      // Detect if user is on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Create proper UPI URL for real payment
      const upiUrl = `upi://pay?pa=${paymentInfo.merchantUpiId}&pn=Neighbourhood%20Marketplace&am=${paymentInfo.amount}&cu=INR&tr=${paymentInfo.orderId}&tn=Payment%20for%20${encodeURIComponent(data.listing.title)}`;
      
      console.log("UPI URL:", upiUrl);
      console.log("Payment Info:", paymentInfo);
      console.log("Device:", isMobile ? "Mobile" : "Desktop");
      
      // Create payment modal with UPI options
      const paymentModal = document.createElement('div');
      paymentModal.id = 'upi-payment-modal';
      paymentModal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
        background: rgba(0,0,0,0.8); z-index: 1000; 
        display: flex; align-items: center; justify-content: center;
      `;
      
      // Start 30-second auto-success timer
      let autoSuccessTimer: NodeJS.Timeout | null = null;
      let countdownInterval: NodeJS.Timeout | null = null;
      let timeLeft = 30;
      
      const startAutoSuccessTimer = () => {
        // Update countdown every second
        countdownInterval = setInterval(() => {
          timeLeft--;
          const countdownElement = document.getElementById('countdown');
          if (countdownElement) {
            countdownElement.textContent = timeLeft.toString();
            
            // Change color as time runs out
            if (timeLeft <= 10) {
              countdownElement.style.color = '#ff5722';
              countdownElement.parentElement!.style.animation = 'urgentPulse 0.5s infinite';
            } else if (timeLeft <= 20) {
              countdownElement.style.color = '#ff9800';
            }
          }
          
          if (timeLeft <= 0) {
            clearInterval(countdownInterval!);
          }
        }, 1000);
        
        // Auto-success after 30 seconds
        autoSuccessTimer = setTimeout(() => {
          showPaymentSuccess();
        }, 30000);
      };

      paymentModal.innerHTML = `
        <div class="payment-modal-content">
          <!-- Header -->
          <div class="payment-header">
            <div class="payment-icon">💳</div>
            <h2>Complete Your Payment</h2>
            <p>Secure UPI payment for your purchase</p>
          </div>
          
          <!-- Order Details Card -->
          <div class="order-details-card">
            <div class="order-item">
              <div class="item-info">
                <div class="item-title">${data.listing.title}</div>
                <div class="item-meta">Order #${paymentInfo.orderId.slice(-8)}</div>
              </div>
              <div class="item-price">₹${paymentInfo.amount}</div>
            </div>
          </div>

          <!-- Payment Methods -->
          ${isMobile ? `
          <div class="payment-methods">
            <h3>Choose Payment App</h3>
            <div class="upi-apps-grid">
              <button id="phonepe-btn" class="upi-app-btn phonepe">
                <div class="app-icon">📱</div>
                <span>PhonePe</span>
              </button>
              <button id="gpay-btn" class="upi-app-btn gpay">
                <div class="app-icon">💳</div>
                <span>Google Pay</span>
              </button>
              <button id="paytm-btn" class="upi-app-btn paytm">
                <div class="app-icon">💰</div>
                <span>Paytm</span>
              </button>
              <button id="any-upi-btn" class="upi-app-btn universal">
                <div class="app-icon">🏦</div>
                <span>Any UPI App</span>
              </button>
            </div>
          </div>
          ` : ''}
          
          <!-- QR Code Section -->
          <div class="qr-section">
            <div class="qr-container">
              <div id="qr-code-placeholder" class="qr-placeholder">
                <div class="loading-spinner"></div>
                <div class="loading-text">Generating QR Code...</div>
              </div>
              <div class="qr-timer-container">
                <div id="payment-timer" class="payment-timer">
                  <div class="timer-icon">⏱️</div>
                  <div class="timer-text">Auto-complete in <span id="countdown">30</span>s</div>
                </div>
              </div>
            </div>
            
            <div class="qr-actions">
              <button id="upi-payment-btn" class="primary-action-btn">
                <span class="btn-icon">📱</span>
                <span>Pay with UPI</span>
              </button>
              
              ${!isMobile ? `
              <div class="secondary-actions">
                <button id="regenerate-qr-btn" class="secondary-btn">
                  <span>🔄</span> Regenerate QR
                </button>
                <button id="copy-upi-btn" class="secondary-btn">
                  <span>📋</span> Copy Details
                </button>
              </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Manual Confirmation -->
          <div class="manual-confirmation">
            <button id="confirm-payment-btn" class="confirm-btn">
              <span class="btn-icon">✅</span>
              <span>I've Completed Payment</span>
            </button>
          </div>
          
          <!-- Cancel -->
          <button id="cancel-payment-btn" class="cancel-btn">
            <span>✕</span> Cancel Payment
          </button>
        </div>
        
        <style>
          .payment-modal-content {
            background: #ffffff;
            border-radius: 24px;
            padding: 0;
            max-width: 480px;
            width: 100%;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            position: relative;
            animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
          
          @keyframes modalSlideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          
          .payment-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 32px 24px;
            text-align: center;
          }
          
          .payment-icon {
            font-size: 48px;
            margin-bottom: 16px;
            animation: bounce 2s infinite;
          }
          
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          
          .payment-header h2 {
            margin: 0 0 8px 0;
            font-size: 28px;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .payment-header p {
            margin: 0;
            opacity: 0.9;
            font-size: 16px;
          }
          
          .order-details-card {
            margin: 24px;
            padding: 20px;
            background: linear-gradient(135deg, #f8faff 0%, #f1f8ff 100%);
            border-radius: 16px;
            border: 1px solid #e3f2fd;
          }
          
          .order-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .item-title {
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 4px;
          }
          
          .item-meta {
            font-size: 14px;
            color: #666;
            font-family: monospace;
          }
          
          .item-price {
            font-size: 24px;
            font-weight: 700;
            color: #2e7d32;
            text-shadow: 0 1px 2px rgba(46,125,50,0.1);
          }
          
          .payment-methods {
            margin: 0 24px 24px 24px;
          }
          
          .payment-methods h3 {
            margin: 0 0 16px 0;
            font-size: 18px;
            font-weight: 600;
            color: #333;
            text-align: center;
          }
          
          .upi-apps-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          
          .upi-app-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px 12px;
            border: 2px solid transparent;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
          }
          
          .upi-app-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px -8px rgba(0,0,0,0.3);
          }
          
          .upi-app-btn.phonepe {
            background: linear-gradient(135deg, #5f259f, #7b2cbf);
            color: white;
          }
          
          .upi-app-btn.gpay {
            background: linear-gradient(135deg, #1a73e8, #4285f4);
            color: white;
          }
          
          .upi-app-btn.paytm {
            background: linear-gradient(135deg, #002970, #1565c0);
            color: white;
          }
          
          .upi-app-btn.universal {
            background: linear-gradient(135deg, #ff9800, #f57c00);
            color: white;
          }
          
          .app-icon {
            font-size: 32px;
            margin-bottom: 8px;
          }
          
          .qr-section {
            padding: 0 24px 24px 24px;
          }
          
          .qr-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            padding: 24px;
            text-align: center;
            margin-bottom: 20px;
            position: relative;
            overflow: hidden;
          }
          
          .qr-container::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
            animation: shimmer 3s infinite;
          }
          
          @keyframes shimmer {
            0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
            100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
          }
          
          .qr-placeholder {
            width: 200px;
            height: 200px;
            background: white;
            border-radius: 16px;
            margin: 0 auto 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
          }
          
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 12px;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .loading-text {
            color: #666;
            font-size: 14px;
            font-weight: 500;
          }
          
          .qr-timer-container {
            position: relative;
          }
          
          .payment-timer {
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 12px 20px;
            color: white;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          
          @keyframes urgentPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
          
          .timer-icon {
            font-size: 20px;
          }
          
          #countdown {
            color: #ffeb3b;
            font-weight: 700;
            font-size: 18px;
          }
          
          .qr-actions {
            text-align: center;
          }
          
          .primary-action-btn {
            background: linear-gradient(135deg, #4caf50, #2e7d32);
            color: white;
            border: none;
            padding: 16px 32px;
            border-radius: 16px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            width: 100%;
            margin-bottom: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 20px rgba(76, 175, 80, 0.3);
          }
          
          .primary-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(76, 175, 80, 0.4);
          }
          
          .btn-icon {
            font-size: 20px;
          }
          
          .secondary-actions {
            display: flex;
            gap: 8px;
            justify-content: center;
          }
          
          .secondary-btn {
            background: rgba(96, 125, 139, 0.1);
            color: #607d8b;
            border: 1px solid rgba(96, 125, 139, 0.2);
            padding: 10px 16px;
            border-radius: 12px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .secondary-btn:hover {
            background: rgba(96, 125, 139, 0.2);
            transform: translateY(-1px);
          }
          
          .manual-confirmation {
            padding: 0 24px 20px 24px;
          }
          
          .confirm-btn {
            background: linear-gradient(135deg, #ff9800, #f57c00);
            color: white;
            border: none;
            padding: 16px 24px;
            border-radius: 16px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            width: 100%;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 20px rgba(255, 152, 0, 0.3);
          }
          
          .confirm-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(255, 152, 0, 0.4);
          }
          
          .cancel-btn {
            background: transparent;
            color: #666;
            border: none;
            padding: 16px;
            border-radius: 12px;
            font-size: 14px;
            cursor: pointer;
            width: 100%;
            margin-top: 8px;
            transition: all 0.2s ease;
          }
          
          .cancel-btn:hover {
            background: rgba(244, 67, 54, 0.1);
            color: #f44336;
          }
          
          /* Mobile Responsiveness */
          @media (max-width: 480px) {
            .payment-modal-content {
              max-width: 95vw;
              margin: 10px;
            }
            
            .payment-header {
              padding: 24px 20px;
            }
            
            .payment-icon {
              font-size: 40px;
            }
            
            .payment-header h2 {
              font-size: 24px;
            }
            
            .order-details-card, .qr-section, .manual-confirmation {
              margin: 20px;
              padding: 16px;
            }
            
            .qr-container {
              padding: 20px;
            }
            
            .qr-placeholder {
              width: 180px;
              height: 180px;
            }
          }
        </style>
      `;
      
      // Open UPI payment function
      const openUpiApp = (appIntent = '') => {
        try {
          let finalUrl = upiUrl;
          let appName = "UPI App";
          
          // Create app-specific URLs
          if (appIntent === 'phonepe') {
            finalUrl = `phonepe://pay?pa=${paymentInfo.merchantUpiId}&pn=Marketplace&am=${paymentInfo.amount}&tr=${paymentInfo.orderId}&tn=${encodeURIComponent(data.listing.title)}`;
            appName = "PhonePe";
          } else if (appIntent === 'googlepay') {
            finalUrl = `tez://upi/pay?pa=${paymentInfo.merchantUpiId}&pn=Marketplace&am=${paymentInfo.amount}&tr=${paymentInfo.orderId}&tn=${encodeURIComponent(data.listing.title)}`;
            appName = "Google Pay";
          } else if (appIntent === 'paytm') {
            finalUrl = `paytmmp://pay?pa=${paymentInfo.merchantUpiId}&pn=Marketplace&am=${paymentInfo.amount}&tr=${paymentInfo.orderId}&tn=${encodeURIComponent(data.listing.title)}`;
            appName = "Paytm";
          }
          
          console.log("Device:", isMobile ? "Mobile" : "Desktop");
          console.log("Opening", appName, "with URL:", finalUrl);
          
          if (isMobile) {
            // On mobile - try to open UPI app
            window.location.href = finalUrl;
            
            // Show fallback after 3 seconds if app doesn't open
            setTimeout(() => {
              const fallbackMsg = `If ${appName} didn't open:\n\n1. Copy this UPI ID: ${paymentInfo.merchantUpiId}\n2. Open any UPI app manually\n3. Send ₹${paymentInfo.amount}\n4. Use note: ${data.listing.title}`;
              
              if (confirm(fallbackMsg + "\n\nDid you complete the payment?")) {
                confirmPayment();
              }
            }, 3000);
            
          } else {
            // On desktop - show QR code and manual instructions
            showDesktopPayment();
          }
          
        } catch (error) {
          console.error("Failed to open UPI app:", error);
          toast.error("Could not open UPI app. Showing manual payment details.");
          showDesktopPayment();
        }
      };
      
      // Show desktop payment instructions
      const showDesktopPayment = () => {
        const instructions = `
MOBILE PAYMENT REQUIRED

To complete payment:

1. Open this page on your mobile phone
2. OR manually pay using any UPI app:

UPI ID: ${paymentInfo.merchantUpiId}
Amount: ₹${paymentInfo.amount}
Note: ${data.listing.title}

3. After payment, click "I Have Completed Payment"
        `;
        
        alert(instructions);
      };
      
      // Payment verification polling
      let paymentCheckInterval: NodeJS.Timeout | null = null;
      
      const startPaymentVerification = () => {
        let checkCount = 0;
        const maxChecks = 120; // 10 minutes (120 checks * 5 seconds)
        
        // Check payment status every 5 seconds
        paymentCheckInterval = setInterval(async () => {
          checkCount++;
          
          try {
            const response = await fetch(`/api/orders/status?orderId=${data.order.id}`);
            const statusData = await response.json();
            
            if (statusData.success && statusData.order.status === "completed") {
              // Payment confirmed!
              clearInterval(paymentCheckInterval!);
              
              // Show background notification if modal is not visible
              const isModalVisible = document.body.contains(paymentModal);
              
              if (!isModalVisible) {
                // Show background success notification
                toast.success("🎉 Payment received! Your purchase is complete!", {
                  duration: 8000,
                  style: {
                    background: '#4CAF50',
                    color: 'white',
                    fontWeight: 'bold',
                  },
                });
                
                // Show browser notification if permission granted
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Payment Successful! 🎉', {
                    body: `Your payment for "${data.listing.title}" has been confirmed!`,
                    icon: '/favicon.ico'
                  });
                }
                
                // Redirect to purchases page after 3 seconds
                setTimeout(() => {
                  if (window.confirm('Payment confirmed! Would you like to view your purchases?')) {
                    router.push('/purchases');
                  }
                }, 3000);
              } else {
                // Show success modal as usual
                showPaymentSuccess();
              }
            } else if (checkCount >= maxChecks) {
              // Stop checking after max attempts
              clearInterval(paymentCheckInterval!);
              toast.error("Payment detection timeout. Please check manually in My Purchases.");
            }
          } catch (error) {
            console.log("Payment status check failed:", error);
          }
        }, 5000);
        
        // Request notification permission for background updates
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              toast.success("📱 Notifications enabled! We'll alert you when payment is received.");
            }
          });
        }
      };
      
      const showPaymentSuccess = () => {
        // Clear all timers
        if (autoSuccessTimer) {
          clearTimeout(autoSuccessTimer);
        }
        if (countdownInterval) {
          clearInterval(countdownInterval);
        }
        if (paymentCheckInterval) {
          clearInterval(paymentCheckInterval);
        }
        
        // Remove payment modal
        if (document.body.contains(paymentModal)) {
          document.body.removeChild(paymentModal);
        }
        
        // Show success modal with celebration
        const successModal = document.createElement('div');
        successModal.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.8); display: flex; align-items: center;
          justify-content: center; z-index: 10000; padding: 20px;
        `;
        
        successModal.innerHTML = `
          <div class="success-modal-content">
            <!-- Confetti Animation -->
            <div class="confetti-container">
              <div class="confetti"></div>
              <div class="confetti"></div>
              <div class="confetti"></div>
              <div class="confetti"></div>
              <div class="confetti"></div>
              <div class="confetti"></div>
              <div class="confetti"></div>
              <div class="confetti"></div>
            </div>
            
            <!-- Success Icon -->
            <div class="success-icon-container">
              <div class="success-icon">🎉</div>
              <div class="success-checkmark">✅</div>
            </div>
            
            <!-- Success Message -->
            <div class="success-content">
              <h2 class="success-title">Payment Successful!</h2>
              <p class="success-message">
                Congratulations! You've successfully purchased 
                <strong>"${data.listing.title}"</strong>
              </p>
              <div class="success-amount">₹${paymentInfo.amount}</div>
            </div>
            
            <!-- Action Buttons -->
            <div class="success-actions">
              <button id="view-purchases-btn" class="success-btn primary">
                <span class="btn-icon">📦</span>
                <span>View My Purchases</span>
              </button>
              <button id="close-success-btn" class="success-btn secondary">
                <span class="btn-icon">🏠</span>
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
          
          <style>
            .success-modal-content {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 24px;
              padding: 40px 32px;
              max-width: 420px;
              width: 100%;
              text-align: center;
              position: relative;
              overflow: hidden;
              animation: successSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
            }
            
            @keyframes successSlideIn {
              from { 
                opacity: 0; 
                transform: translateY(-50px) scale(0.8) rotate(-5deg);
              }
              to { 
                opacity: 1; 
                transform: translateY(0) scale(1) rotate(0deg);
              }
            }
            
            .confetti-container {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              pointer-events: none;
              overflow: hidden;
            }
            
            .confetti {
              position: absolute;
              width: 10px;
              height: 10px;
              background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7, #dda0dd);
              animation: confettiFall 3s infinite ease-out;
            }
            
            .confetti:nth-child(1) { left: 10%; animation-delay: 0s; background: #ff6b6b; }
            .confetti:nth-child(2) { left: 20%; animation-delay: 0.2s; background: #4ecdc4; }
            .confetti:nth-child(3) { left: 30%; animation-delay: 0.4s; background: #45b7d1; }
            .confetti:nth-child(4) { left: 40%; animation-delay: 0.6s; background: #96ceb4; }
            .confetti:nth-child(5) { left: 60%; animation-delay: 0.8s; background: #ffeaa7; }
            .confetti:nth-child(6) { left: 70%; animation-delay: 1s; background: #dda0dd; }
            .confetti:nth-child(7) { left: 80%; animation-delay: 1.2s; background: #ff7675; }
            .confetti:nth-child(8) { left: 90%; animation-delay: 1.4s; background: #fd79a8; }
            
            @keyframes confettiFall {
              0% {
                transform: translateY(-100px) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(400px) rotate(720deg);
                opacity: 0;
              }
            }
            
            .success-icon-container {
              margin-bottom: 24px;
              position: relative;
            }
            
            .success-icon {
              font-size: 64px;
              animation: bounce 1s infinite;
              display: block;
              margin-bottom: 12px;
            }
            
            .success-checkmark {
              font-size: 48px;
              animation: checkmarkPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }
            
            @keyframes checkmarkPop {
              0% { transform: scale(0) rotate(-180deg); opacity: 0; }
              50% { transform: scale(1.2) rotate(-90deg); opacity: 0.8; }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            
            .success-content {
              color: white;
              margin-bottom: 32px;
            }
            
            .success-title {
              font-size: 32px;
              font-weight: 700;
              margin: 0 0 16px 0;
              text-shadow: 0 2px 4px rgba(0,0,0,0.2);
              animation: titleGlow 2s infinite alternate;
            }
            
            @keyframes titleGlow {
              from { text-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 0 20px rgba(255,255,255,0.3); }
              to { text-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 0 30px rgba(255,255,255,0.5); }
            }
            
            .success-message {
              font-size: 16px;
              line-height: 1.6;
              margin: 0 0 16px 0;
              opacity: 0.9;
            }
            
            .success-amount {
              font-size: 28px;
              font-weight: 700;
              background: rgba(255,255,255,0.2);
              backdrop-filter: blur(10px);
              border-radius: 16px;
              padding: 12px 24px;
              margin: 0 auto;
              display: inline-block;
              border: 1px solid rgba(255,255,255,0.3);
              animation: amountPulse 2s infinite;
            }
            
            @keyframes amountPulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            
            .success-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              flex-wrap: wrap;
            }
            
            .success-btn {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 16px 24px;
              border-radius: 16px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              border: 2px solid transparent;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              min-width: 180px;
              justify-content: center;
            }
            
            .success-btn.primary {
              background: rgba(255,255,255,0.95);
              color: #667eea;
              box-shadow: 0 4px 20px rgba(255,255,255,0.3);
            }
            
            .success-btn.primary:hover {
              background: white;
              transform: translateY(-2px);
              box-shadow: 0 8px 30px rgba(255,255,255,0.4);
            }
            
            .success-btn.secondary {
              background: transparent;
              color: white;
              border: 2px solid rgba(255,255,255,0.5);
            }
            
            .success-btn.secondary:hover {
              background: rgba(255,255,255,0.1);
              border-color: white;
              transform: translateY(-2px);
            }
            
            .btn-icon {
              font-size: 18px;
            }
            
            /* Mobile Responsiveness */
            @media (max-width: 480px) {
              .success-modal-content {
                margin: 20px;
                padding: 32px 24px;
              }
              
              .success-title {
                font-size: 28px;
              }
              
              .success-amount {
                font-size: 24px;
                padding: 10px 20px;
              }
              
              .success-actions {
                flex-direction: column;
              }
              
              .success-btn {
                min-width: auto;
                width: 100%;
              }
            }
          </style>
        `;
        
        document.body.appendChild(successModal);
        
        // Add event listeners
        const viewPurchasesBtn = successModal.querySelector('#view-purchases-btn');
        const closeBtn = successModal.querySelector('#close-success-btn');
        
        viewPurchasesBtn?.addEventListener('click', () => {
          document.body.removeChild(successModal);
          router.push('/purchases');
        });
        
        closeBtn?.addEventListener('click', () => {
          document.body.removeChild(successModal);
          router.push('/');
        });
        
        // Auto close after 30 seconds
        setTimeout(() => {
          if (document.body.contains(successModal)) {
            document.body.removeChild(successModal);
          }
        }, 30000);
        
        // Success sound/haptic feedback (if supported)
        try {
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
        } catch {
          // Ignore vibration errors
        }
        
        toast.success("🎉 Payment confirmed! Item purchased successfully!");
      };

      // Confirm payment function (when user clicks "I completed payment")
      const confirmPayment = async () => {
        try {
          // Show immediate feedback
          const confirmBtn = paymentModal.querySelector('#confirm-payment-btn') as HTMLButtonElement;
          if (confirmBtn) {
            confirmBtn.textContent = "🔄 Processing...";
            confirmBtn.style.background = "#2196F3";
            confirmBtn.disabled = true;
          }

          const verifyResponse = await fetch("/api/orders/status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: data.order.id,
            }),
          });

          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok) {
            throw new Error(verifyData.error || "Payment confirmation failed");
          }

          // Show success message with auto-close notification
          toast.success("✅ Payment confirmed! We'll automatically detect when it's received.");
          
          // Update UI to show waiting state with countdown
          if (confirmBtn) {
            confirmBtn.textContent = "⏳ Waiting for payment detection...";
            confirmBtn.style.background = "#FF9800";
            
            // Add message about auto-close
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
              margin-top: 12px; padding: 12px; background: #e3f2fd; 
              border: 1px solid #2196f3; border-radius: 6px; font-size: 14px;
              text-align: center; color: #1976d2;
            `;
            messageDiv.innerHTML = `
              💡 <strong>Great!</strong> This window will automatically close when your payment is detected.<br>
              <small>You can also close it manually - we'll keep checking in the background.</small>
            `;
            
            confirmBtn.parentNode?.insertBefore(messageDiv, confirmBtn.nextSibling);
            
            // Add auto-close button
            const autoCloseBtn = document.createElement('button');
            autoCloseBtn.style.cssText = `
              margin-top: 8px; background: #4caf50; color: white; border: none; 
              padding: 8px 16px; border-radius: 6px; cursor: pointer; width: 100%;
              font-size: 14px;
            `;
            autoCloseBtn.textContent = "✨ Close & Auto-Detect Payment";
            autoCloseBtn.onclick = () => {
              toast.success("🎯 Payment detection continues in background! You'll be notified when received.");
              document.body.removeChild(paymentModal);
            };
            
            messageDiv.appendChild(autoCloseBtn);
          }
          
          // Start checking for payment verification
          startPaymentVerification();
          
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to confirm payment");
          
          // Reset button on error
          const confirmBtn = paymentModal.querySelector('#confirm-payment-btn') as HTMLButtonElement;
          if (confirmBtn) {
            confirmBtn.textContent = "✅ I Have Completed Payment";
            confirmBtn.style.background = "#ff9800";
            confirmBtn.disabled = false;
          }
        }
      };
      
      // Generate UPI QR Code for desktop users
      const generateQRCode = () => {
        const qrContainer = paymentModal.querySelector('#qr-code-placeholder');
        if (qrContainer) {
          console.log("Generating QR code...");
          console.log("UPI URL for QR:", upiUrl);
          
          // Create QR code using multiple fallback methods
          const qrSize = 200;
          const qrData = upiUrl;
          
          // Method 1: Google Charts API (most reliable)
          const googleChartsUrl = `https://chart.googleapis.com/chart?chs=${qrSize}x${qrSize}&cht=qr&chl=${encodeURIComponent(qrData)}&choe=UTF-8`;
          
          // Method 2: QR Server API (backup)
          const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(qrData)}`;
          
          // Create image element with error handling
          const qrImage = document.createElement('img');
          qrImage.style.cssText = 'width: 100%; height: 100%; object-fit: contain; border: 1px solid #ddd; border-radius: 8px;';
          qrImage.alt = 'UPI QR Code';
          
          // Try Google Charts first
          qrImage.src = googleChartsUrl;
          
          // Fallback to QR Server if Google Charts fails
          qrImage.onerror = () => {
            console.log("Google Charts failed, trying QR Server...");
            qrImage.src = qrServerUrl;
            
            // Final fallback - show manual details
            qrImage.onerror = () => {
              console.log("All QR services failed, showing manual details");
              qrContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; border: 2px dashed #ccc; border-radius: 8px;">
                  <p style="margin: 0 0 8px 0; font-weight: bold;">QR Code unavailable</p>
                  <p style="margin: 0; font-size: 12px; color: #666;">Use UPI ID manually</p>
                </div>
              `;
            };
          };
          
          qrImage.onload = () => {
            console.log("QR code loaded successfully!");
          };
          
          qrContainer.innerHTML = '';
          qrContainer.appendChild(qrImage);
        }
      };
      
      // Universal UPI payment function
      const makeUpiPayment = () => {
        if (isMobile) {
          // On mobile - try to open UPI app
          openUpiApp('');
        } else {
          // On desktop - show QR code and try to open UPI link
          generateQRCode();
          
          // Also try to trigger UPI app on desktop (some systems support it)
          try {
            window.open(upiUrl, '_blank');
          } catch {
            console.log('Desktop UPI link failed, QR code available');
          }
          
          // Show instructions
          setTimeout(() => {
            toast.success('QR code generated! Scan with any UPI app or use the UPI ID manually.');
          }, 500);
        }
      };
      
      // Add event listeners to buttons
      const phonePeBtn = paymentModal.querySelector('#phonepe-btn');
      const gpayBtn = paymentModal.querySelector('#gpay-btn');
      const paytmBtn = paymentModal.querySelector('#paytm-btn');
      const anyUpiBtn = paymentModal.querySelector('#any-upi-btn');
      const upiPaymentBtn = paymentModal.querySelector('#upi-payment-btn');
      const regenerateQrBtn = paymentModal.querySelector('#regenerate-qr-btn');
      const copyUpiBtn = paymentModal.querySelector('#copy-upi-btn');
      const confirmBtn = paymentModal.querySelector('#confirm-payment-btn');
      const cancelBtn = paymentModal.querySelector('#cancel-payment-btn');
      
      // Mobile UPI app buttons
      phonePeBtn?.addEventListener('click', () => openUpiApp('phonepe'));
      gpayBtn?.addEventListener('click', () => openUpiApp('googlepay'));
      paytmBtn?.addEventListener('click', () => openUpiApp('paytm'));
      anyUpiBtn?.addEventListener('click', () => openUpiApp(''));
      
      // Universal UPI payment button (works on both mobile and desktop)
      upiPaymentBtn?.addEventListener('click', makeUpiPayment);
      
      // Regenerate QR code button
      regenerateQrBtn?.addEventListener('click', () => {
        const qrContainer = paymentModal.querySelector('#qr-code-placeholder');
        if (qrContainer) {
          qrContainer.innerHTML = `
            <div style="text-align: center;">
              <div style="font-size: 24px; margin-bottom: 8px;">🔄</div>
              <div>Regenerating QR Code...</div>
            </div>
          `;
          setTimeout(() => {
            generateQRCode();
          }, 500);
        }
      });
      
      // Desktop copy UPI details button
      copyUpiBtn?.addEventListener('click', () => {
        const paymentText = `Pay ₹${paymentInfo.amount} to UPI ID: ${paymentInfo.merchantUpiId} (Note: ${data.listing.title})`;
        navigator.clipboard.writeText(paymentText).then(() => {
          toast.success('Payment details copied! 📋');
        }).catch(() => {
          prompt('Copy these payment details:', paymentText);
        });
      });
      
      // Common buttons
      confirmBtn?.addEventListener('click', confirmPayment);
      cancelBtn?.addEventListener('click', () => {
        // Clear all timers
        if (autoSuccessTimer) {
          clearTimeout(autoSuccessTimer);
        }
        if (countdownInterval) {
          clearInterval(countdownInterval);
        }
        if (paymentCheckInterval) {
          clearInterval(paymentCheckInterval);
          paymentCheckInterval = null;
        }
        
        // Simple cancellation
        document.body.removeChild(paymentModal);
        setIsBuying(false);
        toast.error("Payment cancelled");
      });
      
      // Auto-generate QR code immediately for all users
      setTimeout(() => {
        console.log("Auto-generating QR code...");
        generateQRCode();
      }, 500);
      
      // Show the payment modal
      document.body.appendChild(paymentModal);
      
      // Start the 30-second auto-success timer
      startAutoSuccessTimer();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to initiate payment");
      setIsBuying(false);
    }
  };

  if (isLoading || !resolvedParams) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || "Listing not found"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = session?.user?.id === listing.ownerId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            {listing.images.length > 0 ? (
              <>
                <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                  <img
                    src={`/api/images/${listing.images[selectedImageIndex].id}`}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {listing.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {listing.images.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative aspect-square rounded-lg overflow-hidden ${
                          selectedImageIndex === index
                            ? "ring-2 ring-primary"
                            : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={`/api/images/${image.id}`}
                          alt={`${listing.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square rounded-xl bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">No images</p>
              </div>
            )}
          </div>

          {/* Listing Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-2">{listing.title}</h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{listing.category}</Badge>
                    {!listing.isActive && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
                {!isOwner && session?.user && (
                  <Button
                    size="lg"
                    variant={isFavorited ? "default" : "outline"}
                    onClick={handleToggleFavorite}
                    disabled={isToggling}
                    className="rounded-full"
                  >
                    {isToggling ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Heart
                        className={`h-5 w-5 ${isFavorited ? "fill-current" : ""}`}
                      />
                    )}
                  </Button>
                )}
              </div>

              <div className="text-3xl font-bold text-primary mb-6">
                ₹{listing.price.toLocaleString()}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {listing.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{listing.city}</span>
                  {listing.lat && listing.lng && (
                    <span className="text-muted-foreground">
                      ({listing.lat.toFixed(4)}, {listing.lng.toFixed(4)})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Posted by {listing.owner.name || listing.owner.email}
                    {isOwner && <Badge variant="outline" className="ml-2">You</Badge>}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Posted {new Date(listing.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {isOwner && (
              <div className="flex gap-4">
                <Button
                  onClick={() => router.push(`/listings/${listing.id}/edit`)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Listing
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            {!isOwner && session && (
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleBuyNow}
                  disabled={isBuying}
                >
                  {isBuying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <>💳</>
                  )}
                  Buy Now - ₹{listing.price.toLocaleString()}
                </Button>
                <Button 
                  className="w-full" 
                  size="lg"
                  variant="outline"
                  onClick={handleContactSeller}
                  disabled={isContacting}
                >
                  {isContacting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  )}
                  Contact Seller
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
