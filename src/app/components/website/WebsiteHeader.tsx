import { Link } from 'react-router';
import { useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function WebsiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/website' },
    { name: 'Platform', href: '/website/about' },
    { name: 'Modules', href: '/website/modules' },
    { name: 'AI Assistant', href: '/website/ai' },
    { name: 'Pricing', href: '/website/pricing' },
    { name: 'FAQ', href: '/website/faq' },
    { name: 'Contact', href: '/website/contact' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gray-950/80 backdrop-blur-lg border-b border-white/10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/website" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <span className="text-xl font-bold text-white">ERPX-AI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/"
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              to="/website/demo"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all"
            >
              Request Demo
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-gray-900 border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-center text-gray-300 hover:text-white border border-white/10 rounded-lg transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/website/demo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-center bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-semibold"
                >
                  Request Demo
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
