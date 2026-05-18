import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-6xl font-extrabold text-primary">404</h1>
      <h2 className="mt-4 text-3xl font-bold text-text-primary">Page Not Found</h2>
      <p className="mt-2 text-md text-text-secondary">
        Sorry, the page you are looking for does not exist.
      </p>
      <Link to="/" className="mt-8">
        <Button size="lg">Go to Dashboard</Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
