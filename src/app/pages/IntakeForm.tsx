import { ChevronLeft, Phone, Mail, FileText, AlertTriangle } from 'lucide-react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';

const cardStyle = { borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };

function InfoRow({ label, value, isLink, isHighlight }: { label: string; value: string; isLink?: boolean; isHighlight?: boolean }) {
  if (isHighlight) {
    return (
      <div>
        <p className="font-['Inter'] text-[#9CA3AF] mb-1.5" style={{ fontSize: '12px' }}>{label}</p>
        <div className="flex items-start gap-2 p-2.5" style={{ backgroundColor: '#FFF8E1', borderRadius: '8px' }}>
          <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <p className="font-['Inter'] font-semibold text-[#92600A]" style={{ fontSize: '12px' }}>{value}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-[#F3F4F6] last:border-b-0">
      <span className="font-['Inter'] text-[#9CA3AF] flex-shrink-0" style={{ fontSize: '12px' }}>{label}</span>
      <span className={`font-['Inter'] font-medium text-right ${isLink ? 'text-[#1F6F43]' : 'text-[#1A1A1A]'}`} style={{ fontSize: '13px' }}>
        {isLink ? <a href={value.includes('@') ? `mailto:${value}` : `tel:${value}`}>{value}</a> : value}
      </span>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-5 mb-4" style={cardStyle}>
      <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-2" style={{ fontSize: '14px' }}>{title}</h3>
      {children}
    </div>
  );
}

export function IntakeForm() {
  const navigate = useSafeNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F8F6' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] -ml-1">
                <ChevronLeft className="w-5 h-5 text-[#1A1A1A]" strokeWidth={2} />
              </button>
              <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '18px' }}>Intake Form</h1>
            </div>
            <div className="w-6 h-6 rounded-full bg-[#1F6F43] flex items-center justify-center">
              <span className="font-['Poppins'] text-white" style={{ fontSize: '8px', fontWeight: 700 }}>FF</span>
            </div>
          </div>
          <p className="font-['Inter'] text-[#9CA3AF] ml-11" style={{ fontSize: '12px' }}>Family Forever Inc.</p>
        </div>
      </div>

      <div className="px-5 pt-5 pb-8">
        {/* Client Photo & Stats */}
        <div className="bg-white p-5 mb-4 flex flex-col items-center" style={cardStyle}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ border: '3px solid #1F6F43', backgroundColor: '#F0FDF4' }}>
            <span className="font-['Poppins'] font-semibold text-[#1F6F43]" style={{ fontSize: '20px' }}>MC</span>
          </div>
          <h2 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-1" style={{ fontSize: '18px' }}>Michael Chen</h2>
          <p className="font-['Inter'] text-[#6B7280] mb-3" style={{ fontSize: '13px' }}>DOB: March 15, 2016 · Male · Age: 10</p>
          <div className="flex gap-2 mb-2">
            <span className="px-3 py-1 rounded-full font-['Inter'] font-medium" style={{ backgroundColor: '#F0FDF4', color: '#1F6F43', fontSize: '11px' }}>Respite Care</span>
            <span className="px-3 py-1 rounded-full font-['Inter'] font-medium" style={{ backgroundColor: '#E6F1FB', color: '#185FA5', fontSize: '11px' }}>Transportation</span>
          </div>
          <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>Two meals / day</p>
        </div>

        {/* Info */}
        <InfoCard title="Info">
          <InfoRow label="Name" value="Michael Chen" />
          <InfoRow label="Date of Intake" value="January 15, 2026" />
          <InfoRow label="Type of Services" value="Respite Care, Transportation" />
          <InfoRow label="Service Start Details" value="Started January 20, 2026" />
          <InfoRow label="House No" value="4" />
          <InfoRow label="Safety Plan / Risk Management" value="No known risks. Standard child safety protocols apply." />
        </InfoCard>

        {/* Client Info */}
        <InfoCard title="Client Info">
          <InfoRow label="Name" value="Michael Chen" />
          <InfoRow label="Gender" value="Male" />
          <InfoRow label="Date of Birth" value="March 15, 2016" />
          <InfoRow label="Address" value="789 Maple Avenue, Apt 3, Edmonton" />
          <InfoRow label="Start Date" value="January 20, 2026" />
          <InfoRow label="CYW Info" value="Assigned to David Lee, Intake Worker" />
        </InfoCard>

        {/* Parents Info */}
        <InfoCard title="Parents Info">
          <InfoRow label="Name" value="Sarah Chen" />
          <InfoRow label="Relationship" value="Mother" />
          <InfoRow label="Phone No" value="(555) 012-3456" isLink />
          <InfoRow label="Email" value="sarah.chen@email.com" isLink />
          <InfoRow label="Parent Address" value="789 Maple Avenue, Apt 3, Edmonton" />
        </InfoCard>

        {/* Medical Info */}
        <InfoCard title="Medical Info">
          <InfoRow label="Healthcare Number" value="AHC-2026-88432" />
          <InfoRow label="Any Diagnosis" value="Mild asthma" />
          <InfoRow label="Diagnosis Type" value="Respiratory" />
          <InfoRow label="Critical/Medical Concerns" value="Peanut allergy — EpiPen in backpack front pocket. Albuterol inhaler as needed." isHighlight />
          <div className="flex items-center gap-2 pt-3 border-t border-[#F3F4F6] mt-3">
            <FileText className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '12px' }}>2 documents uploaded</span>
          </div>
        </InfoCard>

        {/* Support Needs */}
        <InfoCard title="Support Needs">
          <InfoRow label="Mobility Assistance Required" value="No" />
          <InfoRow label="If Yes Specify" value="N/A" />
          <InfoRow label="Communication Abilities/need" value="Verbal, English primary. Some Mandarin with parents." />
          <InfoRow label="If Yes Specify" value="N/A" />
        </InfoCard>

        {/* Transportations */}
        <InfoCard title="Transportations">
          <InfoRow label="Pick-Up Address" value="789 Maple Avenue, Apt 3" />
          <InfoRow label="Drop-off Address" value="1234 Oak Street, Suite 5" />
          <InfoRow label="Pick-Up Time" value="2:00 PM" />
          <InfoRow label="Drop-off Time" value="6:00 PM" />
          <InfoRow label="Transportation Overview" value="Standard school-to-home route with one visit stop" />
        </InfoCard>

        {/* Supervised Visitations */}
        <InfoCard title="Supervised Visitations">
          <InfoRow label="Visit Start Time" value="3:00 PM" />
          <InfoRow label="Visit End Time" value="4:30 PM" />
          <InfoRow label="Visit Duration" value="1h 30m" />
          <InfoRow label="Type of Visit" value="In-person, supervised" />
          <InfoRow label="Visit Address" value="500 City Hall Plaza" />
          <InfoRow label="Visit Overview" value="Monthly supervised visitation with biological parent" />
        </InfoCard>

        {/* Acknowledgement */}
        <InfoCard title="Acknowledgement">
          <InfoRow label="Name" value="Sarah Chen" />
          <InfoRow label="Date" value="January 15, 2026" />
          <div className="pt-3 border-t border-[#F3F4F6]">
            <p className="font-['Inter'] text-[#9CA3AF] mb-2" style={{ fontSize: '12px' }}>Work Signature</p>
            <div className="h-16 rounded-lg bg-[#FAFAFA] flex items-center justify-center border border-[#E5E7EB]">
              <span className="font-['Dancing Script','cursive'] text-[#4B5563]" style={{ fontSize: '22px' }}>Sarah Chen</span>
            </div>
          </div>
        </InfoCard>

        {/* Go Back */}
        <button
          onClick={() => navigate(-1)}
          className="w-full font-['Inter'] font-medium text-[#6B7280] border border-[#E5E7EB] active:bg-[#F9FAFB] transition-colors"
          style={{ height: '48px', borderRadius: '12px', fontSize: '14px' }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
