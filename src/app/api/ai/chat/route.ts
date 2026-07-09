import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are DBAssist, the helpful AI assistant for DBMartNG — Nigeria's premier business directory and marketplace.

## Your role
- Answer questions about how DBMartNG works (pricing, becoming a vendor, contacting vendors, subscription plans, etc.)
- Help buyers find relevant businesses by understanding what they're looking for
- Be friendly, professional, and concise. Keep answers under 3 paragraphs unless the user asks for more detail.
- If you don't know something, say so honestly rather than making it up.

## Key facts about DBMartNG
- DBMartNG is a Nigerian-first multivendor business directory and marketplace at dbmart.ng
- **Pricing:** Free tier (up to 5 listings, basic profile). Pro tier (₦5,000/month — unlimited listings, analytics, messaging, ad eligibility). New vendors get a 30-day full-access trial, no card required.
- **How it works for buyers:** Browse vendors by category, search for specific businesses, view profiles with product/service listings, reviews, ratings, "Open Now" indicator, and contact info. Buyer signup is optional for browsing.
- **How it works for vendors:** Sign up → complete onboarding (business info, category, contact, phone verification) → list products/services → listings enter pending_review → admin approves → profile goes live
- **Contact options:** WhatsApp (wa.me deep link with pre-typed message), email, phone, in-site messaging
- **Payment:** Paystack (cards, bank transfer, USSD, mobile money like OPay/PalmPay/Kuda, QR). All payment channels enabled.
- **Admin:** Hidden admin allowlist — only pre-approved identifiers can access the admin panel
- **Verification:** Vendors can get a "Verified" badge after manual admin review. VIP vendors (invite-only) get an additional VIP badge.

## Helping buyers find vendors
When a user asks you to find a business, product, or service:
1. Use the searchVendors function to query the database
2. Present the results conversationally
3. If no exact matches are found, suggest related categories

## Current date: ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
`;

const SEARCH_VENDORS_FUNC: FunctionDeclaration = {
  name: "searchVendors",
  description:
    "Search for vendors/businesses on DBMartNG by name, category, city, state, or keyword. Use this when a user asks to find a specific business, product, service, or category of vendors.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description:
          "Search query — business name, product, service, category, or location keyword",
      },
      category: {
        type: SchemaType.STRING,
        description:
          "Optional category filter (e.g. fashion, food, tech, makeup, photography, tailoring, events, repair)",
      },
      location: {
        type: SchemaType.STRING,
        description:
          "Optional location filter (city, state, or region in Nigeria)",
      },
      limit: {
        type: SchemaType.NUMBER,
        description: "Maximum number of results to return (default 5, max 10)",
      },
    },
    required: ["query"],
  },
};

async function searchVendors(params: {
  query: string;
  category?: string;
  location?: string;
  limit?: number;
}): Promise<string> {
  try {
    const adminClient = createAdminClient();
    const limit = Math.min(params.limit || 5, 10);
    const searchTerm = `%${params.query}%`;

    let query = adminClient
      .from("vendor_profiles")
      .select(
        `
        id,
        business_name,
        slug,
        description,
        city,
        state,
        is_verified,
        average_response_time,
        created_at
      `
      )
      .or(
        `business_name.ilike.${searchTerm},description.ilike.${searchTerm},city.ilike.${searchTerm},state.ilike.${searchTerm}`
      )
      .eq("is_verified", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (params.category) {
      const { data: catData } = await adminClient
        .from("categories")
        .select("id")
        .ilike("slug", `%${params.category}%`)
        .maybeSingle();
      const cat = catData as { id: string } | null;
      if (cat) {
        query = query.eq("category_id", cat.id);
      }
    }

    if (params.location) {
      const locTerm = `%${params.location}%`;
      query = query.or(`city.ilike.${locTerm},state.ilike.${locTerm}`);
    }

    const { data: vendors, error } = await query;

    if (error) {
      console.error("Gemini vendor search error:", error);
      return "I encountered an error while searching for vendors. Please try again.";
    }

    if (!vendors || vendors.length === 0) {
      return "I couldn't find any vendors matching your search. Try a different keyword or browse our categories at dbmart.ng/browse.";
    }

    const results = (vendors as Array<Record<string, unknown>>)
      .map(
        (v) =>
          `- **${v.business_name}**${v.is_verified ? " ✅ Verified" : ""}${
            v.city ? ` — ${v.city}${v.state ? `, ${v.state}` : ""}` : ""
          }\n  ${v.description ? String(v.description).slice(0, 120) + "..." : ""}\n  View profile: dbmart.ng/vendors/${v.slug}`
      )
      .join("\n\n");

    return `I found ${vendors.length} vendor(s) matching your search:\n\n${results}\n\nWould you like me to help you find something more specific or tell you more about any of these businesses?`;
  } catch (err) {
    console.error("Gemini vendor search error:", err);
    return "I'm having trouble searching right now. Please try again later, or browse our directory directly at dbmart.ng/browse.";
  }
}

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your-gemini-api-key") {
      return NextResponse.json(
        {
          error:
            "Gemini API key is not configured. Set GEMINI_API_KEY in your environment variables.",
        },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // ✅ CHANGED FROM gemini-1.5-flash
      systemInstruction: SYSTEM_PROMPT,
      tools: [
        {
          functionDeclarations: [SEARCH_VENDORS_FUNC],
        },
      ],
    });

    const chatHistory: { role: "user" | "model"; parts: { text: string }[] }[] =
      [];

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        chatHistory.push({
          role: msg.role,
          parts: [{ text: msg.text }],
        });
      }
    }

    const chat = model.startChat({
      history: chatHistory,
    });

    let result = await chat.sendMessage(message);
    let response = result.response;

    const functionCalls = response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      for (const fnCall of functionCalls) {
        if (fnCall.name === "searchVendors") {
          const args = fnCall.args as Record<string, unknown>;
          const searchResult = await searchVendors({
            query: (args.query as string) || message,
            category: args.category as string | undefined,
            location: args.location as string | undefined,
            limit: (args.limit as number) || 5,
          });

          const fnResult = await chat.sendMessage([
            {
              functionResponse: {
                name: "searchVendors",
                response: { result: searchResult },
              },
            },
          ]);
          response = fnResult.response;
        }
      }
    }

    const text = response.text();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const words = text.split(" ");
        for (let i = 0; i < words.length; i++) {
          controller.enqueue(encoder.encode(words[i] + (i < words.length - 1 ? " " : "")));
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Gemini chat error:", err);

    const encoder = new TextEncoder();
    const errorMessage = getErrorMessage(err);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `I apologise, but I encountered an issue: ${errorMessage} Please try asking your question again, or contact support@dbmart.ng if the problem persists.`
          )
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes("API_KEY_INVALID")) {
      return "The AI service is not properly configured. Please contact the platform administrator.";
    }
    if (err.message.includes("SAFETY")) {
      return "I couldn't respond to that request. Please try rephrasing your question.";
    }
    if (err.message.includes("quota") || err.message.includes("rate")) {
      return "The AI service is temporarily unavailable due to high demand. Please try again shortly.";
    }
    return err.message;
  }
  return "An unexpected error occurred.";
}