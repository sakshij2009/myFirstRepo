// src/components/SuccessSlider.jsx
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheckCircle } from "react-icons/fa";

const SuccessSlider = ({
  show = false,
  title = "Action Successful!",
  subtitle = "",
  viewLabel = "View",
  onView = () => {},
  onDismiss = () => {},
  autoHide = true,
  duration = 5000,
}) => {
  useEffect(() => {
    if (show && autoHide) {
      const timer = setTimeout(() => onDismiss(), duration);
      return () => clearTimeout(timer);
    }
  }, [show, autoHide, duration, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
          className="fixed top-8 right-6 z-50 w-[300px]"
        >
          <div className="bg-white border border-[#59F68D] shadow-xl rounded-xl p-2 flex flex-col gap-1 text-light-black">
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center bg-green-100 p-3 rounded-full">
                <FaCheckCircle className="text-green-600 text-2xl" />
              </div>
              <div className="flex flex-col">
                <p className="text-[14px] font-bold text-gray-800">{title}</p>
                {subtitle && (
                  <p className="text-sm text-[#535E5E]">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-3">
              <button
                onClick={onView}
                className="bg-dark-green text-white px-3 py-[6px] rounded-md transition-all text-[14px] font-medium cursor-pointer"
              >
                View
              </button>
              <button
                onClick={onDismiss}
                className="text-dark-green font-medium text-[14px] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuccessSlider;
