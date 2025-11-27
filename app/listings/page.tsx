"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Plus, MapPin, Calendar, Bell, User, LogOut, Settings, Package, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FilterPanel from "@/components/FilterPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

function ListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [priceMin, setPriceMin] = useState(searchParams.get("priceMin") || "");
  const [priceMax, setPriceMax] = useState(searchParams.get("priceMax") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");

  // Auto-focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Update local state when URL params change
    setSearchQuery(searchParams.get("q") || "");
    setCategory(searchParams.get("category") || "");
    setCity(searchParams.get("city") || "");
    setPriceMin(searchParams.get("priceMin") || "");
    setPriceMax(searchParams.get("priceMax") || "");
    setSortBy(searchParams.get("sort") || "newest");
    
    async function fetchListings() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        const q = searchParams.get("q");
        const cat = searchParams.get("category");
        const cty = searchParams.get("city");
        const pMin = searchParams.get("priceMin");
        const pMax = searchParams.get("priceMax");
        const sort = searchParams.get("sort");
        const page = searchParams.get("page") || "1";
        const limit = searchParams.get("limit") || "12";

        if (q) params.append("q", q);
        if (cat) params.append("category", cat);
        if (cty) params.append("city", cty);
        if (pMin) params.append("priceMin", pMin);
        if (pMax) params.append("priceMax", pMax);
        if (sort) params.append("sort", sort);
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

    fetchListings();
  }, [searchParams]);

  // Debounced search - update URL when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      // Update or remove search query
      if (searchQuery) {
        params.set("q", searchQuery);
      } else {
        params.delete("q");
      }
      
      // Update or remove category
      if (category) {
        params.set("category", category);
      } else {
        params.delete("category");
      }
      
      // Update or remove city
      if (city) {
        params.set("city", city);
      } else {
        params.delete("city");
      }
      
      // Update or remove price filters
      if (priceMin) {
        params.set("priceMin", priceMin);
      } else {
        params.delete("priceMin");
      }
      
      if (priceMax) {
        params.set("priceMax", priceMax);
      } else {
        params.delete("priceMax");
      }
      
      // Update or remove sort
      if (sortBy && sortBy !== "newest") {
        params.set("sort", sortBy);
      } else {
        params.delete("sort");
      }
      
      // Reset to page 1 when filters change
      params.delete("page");
      
      const newUrl = params.toString() ? `/listings?${params}` : '/listings';
      
      // Only update URL if it's actually different to prevent unnecessary navigation
      const currentUrl = window.location.pathname + window.location.search;
      if (newUrl !== currentUrl) {
        router.push(newUrl);
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [searchQuery, category, city, priceMin, priceMax, sortBy, router]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/listings?${params}`);
  };

  const handleClearFilters = () => {
    setCategory("");
    setCity("");
    setPriceMin("");
    setPriceMax("");
    setSortBy("newest");
    router.push("/listings");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header with Search and Filters */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 bg-primary rounded-2xl flex items-center justify-center shadow-md">
                <span className="text-primary-foreground font-bold text-lg">N</span>
              </div>
              <span className="font-bold text-xl hidden sm:block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Neighbourhood
              </span>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-4 sm:mx-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search your item here..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 rounded-full"
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full hover:bg-accent"
              >
                <Bell className="h-5 w-5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" alt="User" />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                    <Package className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/favorites')}>
                    <Heart className="mr-2 h-4 w-4" />
                    Favorites
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Compact Info Row */}
          <div className="pb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {pagination ? `${pagination.total} listing${pagination.total !== 1 ? 's' : ''} found` : "Loading..."}
              </p>
              <Link href="/listings/create">
                <Button size="sm" className="rounded-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Listing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Panel */}
        <FilterPanel
          category={category}
          city={city}
          priceMin={priceMin}
          priceMax={priceMax}
          sortBy={sortBy}
          onCategoryChange={setCategory}
          onCityChange={setCity}
          onPriceMinChange={setPriceMin}
          onPriceMaxChange={setPriceMax}
          onSortChange={setSortBy}
          onClearFilters={handleClearFilters}
        />

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
                        // eslint-disable-next-line @next/next/no-img-element
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
              <div className="flex flex-wrap justify-center items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                
                {/* Show page numbers with ellipsis */}
                {pagination.totalPages <= 7 ? (
                  // Show all pages if 7 or fewer
                  Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === pagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  ))
                ) : (
                  // Show pages with ellipsis for more than 7 pages
                  <>
                    <Button
                      variant={pagination.page === 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(1)}
                    >
                      1
                    </Button>
                    
                    {pagination.page > 3 && <span className="px-2">...</span>}
                    
                    {pagination.page > 2 && pagination.page < pagination.totalPages && (
                      <Button
                        variant={pagination.page === pagination.page - 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                      >
                        {pagination.page - 1}
                      </Button>
                    )}
                    
                    {pagination.page !== 1 && pagination.page !== pagination.totalPages && (
                      <Button variant="default" size="sm">
                        {pagination.page}
                      </Button>
                    )}
                    
                    {pagination.page < pagination.totalPages - 1 && pagination.page > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                      >
                        {pagination.page + 1}
                      </Button>
                    )}
                    
                    {pagination.page < pagination.totalPages - 2 && <span className="px-2">...</span>}
                    
                    <Button
                      variant={pagination.page === pagination.totalPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pagination.totalPages)}
                    >
                      {pagination.totalPages}
                    </Button>
                  </>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
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

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ListingsContent />
    </Suspense>
  );
}
