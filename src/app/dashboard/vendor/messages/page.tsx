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
  User,
  Clock,
  Inbox,
  CheckCheck,
  Mail,
} from "lucide-react";

interface MessageThread {
  id: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  total_messages: number;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_mine: boolean;
}

export default function VendorMessagesPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || role !== "vendor")) {
      router.push("/auth?type=vendor");
    }
  }, [user, role, authLoading, router]);

  const fetchThreads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch("/api/vendor/messages");
      const data = await response.json();
      setThreads(data.data || []);
    } catch {
      // Silently handle — empty state will show
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchThreads();
  }, [user, fetchThreads]);

  const selectedBuyer = threads.find((t) => t.id === selectedThread);

  const filteredThreads = threads.filter((t) =>
    t.buyer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = threads.reduce((sum, t) => sum + t.unread_count, 0);

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/vendor"
                className="text-gray-400 hover:text-brand-navy transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                  Messages
                </h1>
                <p className="text-sm text-gray-500">
                  View and respond to buyer inquiries.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                  <Inbox className="h-6 w-6 text-brand-gold" />
                </div>
              </div>
              <div className="text-2xl font-bold text-brand-navy">
                {threads.length}
              </div>
              <div className="text-sm text-gray-500">Total Conversations</div>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand-navy/5 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-brand-navy" />
                </div>
              </div>
              <div className="text-2xl font-bold text-brand-navy">
                {totalUnread}
              </div>
              <div className="text-sm text-gray-500">Unread Messages</div>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                  <CheckCheck className="h-6 w-6 text-brand-gold" />
                </div>
              </div>
              <div className="text-2xl font-bold text-brand-navy">
                {threads.length - threads.filter((t) => t.unread_count > 0).length}
              </div>
              <div className="text-sm text-gray-500">Responded</div>
            </div>
          </div>

          {/* Messages Layout */}
          {loading ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold mx-auto mb-4" />
              <p className="text-gray-500">Loading messages...</p>
            </div>
          ) : threads.length === 0 ? (
            /* Empty State */
            <div className="glass rounded-2xl p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-bold text-brand-navy mb-2 font-display">
                No Messages Yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                When buyers send you inquiries through your profile or listings,
                their messages will appear here.
              </p>
              <Link href="/dashboard/vendor/listings">
                <Button variant="gold" size="lg">
                  <MessageSquare className="h-4 w-4" />
                  Manage Listings
                </Button>
              </Link>
            </div>
          ) : (
            /* Thread List + Message View */
            <div className="grid lg:grid-cols-3 gap-6" style={{ minHeight: "60vh" }}>
              {/* Thread List */}
              <div className="glass rounded-2xl overflow-hidden lg:col-span-1">
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search buyers..."
                      className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                  {filteredThreads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThread(thread.id)}
                      className={`w-full px-4 py-4 text-left hover:bg-gray-50/50 transition-colors flex items-start gap-3 ${
                        selectedThread === thread.id
                          ? "bg-brand-gold/5 border-l-2 border-brand-gold"
                          : ""
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-brand-navy/5 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-brand-navy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-brand-navy truncate">
                            {thread.buyer_name}
                          </h4>
                          {thread.unread_count > 0 && (
                            <span className="bg-brand-gold text-brand-navy text-xs font-bold px-2 py-0.5 rounded-full">
                              {thread.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {thread.last_message}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-300 mt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(thread.last_message_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message View */}
              <div className="glass rounded-2xl overflow-hidden lg:col-span-2 flex flex-col">
                {selectedThread && selectedBuyer ? (
                  <>
                    {/* Chat Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-navy/5 flex items-center justify-center">
                        <User className="h-5 w-5 text-brand-navy" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-brand-navy text-sm">
                          {selectedBuyer.buyer_name}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {selectedBuyer.buyer_email}
                        </p>
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
                                    ? "bg-brand-gold text-brand-navy rounded-br-sm"
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
                          placeholder="Type a reply..."
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
                      <MessageSquare className="h-10 w-10 mx-auto mb-3 text-gray-300" />
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
