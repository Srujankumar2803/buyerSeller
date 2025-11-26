"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Bell, User, LogOut, Settings, Package } from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && session?.user;

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
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

          {/* Search Bar - Pill Style */}
          <div className="flex-1 max-w-2xl mx-4 sm:mx-8 hidden md:block">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search for items, categories, or locations..."
                className="w-full pl-11 pr-4 py-2.5 rounded-full border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all hover:border-ring/50"
              />
            </div>
          </div>

          {/* Right Side - Auth Area */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-accent"
            >
              <Bell className="h-5 w-5" />
            </Button>
            
            <Link href="/listings">
              <Button 
                variant="ghost"
                className="rounded-full px-4 sm:px-6 hover:bg-accent transition-all hidden sm:inline-flex"
              >
                Browse Listings
              </Button>
            </Link>
            
            <Link href="http://localhost:3000/listings/create">
              <Button 
                className="rounded-full px-4 sm:px-6 shadow-md hover:shadow-lg transition-all hidden sm:inline-flex"
              >
                <Package className="h-4 w-4 mr-2" />
                Sell Item
              </Button>
            </Link>

            {/* Auth Area */}
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all">
                    <AvatarImage src={session?.user?.image || undefined} />
                    <AvatarFallback className="bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{session?.user?.name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                      {session?.user?.role && (
                        <Badge variant={session.user.role === "SELLER" ? "default" : "secondary"} className="w-fit text-xs mt-1">
                          {session.user.role}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer rounded-xl" asChild>
                    <Link href="/dashboard" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer rounded-xl" asChild>
                    <Link href="/listings" className="flex items-center">
                      <Search className="mr-2 h-4 w-4" />
                      Browse Listings
                    </Link>
                  </DropdownMenuItem>
                  {session?.user?.role === "SELLER" && (
                    <DropdownMenuItem className="cursor-pointer rounded-xl" asChild>
                      <Link href="http://localhost:3000/listings/create" className="flex items-center">
                        <Package className="mr-2 h-4 w-4" />
                        Create Listing
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="cursor-pointer rounded-xl">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-destructive focus:text-destructive rounded-xl"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button 
                    variant="ghost" 
                    className="rounded-full px-4"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button 
                    className="rounded-full px-4 hidden sm:inline-flex"
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
