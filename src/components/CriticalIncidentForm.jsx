// src/pages/CriticalIncidentForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase"; // adjust path if needed

// Your existing input primitives (keep as-is)
import { Field, TextInput, TextArea, Select, Check, Radio } from "../components/Inputs";
import { downloadIncidentFormPDF } from "./DownloadIncidentFormPDF ";

/* ---------- constants (same as your reference) ---------- */
const cfgStatuses = ["CAG", "ICO", "TGO", "PGO", "SFP"];

const facilityTypesLeft = [
  "Foster Care",
  "Kinship Care",
  "ILS/SIL/TSIL",
  "Community Group Care",
  "Agency Campus-based Treatment Centre",
];
const facilityTypesRight = [
  "Ministry Campus-based Treatment Centre", 
  "Personalized Community Care",
  "Secure Services / PSECA Confident",
  "PSECA (Voluntary)",
  "Other No placement",
];

export const incidentCategoriesLeft = [
  {
    label: "Accident",
    dividerAfter: true,
  },
  {
    label:
      "Allegations of Abuse/ Neglect allegations related to (must also select appropriate purported maltreater subcategories)",
    children: [
      "Current Staff/Staff",
      "Program/ House peer",
      "Parent/ Guardian",
      "Previous Staff",
      "Community member",
      "‘Other’ Please describe",
    ],
  },
  {
    label: "Absent from Care/ Unauthorized Absence",
  },
  {
    label: "Child Criminal Activity/Charges/Offences",
  },
  {
    label: "Staff/Staff Criminal Activity/Charges/Offences (or potential of)",
  },
  {
    label: "Death of the Child",
  },
  {
    label: "Destruction",
  },
  {
    label: "Fire",
  },
  {
    label: "Infectious Disease",
  },
  {
    label: "Level of harm (must also select appropriate subcategories)",
    children: [
      "Minor injury (non-life threatening, may or may not have required first aid attention)",
      "Moderate injury (non-life threatening, medical attention required)",
      "Serious Injury to Child (life-threatening injury or significant impairment)",
    ],
  },
  {
    label: "Purported Perpetrator (Child)",
    children: [
      "Injury by self",
      "Injury by program peer",
      "Injury by staff/Staff",
      "Injury by community member",
      "Other, Please Describe",
      "Unknown",
    ],
  },
  {
    label:
      "‘Other’ occurrence that may seriously affect the health or safety of the child.",
  },
];

export const incidentCategoriesRight = [
  {
    label: "Medication Error/ Medication Concern",
    dividerAfter: true,
  },
  {
    label:
      "Medical attention was required for (must also select appropriate subcategories)",
    children: ["Child", "Program/ house peer", "Staff/Staff"],
  },
  {
    label: "Placement Disruption",
  },
  {
    label: "Self-harm/ Self-injury",
  },
  {
    label: "Sexually Problematic Behaviours",
  },
  {
    label:
      "Substance Use/Abuse (must also select appropriate subcategories). Use occurred:",
    children: [
      "In licensed facility or placement/home",
      "Outside of licensed facility or placement/home",
    ],
  },
  {
    label: "Suicide Attempt/ Suicidal Ideation",
  },
  {
    label: "Weapons",
  },
  {
    label: "Violence/ Aggression",
  },
  {
    label: "Victimization",
  },
  {
    label:
      "Injury to Staff/Staff Level of harm (must also select appropriate sub-categories)",
    children: [
      "Minor injury (non-life threatening, may or may not have required first aid attention)",
      "Moderate injury (non-life threatening, medical attention required)",
      "Serious Injury (life-threatening or significant impairment to staff)",
    ],
  },
  {
    label: "Purported Perpetrator (Staff)",
    children: [
      "Accidental (self)",
      "Injury by child/youth in program/house",
      "Injury by staff/Staff",
      "Injury by community member",
      "Other, Please Describe",
      "Unknown",
    ],
  },
];


const restrictiveA = [
  {
    label: "Use of Intrusive Measures (must also select appropriate sub-categories)",
    subItems: [
      "Use of monitoring and/or restricting private communication",
      "Surveillance",
      "Room search",
      "Personal search",
      "Voluntary surrender",
      "Restricting access to or confiscating personal property",
    ],
  },
  {
    label: "Use of Restrictive Procedure (must also select appropriate sub-categories)",
    subItems: [
      "Physical restraint (physical escort, seated, supine, standing, and/or floor restraint)",
      "Isolation room (locked confinement)",
      "Inclusionary time out",
      "Exclusionary time out",
    ],
  },
  {
    label: "Use of a Prohibited Practice(s)",
    subItems: [],
  },
];


