
import React from 'react';
import { SimService } from '../types';

interface ServiceGridProps {
  services: SimService[];
  onRent: (service: SimService) => void;
}

const getIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('facebook')) return '📘';
  if (n.includes('gmail') || n.includes('google')) return '📧';
  if (n.includes('telegram')) return '✈️';
  if (n.includes('tiktok')) return '🎵';
  if (n.includes('zalo')) return '💬';
  if (n.includes('whatsapp')) return '🟢';
  if (n.includes('shopee')) return '🛒';
  if (n.includes('new')) return '✨';
  return '📱';
};

const ServiceGrid: React.FC<ServiceGridProps> = ({ services, onRent }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {services.map((service) => {
        const isNew = service.name.toLowerCase().includes('new');
        
        return (
          <div 
            key={service.id}
            className={`relative flex items-center gap-3 bg-white p-3 rounded-2xl border ${isNew ? 'border-amber-200 shadow-md ring-2 ring-amber-400/10' : 'border-slate-100 shadow-sm'} hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer group overflow-hidden`}
            onClick={() => onRent(service)}
          >
            {isNew && (
              <div className="absolute top-0 right-0">
                <div className="bg-amber-400 text-white text-[7px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-widest">
                  HOT
                </div>
              </div>
            )}
            
            <div className={`text-xl w-10 h-10 min-w-[40px] flex items-center justify-center rounded-xl transition-colors ${isNew ? 'bg-amber-50 group-hover:bg-amber-100' : 'bg-slate-50 group-hover:bg-indigo-50'}`}>
              {getIcon(service.name)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-xs truncate ${isNew ? 'text-amber-700' : 'text-slate-800'}`} title={service.name}>
                {service.name}
              </h3>
              <p className={`${isNew ? 'text-amber-600' : 'text-indigo-600'} font-black text-[10px]`}>
                {service.price.toLocaleString('vi-VN')}đ
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ServiceGrid;
