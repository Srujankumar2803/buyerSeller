"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, ArrowLeft, User, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    name: string | null;
    email: string | null;
  };
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
  price: number;
  currency: string;
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
  listing: Listing;
  participants: Participant[];
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const resolvedParams = use(params);
  const conversationId = resolvedParams.id;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchConversation();
      fetchMessages();
      // Start polling for new messages every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        fetchMessages(true);
      }, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function fetchConversation() {
    try {
      const response = await fetch("/api/conversations");
      const data = await response.json();

      if (response.ok) {
        const conv = data.conversations.find((c: Conversation) => c.id === conversationId);
        if (conv) {
          setConversation(conv);
        } else {
          router.push("/conversations");
        }
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
    }
  }

  async function fetchMessages(silent = false) {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await response.json();

      if (response.ok) {
        setMessages(data.messages);
      } else if (response.status === 403) {
        router.push("/conversations");
      }
    } catch (error) {
      if (!silent) {
        console.error("Error fetching messages:", error);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();

    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: messageText }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages([...messages, data.message]);
        setMessageText("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  }

  const getOtherParticipant = () => {
    if (!conversation) return null;
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

  if (!conversation) {
    return null;
  }

  const otherUser = getOtherParticipant();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/conversations">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="font-semibold line-clamp-1">
                    {otherUser?.name || otherUser?.email || "Unknown User"}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {conversation.listing.title}
                  </p>
                </div>
              </div>
            </div>

            <Link href={`/listings/${conversation.listingId}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Listing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Listing Card */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
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
                      No image
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold line-clamp-1 mb-1">
                    {conversation.listing.title}
                  </h3>
                  <p className="text-lg font-bold text-primary">
                    {conversation.listing.currency} {conversation.listing.price.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages List */}
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwn = message.senderId === session?.user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm break-words">{message.text}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwn
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatDistanceToNow(new Date(message.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t bg-background sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              disabled={isSending}
              className="flex-1"
            />
            <Button type="submit" disabled={isSending || !messageText.trim()}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
