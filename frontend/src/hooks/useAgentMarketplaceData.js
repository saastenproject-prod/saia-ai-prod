import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const SELECTED_AGENT_TEMPLATE_KEY = 'nexora_selected_agent_template';

export default function useAgentMarketplaceData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [features, setFeatures] = useState([]);

  const [selectedCategorySlug, setSelectedCategorySlug] = useState('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const fetchMarketplaceData = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: categoryRows, error: categoryError } = await supabase
        .from('agent_categories')
        .select(
          `
          id,
          name,
          slug,
          description,
          icon,
          color,
          sort_order,
          status
        `,
        )
        .eq('status', 'active')
        .order('sort_order', { ascending: true });

      if (categoryError) throw categoryError;

      const categoriesData = categoryRows || [];

      const { data: templateRows, error: templateError } = await supabase
        .from('agent_templates')
        .select(
          `
          id,
          category_id,
          name,
          slug,
          description,
          default_prompt,
          default_role_description,
          default_tone,
          default_language,
          default_greeting_message,
          default_fallback_message,
          recommended_channel,
          default_behavior_config,
          status,
          sort_order,
          metadata
        `,
        )
        .eq('status', 'active')
        .order('sort_order', { ascending: true });

      if (templateError) throw templateError;

      const templatesRaw = templateRows || [];

      const categoryById = categoriesData.reduce((acc, category) => {
        acc[category.id] = category;
        return acc;
      }, {});

      const templatesData = templatesRaw.map((template) => ({
        ...template,
        category: categoryById[template.category_id] || null,
      }));

      const templateIds = templatesData.map((template) => template.id);

      let featureRows = [];

      if (templateIds.length > 0) {
        const { data, error: featureError } = await supabase
          .from('agent_template_features')
          .select(
            `
            id,
            template_id,
            feature_name,
            feature_key,
            feature_type,
            description,
            required_data,
            default_enabled,
            configuration_json,
            sort_order
          `,
          )
          .in('template_id', templateIds)
          .order('sort_order', { ascending: true });

        if (featureError) throw featureError;

        featureRows = data || [];
      }

      console.log('[Agent Marketplace] categories:', categoriesData);
      console.log('[Agent Marketplace] templates:', templatesData);
      console.log('[Agent Marketplace] features:', featureRows);

      setCategories(categoriesData);
      setTemplates(templatesData);
      setFeatures(featureRows);

      const firstTemplate = templatesData[0];

      if (firstTemplate?.id) {
        setSelectedTemplateId((current) => current || firstTemplate.id);
      } else {
        setSelectedTemplateId('');
      }
    } catch (err) {
      console.error('[Agent Marketplace] Fetch error:', err);
      setError(err?.message || 'Failed to fetch agent marketplace data.');

      setCategories([]);
      setTemplates([]);
      setFeatures([]);
      setSelectedTemplateId('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  const filteredTemplates = useMemo(() => {
    if (selectedCategorySlug === 'all') return templates;

    return templates.filter(
      (template) => template.category?.slug === selectedCategorySlug,
    );
  }, [templates, selectedCategorySlug]);

  const selectedTemplate = useMemo(() => {
    return (
      templates.find((template) => template.id === selectedTemplateId) ||
      filteredTemplates[0] ||
      templates[0] ||
      null
    );
  }, [templates, filteredTemplates, selectedTemplateId]);

  const selectedTemplateFeatures = useMemo(() => {
    if (!selectedTemplate?.id) return [];

    return features.filter(
      (feature) => feature.template_id === selectedTemplate.id,
    );
  }, [features, selectedTemplate]);

  const selectCategory = (slug) => {
    setSelectedCategorySlug(slug);

    if (slug === 'all') {
      setSelectedTemplateId(templates[0]?.id || '');
      return;
    }

    const firstTemplateInCategory = templates.find(
      (template) => template.category?.slug === slug,
    );

    setSelectedTemplateId(firstTemplateInCategory?.id || '');
  };

  const selectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
  };

  const saveSelectedTemplate = ({ enabledFeatureIds = [] } = {}) => {
    if (!selectedTemplate?.id) {
      throw new Error('Template belum dipilih.');
    }

    const payload = {
      templateId: selectedTemplate.id,
      templateSlug: selectedTemplate.slug,
      templateName: selectedTemplate.name,

      categoryId: selectedTemplate.category_id,
      categoryName: selectedTemplate.category?.name || '',

      defaultPrompt: selectedTemplate.default_prompt || '',
      defaultRoleDescription: selectedTemplate.default_role_description || '',
      defaultTone: selectedTemplate.default_tone || 'professional',
      defaultLanguage: selectedTemplate.default_language || 'id',
      defaultGreetingMessage: selectedTemplate.default_greeting_message || '',
      defaultFallbackMessage: selectedTemplate.default_fallback_message || '',
      recommendedChannel: selectedTemplate.recommended_channel || 'website',

      defaultBehaviorConfig: selectedTemplate.default_behavior_config || {},

      enabledFeatureIds,

      selectedAt: new Date().toISOString(),
    };

    localStorage.setItem(SELECTED_AGENT_TEMPLATE_KEY, JSON.stringify(payload));

    window.dispatchEvent(
      new CustomEvent('nexora:agent-template-selected', {
        detail: payload,
      }),
    );

    return payload;
  };

  return {
    loading,
    error,

    categories,
    templates,
    features,

    selectedCategorySlug,
    selectedTemplateId,
    selectedTemplate,
    selectedTemplateFeatures,
    filteredTemplates,

    selectCategory,
    selectTemplate,
    saveSelectedTemplate,

    refetch: fetchMarketplaceData,
  };
}
