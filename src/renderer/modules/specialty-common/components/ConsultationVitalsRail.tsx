import React, { useState } from 'react';
import { Activity, ChevronsLeft, ChevronsRight, GripVertical } from 'lucide-react';
import PatientVitalsSummary from '../../clinical-consultation/components/PatientVitalsSummary';

interface ConsultationVitalsRailProps {
  patientId: string | null | undefined;
  className?: string;
}

export default function ConsultationVitalsRail({
  patientId,
  className = '',
}: ConsultationVitalsRailProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(220);
  const [isResizing, setIsResizing] = useState(false);

  if (!patientId) {
    return null;
  }

  return (
    <div
      className={`sticky top-4 hidden self-start lg:flex lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border lg:border-gray-200 lg:bg-white lg:shadow-sm ${className}`}
      style={{ width: isCollapsed ? 40 : width }}
    >
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex min-h-[320px] flex-1 flex-col items-center justify-center gap-2 bg-white transition-colors hover:bg-gray-50"
          title="Expand vitals panel"
        >
          <Activity className="h-4 w-4 text-rose-600" />
          <span
            className="text-[9px] font-bold uppercase tracking-wider text-slate-600"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            Vitals
          </span>
          <ChevronsRight className="h-4 w-4 text-slate-400" />
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-l from-rose-50 to-white p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-rose-100 p-1">
                <Activity className="h-3.5 w-3.5 text-rose-600" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                Vitals
              </h3>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[8px] text-emerald-600">
                LIVE
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="rounded p-1 transition-colors hover:bg-gray-100"
              title="Collapse vitals panel"
            >
              <ChevronsLeft className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-14rem)] overflow-y-auto p-2">
            <PatientVitalsSummary
              patientId={patientId}
              hideNursingNotes={false}
              compact={true}
            />
          </div>

          <div
            className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize transition-colors ${isResizing ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-300'}`}
            onMouseDown={(event) => {
              event.preventDefault();
              setIsResizing(true);
              const startX = event.clientX;
              const startWidth = width;

              const handleMouseMove = (moveEvent: MouseEvent) => {
                const delta = moveEvent.clientX - startX;
                const nextWidth = Math.min(Math.max(startWidth + delta, 180), 340);
                setWidth(nextWidth);
              };

              const handleMouseUp = () => {
                setIsResizing(false);
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
            title="Drag to resize"
          >
            <div className="absolute right-0 top-1/2 flex h-8 w-1.5 -translate-y-1/2 items-center justify-center opacity-0 transition-opacity hover:opacity-100">
              <GripVertical className="h-4 w-4 text-blue-500" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
