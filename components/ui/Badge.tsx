import React from 'react';
import { Disposition, RequestStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  color: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
}

const Badge: React.FC<BadgeProps> = ({ children, color }) => {
  const colorClasses = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}>
      {children}
    </span>
  );
};

export const DispositionBadge: React.FC<{ disposition: Disposition }> = ({ disposition }) => {
  const colors: Record<Disposition, 'green' | 'red' | 'gray'> = {
    [Disposition.ACCURATE]: 'green',
    [Disposition.WRONG]: 'red',
    [Disposition.UNVERIFIED]: 'gray',
  };
  return <Badge color={colors[disposition]}>{disposition}</Badge>;
};

export const RequestStatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
  const colors: Record<RequestStatus, 'yellow' | 'blue' | 'green' | 'red'> = {
    [RequestStatus.PENDING]: 'yellow',
    [RequestStatus.IN_PROGRESS]: 'blue',
    [RequestStatus.FULFILLED]: 'green',
    [RequestStatus.REJECTED]: 'red',
  };
  return <Badge color={colors[status]}>{status}</Badge>;
};

export default Badge;
