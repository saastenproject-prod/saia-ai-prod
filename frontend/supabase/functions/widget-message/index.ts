import { createClient } from "npm:@supabase/supabase-js@2";

type WidgetSetting = {
  id: string;
  bot_id: string;
  widget_key: string;
  title: string | null;
  subtitle: string | null;
  greeting_message: string | null;
  primary_color: string | null;
  is_active: boolean;
};

type Bot = {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
  bot_type: string | null;
};

type Channel = {
  id: string;
  bot_id: string;
  channel_type: string;
  status: string;
};

type Flow = {
  id: string;
  bot_id: string;
  name: string;
  is_default: boolean;
  status: string;
};

type FlowNodeConfig = {
  message?: string;
  text?: string;
  content?: string;
  [key: string]: unknown;
};

type FlowNode = {
  id: string;
  flow_id: string;
  node_key: string | null;
  node_type: string | null;
  label: string | null;
  description: string | null;
  config: FlowNodeConfig | null;
};

type FlowEdge = {
  id: string;
  flow_id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  condition: Record<string, unknown> | null;
};

type Conversation = {
  id: string;
  workspace_id: string;
  bot_id: string;
  channel_id: string | null;
  flow_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  channel_type: string;
  status: string;
};

type WidgetMessageRequest = {
  widgetKey?: string;
  message?: string;
  conversationId?: string;
  customerName?: string;
  customerEmail?: string;
};

type N8nAiReplyResponse = {
  success?: boolean;
  answer?: string;
  context_found?: boolean;
  retrieved_count?: number;
  error?: string;
  [key: string]: unknown;
};

type AiReplyResult = {
  success: boolean;
  provider: "n8n_pinecone";
  model: "pinecone_integrated_retrieval";
  conversationId: string;
  answer: string | null;
  context_found: boolean;
  retrieved_count: number;
  error?: string | null;
  raw?: N8nAiReplyResponse | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_N8N_AI_REPLY_URL =
  "https://n8n-n8n.yemz6m.easypanel.host/webhook/widget-ai-reply";

const createId = () => crypto.randomUUID();

const jsonResponse = (body: unknown, status = 200): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;

  if (typeof err === "string") return err;

  if (err && typeof err === "object") {
    const anyError = err as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
      error_description?: string;
      error?: string;
    };

    return (
      anyError.message ||
      anyError.details ||
      anyError.hint ||
      anyError.error_description ||
      anyError.error ||
      JSON.stringify(err)
    );
  }

  return "Internal server error.";
};

const getMessageTextFromNode = (
  node: FlowNode | null | undefined,
  fallbackGreeting: string
): string => {
  return (
    node?.config?.message ||
    node?.config?.text ||
    node?.config?.content ||
    node?.description ||
    fallbackGreeting
  );
};

const callN8nAiReply = async ({
  n8nAiReplyUrl,
  botId,
  conversationId,
  message,
}: {
  n8nAiReplyUrl: string;
  botId: string;
  conversationId: string;
  message: string;
}): Promise<AiReplyResult> => {
  try {
    const response = await fetch(n8nAiReplyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bot_id: botId,
        message,
      }),
    });

    const rawText = await response.text();

    let parsed: N8nAiReplyResponse | null = null;

    try {
      parsed = rawText ? (JSON.parse(rawText) as N8nAiReplyResponse) : null;
    } catch {
      parsed = {
        success: false,
        error: rawText || "Invalid JSON response from n8n.",
      };
    }

    if (!response.ok || parsed?.success === false) {
      return {
        success: false,
        provider: "n8n_pinecone",
        model: "pinecone_integrated_retrieval",
        conversationId,
        answer: null,
        context_found: Boolean(parsed?.context_found),
        retrieved_count: Number(parsed?.retrieved_count || 0),
        error:
          parsed?.error ||
          `n8n AI reply request failed with status ${response.status}.`,
        raw: parsed,
      };
    }

    const answer =
      typeof parsed?.answer === "string" && parsed.answer.trim()
        ? parsed.answer.trim()
        : "Maaf, saya belum menemukan jawaban yang sesuai.";

    return {
      success: true,
      provider: "n8n_pinecone",
      model: "pinecone_integrated_retrieval",
      conversationId,
      answer,
      context_found: Boolean(parsed?.context_found),
      retrieved_count: Number(parsed?.retrieved_count || 0),
      error: null,
      raw: parsed,
    };
  } catch (err) {
    return {
      success: false,
      provider: "n8n_pinecone",
      model: "pinecone_integrated_retrieval",
      conversationId,
      answer: null,
      context_found: false,
      retrieved_count: 0,
      error: getErrorMessage(err),
      raw: null,
    };
  }
};