const notifyRows = [
  "CFS Intervention Practitioner",
  "Response Team (CIRT)",
  "Child’s Family",
  "OCYA Complaints Officer",
];

const RenderCategory = ({ item ,values,setFieldValue}) => (
  <div key={item.label} className="flex flex-col w-full">

    {/* MAIN CHECKBOX */}
    <Check
      labelText={item.label}
      checked={values.types.categories?.[item.label] || false}
      onChange={() =>
        setFieldValue("types.categories", {
          ...values.types.categories,
          [item.label]: !values.types.categories?.[item.label],
        })
      }
    />

    {/* HORIZONTAL LINE IF REQUIRED */}
    {item.dividerAfter && (
      <div className="border-b border-gray-200 my-2"></div>
    )}

    {/* CHILDREN (INDENTED) */}
    {item.children &&
      values.types.categories?.[item.label] && (
        <div className="ml-6 mt-1 flex flex-col gap-1 text-sm text-gray-700">
          {item.children.map((child) => (
            <Check
              key={child}
              labelText={child}
              checked={values.types.subValues?.[child] || false}
              onChange={() =>
                setFieldValue("types.subValues", {
                  ...values.types.subValues,
                  [child]: !values.types.subValues?.[child],
                })
              }
            />
          ))}
        </div>
      )}
  </div>
);


/* ---------- helpers ---------- */
const toggleMap = (obj = {}, key) => ({ ...obj, [key]: !obj[key] });

const objectFromKeysFalse = (keys = []) =>
  Object.fromEntries(keys.map((k) => [k, false]));

// deep merge defaults & data (simple recursive)
const deepMerge = (defaults, data) => {
  if (!data) return defaults;
  const out = Array.isArray(defaults) ? [...defaults] : { ...defaults };
  Object.keys(defaults).forEach((k) => {
    if (data[k] === undefined) {
      out[k] = defaults[k];
    } else if (
      typeof defaults[k] === "object" &&
      defaults[k] !== null &&
      !Array.isArray(defaults[k])
    ) {
      out[k] = deepMerge(defaults[k], data[k]);
    } else {
      out[k] = data[k];
    }
  });
  // also include any extra keys from data not in defaults
  Object.keys(data).forEach((k) => {
    if (out[k] === undefined) out[k] = data[k];
  });
  return out;
};




/* ---------- default initial values structure (UPDATED) ---------- */
const buildDefaultInitialValues = (seed = {}) => ({
  
  meta: {
    clientName: seed.clientName ?? "",
    dob: seed.dob ?? "",
    cyimId: seed.cyimId ?? "",
    cipOffice: seed.cipOffice ?? "",
    cipPractitioner:
      seed.cipPractitioner ??
      seed.caseWorkerName ??
      seed.intakeCipPractitioner ??
      "",
    centralOffice: seed.centralOffice ?? "",
    cfg: seed.cfg ?? objectFromKeysFalse(cfgStatuses),
  },

  bg: {
    reporterName: seed.staffName ?? "",
    titleRole: seed.staffRole ?? "",
    date:
      seed.bg?.date ??
      seed.bgDate ??
      new Date().toISOString().split("T")[0],
    timeOccur: seed.bg?.timeOccur ?? "",
    timeEnd: seed.bg?.timeEnd ?? "",
    location: seed.bg?.location ?? "",
    whoInvolved: seed.bg?.whoInvolved ?? "",
  },

  facility: {
    agencyName: seed.agencyName ?? "",
    staffAddress: seed.staffAddress ?? "",
    staffId: seed.staffId ?? "",
    types: seed.facility?.types ??
      objectFromKeysFalse([...facilityTypesLeft, ...facilityTypesRight]),
    specify: seed.facility?.specify ?? "",
  },

  types: {
    categories: seed.types?.categories ??
      objectFromKeysFalse([...incidentCategoriesLeft, ...incidentCategoriesRight]),
    subValues: seed.types?.subValues ?? {},
    otherAffect: seed.types?.otherAffect ?? "",
  },

  restr: {
    usedA: seed.restr?.usedA ?? objectFromKeysFalse(restrictiveA),
    debriefChild: seed.restr?.debriefChild ?? "yes",
    precedingEvents: seed.restr?.precedingEvents ?? "",
    informedRights: seed.restr?.informedRights ?? "yes",
  },

  details: {
    preceding: seed.details?.preceding ?? "",
    factors: seed.details?.factors ?? "",
    description: seed.details?.description ?? "",
    mitigation: seed.details?.mitigation ?? "",
    safetyPlan: seed.details?.safetyPlan ?? "",
  },

  notifications: seed.notifications ??
    notifyRows.map((n) => ({
      name: n,
      checked: false,
      time: "",
      person: "",
    })),

  _meta: {
    status: seed._meta?.status ?? "draft",
    createdAt: seed._meta?.createdAt ?? null,
    updatedAt: seed._meta?.updatedAt ?? null,
  },
});


