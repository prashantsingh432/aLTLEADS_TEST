-- ============================================================
-- PART 1: Add any missing columns to the prospects table
-- (Safe to run even if some columns already exist)
-- ============================================================

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS first_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS designation text DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_industry text DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_sub_industry text DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_employee_size text DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_cin text DEFAULT '',
  ADD COLUMN IF NOT EXISTS website text DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_linkedin text DEFAULT '',
  ADD COLUMN IF NOT EXISTS city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS state text DEFAULT '',
  ADD COLUMN IF NOT EXISTS work_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS "workEmailDisposition" text DEFAULT 'Unverified',
  ADD COLUMN IF NOT EXISTS contact_number1 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS "contactNumber1Disposition" text DEFAULT 'Unverified',
  ADD COLUMN IF NOT EXISTS contact_number2 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS "contactNumber2Disposition" text DEFAULT 'Unverified',
  ADD COLUMN IF NOT EXISTS contact_number3 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS "contactNumber3Disposition" text DEFAULT 'Unverified',
  ADD COLUMN IF NOT EXISTS reception_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS "receptionNumberDisposition" text DEFAULT 'Unverified',
  ADD COLUMN IF NOT EXISTS remark text DEFAULT '',
  ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by_uid text DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_by_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_by_name text DEFAULT '';

-- ============================================================
-- PART 2: Insert 15 dummy prospect records
-- ============================================================

INSERT INTO public.prospects (
  full_name, first_name, last_name, designation, company_name,
  company_industry, company_sub_industry, company_employee_size, company_cin,
  website, company_linkedin, city, state, personal_linkedin,
  work_email, "workEmailDisposition",
  contact_number1, "contactNumber1Disposition",
  contact_number2, "contactNumber2Disposition",
  contact_number3, "contactNumber3Disposition",
  reception_number, "receptionNumberDisposition",
  remark, comments, last_updated
)
VALUES

-- 1
('Rahul Sharma', 'Rahul', 'Sharma', 'Chief Technology Officer', 'Infosys BPM',
 'Information Technology', 'IT Services & Consulting', '10001+', 'U72200KA2002PLC031981',
 'infosysbpm.com', 'linkedin.com/company/infosys-bpm', 'Bangalore', 'Karnataka', 'linkedin.com/in/rahul-sharma-cto-infosys',
 'rahul.sharma@infosysbpm.com', 'Accurate',
 '+91 98450 12345', 'Accurate',
 '+91 80 4116 7890', 'Unverified',
 '', 'Unverified',
 '+91 80 2852 0261', 'Accurate',
 'Decision maker for tech procurement. Responded to cold email in Jan 2025.', '[]', now()),

-- 2
('Priya Mehta', 'Priya', 'Mehta', 'VP of Sales', 'Razorpay',
 'Financial Technology', 'Payment Gateway', '1001-5000', 'U65999KA2013PTC071775',
 'razorpay.com', 'linkedin.com/company/razorpay', 'Bangalore', 'Karnataka', 'linkedin.com/in/priya-mehta-razorpay',
 'priya.mehta@razorpay.com', 'Accurate',
 '+91 99001 23456', 'Accurate',
 '', 'Unverified',
 '', 'Unverified',
 '+91 80 6160 6161', 'Accurate',
 'Key influencer in enterprise deals. Met at SaaSBOOMi 2025.', '[]', now()),

-- 3
('Arjun Nair', 'Arjun', 'Nair', 'Head of Business Development', 'Freshworks',
 'Software as a Service', 'CRM & Customer Support', '5001-10000', 'U72900TN2010PLC078243',
 'freshworks.com', 'linkedin.com/company/freshworks', 'Chennai', 'Tamil Nadu', 'linkedin.com/in/arjun-nair-freshworks',
 'arjun.nair@freshworks.com', 'Accurate',
 '+91 98403 34567', 'Accurate',
 '+91 44 6667 8900', 'Unverified',
 '', 'Unverified',
 '+91 44 3357 1234', 'Accurate',
 'Interested in AI-powered prospecting tools. Follow up Q3 2025.', '[]', now()),

