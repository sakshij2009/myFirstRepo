import React from 'react'
import AvatarWithInitials from './AvatarInitials';

const RequestNotificationCard = ({ notif, onApprove, onDecline }) => {
 
 const getImagePath = (type) => {
  const images = {
    shift_transfer: "/images/shifTransfer.png",
    leave_request: "/images/leaveRequest.png",

  };

 

  return  "/images/default.png"; 
};



  return (
    <div className={"border border-[#E2E8F0] rounded-[10px] p-2 gap-4 "}>
      <div className=" flex flex-col text-sm gap-2 ">
        <div className='flex gap-3'>
          <div>
           <img src="/images/shiftTransfer.png" alt="" />
          </div>
          <div className='flex flex-col gap-1'>
            <h3 className="font-bold text-sm">{notif.title}</h3>
           <p className='text-[12px] font-normal'>{`${notif.senderId} has requested for ${notif.meta.requestType}`}</p>
           <AvatarWithInitials fullName={notif.senderId} />
          </div>
          <div>
            
           
          </div>
        </div>
        <div>
          {notif.message}

        </div>
        
       

    
      
    </div>

    <div className="mt-3 flex justify-end gap-2">
      <button
        onClick={() => onDecline(notif)}
        className="px-3 py-1 border rounded-md text-gray-700 hover:bg-gray-100"
      >
        Decline
      </button>
      <button
        onClick={() => onApprove(notif)}
        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
      >
        Approve
      </button>
    </div>
      
    </div>
  )
}

export default RequestNotificationCard
