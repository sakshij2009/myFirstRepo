import React, { useState } from 'react';
import { motion } from 'framer-motion';
import UserCardFront from '../components/UserCardFront';
import UserCardBack from '../components/UserCardBack';

const UserCard = ({ user }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="relative w-80 h-52 cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="absolute w-full h-full [transform-style:preserve-3d]"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        {/* Front side */}
        <div className="absolute w-full h-full [backface-visibility:hidden]">
          <UserCardFront user={user} />
        </div>

        {/* Back side */}
        <div className="absolute w-full h-full [backface-visibility:hidden] rotate-y-180">
          <UserCardBack />
        </div>
      </motion.div>
    </div>
  );
};

export default UserCard;
