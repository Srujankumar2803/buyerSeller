"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X, Save } from "lucide-react";

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
  category: string;
  city: string;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  ownerId: string;
  images: ListingImage[];
}

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteImageIds, setDeleteImageIds] = useState<string[]>([]);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    city: "",
    lat: "",
    lng: "",
    isActive: true,
  });

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
        setFormData({
          title: data.title,
          description: data.description,
          price: data.price.toString(),
          category: data.category,
          city: data.city,
          lat: data.lat?.toString() || "",
          lng: data.lng?.toString() || "",
          isActive: data.isActive,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchListing();
  }, [resolvedParams]);

  // Check authorization
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  if (!listing) {
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

  if (listing.ownerId !== session.user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You can only edit your own listings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleImageDelete = (imageId: string) => {
    if (confirm("Are you sure you want to delete this image?")) {
      setDeleteImageIds((prev) => [...prev, imageId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate
    if (!formData.title || !formData.description || !formData.price || !formData.category || !formData.city) {
      setError("Please fill in all required fields");
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      setError("Please enter a valid price");
      return;
    }

    setIsSaving(true);

    try {
      const updateData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        city: formData.city,
        lat: formData.lat || null,
        lng: formData.lng || null,
        isActive: formData.isActive,
        deleteImageIds,
      };

      const response = await fetch(`/api/listings/${listing.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update listing");
      }

      alert("Listing updated successfully!");
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const remainingImages = listing.images.filter(
    (img) => !deleteImageIds.includes(img.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Edit Listing</CardTitle>
            <CardDescription>
              Update your listing details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="E.g., Vintage Sofa in Great Condition"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <textarea
                  id="description"
                  placeholder="Describe your item in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isSaving}
                  required
                  rows={5}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (INR) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    disabled={isSaving}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    disabled={isSaving}
                    required
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a category</option>
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
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="E.g., Hyderabad"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude (Optional)</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    placeholder="17.3850"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude (Optional)</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    placeholder="78.4867"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  disabled={isSaving}
                  className="w-4 h-4 rounded border-input"
                />
                <Label htmlFor="isActive" className="font-normal">
                  Listing is active (visible to buyers)
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Current Images</Label>
                {remainingImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {remainingImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={`/api/images/${image.id}`}
                          alt={image.filename}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => handleImageDelete(image.id)}
                          disabled={isSaving}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No images</p>
                )}
                {deleteImageIds.length > 0 && (
                  <p className="text-sm text-orange-600">
                    {deleteImageIds.length} image(s) will be deleted when you save
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
