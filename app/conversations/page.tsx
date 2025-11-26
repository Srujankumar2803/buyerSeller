"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
}

interface Participant {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Listing {
  id: string;
  title: string;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  };
  images: Array<{
    id: string;
    filename: string;
  }>;
}

interface Conversation {
  id: string;
  listingId: string;
  createdAt: string;
  updatedAt: string;
  listing: Listing;
  participants: Participant[];
  messages: Message[];
}

export default function ConversationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchConversations();
    }
  }, [status, router]);

  async function fetchConversations() {
    try {
      const response = await fetch("/api/conversations");
      const data = await response.json();

      if (response.ok) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(
      (p) => p.user.id !== session?.user?.id
    )?.user;
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Messages</h1>
          <p className="text-muted-foreground">
            Your conversations about listings
          </p>
        </div>

        {conversations.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No conversations yet</p>
              <Link href="/listings">
                <Button>Browse Listings</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => {
              const otherUser = getOtherParticipant(conversation);
              const lastMessage = conversation.messages[0];
              const isOwner = conversation.listing.owner.id === session?.user?.id;

              return (
                <Link key={conversation.id} href={`/conversations/${conversation.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Listing Image */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {conversation.listing.images.length > 0 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/images/${conversation.listing.images[0].id}`}
                              alt={conversation.listing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <MessageSquare className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        {/* Conversation Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold line-clamp-1 mb-1">
                                {conversation.listing.title}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-xs">
                                    <User className="h-3 w-3" />
                                  </AvatarFallback>
                                </Avatar>
                                <span className="line-clamp-1">
                                  {isOwner ? (
                                    <>Inquiry from {otherUser?.name || otherUser?.email}</>
                                  ) : (
                                    <>Chat with {conversation.listing.owner.name || conversation.listing.owner.email}</>
                                  )}
                                </span>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {formatDistanceToNow(new Date(conversation.updatedAt), {
                                addSuffix: true,
                              })}
                            </Badge>
                          </div>

                          {lastMessage && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {lastMessage.senderId === session?.user?.id ? "You: " : ""}
                              {lastMessage.text}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
