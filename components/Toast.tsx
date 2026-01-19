
import React from 'react';
import { ToastType } from '../App';

interface ToastProps {
  message: string;
  type: ToastType;
}

const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-600 shadow-emerald-200';
      case 'error':
        return 'bg-rose-600 shadow-rose-200';
      case 'info':
        return 'bg-indigo-600 shadow-indigo-200';
      default:
        return 'bg-slate-800 shadow-slate-200';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  return (
    <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-2xl animate-in slide-in-from-right-10 duration-300 ${getStyles()}`}>
      <span className="text-lg">{getIcon()}</span>
      <span className="border-l border-white/20 pl-3 leading-tight">{message}</span>
    </div>
  );
};

export default Toast;
