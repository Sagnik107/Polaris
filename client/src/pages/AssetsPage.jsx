import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * AssetsPage redirect to the unified Inventory & Assets command hub
 */
export const AssetsPage = () => {
  return <Navigate to="/inventory?tab=assets" replace />;
};

export default AssetsPage;
