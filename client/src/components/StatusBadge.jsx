import React from 'react';
import { Clock, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return {
          icon: Clock,
          text: 'Pending Scan / Approval',
          classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
      case 'approved':
        return {
          icon: CheckCircle2,
          text: 'Approved (Completing)',
          classes: 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30 animate-pulse',
        };
      case 'consumed':
        return {
          icon: ShieldCheck,
          text: 'Consumed & Authenticated',
          classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
      case 'rejected':
        return {
          icon: XCircle,
          text: 'Rejected by User',
          classes: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        };
      case 'expired':
        return {
          icon: AlertTriangle,
          text: 'Challenge Expired',
          classes: 'bg-slate-700/40 text-slate-400 border-slate-600',
        };
      default:
        return {
          icon: Clock,
          text: status || 'Unknown',
          classes: 'bg-slate-700/40 text-slate-300 border-slate-600',
        };
    }
  };

  const { icon: Icon, text, classes } = getBadgeConfig();

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${classes}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{text}</span>
    </span>
  );
};
