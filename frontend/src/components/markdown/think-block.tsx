import React from 'react';

const ThinkBlock = React.memo(({ children, ...props }: any) => {
  if (!(props['data-think'] ?? false)) return <details {...props}>{children}</details>;

  return (
    <div className="text-gray-500 text-sm p-3 ml-2 bg-gray-50 border-l-2 border-primary/50 mb-4">
      {children}
    </div>
  );
});

ThinkBlock.displayName = 'ThinkBlock';

export default ThinkBlock;