-- 4
('Sneha Patel', 'Sneha', 'Patel', 'Founder & CEO', 'ZenHR Technologies',
 'Human Resources Technology', 'HR SaaS', '51-200', 'U74999MH2018PTC312456',
 'zenhr.in', 'linkedin.com/company/zenhr-technologies', 'Mumbai', 'Maharashtra', 'linkedin.com/in/sneha-patel-zenhr',
 'sneha@zenhr.in', 'Accurate',
 '+91 98200 45678', 'Accurate',
 '', 'Unverified',
 '', 'Unverified',
 '', 'Unverified',
 'Bootstrapped, looking for growth capital. Warm intro via Priya Mehta.', '[]', now()),

-- 5
('Vikram Reddy', 'Vikram', 'Reddy', 'Chief Marketing Officer', 'Swiggy',
 'Food Technology', 'Food Delivery', '5001-10000', 'U74999KA2014PTC074561',
 'swiggy.com', 'linkedin.com/company/swiggy', 'Bangalore', 'Karnataka', 'linkedin.com/in/vikram-reddy-swiggy',
 'vikram.reddy@swiggy.in', 'Unverified',
 '+91 97400 56789', 'Unverified',
 '', 'Unverified',
 '', 'Unverified',
 '+91 80 6741 2345', 'Accurate',
 'Email needs re-verification. Try personal LinkedIn DM.', '[]', now()),

-- 6
('Neha Kapoor', 'Neha', 'Kapoor', 'Director of Operations', 'OYO Rooms',
 'Hospitality Technology', 'Hotel Aggregator', '1001-5000', 'U55101HR2012PTC046573',
 'oyorooms.com', 'linkedin.com/company/oyo-rooms', 'Gurugram', 'Haryana', 'linkedin.com/in/neha-kapoor-oyo',
 'neha.kapoor@oyorooms.com', 'Accurate',
 '+91 96500 67890', 'Accurate',
 '+91 124 499 7766', 'Accurate',
 '', 'Unverified',
 '+91 124 499 7700', 'Accurate',
 'Strong interest in automated vendor management. Decision in 60 days.', '[]', now()),

-- 7
('Amit Joshi', 'Amit', 'Joshi', 'Senior Vice President - Sales', 'HDFC Life Insurance',
 'Banking, Financial Services & Insurance', 'Life Insurance', '10001+', 'U99999MH2000PLC128245',
 'hdfclife.com', 'linkedin.com/company/hdfc-life', 'Mumbai', 'Maharashtra', 'linkedin.com/in/amit-joshi-hdfclife',
 'amit.joshi@hdfclife.com', 'Accurate',
 '+91 99876 78901', 'Accurate',
 '', 'Unverified',
 '', 'Unverified',
 '+91 22 6751 6666', 'Accurate',
 'Decision maker for B2B lead gen tools. Very responsive on LinkedIn.', '[]', now()),

-- 8
('Ritu Singh', 'Ritu', 'Singh', 'Co-Founder & COO', 'LearnHive EdTech',
 'Education Technology', 'K-12 EdTech', '11-50', 'U80903KA2019PTC122345',
 'learnhive.net', 'linkedin.com/company/learnhive-edtech', 'Pune', 'Maharashtra', 'linkedin.com/in/ritu-singh-learnhive',
 'ritu@learnhive.net', 'Accurate',
 '+91 91300 89012', 'Accurate',
 '', 'Unverified',
 '', 'Unverified',
 '', 'Unverified',
 'Early stage, seeking partnership. Discussed product demo on 14 May 2025.', '[]', now()),

-- 9
('Sanjay Kumar', 'Sanjay', 'Kumar', 'Chief Revenue Officer', 'Zoho Corporation',
 'Software as a Service', 'Enterprise Software Suite', '10001+', 'U72200TN1996PLC036064',
 'zoho.com', 'linkedin.com/company/zoho', 'Chennai', 'Tamil Nadu', 'linkedin.com/in/sanjay-kumar-zoho',
 'sanjay.kumar@zoho.com', 'Accurate',
 '+91 98408 90123', 'Accurate',
 '', 'Unverified',
 '', 'Unverified',
 '+91 44 6716 9100', 'Accurate',
 'Champions internal tool adoption. Partner track potential.', '[]', now()),

