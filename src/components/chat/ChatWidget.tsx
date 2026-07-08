"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Loader2,
  Bot,
  User,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Headphones,
} from "lucide-react";
import { ErrorBoundary } from "./ErrorBoundary";
import { LiveChatView } from "./LiveChatView";

// ─── Types ──────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "model";
  text: string;
  id: string;
}

interface ChatHistory {
  role: "user" | "model";
  text: string;
}

type ChatMode = "ai" | "live";

// ─── Quick actions ──────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "How does pricing work?", prompt: "How does DBMartNG pricing work? What are the Free and Pro plans?" },
  { label: "Find fashion vendors", prompt: "Can you help me find fashion vendors in Lagos?" },
  { label: "How to become a vendor?", prompt: "How do I list my business on DBMartNG?" },
  { label: "Contact options", prompt: "How can I contact a vendor on DBMartNG?" },
];

// ─── Component ──────────────────────────────────────────────

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("ai");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Focus input when panel opens ──
  useEffect(() => {
    if (isOpen && mode === "ai") {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen, mode]);

  // ── Welcome message on first open (AI mode only) ──
  useEffect(() => {
    if (isOpen && mode === "ai" && messages.length === 0) {
      setMessages([
        {
          role: "model",
          text: "👋 Hi there! I'm DBAssist, your DBMartNG AI assistant. I can help you find businesses, explain how the platform works, answer pricing questions, and more. What would you like to know?",
          id: "welcome",
        },
      ]);
    }
  }, [isOpen, mode, messages.length]);

  // ── Switch mode ──
  const switchMode = useCallback((newMode: ChatMode) => {
    setMode(newMode);
    setError(null);
    // Cancel any in-flight AI request when tabbing away
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
  }, []);

  // ── Send message (AI mode only) ──
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        role: "user",
        text: text.trim(),
        id: `user-${Date.now()}`,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setShowSuggestions(false);
      setIsLoading(true);
      setError(null);

      const history: ChatHistory[] = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, text: m.text }));

      try {
        abortRef.current = new AbortController();

        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            history,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to get response");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream available");

        const decoder = new TextDecoder();
        let botText = "";
        const botMessageId = `bot-${Date.now()}`;

        setMessages((prev) => [
          ...prev,
          { role: "model", text: "", id: botMessageId },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          botText += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMessageId ? { ...m, text: botText } : m
            )
          );
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;

        const errMsg =
          err instanceof Error ? err.message : "Something went wrong";
        setError(errMsg);

        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: `I apologise, but I encountered an issue. ${errMsg} Please try again.`,
            id: `error-${Date.now()}`,
          },
        ]);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleRetry = () => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    if (lastUserMessage) {
      sendMessage(lastUserMessage.text);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  // ── Render ──

  return (
    <>
      {/* ─── FAB Button ─── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-brand-navy text-white shadow-xl hover:bg-brand-navy-light hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center group"
        aria-label={isOpen ? "Close chat" : "Open support"}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageSquare className="h-6 w-6 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent-success border-2 border-white animate-pulse-soft" />
          </>
        )}
      </button>

      {/* ─── Chat Panel ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 w-[360px] sm:w-[400px] h-[560px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
          >
            {/* ─── Header with Tab Navigation ─── */}
            <div className="bg-gradient-to-r from-brand-navy to-brand-navy-dark text-white shrink-0">
              {/* Top bar */}
              <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                <div className="w-9 h-9 rounded-xl bg-brand-gold/20 flex items-center justify-center shrink-0">
                  {mode === "ai" ? (
                    <Sparkles className="h-5 w-5 text-brand-gold" />
                  ) : (
                    <Headphones className="h-5 w-5 text-brand-gold" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">
                    {mode === "ai" ? "DBAssist" : "Live Support"}
                  </h3>
                  <p className="text-[11px] text-gray-300">
                    {mode === "ai" ? "AI Assistant" : "Chat with our team"}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Close chat"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>

              {/* Tab bar */}
              <div className="flex px-4 gap-1">
                <button
                  onClick={() => switchMode("ai")}
                  className={`flex-1 pb-2.5 text-xs font-semibold transition-all relative ${
                    mode === "ai"
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Assistant
                  </div>
                  {mode === "ai" && (
                    <motion.div
                      layoutId="chat-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold rounded-full"
                    />
                  )}
                </button>
                <button
                  onClick={() => switchMode("live")}
                  className={`flex-1 pb-2.5 text-xs font-semibold transition-all relative ${
                    mode === "live"
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Headphones className="h-3.5 w-3.5" />
                    Live Chat
                  </div>
                  {mode === "live" && (
                    <motion.div
                      layoutId="chat-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold rounded-full"
                    />
                  )}
                </button>
              </div>
            </div>

            {/* ─── Content Area ─── */}
            {mode === "ai" ? (
              /* ═══ AI ASSISTANT ═══ */
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/50">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        msg.role === "user" ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
                          msg.role === "user"
                            ? "bg-brand-navy/10"
                            : "bg-brand-gold/10"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <User className="h-4 w-4 text-brand-navy" />
                        ) : (
                          <Bot className="h-4 w-4 text-brand-gold" />
                        )}
                      </div>
                      <div
                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-brand-navy text-white rounded-tr-md"
                            : "bg-white border border-gray-100 shadow-sm rounded-tl-md"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      </div>
                    </div>
                  ))}

                  {/* Loading dots */}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-brand-gold" />
                      </div>
                      <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm rounded-tl-md">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-brand-gold/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 rounded-full bg-brand-gold/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 rounded-full bg-brand-gold/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="text-xs text-gray-400">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error retry */}
                  {error && !isLoading && (
                    <div className="flex justify-center">
                      <button
                        onClick={handleRetry}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-error/5 border border-accent-error/20 text-accent-error text-xs font-semibold hover:bg-accent-error/10 transition-colors"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Failed to send. Tap to retry
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Quick action suggestions */}
                  {showSuggestions && messages.length === 1 && (
                    <div className="pt-2">
                      <p className="text-xs text-gray-400 mb-2 text-center">
                        Try asking:
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {QUICK_ACTIONS.map((action) => (
                          <button
                            key={action.label}
                            onClick={() => handleQuickAction(action.prompt)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-600 hover:border-brand-gold hover:text-brand-navy hover:bg-brand-gold/5 transition-all"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 border-t border-gray-100 p-4 bg-white">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask me anything..."
                      disabled={isLoading}
                      className="flex-1 h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="h-11 w-11 rounded-xl bg-brand-gold text-brand-navy hover:bg-brand-gold-light disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </form>
                  <p className="text-[10px] text-gray-300 mt-2 text-center">
                    Powered by Gemini AI. Responses are AI-generated.
                  </p>
                </div>
              </>
            ) : (
              /* ═══ LIVE CHAT ═══ */
              <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <ErrorBoundary
                  name="Live Chat"
                  fallback={
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-accent-error/10 flex items-center justify-center mb-4">
                        <AlertTriangle className="h-7 w-7 text-accent-error" />
                      </div>
                      <h3 className="text-lg font-bold text-brand-navy mb-2">
                        Live Chat Unavailable
                      </h3>
                      <p className="text-sm text-gray-500 mb-4 max-w-[260px]">
                        Our live chat widget failed to load. You can still reach us via{" "}
                        <a
                          href="mailto:support@dbmart.ng"
                          className="text-brand-navy font-semibold hover:text-brand-gold"
                        >
                          support@dbmart.ng
                        </a>
                      </p>
                      <a
                        href="mailto:support@dbmart.ng"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-navy text-white hover:bg-brand-navy-light transition-all text-sm font-semibold"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Email Support
                      </a>
                    </div>
                  }
                >
                  <LiveChatView />
                </ErrorBoundary>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
