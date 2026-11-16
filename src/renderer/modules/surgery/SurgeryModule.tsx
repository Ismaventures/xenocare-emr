/**
 * Surgery Module Router
 * Handles internal routing for the Surgery/Theatre module
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SurgeryDashboard from './components/SurgeryDashboard';
import SurgeryDetailView from './components/SurgeryDetailView';
import TheatreScheduleCalendar from './components/TheatreScheduleCalendar';
import TheatreRoomsManagement from './components/TheatreRoomsManagement';
import SurgeryHistoryList from './components/SurgeryHistoryList';
import SurgeryForm from './components/SurgeryForm';
import SurgeryPreopForm from './components/SurgeryPreopForm';
import SafeSurgeryChecklistForm from './components/SafeSurgeryChecklistForm';
import SurgeryAnesthesiaForm from './components/SurgeryAnesthesiaForm';
import SurgeryIntraOpForm from './components/SurgeryIntraOpForm';
import SurgeryPostOpForm from './components/SurgeryPostOpForm';
import SurgeryConsumableForm from './components/SurgeryConsumableForm';

const SurgeryModule: React.FC = () => {
  return (
    <Routes>
      {/* Dashboard */}
      <Route index element={<SurgeryDashboard />} />

      {/* Theatre Schedule Calendar */}
      <Route path="schedule" element={<TheatreScheduleCalendar />} />

      {/* Theatre Rooms Management */}
      <Route path="rooms" element={<TheatreRoomsManagement />} />

      {/* Surgery History */}
      <Route path="history" element={<SurgeryHistoryList />} />

      {/* New Surgery Form */}
      <Route path="new" element={<SurgeryForm />} />

      {/* Surgery Pre-Op Form */}
      <Route path=":surgeryId/preop" element={<SurgeryPreopForm />} />

      {/* Surgery Checklist Form */}
      <Route
        path=":surgeryId/checklist"
        element={<SafeSurgeryChecklistForm />}
      />

      {/* Surgery Anesthesia Form */}
      <Route path=":surgeryId/anesthesia" element={<SurgeryAnesthesiaForm />} />

      {/* Surgery Intra-Op Form */}
      <Route path=":surgeryId/intraop" element={<SurgeryIntraOpForm />} />

      {/* Surgery Post-Op Form */}
      <Route path=":surgeryId/postop" element={<SurgeryPostOpForm />} />

      {/* Surgery Consumable Add Form */}
      <Route
        path=":surgeryId/consumables/new"
        element={<SurgeryConsumableForm />}
      />

      {/* Surgery Detail View */}
      <Route path=":surgeryId" element={<SurgeryDetailView />} />

      {/* Edit Surgery */}
      <Route path=":surgeryId/edit" element={<SurgeryForm />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/surgery" replace />} />
    </Routes>
  );
};

export default SurgeryModule;
