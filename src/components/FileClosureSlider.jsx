import React, { useState, useEffect } from "react";
import { db } from "../firebase"; // Assuming the firebase.js file is in the src directory
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";

const FileClosureSlider = ({ isOpen, onClose, selectedClient }) => {
    // ── Form State ──────────────────────────────────────────────
    const [clientName, setClientName] = useState("");
    const [dateOpened, setDateOpened] = useState("");
    const [dateClosed, setDateClosed] = useState("");
    const [programService, setProgramService] = useState("");

    const [typeOfFacility, setTypeOfFacility] = useState({
        "Goals Achieved / Service Completed": false,
        "Client withdrew from Services": false,
        "Client Relocated": false,
        "Referral to Another Agency": false,
        "Ineligibility for Service": false,
        "Other": false,
    });
    const [otherReason, setOtherReason] = useState("");

    const [lastContactDate, setLastContactDate] = useState("");
    const [methodOfContact, setMethodOfContact] = useState({
        "In-Person": false,
        "Phone": false,
        "Email": false,
        "Other": false,
    });
    const [exitInterviewConducted, setExitInterviewConducted] = useState(null); // 'Yes' or 'No'
    const [clientFeedbackCollected, setClientFeedbackCollected] = useState(null); // 'Yes' or 'No'

    const [fileReview, setFileReview] = useState({
        "All cases notes are up to date": false,
        "Required documents are completed and signed": false,
        "Confidential materials filed or archived per policy": false,
        "Risk assessment Completed (if Required)": false,
    });

    const [closureComments, setClosureComments] = useState("");

    const [reviewedBy, setReviewedBy] = useState("");
    const [signature, setSignature] = useState("");
    const [reviewDate, setReviewDate] = useState("");

    const [isSaving, setIsSaving] = useState(false);

    // Populate some data if a client is passed
    useEffect(() => {
        const fetchDetails = async () => {
            if (selectedClient && isOpen) {
                // 1. Client Name
                let cName = "";
                if (selectedClient.siblings) {
                    // From IntakeFormDashboard
                    cName = selectedClient.siblings.map(s => s.fullName).join(", ");
                } else if (selectedClient.clients) {
                    // From ManageIntakeForms
                    cName = Array.isArray(selectedClient.clients) ? selectedClient.clients.join(", ") : selectedClient.clients;
                } else {
                    cName = selectedClient.familyName || selectedClient.filledBy || "";
                }
                setClientName(cName);

                // 2. Date Opened
                setDateOpened(selectedClient.submittedOn || "");

                // 3. Date Closed - Current Date
                const today = new Date();
                const dd = String(today.getDate()).padStart(2, '0');
                const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
                const yyyy = today.getFullYear();
                setDateClosed(`${dd}-${mm}-${yyyy}`);

                // 4. Program Service
                if (selectedClient.careCategory && selectedClient.careCategory !== "—") {
                    setProgramService(selectedClient.careCategory);
                } else {
                    // Fallback to fetch from DB if careCategory wasn't passed or is empty
                    try {
                        const formId = selectedClient.id || selectedClient.formId;
                        if (formId) {
                            const formSnap = await getDoc(doc(db, "InTakeForms", formId));
                            if (formSnap.exists()) {
                                const data = formSnap.data();
                                let service = data.services?.serviceType || data.serviceRequired || "";

                                // Attempt to resolve categories if it's an array of IDs
                                if (Array.isArray(service)) {
                                    // Fetch categories just in case
                                    const { getDocs } = require("firebase/firestore");
                                    const catSnap = await getDocs(collection(db, "shiftCategories"));
                                    const categoryMap = {};
                                    catSnap.forEach(d => categoryMap[d.id] = d.data().name);

                                    service = service.map(id => categoryMap[id] || id).join(", ");
                                }
                                setProgramService(service);
                            }
                        }
                    } catch (error) {
                        console.error("Error fetching form details for program service:", error);
                    }
                }
            }
        };

        fetchDetails();
    }, [selectedClient, isOpen]);

    // ── Handlers ────────────────────────────────────────────────
    const handleFacilityChange = (reason) => {
        setTypeOfFacility(prev => ({ ...prev, [reason]: !prev[reason] }));
    };

    const handleMethodChange = (method) => {
        setMethodOfContact(prev => ({ ...prev, [method]: !prev[method] }));
    };

    const handleFileReviewChange = (item) => {
        setFileReview(prev => ({ ...prev, [item]: !prev[item] }));
    };

    const handleSave = async () => {
        if (!selectedClient) {
            alert("No client selected.");
            return;
        }

        setIsSaving(true);
        try {
            const closureData = {
                clientId: selectedClient.id || selectedClient.formId || "",
                clientName,
                dateOpened,
                dateClosed,
                programService,
                typeOfFacility,
                otherReason: typeOfFacility["Other"] ? otherReason : "",
                finalContactDetails: {
                    lastContactDate,
                    methodOfContact,
                    exitInterviewConducted,
                    clientFeedbackCollected,
                },
                fileReview,
                closureComments,
                supervisorReview: {
                    reviewedBy,
                    signature,
                    date: reviewDate,
                },
                createdAt: serverTimestamp(),
                formType: "File Closure",
                status: "Closed"
            };

            // Option 1: Save as a NEW document in a dedicated 'FileClosures' collection
            await addDoc(collection(db, "FileClosures"), closureData);

            // Option 2 (Enabled): Update the existing Intake Form status
            const clientIdToUpdate = selectedClient.id || selectedClient.formId;
            if (clientIdToUpdate) {
                await updateDoc(doc(db, "InTakeForms", clientIdToUpdate), {
                    status: "Closed",
                    fileClosureDate: dateClosed
                });
            }

            alert("File Closure saved successfully!");
            onClose();
        } catch (error) {
            console.error("Error saving file closure:", error);
            alert("Failed to save File Closure. Check console for details.");
        } finally {
            setIsSaving(false);
        }
    };
    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-[80] transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Slider */}
            <div
                className={`fixed top-0 right-0 w-[450px] sm:w-[500px] h-full bg-white shadow-2xl z-[90] transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"
                    } overflow-y-auto`}
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-light-black">File Closure</h2>
                    <button
                        onClick={onClose}
                        className="text-2xl font-bold text-light-black hover:text-gray-700 leading-none"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-8">
                    {/* Client Information */}
                    <div className="flex flex-col gap-4">
                        <h3 className="font-bold text-[16px] text-light-black">Client Information</h3>

                        <div className="flex flex-col gap-2">
                            <label className="text-[14px] text-light-black font-medium">Client Name</label>
                            <input
                                type="text"
                                placeholder="Enter the client Name"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="border border-[#E0E0E0] rounded-[4px] p-3 text-[14px] focus:outline-none focus:border-dark-green placeholder:text-gray-400"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[14px] text-light-black font-medium">Date Opened</label>
                            <input
                                type="text"
                                placeholder="Enter the date opened"
                                value={dateOpened}
                                onChange={(e) => setDateOpened(e.target.value)}
                                className="border border-[#E0E0E0] rounded-[4px] p-3 text-[14px] focus:outline-none focus:border-dark-green placeholder:text-gray-400"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[14px] text-light-black font-medium">Date Closed</label>
                            <input
                                type="text"
                                placeholder="Enter the Date closed"
                                value={dateClosed}
                                onChange={(e) => setDateClosed(e.target.value)}
                                className="border border-[#E0E0E0] rounded-[4px] p-3 text-[14px] focus:outline-none focus:border-dark-green placeholder:text-gray-400"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[14px] text-light-black font-medium">Program/Service</label>
                            <input
                                type="text"
                                placeholder="Enter the Program/Service"
                                value={programService}
                                onChange={(e) => setProgramService(e.target.value)}
                                className="border border-[#E0E0E0] rounded-[4px] p-3 text-[14px] focus:outline-none focus:border-dark-green placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    <hr className="border-t border-gray-200 my-2" />

                    {/* Type of Facility */}
                    <div className="flex flex-col gap-4">
                        <h3 className="font-bold text-[16px] text-light-black">Type of Facility</h3>
                        <div className="flex flex-col gap-3">
                            {[
                                "Goals Achieved / Service Completed",
                                "Client withdrew from Services",
                                "Client Relocated",
                                "Referral to Another Agency",
                                "Ineligibility for Service",
                                "Other",
                            ].map((reason, index) => (
                                <label key={index} className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={typeOfFacility[reason] || false}
                                        onChange={() => handleFacilityChange(reason)}
                                        className="w-4 h-4 accent-dark-green rounded border-gray-300"
                                    />
                                    <span className="text-[14px] text-light-black">{reason}</span>
                                </label>
                            ))}
                        </div>

                        {typeOfFacility["Other"] && (
                            <input
                                type="text"
                                placeholder="Enter the other reason"
                                value={otherReason}
                                onChange={(e) => setOtherReason(e.target.value)}
                                className="border-b border-gray-300 text-[14px] p-2 focus:outline-none focus:border-dark-green placeholder:text-gray-400 mt-2"
                            />
                        )}
                    </div>

                    <hr className="border-t border-gray-200 my-2" />

                    {/* Final Contact Details */}
                    <div className="flex flex-col gap-4">
                        <h3 className="font-bold text-[16px] text-light-black">Final Contact Details</h3>

                        <div className="flex flex-col gap-2">
                            <label className="text-[14px] text-light-black font-medium">Last Contact Date</label>
                            <input
                                type="text"
                                placeholder="Last Contact date"
                                value={lastContactDate}
                                onChange={(e) => setLastContactDate(e.target.value)}
                                className="border border-[#E0E0E0] rounded-[4px] p-3 text-[14px] focus:outline-none focus:border-dark-green placeholder:text-gray-400"
                            />
                        </div>

                        <div className="flex flex-col gap-2 mt-2">
                            <label className="text-[14px] text-light-black font-medium">Method of Contact</label>
                            <div className="flex flex-col gap-3 mt-1">
                                {["In-Person", "Phone", "Email", "Other"].map((method, index) => (
                                    <label key={index} className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={methodOfContact[method] || false}
                                            onChange={() => handleMethodChange(method)}
                                            className="w-4 h-4 accent-dark-green rounded border-gray-300"
                                        />
                                        <span className="text-[14px] text-light-black">{method}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-4">
                            <label className="text-[14px] text-light-black font-medium">Exit Interview Conducted</label>
                            <div className="flex gap-6 mt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={exitInterviewConducted === "Yes"}
                                        onChange={() => setExitInterviewConducted("Yes")}
                                        className="w-4 h-4 accent-dark-green rounded border-gray-300"
                                    />
                                    <span className="text-[14px] text-light-black">Yes</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={exitInterviewConducted === "No"}
                                        onChange={() => setExitInterviewConducted("No")}
                                        className="w-4 h-4 accent-dark-green rounded border-gray-300"
                                    />
                                    <span className="text-[14px] text-light-black">No</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-2">
                            <label className="text-[14px] text-light-black font-medium">Client Feedback Collected</label>
                            <div className="flex gap-6 mt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={clientFeedbackCollected === "Yes"}
                                        onChange={() => setClientFeedbackCollected("Yes")}
                                        className="w-4 h-4 accent-dark-green rounded border-gray-300"
                                    />
                                    <span className="text-[14px] text-light-black">Yes</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={clientFeedbackCollected === "No"}
                                        onChange={() => setClientFeedbackCollected("No")}
                                        className="w-4 h-4 accent-dark-green rounded border-gray-300"
                                    />
                                    <span className="text-[14px] text-light-black">No</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <hr className="border-t border-gray-200 my-2" />

                    {/* File Review */}
                    <div className="flex flex-col gap-4">
                        <h3 className="font-bold text-[16px] text-light-black">File Review</h3>
                        <div className="flex flex-col gap-4">
                            {[
                                "All cases notes are up to date",
                                "Required documents are completed and signed",
                                "Confidential materials filed or archived per policy",
                                "Risk assessment Completed (if Required)",
                            ].map((item, index) => (
                                <label key={index} className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={fileReview[item] || false}
                                        onChange={() => handleFileReviewChange(item)}
                                        className="w-4 h-4 accent-dark-green rounded border-gray-300"
                                    />
                                    <span className="text-[14px] text-light-black">{item}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Closure Comments / Recommendations */}
                    <div className="flex flex-col gap-2 mt-4">
                        <h3 className="font-bold text-[16px] text-light-black">Closure Comments / Recommendations</h3>
                        <textarea
                            placeholder="Enter closure comments or recommendations"
                            value={closureComments}
                            onChange={(e) => setClosureComments(e.target.value)}
                            className="border border-[#E0E0E0] rounded-[4px] p-3 text-[14px] focus:outline-none focus:border-dark-green placeholder:text-gray-400 h-32 resize-none mt-2"
                        />
                    </div>

                    <hr className="border-t border-gray-200 my-2" />

                    {/* Supervisor Review */}
                    <div className="flex flex-col gap-4">
                        <h3 className="font-bold text-[16px] text-light-black">Supervisor Review</h3>

                        <div className="flex flex-col gap-2">
                            <label className="text-[14px] text-light-black font-medium">Reviewed by</label>
                            <input
                                type="text"
                                placeholder="Enter reviewed by"
                                value={reviewedBy}
                                onChange={(e) => setReviewedBy(e.target.value)}
                                className="border border-[#E0E0E0] rounded-[4px] p-3 text-[14px] focus:outline-none focus:border-dark-green placeholder:text-gray-400"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[14px] text-light-black font-medium">Signature</label>
                            <input
                                type="text"
                                placeholder="Enter signature"
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                                className="border border-[#E0E0E0] rounded-[4px] p-3 text-[14px] focus:outline-none focus:border-dark-green placeholder:text-gray-400"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[14px] text-light-black font-medium">Date</label>
                            <input
                                type="text"
                                placeholder="Enter date"
                                value={reviewDate}
                                onChange={(e) => setReviewDate(e.target.value)}
                                className="border border-[#E0E0E0] rounded-[4px] p-3 text-[14px] focus:outline-none focus:border-dark-green placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4 mt-6 mb-8">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded font-medium text-light-black hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            className="px-6 py-2 bg-dark-green text-white rounded font-medium hover:opacity-90 disabled:opacity-50"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FileClosureSlider;
