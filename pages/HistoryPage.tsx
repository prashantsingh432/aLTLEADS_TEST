import React from 'react';
import { useData } from '../hooks/useData';
import Card from '../components/ui/Card';
import { Link } from 'react-router-dom';

const HistoryPage: React.FC = () => {
    const { searchHistory } = useData();

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-text-primary">Search History</h1>
            <p className="text-text-secondary">Your recent search terms.</p>

            <Card>
                {searchHistory.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        No search history found. Start searching in the Prospects module!
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {searchHistory.map((term, index) => (
                            <li key={index} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                <span className="text-lg font-medium text-text-primary">{term}</span>
                                <Link 
                                    to="/prospects" 
                                    className="text-sm text-accent hover:underline"
                                    // In a real app, we might pass state to pre-fill the search
                                    // For now, we just link back
                                >
                                    Search Again &rarr;
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
};

export default HistoryPage;