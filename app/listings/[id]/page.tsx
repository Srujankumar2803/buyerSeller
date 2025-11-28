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
      
      const deviceInfo = isMobile ? 
        `<p style="font-size: 14px; color: #4caf50; margin: 0;">📱 Mobile detected - UPI apps will open automatically</p>` :
        `<p style="font-size: 14px; color: #ff9800; margin: 0;">💻 Desktop detected - Use mobile for direct UPI app access</p>`;

      paymentModal.innerHTML = `
        <div style="background: white; padding: 24px; border-radius: 12px; max-width: 400px; width: 90%; text-align: center;">
          <h3 style="margin: 0 0 16px 0; color: #333;">Pay ₹${paymentInfo.amount}</h3>
          <p style="margin: 0 0 16px 0; color: #666;">for ${data.listing.title}</p>
          
          <div style="margin: 20px 0; padding: 16px; background: #f0f8ff; border-radius: 8px;">
            <p style="font-weight: bold; margin: 0 0 8px 0;">UPI ID: ${paymentInfo.merchantUpiId}</p>
            ${deviceInfo}
          </div>
          
          <div style="margin: 20px 0;">
            ${isMobile ? `
            <button id="phonepe-btn" style="background: #5f259f; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; width: 100%; margin-bottom: 8px; font-size: 16px;">
              📱 Pay with PhonePe
            </button>
            
            <button id="gpay-btn" style="background: #4285f4; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; width: 100%; margin-bottom: 8px; font-size: 16px;">
              💳 Pay with Google Pay
            </button>
            
            <button id="paytm-btn" style="background: #002970; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; width: 100%; margin-bottom: 8px; font-size: 16px;">
              💰 Pay with Paytm
            </button>
            
            <button id="any-upi-btn" style="background: #00bcd4; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; width: 100%; margin-bottom: 12px; font-size: 16px;">
              🔄 Open Any UPI App
            </button>
            ` : ''}
            
            <!-- Universal UPI Payment Button (Works on Desktop + Mobile) -->
            <button id="upi-payment-btn" style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; border: none; padding: 15px 24px; border-radius: 8px; cursor: pointer; width: 100%; margin-bottom: 12px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
              💰 Pay ₹${paymentInfo.amount} via UPI
            </button>
            
            <!-- QR Code for Desktop Users -->
            ${!isMobile ? `
            <div id="qr-container" style="margin: 16px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; text-align: center; color: white;">
              <p style="font-size: 16px; margin: 0 0 16px 0; font-weight: bold;">📱 Scan with UPI App</p>
              <div id="qr-code-placeholder" style="width: 220px; height: 220px; margin: 0 auto 16px auto; background: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #666; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <div style="text-align: center;">
                  <div style="font-size: 24px; margin-bottom: 8px;">⏳</div>
                  <div>Generating QR Code...</div>
                </div>
              </div>
              <p style="font-size: 14px; margin: 0; opacity: 0.9;">Amount: ₹${paymentInfo.amount} → ${paymentInfo.merchantUpiId}</p>
            </div>
            
            <button id="regenerate-qr-btn" style="background: #9c27b0; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; width: 100%; margin-bottom: 8px; font-size: 14px;">
              🔄 Regenerate QR Code
            </button>
            
            <button id="copy-upi-btn" style="background: #2196f3; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; width: 100%; margin-bottom: 12px;">
              📋 Copy Payment Details
            </button>
            ` : ''}
          </div>
          
          <div style="margin: 16px 0; border-top: 1px solid #eee; padding-top: 16px;">
            <button id="confirm-payment-btn" style="background: #ff9800; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; width: 100%; margin-bottom: 8px;">
              ✅ I Have Completed Payment
            </button>
          </div>
          
          <button id="cancel-payment-btn" style="background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
            Cancel
          </button>
        </div>
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
        // Remove payment modal
        if (document.body.contains(paymentModal)) {
          document.body.removeChild(paymentModal);
        }
        
        // Show success modal
        const successModal = document.createElement('div');
        successModal.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.7); display: flex; align-items: center;
          justify-content: center; z-index: 10000; padding: 20px;
        `;
        
        successModal.innerHTML = `
          <div style="background: white; border-radius: 12px; padding: 32px; max-width: 400px; width: 100%; text-align: center; animation: fadeInScale 0.3s ease-out;">
            <div style="width: 80px; height: 80px; background: #4CAF50; border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 40px;">✅</span>
            </div>
            <h2 style="margin: 0 0 16px 0; color: #2E7D32; font-size: 24px;">Payment Successful!</h2>
            <p style="margin: 0 0 24px 0; color: #666; font-size: 16px; line-height: 1.5;">
              Your payment has been confirmed! The item "${data.listing.title}" is now yours.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button id="view-purchases-btn" style="background: #2196F3; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px;">
                View My Purchases
              </button>
              <button id="close-success-btn" style="background: #f5f5f5; color: #333; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px;">
                Close
              </button>
            </div>
          </div>
          
          <style>
            @keyframes fadeInScale {
              from { opacity: 0; transform: scale(0.8); }
              to { opacity: 1; transform: scale(1); }
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
        // Stop payment verification if running
        if (paymentCheckInterval) {
          clearInterval(paymentCheckInterval);
          paymentCheckInterval = null;
        }
        
        // Ask user if they want to continue monitoring in background
        const continueMonitoring = window.confirm(
          "Cancel payment?\n\n" +
          "Choose 'OK' to stop monitoring completely, or\n" +
          "Choose 'Cancel' to close this window but keep monitoring for payment in the background."
        );
        
        if (continueMonitoring) {
          // User wants to stop completely
          document.body.removeChild(paymentModal);
          setIsBuying(false);
          toast.error("Payment cancelled");
        } else {
          // User wants to continue monitoring in background
          document.body.removeChild(paymentModal);
          setIsBuying(false);
          
          // Check if user confirmed payment before closing
          const confirmBtn = paymentModal.querySelector('#confirm-payment-btn') as HTMLButtonElement;
          if (confirmBtn?.textContent?.includes('Waiting')) {
            // Payment was confirmed, continue monitoring
            toast.success("💡 Payment monitoring continues in background. We'll notify you when received!");
            startPaymentVerification(); // Restart monitoring
          } else {
            toast("Payment window closed. You can try again anytime.", {
              style: {
                background: '#2196F3',
                color: 'white',
              },
            });
          }
        }
      });
      
      // Auto-generate QR code for desktop users immediately
      if (!isMobile) {
        // Generate QR code right after modal is added to DOM
        setTimeout(() => {
          console.log("Auto-generating QR code for desktop user...");
          generateQRCode();
        }, 200);
      }
      
      // Show the payment modal
      document.body.appendChild(paymentModal);
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
