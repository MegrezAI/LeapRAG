import { ForgetPassword } from '@/components/account/forget-password';
import { type Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Forget Password Page',
  description: ''
};
const ForgetPasswordPage = () => {
  return <ForgetPassword />;
};

export default ForgetPasswordPage;
