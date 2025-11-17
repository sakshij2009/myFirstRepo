// src/pages/CriticalIncidentForm.jsx
import React, { useEffect, useMemo, useState } from "react";
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

const incidentCatsLeft = [
  "Accident",
  "Allegations of Abuse/ Neglect",
  "Absent from Care/ Unauthorized Absence",
  "Child Criminal Activity/Charges/Offences",
  "Staff/Staff Criminal Activity/Charges/Offences",
  "Death of the Child",
  "Destruction",
  "Fire",
  "Infectious Disease",
];
const incidentCatsRight = [
  "Medication Error/ Medication Concern",
  "Medical attention was required",
  "Placement Disruption",
  "Self-harm/ Self-injury",
  "Sexually Problematic Behaviours",
  "Substance Use/Abuse",
  "Suicide Attempt/ Suicidal Ideation",
  "Weapons",
  "Violence/ Aggression",
  "Victimization",
];
const abuseNeglectSubs = [
  "Current Staff/Staff",
  "Program/ House peer",
  "Parent/ Guardian",
  "Previous Staff",
  "Community member",
  "‘Other’ Please describe",
];

const medicalAttentionSubs = ["Child", "Program/ house peer", "Staff/Staff"];

const substanceUseSubs = [
  "In licensed facility or placement/home",
  "Outside of licensed facility or placement/home",
];


const harmChild = ["Minor injury", "Moderate injury", "Serious Injury to Child"];
const harmStaff = ["Minor injury", "Moderate injury", "Serious Injury"];

const perpetratorChild = [
  "Injury by self",
  "Injury by program peer",
  "Injury by staff/Staff",
  "Injury by community member",
  "Other",
  "Unknown",
];
const perpetratorStaff = [
  "Accidental (self)",
  "Injury by child/youth in program/house",
  "Injury by staff/Staff",
  "Injury by community member",
  "Other",
  "Unknown",
];

const restrictiveA = [
  "Use of Intrusive Measures",
  "Use of monitoring and/or restricting private communication",
  "Surveillance",
  "Room search",
  "Personal search",
  "Voluntary surrender",
  "Restricting access to or confiscating personal property",
  "Use of Restrictive Procedure",
];
const restrictiveB = [
  "Physical restraint (escort/seated/supine/standing/floor)",
  "Isolation room (locked confinement)",
  "Inclusionary time out",
  "Exclusionary time out",
  "Use of a Prohibited Practice(s)",
];

const notifyRows = [
  "CFS Intervention Practitioner",
  "Response Team (CIRT)",
  "Child’s Family",
  "OCYA Complaints Officer",
];

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

