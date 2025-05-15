'use client';
import React, { useEffect } from 'react';
import { createCustomErrorMap } from '../zod/zodErrorMap';
import { z } from 'zod';

interface ZodErrorProviderProps {
  children: React.ReactNode;
}
const ZodErrorProvider = ({ children }: ZodErrorProviderProps) => {
  const zodCustomErrorMap = createCustomErrorMap();
  useEffect(() => {
    z.setErrorMap(zodCustomErrorMap);
  }, []);
  return <>{children}</>;
};

export default ZodErrorProvider;
