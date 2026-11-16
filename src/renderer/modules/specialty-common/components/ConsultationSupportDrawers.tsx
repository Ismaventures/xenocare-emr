import React from 'react';
import { Bot, BookOpenText, X } from 'lucide-react';
import { AIChatPanel } from '../../ai-assistant/components/AIChatPanel';
import ConsultationPatientStoryPanel from './ConsultationPatientStoryPanel';

interface ConsultationSupportDrawersProps {
  patientId: string | null;
  encounterId?: string | null;
  patientName?: string;
  emrNumber?: string;
  facilityId?: string;
  userId?: string;
  chiefComplaint?: string;
  department: string;
  existingCodes?: string[];
  consultationData?: Record<string, unknown> | null;
  isStoryOpen: boolean;
  onCloseStory: () => void;
  isAIOpen: boolean;
  onCloseAI: () => void;
}

function DrawerShell({
  title,
  subtitle,
  icon,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-primary-700 to-primary-600 px-5 py-3 text-white">
          <div className="min-w-0 flex items-center gap-3">
            <div className="rounded-lg bg-white/15 p-2">{icon}</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{title}</div>
              {subtitle && <div className="truncate text-[11px] text-white/80">{subtitle}</div>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 transition-colors hover:bg-white/15"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-white">{children}</div>
      </div>
    </div>
  );
}

export default function ConsultationSupportDrawers({
  patientId,
  encounterId,
  patientName,
  emrNumber,
  facilityId = '',
  userId = '',
  chiefComplaint,
  department,
  existingCodes = [],
  consultationData = null,
  isStoryOpen,
  onCloseStory,
  isAIOpen,
  onCloseAI,
}: ConsultationSupportDrawersProps) {
  return (
    <>
      {isStoryOpen && patientId && (
        <DrawerShell
          title="Patient Story"
          subtitle={patientName ? `${patientName}${emrNumber ? ` • ${emrNumber}` : ''}` : emrNumber}
          icon={<BookOpenText className="h-5 w-5" />}
          onClose={onCloseStory}
        >
          <ConsultationPatientStoryPanel
            patientId={patientId}
            encounterId={encounterId || undefined}
          />
        </DrawerShell>
      )}

      {isAIOpen && (
        <DrawerShell
          title="XenoCare AI Assistants"
          subtitle={patientName ? `${patientName}${emrNumber ? ` • ${emrNumber}` : ''}` : department}
          icon={<Bot className="h-5 w-5" />}
          onClose={onCloseAI}
        >
          <AIChatPanel
            patientId={patientId}
            encounterId={encounterId || undefined}
            patientName={patientName}
            emrNumber={emrNumber}
            facilityId={facilityId}
            userId={userId}
            chiefComplaint={chiefComplaint}
            department={department}
            consultationData={consultationData}
            existingCodes={existingCodes}
            variant="minimal"
            className="h-full"
          />
        </DrawerShell>
      )}
    </>
  );
}
