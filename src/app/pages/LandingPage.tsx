import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  ArrowRight,
  Check,
  Star,
  Sparkles,
  Zap,
  Shield,
  Users,
  TrendingUp,
  BarChart3,
  Package,
  ShoppingCart,
  DollarSign,
  Brain,
  Clock,
  Globe,
  Smartphone,
  Lock,
  Cloud,
  Bell,
  FileText,
  Building2,
  ChevronRight,
  Play,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  CheckCircle,
  Rocket,
  Target,
  Award,
  TrendingDown,
  PieChart,
  Activity,
} from "lucide-react";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { HeroCyberpunkBackground } from "../components/HeroCyberpunkBackground";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Sample data for animated charts
const revenueData = [
  { month: "Jan", value: 45000 },
  { month: "Feb", value: 52000 },
  { month: "Mar", value: 61000 },
  { month: "Apr", value: 58000 },
  { month: "May", value: 71000 },
  { month: "Jun", value: 85000 },
];

const growthData = [
  { name: "Q1", growth: 23 },
  { name: "Q2", growth: 45 },
  { name: "Q3", growth: 67 },
  { name: "Q4", growth: 89 },
];

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const [pricingInterval, setPricingInterval] = useState<"monthly" | "yearly">("monthly");
  const [activeModule, setActiveModule] = useState(0);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const features = [
    {
      icon: Brain,
      titleKey: "AI Assistant",
      descKey: "Intelligent AI-powered assistant for data analysis and insights",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Package,
      titleKey: "Inventory Management",
      descKey: "Real-time stock tracking with automated alerts",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: ShoppingCart,
      titleKey: "Sales & POS",
      descKey: "Streamlined point of sale with integrated payments",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Users,
      titleKey: "HR & Payroll",
      descKey: "Complete employee management and payroll automation",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: DollarSign,
      titleKey: "Accounting & Finance",
      descKey: "Advanced financial management and reporting",
      color: "from-yellow-500 to-orange-500",
    },
    {
      icon: BarChart3,
      titleKey: "CRM",
      descKey: "Customer relationship management with sales pipeline",
      color: "from-pink-500 to-rose-500",
    },
    {
      icon: FileText,
      titleKey: "Reports & Analytics",
      descKey: "Comprehensive business intelligence dashboards",
      color: "from-indigo-500 to-purple-500",
    },
    {
      icon: Building2,
      titleKey: "Multi-Branch",
      descKey: "Centralized management for multiple locations",
      color: "from-teal-500 to-cyan-500",
    },
    {
      icon: Cloud,
      titleKey: "Cloud Infrastructure",
      descKey: "Secure cloud-based with 99.9% uptime",
      color: "from-blue-500 to-indigo-500",
    },
    {
      icon: Lock,
      titleKey: "Permission System",
      descKey: "Role-based access control for security",
      color: "from-red-500 to-pink-500",
    },
    {
      icon: Smartphone,
      titleKey: "Mobile Access",
      descKey: "Full mobile app for iOS and Android",
      color: "from-green-500 to-teal-500",
    },
    {
      icon: Bell,
      titleKey: "Real-time Notifications",
      descKey: "Instant alerts for important events",
      color: "from-purple-500 to-blue-500",
    },
  ];

  const modules = [
    { name: "Dashboard", icon: Activity },
    { name: "Inventory", icon: Package },
    { name: "Sales", icon: ShoppingCart },
    { name: "Purchases", icon: TrendingDown },
    { name: "Finance", icon: DollarSign },
    { name: "HR", icon: Users },
    { name: "CRM", icon: Users },
    { name: "POS", icon: ShoppingCart },
    { name: "Reports", icon: BarChart3 },
    { name: "AI Analytics", icon: Brain },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      nameAr: "المبتدئ",
      price: 99,
      yearlyPrice: 990,
      features: [
        "Small businesses",
        "Basic ERP modules",
        "5 users",
        "Basic reports",
        "Email support",
      ],
      featuresAr: [
        "للشركات الصغيرة",
        "وحدات ERP أساسية",
        "5 مستخدمين",
        "تقارير أساسية",
        "دعم عبر البريد",
      ],
      recommended: false,
    },
    {
      name: "Business",
      nameAr: "الأعمال",
      price: 299,
      yearlyPrice: 2990,
      features: [
        "Medium companies",
        "Advanced modules",
        "Unlimited users",
        "AI analytics",
        "API integrations",
        "Priority support",
      ],
      featuresAr: [
        "للشركات المتوسطة",
        "وحدات متقدمة",
        "مستخدمين غير محدودين",
        "تحليلات AI",
        "تكامل API",
        "دعم أولوية",
      ],
      recommended: true,
    },
    {
      name: "Enterprise",
      nameAr: "المؤسسات",
      price: 999,
      yearlyPrice: 9990,
      features: [
        "Large organizations",
        "Full ERP ecosystem",
        "Dedicated infrastructure",
        "AI automation",
        "Multi-branch support",
        "Custom integrations",
        "Dedicated account manager",
      ],
      featuresAr: [
        "للمؤسسات الكبيرة",
        "نظام ERP كامل",
        "بنية تحتية مخصصة",
        "أتمتة AI",
        "دعم متعدد الفروع",
        "تكاملات مخصصة",
        "مدير حساب مخصص",
      ],
      recommended: false,
    },
  ];

  const testimonials = [
    {
      name: "Ahmed Al-Mansouri",
      nameAr: "أحمد المنصوري",
      position: "CEO, Retail Plus",
      positionAr: "المدير التنفيذي، ريتيل بلس",
      content:
        "ERPX-AI transformed our operations. The AI assistant alone saved us 30% in operational costs.",
      contentAr:
        "حوّل ERPX-AI عملياتنا. المساعد الذكي وحده وفّر لنا 30% من التكاليف التشغيلية.",
      avatar: "AM",
    },
    {
      name: "Sarah Johnson",
      nameAr: "سارة جونسون",
      position: "CFO, TechCorp",
      positionAr: "المدير المالي، تك كورب",
      content:
        "Best ERP investment we've made. Financial reporting is now real-time and accurate.",
      contentAr:
        "أفضل استثمار في نظام ERP قمنا به. التقارير المالية الآن فورية ودقيقة.",
      avatar: "SJ",
    },
    {
      name: "Mohammed bin Rashid",
      nameAr: "محمد بن راشد",
      position: "Managing Director, Gulf Industries",
      positionAr: "المدير العام، صناعات الخليج",
      content:
        "Managing 5 branches became effortless with ERPX-AI's multi-branch capabilities.",
      contentAr:
        "إدارة 5 فروع أصبحت سهلة مع قدرات ERPX-AI متعددة الفروع.",
      avatar: "MR",
    },
  ];

  const stats = [
    { value: "500+", label: "Active Companies", labelAr: "شركة نشطة" },
    { value: "10K+", label: "Daily Transactions", labelAr: "معاملة يومية" },
    { value: "99.9%", label: "Uptime", labelAr: "وقت التشغيل" },
    { value: "24/7", label: "Support", labelAr: "دعم" },
  ];

  const trustedCompanies = [
    "Company A",
    "Company B",
    "Company C",
    "Company D",
    "Company E",
    "Company F",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveModule((prev) => (prev + 1) % modules.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800/50"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-blue-500" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                ERPX-AI
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="hover:text-blue-400 transition-colors">
                {i18n.language === "ar" ? "المزايا" : "Features"}
              </a>
              <a href="#modules" className="hover:text-blue-400 transition-colors">
                {i18n.language === "ar" ? "الوحدات" : "Modules"}
              </a>
              <a href="#pricing" className="hover:text-blue-400 transition-colors">
                {i18n.language === "ar" ? "الأسعار" : "Pricing"}
              </a>
              <a href="#contact" className="hover:text-blue-400 transition-colors">
                {i18n.language === "ar" ? "اتصل بنا" : "Contact"}
              </a>
            </div>

            <div className="flex items-center gap-4">
              <LanguageSwitcher variant="compact" />
              <Link
                to="/login"
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all"
              >
                {i18n.language === "ar" ? "تسجيل الدخول" : "Login"}
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Cyberpunk Animated Background */}
        <HeroCyberpunkBackground />

        <motion.div
          style={{ opacity, scale }}
          className="relative z-10 container mx-auto px-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400">
                {i18n.language === "ar" ? "مدعوم بالذكاء الاصطناعي" : "Powered by AI"}
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-blue-200 to-cyan-200 bg-clip-text text-transparent">
                {i18n.language === "ar"
                  ? "نظام ERP ذكي متكامل"
                  : "Next Generation"}
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {i18n.language === "ar" ? "لإدارة الشركات الحديثة" : "AI-Powered ERP"}
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              {i18n.language === "ar"
                ? "منصة شاملة للمالية، الموارد البشرية، المخزون، نقطة البيع، التحليلات الذكية والتقارير المتقدمة"
                : "Complete platform for Finance, HR, Inventory, POS, AI Analytics, CRM, and Advanced Reporting"}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 p-6 rounded-2xl bg-black/20 backdrop-blur-md border border-white/5">
              <Link
                to="/register"
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-blue-500/50 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {i18n.language === "ar" ? "ابدأ تجربة مجانية" : "Start Free Trial"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <a
                href="#contact"
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-sm"
              >
                {i18n.language === "ar" ? "اطلب عرض تجريبي" : "Request Demo"}
              </a>

              <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-sm flex items-center gap-2">
                <Play className="w-5 h-5" />
                {i18n.language === "ar" ? "شاهد الفيديو" : "Watch Video"}
              </button>
            </div>
          </motion.div>

          {/* Floating Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mt-20 relative"
          >
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-6 border border-blue-500/20">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    {i18n.language === "ar" ? "نمو الإيرادات" : "Revenue Growth"}
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    {i18n.language === "ar" ? "أداء ربع سنوي" : "Quarterly Performance"}
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="growth" fill="url(#colorGrowth)" radius={[8, 8, 0, 0]} />
                      <defs>
                        <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm md:text-base">
                  {i18n.language === "ar" ? stat.labelAr : stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Trusted Companies */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-20"
          >
            <p className="text-gray-500 text-sm mb-6">
              {i18n.language === "ar" ? "موثوق به من قبل الشركات الرائدة" : "Trusted by leading companies"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-50">
              {trustedCompanies.map((company, index) => (
                <div
                  key={index}
                  className="w-24 h-12 bg-gray-800/50 rounded-lg flex items-center justify-center text-xs text-gray-600"
                >
                  {company}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950/10 to-black" />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {i18n.language === "ar" ? "مزايا قوية" : "Powerful Features"}
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {i18n.language === "ar"
                ? "كل ما تحتاجه لإدارة عملك بكفاءة وذكاء"
                : "Everything you need to run your business efficiently and intelligently"}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`}
                />

                <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-lg font-bold mb-2">{feature.titleKey}</h3>
                <p className="text-sm text-gray-400">{feature.descKey}</p>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-5 h-5 text-blue-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Showcase */}
      <section id="modules" className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/10 to-black" />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {i18n.language === "ar" ? "وحدات ERP" : "ERP Modules"}
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {i18n.language === "ar"
                ? "نظام متكامل يغطي جميع جوانب عملك"
                : "Integrated system covering all aspects of your business"}
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {modules.map((module, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true }}
                onClick={() => setActiveModule(index)}
                className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                  activeModule === index
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50"
                    : "bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/50"
                }`}
              >
                <module.icon className="w-5 h-5" />
                {module.name}
              </motion.button>
            ))}
          </div>

          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-12 shadow-2xl max-w-5xl mx-auto"
          >
            <div className="text-center">
              <div className={`w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                {(() => {
                  const ModuleIcon = modules[activeModule].icon;
                  return <ModuleIcon className="w-10 h-10 text-white" />;
                })()}
              </div>
              <h3 className="text-3xl font-bold mb-4">{modules[activeModule].name}</h3>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                {i18n.language === "ar"
                  ? `إدارة شاملة ومتقدمة لـ ${modules[activeModule].name}`
                  : `Comprehensive and advanced management for ${modules[activeModule].name}`}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mb-2">
                      <CheckCircle className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-sm text-gray-400">
                      {i18n.language === "ar" ? `ميزة ${item}` : `Feature ${item}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-cyan-950/10 to-black" />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {i18n.language === "ar" ? "خطط الأسعار" : "Pricing Plans"}
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              {i18n.language === "ar"
                ? "اختر الخطة المناسبة لعملك"
                : "Choose the perfect plan for your business"}
            </p>

            {/* Pricing Toggle */}
            <div className="inline-flex items-center gap-4 bg-gray-800/50 border border-gray-700/50 rounded-xl p-2">
              <button
                onClick={() => setPricingInterval("monthly")}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  pricingInterval === "monthly"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
                    : "text-gray-400"
                }`}
              >
                {i18n.language === "ar" ? "شهري" : "Monthly"}
              </button>
              <button
                onClick={() => setPricingInterval("yearly")}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  pricingInterval === "yearly"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
                    : "text-gray-400"
                }`}
              >
                {i18n.language === "ar" ? "سنوي" : "Yearly"}
                <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                  {i18n.language === "ar" ? "وفر 20%" : "Save 20%"}
                </span>
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-3xl p-8 ${
                  plan.recommended
                    ? "border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/20"
                    : "border border-gray-700/50"
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full text-sm font-bold">
                    {i18n.language === "ar" ? "موصى به" : "Recommended"}
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">
                    {i18n.language === "ar" ? plan.nameAr : plan.name}
                  </h3>
                  <div className="flex items-end justify-center gap-2 mb-2">
                    <span className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                      ${pricingInterval === "monthly" ? plan.price : plan.yearlyPrice}
                    </span>
                    <span className="text-gray-400 mb-2">
                      /{pricingInterval === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {(i18n.language === "ar" ? plan.featuresAr : plan.features).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`block w-full py-3 rounded-xl font-bold text-center transition-all ${
                    plan.recommended
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/50"
                      : "bg-gray-800 border border-gray-700 hover:bg-gray-700"
                  }`}
                >
                  {i18n.language === "ar" ? "ابدأ الآن" : "Get Started"}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose ERPX */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-green-950/10 to-black" />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {i18n.language === "ar" ? "لماذا ERPX-AI؟" : "Why Choose ERPX-AI?"}
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {i18n.language === "ar"
                ? "الحل الأمثل لإدارة الأعمال الحديثة"
                : "The optimal solution for modern business management"}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Rocket,
                title: i18n.language === "ar" ? "عمليات أسرع" : "Faster Operations",
                desc: i18n.language === "ar" ? "تسريع العمليات بنسبة 60%" : "60% faster operations",
                stat: "60%",
              },
              {
                icon: Brain,
                title: i18n.language === "ar" ? "أتمتة ذكية" : "AI Automation",
                desc: i18n.language === "ar" ? "أتمتة المهام المتكررة" : "Automate repetitive tasks",
                stat: "AI",
              },
              {
                icon: TrendingUp,
                title: i18n.language === "ar" ? "شفافية مالية" : "Financial Visibility",
                desc: i18n.language === "ar" ? "تقارير فورية ودقيقة" : "Real-time accurate reports",
                stat: "100%",
              },
              {
                icon: Activity,
                title: i18n.language === "ar" ? "لوحات فورية" : "Real-time Dashboards",
                desc: i18n.language === "ar" ? "بيانات محدثة لحظياً" : "Live updated data",
                stat: "24/7",
              },
              {
                icon: DollarSign,
                title: i18n.language === "ar" ? "توفير التكاليف" : "Cost Reduction",
                desc: i18n.language === "ar" ? "تقليل التكاليف بنسبة 40%" : "40% cost reduction",
                stat: "40%",
              },
              {
                icon: Target,
                title: i18n.language === "ar" ? "قابلية التوسع" : "Scalability",
                desc: i18n.language === "ar" ? "ينمو مع عملك" : "Grows with your business",
                stat: "∞",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 text-center hover:border-green-500/50 transition-all"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                  {item.stat}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950/10 to-black" />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                {i18n.language === "ar" ? "آراء العملاء" : "Customer Testimonials"}
              </span>
            </h2>
            <p className="text-xl text-gray-400">
              {i18n.language === "ar" ? "ماذا يقول عملاؤنا عنا" : "What our customers say about us"}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <p className="text-gray-300 mb-6 leading-relaxed">
                  "{i18n.language === "ar" ? testimonial.contentAr : testimonial.content}"
                </p>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold">{i18n.language === "ar" ? testimonial.nameAr : testimonial.name}</div>
                    <div className="text-sm text-gray-400">
                      {i18n.language === "ar" ? testimonial.positionAr : testimonial.position}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact & Demo Section */}
      <section id="contact" className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/10 to-black" />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {i18n.language === "ar" ? "ابدأ اليوم" : "Get Started Today"}
                </span>
              </h2>
              <p className="text-xl text-gray-400">
                {i18n.language === "ar"
                  ? "تواصل معنا واطلب عرضاً تجريبياً مجانياً"
                  : "Contact us and request a free demo"}
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-12">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      {i18n.language === "ar" ? "الاسم" : "Name"}
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder={i18n.language === "ar" ? "اسمك الكامل" : "Your full name"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      {i18n.language === "ar" ? "البريد الإلكتروني" : "Email"}
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder={i18n.language === "ar" ? "email@example.com" : "email@example.com"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      {i18n.language === "ar" ? "الشركة" : "Company"}
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder={i18n.language === "ar" ? "اسم الشركة" : "Company name"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      {i18n.language === "ar" ? "الهاتف" : "Phone"}
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder={i18n.language === "ar" ? "+966 XXX XXX XXX" : "+966 XXX XXX XXX"}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    {i18n.language === "ar" ? "الرسالة" : "Message"}
                  </label>
                  <textarea
                    rows={5}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
                    placeholder={i18n.language === "ar" ? "كيف يمكننا مساعدتك؟" : "How can we help you?"}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2"
                >
                  {i18n.language === "ar" ? "إرسال" : "Send Message"}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>

              <div className="mt-12 pt-12 border-t border-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <Mail className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">
                        {i18n.language === "ar" ? "البريد الإلكتروني" : "Email"}
                      </div>
                      <div className="font-semibold">info@erpx-ai.com</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <Phone className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">
                        {i18n.language === "ar" ? "الهاتف" : "Phone"}
                      </div>
                      <div className="font-semibold">+966 XX XXX XXXX</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">
                        {i18n.language === "ar" ? "العنوان" : "Address"}
                      </div>
                      <div className="font-semibold">{i18n.language === "ar" ? "الرياض، السعودية" : "Riyadh, Saudi Arabia"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* WhatsApp Floating Button */}
        <motion.a
          href="https://wa.me/966XXXXXXXXX"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-8 right-8 z-50 w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50 hover:shadow-green-500/70 transition-all"
        >
          <MessageSquare className="w-8 h-8 text-white" />
        </motion.a>
      </section>

      {/* Footer */}
      <footer className="relative bg-gradient-to-b from-black to-gray-950 border-t border-gray-800/50 py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-8 h-8 text-blue-500" />
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  ERPX-AI
                </span>
              </div>
              <p className="text-gray-400 mb-6">
                {i18n.language === "ar"
                  ? "منصة ERP ذكية متكاملة لإدارة الأعمال الحديثة"
                  : "Next generation AI-powered ERP platform for modern businesses"}
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center hover:bg-blue-500/20 transition-all">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center hover:bg-blue-500/20 transition-all">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center hover:bg-blue-500/20 transition-all">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center hover:bg-blue-500/20 transition-all">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center hover:bg-blue-500/20 transition-all">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Products */}
            <div>
              <h4 className="font-bold mb-4">{i18n.language === "ar" ? "المنتجات" : "Products"}</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "لوحة التحكم" : "Dashboard"}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "المخزون" : "Inventory"}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "المبيعات" : "Sales"}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "المالية" : "Finance"}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "الموارد البشرية" : "HR"}</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-bold mb-4">{i18n.language === "ar" ? "الموارد" : "Resources"}</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "التوثيق" : "Documentation"}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "الدعم" : "Support"}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "المدونة" : "Blog"}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "الأسئلة الشائعة" : "FAQ"}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "حالات الاستخدام" : "Use Cases"}</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-bold mb-4">{i18n.language === "ar" ? "قانوني" : "Legal"}</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "الشروط والأحكام" : "Terms & Conditions"}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "سياسة الاسترجاع" : "Refund Policy"}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{i18n.language === "ar" ? "الترخيص" : "License"}</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-gray-400 text-sm">
              &copy; 2026 ERPX-AI. {i18n.language === "ar" ? "جميع الحقوق محفوظة" : "All rights reserved"}
            </div>
            <LanguageSwitcher variant="compact" />
          </div>
        </div>
      </footer>
    </div>
  );
}
