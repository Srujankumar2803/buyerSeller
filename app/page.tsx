"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import ListingCard from "@/components/ListingCard";
import { Sparkles, TrendingUp, Shield, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  city: string;
  category: string;
  ownerId: string;
  images?: Array<{ id: string; filename: string; mime: string }>;
  owner: {
    name: string | null;
  };
}

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [isLoadingMy, setIsLoadingMy] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch seller's own listings
  useEffect(() => {
    const fetchMyListings = async () => {
      if (session?.user?.role === "SELLER") {
        setIsLoadingMy(true);
        try {
          const response = await fetch("/api/listings?owner=me");
          if (response.ok) {
            const data = await response.json();
            setMyListings(data.listings || []);
          }
        } catch (error) {
          console.error("Failed to fetch my listings:", error);
        } finally {
          setIsLoadingMy(false);
        }
      }
    };

    fetchMyListings();
  }, [session]);

  // Fetch all available listings for everyone
  useEffect(() => {
    const fetchAllListings = async () => {
      if (session?.user) {
        setIsLoadingAll(true);
        try {
          const response = await fetch("/api/listings?limit=6");
          if (response.ok) {
            const data = await response.json();
            setAllListings(data.listings || []);
          }
        } catch (error) {
          console.error("Failed to fetch all listings:", error);
        } finally {
          setIsLoadingAll(false);
        }
      }
    };

    fetchAllListings();
  }, [session]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Return null while redirecting
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <Layout>
      {/* Hero Section */}
      <section className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" />
          Join 10,000+ buyers and sellers
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Buy & Sell in Your
          <span className="block text-primary mt-2">Neighbourhood</span>
        </h1>
        
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
          Discover amazing deals from people nearby. Sell items you no longer need. 
          Build community connections.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/listings">
            <Button size="lg" className="rounded-full text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all">
              <TrendingUp className="mr-2 h-5 w-5" />
              Browse Items
            </Button>
          </Link>
          {session?.user?.role === "SELLER" && (
            <Link href="/listings/create">
              <Button size="lg" variant="outline" className="rounded-full text-base px-8 py-6 hover:bg-primary hover:text-primary-foreground transition-all">
                List an Item
              </Button>
            </Link>
          )}
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span>Secure Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>Verified Sellers</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Local Deals</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Browse by Category</h2>
        <div className="flex gap-3 flex-wrap">
          {["All", "Electronics", "Furniture", "Clothing", "Books", "Sports", "Home & Garden", "Toys", "Vehicles", "Other"].map((category) => (
            <Link key={category} href={category === "All" ? "/listings" : `/listings?category=${category}`}>
              <Badge 
                variant={category === "All" ? "default" : "secondary"}
                className="rounded-full px-5 py-2.5 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all hover:scale-105 shadow-sm"
              >
                {category}
              </Badge>
            </Link>
          ))}
        </div>
      </section>

      {/* My Listings Section - Only for Sellers */}
      {session?.user?.role === "SELLER" && (
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold">My Listings</h2>
            <Link href="/listings/create">
              <Button variant="ghost" className="rounded-full">
                <Package className="mr-2 h-4 w-4" />
                Create New
              </Button>
            </Link>
          </div>

          {isLoadingMy ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : myListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  {...listing}
                  imageId={listing.images?.[0]?.id}
                  ownerId={listing.ownerId}
                  owner={{ name: listing.owner.name || undefined }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-2xl border-2 border-dashed border-muted-foreground/20">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
              <p className="text-muted-foreground mb-6">
                Start selling by creating your first listing
              </p>
              <Link href="/listings/create">
                <Button className="rounded-full">
                  <Package className="mr-2 h-4 w-4" />
                  Create Your First Listing
                </Button>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Featured Listings Section - For All Users */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">
            {session?.user?.role === "SELLER" ? "Browse Marketplace" : "Available Listings"}
          </h2>
          <Link href="/listings">
            <Button variant="ghost" className="rounded-full">
              View All
            </Button>
          </Link>
        </div>

        {isLoadingAll ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : allListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allListings.map((listing) => (
              <ListingCard
                key={listing.id}
                {...listing}
                imageId={listing.images?.[0]?.id}
                ownerId={listing.ownerId}
                owner={{ name: listing.owner.name || undefined }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-2xl border-2 border-dashed border-muted-foreground/20">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No listings available</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to list an item!
            </p>
            {session?.user?.role === "SELLER" && (
              <Link href="/listings/create">
                <Button className="rounded-full">
                  <Package className="mr-2 h-4 w-4" />
                  Create Listing
                </Button>
              </Link>
            )}
          </div>
        )}
      </section>
    </Layout>
  );
}
