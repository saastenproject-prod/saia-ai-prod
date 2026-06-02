import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECTED_BOT_KEY = "nexora_selected_bot_id";

const buildWidgetKey = (botId) => {
  return `bot_${botId}_widget`;
};

const dispatchBotCreated = (botId) => {
  if (!botId) return;

  localStorage.setItem(SELECTED_BOT_KEY, botId);

  window.dispatchEvent(
    new CustomEvent("nexora:bot-created", {
      detail: {
        botId,
      },
    })
  );

  window.dispatchEvent(
    new CustomEvent("nexora:selected-bot-changed", {
      detail: {
        botId,
      },
    })
  );
};

const normalizeLanguage = (value) => {
  if (!value) return "Indonesian";

  const normalized = String(value).toLowerCase();

  if (normalized === "id") return "Indonesian";
  if (normalized === "en") return "English";
  if (normalized === "auto") return "Auto";

  return value;
};

const normalizeTone = (value) => {
  if (!value) return "Professional";

  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
};

const buildDefaultDescription = ({ description, useCase }) => {
  if (description?.trim()) return description.trim();

  return `Chatbot for ${String(useCase || "customer_support").replaceAll(
    "_",
    " "
  )} use case.`;
};

const buildDefaultGreeting = ({ defaultGreetingMessage, botName }) => {
  return (
    defaultGreetingMessage ||
    `Hi! Welcome to ${botName}. How can we help you today?`
  );
};

const buildFallbackMessage = ({ defaultFallbackMessage }) => {
  return (
    defaultFallbackMessage ||
    "Informasi tersebut belum tersedia di knowledge base saya. Saya bisa bantu teruskan ke agent."
  );
};

