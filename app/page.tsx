import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import ListingCard from "@/components/ListingCard";
import { Sparkles, TrendingUp, Shield } from "lucide-react";

export default function Home() {
  // Placeholder listing data - will be replaced with real data from API
  const listings = [
    {
      id: "1",
      title: "Vintage Leather Sofa",
      description: "Beautiful vintage leather sofa in excellent condition. Perfect for modern living rooms.",
      price: 45000,
      currency: "INR",
      city: "Mumbai, Maharashtra",
      category: "Furniture",
      imageId: undefined,
      owner: {
        name: "John Doe",
      },
      rating: 4.8,
    },
    {
      id: "2",
      title: "Mountain Bike - Like New",
      description: "High-quality mountain bike, barely used. Great for weekend adventures.",
      price: 32000,
      currency: "INR",
      city: "Bangalore, Karnataka",
      category: "Sports",
      owner: {
        name: "Sarah Miller",
      },
      rating: 4.9,
    },
    {
      id: "3",
      title: "iPhone 13 Pro",
      description: "128GB, excellent condition with all accessories included.",
      price: 65000,
      currency: "INR",
      city: "Delhi",
      category: "Electronics",
      owner: {
        name: "Mike Roberts",
      },
      rating: 4.7,
    },
    {
      id: "4",
      title: "Designer Handbag",
      description: "Authentic designer handbag with certificate of authenticity.",
      price: 28000,
      currency: "INR",
      city: "Pune, Maharashtra",
      category: "Fashion",
      owner: {
        name: "Emily White",
      },
      rating: 5.0,
    },
    {
      id: "5",
      title: "Acoustic Guitar",
      description: "Yamaha acoustic guitar in perfect condition. Ideal for beginners.",
      price: 18000,
      currency: "INR",
      city: "Chennai, Tamil Nadu",
      category: "Music",
      owner: {
        name: "Alex Turner",
      },
      rating: 4.6,
    },
    {
      id: "6",
      title: "Gaming Console PS5",
      description: "PlayStation 5 with two controllers and 5 games included.",
      price: 48000,
      currency: "INR",
      city: "Hyderabad, Telangana",
      category: "Gaming",
      owner: {
        name: "Chris Lee",
      },
      rating: 4.9,
    },
  ];

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
          <Button size="lg" className="rounded-full text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all">
            <TrendingUp className="mr-2 h-5 w-5" />
            Browse Items
          </Button>
          <Button size="lg" variant="outline" className="rounded-full text-base px-8 py-6 hover:bg-primary hover:text-primary-foreground transition-all">
            List an Item
          </Button>
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
          {["All", "Furniture", "Electronics", "Fashion", "Sports", "Music", "Gaming", "Books"].map((category) => (
            <Badge 
              key={category} 
              variant={category === "All" ? "default" : "secondary"}
              className="rounded-full px-5 py-2.5 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all hover:scale-105 shadow-sm"
            >
              {category}
            </Badge>
          ))}
        </div>
      </section>

      {/* Listings Grid */}
      <section>
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Featured Listings</h2>
          <Button variant="ghost" className="rounded-full">
            View All
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              {...listing}
            />
          ))}
        </div>
      </section>

      {/* Load More */}
      <div className="mt-12 text-center">
        <Button variant="outline" size="lg" className="rounded-full px-8 hover:bg-primary hover:text-primary-foreground transition-all">
          Load More Items
        </Button>
      </div>
    </Layout>
  );
}
