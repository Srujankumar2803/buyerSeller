"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Heart, MessageCircle, TrendingUp, Edit, Trash2, Eye } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Stats {
  listingsCount: number;
  favoritesCount: number;
  conversationsCount: number;
}

interface Listing {
  id: string;
  title: string;
  price: number;
  currency: string;
  category: string;
  isActive: boolean;
  createdAt: string;
}

interface Favorite {
  id: string;
  listing: {
    id: string;
    title: string;
    price: number;
    currency: string;
    city: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (session?.user) {
        try {
          const [statsRes, listingsRes, favoritesRes] = await Promise.all([
            fetch("/api/users/me/stats"),
            session.user.role === "SELLER" ? fetch("/api/listings?owner=me&limit=5") : Promise.resolve(null),
            session.user.role === "BUYER" ? fetch("/api/favorites") : Promise.resolve(null),
          ]);

          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setStats(statsData);
          }

          if (listingsRes && listingsRes.ok) {
            const listingsData = await listingsRes.json();
            setListings(listingsData.listings || []);
          }

          if (favoritesRes && favoritesRes.ok) {
            const favoritesData = await favoritesRes.json();
            setFavorites(favoritesData.favorites || []);
          }
        } catch (error) {
          console.error("Failed to fetch dashboard data:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [session]);

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setListings(listings.filter((listing) => listing.id !== listingId));
        if (stats) {
          setStats({ ...stats, listingsCount: stats.listingsCount - 1 });
        }
      }
    } catch (error) {
      console.error("Failed to delete listing:", error);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === "INR") {
      return `₹${price.toLocaleString('en-IN')}`;
    }
    return `${currency} ${price}`;
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const isSeller = session?.user?.role === "SELLER";

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {isSeller ? "Seller Dashboard" : "My Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.name || "User"}!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {isSeller && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.listingsCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Your items for sale
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Favorites</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.favoritesCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Saved items
            </p>
          </CardContent>
        </Card>

        <Link href="/conversations">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.conversationsCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active conversations
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Seller Dashboard */}
      {isSeller && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>My Listings</CardTitle>
                  <CardDescription>Manage your items for sale</CardDescription>
                </div>
                <Link href="/listings/create">
                  <Button className="rounded-full">
                    <Package className="mr-2 h-4 w-4" />
                    Create New
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {listings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings.map((listing) => (
                      <TableRow key={listing.id}>
                        <TableCell className="font-medium">{listing.title}</TableCell>
                        <TableCell>{listing.category}</TableCell>
                        <TableCell>{formatPrice(listing.price, listing.currency)}</TableCell>
                        <TableCell>
                          <Badge variant={listing.isActive ? "default" : "secondary"}>
                            {listing.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/listings/${listing.id}`}>
                              <Button size="sm" variant="ghost" className="rounded-full">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/listings/${listing.id}/edit`}>
                              <Button size="sm" variant="ghost" className="rounded-full">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-full text-destructive hover:text-destructive"
                              onClick={() => handleDeleteListing(listing.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No listings yet. Create your first listing to get started!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Buyer Dashboard */}
      {!isSeller && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>My Favorites</CardTitle>
                  <CardDescription>Items you&apos;ve saved</CardDescription>
                </div>
                <Link href="/favorites">
                  <Button variant="ghost" className="rounded-full">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {favorites.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {favorites.slice(0, 5).map((favorite) => (
                      <TableRow key={favorite.id}>
                        <TableCell className="font-medium">{favorite.listing.title}</TableCell>
                        <TableCell>{favorite.listing.city}</TableCell>
                        <TableCell>{formatPrice(favorite.listing.price, favorite.listing.currency)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/listings/${favorite.listing.id}`}>
                            <Button size="sm" variant="ghost" className="rounded-full">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No favorites yet. Start browsing to save items you like!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Explore the marketplace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/listings" className="flex-1">
                  <Button variant="outline" className="w-full rounded-full">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Browse Listings
                  </Button>
                </Link>
                <Link href="/favorites" className="flex-1">
                  <Button variant="outline" className="w-full rounded-full">
                    <Heart className="mr-2 h-4 w-4" />
                    View Favorites
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </Layout>
  );
}