const normalizeArrayConfig = (value) => {
  if (Array.isArray(value)) return value;

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const getTemplateHandoffTarget = ({ templateSlug, behaviorConfig }) => {
  if (behaviorConfig?.handoff_target) return behaviorConfig.handoff_target;

  if (templateSlug === "sales-agent") return "Sales Team";
  if (templateSlug === "hr-management-agent") return "HR Team";
  if (templateSlug === "finance-agent") return "Finance Team";
  if (templateSlug === "it-support-agent") return "IT Support Team";
  if (templateSlug === "e-commerce-agent") return "Commerce Support Team";

  return "Support Agent";
};

const getTemplatePricingHandoff = ({ templateSlug }) => {
  return templateSlug === "sales-agent";
};

const getFlowNameByTemplate = (templateSlug) => {
  if (templateSlug === "sales-agent") return "Sales Agent Flow";
  if (templateSlug === "hr-management-agent") return "HR Management Flow";
  if (templateSlug === "finance-agent") return "Finance Agent Flow";
  if (templateSlug === "it-support-agent") return "IT Support Flow";
  if (templateSlug === "e-commerce-agent") return "E-Commerce Agent Flow";

  return "Answer Customer Queries";
};

const getHandoffTargetKeyByTemplate = (templateSlug) => {
  if (templateSlug === "sales-agent") return "sales_team";
  if (templateSlug === "hr-management-agent") return "hr_team";
  if (templateSlug === "finance-agent") return "finance_team";
  if (templateSlug === "it-support-agent") return "it_support_team";
  if (templateSlug === "e-commerce-agent") return "commerce_support_team";

  return "support_agent";
};

export default function useCreateChatbot() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getCurrentWorkspace = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error("User belum login.");
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("workspace_members")
      .select(
        `
        id,
        role,
        status,
        workspace:workspaces (
          id,
          name,
          slug,
          plan,
          status
        )
      `
      )
      .eq("profile_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (membershipError) throw membershipError;

    const workspace = memberships?.[0]?.workspace;

    if (!workspace?.id) {
      throw new Error("Workspace aktif tidak ditemukan.");
    }

    return {
      user,
      workspace,
    };
  };

  const createTemplateFeaturesForBot = async ({
    workspaceId,
    botId,
    enabledFeatureIds,
  }) => {
    if (!enabledFeatureIds?.length) return [];

    const { data: templateFeatures, error: featureFetchError } = await supabase
      .from("agent_template_features")
      .select(
        `
        id,
        feature_name,
        feature_key,
        feature_type,
        description,
        required_data,
        default_enabled,
        configuration_json,
        sort_order
      `
      )
      .in("id", enabledFeatureIds)
      .order("sort_order", { ascending: true });

    if (featureFetchError) throw featureFetchError;

    const rows = (templateFeatures || []).map((feature) => ({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      bot_id: botId,
      template_feature_id: feature.id,
      feature_name: feature.feature_name,
      feature_key: feature.feature_key,
      feature_type: feature.feature_type,
      description: feature.description,
      required_data: feature.required_data,
      is_enabled: true,
      configuration_json: feature.configuration_json || {},
    }));

    if (!rows.length) return [];

    const { data: insertedFeatures, error: insertFeatureError } = await supabase
      .from("bot_features")
      .insert(rows)
      .select();

    if (insertFeatureError) throw insertFeatureError;

    return insertedFeatures || [];
  };

  const createAiSettingsForBot = async ({
    workspaceId,
    botId,
    botName,
    description,
    defaultPrompt,
    defaultRoleDescription,
    defaultTone,
    defaultLanguage,
    defaultFallbackMessage,
    categoryName,
    templateSlug,
    defaultBehaviorConfig = {},
  }) => {
    const behaviorConfig = defaultBehaviorConfig || {};

    const mainInstruction =
      defaultPrompt ||
      description ||
      "Anda adalah AI customer support. Jawab pertanyaan customer berdasarkan knowledge base yang tersedia.";

    const roleDescription =
      defaultRoleDescription || "Customer support assistant";

    const language = normalizeLanguage(defaultLanguage);
    const tone = normalizeTone(defaultTone);
    const fallbackMessage = buildFallbackMessage({ defaultFallbackMessage });

    const agentRole = behaviorConfig.agent_role || "";
    const department = behaviorConfig.department || "";
    const primaryAudience = behaviorConfig.primary_audience || "";
    const responseStyle = behaviorConfig.response_style || "";
    const empathyLevel = behaviorConfig.empathy_level || "";
    const formalityLevel = behaviorConfig.formality_level || "";
    const knowledgeMode = behaviorConfig.knowledge_mode || "";
    const unknownAnswerBehavior =
      behaviorConfig.unknown_answer_behavior || "";
    const customInstruction = behaviorConfig.custom_instruction || "";

    const forbiddenTopics = normalizeArrayConfig(
      behaviorConfig.forbidden_topics
    );
    const sensitiveTopics = normalizeArrayConfig(
      behaviorConfig.sensitive_topics
    );
    const escalationTopics = normalizeArrayConfig(
      behaviorConfig.escalation_topics
    );
    const neverPromise = normalizeArrayConfig(behaviorConfig.never_promise);
    const restrictedClaims = normalizeArrayConfig(
      behaviorConfig.restricted_claims
    );

    const handoffTarget = getTemplateHandoffTarget({
      templateSlug,
      behaviorConfig,
    });

    const { data: aiSetting, error: aiSettingError } = await supabase
      .from("ai_settings")
      .insert({
        workspace_id: workspaceId,
        bot_id: botId,

        ai_name: botName,
        company_name: "",
        default_language: language,
        tone,
        role_description: roleDescription,

        agent_role: agentRole,
        department,
        primary_audience: primaryAudience,
        response_style: responseStyle,
        empathy_level: empathyLevel,
        formality_level: formalityLevel,
        knowledge_mode: knowledgeMode,
        unknown_answer_behavior: unknownAnswerBehavior,
        forbidden_topics: forbiddenTopics,
        sensitive_topics: sensitiveTopics,
        escalation_topics: escalationTopics,
        never_promise: neverPromise,
        restricted_claims: restrictedClaims,
        custom_instruction: customInstruction,

        main_instruction: mainInstruction,
        business_context: categoryName
          ? `This bot is created from the ${categoryName} agent template.`
          : "",

        restrictions:
          "Jangan mengarang informasi. Jangan menjanjikan harga, diskon, timeline, scope implementasi, SLA, atau komitmen lain jika tidak tersedia di knowledge base. Jika informasi tidak tersedia, gunakan fallback message dan arahkan ke agent manusia.",

        fallback_message: fallbackMessage,

        answer_length: "Medium",
        handoff_target: handoffTarget,
        confidence_threshold: 0.7,

        use_bullet_points: true,
        ask_follow_up_question: true,
        show_knowledge_sources: false,

        handoff_when_no_answer: true,
        handoff_when_customer_asks_human: true,
        handoff_for_pricing_proposal: getTemplatePricingHandoff({
          templateSlug,
        }),
      })
      .select()
      .single();

    if (aiSettingError) throw aiSettingError;

    return aiSetting;
  };

  const createDefaultFlow = async ({
    botId,
    botName,
    defaultGreetingMessage,
    templateSlug,
  }) => {
    const flowId = crypto.randomUUID();

    const flowName = getFlowNameByTemplate(templateSlug);

    const flowDescription =
      "Default AI agent flow generated from Nexora template.";

    const { data: flow, error: flowError } = await supabase
      .from("flows")
      .insert({
        id: flowId,
        bot_id: botId,
        name: flowName,
        description: flowDescription,
        flow_type: "main",
        status: "published",
        is_default: true,
        version: 1,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (flowError) throw flowError;

    const startNodeId = crypto.randomUUID();
    const aiAgentNodeId = crypto.randomUUID();
    const humanHandoffNodeId = crypto.randomUUID();
    const endNodeId = crypto.randomUUID();

    const greetingMessage = buildDefaultGreeting({
      defaultGreetingMessage,
      botName,
    });

    const nodes = [
      {
        id: startNodeId,
        flow_id: flow.id,
        node_key: "start",
        node_type: "start",
        label: "Start",
        description: "Customer starts a new conversation",
        position_x: 80,
        position_y: 240,
        config: {
          message: "Customer starts a new conversation",
        },
      },
      {
        id: aiAgentNodeId,
        flow_id: flow.id,
        node_key: "ai_agent",
        node_type: "ai_agent",
        label: "AI Agent",
        description:
          "Answer customer questions using approved knowledge sources.",
        position_x: 410,
        position_y: 220,
        config: {
          instruction:
            "Answer the customer question using approved knowledge sources. If unsure, route to human handoff.",
          greeting_message: greetingMessage,
        },
      },
      {
        id: humanHandoffNodeId,
        flow_id: flow.id,
        node_key: "human_handoff",
        node_type: "human_handoff",
        label: "Human Handoff",
        description: "Send conversation to available human agent.",
        position_x: 760,
        position_y: 110,
        config: {
          message:
            "Please wait a moment. We are connecting you to an available agent.",
          handoff_target: getHandoffTargetKeyByTemplate(templateSlug),
        },
      },
      {
        id: endNodeId,
        flow_id: flow.id,
        node_key: "end_conversation",
        node_type: "end",
        label: "End Conversation",
        description: "End the conversation politely.",
        position_x: 760,
        position_y: 350,
        config: {
          message: "Thank you. Have a great day!",
        },
      },
    ];

    const { error: nodeError } = await supabase
      .from("flow_nodes")
      .insert(nodes);

    if (nodeError) throw nodeError;

    const edges = [
      {
        id: crypto.randomUUID(),
        flow_id: flow.id,
        source_node_id: startNodeId,
        target_node_id: aiAgentNodeId,
        label: "Start",
        condition: {},
      },
      {
        id: crypto.randomUUID(),
        flow_id: flow.id,
        source_node_id: aiAgentNodeId,
        target_node_id: humanHandoffNodeId,
        label: "Fallback",
        condition: {
          route: "fallback",
        },
      },
      {
        id: crypto.randomUUID(),
        flow_id: flow.id,
        source_node_id: aiAgentNodeId,
        target_node_id: endNodeId,
        label: "Resolved",
        condition: {
          route: "resolved",
        },
      },
    ];

    const { error: edgeError } = await supabase
      .from("flow_edges")
      .insert(edges);

    if (edgeError) throw edgeError;

    return flow;
  };

  const createChatbot = async ({
    name,
    description,

    botType = "customer_support",
    channelType = "website",
    useCase = "customer_support",

    templateId = null,
    templateSlug = null,
    categoryId = null,
    categoryName = null,

    defaultPrompt = null,
    defaultRoleDescription = null,
    defaultTone = "professional",
    defaultLanguage = "id",
    defaultGreetingMessage = null,
    defaultFallbackMessage = null,
    defaultBehaviorConfig = {},

    enabledFeatureIds = [],
  }) => {
    setLoading(true);
    setError("");

    try {
      if (!name?.trim()) {
        throw new Error("Nama chatbot wajib diisi.");
      }

      const { workspace } = await getCurrentWorkspace();

      const botName = name.trim();
      const botDescription = buildDefaultDescription({
        description,
        useCase,
      });

      const botId = crypto.randomUUID();
      const channelId = crypto.randomUUID();
      const widgetSettingId = crypto.randomUUID();

      const botConfig = {
        useCase,
        createdFrom: templateId
          ? "agent_template_marketplace"
          : "create_chatbot_flow",
        templateSlug,
        categoryName,
        enabledFeatureIds,
        defaultBehaviorConfig,
      };

      const { data: bot, error: botError } = await supabase
        .from("bots")
        .insert({
          id: botId,
          workspace_id: workspace.id,
          category_id: categoryId || null,
          template_id: templateId || null,
          name: botName,
          description: botDescription,

          // Keep this compatible with existing bots_bot_type_check constraint.
          // Business template identity is stored in category_id, template_id, and config.
          bot_type: "customer_support",

          status: "active",
          config: botConfig,
        })
        .select()
        .single();

      if (botError) throw botError;

      const flow = await createDefaultFlow({
        botId: bot.id,
        botName,
        defaultGreetingMessage,
        templateSlug,
      });

      const { error: channelError } = await supabase.from("channels").insert({
        id: channelId,
        bot_id: bot.id,
        name: channelType === "whatsapp" ? "WhatsApp" : "Website",
        channel_type: channelType,
        provider: channelType === "whatsapp" ? "waba" : "web_widget",
        status: channelType === "website" ? "active" : "setup_needed",
        config: {
          createdFrom: templateId
            ? "agent_template_marketplace"
            : "create_chatbot_flow",
          templateSlug,
        },
      });

      if (channelError) throw channelError;

      const greetingMessage = buildDefaultGreeting({
        defaultGreetingMessage,
        botName,
      });

      const { data: widgetSetting, error: widgetError } = await supabase
        .from("widget_settings")
        .insert({
          id: widgetSettingId,
          bot_id: bot.id,
          widget_key: buildWidgetKey(bot.id),
          title: botName,
          subtitle: "Online",
          greeting_message: greetingMessage,
          primary_color: "#2563eb",
          position: "bottom-right",
          is_active: channelType === "website",
          config: {
            createdFrom: templateId
              ? "agent_template_marketplace"
              : "create_chatbot_flow",
            templateSlug,
          },
        })
        .select()
        .single();

      if (widgetError) throw widgetError;

      const aiSetting = await createAiSettingsForBot({
        workspaceId: workspace.id,
        botId: bot.id,
        botName,
        description: botDescription,
        defaultPrompt,
        defaultRoleDescription,
        defaultTone,
        defaultLanguage,
        defaultFallbackMessage,
        categoryName,
        templateSlug,
        defaultBehaviorConfig,
      });

      const botFeatures = await createTemplateFeaturesForBot({
        workspaceId: workspace.id,
        botId: bot.id,
        enabledFeatureIds,
      });

      dispatchBotCreated(bot.id);

      return {
        bot,
        flow,
        widgetSetting,
        aiSetting,
        botFeatures,
      };
    } catch (err) {
      console.error("[useCreateChatbot] create error:", err);
      setError(err?.message || "Failed to create chatbot.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createChatbot,
  };
}