-- 10
('Kavita Desai', 'Kavita', 'Desai', 'General Manager - Partnerships', 'PhonePe',
 'Financial Technology', 'Digital Payments', '1001-5000', 'U74999KA2015PTC082573',
 'phonepe.com', 'linkedin.com/company/phonepe', 'Bangalore', 'Karnataka', 'linkedin.com/in/kavita-desai-phonepe',
 'kavita.desai@phonepe.com', 'Accurate',
 '+91 97410 01234', 'Accurate',
 '', 'Unverified',
 '', 'Unverified',
 '+91 80 6872 1234', 'Unverified',
 'Looking for CRM integration tools. Budget approved for Q2 2025.', '[]', now()),

-- 11
('Deepak Malhotra', 'Deepak', 'Malhotra', 'Managing Director', 'Tata Consultancy Services',
 'Information Technology', 'IT Consulting', '10001+', 'L22210MH1995PLC084781',
 'tcs.com', 'linkedin.com/company/tata-consultancy-services', 'Mumbai', 'Maharashtra', 'linkedin.com/in/deepak-malhotra-tcs',
 'deepak.malhotra@tcs.com', 'Accurate',
 '+91 98210 12345', 'Accurate',
 '+91 22 6778 9123', 'Accurate',
 '', 'Unverified',
 '+91 22 6778 9999', 'Accurate',
 'Senior stakeholder. Introduced via Rahul Sharma (Infosys). High-value target.', '[]', now()),

-- 12
('Anjali Menon', 'Anjali', 'Menon', 'Head of Product', 'Meesho',
 'E-Commerce', 'Social Commerce', '1001-5000', 'U74999KA2015PTC083451',
 'meesho.com', 'linkedin.com/company/meesho', 'Bangalore', 'Karnataka', 'linkedin.com/in/anjali-menon-meesho',
 'anjali.menon@meesho.com', 'Unverified',
 '+91 87920 23456', 'Unverified',
 '', 'Unverified',
 '', 'Unverified',
 '', 'Unverified',
 'Product-led growth mindset. Needs verification. Try work email first.', '[]', now()),

-- 13
('Rohit Agarwal', 'Rohit', 'Agarwal', 'Founder & CEO', 'ClearTax (Clear)',
 'Financial Technology', 'Tax & Compliance SaaS', '201-500', 'U74999KA2011PTC059765',
 'clear.in', 'linkedin.com/company/cleartax', 'Bangalore', 'Karnataka', 'linkedin.com/in/rohit-agarwal-cleartax',
 'rohit@clear.in', 'Accurate',
 '+91 98440 34567', 'Accurate',
 '', 'Unverified',
 '', 'Unverified',
 '+91 80 6769 2222', 'Accurate',
 'Highly active on LinkedIn. Published thought leadership on AI in tax. DM angle.', '[]', now()),

-- 14
('Pooja Iyer', 'Pooja', 'Iyer', 'VP of Engineering', 'Dream11',
 'Gaming & Sports Technology', 'Fantasy Sports', '501-1000', 'U92490MH2012PTC231700',
 'dream11.com', 'linkedin.com/company/dream11', 'Mumbai', 'Maharashtra', 'linkedin.com/in/pooja-iyer-dream11',
 'pooja.iyer@dream11.com', 'Accurate',
 '+91 96503 45678', 'Accurate',
 '', 'Unverified',
 '', 'Unverified',
 '+91 22 4614 1234', 'Unverified',
 'Tech buyer for infrastructure tools. Interested in ML-based scoring.', '[]', now()),

-- 15
('Manoj Tiwari', 'Manoj', 'Tiwari', 'Chief Business Officer', 'Nykaa',
 'E-Commerce', 'Beauty & Wellness Retail', '1001-5000', 'U52600MH2012PLC235717',
 'nykaa.com', 'linkedin.com/company/nykaa', 'Mumbai', 'Maharashtra', 'linkedin.com/in/manoj-tiwari-nykaa',
 'manoj.tiwari@nykaa.com', 'Accurate',
 '+91 99203 56789', 'Accurate',
 '+91 22 4067 1234', 'Accurate',
 '', 'Unverified',
 '+91 22 4067 1000', 'Accurate',
 'Actively expanding B2B vertical. Great fit for our enterprise tier. Pitch deck sent.', '[]', now());

-- Confirm success
SELECT COUNT(*) AS total_prospects FROM public.prospects;
