import { CheckCircle2, AlertCircle, XCircle, Info } from 'lucide-react';

interface StatusIconProps {
  status: string;
}

export function StatusIcon({ status }: StatusIconProps) {
  switch (status) {
    case 'green':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case 'yellow':
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    case 'red':
      return <XCircle className="h-5 w-5 text-red-600" />;
    default:
      return <Info className="h-5 w-5 text-gray-600" />;
  }
}