/* ---------- validation schema ---------- */
const validationSchema = Yup.object().shape({
  meta: Yup.object().shape({
    clientName: Yup.string().required("Client name is required"),
    dob: Yup.string().required("DOB is required"),
  }),
  bg: Yup.object().shape({
    reporterName: Yup.string().required("Reporter name is required"),
    date: Yup.string().required("Date is required"),
    timeOccur: Yup.string().required("Time of occurrence is required"),
  }),
  facility: Yup.object().shape({
    agencyName: Yup.string().required("Agency name is required"),
  }),
  types: Yup.object().shape({
    categories: Yup.object().test(
      "at-least-one-category",
      "Select at least one category",
      (val) => val && Object.values(val).some(Boolean)
    ),
  }),
  details: Yup.object().shape({
    description: Yup.string().required("Description is required"),
  }),
});

/* ---------- component ---------- */
export default function CriticalIncidentForm({
  clientData,
  onSuccess,
  onCancel,
  user,
}) {
  const formRef = useRef();
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const defaults = useMemo(
    () => buildDefaultInitialValues(clientData),
    [clientData]
  );

  const clientId =
    clientData?.clientId || clientData?.cyimId || clientData?.id || null;

  /* ---------- Data Loading & Prefilling (UPDATED) ---------- */
useEffect(() => {
  let mounted = true;

  const load = async () => {
    setLoading(true);

    try {
      if (!clientId) {
        if (mounted) setInitialValues(defaults);
        return;
      }

      /* ---------------- 1️⃣ STAFF INFO (user assigned to client) ---------------- */
      let staffInfo = {};
      try {
        const staffId = clientData?.userId || null;

        if (staffId) {
          // fetch user by userId, not by document ID
          const qStaff = query(
            collection(db, "users"),
            where("userId", "==", staffId)
          );
          const snap = await getDocs(qStaff);

          if (!snap.empty) {
            const u = snap.docs[0].data();
            staffInfo = {
              staffId: staffId,
              staffName: u.name || "",
              staffRole: u.role || u.position || "",
              staffAddress: u.address || "",
            };
          }
        }
      } catch (err) {
        console.warn("Staff fetch error:", err);
      }

      /* ---------------- 2️⃣ CLIENT DOB (always correct!) ---------------- */
      let clientInfo = {};
      try {
        // fetch client by clientId field (NOT document ID)
        const qClient = query(
          collection(db, "clients"),
          where("clientId", "==", clientId)
        );
        const snap = await getDocs(qClient);

        if (!snap.empty) {
          const cd = snap.docs[0].data();
          clientInfo = {
            dob: cd.dob || "",
            clientName: cd.clientName || cd.name || "",
            cyimId: cd.cyimId || cd.clientId || "",
          };
        }
      } catch (err) {
        console.warn("Client fetch error:", err);
      }

      /* ---------------- 3️⃣ INTAKE FORM (Agency + Case Worker) ---------------- */
      let intakeInfo = {};
      try {
        const q = query(
          collection(db, "intakeForms"),
          where("clientId", "==", clientId)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const d = snap.docs[0].data();
          intakeInfo = {
            agencyName: d.agencyName || "",
            caseWorkerName: d.caseWorkerName || "",
            intakeCipPractitioner: d.caseWorkerName || "",
            clientName: d.clientName || d.name || "",
            cyimId: d.cyimId || d.id || "",
          };
        }
      } catch (err) {
        console.warn("Intake fetch error:", err);
      }

      /* ---------------- 4️⃣ INCIDENT (if editing) ---------------- */
      let incidentData = null;
      try {
        const ir = doc(db, "criticalIncidents", String(clientId));
        const snap = await getDoc(ir);
        if (snap.exists()) incidentData = snap.data();
      } catch (err) {
        console.warn("Incident fetch error:", err);
      }

      /* ---------------- 5️⃣ MERGE EVERYTHING INTO SEED ---------------- */
      const seed = {
        ...clientData,
        ...clientInfo,
        ...intakeInfo,
        ...staffInfo,
      };

      /* ---------------- 6️⃣ FIX DOB FORMAT ---------------- */
      if (seed.dob) {
        try {
          let v = seed.dob;

          if (v instanceof Object && v.toDate) {
            v = v.toDate().toISOString().split("T")[0];
          } else if (
            typeof v === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(v)
          ) {
            // already correct
          } else {
            v = new Date(v).toISOString().split("T")[0];
          }

          seed.dob = v;
        } catch {
          seed.dob = "";
        }
      }

      /* ---------------- 7️⃣ BUILD FINAL VALUES ---------------- */
      const base = buildDefaultInitialValues(seed);

      // If editing, merge incident data
      const merged = deepMerge(base, incidentData || {});

      if (!incidentData) {
        // NEW REPORT → auto set today's date if not present
        merged.bg.date = new Date().toISOString().split("T")[0];
      }

      if (mounted) setInitialValues(merged);
    } catch (err) {
      console.error(err);
      if (mounted) setInitialValues(defaults);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  load();
  return () => (mounted = false);
}, [clientId, clientData, defaults]);





  // Save draft to Firestore (merge) using clientId
  const saveDraftToFirestore = async (values) => {
    if (!clientId) {
      alert("Missing clientId — cannot save draft.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...values,
        _meta: {
          ...values._meta,
          status: "draft",
          updatedAt: serverTimestamp(),
        },
        // lastEditedBy not available here (no currentUser prop)
      };
      await setDoc(doc(db, "criticalIncidents", String(clientId)), payload, { merge: true });
      alert("Draft saved");
    } catch (err) {
      console.error("saveDraft error:", err);
      alert("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  // Submit final report to Firestore (merge) using clientId
  const submitToFirestore = async (values) => {
    if (!clientId) {
      alert("Missing clientId — cannot submit.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...values,
        _meta: {
          ...values._meta,
          status: "submitted",
          updatedAt: serverTimestamp(),
          createdAt: values._meta?.createdAt || serverTimestamp(),
        },
      };
      await setDoc(doc(db, "criticalIncidents", String(clientId)), payload, { merge: true });
      alert("Report submitted");
      if (typeof onSuccess === "function") {
        try {
          onSuccess(values);
        } catch (err) {
          // swallow onSuccess errors so UI doesn't break
          console.warn("onSuccess callback threw:", err);
        }
      }
    } catch (err) {
      console.error("submit error:", err);
      alert("Failed to submit report");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !initialValues) {
    return <div className="p-8 text-center text-gray-600">Loading report...</div>;
  }

  return (
    <div className="flex flex-col  bg-white rounded " ref={formRef}>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={async (values, formikHelpers) => {
          // validation already run by Formik/Yup
          await submitToFirestore(values);
          // keep values in form after submit — do not reset automatically
        }}
      >
        {({ values, errors, touched, setFieldValue, handleSubmit }) => (
          <form onSubmit={handleSubmit} className=" flex flex-col py-3 px-4 gap-4 text-light-black ">
            {/* Title */}
            <div className="flex  gap-4 justify-between">
                <div className="flex gap-4">
                   <img src="/images/jam_triangle-danger.png" alt="" className="w-[52px]" />
                    <div>
                    <h1 className="font-bold text-[28px] leading-[32px]">Critical Incident Report</h1>
                    <p className="font-normal text-[14px] leading-[20px]">Complete all sections thoroughly - This report is confidential and protected</p>
                    </div>

                </div>
                <div>
                    <p className="text-light-green border border-light-green py-[6px] px-3 font-medium text-[14px] leading-[20px] rounded cursor-pointer"
                     onClick={() => {
                      try {
                        onCancel();
                      } catch (err) {
                        console.warn("onCancel callback threw:", err);
                      }
                    }}
                    >Cancel</p>
                  
                </div>
                
              </div>
              <div><hr className="border-t border-[#E6E6E6]" /></div>

              {/* -----------------Client Information------------------------------------------------- */}
            <div className="flex flex-col gap-[10px]">
               <h2 className="leading-[28px] text-[24px] font-bold ">Client Information</h2>
               <div className="flex flex-col gap-[10px] border border-light-gray rounded p-4">
              <div className="grid grid-cols-2 gap-4 gap-x-16  ">
                <Field labelText="Client Name" error={errors?.meta?.clientName && touched?.meta?.clientName ? errors.meta.clientName : undefined}>
                  <TextInput
                    value={values.meta.clientName}
                    onChange={(e) => setFieldValue("meta.clientName", e.target.value)}
                    placeholder="Select/enter client name"
                  />
                </Field>

                <Field labelText="Date of Birth" error={errors?.meta?.dob && touched?.meta?.dob ? errors.meta.dob : undefined}>
                  <TextInput
                    type="date"
                    value={values.meta.dob}
                    onChange={(e) => setFieldValue("meta.dob", e.target.value)}
                  />
                </Field>

                <Field labelText="CYIM ID Number">
                  <TextInput
                    value={values.meta.cyimId}
                    onChange={(e) => setFieldValue("meta.cyimId", e.target.value)}
                    placeholder="Enter ID"
                  />
                </Field>

                <Field labelText="Client Intervention Practitioner (CIP)">
                  <TextInput
                    value={values.meta.cipPractitioner}
                    onChange={(e) => setFieldValue("meta.cipPractitioner", e.target.value)}
                    placeholder="Enter email/name"
                  />
                </Field>

                <Field labelText="CIP Office">
                  <TextInput
                    value={values.meta.cipOffice}
                    onChange={(e) => setFieldValue("meta.cipOffice", e.target.value)}
                    placeholder="Enter office"
                  />
                </Field>

                <Field labelText="Central Office">
                  <TextInput
                    value={values.meta.centralOffice}
                    onChange={(e) => setFieldValue("meta.centralOffice", e.target.value)}
                    placeholder="Enter central office"
                  />
                </Field>
              </div>

              {/* CFG Status */}
              <div className="flex flex-col gap-[10px]">
                <p className="leading-[20px] text-sm font-bold">CFG Status</p>
                <div className="flex gap-6 border border-light-gray justify-between p-4 rounded">
                  {cfgStatuses.map((k) => (
                    <Check
                      key={k}
                      labelText={k}
                      checked={values.meta.cfg?.[k] || false}
                      onChange={() => setFieldValue(`meta.cfg`, { ...values.meta.cfg, [k]: !values.meta.cfg?.[k] })}
                    />
                  ))}
                </div>
              </div>
              </div>
            </div>

            {/*------------------------------------ Facility Information-------------------------------------- */}
            <div className="flex flex-col gap-[10px]">
               <h2 className="leading-[28px] text-[24px] font-bold ">Facility Information</h2>
               <div className="flex flex-col gap-[10px] border border-light-gray rounded p-4">
              <div className="grid grid-cols-2 gap-4 gap-x-16  ">
                <Field labelText="Name of Agency" error={errors?.facility?.agencyName && touched?.facility?.agencyName ? errors.facility.agencyName : undefined}>
                  <TextInput
                    value={values.facility.agencyName}
                    onChange={(e) => setFieldValue("facility.agencyName", e.target.value)}
                    placeholder="Agency Name"
                  />
                </Field>

                <Field labelText="Facility Staff Address">
                  <TextInput
                    value={values.facility.staffAddress}
                    onChange={(e) => setFieldValue("facility.staffAddress", e.target.value)}
                    placeholder="Address"
                  />
                </Field>

                <Field labelText="Staff ID/ License# (if applicable)">
                  <TextInput
                    value={values.facility.staffId}
                    onChange={(e) => setFieldValue("facility.staffId", e.target.value)}
                    placeholder="ID / License"
                  />
                </Field>
              </div>

              
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-gray-900">Type of Facility</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 border border-light-gray rounded p-4">
                  <div className="flex flex-col gap-3">
                    {facilityTypesLeft.map((k) => (
                      <Check
                        key={k}
                        labelText={k}
                        checked={values.facility.types?.[k] || false}
                        onChange={() =>
                          setFieldValue("facility.types", {
                            ...values.facility.types,
                            [k]: !values.facility.types?.[k],
                          })
                        }
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-3">
                    {facilityTypesRight.map((k) => (
                      <Check
                        key={k}
                        labelText={k}
                        checked={values.facility.types?.[k] || false}
                        onChange={() =>
                          setFieldValue("facility.types", {
                            ...values.facility.types,
                            [k]: !values.facility.types?.[k],
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
               <div className="mt-4">
                <Field labelText="Please Specify">
                  <TextArea
                    value={values.facility.specify}
                    onChange={(e) => setFieldValue("facility.specify", e.target.value)}
                    placeholder="Type of facility for no placement"
                    
                  />
                </Field>
              </div>

              </div>
            </div>

            {/*---------------------------- Incident background-------------------------------------------- */}
            <div className="flex flex-col gap-[10px]">
               <h2 className="leading-[28px] text-[24px] font-bold ">Incident Background</h2>
               <div className="flex flex-col gap-[10px] border border-light-gray rounded p-4">
              <div className="grid grid-cols-2 gap-4 gap-x-16  ">
                <Field labelText="Name of Person Completing Report" error={errors?.bg?.reporterName && touched?.bg?.reporterName ? errors.bg.reporterName : undefined}>
                  <TextInput
                    value={values.bg.reporterName}
                    onChange={(e) => setFieldValue("bg.reporterName", e.target.value)}
                    placeholder="Person Completing Report"
                  />
                </Field>

                <Field labelText="Title/Position/Role">
                  <TextInput
                    value={values.bg.titleRole}
                    onChange={(e) => setFieldValue("bg.titleRole", e.target.value)}
                    placeholder="Position of the staff"
                  />
                </Field>

                <Field labelText="Date of Incident (YYYY-MM-DD)" error={errors?.bg?.date && touched?.bg?.date ? errors.bg.date : undefined}>
                  <TextInput
                    type="date"
                    value={values.bg.date}
                    onChange={(e) => setFieldValue("bg.date", e.target.value)}
                  />
                </Field>

                <Field labelText="Time of Incident Occurrence" error={errors?.bg?.timeOccur && touched?.bg?.timeOccur ? errors.bg.timeOccur : undefined}>
                  <TextInput
                    type="time"
                    value={values.bg.timeOccur}
                    onChange={(e) => setFieldValue("bg.timeOccur", e.target.value)}
                  />
                </Field>

                <Field labelText="Time of Incident End/ Return Time">
                  <TextInput
                    type="time"
                    value={values.bg.timeEnd}
                    onChange={(e) => setFieldValue("bg.timeEnd", e.target.value)}
                  />
                </Field>

                <Field labelText="Description of Incident Location">
                  <TextInput
                    value={values.bg.location}
                    onChange={(e) => setFieldValue("bg.location", e.target.value)}
                    placeholder="Where did it occur?"
                  />
                </Field>
              </div>

               <div className="mt-4">
                <Field labelText="Description of who was involved in the incident including any witness (es)">
                  <TextArea
                    value={values.bg.whoInvolved}
                    onChange={(e) => setFieldValue("bg.whoInvolved", e.target.value)}
                    placeholder="Write down description who was involved during the incident"
                    rows={5}
                  />
                </Field>
              </div>
              </div>
            </div>
            

            

           

           
             {/*------------------- Type of Incident--------------------------------------------------- */}
<div className="flex flex-col gap-[10px]">
  <h2 className="leading-[28px] text-[24px] font-bold">Type of Incident</h2>
  <div className="flex flex-col gap-[10px] border border-light-gray rounded p-4">
    <p className="mb-1 text-sm font-bold leading-[20px]">
      Identify the type of Incident (Select as many categories as apply to the incident that has occurred)
    </p>

        {/* Two-column layout */}
    <div className="border border-light-gray rounded p-4 w-full">

      {/* 2 Columns with Vertical Divider */}
      <div className="grid grid-cols-[1fr_1px_1fr] gap-8 w-full">

        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">
          {incidentCategoriesLeft.map((item) => (
            <RenderCategory
              key={item.label}
              item={item}
              values={values}
              setFieldValue={setFieldValue}
            />
          ))}
        </div>

        {/* VERTICAL DIVIDER */}
        <div className="bg-gray-300 w-px"></div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4">
          {incidentCategoriesRight.map((item) => (
            <RenderCategory
              key={item.label}
              item={item}
              values={values}
              setFieldValue={setFieldValue}
            />
          ))}
        </div>

      </div>

    </div>

     <div className="mt-4">
                <Field labelText="Please Specify">
                  <TextArea
                    value={values.facility.specify}
                    onChange={(e) => setFieldValue("facility.specify", e.target.value)}
                    placeholder="More Details about Incident"
                    
                  />
                </Field>
      </div>

    

    
   
  </div>
  <div className="flex flex-col gap-[10px] border border-light-gray rounded p-4">
    <p className="mb-1 text-sm font-bold leading-[20px]">
      Incidents with use of Intrusive Measures and Restrictive Procedures, Identify the type of response (select as many as apply) to the incident.
    </p>
    <div className="border border-light-gray rounded p-4 w-full">
      <div className="flex flex-col  gap-4">

  {restrictiveA.map((category) => (
    <div key={category.label} className="flex flex-col gap-2">
      
      {/* Main category checkbox */}
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-[3px]"
          name={category.label}
          onChange={(e) =>
            setFieldValue(category.label, e.target.checked)
          }
        />
        <span className="font-semibold text-sm leading-[20px]">
          {category.label}
        </span>
      </label>

      {/* Sub-items */}
      {category.subItems.length > 0 && (
        <div className="ml-6 flex flex-col gap-2">
          {category.subItems.map((sub) => (
            <label key={sub} className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-[3px]"
                name={sub}
                onChange={(e) =>
                  setFieldValue(sub, e.target.checked)
                }
              />
              <span className="text-sm leading-[20px]">
                {sub}
              </span>
            </label>
          ))}
        </div>
      )}

    </div>
  ))}

</div>


    </div>
     <div className="mt-4">
                <Field labelText="Please Specify">
                  <TextArea
                    value={values.facility.specify}
                    onChange={(e) => setFieldValue("facility.specify", e.target.value)}
                    placeholder="More Details about Incident"
                    
                  />
                </Field>
      </div>

  </div>
</div>

 
            



            {/* Incident Details */}
            <div className="flex flex-col gap-[10px]">
               <h2 className="leading-[28px] text-[24px] font-bold ">Incident Details</h2>
               <div className="flex flex-col gap-[10px] border border-light-gray rounded p-4">
            
             <Field labelText="Preceding Events">
                <TextArea
                  value={values.details.preceding}
                  onChange={(e) => setFieldValue("details.preceding", e.target.value)}
                  placeholder="Write down preceding event"
                />
              </Field>

              
                <Field labelText="Contribute Factors">
                  <TextArea
                    value={values.details.factors}
                    onChange={(e) => setFieldValue("details.factors", e.target.value)}
                    placeholder="Provide a description of factors including environmental that may have contributed to the incident."
                  />
                </Field>
              

                <Field labelText="Incident Descriptions *" error={errors?.details?.description && touched?.details?.description ? errors.details.description : undefined}>
                  <TextArea
                    value={values.details.description}
                    onChange={(e) => setFieldValue("details.description", e.target.value)}
                    placeholder="Provide a description of the events in chronological order. Include details relating to who, what, when and where the incident 
                    occurred."
                    rows={6}
                  />
                </Field>
              

             
                <Field labelText="Mitigation Approaches">
                  <TextArea
                    value={values.details.mitigation}
                    onChange={(e) => setFieldValue("details.mitigation", e.target.value)}
                    placeholder="Description of actions and measures taken to pro actively problem solve, de-escalate, manage and mitigate the incident."
                  />
                </Field>
             

              
                <Field labelText="Safety Plan">
                  <TextArea
                    value={values.details.safetyPlan}
                    onChange={(e) => setFieldValue("details.safetyPlan", e.target.value)}
                    placeholder="Provide a description of child safety plan created following the incident (Where applicable)"
                  />
                </Field>

                <Field labelText="Continuous Improvement">
                  <TextArea
                    value={values.details.mitigation}
                    onChange={(e) => setFieldValue("details.mitigation", e.target.value)}
                    placeholder="Description of any follow up, recommendations, and continuous improvement measures that may be required to prevent a similar 
                                 incident from occurring in the future. "
                  />
                </Field>
             
              </div>
            </div>



            {/* Restrictive Procedures */}
             <div className="flex flex-col gap-[10px]">
               <h2 className="leading-[28px] text-[24px] font-bold ">Restrictive Procedures</h2>
               <div className="flex flex-col gap-[10px] border border-light-gray rounded p-4">
            
            <div className="border border-light-gray p-4 rounded">
             <Field labelText="Was a debrief completed with the child?">
                  <div className="flex items-center gap-6 ">
                    <Radio
                      name="debrief"
                      value="yes"
                      checked={values.restr.debriefChild === "yes"}
                      onChange={() => setFieldValue("restr.debriefChild", "yes")}
                      labelText="Yes"
                    />
                    <Radio
                      name="debrief"
                      value="no"
                      checked={values.restr.debriefChild === "no"}
                      onChange={() => setFieldValue("restr.debriefChild", "no")}
                      labelText="No"
                    />
                  </div>
                </Field>
                </div>

                <div className="">
                <Field labelText="Preceding Events">
                  <TextArea
                    value={values.restr.precedingEvents}
                    onChange={(e) => setFieldValue("restr.precedingEvents", e.target.value)}
                    placeholder="Write down preceding event"
                  />
                </Field>
              </div>

                <div className="border border-light-gray p-4 rounded">
                     <Field labelText="During the debrief, was the child informed of their rights, grievance procedures and access to the OCYA?">
                  <div className="flex items-center gap-6">
                    <Radio
                      name="rights"
                      value="yes"
                      checked={values.restr.informedRights === "yes"}
                      onChange={() => setFieldValue("restr.informedRights", "yes")}
                      labelText="Yes"
                    />
                    <Radio
                      name="rights"
                      value="no"
                      checked={values.restr.informedRights === "no"}
                      onChange={() => setFieldValue("restr.informedRights", "no")}
                      labelText="No"
                    />
                  </div>
                </Field>
                </div>

              
                
             
              </div>
            </div>



            

            {/* Notifications */}
             <div className="flex flex-col gap-[10px]">
               <h2 className="leading-[28px] text-[24px] font-bold ">Notifications</h2>
               <div className="flex flex-col gap-[10px] border border-light-gray rounded p-4">
  <div className="space-y-4">
    {values.notifications.map((row, i) => (
      <div
        key={row.name}
        className="grid grid-cols-1 md:grid-cols-[250px_1fr_1fr] gap-6 border border-light-gray p-4 rounded items-start"
      >
        {/* Checkbox + Label */}
        <div className="flex items-center">
          <Check
            labelText={row.name}
            checked={row.checked}
            onChange={() => {
              const next = [...values.notifications];
              next[i] = { ...row, checked: !row.checked };
              setFieldValue("notifications", next);
            }}
          />
        </div>

        {/* Time Input */}
        <div className="flex flex-col w-full">
          <label className="text-sm font-semibold mb-1">
            Time of Incident End/ Return Time
          </label>
          <TextInput
            placeholder="Please enter the timeline of report"
            value={row.time}
            onChange={(e) => {
              const next = [...values.notifications];
              next[i] = { ...row, time: e.target.value };
              setFieldValue("notifications", next);
            }}
          />
        </div>

        {/* Person Name Input */}
        <div className="flex flex-col w-full">
          <label className="text-sm font-semibold mb-1">
            Name of Person (If applicable)
          </label>
          <TextInput
            placeholder="Please enter the name of the person"
            value={row.person}
            onChange={(e) => {
              const next = [...values.notifications];
              next[i] = { ...row, person: e.target.value };
              setFieldValue("notifications", next);
            }}
          />
        </div>
      </div>
    ))}
  </div>
</div>

            </div>
             


            {/* /////////////////////////////////////////// */}
            <div className="flex flex-col rounded bg-[#FEF2F2] p-4 gap-4 border border-[#FFC9C9] pdf-exclude ">
              <div className=" flex gap-4 items-center">
                <img src="/images/jam_triangle-danger.png" alt="" />
                <p className="text-[#82181A] font-bold text-[16px] leading-[24px] text-center items-center">Critical Incident Report Submission</p>
              </div>
              <div>
                <p className="text-[#CD0007] font-normal text-[13px] leading-[20px]">This report must be submitted immediately upon completion. Management will be automatically notified. Ensure all sections are complete and accurate as this is a legal document.</p>
              </div>

              <div className="flex justify-end gap-4 ">

  {user?.role === "user" && (
    <button
      type="button"
      onClick={() => saveDraftToFirestore(values)}
      disabled={saving}
      className="items-center justify-center rounded border border-light-green bg-white px-4 py-[10px] text-[16px] leading-[24px] font-medium text-light-green cursor-pointer"
    >
      Save Draft
    </button>
  )}

  {user?.role === "admin" && (
    <button
      type="button"
      onClick={()=>{downloadIncidentFormPDF(formRef,values)}}  // Your PDF function
      disabled={saving}
      className="items-center justify-center rounded border border-light-green bg-white px-4 py-[10px] text-[16px] leading-[24px] font-medium text-light-green cursor-pointer"
    >
      Download Report
    </button>
  )}

  <button
    type="submit"
    disabled={saving}
    className="items-center justify-center rounded bg-[#E7000B] px-4 py-[10px] text-[16px] font-medium text-white cursor-pointer"
  >
    Report Critical Incident
  </button>

</div>

            </div>
          </form>
        )}
      </Formik>
    </div>
  );
}
