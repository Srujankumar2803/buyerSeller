"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Plus, MapPin, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ListingImage {
  id: string;
  filename: string;
  mime: string;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  city: string;
  images: ListingImage[];
  createdAt: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [city, setCity] = useState(searchParams.get("city") || "");

  useEffect(() => {
    fetchListings();
  }, [searchParams]);

  async function fetchListings() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      const q = searchParams.get("q");
      const cat = searchParams.get("category");
      const cty = searchParams.get("city");
      const page = searchParams.get("page") || "1";
      const limit = searchParams.get("limit") || "12";

      if (q) params.append("q", q);
      if (cat) params.append("category", cat);
      if (cty) params.append("city", cty);
      params.append("page", page);
      params.append("limit", limit);

      const response = await fetch(`/api/listings?${params}`);
      const data = await response.json();

      if (response.ok) {
        setListings(data.listings);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("q", searchQuery);
    if (category) params.append("category", category);
    if (city) params.append("city", city);
    
    router.push(`/listings?${params}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/listings?${params}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Browse Listings</h1>
            <p className="text-muted-foreground">
              {pagination ? `${pagination.total} listings found` : "Loading..."}
            </p>
          </div>
          <Link href="/listings/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Listing
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Categories</option>
                <option value="Electronics">Electronics</option>
                <option value="Furniture">Furniture</option>
                <option value="Clothing">Clothing</option>
                <option value="Books">Books</option>
                <option value="Sports">Sports</option>
                <option value="Home & Garden">Home & Garden</option>
                <option value="Toys">Toys</option>
                <option value="Vehicles">Vehicles</option>
                <option value="Other">Other</option>
              </select>
              <Input
                placeholder="City..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} className="mt-4 w-full md:w-auto">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </CardContent>
        </Card>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : listings.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <p className="text-muted-foreground">No listings found</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {listings.map((listing) => (
                <Link key={listing.id} href={`/listings/${listing.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="relative aspect-video bg-muted overflow-hidden rounded-t-lg">
                      {listing.images.length > 0 ? (
                        <img
                          src={`/api/images/${listing.images[0].id}`}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No image
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2">
                        {listing.category}
                      </Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{listing.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {listing.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary mb-2">
                        ₹{listing.price.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {listing.city}
                      </div>
                    </CardContent>
                    <CardFooter className="text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === pagination.page ? "default" : "outline"}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