const shouldStoreBotReply = (): boolean => {
  return String(Deno.env.get("STORE_BOT_REPLY") || "").toLowerCase() === "true";
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed.",
      },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const n8nAiReplyUrl =
      Deno.env.get("N8N_AI_REPLY_URL") || DEFAULT_N8N_AI_REPLY_URL;

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          success: false,
          error: "Missing Supabase server configuration.",
        },
        500
      );
    }

    if (!n8nAiReplyUrl) {
      return jsonResponse(
        {
          success: false,
          error: "Missing n8n AI reply URL.",
        },
        500
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const body = (await req.json()) as WidgetMessageRequest;

    const widgetKey = String(body.widgetKey || "").trim();
    const message = String(body.message || "").trim();
    const existingConversationId = String(body.conversationId || "").trim();

    const customerName = String(
      body.customerName || "Website Visitor"
    ).trim();

    const customerEmail = String(
      body.customerEmail || "visitor@example.com"
    ).trim();

    if (!widgetKey) {
      return jsonResponse(
        {
          success: false,
          error: "widgetKey is required.",
        },
        400
      );
    }

    if (!message) {
      return jsonResponse(
        {
          success: false,
          error: "message is required.",
        },
        400
      );
    }

    const { data: widgetSetting, error: widgetError } = await supabase
      .from("widget_settings")
      .select(
        `
        id,
        bot_id,
        widget_key,
        title,
        subtitle,
        greeting_message,
        primary_color,
        is_active
      `
      )
      .eq("widget_key", widgetKey)
      .eq("is_active", true)
      .maybeSingle<WidgetSetting>();

    if (widgetError) throw widgetError;

    if (!widgetSetting) {
      return jsonResponse(
        {
          success: false,
          error: "Active widget setting not found.",
        },
        404
      );
    }

    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("id, workspace_id, name, status, bot_type")
      .eq("id", widgetSetting.bot_id)
      .maybeSingle<Bot>();

    if (botError) throw botError;

    if (!bot || bot.status !== "active") {
      return jsonResponse(
        {
          success: false,
          error: "Active bot not found.",
        },
        404
      );
    }

    const { data: channels, error: channelError } = await supabase
      .from("channels")
      .select("id, bot_id, channel_type, status")
      .eq("bot_id", bot.id)
      .eq("channel_type", "website")
      .order("created_at", {
        ascending: true,
      })
      .returns<Channel[]>();

    if (channelError) throw channelError;

    const selectedChannel =
      channels?.find((channel) => channel.status === "active") ||
      channels?.[0] ||
      null;

    const { data: flows, error: flowError } = await supabase
      .from("flows")
      .select("id, bot_id, name, is_default, status")
      .eq("bot_id", bot.id)
      .order("is_default", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      })
      .returns<Flow[]>();

    if (flowError) throw flowError;

    const selectedFlow =
      flows?.find((flow) => flow.is_default) || flows?.[0] || null;

    const fallbackGreeting =
      widgetSetting.greeting_message ||
      "Hi! Welcome to support. How can we help you today?";

    let flowGreetingMessage = fallbackGreeting;

    if (selectedFlow?.id) {
      const { data: nodes, error: nodeError } = await supabase
        .from("flow_nodes")
        .select(
          `
          id,
          flow_id,
          node_key,
          node_type,
          label,
          description,
          config
        `
        )
        .eq("flow_id", selectedFlow.id)
        .returns<FlowNode[]>();

      if (nodeError) throw nodeError;

      const { data: edges, error: edgeError } = await supabase
        .from("flow_edges")
        .select(
          `
          id,
          flow_id,
          source_node_id,
          target_node_id,
          label,
          condition
        `
        )
        .eq("flow_id", selectedFlow.id)
        .returns<FlowEdge[]>();

      if (edgeError) throw edgeError;

      const nodeRows = nodes || [];
      const edgeRows = edges || [];

      const startNode =
        nodeRows.find((node) => node.node_type === "start") ||
        nodeRows.find((node) => node.node_key === "start");

      const firstEdge = edgeRows.find(
        (edge) => edge.source_node_id === startNode?.id
      );

      const nextNode = nodeRows.find(
        (node) => node.id === firstEdge?.target_node_id
      );

      flowGreetingMessage = getMessageTextFromNode(
        nextNode,
        fallbackGreeting
      );
    }

    const now = new Date();

    let conversation: Conversation | null = null;
    let isNewConversation = false;

    if (existingConversationId) {
      const { data: existingConversation, error: existingError } =
        await supabase
          .from("conversations")
          .select(
            `
            id,
            workspace_id,
            bot_id,
            channel_id,
            flow_id,
            customer_name,
            customer_email,
            channel_type,
            status
          `
          )
          .eq("id", existingConversationId)
          .eq("bot_id", bot.id)
          .maybeSingle<Conversation>();

      if (existingError) throw existingError;

      if (
        existingConversation &&
        !["resolved", "closed"].includes(existingConversation.status)
      ) {
        conversation = existingConversation;
      }
    }

    if (!conversation) {
      isNewConversation = true;

      const conversationId = createId();

      const { data: insertedConversation, error: conversationError } =
        await supabase
          .from("conversations")
          .insert({
            id: conversationId,
            workspace_id: bot.workspace_id,
            bot_id: bot.id,
            channel_id: selectedChannel?.id || null,
            flow_id: selectedFlow?.id || null,
            customer_name: customerName || "Website Visitor",
            customer_email: customerEmail || "visitor@example.com",
            customer_phone: null,
            customer_external_id: `widget_customer_${Date.now()}`,
            external_conversation_id: `widget_conv_${Date.now()}`,
            channel_type: "website",
            status: "open",
            priority: "normal",
            assigned_to: null,
            last_message: message,
            last_message_at: now.toISOString(),
            started_at: now.toISOString(),
            metadata: {
              source: "runtime_widget_edge_function",
              intent: "website_widget_message",
              customer_intent: message,
              widget_key: widgetKey,
              flow_id: selectedFlow?.id || null,
              greeting_preview: flowGreetingMessage,
              greeting_stored_in_messages: false,
              ai_reply_provider: "n8n_pinecone",
            },
          })
          .select(
            `
            id,
            workspace_id,
            bot_id,
            channel_id,
            flow_id,
            customer_name,
            customer_email,
            channel_type,
            status
          `
          )
          .single<Conversation>();

      if (conversationError) throw conversationError;

      conversation = insertedConversation;
    } else {
      const { error: updateConversationError } = await supabase
        .from("conversations")
        .update({
          last_message: message,
          last_message_at: now.toISOString(),
          updated_at: now.toISOString(),
          metadata: {
            source: "runtime_widget_edge_function",
            intent: "website_widget_message",
            customer_intent: message,
            widget_key: widgetKey,
            last_widget_message_at: now.toISOString(),
            ai_reply_provider: "n8n_pinecone",
          },
        })
        .eq("id", conversation.id)
        .eq("bot_id", bot.id);

      if (updateConversationError) throw updateConversationError;
    }

    const { error: insertCustomerMessageError } = await supabase
      .from("messages")
      .insert({
        id: createId(),
        workspace_id: conversation.workspace_id,
        bot_id: conversation.bot_id,
        conversation_id: conversation.id,
        sender_type: "customer",
        sender_profile_id: null,
        sender_name:
          conversation.customer_name || customerName || "Website Visitor",
        message_type: "text",
        content: message,
        metadata: {
          source: isNewConversation
            ? "runtime_widget_edge_function"
            : "runtime_widget_edge_function_follow_up",
          widget_key: widgetKey,
        },
        sent_at: now.toISOString(),
      });

    if (insertCustomerMessageError) throw insertCustomerMessageError;

    const aiReplyResult = await callN8nAiReply({
      n8nAiReplyUrl,
      botId: bot.id,
      conversationId: conversation.id,
      message,
    });

    let botMessageId: string | null = null;

    if (aiReplyResult.success && aiReplyResult.answer && shouldStoreBotReply()) {
      botMessageId = createId();

      const botReplyNow = new Date();

      const { error: insertBotMessageError } = await supabase
        .from("messages")
        .insert({
          id: botMessageId,
          workspace_id: conversation.workspace_id,
          bot_id: conversation.bot_id,
          conversation_id: conversation.id,
          sender_type: "bot",
          sender_profile_id: null,
          sender_name: bot.name || widgetSetting.title || "Nexora Support",
          message_type: "text",
          content: aiReplyResult.answer,
          metadata: {
            source: "n8n_pinecone_ai_reply",
            widget_key: widgetKey,
            context_found: aiReplyResult.context_found,
            retrieved_count: aiReplyResult.retrieved_count,
            provider: aiReplyResult.provider,
            model: aiReplyResult.model,
          },
          sent_at: botReplyNow.toISOString(),
        });

      if (insertBotMessageError) throw insertBotMessageError;

      const { error: updateBotLastMessageError } = await supabase
        .from("conversations")
        .update({
          last_message: aiReplyResult.answer,
          last_message_at: botReplyNow.toISOString(),
          updated_at: botReplyNow.toISOString(),
        })
        .eq("id", conversation.id)
        .eq("bot_id", bot.id);

      if (updateBotLastMessageError) throw updateBotLastMessageError;
    }

    return jsonResponse({
      success: true,
      isNewConversation,
      conversationId: conversation.id,

      /*
        Keep botReply null so the current widget does not render duplicate bot messages.
        The widget should use aiReplyResult.answer.
      */
      botReply: null,

      customerMessage: message,
      aiReplyTriggered: aiReplyResult.success,
      aiReplyResult: {
        ...aiReplyResult,
        messageId: botMessageId,
      },
    });
  } catch (err: unknown) {
    console.error("[widget-message error raw]", err);
    console.error("[widget-message error message]", getErrorMessage(err));

    return jsonResponse(
      {
        success: false,
        error: getErrorMessage(err),
      },
      500
    );
  }
});