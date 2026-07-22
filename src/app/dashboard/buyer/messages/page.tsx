"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  MessageSquare,
  ChevronLeft,
  Search,
  Loader2,
  Send,
  Store,
  Clock,
  User,
} from "lucide-react";

interface Conversation {
  id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_slug: string;
  vendor_logo: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_mine: boolean;
}

export default function BuyerMessagesPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || role !== "buyer")) {
      router.push("/auth");
    }
  }, [user, role, authLoading, router]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch("/api/messages/conversations");
      const data = await response.json();
      setConversations(data.data || []);
    } catch {
      // Silently handle — empty state will show
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  const selectedVendor = conversations.find((c) => c.id === selectedConversation);

  const filteredConversations = conversations.filter((c) =>
    c.vendor_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-surface-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Link
              href="/dashboard/buyer"
              className="text-gray-400 hover:text-brand-navy transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                Messages
              </h1>
              <p className="text-sm text-gray-500">
                Your conversations with vendors.
              </p>
            </div>
          </div>

          {/* Messages Layout */}
          {loading ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold mx-auto mb-4" />
              <p className="text-gray-500">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            /* Empty State */
            <div className="glass rounded-2xl p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-bold text-brand-navy mb-2 font-display">
                No Messages Yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                When you message a vendor through their profile page, your
                conversations will appear here.
              </p>
              <Link href="/browse">
                <Button variant="gold" size="lg">
                  <Store className="h-4 w-4" />
                  Browse Vendors
                </Button>
              </Link>
            </div>
          ) : (
            /* Conversation List + Message View */
            <div className="grid lg:grid-cols-3 gap-6" style={{ minHeight: "60vh" }}>
              {/* Conversation List */}
              <div className="glass rounded-2xl overflow-hidden lg:col-span-1">
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search conversations..."
                      className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                  {filteredConversations.map((convo) => (
                    <button
                      key={convo.id}
                      onClick={() => setSelectedConversation(convo.id)}
                      className={`w-full px-4 py-4 text-left hover:bg-gray-50/50 transition-colors flex items-start gap-3 ${
                        selectedConversation === convo.id
                          ? "bg-brand-gold/5 border-l-2 border-brand-gold"
                          : ""
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0">
                        {convo.vendor_logo ? (
                          <img
                            src={convo.vendor_logo}
                            alt={convo.vendor_name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <Store className="h-5 w-5 text-brand-gold" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-brand-navy truncate">
                            {convo.vendor_name}
                          </h4>
                          {convo.unread_count > 0 && (
                            <span className="bg-brand-gold text-brand-navy text-xs font-bold px-2 py-0.5 rounded-full">
                              {convo.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {convo.last_message}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-300 mt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(convo.last_message_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message View */}
              <div className="glass rounded-2xl overflow-hidden lg:col-span-2 flex flex-col">
                {selectedConversation && selectedVendor ? (
                  <>
                    {/* Chat Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center">
                        <Store className="h-5 w-5 text-brand-gold" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-brand-navy text-sm">
                          {selectedVendor.vendor_name}
                        </h3>
                        <Link
                          href={`/vendors/${selectedVendor.vendor_slug}`}
                          className="text-xs text-brand-gold hover:underline"
                        >
                          View profile
                        </Link>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-6 overflow-y-auto">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                          <p>Messages will appear here</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${
                                msg.is_mine ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm ${
                                  msg.is_mine
                                    ? "bg-brand-navy text-white rounded-br-sm"
                                    : "bg-gray-100 text-gray-700 rounded-bl-sm"
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="px-6 py-4 border-t border-gray-100">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                        />
                        <Button
                          variant="gold"
                          size="md"
                          disabled={!messageInput.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full p-12">
                    <div className="text-center">
                      <User className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 text-sm">
                        Select a conversation to view messages
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
