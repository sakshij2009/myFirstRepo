import React, { useState, useEffect } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/* ─── step icons (inline SVGs) ─── */
const ClipboardIcon = ({ active }) => (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={active ? "#16A34A" : "#9CA3AF"} strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
);

const ListIcon = ({ active }) => (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={active ? "#16A34A" : "#9CA3AF"} strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5h7M9 9h5M9 13h7M9 17h3M5 5h.01M5 9h.01M5 13h.01M5 17h.01" />
    </svg>
);

const DocIcon = ({ active }) => (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={active ? "#16A34A" : "#9CA3AF"} strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const steps = [
    { key: "observations", label: "Observations", Icon: ClipboardIcon },
    { key: "servicepoints", label: "Service Points", Icon: ListIcon },
    { key: "overview", label: "Overview", Icon: DocIcon },
];

/* ─── validation ─── */
const observationsSchema = Yup.object({
    clientName: Yup.string().required("Client name is required"),
    dateOfBirth: Yup.string().required("Date of birth is required"),
    dateOfReport: Yup.string().required("Date of report is required"),
});

/* ─── component ─── */
const ServicePlanForm = ({ shiftId, shiftData, onCancel, step = "observations", onStepChange }) => {
    const activeStep = step;

    const changeStep = (newStep) => {
        if (onStepChange) onStepChange(newStep);
        else setActiveStep(newStep);
    };

    const formType = "servicePlan";

    const [initialValues, setInitialValues] = useState({
        // Client Information
        clientName: shiftData?.clientName || "",
        dateOfBirth: shiftData?.dob || "",
        locationServices: "",
        dateOfIntake: "",
        employee: shiftData?.name || shiftData?.username || "",
        guardianName: "",
        dateOfReport: new Date().toISOString().split("T")[0],

        // Reason for Service
        referredTo: "",
        programBy: "",
        reasonDescription:
            "to address the issues related to the safety, well-being of the child or youth and/or family functioning. The program is designed to provide support, coaching, modeling, prompting and interventions related to goal areas. Family Forever Inc. defines this program as voluntary and supports children, youth and/or their families in addressing goals to enhance individual functioning, reduce risk factors and increase connections to the community.",
        generalObservationsPeriod: "",
        observationDateFrom: "",
        observationDateTo: "",

        // Goal Area 1
        goalArea1Goal: "",
        goalArea1TaskStrategies: "",
        goalArea1ObservedPlanning: "",
        goalArea1AdditionalLearning: "",

        // Goal Area 2
        goalArea2Goal: "",
        goalArea2TaskStrategies: "",
        goalArea2ObservedPlanning: "",
        goalArea2AdditionalLearning: "",

        // Goal Area 3
        goalArea3Goal: "",
        goalArea3TaskStrategies: "",
        goalArea3ObservedPlanning: "",
        goalArea3AdditionalLearning: "",

        // Additional Sections
        currentCircumstances: "",
        culturalReligiousSpiritual: "",
        externalServices: "",
        relationshipFamily: "",
        summaryRecommendations: "",
    });

    // Load existing data from Firestore
    useEffect(() => {
        const loadData = async () => {
            if (!shiftId) return;
            try {
                const shiftSnap = await getDoc(doc(db, "shifts", String(shiftId)));
                if (shiftSnap.exists() && shiftSnap.data().servicePlan) {
                    const saved = shiftSnap.data().servicePlan;
                    setInitialValues((prev) => ({ ...prev, ...saved }));
                }
            } catch (err) {
                console.warn("Error loading service plan:", err);
            }
        };
        loadData();
    }, [shiftId]);

    const handleSubmit = async (values) => {
        if (!shiftId) return;
        try {
            const payload = { ...values, submittedAt: serverTimestamp() };
            await setDoc(
                doc(db, "shifts", String(shiftId)),
                { [formType]: payload },
                { merge: true }
            );
            // alert("Service Plan saved successfully!"); // Removed alert to just flow better or keep it? User said "clicking on that will go t net page". 
            // Better to show a toast or just move? I'll keep it simple for now and just move.
            changeStep("servicepoints");
        } catch (err) {
            console.error("Error saving service plan:", err);
            alert("Failed to save. Please try again.");
        }
    };

    /* ─── styled helpers ─── */
    const labelCls = "block text-sm font-bold text-gray-900 mb-1";
    const inputCls =
        "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500";
    const textareaCls =
        "w-full border border-gray-300 rounded-md px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 min-h-[100px] resize-y";
    const selectCls =
        "border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white";

    return (
        <div className="w-full bg-white rounded-lg p-4">
            {/* ─── STEPPER ─── */}
            {!onStepChange && (
                <div className="flex items-center justify-center py-6 gap-0">
                    {steps.map((stepItem, i) => {
                        const isActive = activeStep === stepItem.key;
                        const stepIndex = steps.findIndex((s) => s.key === activeStep);
                        const isDone = i < stepIndex;

                        return (
                            <React.Fragment key={stepItem.key}>
                                <div
                                    className="flex flex-col items-center cursor-pointer"
                                    onClick={() => changeStep(stepItem.key)}
                                >
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${isActive
                                            ? "border-green-600 bg-green-50"
                                            : isDone
                                                ? "border-green-600 bg-green-100"
                                                : "border-gray-300 bg-white"
                                            }`}
                                    >
                                        <stepItem.Icon active={isActive || isDone} />
                                    </div>
                                    <span
                                        className={`text-xs mt-1 font-medium ${isActive
                                            ? "text-green-700"
                                            : isDone
                                                ? "text-green-600"
                                                : "text-gray-400"
                                            }`}
                                    >
                                        {stepItem.label}
                                    </span>
                                </div>
                                {i < steps.length - 1 && (
                                    <div
                                        className={`h-[2px] w-24 mt-[-16px] ${isDone ? "bg-green-500" : "bg-gray-300"
                                            }`}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}

            {/* ─── FORM AREA ─── */}
            {activeStep === "observations" && (
                <Formik
                    initialValues={initialValues}
                    validationSchema={observationsSchema}
                    enableReinitialize
                    onSubmit={handleSubmit}
                >
                    {({ errors, touched, values, setFieldValue }) => (
                        <Form className="flex flex-col gap-6">
                            {/* Title row */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Service Plan
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        Complete all sections thoroughly · This report is
                                        confidential and protected
                                    </p>
                                </div>
                                {onCancel && (
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="border border-gray-300 rounded-md px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>

                            {/* ─── CLIENT INFORMATION ─── */}
                            <fieldset className="border-t border-gray-200 pt-4">
                                <legend className="text-lg font-bold text-gray-900 mb-4">
                                    Client Information<span className="text-red-500">*</span>
                                </legend>

                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    {/* Client Name */}
                                    <div>
                                        <label className={labelCls}>Client Name</label>
                                        <Field
                                            name="clientName"
                                            className={inputCls}
                                            placeholder="Please write the name of client"
                                        />
                                        {errors.clientName && touched.clientName && (
                                            <p className="text-red-500 text-xs mt-1">
                                                {errors.clientName}
                                            </p>
                                        )}
                                    </div>

                                    {/* Date of Birth */}
                                    <div>
                                        <label className={labelCls}>Date Of Birth</label>
                                        <Field
                                            name="dateOfBirth"
                                            type="date"
                                            className={inputCls}
                                            placeholder="Please enter the date of Birth"
                                        />
                                        {errors.dateOfBirth && touched.dateOfBirth && (
                                            <p className="text-red-500 text-xs mt-1">
                                                {errors.dateOfBirth}
                                            </p>
                                        )}
                                    </div>

                                    {/* Location Services */}
                                    <div>
                                        <label className={labelCls}>Location Services</label>
                                        <Field
                                            name="locationServices"
                                            className={inputCls}
                                            placeholder="Please enter the location"
                                        />
                                    </div>

                                    {/* Date of Intake */}
                                    <div>
                                        <label className={labelCls}>Date of Intake</label>
                                        <Field
                                            name="dateOfIntake"
                                            type="date"
                                            className={inputCls}
                                        />
                                    </div>

                                    {/* Employee */}
                                    <div>
                                        <label className={labelCls}>Employee</label>
                                        <Field
                                            name="employee"
                                            className={inputCls}
                                            placeholder="Employee name"
                                        />
                                    </div>

                                    {/* Guardian Name */}
                                    <div>
                                        <label className={labelCls}>Guardian Name</label>
                                        <Field
                                            name="guardianName"
                                            className={inputCls}
                                            placeholder="Please enter guardian name"
                                        />
                                    </div>

                                    {/* Date of Report (full width) */}
                                    <div>
                                        <label className={labelCls}>Date of Report</label>
                                        <Field
                                            name="dateOfReport"
                                            type="date"
                                            className={inputCls}
                                        />
                                        {errors.dateOfReport && touched.dateOfReport && (
                                            <p className="text-red-500 text-xs mt-1">
                                                {errors.dateOfReport}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </fieldset>

                            {/* ─── REASON FOR SERVICE ─── */}
                            <fieldset className="border-t border-gray-200 pt-4">
                                <legend className="text-lg font-bold text-gray-900 mb-4">
                                    Reason for Service
                                </legend>

                                <div className="flex items-center gap-4 mb-3 flex-wrap">
                                    <span className="text-sm text-gray-700">
                                        Clients are referred to the
                                    </span>
                                    <Field name="referredTo" className={inputCls} placeholder="Referred to..." />
                                    <span className="text-sm text-gray-700">Program by</span>
                                    <Field name="programBy" className={inputCls} placeholder="Program by..." />
                                </div>

                                <div className="mb-4">
                                    <Field
                                        as="textarea"
                                        name="reasonDescription"
                                        className={`${textareaCls} resize-none`}
                                        rows="5"
                                        readOnly
                                    />
                                </div>

                                <div className="flex items-center gap-4 flex-wrap">
                                    <span className="text-sm font-medium text-gray-700">
                                        General Observations of Reporting Period
                                    </span>
                                    <Field
                                        as="select"
                                        name="generalObservationsPeriod"
                                        className={selectCls}
                                    >
                                        <option value="">—</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="biweekly">Bi-Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                    </Field>
                                    <span className="text-sm text-gray-500">(date)</span>
                                    <Field
                                        name="observationDateFrom"
                                        type="date"
                                        className={`${inputCls} w-40`}
                                    />
                                    <span className="text-sm text-gray-500">to</span>
                                    <Field
                                        name="observationDateTo"
                                        type="date"
                                        className={`${inputCls} w-40`}
                                    />
                                    <span className="text-sm text-gray-500">(date)</span>
                                </div>
                            </fieldset>

                            {/* ─── GOAL AREA 1 ─── */}
                            <GoalArea
                                number={1}
                                prefix="goalArea1"
                                labelCls={labelCls}
                                textareaCls={textareaCls}
                                inputCls={inputCls}
                            />

                            {/* ─── GOAL AREA 2 ─── */}
                            <GoalArea
                                number={2}
                                prefix="goalArea2"
                                labelCls={labelCls}
                                textareaCls={textareaCls}
                                inputCls={inputCls}
                            />

                            {/* ─── GOAL AREA 3 ─── */}
                            <GoalArea
                                number={3}
                                prefix="goalArea3"
                                labelCls={labelCls}
                                textareaCls={textareaCls}
                                inputCls={inputCls}
                            />

                            {/* ─── ADDITIONAL SECTIONS ─── */}
                            <fieldset className="border-t border-gray-200 pt-4 flex flex-col gap-4">
                                <div>
                                    <label className={labelCls}>Current Circumstances</label>
                                    <Field
                                        as="textarea"
                                        name="currentCircumstances"
                                        className={textareaCls}
                                        placeholder="Enter the Goal for User"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        Cultural/Religious/Spiritual
                                    </label>
                                    <Field
                                        as="textarea"
                                        name="culturalReligiousSpiritual"
                                        className={textareaCls}
                                        placeholder="Enter the Goal for User"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>External Services</label>
                                    <Field
                                        as="textarea"
                                        name="externalServices"
                                        className={textareaCls}
                                        placeholder="Enter the Goal for User"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        Relationship with Significant Person(s) / Family:
                                    </label>
                                    <Field
                                        as="textarea"
                                        name="relationshipFamily"
                                        className={textareaCls}
                                        placeholder="Enter the Goal for User"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        Summary and Recommendations:
                                    </label>
                                    <Field
                                        as="textarea"
                                        name="summaryRecommendations"
                                        className={textareaCls}
                                        placeholder="Enter the summary for clients"
                                    />
                                </div>
                            </fieldset>

                            {/* ─── BUTTONS ─── */}
                            <div className="flex justify-end gap-3 py-4 border-tlg border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const key = `servicePlan_draft_${shiftId}`;
                                        localStorage.setItem(key, JSON.stringify(values));
                                        alert("Draft saved locally!");
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                                >
                                    Save Draft
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-green-700 text-white rounded-md text-sm font-medium hover:bg-green-800"
                                >
                                    Save & Continue
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>
            )}

            {/* Placeholder for future tabs */}
            {activeStep === "servicepoints" && (
                <ServicePointsTab
                    shiftId={shiftId}
                    onBack={() => changeStep("observations")}
                    onNext={() => changeStep("overview")}
                />
            )}
            {activeStep === "overview" && (
                <OverviewTab
                    shiftId={shiftId}
                    onCancel={onCancel}
                    onBack={() => changeStep("servicepoints")}
                />
            )}
        </div>
    );
};
/* ─── Service Points data ─── */
const RISK_FACTORS = [
    "Are behavioral issues (ie. aggression, extreme defiance, etc.) a concern?",
    "Is safety (other than in #3, #6, or #11) a concern?",
    "Is substance abuse and/or addictions a concern?",
    "Are diagnosed mental health issues a concern?",
    "Are there health concerns (other than #4)?",
    "Is self-harm and/or suicide a concern?",
    "Is client emotional wellness a concern?",
    "Is a formal assessment (psychiatric, educational, etc.) required?",
    "Is problem-solving a concern?",
    "Is involvement in criminal activity a concern?",
    "Is abuse and/or exposure to abuse (physical, sexual, emotional, verbal) a concern?",
];

const PERSONAL_FUNCTIONING = [
    "Is finding an appropriate placement upon discharge a concern?",
    "Is budgeting an area of concern?",
    "Is effective communication a concern?",
    "Is emotional regulation a concern?",
    "Are daily living skills a concern?",
    "Are educational/academic issues a concern?",
    "Are appropriate peer relationships and/or skills a concern?",
    "Are self-identity (cultural, religious, sexual orientation, etc.) issues a concern?",
    "Is the development of employment skills and/or obtaining employment (or day program) required?",
    "Is motivation and/or readiness to change lacking?",
];

const CONNECTION_TO_COMMUNITY = [
    "Is social awareness/social skill development a concern?",
    "Is having a cultural/spiritual and/or religious connection a concern?",
    "Is awareness of community supports and/or resources a concern?",
    "Is involvement in community based activities required?",
];

const RELATIONSHIP_FAMILY = [
    "Is parent-child conflict a concern?",
    "Is family based abuse/neglect an issue that is of concern?",
    "Are grief, separation and/or loss issues areas of concern?",
    "Are parenting skills a concern?",
    "Is attachment to family and/or significant person a concern?",
    "Is reunification with family an area requiring attention?",
];

const FREQ_COLS = ["no", "occasionally", "sometimes", "always"];
const FREQ_LABELS = ["No.", "Occasionally", "Sometimes", "Always"];

/* ─── ServicePointsTab ─── */
const ServicePointsTab = ({ shiftId, onBack, onNext }) => {
    const buildDefaults = () => {
        const d = {};
        const addSection = (key, items) => {
            items.forEach((_, i) => {
                FREQ_COLS.forEach((col) => {
                    d[`${key}_${i}_${col}`] = 0;
                });
            });
        };
        addSection("risk", RISK_FACTORS);
        addSection("personal", PERSONAL_FUNCTIONING);
        addSection("community", CONNECTION_TO_COMMUNITY);
        addSection("family", RELATIONSHIP_FAMILY);
        return d;
    };

    const [values, setValues] = useState(buildDefaults);

    useEffect(() => {
        if (!shiftId) return;
        const load = async () => {
            try {
                const snap = await getDoc(doc(db, "shifts", String(shiftId)));
                if (snap.exists() && snap.data().servicePoints) {
                    setValues((prev) => ({ ...prev, ...snap.data().servicePoints }));
                }
            } catch (err) {
                console.warn("Error loading service points:", err);
            }
        };
        load();
    }, [shiftId]);

    const handleChange = (key, val) => {
        setValues((prev) => ({ ...prev, [key]: Number(val) || 0 }));
    };

    const handleSubmit = async () => {
        if (!shiftId) return;
        try {
            await setDoc(
                doc(db, "shifts", String(shiftId)),
                { servicePoints: { ...values, submittedAt: serverTimestamp() } },
                { merge: true }
            );
            // alert("Service Points saved!");
            if (onNext) onNext();
        } catch (err) {
            console.error("Error saving service points:", err);
            alert("Failed to save.");
        }
    };

    const thCls = "px-3 py-2 text-xs font-bold text-gray-700 text-center border-b border-gray-200";
    const tdCls = "px-3 py-2 text-sm text-gray-800 border-b border-gray-100";
    const numInputCls =
        "w-12 text-center border border-gray-200 rounded py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500";

    const renderTable = (title, sectionKey, items, startNum = 1) => (
        <div className="mb-8">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-gray-50">
                        <th className={`${thCls} w-12 text-left`}>No.</th>
                        <th className={`${thCls} text-left`}>{title}</th>
                        {FREQ_LABELS.map((label) => (
                            <th key={label} className={`${thCls} w-24`}>{label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.map((question, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className={`${tdCls} text-center font-medium`}>{startNum + i}</td>
                            <td className={tdCls}>{question}</td>
                            {FREQ_COLS.map((col) => {
                                const fieldKey = `${sectionKey}_${i}_${col}`;
                                return (
                                    <td key={col} className={`${tdCls} text-center`}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={values[fieldKey] ?? 0}
                                            onChange={(e) => handleChange(fieldKey, e.target.value)}
                                            className={numInputCls}
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
                Outcomes and Service Planning Tool
            </h2>
            {renderTable("RISK FACTORS", "risk", RISK_FACTORS)}
            {renderTable("PERSONAL FUNCTIONING:", "personal", PERSONAL_FUNCTIONING)}
            {renderTable("CONNECTION TO COMMUNITY", "community", CONNECTION_TO_COMMUNITY, 2)}
            {renderTable("RELATIONSHIP WITH FAMILY AND/OR SIGNIFICANT PERSON:", "family", RELATIONSHIP_FAMILY, 2)}
            <div className="flex justify-between py-4 border-t border-gray-200 mt-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-green-700 text-white rounded-md text-sm font-medium hover:bg-green-800 transition-colors"
                >
                    Save & Continue
                </button>
            </div>
        </div>
    );
};


/* ─── Follow-up items ─── */
const FOLLOWUP_ITEMS = [
    "Access to conflict resolution and the Grievance Procedure;",
    "Access to Advocate including the children's Advocate;",
    "Full Involvement in future Service Planning;",
    "Right to an Indigenous /Cultural Resource Person;",
    "Confidentiality;",
    "Program Supports;",
    "Right to revoke my consent.",
];

const SIGNATURE_ROLES = [
    "Author of Report",
    "Child/ Youth",
    "Case Worker",
    "Family/Guardian",
    "Family/Guardian",
];

/* ─── OverviewTab ─── */
const OverviewTab = ({ shiftId, onCancel, onBack }) => {
    const [values, setValues] = useState({
        reportingFrom: "",
        reportingTo: "",
        ...Object.fromEntries(FOLLOWUP_ITEMS.map((_, i) => [`followup_${i}`, ""])),
        ...Object.fromEntries(
            SIGNATURE_ROLES.flatMap((_, i) => [
                [`sig_${i}_name`, ""],
                [`sig_${i}_signature`, ""],
                [`sig_${i}_date`, ""],
            ])
        ),
    });

    useEffect(() => {
        if (!shiftId) return;
        const load = async () => {
            try {
                const snap = await getDoc(doc(db, "shifts", String(shiftId)));
                if (snap.exists() && snap.data().servicePlanOverview) {
                    setValues((prev) => ({ ...prev, ...snap.data().servicePlanOverview }));
                }
            } catch (err) {
                console.warn("Error loading overview:", err);
            }
        };
        load();
    }, [shiftId]);

    const handleChange = (key, val) => {
        setValues((prev) => ({ ...prev, [key]: val }));
    };

    const handleSubmit = async () => {
        if (!shiftId) return;
        try {
            await setDoc(
                doc(db, "shifts", String(shiftId)),
                { servicePlanOverview: { ...values, submittedAt: serverTimestamp() } },
                { merge: true }
            );
            alert("Overview saved successfully!");
        } catch (err) {
            console.error("Error saving overview:", err);
            alert("Failed to save.");
        }
    };

    const inputCls =
        "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500";
    const selectCls =
        "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white";

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                    Signature Service Plan Overview
                </h2>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="border border-gray-300 rounded-md px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                )}
            </div>

            {/* Reporting Period */}
            <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">Reporting period to</span>
                <input
                    type="date"
                    value={values.reportingFrom}
                    onChange={(e) => handleChange("reportingFrom", e.target.value)}
                    className={`${inputCls} w-48`}
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                    type="date"
                    value={values.reportingTo}
                    onChange={(e) => handleChange("reportingTo", e.target.value)}
                    className={`${inputCls} w-48`}
                />
            </div>

            {/* Participation Statement */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm text-gray-700 leading-relaxed">
                I have fully participated in, been informed of and agree to the goals, terms
                and conditions as defined in this Service Plan.
                <br />
                I have also been fully re-informed and understand my following rights:
            </div>

            {/* Follow-up Required */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Follow-up Required<span className="text-red-500">*</span>
                </h3>
                <div className="flex flex-col gap-3">
                    {FOLLOWUP_ITEMS.map((item, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <select
                                value={values[`followup_${i}`] || ""}
                                onChange={(e) => handleChange(`followup_${i}`, e.target.value)}
                                className={`${selectCls} w-64 flex-shrink-0`}
                            >
                                <option value="">—</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                                <option value="na">N/A</option>
                            </select>
                            <span className="text-sm text-gray-700">{item}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Signatures Table */}
            <div className="mt-4">
                <table className="w-full border-collapse border border-gray-200">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="border border-gray-200 px-4 py-3 text-left text-sm font-bold text-gray-900 w-1/4">
                                Name
                            </th>
                            <th className="border border-gray-200 px-4 py-3 text-left text-sm font-bold text-gray-900 w-1/4">
                                Signature
                            </th>
                            <th className="border border-gray-200 px-4 py-3 text-left text-sm font-bold text-gray-900 w-1/4">
                                Role
                            </th>
                            <th className="border border-gray-200 px-4 py-3 text-left text-sm font-bold text-gray-900 w-1/4">
                                Date
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {SIGNATURE_ROLES.map((role, i) => (
                            <tr key={i}>
                                <td className="border border-gray-200 px-4 py-3">
                                    <input
                                        type="text"
                                        value={values[`sig_${i}_name`] || ""}
                                        onChange={(e) => handleChange(`sig_${i}_name`, e.target.value)}
                                        placeholder="Please provide the date of filling the form"
                                        className={inputCls}
                                    />
                                </td>
                                <td className="border border-gray-200 px-4 py-3">
                                    <input
                                        type="text"
                                        value={values[`sig_${i}_signature`] || ""}
                                        onChange={(e) => handleChange(`sig_${i}_signature`, e.target.value)}
                                        placeholder="Please provide the date of filling the form"
                                        className={inputCls}
                                    />
                                </td>
                                <td className="border border-gray-200 px-4 py-3">
                                    <span className="text-sm font-medium text-gray-800">{role}</span>
                                </td>
                                <td className="border border-gray-200 px-4 py-3">
                                    <input
                                        type="date"
                                        value={values[`sig_${i}_date`] || ""}
                                        onChange={(e) => handleChange(`sig_${i}_date`, e.target.value)}
                                        className={inputCls}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Submit */}
            {/* Submit */}
            <div className="flex justify-between py-4 border-t border-gray-200 mt-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-8 py-2.5 bg-green-700 text-white rounded-md text-sm font-medium hover:bg-green-800 transition-colors"
                >
                    Submit
                </button>
            </div>
        </div>
    );
};

/* ─── Goal Area reusable block ─── */
const GoalArea = ({ number, prefix, labelCls, textareaCls, inputCls }) => (
    <fieldset className="border border-gray-200 rounded-lg p-5 flex flex-col gap-4">
        <legend className="text-base font-bold text-gray-900 px-2">
            Goal Area ({number})
        </legend>

        <div>
            <label className={labelCls}>Goal</label>
            <Field
                as="textarea"
                name={`${prefix}Goal`}
                className={textareaCls}
                placeholder="Enter the Goal for User"
            />
        </div>

        <div>
            <label className={labelCls}>Task &amp; Strategies</label>
            <p className="text-sm font-semibold text-gray-700 mb-1">
                Instructor of Success
            </p>
            <Field
                as="textarea"
                name={`${prefix}TaskStrategies`}
                className={textareaCls}
                placeholder="Enter indicator success"
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className={labelCls}>Observed Planning:</label>
                <Field
                    as="textarea"
                    name={`${prefix}ObservedPlanning`}
                    className={`${textareaCls} min-h-[80px]`}
                    placeholder="Please enter the gender of the user"
                />
            </div>
            <div>
                <label className={labelCls}>Additional Learning:</label>
                <Field
                    as="textarea"
                    name={`${prefix}AdditionalLearning`}
                    className={`${textareaCls} min-h-[80px]`}
                    placeholder="Please enter the phone no"
                />
            </div>
        </div>
    </fieldset>
);

export default ServicePlanForm;
