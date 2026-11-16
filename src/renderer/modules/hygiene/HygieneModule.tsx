/**
 * Hygiene Module Router
 * Handles internal routing for the Hygiene/Infection Control module
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HygieneDashboard from './components/HygieneDashboard';
import HygieneWorklist from './components/HygieneWorklist';
import HygieneCareRecordsList from './components/HygieneCareRecordsList';
import InfectionSurveillanceList from './components/InfectionSurveillanceList';
import HygieneCareForm from './components/HygieneCareForm';
import InfectionReportForm from './components/InfectionReportForm';

const HygieneModule: React.FC = () => {
  return (
    <Routes>
      {/* Dashboard */}
      <Route index element={<HygieneDashboard />} />

      {/* Care Documentation Form */}
      <Route path="record" element={<HygieneCareForm />} />

      {/* Care Records List */}
      <Route path="records" element={<HygieneCareRecordsList />} />

      {/* Infection Surveillance */}
      <Route path="infections" element={<InfectionSurveillanceList />} />
      <Route path="infections/report" element={<InfectionReportForm />} />

      {/* Worklist View */}
      <Route path="worklist" element={<HygieneWorklist />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/hygiene" replace />} />
    </Routes>
  );
};

export default HygieneModule;