/* ---------- default initial values structure ---------- */
const buildDefaultInitialValues = (clientData = {}) => ({
  meta: {
    clientName: clientData.clientName || clientData.name || "",
    dob: clientData.dob || "",
    cyimId: clientData.cyimId || clientData.id || "",
    cipOffice: "",
    cipPractitioner: "",
    centralOffice: "",
    cfg: objectFromKeysFalse(cfgStatuses),
  },

  // incident background
  bg: {
    reporterName: "",
    titleRole: "",
    date: "",
    timeOccur: "",
    timeEnd: "",
    location: "",
    whoInvolved: "",
  },

  // facility
  facility: {
    agencyName: clientData.agencyName || "",
    staffAddress: "",
    staffId: "",
    types: objectFromKeysFalse([...facilityTypesLeft, ...facilityTypesRight]),
    specify: "",
  },

  // types
  types: {
    categories: objectFromKeysFalse([...incidentCatsLeft, ...incidentCatsRight]),
    childHarm: objectFromKeysFalse(harmChild),
    staffHarm: objectFromKeysFalse(harmStaff),
    perpetratorChild: objectFromKeysFalse(perpetratorChild),
    perpetratorStaff: objectFromKeysFalse(perpetratorStaff),
    otherAffect: "",
  },

  // restrictive procedures
  restr: {
    usedA: objectFromKeysFalse(restrictiveA),
    usedB: objectFromKeysFalse(restrictiveB),
    debriefChild: "yes",
    precedingEvents: "",
    informedRights: "yes",
  },

  // details
  details: {
    preceding: "",
    factors: "",
    description: "",
    mitigation: "",
    safetyPlan: "",
  },

  // notifications
  notifications: notifyRows.map((n) => ({ name: n, checked: false, time: "", person: "" })),

  // meta fields for storage
  _meta: {
    status: "draft",
    createdAt: null,
    updatedAt: null,
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
  // notifications array optional
});

/* ---------- component ---------- */
export default function CriticalIncidentForm({ clientData, onSuccess, onCancel }) {
  // currentUser optional — removed since not passed
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // build defaults with client info
  const defaults = useMemo(() => buildDefaultInitialValues(clientData), [clientData]);

  // derive clientId from clientData (expected prop)
  const clientId = clientData?.clientId || clientData?.cyimId || clientData?.id || null;

  // load existing report (draft/submitted) if present AND intake form data by clientId
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // If no clientId, just use defaults built from clientData prop
        if (!clientId) {
          if (mounted) setInitialValues(defaults);
          return;
        }

        // 1) Fetch intakeForms where clientId == clientId (to prefll a few fields)
        let intakeInfo = {};
        try {
          const intakeQ = query(collection(db, "intakeForms"), where("clientId", "==", clientId));
          const intakeSnap = await getDocs(intakeQ);
          if (!intakeSnap.empty) {
            const intakeData = intakeSnap.docs[0].data();
            intakeInfo = {
              clientName: intakeData.clientName || intakeData.name || "",
              dob: intakeData.dob || "",
              cyimId: intakeData.cyimId || intakeData.id || "",
              agencyName: intakeData.agencyName || "",
            };
          }
        } catch (err) {
          // If intake lookup fails, continue with defaults (don't block)
          console.warn("Failed to load intake form for clientId:", clientId, err);
        }

        // 2) Fetch existing critical incident document for this clientId (if exists)
        let incidentData = null;
        try {
          const incidentRef = doc(db, "criticalIncidents", String(clientId));
          const incidentSnap = await getDoc(incidentRef);
          if (incidentSnap.exists()) {
            incidentData = incidentSnap.data();
          }
        } catch (err) {
          console.warn("Failed to load critical incident for clientId:", clientId, err);
        }

        // Merge: defaults <- intakeInfo <- existing incidentData
        const baseDefaults = buildDefaultInitialValues(intakeInfo && Object.keys(intakeInfo).length ? intakeInfo : clientData);
        const merged = deepMerge(baseDefaults, incidentData || {});
        if (mounted) setInitialValues(merged);
      } catch (err) {
        console.error("Failed to load report:", err);
        if (mounted) setInitialValues(defaults);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
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
    <div className="flex flex-col  bg-white rounded ">
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
             {/*------------------- Type of Incident--------------------------------------------------- */}
<div className="flex flex-col gap-[10px]">
  <h2 className="leading-[28px] text-[24px] font-bold">Type of Incident</h2>
  <div className="flex flex-col gap-[10px] border border-light-gray rounded p-4">
    <p className="mb-1 text-sm font-bold leading-[20px]">
      Identify the type of Incident (Select as many categories as apply to the incident that has occurred)
    </p>

    {/* Two-column layout */}
    <div className="grid grid-cols-2 gap-4 gap-x-16 border border-light-gray rounded p-4">
      {/* LEFT COLUMN */}
      <div className="flex flex-col gap-3">
        {incidentCatsLeft.map((k) => (
          <Check
            key={k}
            labelText={k}
            checked={values.types.categories?.[k] || false}
            onChange={() =>
              setFieldValue("types.categories", {
                ...values.types.categories,
                [k]: !values.types.categories?.[k],
              })
            }
          />
        ))}

        {/* Allegations of Abuse/Neglect subcategories */}
        {values.types.categories?.["Allegations of Abuse/ Neglect"] && (
          <div className="ml-6 mt-2 space-y-1 text-sm text-gray-700">
            <p className="font-medium">Allegations related to (select one or more):</p>
            {abuseNeglectSubs.map((sub) => (
              <Check
                key={sub}
                labelText={sub}
                checked={values.types.abuseNeglectSubs?.[sub] || false}
                onChange={() =>
                  setFieldValue("types.abuseNeglectSubs", {
                    ...values.types.abuseNeglectSubs,
                    [sub]: !values.types.abuseNeglectSubs?.[sub],
                  })
                }
              />
            ))}
          </div>
        )}

        {/* Level of harm to child */}
        <p className="mt-4 text-sm font-medium text-gray-900">Level of harm (must also select subcategories)</p>
        {harmChild.map((k) => (
          <Check
            key={k}
            labelText={k}
            checked={values.types.childHarm?.[k] || false}
            onChange={() =>
              setFieldValue("types.childHarm", {
                ...values.types.childHarm,
                [k]: !values.types.childHarm?.[k],
              })
            }
          />
        ))}
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex flex-col gap-3">
        {incidentCatsRight.map((k) => (
          <Check
            key={k}
            labelText={k}
            checked={values.types.categories?.[k] || false}
            onChange={() =>
              setFieldValue("types.categories", {
                ...values.types.categories,
                [k]: !values.types.categories?.[k],
              })
            }
          />
        ))}

        {/* Medical attention required subcategories */}
        {values.types.categories?.["Medical attention was required"] && (
          <div className="ml-6 mt-2 space-y-1 text-sm text-gray-700">
            <p className="font-medium">Medical attention was required for:</p>
            {medicalAttentionSubs.map((sub) => (
              <Check
                key={sub}
                labelText={sub}
                checked={values.types.medicalAttentionSubs?.[sub] || false}
                onChange={() =>
                  setFieldValue("types.medicalAttentionSubs", {
                    ...values.types.medicalAttentionSubs,
                    [sub]: !values.types.medicalAttentionSubs?.[sub],
                  })
                }
              />
            ))}
          </div>
        )}

        {/* Substance Use/Abuse subcategories */}
        {values.types.categories?.["Substance Use/Abuse"] && (
          <div className="ml-6 mt-2 space-y-1 text-sm text-gray-700">
            <p className="font-medium">Use occurred:</p>
            {substanceUseSubs.map((sub) => (
              <Check
                key={sub}
                labelText={sub}
                checked={values.types.substanceUseSubs?.[sub] || false}
                onChange={() =>
                  setFieldValue("types.substanceUseSubs", {
                    ...values.types.substanceUseSubs,
                    [sub]: !values.types.substanceUseSubs?.[sub],
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Harm and perpetrator sections below */}
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-900">Level of harm to Child (select sub-categories)</p>
        {harmChild.map((k) => (
          <Check
            key={k}
            labelText={k}
            checked={values.types.childHarm?.[k] || false}
            onChange={() =>
              setFieldValue("types.childHarm", {
                ...values.types.childHarm,
                [k]: !values.types.childHarm?.[k],
              })
            }
          />
        ))}

        <p className="mt-4 text-sm font-medium text-gray-900">Purported Perpetrator (Child)</p>
        {perpetratorChild.map((k) => (
          <Check
            key={k}
            labelText={k}
            checked={values.types.perpetratorChild?.[k] || false}
            onChange={() =>
              setFieldValue("types.perpetratorChild", {
                ...values.types.perpetratorChild,
                [k]: !values.types.perpetratorChild?.[k],
              })
            }
          />
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-900">Injury to Staff/Staff Level of harm (select sub-categories)</p>
        {harmStaff.map((k) => (
          <Check
            key={k}
            labelText={k}
            checked={values.types.staffHarm?.[k] || false}
            onChange={() =>
              setFieldValue("types.staffHarm", {
                ...values.types.staffHarm,
                [k]: !values.types.staffHarm?.[k],
              })
            }
          />
        ))}

        <p className="mt-4 text-sm font-medium text-gray-900">Purported Perpetrator (Staff)</p>
        {perpetratorStaff.map((k) => (
          <Check
            key={k}
            labelText={k}
            checked={values.types.perpetratorStaff?.[k] || false}
            onChange={() =>
              setFieldValue("types.perpetratorStaff", {
                ...values.types.perpetratorStaff,
                [k]: !values.types.perpetratorStaff?.[k],
              })
            }
          />
        ))}
      </div>
    </div>

    {/* Text Area */}
    <div className="mt-4">
      <Field labelText="Description of who was involved in the incident including any witness(es)">
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

            

















            {/* //////////////////////////////////////////////////////////////////////////// */}
            <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Type of Incident *</h2>
              <p className="mb-3 text-sm text-gray-600">Identify the type of Incident (select as many as apply).</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-3">
                  {incidentCatsLeft.map((k) => (
                    <Check
                      key={k}
                      labelText={k}
                      checked={values.types.categories?.[k] || false}
                      onChange={() =>
                        setFieldValue("types.categories", {
                          ...values.types.categories,
                          [k]: !values.types.categories?.[k],
                        })
                      }
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-3">
                  {incidentCatsRight.map((k) => (
                    <Check
                      key={k}
                      labelText={k}
                      checked={values.types.categories?.[k] || false}
                      onChange={() =>
                        setFieldValue("types.categories", {
                          ...values.types.categories,
                          [k]: !values.types.categories?.[k],
                        })
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Level of harm + Perpetrators */}
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">Level of harm to Child (select sub-categories)</p>
                  {harmChild.map((k) => (
                    <Check
                      key={k}
                      labelText={k}
                      checked={values.types.childHarm?.[k] || false}
                      onChange={() =>
                        setFieldValue("types.childHarm", {
                          ...values.types.childHarm,
                          [k]: !values.types.childHarm?.[k],
                        })
                      }
                    />
                  ))}

                  <p className="mt-4 text-sm font-medium text-gray-900">Purported Perpetrator (Child)</p>
                  {perpetratorChild.map((k) => (
                    <Check
                      key={k}
                      labelText={k}
                      checked={values.types.perpetratorChild?.[k] || false}
                      onChange={() =>
                        setFieldValue("types.perpetratorChild", {
                          ...values.types.perpetratorChild,
                          [k]: !values.types.perpetratorChild?.[k],
                        })
                      }
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">Injury to Staff/Staff Level of harm (select sub-categories)</p>
                  {harmStaff.map((k) => (
                    <Check
                      key={k}
                      labelText={k}
                      checked={values.types.staffHarm?.[k] || false}
                      onChange={() =>
                        setFieldValue("types.staffHarm", {
                          ...values.types.staffHarm,
                          [k]: !values.types.staffHarm?.[k],
                        })
                      }
                    />
                  ))}

                  <p className="mt-4 text-sm font-medium text-gray-900">Purported Perpetrator (Staff)</p>
                  {perpetratorStaff.map((k) => (
                    <Check
                      key={k}
                      labelText={k}
                      checked={values.types.perpetratorStaff?.[k] || false}
                      onChange={() =>
                        setFieldValue("types.perpetratorStaff", {
                          ...values.types.perpetratorStaff,
                          [k]: !values.types.perpetratorStaff?.[k],
                        })
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <Field labelText="‘Other’ occurrence that may seriously affect the health or safety">
                  <TextArea
                    value={values.types.otherAffect}
                    onChange={(e) => setFieldValue("types.otherAffect", e.target.value)}
                  />
                </Field>
              </div>
            </section>
            {/* ////////////////////////////////////////////////////////// */}

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
                  <div key={row.name} className="grid grid-cols-1 items-center gap-4 md:grid-cols-[auto_1fr_1fr] border border-light-gray p-4 rounded">
                    <Check
                      labelText={row.name}
                      checked={row.checked}
                      onChange={() => {
                        const next = [...values.notifications];
                        next[i] = { ...row, checked: !row.checked };
                        setFieldValue("notifications", next);
                      }}
                    />
                    <TextInput
                      placeholder="Time of Incident End/ Return Time"
                      value={row.time}
                      onChange={(e) => {
                        const next = [...values.notifications];
                        next[i] = { ...row, time: e.target.value };
                        setFieldValue("notifications", next);
                      }}
                    />
                    <TextInput
                      placeholder="Name of Person (if applicable)"
                      value={row.person}
                      onChange={(e) => {
                        const next = [...values.notifications];
                        next[i] = { ...row, person: e.target.value };
                        setFieldValue("notifications", next);
                      }}
                    />
                  </div>
                ))}
              </div>

              
                
             
              </div>
            </div>
             


            {/* /////////////////////////////////////////// */}
            <div className="flex flex-col rounded bg-[#FEF2F2] p-4 gap-4 border border-[#FFC9C9] ">
              <div className=" flex gap-4 items-center">
                <img src="/images/jam_triangle-danger.png" alt="" />
                <p className="text-[#82181A] font-bold text-[16px] leading-[24px] text-center items-center">Critical Incident Report Submission</p>
              </div>
              <div>
                <p className="text-[#CD0007] font-normal text-[13px] leading-[20px]">This report must be submitted immediately upon completion. Management will be automatically notified. Ensure all sections are complete and accurate as this is a legal document.</p>
              </div>

              <div className=" flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => saveDraftToFirestore(values)}
                  disabled={saving}
                  className=" items-center justify-center rounded border border-light-green bg-white px-4 py-[10px] text-[16px] leading-[24px] font-medium text-light-green cursor-pointer "
                >
                  Save Draft
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className=" items-center justify-center rounded bg-[#E7000B] px-4 py-[10px] text-[16px] font-medium text-white cursor-pointer"
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
