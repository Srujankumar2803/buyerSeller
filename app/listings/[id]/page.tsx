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
      
      // Better UPI URL format for better compatibility
      const upiUrl = `upi://pay?pa=${paymentInfo.merchantUpiId}&pn=Marketplace&tr=${paymentInfo.orderId}&am=${paymentInfo.amount}&cu=INR`;
      
      console.log("UPI URL:", upiUrl);
      console.log("Payment Info:", paymentInfo);
      
      // Open UPI payment directly
      const openUpiPayment = () => {
        try {
          // Try to open UPI app directly
          window.location.href = upiUrl;
          
          // Fallback: show manual payment instructions
          setTimeout(() => {
            const shouldConfirm = confirm(
              `Payment Details:\n\nUPI ID: ${paymentInfo.merchantUpiId}\nAmount: ₹${paymentInfo.amount}\nFor: ${data.listing.title}\n\nDid you complete the payment?`
            );
            
            if (shouldConfirm) {
              confirmPayment();
            } else {
              setIsBuying(false);
            }
          }, 2000); // Wait 2 seconds for UPI app to open
          
        } catch (error) {
          console.error("UPI payment error:", error);
          toast.error("Could not open UPI app. Please pay manually.");
          
          // Show manual payment instructions
          alert(`Manual Payment:\n\nUPI ID: ${paymentInfo.merchantUpiId}\nAmount: ₹${paymentInfo.amount}\nNote: ${data.listing.title}`);
          setIsBuying(false);
        }
      };
      
      // Confirm payment function
      const confirmPayment = async () => {
        try {
          const verifyResponse = await fetch("/api/orders/verify", {
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
            throw new Error(verifyData.error || "Payment verification failed");
          }

          toast.success("Payment submitted! Seller will verify and confirm. 📱");
          router.push("/dashboard");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to submit payment");
        } finally {
          setIsBuying(false);
        }
      };
      
      // Start payment process
      openUpiPayment();
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
