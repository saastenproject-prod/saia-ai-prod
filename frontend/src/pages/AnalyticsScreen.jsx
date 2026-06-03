import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  MessageSquare, 
  Clock, 
  Smile, 
  Zap, 
  Search, 
  ChevronDown, 
  RefreshCw, 
  Check, 
  ArrowRight,
  TrendingDown,
  Info,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';

export default function AnalyticsScreen({ setScreen }) {
  const [timeframe, setTimeframe] = useState('7d'); // '24h', '7d', '30d'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'paused'
  const [sortBy, setSortBy] = useState('chats'); // 'chats', 'csat', 'response'
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedAgentId, setSelectedAgentId] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'support', 'sales', 'hr'

  // Refresh animation trigger
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Hardcoded timeframe-based stats
  const metricsData = useMemo(() => {
    const data = {
      '24h': {
        totalConversations: '1,240',
        totalConversationsDiff: '+14.2%',
        totalConversationsTrend: 'up',
        avgResponseTime: '0.9s',
        avgResponseTimeDiff: '-12%',
        avgResponseTimeTrend: 'down', // down is good for response time
        csat: '95.1%',
        csatDiff: '+0.8%',
        csatTrend: 'up',
        automationRate: '81.2%',
        automationRateDiff: '+4.5%',
        automationRateTrend: 'up',
        activeSessions: '85 active sessions now',
        responseTimeNote: 'Speed score: Excellent',
        csatNote: 'Based on 420 reviews',
        automationNote: '1,007 chats self-solved'
      },
      '7d': {
        totalConversations: '8,650',
        totalConversationsDiff: '+12.3%',
        totalConversationsTrend: 'up',
        avgResponseTime: '1.2s',
        avgResponseTimeDiff: '-8%',
        avgResponseTimeTrend: 'down',
        csat: '94.2%',
        csatDiff: '+1.4%',
        csatTrend: 'up',
        automationRate: '78.5%',
        automationRateDiff: '+3.1%',
        automationRateTrend: 'up',
        activeSessions: 'Weekly average: 1,235/day',
        responseTimeNote: 'Within 2.0s SLA target',
        csatNote: 'Based on 3,180 reviews',
        automationNote: '6,790 chats self-solved'
      },
      '30d': {
        totalConversations: '36,450',
        totalConversationsDiff: '+28.4%',
        totalConversationsTrend: 'up',
        avgResponseTime: '1.4s',
        avgResponseTimeDiff: '-5%',
        avgResponseTimeTrend: 'down',
        csat: '93.8%',
        csatDiff: '+2.1%',
        csatTrend: 'up',
        automationRate: '76.9%',
        automationRateDiff: '+5.2%',
        automationRateTrend: 'up',
        activeSessions: 'Monthly active users: 22.4k',
        responseTimeNote: 'Consistent performance',
        csatNote: 'Based on 12,850 reviews',
        automationNote: '28,030 chats self-solved'
      }
    };
    return data[timeframe];
  }, [timeframe]);

  // Hardcoded chart data based on timeframe
  const chartData = useMemo(() => {
    const data = {
      '24h': {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
        values: [85, 42, 130, 245, 310, 280, 148],
        automated: [72, 36, 102, 195, 250, 230, 122],
        handoffs: [13, 6, 28, 50, 60, 50, 26]
      },
      '7d': {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        values: [1020, 1180, 1250, 1100, 1450, 1320, 1330],
        automated: [800, 920, 980, 850, 1160, 1040, 1040],
        handoffs: [220, 260, 270, 250, 290, 280, 290]
      },
      '30d': {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        values: [8400, 9100, 9600, 9350],
        automated: [6400, 7000, 7550, 7080],
        handoffs: [2000, 2100, 2050, 2270]
      }
    };
    return data[timeframe];
  }, [timeframe]);

  // SVG Chart Calculation Helpers
  const svgDimensions = { width: 500, height: 200 };
  const chartPath = useMemo(() => {
    const { values } = chartData;
    const maxVal = Math.max(...values) * 1.15;
    const width = svgDimensions.width;
    const height = svgDimensions.height;
    const padding = 20;

    const points = values.map((val, idx) => {
      const x = padding + (idx / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - (val / maxVal) * (height - padding * 2);
      return { x, y };
    });

    if (points.length === 0) return { line: '', area: '', points: [] };

    // Generate smooth cubic bezier curves
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    // Generate filled area path
    const areaPath = `${d} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return { line: d, area: areaPath, points };
  }, [chartData, svgDimensions.height, svgDimensions.width]);

  const [hoveredPointIdx, setHoveredPointIdx] = useState(null);

  // Channels usage breakdown
  const channelData = useMemo(() => {
    const data = {
      '24h': [
        { name: 'Website Widget', count: 720, percent: 58, color: 'bg-blue-600' },
        { name: 'WhatsApp Bot', count: 310, percent: 25, color: 'bg-emerald-500' },
        { name: 'API integrations', count: 150, percent: 12, color: 'bg-violet-500' },
        { name: 'Telegram Bot', count: 60, percent: 5, color: 'bg-sky-400' }
      ],
      '7d': [
        { name: 'Website Widget', count: 4844, percent: 56, color: 'bg-blue-600' },
        { name: 'WhatsApp Bot', count: 2249, percent: 26, color: 'bg-emerald-500' },
        { name: 'API integrations', count: 1038, percent: 12, color: 'bg-violet-500' },
        { name: 'Telegram Bot', count: 519, percent: 6, color: 'bg-sky-400' }
      ],
      '30d': [
        { name: 'Website Widget', count: 19683, percent: 54, color: 'bg-blue-600' },
        { name: 'WhatsApp Bot', count: 9841, percent: 27, color: 'bg-emerald-500' },
        { name: 'API integrations', count: 4738, percent: 13, color: 'bg-violet-500' },
        { name: 'Telegram Bot', count: 2188, percent: 6, color: 'bg-sky-400' }
      ]
    };
    return data[timeframe];
  }, [timeframe]);

  // Agents raw data
  const agentsList = [
    {
      id: 1,
      name: 'FAQ Assistant Bot',
      role: 'support',
      desc: 'Handles routine customer inquiries and common questions automatically.',
      conversations: { '24h': 650, '7d': 4680, '30d': 19200 },
      csat: 94.8,
      responseTime: 0.8,
      status: 'active',
      theme: 'blue',
      recentQueries: [
        { text: 'Bagaimana cara mendaftar akun?', result: 'Self-Solved', time: '10 mins ago' },
        { text: 'Apakah ada paket langganan tahunan?', result: 'Self-Solved', time: '18 mins ago' },
        { text: 'Cara integrasi dengan webhook API?', result: 'Handoff to Human', time: '25 mins ago' }
      ],
      topIntents: [
        { label: 'Akun & Login', rate: 96 },
        { label: 'Harga & Paket', rate: 91 },
        { label: 'Integrasi Dasar', rate: 84 }
      ],
      satisfactionDistribution: { 5: 75, 4: 18, 3: 5, 2: 1, 1: 1 }
    },
    {
      id: 2,
      name: 'Lead Qualifier Agent',
      role: 'sales',
      desc: 'Qualifies incoming marketing leads, collects contact details, and logs to CRM.',
      conversations: { '24h': 380, '7d': 2450, '30d': 10800 },
      csat: 91.5,
      responseTime: 1.2,
      status: 'active',
      theme: 'emerald',
      recentQueries: [
        { text: 'Ingin menjadwalkan demo produk', result: 'Qualified (Meeting Booked)', time: '5 mins ago' },
        { text: 'Berapa biaya untuk 50 agent?', result: 'Qualified', time: '40 mins ago' },
        { text: 'Saya butuh bantuan refund dana', result: 'Handoff to Support', time: '1 hour ago' }
      ],
      topIntents: [
        { label: 'Demo Request', rate: 94 },
        { label: 'Enterprise Pricing', rate: 88 },
        { label: 'CRM Sync', rate: 82 }
      ],
      satisfactionDistribution: { 5: 64, 4: 25, 3: 7, 2: 3, 1: 1 }
    },
    {
      id: 3,
      name: 'Router Concierge Bot',
      role: 'support',
      desc: 'Welcomes visitors and routes them to correct departments or specialized bots.',
      conversations: { '24h': 120, '7d': 980, '30d': 4100 },
      csat: 96.4,
      responseTime: 0.5,
      status: 'active',
      theme: 'violet',
      recentQueries: [
        { text: 'Halo saya butuh bantuan billing', result: 'Routed to Billing', time: '2 mins ago' },
        { text: 'Ingin bicara dengan tim marketing', result: 'Routed to Sales', time: '12 mins ago' },
        { text: 'Sistem error 500', result: 'Routed to Tech Support', time: '15 mins ago' }
      ],
      topIntents: [
        { label: 'Greeting / Welcome', rate: 99 },
        { label: 'Department Routing', rate: 97 },
        { label: 'Language Select', rate: 95 }
      ],
      satisfactionDistribution: { 5: 84, 4: 12, 3: 3, 2: 1, 0: 0 }
    },
    {
      id: 4,
      name: 'Internal HR Assistant',
      role: 'hr',
      desc: 'Automates employee onboarding steps, policies distribution, and FAQ lookup.',
      conversations: { '24h': 65, '7d': 390, '30d': 1650 },
      csat: 92.0,
      responseTime: 1.5,
      status: 'active',
      theme: 'cyan',
      recentQueries: [
        { text: 'Cara klaim asuransi gigi', result: 'Self-Solved', time: '3 hours ago' },
        { text: 'Kebijakan cuti melahirkan', result: 'Self-Solved', time: '5 hours ago' },
        { text: 'Slip gaji bulan Mei belum muncul', result: 'Handoff to HR Admin', time: '1 day ago' }
      ],
      topIntents: [
        { label: 'Benefit Claims', rate: 90 },
        { label: 'Leave Policy', rate: 95 },
        { label: 'Payroll Info', rate: 87 }
      ],
      satisfactionDistribution: { 5: 68, 4: 21, 3: 8, 2: 2, 1: 1 }
    },
    {
      id: 5,
      name: 'CSAT Collector Bot',
      role: 'sales',
      desc: 'Collects NPS and feedback surveys post-conversation with human agents.',
      conversations: { '24h': 25, '7d': 150, '30d': 700 },
      csat: 97.2,
      responseTime: 0.6,
      status: 'paused',
      theme: 'amber',
      recentQueries: [
        { text: '5 - Sangat puas dengan layanan', result: 'Survey Saved', time: '2 days ago' },
        { text: '2 - Respon lambat sekali', result: 'Flagged / Saved', time: '2 days ago' },
        { text: '4 - Cukup baik', result: 'Survey Saved', time: '3 days ago' }
      ],
      topIntents: [
        { label: 'Rating Submit', rate: 98 },
        { label: 'Text Feedback', rate: 95 },
        { label: 'Unsubscribe survey', rate: 92 }
      ],
      satisfactionDistribution: { 5: 88, 4: 8, 3: 3, 2: 1, 1: 0 }
    }
  ];

  // Filtering and Sorting logic for Agent Performance
  const filteredAndSortedAgents = useMemo(() => {
    let result = agentsList.filter(agent => {
      // Search matches
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            agent.desc.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Role filter tab
      const matchesTab = activeTab === 'all' || agent.role === activeTab;

      // Status filter dropdown
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;

      return matchesSearch && matchesTab && matchesStatus;
    });

    // Sorting
    result.sort((a, b) => {
      let aVal, bVal;

      if (sortBy === 'chats') {
        aVal = a.conversations[timeframe];
        bVal = b.conversations[timeframe];
      } else if (sortBy === 'csat') {
        aVal = a.csat;
        bVal = b.csat;
      } else if (sortBy === 'response') {
        aVal = a.responseTime;
        bVal = b.responseTime;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [searchQuery, activeTab, statusFilter, sortBy, sortOrder, timeframe]);

  // Selected agent details
  const selectedAgent = useMemo(() => {
    return agentsList.find(a => a.id === selectedAgentId) || agentsList[0];
  }, [selectedAgentId]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl px-8 h-16 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-full bg-blue-600 block"></span>
            Analytics & Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor system usage, chatbot response, and performance analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            {[
              { key: '24h', label: 'Last 24H' },
              { key: '7d', label: '7 Days' },
              { key: '30d', label: '30 Days' }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTimeframe(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeframe === t.key
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 text-xs font-bold transition flex items-center gap-2"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {/* Main Content Scroll Area */}
      <div className="flex-1 px-8 py-7 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* Metric Cards Row */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              label: 'Total Conversations',
              value: metricsData.totalConversations,
              diff: metricsData.totalConversationsDiff,
              trend: metricsData.totalConversationsTrend,
              desc: metricsData.activeSessions,
              icon: MessageSquare,
              color: 'text-blue-600 bg-blue-50 border-blue-100'
            },
            {
              label: 'Avg Response Time',
              value: metricsData.avgResponseTime,
              diff: metricsData.avgResponseTimeDiff,
              trend: metricsData.avgResponseTimeTrend,
              desc: metricsData.responseTimeNote,
              icon: Clock,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
            },
            {
              label: 'Satisfaction Score (CSAT)',
              value: metricsData.csat,
              diff: metricsData.csatDiff,
              trend: metricsData.csatTrend,
              desc: metricsData.csatNote,
              icon: Smile,
              color: 'text-amber-600 bg-amber-50 border-amber-100'
            },
            {
              label: 'Automation Rate',
              value: metricsData.automationRate,
              diff: metricsData.automationRateDiff,
              trend: metricsData.automationRateTrend,
              desc: metricsData.automationNote,
              icon: Zap,
              color: 'text-violet-600 bg-violet-50 border-violet-100'
            }
          ].map((metric) => {
            const Icon = metric.icon;
            const isGoodTrend = (metric.trend === 'up' && metric.label !== 'Avg Response Time') || 
                                (metric.trend === 'down' && metric.label === 'Avg Response Time');
            
            return (
              <div
                key={metric.label}
                className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition duration-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{metric.label}</span>
                    <p className="mt-2 text-3xl font-black text-slate-900 tracking-tight">{metric.value}</p>
                  </div>
                  <div className={`h-11 w-11 rounded-2xl border ${metric.color} grid place-items-center`}>
                    <Icon size={20} />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-400 font-medium">{metric.desc}</span>
                  <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
                    isGoodTrend ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {isGoodTrend ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {metric.diff}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Charts & Channels Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Usage Chart */}
          <div className="lg:col-span-2 rounded-[2rem] border border-slate-200/85 bg-white p-6 shadow-sm flex flex-col justify-between min-h-[360px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Track Usage Volume</h3>
                <p className="text-xs text-slate-500 mt-0.5">Conversations traffic volume overview.</p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                  Total Inbound
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600/30"></span>
                  Automated
                </span>
              </div>
            </div>

            {/* SVG Render */}
            <div className="relative flex-1 mt-6 flex flex-col justify-end">
              <svg 
                viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`} 
                className="w-full h-44 overflow-visible"
              >
                {/* Defs for Gradients */}
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = 20 + ratio * (svgDimensions.height - 40);
                  return (
                    <line 
                      key={ratio}
                      x1="20" 
                      y1={y} 
                      x2={svgDimensions.width - 20} 
                      y2={y} 
                      stroke="#f1f5f9" 
                      strokeWidth="1" 
                    />
                  );
                })}

                {/* Filled Gradient Area */}
                <path d={chartPath.area} fill="url(#chartGradient)" />

                {/* Stroke Line */}
                <path 
                  d={chartPath.line} 
                  fill="none" 
                  stroke="#2563eb" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Dots / Interactive Points */}
                {chartPath.points.map((p, idx) => {
                  const isHovered = hoveredPointIdx === idx;
                  return (
                    <g key={idx}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 8 : 4.5}
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        className="transition-all duration-150 cursor-pointer drop-shadow-sm"
                        onMouseEnter={() => setHoveredPointIdx(idx)}
                        onMouseLeave={() => setHoveredPointIdx(null)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip Popup on Hover */}
              {hoveredPointIdx !== null && (
                <div 
                  className="absolute bg-slate-900 text-white rounded-xl p-3 shadow-xl text-xs z-30 pointer-events-none space-y-1"
                  style={{
                    left: `${(hoveredPointIdx / (chartData.values.length - 1)) * 90 + 2}%`,
                    bottom: '115px'
                  }}
                >
                  <p className="font-bold text-[10px] text-slate-400 uppercase">{chartData.labels[hoveredPointIdx]}</p>
                  <p className="font-black text-white text-sm">{chartData.values[hoveredPointIdx]} chats</p>
                  <div className="border-t border-white/10 my-1 pt-1 text-[10px] text-slate-300">
                    <p>🤖 Auto-Solved: {chartData.automated[hoveredPointIdx]}</p>
                    <p>👤 Handoffs: {chartData.handoffs[hoveredPointIdx]}</p>
                  </div>
                </div>
              )}

              {/* X Axis Labels */}
              <div className="flex justify-between px-3 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {chartData.labels.map((label, idx) => (
                  <span key={idx}>{label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Channels Handoff Breakdown */}
          <div className="rounded-[2rem] border border-slate-200/85 bg-white p-6 shadow-sm flex flex-col min-h-[360px]">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 font-bold">Channel Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">Most active messaging touchpoints.</p>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-5 mt-4">
              {channelData.map((channel) => (
                <div key={channel.name} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${channel.color}`}></span>
                      {channel.name}
                    </span>
                    <span>
                      {channel.count.toLocaleString()} <span className="text-slate-400 font-medium">({channel.percent}%)</span>
                    </span>
                  </div>

                  {/* Progress bar container */}
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${channel.color} transition-all duration-700`}
                      style={{ width: `${channel.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start gap-2.5 mt-4 text-xs text-slate-500 leading-5">
              <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
              <p>
                Website Widget remains the primary communication channel, capturing over half of all conversations.
              </p>
            </div>
          </div>
        </section>

        {/* Agent Performance Section with Detail Panel Layout */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          
          {/* Main List Table (Col Span 2) */}
          <div className="xl:col-span-2 rounded-[2rem] border border-slate-200/85 bg-white overflow-hidden shadow-sm">
            
            {/* Header controls */}
            <div className="p-6 border-b border-slate-200/60 bg-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">AI Agent Performance</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Performance breakdown for individual custom bots.</p>
                </div>
                
                {/* Search Agent */}
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search agents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full md:w-56 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Sub-Header Tabs & Filters */}
              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-5 border-t border-slate-100">
                
                {/* Category Tabs */}
                <div className="flex gap-2">
                  {[
                    { key: 'all', label: 'All Agents' },
                    { key: 'support', label: 'Customer Support' },
                    { key: 'sales', label: 'Lead Gen & Sales' },
                    { key: 'hr', label: 'Human Resources' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`h-8 px-4 rounded-lg text-xs font-bold transition-all ${
                        activeTab === tab.key
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <span>Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 pl-2 pr-6 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Performance Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Agent Name</th>
                    <th className="py-4 px-4 cursor-pointer hover:text-slate-700" onClick={() => toggleSort('chats')}>
                      <div className="flex items-center gap-1">
                        Chats Handled
                        <ArrowUpDown size={12} className={sortBy === 'chats' ? 'text-blue-600' : ''} />
                      </div>
                    </th>
                    <th className="py-4 px-4 cursor-pointer hover:text-slate-700" onClick={() => toggleSort('csat')}>
                      <div className="flex items-center gap-1">
                        CSAT Score
                        <ArrowUpDown size={12} className={sortBy === 'csat' ? 'text-blue-600' : ''} />
                      </div>
                    </th>
                    <th className="py-4 px-4 cursor-pointer hover:text-slate-700" onClick={() => toggleSort('response')}>
                      <div className="flex items-center gap-1">
                        Avg Response
                        <ArrowUpDown size={12} className={sortBy === 'response' ? 'text-blue-600' : ''} />
                      </div>
                    </th>
                    <th className="py-4 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedAgents.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-sm font-semibold text-slate-500 bg-white">
                        No agents match search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedAgents.map((agent) => {
                      const isSelected = selectedAgentId === agent.id;
                      const chatsCount = agent.conversations[timeframe];

                      return (
                        <tr
                          key={agent.id}
                          onClick={() => setSelectedAgentId(agent.id)}
                          className={`cursor-pointer hover:bg-slate-50/80 transition duration-150 ${
                            isSelected ? 'bg-blue-50/50 font-semibold' : ''
                          }`}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {/* Avatar Initials with color theme */}
                              <div className={`h-9 w-9 rounded-xl font-black text-xs grid place-items-center shadow-sm text-white ${
                                agent.theme === 'blue' ? 'bg-blue-600' :
                                agent.theme === 'emerald' ? 'bg-emerald-500' :
                                agent.theme === 'violet' ? 'bg-violet-600' :
                                agent.theme === 'cyan' ? 'bg-cyan-500' : 'bg-amber-500'
                              }`}>
                                {agent.name.split(' ').map(n => n[0]).slice(0,2).join('')}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{agent.name}</p>
                                <p className="text-[10px] font-semibold text-slate-400 capitalize">{agent.role}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="text-sm font-black text-slate-800">{chatsCount.toLocaleString()}</span>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <Smile size={14} className="text-amber-500" />
                              <span className="text-sm font-black text-slate-800">{agent.csat}%</span>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="text-sm font-black text-slate-800">{agent.responseTime}s</span>
                          </td>

                          <td className="py-4 px-6 text-right">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                              agent.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {agent.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Agent Details Panel Sidebar */}
          <div className="rounded-[2rem] border border-slate-200/85 bg-white p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-5">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-md">
                Selected Agent Profile
              </span>
              
              <div className="flex items-center gap-3.5 mt-4">
                <div className={`h-11 w-11 rounded-2xl font-black text-sm grid place-items-center shadow-sm text-white ${
                  selectedAgent.theme === 'blue' ? 'bg-blue-600' :
                  selectedAgent.theme === 'emerald' ? 'bg-emerald-500' :
                  selectedAgent.theme === 'violet' ? 'bg-violet-600' :
                  selectedAgent.theme === 'cyan' ? 'bg-cyan-500' : 'bg-amber-500'
                }`}>
                  {selectedAgent.name.split(' ').map(n => n[0]).slice(0,2).join('')}
                </div>

                <div>
                  <h4 className="font-black text-slate-900">{selectedAgent.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">{selectedAgent.role} Bot</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-4 leading-6">
                {selectedAgent.desc}
              </p>
            </div>

            {/* Satisfaction Distribution bar chart */}
            <div>
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">CSAT Rating Breakdown</h5>
              <div className="mt-3 space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const percent = selectedAgent.satisfactionDistribution[stars] || 0;
                  return (
                    <div key={stars} className="flex items-center gap-2.5 text-xs text-slate-500">
                      <span className="w-3 text-right font-bold">{stars}★</span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-semibold">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Intents */}
            <div>
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Top Intents Match Success</h5>
              <div className="space-y-3">
                {selectedAgent.topIntents.map((intent, index) => (
                  <div key={index} className="flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-xs font-bold text-slate-700">{intent.label}</span>
                    <span className="text-xs font-black text-emerald-600">{intent.rate}% Resolution</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Queries Feed */}
            <div>
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Recent Conversation Feed</h5>
              <div className="space-y-3">
                {selectedAgent.recentQueries.map((query, index) => (
                  <div key={index} className="rounded-xl border border-slate-100 p-3 space-y-2">
                    <p className="text-xs font-bold text-slate-800 leading-relaxed italic">
                      "{query.text}"
                    </p>
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 pt-1 border-t border-slate-50">
                      <span className={`font-bold ${
                        query.result.includes('Self-Solved') || query.result.includes('Qualified') || query.result.includes('Survey')
                          ? 'text-emerald-600' 
                          : 'text-amber-600'
                      }`}>
                        {query.result}
                      </span>
                      <span>{query.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manage Agent Action button */}
            <button
              onClick={() => {
                // Setting screen to builder to simulate managing this bot
                setScreen('builder');
              }}
              className="w-full h-11 rounded-2xl bg-slate-950 text-white font-black text-xs hover:bg-slate-900 transition flex items-center justify-center gap-2"
            >
              Open Bot Builder
              <ArrowRight size={14} />
            </button>

          </div>

        </section>

      </div>
    </div>
  );
}
