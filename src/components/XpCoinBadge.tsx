import React from 'react';

export interface XpCoinBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Unified Coin-Shaped XP Visual Identity Badge
 * Renders a metallic gold coin circle with "XP" centered inside.
 */
export const XpCoinBadge: React.FC<XpCoinBadgeProps> = ({
  size = 'sm',
  className = '',
}) => {
  const sizeClasses =
    size === 'xs'
      ? 'w-4 h-4 text-[8px] ring-1'
      : size === 'sm'
      ? 'w-5 h-5 text-[9px] ring-1'
      : size === 'md'
      ? 'w-6 h-6 text-[10px] ring-[1.5px]'
      : 'w-7 h-7 text-[11px] ring-2';

  return (
    <span
      dir="ltr"
      aria-label="XP"
      title="امتیاز تجربه (XP)"
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 text-slate-950 font-black tracking-tighter leading-none ring-amber-200/90 dark:ring-amber-300/70 shadow-2xs shrink-0 select-none ${sizeClasses} ${className}`}
    >
      XP
    </span>
  );
};
