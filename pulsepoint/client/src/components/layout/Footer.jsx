import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-brand-dark/40 border-t border-brand-border/60 py-6 mt-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-slate-500">
        <div>
          © {new Date().getFullYear()} PulsePoint. All rights reserved.
        </div>
        <div className="flex gap-4">
          <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
          <span className="hover:text-slate-400 cursor-pointer">Privacy Radar Policy</span>
          <span className="hover:text-slate-400 cursor-pointer">Safety Guidelines</span>
        </div>
      </div>
    </footer>
  );
}
