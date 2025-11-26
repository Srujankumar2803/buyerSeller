"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Heart, MessageCircle, Star } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface ListingCardProps {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  category: string;
  city: string;
  imageId?: string;
  ownerId?: string;
  owner?: {
    name?: string;
    avatarImageId?: string;
  };
  isFavorited?: boolean;
  rating?: number;
  onFavoriteChange?: () => void;
}

export default function ListingCard({
  id,
  title,
  description,
  price,
  currency = "INR",
  category,
  city,
  imageId,
  ownerId,
  owner,
  isFavorited = false,
  rating,
  onFavoriteChange,
}: ListingCardProps) {
  const { data: session } = useSession();
  const [favorited, setFavorited] = useState(isFavorited);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  
  // Check if current user is the owner of this listing
  const isOwner = session?.user?.id === ownerId;

  // Update favorited state when prop changes
  useEffect(() => {
    setFavorited(isFavorited);
  }, [isFavorited]);

  // Check if listing is favorited on mount
  useEffect(() => {
    if (!session?.user) return;

    async function checkFavorite() {
      try {
        const response = await fetch("/api/favorites");
        if (response.ok) {
          const data = await response.json();
          const favorite = data.favorites.find(
            (fav: { listingId: string; id: string }) => fav.listingId === id
          );
          if (favorite) {
            setFavorited(true);
            setFavoriteId(favorite.id);
          }
        }
      } catch (err) {
        console.error("Failed to check favorite status:", err);
      }
    }

    checkFavorite();
  }, [session, id]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      // Could redirect to login or show a message
      return;
    }

    setIsToggling(true);
    try {
      if (favorited && favoriteId) {
        // Remove from favorites
        const response = await fetch(`/api/favorites/${favoriteId}?listingId=${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setFavorited(false);
          setFavoriteId(null);
          if (onFavoriteChange) onFavoriteChange();
        }
      } else {
        // Add to favorites
        const response = await fetch("/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ listingId: id }),
        });

        if (response.ok) {
          const data = await response.json();
          setFavorited(true);
          setFavoriteId(data.favorite.id);
          if (onFavoriteChange) onFavoriteChange();
        }
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    } finally {
      setIsToggling(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === "INR") {
      return `₹${price.toLocaleString('en-IN')}`;
    }
    return `${currency} ${price}`;
  };

  return (
    <Link href={`/listings/${id}`}>
      <Card className="rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-border/50 hover:border-primary/20">
        {/* Image Area */}
        <div className="relative h-48 sm:h-56 overflow-hidden bg-muted">
        {imageId ? (
          <img 
            src={`/api/images/${imageId}`}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-muted-foreground text-sm">No image</span>
          </div>
        )}
        
        {/* Favorite Button - Only show if logged in and not the owner */}
        {session?.user && !isOwner && (
          <button 
            onClick={handleToggleFavorite}
            disabled={isToggling}
            className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm p-2.5 rounded-full hover:bg-background transition-all shadow-lg hover:scale-110 disabled:opacity-50"
          >
            <Heart 
              className={`h-4 w-4 transition-all ${
                favorited ? 'fill-red-500 text-red-500' : 'text-foreground'
              }`}
            />
          </button>
        )}
        
        {/* Category Badge */}
        <Badge className="absolute bottom-3 left-3 rounded-full shadow-lg bg-background/90 backdrop-blur-sm text-foreground hover:bg-background">
          {category}
        </Badge>
      </div>
      
      {/* Card Content */}
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex justify-between items-start gap-3">
          <CardTitle className="text-lg sm:text-xl line-clamp-1 flex-1 group-hover:text-primary transition-colors">
            {title}
          </CardTitle>
          <span className="text-xl sm:text-2xl font-bold text-primary whitespace-nowrap">
            {formatPrice(price, currency)}
          </span>
        </div>
        
        {description && (
          <CardDescription className="line-clamp-2 text-sm mt-1.5 leading-relaxed">
            {description}
          </CardDescription>
        )}
        
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
          <MapPin className="h-3.5 w-3.5" />
          <span>{city}</span>
        </div>
      </CardHeader>
      
      {/* Card Footer */}
      <CardFooter className="p-4 sm:p-5 pt-0 flex justify-between items-center gap-3">
        {/* Seller Info */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar className="h-8 w-8 ring-2 ring-background">
            {owner?.avatarImageId ? (
              <AvatarImage src={`/api/images/${owner.avatarImageId}`} />
            ) : (
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {owner?.name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{owner?.name || 'Unknown'}</p>
            {rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-muted-foreground">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="rounded-full px-3 hover:bg-primary hover:text-primary-foreground transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
    </Link>
  );
}
