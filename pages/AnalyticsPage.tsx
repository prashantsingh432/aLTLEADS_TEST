import React from 'react';
import { useData } from '../hooks/useData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Disposition, RequestStatus } from '../types';
import Card from '../components/ui/Card';

const AnalyticsPage: React.FC = () => {
    const { prospects, contactRequests, profileViews } = useData();

    const dispositionData = [
        { name: 'Email Accurate', value: prospects.filter(p => p.workEmailDisposition === Disposition.ACCURATE).length },
        { name: 'Email Wrong', value: prospects.filter(p => p.workEmailDisposition === Disposition.WRONG).length },
        { name: 'Number Accurate', value: prospects.filter(p => p.contactNumber1Disposition === Disposition.ACCURATE).length },
        { name: 'Number Wrong', value: prospects.filter(p => p.contactNumber1Disposition === Disposition.WRONG).length },
    ];
    
    const requestStatusData = Object.values(RequestStatus).map(status => ({
        name: status,
        count: contactRequests.filter(r => r.status === status).length,
    }));
    
    const totalViews = profileViews.length;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-text-primary">Analytics</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className="md:col-span-1">
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Total Profile Views</h3>
                    <p className="text-4xl font-bold text-primary">{totalViews}</p>
                 </Card>
                 <Card className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Contact Request Status</h3>
                    <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={requestStatusData}>
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false}/>
                            <Tooltip />
                            <Bar dataKey="count" fill="#1E40AF" />
                        </BarChart>
                    </ResponsiveContainer>
                 </Card>
            </div>
            
            <Card>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Data Validation Counts</h3>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dispositionData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={120} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Count" fill="#F59E0B" />
                    </BarChart>
                </ResponsiveContainer>
            </Card>
        </div>
    );
};

export default AnalyticsPage;