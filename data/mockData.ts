
import { Prospect, User, ContactRequest, ProfileView, Role, Disposition, RequestStatus } from '../types';

// Mock IDs
const TEAM_ID = 'team_default';

export const MOCK_USERS: User[] = [
  { 
      id: 'user-1', 
      name: 'Alice Agent', 
      email: 'agent@amplior.com', 
      role: Role.AGENT, 
      teamId: TEAM_ID,
      createdAt: new Date('2023-01-10') 
  },
  { 
      id: 'user-2', 
      name: 'Bob Admin', 
      email: 'admin@amplior.com', 
      role: Role.ADMIN, 
      teamId: TEAM_ID,
      createdAt: new Date('2023-01-15') 
  },
  { 
      id: 'user-3', 
      name: 'Charlie Pending', 
      email: 'new@amplior.com', 
      role: Role.PENDING, 
      createdAt: new Date('2023-02-20') 
  },
];

export const MOCK_PROSPECTS: Prospect[] = [
  {
    id: 'prospect-1',
    teamId: TEAM_ID,
    companyName: 'TechNova Solutions',
    companyIndustry: 'Information Technology',
    companySubIndustry: 'SaaS',
    companyEmployeeSize: '50-200',
    companyCIN: 'U72900KA2020PTC123456',
    website: 'www.technova.example.com',
    companyLinkedin: 'linkedin.com/company/technova',
    city: 'Bangalore',
    state: 'Karnataka',
    firstName: 'Arjun',
    lastName: 'Reddy',
    fullName: 'Arjun Reddy',
    personalLinkedin: 'linkedin.com/in/arjunreddy',
    designation: 'Chief Technology Officer',
    workEmail: 'arjun.r@technova.example.com',
    workEmailDisposition: Disposition.ACCURATE,
    contactNumber1: '+91 98765 43210',
    contactNumber1Disposition: Disposition.ACCURATE,
    contactNumber2: '+91 80 1234 5678',
    contactNumber2Disposition: Disposition.UNVERIFIED,
    contactNumber3: '',
    contactNumber3Disposition: Disposition.UNVERIFIED,
    receptionNumber: '+91 80 4444 5555',
    receptionNumberDisposition: Disposition.ACCURATE,
    remark: 'Key decision maker for cloud infra.',
    lastUpdated: new Date('2023-10-26'),
    createdBy: { uid: 'user-2', name: 'Bob Admin', email: 'admin@amplior.com' }
  },
  {
    id: 'prospect-2',
    teamId: TEAM_ID,
    companyName: 'GreenEarth Agro',
    companyIndustry: 'Agriculture',
    companySubIndustry: 'Organic Farming',
    companyEmployeeSize: '200-500',
    companyCIN: 'L01100MH2015PLC654321',
    website: 'www.greenearth.example.com',
    companyLinkedin: 'linkedin.com/company/greenearth',
    city: 'Pune',
    state: 'Maharashtra',
    firstName: 'Sarah',
    lastName: 'Connor',
    fullName: 'Sarah Connor',
    personalLinkedin: 'linkedin.com/in/sarahconnor',
    designation: 'Procurement Head',
    workEmail: 'sarah.c@greenearth.example.com',
    workEmailDisposition: Disposition.WRONG,
    contactNumber1: '+91 99887 76655',
    contactNumber1Disposition: Disposition.WRONG,
    contactNumber2: '',
    contactNumber2Disposition: Disposition.UNVERIFIED,
    contactNumber3: '',
    contactNumber3Disposition: Disposition.UNVERIFIED,
    receptionNumber: '+91 22 2345 6789',
    receptionNumberDisposition: Disposition.ACCURATE,
    remark: 'Email bounced. Need updated contact.',
    lastUpdated: new Date('2023-10-28'),
    createdBy: { uid: 'user-2', name: 'Bob Admin', email: 'admin@amplior.com' }
  },
  {
    id: 'prospect-3',
    teamId: TEAM_ID,
    companyName: 'FinServe Capital',
    companyIndustry: 'Financial Services',
    companySubIndustry: 'Investment Banking',
    companyEmployeeSize: '1000+',
    companyCIN: 'U65990DL2010PTC987654',
    website: 'www.finserve.example.com',
    companyLinkedin: 'linkedin.com/company/finserve',
    city: 'Mumbai',
    state: 'Maharashtra',
    firstName: 'Vikram',
    lastName: 'Malhotra',
    fullName: 'Vikram Malhotra',
    personalLinkedin: 'linkedin.com/in/vikramm',
    designation: 'VP of Sales',
    workEmail: 'vikram.m@finserve.example.com',
    workEmailDisposition: Disposition.UNVERIFIED,
    contactNumber1: '+91 91234 56789',
    contactNumber1Disposition: Disposition.UNVERIFIED,
    contactNumber2: '+91 91234 00000',
    contactNumber2Disposition: Disposition.ACCURATE,
    contactNumber3: '',
    contactNumber3Disposition: Disposition.UNVERIFIED,
    receptionNumber: '+91 22 8888 9999',
    receptionNumberDisposition: Disposition.UNVERIFIED,
    remark: 'Met at FinTech summit.',
    lastUpdated: new Date('2023-10-25'),
    createdBy: { uid: 'user-2', name: 'Bob Admin', email: 'admin@amplior.com' }
  }
];

export const MOCK_CONTACT_REQUESTS: ContactRequest[] = [
  {
    id: 'req-1',
    teamId: TEAM_ID,
    prospectId: 'prospect-2',
    prospectName: 'Sarah Connor',
    requestedBy: { uid: 'user-1', name: 'Alice Agent', email: 'agent@amplior.com' },
    status: RequestStatus.IN_PROGRESS,
    fulfilledBy: { uid: 'user-2', name: 'Bob Admin', email: 'admin@amplior.com' },
    createdAt: new Date('2023-10-25'),
    updatedAt: new Date('2023-10-26')
  }
];

export const MOCK_PROFILE_VIEWS: ProfileView[] = [];
