import { ArrowLeft, Share2, Phone, MessageCircle, Mail, ChevronRight, Building2, AlertTriangle, Heart, Shield, Palette, Check, Armchair } from 'lucide-react';
import { useNavigate } from 'react-router';

export function ClientDetail() {
  const navigate = useNavigate();
  
  return (
    <div className="px-5 pb-24">
      {/* Header */}
      <header className="h-14 flex items-center justify-between mb-5 pt-4">
        <button 
          onClick={() => navigate('/shifts/1')}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-6 h-6 text-[#1A1A1A]" strokeWidth={2} />
        </button>
        
        <div className="flex-1 text-center">
          <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '18px' }}>
            Client Details
          </h1>
          <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
            Assigned Client
          </div>
        </div>
        
        <button className="w-10 h-10 flex items-center justify-center">
          <Share2 className="w-6 h-6 text-[#6B7280]" strokeWidth={2} />
        </button>
      </header>
      
      {/* Client Profile Hero Card */}
      <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {/* Profile header - centered */}
        <div className="flex flex-col items-center">
          <div 
            className="w-18 h-18 rounded-full flex items-center justify-center font-['Inter'] font-semibold mb-3"
            style={{ 
              backgroundColor: '#F0FDF4',
              color: '#1F6F43',
              fontSize: '24px',
              border: '2px solid #1F6F43'
            }}
          >
            ET
          </div>
          
          <h2 className="font-['Poppins'] font-bold text-[#1A1A1A] mb-1" style={{ fontSize: '20px' }}>
            Emma Thompson
          </h2>
          
          <div className="font-['Inter'] text-[#9CA3AF] mb-3" style={{ fontSize: '13px' }}>
            ID: 0988765
          </div>
          
          {/* Badge row */}
          <div className="flex items-center gap-2 mb-4">
            {/* LEFT: Car Seat pill — client attribute */}
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full font-['Inter'] font-medium"
              style={{
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                fontSize: '11px',
              }}
            >
              <Armchair className="w-3 h-3" strokeWidth={2} />
              Car Seat
            </div>
            {/* RIGHT: Service tag — shift attribute */}
            <div
              className="px-3.5 py-1 rounded-full font-['Inter'] font-semibold"
              style={{
                backgroundColor: '#EBF5FF',
                color: '#1E5FA6',
                fontSize: '11px'
              }}
            >
              Respite Care
            </div>
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-[#F3F4F6] mb-4"></div>
        
        {/* Quick contact row */}
        <div className="flex items-center justify-center gap-4">
          <button className="flex flex-col items-center gap-1.5 w-14 h-14 justify-center rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors">
            <Phone className="w-5.5 h-5.5 text-[#1F6F43]" strokeWidth={2} />
            <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '10px' }}>
              Call
            </span>
          </button>
          
          <button className="flex flex-col items-center gap-1.5 w-14 h-14 justify-center rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors">
            <MessageCircle className="w-5.5 h-5.5 text-[#1F6F43]" strokeWidth={2} />
            <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '10px' }}>
              Message
            </span>
          </button>
          
          <button className="flex flex-col items-center gap-1.5 w-14 h-14 justify-center rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors">
            <Mail className="w-5.5 h-5.5 text-[#1F6F43]" strokeWidth={2} />
            <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '10px' }}>
              Email
            </span>
          </button>
        </div>
      </div>
      
      {/* Personal Information Card */}
      <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            Personal Information
          </h3>
          <ChevronRight className="w-4 h-4 text-[#D1D5DB]" strokeWidth={2} />
        </div>
        
        <div className="space-y-0">
          <div className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Date of Birth</span>
            <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>April 12, 2018</span>
          </div>
          
          <div className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Age</span>
            <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>7 years old</span>
          </div>
          
          <div className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Gender</span>
            <div 
              className="px-2 py-0.5 rounded-xl font-['Inter']"
              style={{ 
                backgroundColor: '#F3F0FF',
                color: '#5B21B6',
                fontSize: '11px'
              }}
            >
              Female
            </div>
          </div>
          
          <div className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Ethnicity</span>
            <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>Hispanic/Latino</span>
          </div>
          
          <div className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Primary Language</span>
            <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>English / Spanish</span>
          </div>
          
          <div className="flex items-center justify-between py-2.5">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>School</span>
            <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>Oakridge Elementary</span>
          </div>
        </div>
      </div>
      
      {/* Guardian & Contact Information Card */}
      <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>
          Guardian & Contact
        </h3>
        
        {/* Primary Guardian row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center font-['Inter'] font-semibold"
              style={{ 
                backgroundColor: '#FFF8E1',
                color: '#92600A',
                fontSize: '13px'
              }}
            >
              MT
            </div>
            <div>
              <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                Maria Thompson
              </div>
              <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                Mother · Primary Guardian
              </div>
            </div>
          </div>
          
          <button className="w-9 h-9 rounded-full bg-[#F0FDF4] flex items-center justify-center hover:bg-[#DCFCE7] transition-colors">
            <Phone className="w-4 h-4 text-[#1F6F43]" strokeWidth={2} />
          </button>
        </div>
        
        <div className="h-px bg-[#F3F4F6] my-3"></div>
        
        {/* Contact details rows */}
        <div className="space-y-0">
          <div className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Phone</span>
            <button className="font-['Inter'] font-medium text-[#1F6F43] hover:underline" style={{ fontSize: '14px' }}>
              (555) 012-3456
            </button>
          </div>
          
          <div className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Email</span>
            <button className="font-['Inter'] font-medium text-[#1F6F43] hover:underline truncate max-w-[200px]" style={{ fontSize: '14px' }}>
              maria.thompson@email.com
            </button>
          </div>
          
          <div className="flex items-start justify-between py-2.5 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] text-[#9CA3AF] pt-0.5" style={{ fontSize: '13px' }}>Address</span>
            <span className="font-['Inter'] font-medium text-[#1A1A1A] text-right max-w-[200px]" style={{ fontSize: '14px' }}>
              1234 Oak Street, Suite 5, Ontario
            </span>
          </div>
          
          <div className="flex items-start justify-between py-2.5">
            <span className="font-['Inter'] text-[#9CA3AF] pt-0.5" style={{ fontSize: '13px' }}>Emergency Contact</span>
            <div className="text-right">
              <div className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                Robert Thompson (Father)
              </div>
              <button className="font-['Inter'] text-[#1F6F43] hover:underline" style={{ fontSize: '13px' }}>
                (555) 012-7890
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Agency Information Card */}
      <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>
          Agency
        </h3>
        
        {/* Agency row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#F0FDF4] flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-[#1F6F43]" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-['Inter'] font-semibold text-[#1A1A1A] mb-1" style={{ fontSize: '14px' }}>
              Ontario Child & Family Services
            </div>
            <div 
              className="inline-block px-2.5 py-0.5 rounded-full font-['Inter'] font-medium"
              style={{ 
                backgroundColor: '#EBF5FF',
                color: '#1E5FA6',
                fontSize: '11px'
              }}
            >
              Government Agency
            </div>
          </div>
        </div>
        
        {/* Key-value rows */}
        <div className="space-y-0 mt-3">
          <div className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Case Worker</span>
            <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>Jennifer Adams</span>
          </div>
          
          <div className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Case ID</span>
            <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>OCFS-2026-04521</span>
          </div>
          
          <div className="flex items-center justify-between py-2.5">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Agency Phone</span>
            <button className="font-['Inter'] font-medium text-[#1F6F43] hover:underline" style={{ fontSize: '14px' }}>
              (555) 800-1234
            </button>
          </div>
        </div>
      </div>
      
      {/* Special Notes & Instructions Card */}
      <div className="bg-white rounded-2xl p-5 mb-4 border-l-4 border-[#F59E0B]" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle className="w-4.5 h-4.5 text-[#F59E0B] flex-shrink-0 mt-0.5" strokeWidth={2} />
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            Special Notes & Instructions
          </h3>
        </div>
        
        <div className="space-y-2 mb-4 font-['Inter'] text-[#374151]" style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <div>• Allergic to peanuts — EpiPen in backpack front pocket</div>
          <div>• Comfort object: blue stuffed elephant — must have during transitions</div>
          <div>• Separation anxiety — use calm transition protocol (see care plan)</div>
          <div>• Medication: Albuterol inhaler as needed for asthma</div>
        </div>
        
        <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>
          Last updated: March 10, 2026 by Jennifer Adams
        </div>
      </div>
      
      {/* Care Plan Summary Card */}
      <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            Care Plan
          </h3>
          <button className="font-['Inter'] font-medium text-[#1F6F43] hover:underline" style={{ fontSize: '13px' }}>
            View Full Plan &gt;
          </button>
        </div>
        
        {/* Mini cards row */}
        <div className="flex gap-2">
          <div className="flex-1 bg-[#F9FAFB] rounded-[10px] p-3 flex flex-col items-center">
            <Heart className="w-4 h-4 text-[#1F6F43] mb-2" strokeWidth={2} />
            <div className="font-['Inter'] font-semibold text-[#1A1A1A] mb-0.5" style={{ fontSize: '11px' }}>
              Emotional
            </div>
            <div className="font-['Inter'] text-[#9CA3AF] text-center" style={{ fontSize: '10px' }}>
              Needs reassurance
            </div>
          </div>
          
          <div className="flex-1 bg-[#F9FAFB] rounded-[10px] p-3 flex flex-col items-center">
            <Shield className="w-4 h-4 text-[#1E5FA6] mb-2" strokeWidth={2} />
            <div className="font-['Inter'] font-semibold text-[#1A1A1A] mb-0.5" style={{ fontSize: '11px' }}>
              Safety
            </div>
            <div className="font-['Inter'] text-[#9CA3AF] text-center" style={{ fontSize: '10px' }}>
              Peanut allergy
            </div>
          </div>
          
          <div className="flex-1 bg-[#F9FAFB] rounded-[10px] p-3 flex flex-col items-center">
            <Palette className="w-4 h-4 text-[#5B21B6] mb-2" strokeWidth={2} />
            <div className="font-['Inter'] font-semibold text-[#1A1A1A] mb-0.5" style={{ fontSize: '11px' }}>
              Activities
            </div>
            <div className="font-['Inter'] text-[#9CA3AF] text-center" style={{ fontSize: '10px' }}>
              Art, reading
            </div>
          </div>
        </div>
      </div>
      
      {/* Service History Snapshot */}
      <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            Service History
          </h3>
          <button className="font-['Inter'] font-medium text-[#1F6F43] hover:underline" style={{ fontSize: '13px' }}>
            See All &gt;
          </button>
        </div>
        
        {/* Stats row */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F3F4F6]">
          <div className="flex-1 text-center relative">
            <div className="font-['Inter'] font-medium text-[#9CA3AF] mb-1" style={{ fontSize: '11px' }}>
              Total Shifts
            </div>
            <div className="font-['Poppins'] font-bold text-[#1A1A1A]" style={{ fontSize: '18px' }}>
              48
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-12 bg-[#F3F4F6]"></div>
          </div>
          
          <div className="flex-1 text-center relative">
            <div className="font-['Inter'] font-medium text-[#9CA3AF] mb-1" style={{ fontSize: '11px' }}>
              This Month
            </div>
            <div className="font-['Poppins'] font-bold text-[#1A1A1A]" style={{ fontSize: '18px' }}>
              6
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-12 bg-[#F3F4F6]"></div>
          </div>
          
          <div className="flex-1 text-center">
            <div className="font-['Inter'] font-medium text-[#9CA3AF] mb-1" style={{ fontSize: '11px' }}>
              With You
            </div>
            <div className="font-['Poppins'] font-bold text-[#1F6F43]" style={{ fontSize: '18px' }}>
              12
            </div>
          </div>
        </div>
        
        {/* Recent activity list */}
        <div className="space-y-0">
          <div className="flex items-center h-12 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] font-medium text-[#9CA3AF] w-12" style={{ fontSize: '12px' }}>
              Mar 12
            </span>
            <span className="font-['Inter'] text-[#1A1A1A] flex-1" style={{ fontSize: '13px' }}>
              Respite Care · 4 hrs
            </span>
            <Check className="w-4 h-4 text-[#22C55E]" strokeWidth={2} />
          </div>
          
          <div className="flex items-center h-12 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] font-medium text-[#9CA3AF] w-12" style={{ fontSize: '12px' }}>
              Mar 8
            </span>
            <span className="font-['Inter'] text-[#1A1A1A] flex-1" style={{ fontSize: '13px' }}>
              Respite Care · 4 hrs
            </span>
            <Check className="w-4 h-4 text-[#22C55E]" strokeWidth={2} />
          </div>
          
          <div className="flex items-center h-12">
            <span className="font-['Inter'] font-medium text-[#9CA3AF] w-12" style={{ fontSize: '12px' }}>
              Mar 5
            </span>
            <span className="font-['Inter'] text-[#1A1A1A] flex-1" style={{ fontSize: '13px' }}>
              Respite Care · 3.5 hrs
            </span>
            <Check className="w-4 h-4 text-[#22C55E]" strokeWidth={2} />
          </div>
        </div>
      </div>
    </div>
  );
}
