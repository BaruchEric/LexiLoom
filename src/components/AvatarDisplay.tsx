import React, { useState } from 'react';
import { getIllustratedAvatarById } from '../data/avatars';

interface AvatarDisplayProps {
  avatarType: 'illustrated' | 'monogram';
  avatarId: string;
  avatarInitials: string;
  avatarColor: string;
  displayName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  avatarType,
  avatarId,
  avatarInitials,
  avatarColor,
  displayName,
  size = 'md',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  if (avatarType === 'illustrated' && !imgFailed) {
    const illustrated = getIllustratedAvatarById(avatarId);
    return (
      <div
        className={`${sizeClass} relative rounded-full overflow-hidden shrink-0 border border-[#D4DDD6] dark:border-[#2E3D4F] ${className}`}
        style={{ backgroundColor: illustrated.fallbackBg }}
      >
        <img
          src={illustrated.src}
          alt={`${displayName} — ${illustrated.alt}`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full shrink-0 flex items-center justify-center font-editorial font-bold tracking-tight text-white border border-black/10 dark:border-white/15 select-none ${className}`}
      style={{ backgroundColor: avatarColor || '#176B52' }}
      aria-label={`${displayName} avatar`}
    >
      {(avatarInitials || displayName.slice(0, 2)).toUpperCase()}
    </div>
  );
};
