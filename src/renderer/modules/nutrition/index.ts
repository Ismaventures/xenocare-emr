/**
 * Nutrition Module Exports
 *
 * Provides evidence-informed nutrition assessment,
 * meal planning, and longitudinal follow-up workflows.
 */

// Types
export * from './types/nutrition.types';

// API
export * from './api/nutrition.api';

// Hooks
export * from './hooks/useNutrition';

// Components
export { default as NutritionCarePlanDashboard } from './components/NutritionCarePlanDashboard';
export { default as NutritionPlanCreateModal } from './components/NutritionPlanCreateModal';
export { default as NutritionSessionRecordModal } from './components/NutritionSessionRecordModal';

// Pages
export { default as NutritionPage } from './pages/NutritionPage';
export { default } from './pages/NutritionPage';
