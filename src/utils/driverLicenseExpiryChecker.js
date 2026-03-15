import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { sendNotification } from "./notificationHelper";

/**
 * Checks all users for driver license expiry within 2 months.
 * Sends a notification ONLY on Mondays and only once per week per user.
 * Called on admin dashboard load.
 */
export const checkDriverLicenseExpiry = async () => {
    try {
        // Only run on Mondays (day 1 in JS, 0 = Sunday)
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        if (dayOfWeek !== 1) return; // Not Monday — skip

        // ISO week string e.g. "2026-W09"
        const getISOWeekString = (date) => {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
            return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
        };
        const currentWeek = getISOWeekString(today);

        // 2 months from now
        const twoMonthsFromNow = new Date(today);
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

        const usersSnap = await getDocs(collection(db, "users"));

        for (const userDoc of usersSnap.docs) {
            const userData = userDoc.data();

            // Skip users without driverLicenseExpiry
            if (!userData.driverLicenseExpiry) continue;

            // Parse the expiry date (stored as "YYYY-MM-DD" string from <input type="date">)
            const expiryDate = new Date(userData.driverLicenseExpiry);
            if (isNaN(expiryDate)) continue;

            // Check if expiry is within 2 months AND hasn't already expired
            if (expiryDate <= today || expiryDate > twoMonthsFromNow) continue;

            // Avoid re-sending in the same week
            if (userData.licenseNotifiedWeek === currentWeek) continue;

            const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            const expiryFormatted = expiryDate.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });

            // Send notification to the staff member
            await sendNotification(userDoc.id, {
                type: "info",
                title: "Driver License Expiry Reminder",
                message: `Your driver license expires on ${expiryFormatted} (${daysLeft} days left). Please renew it before expiry.`,
                senderId: "system",
                meta: { expiryDate: userData.driverLicenseExpiry },
            });

            // Mark this week as notified so we don't spam
            await updateDoc(doc(db, "users", userDoc.id), {
                licenseNotifiedWeek: currentWeek,
            });

            console.log(`✅ Driver license expiry notification sent to ${userData.name || userDoc.id}`);
        }
    } catch (err) {
        console.error("❌ Error in checkDriverLicenseExpiry:", err);
    }
};
