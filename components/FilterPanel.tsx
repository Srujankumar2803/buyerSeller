"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { X, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

interface FilterPanelProps {
  category: string;
  city: string;
  priceMin: string;
  priceMax: string;
  sortBy: string;
  onCategoryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onClearFilters: () => void;
}

export default function FilterPanel({
  category,
  city,
  priceMin,
  priceMax,
  sortBy,
  onCategoryChange,
  onCityChange,
  onPriceMinChange,
  onPriceMaxChange,
  onSortChange,
  onClearFilters,
}: FilterPanelProps) {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const hasActiveFilters = category || city || priceMin || priceMax || sortBy !== "newest";

  const categories = [
    "Electronics",
    "Furniture",
    "Clothing",
    "Books",
    "Sports",
    "Home & Garden",
    "Toys",
    "Vehicles",
    "Other",
  ];

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
  ];

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="md:hidden mb-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters {hasActiveFilters && `(${[category, city, priceMin, priceMax].filter(Boolean).length})`}
        </Button>
      </div>

      {/* Filter Panel */}
      <Card className={`${showMobileFilters ? 'block' : 'hidden'} md:block mb-6`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Filters
            </h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Enter city..."
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
              />
            </div>

            {/* Price Min */}
            <div className="space-y-2">
              <Label htmlFor="priceMin">Min Price</Label>
              <Input
                id="priceMin"
                type="number"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => onPriceMinChange(e.target.value)}
                min="0"
              />
            </div>

            {/* Price Max */}
            <div className="space-y-2">
              <Label htmlFor="priceMax">Max Price</Label>
              <Input
                id="priceMax"
                type="number"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => onPriceMaxChange(e.target.value)}
                min="0"
              />
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <Label htmlFor="sort">Sort By</Label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
