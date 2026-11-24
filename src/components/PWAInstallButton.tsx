import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return (
      <span className="text-xs text-[#52606D] dark:text-[#94A3B8]">
        Installed on this device for offline play
      </span>
    );
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center gap-2 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] px-4 py-2 text-sm font-semibold text-white dark:text-[#0B1410] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] px-4 py-2 text-sm font-medium text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] transition-colors whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-4 h-4" aria-hidden="true" />
          Install on iOS
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3
                  id="ios-install-title"
                  className="text-lg font-semibold text-[#131B23] dark:text-[#F1F5F9]"
                >
                  Install LexiLoom on iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close installation guide"
                  className="p-2 rounded-lg text-[#52606D] dark:text-[#94A3B8] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2 text-sm text-[#52606D] dark:text-[#CBD5E1] list-decimal list-inside">
                <li>
                  Tap the <strong>Share</strong> button in the Safari toolbar.
                </li>
                <li>
                  Scroll down and select <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Launch LexiLoom anytime for full-screen offline play.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-[#176B52] dark:bg-[#2EB88A] py-2.5 text-sm font-semibold text-white dark:text-[#0B1410] transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <span className="text-xs text-[#52606D] dark:text-[#94A3B8]">
      Offline caching active — use your browser menu to add to home screen
    </span>
  );
};
