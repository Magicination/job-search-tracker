'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { Application } from '@job-search-tracker/shared';

interface DeleteContextType {
  deleteApplication: (application: Pick<Application, 'company' | 'role'>) => Promise<void>;
}

const DeleteContext = createContext<DeleteContextType | null>(null);

export function useDeleteApplication() {
  const context = useContext(DeleteContext);
  if (!context) {
    throw new Error('useDeleteApplication must be used within a DeleteProvider');
  }
  return context;
}

function DeleteProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<Application | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteApplication = useCallback(async (application: Pick<Application, 'company' | 'role'>) => {
    // Show modal logic here (simplified for now)
    // For production, integrate with existing application deletion flow
    
    setCurrent(application);
    
    // Simulate async deletion
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    setIsDeleting(false);
  }, []);

  const handleClose = useCallback(() => {
    setCurrent(null);
  }, []);

  return (
    <DeleteContext.Provider value={{ deleteApplication }}>
      {children}
      
      {/* Render modal here when needed */}
    </DeleteContext.Provider>
  );
}

export { DeleteProvider };
