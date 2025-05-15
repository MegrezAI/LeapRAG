import React from 'react';

const LoginLayout = ({
  children
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return <div className="h-dvh bg-[#FCFCFC] dark:bg-background">{children}</div>;
};

export default LoginLayout;
