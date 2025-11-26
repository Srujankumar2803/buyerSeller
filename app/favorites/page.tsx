"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Layout from "@/components/Layout";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Loader2, Heart, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Favorite {
  id: string;
  listingId: string;
  createdAt: string;
  listing: {
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
  };
}

export default function FavoritesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (session?.user) {
        try {
          const response = await fetch("/api/favorites");
          if (response.ok) {
            const data = await response.json();
            setFavorites(data.favorites || []);
          }
        } catch (error) {
          console.error("Failed to fetch favorites:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchFavorites();
  }, [session]);

  const handleUnfavorite = async (favoriteId: string, listingId: string) => {
    setRemovingId(favoriteId);
    try {
      const response = await fetch(`/api/favorites/${favoriteId}?listingId=${listingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setFavorites(favorites.filter((fav) => fav.id !== favoriteId));
      }
    } catch (error) {
      console.error("Failed to remove favorite:", error);
    } finally {
      setRemovingId(null);
    }
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

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl sm:text-4xl font-bold">My Favorites</h1>
        </div>
        <p className="text-muted-foreground">
          Items you've saved for later
        </p>
      </div>

      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="relative group">
              <ListingCard
                {...favorite.listing}
                imageId={favorite.listing.images?.[0]?.id}
                ownerId={favorite.listing.ownerId}
                owner={{ name: favorite.listing.owner.name || undefined }}
                isFavorited={true}
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-4 left-4 rounded-full shadow-lg z-10 opacity-90 hover:opacity-100"
                onClick={() => handleUnfavorite(favorite.id, favorite.listingId)}
                disabled={removingId === favorite.id}
              >
                {removingId === favorite.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
          <p className="text-muted-foreground mb-6">
            Start browsing and save items you like
          </p>
          <Button onClick={() => router.push("/listings")} className="rounded-full">
            Browse Listings
          </Button>
        </Card>
      )}
    </Layout>
  );
}
