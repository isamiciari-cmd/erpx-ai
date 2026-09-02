import { Link } from 'react-router-dom';
import { Mail, Linkedin, Twitter, Facebook } from 'lucide-react';

export default function WebsiteFooter() {
  const modules = [
    { name: 'Inventory', href: '/website/inventory' },
    { name: 'Sales', href: '/website/sales' },
    { name: 'Finance', href: '/website/finance' },
    { name: 'HR', href: '/website/hr' },
    { name: 'POS', href: '/website/pos' },
    { name: 'AI Assistant', href: '/website/ai' },
  ];

  const company = [
    { name: 'About Us', href: '/website/about' },
    { name: 'Pricing', href: '/website/pricing' },
    { name: 'FAQ', href: '/website/faq' },
    { name: 'Contact', href: '/website/contact' },
    { name: 'Request Demo', href: '/website/demo' },
  ];

  return (
    <footer className="bg-gray-950 border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <span className="text-xl font-bold text-white">ERPX-AI</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              AI-powered enterprise resource planning platform for modern businesses.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Modules */}
          <div>
            <h3 className="text-white font-semibold mb-4">Modules</h3>
            <ul className="space-y-2">
              {modules.map((item) => (
                <li key={item.name}>
                  <Link to={item.href} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {company.map((item) => (
                <li key={item.name}>
                  <Link to={item.href} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:i.sami.ciari@erpx-ai.com"
                  className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  i.sami.ciari@erpx-ai.com
                </a>
              </li>
              <li className="text-gray-400 text-sm">
                Support: 24/7
              </li>
              <li className="text-gray-400 text-sm">
                Cloud-based platform
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} ERPX-AI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
