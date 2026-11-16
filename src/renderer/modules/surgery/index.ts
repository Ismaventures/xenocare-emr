/**
 * Surgery Module Exports
 * Central export point for Surgery/Theatre components, hooks, and types
 */

// Types
export * from './types/surgery.types';

// Hooks
export * from './hooks/useSurgery';

// Module Router (main entry point)
export { default as SurgeryModule } from './SurgeryModule';

// Components
export { default as SurgeryDashboard } from './components/SurgeryDashboard';
export { default as SurgeryDetailView } from './components/SurgeryDetailView';
export { default as TheatreScheduleCalendar } from './components/TheatreScheduleCalendar';
export { default as SurgeryForm } from './components/SurgeryForm';

// Re-export commonly used types for convenience
export type {
  Surgery,
  SurgeryWithDetails,
  SurgeryFormData,
  TheatreRoom,
  TheatreSchedule,
  SurgeryPreopAssessment,
  SurgeryAnesthesiaRecord,
  SurgeryConsumable,
  SurgeryDashboardStats,
  SurgeryStatus,
  ASAClassification,
  AnesthesiaType,
  WoundClassification,
  ConsentType,
  SurgeryDisposition,
  TheatreRoomType,
  TheatreRoomStatus,
  SurgeryPriority,
} from './types/surgery.types';
