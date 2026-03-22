import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { FaChevronDown } from "react-icons/fa6";
import { Upload } from "lucide-react";
import SuccessSlider from "../components/SuccessSlider";
import { useNavigate, useParams } from "react-router-dom";
import { sendNotification } from "../utils/notificationHelper";
import PlacesAutocomplete from "./PlacesAutocomplete";

const AddUserForm = ({ mode = "add", user }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [slider, setSlider] = useState({
    show: false,
    title: "",
    subtitle: "",
  });

  const [createdUser, setCreatedUser] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [initialValues, setInitialValues] = useState({
    name: "",
    userId: "",
    username: "",
    password: "",
    email: "",
    phone: "",
    gender: "",
    dayOfJoining: "",
    dailyShiftHours: 12,
    salaryPerHour: "",
    address: "",
    role: "",
    description: "",
    avatar: null,
    dayOfLeaving: "",
    position: "",

    // ✅ NEW FIELDS
    reasonOfLeaving: "",
    totalKMs: "",
    rateBefore5000km: "",
    rateAfter5000km: "",
  });

  // Validation Schema (only used in add mode in your code)
  const validationSchema = Yup.object({
    name: Yup.string().required("Name is required").min(3, "Min 3 chars"),
    userId: Yup.string()
      .required("userId is required")
      .matches(/^[A-Za-z0-9]+$/, "Only alphanumeric allowed"),
    username: Yup.string().required("Username is required").min(3, "Min 3 chars"),
    password: Yup.string().required("Password is required").min(6, "Min 6 chars"),
    email: Yup.string().required("Email is required").email("Invalid email"),
    phone: Yup.string().required("Phone required").matches(/^[0-9]{10}$/, "10 digits"),
    gender: Yup.string().required("Select gender"),
    dayOfJoining: Yup.date().required("Joining date required"),
    dailyShiftHours: Yup.number().typeError("Must be number").required("Required").min(1, "Min 1").max(24, "Max 24"),
    salaryPerHour: Yup.number().typeError("Must be number").required("Required").positive("Positive only"),
    address: Yup.string().required("Address required"),
    role: Yup.string().required("Select role"),
    description: Yup.string().max(200, "Max 200 chars"),
    position: Yup.string().required("Position is required"),

    // ✅ NEW FIELDS (kept optional so we don't break your flow)
    reasonOfLeaving: Yup.string().max(200, "Max 200 chars"),
    totalKMs: Yup.number().typeError("Must be number").min(0, "Cannot be negative").nullable(),
    rateBefore5000km: Yup.number().typeError("Must be number").min(0, "Cannot be negative").nullable(),
    rateAfter5000km: Yup.number().typeError("Must be number").min(0, "Cannot be negative").nullable(),
  });

  // ✅ helper: format to YYYY-MM-DD for <input type="date" />
  const toDateInputValue = (d) => {
    if (!d) return "";
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (mode === "update" && id) {
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("userId", "==", id));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const data = userDoc.data();

            // ✅ Get last shift date and auto-set Date of Leaving
            // NOTE: rename collection/fields here if your shifts structure differs
           let lastShiftDate = "";

          try {
            const shiftsRef = collection(db, "shifts");

            // no orderBy => no index
            const shiftsQ = query(
              shiftsRef,
              where("userId", "==", data.userId || id)
            );

            const shiftsSnap = await getDocs(shiftsQ);

            const parseDate = (v) => {
              if (!v) return null;

              // Firestore Timestamp
              if (typeof v?.toDate === "function") return v.toDate();

              // JS Date
              if (v instanceof Date) return v;

              // ISO string or parseable string
              if (typeof v === "string") {
                const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // DD/MM/YYYY
                if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
                const d = new Date(v);
                return Number.isNaN(d.getTime()) ? null : d;
              }

              // number (ms)
              if (typeof v === "number") {
                const d = new Date(v);
                return Number.isNaN(d.getTime()) ? null : d;
              }

              return null;
            };

            if (!shiftsSnap.empty) {
              const shifts = shiftsSnap.docs.map((d) => d.data());

              // ✅ ONLY shifts that are fully worked (both clock-in and clock-out exist)
              const worked = shifts
                .map((s) => {
                  const clockIn = parseDate(s.clockIn);   // 🔁 rename if different
                  const clockOut = parseDate(s.clockOut); // 🔁 rename if different

                  return { s, clockIn, clockOut };
                })
                .filter(({ clockIn, clockOut }) => clockIn && clockOut);

              if (worked.length) {
                // ✅ pick the latest by clockOut time (most reliable)
                const latestWorked = worked.reduce((best, cur) =>
                  cur.clockOut.getTime() > best.clockOut.getTime() ? cur : best
                );

                // Date of leaving = date of last worked shift
                lastShiftDate = toDateInputValue(latestWorked.clockOut);
              } else {
                // optional: if no worked shifts, keep empty or fallback
                lastShiftDate = "";
              }
            }
          } catch (e) {
            console.warn("Could not auto-fetch last worked shift date:", e?.message || e);
          }


            setInitialValues({
              name: data.name || "",
              userId: data.userId || "",
              username: data.username || "",
              password: data.password || "",
              email: data.email || "",
              phone: data.phone || "",
              gender: data.gender || "",
              dayOfJoining: data.doj || data.dayOfJoining || "",
              dailyShiftHours: data.dailyShiftHours ? Number(data.dailyShiftHours) : "",
              salaryPerHour: data.salaryPerHour ? Number(data.salaryPerHour) : "",
              address: data.address || "",
              role: data.role || "",
              description: data.description || "",
              avatar: null,

              // ✅ FIXED: this must match your form field name
              // Auto set from last shift if found, else keep saved value
              dayOfLeaving: lastShiftDate || data.dayOfLeaving || data.leavingDate || data.dateOfResignation || "",

              position: data.position || "",

              // ✅ NEW FIELDS
              reasonOfLeaving: data.reasonOfLeaving || "",
              totalKMs: data.totalKMs ?? "",
              rateBefore5000km: data.rateBefore5000km ?? "",
              rateAfter5000km: data.rateAfter5000km ?? "",
            });

            if (data.profilePhotoUrl) setAvatarPreview(data.profilePhotoUrl);
          } else {
            console.warn("No user found with userId:", id);
          }
        } catch (err) {
          console.error("Error fetching user:", err);
        }
      }
    };

    fetchUser();
  }, [mode, id]);

  // Avatar change
  const handleAvatarChange = (event, setFieldValue) => {
    const file = event.target.files[0];
    if (file) {
      setFieldValue("avatar", file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveAvatar = (setFieldValue) => {
    setFieldValue("avatar", null);
    setAvatarPreview(null);
  };

  // Submit (UNCHANGED LOGIC)
  const handleSubmit = async (values, { resetForm }) => {
    try {
      let photoURL = avatarPreview;

      if (values.avatar) {
        const storageRef = ref(storage, `users/${values.avatar.name}`);
        await uploadBytes(storageRef, values.avatar);
        photoURL = await getDownloadURL(storageRef);
      }

      if (mode === "update") {
        const q = query(collection(db, "users"), where("userId", "==", id));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const userDoc = snap.docs[0].id;

          await updateDoc(doc(db, "users", userDoc), {
            ...values,
            profilePhotoUrl: photoURL,
            updatedAt: new Date(),
          });

          setSlider({
            show: true,
            title: "User Updated Successfully!",
            subtitle: `${values.name} ${values.userId}`,
            viewText: "View User",
          });

          setCreatedUser(values);
        }
      } else {
        await setDoc(doc(db, "users", values.username), {
          ...values,
          profilePhotoUrl: photoURL,
          createdAt: new Date(),
          isSuspended: false,
        });

        setSlider({
          show: true,
          title: "User Added Successfully!",
          subtitle: `${values.name} ${values.userId}`,
          viewText: "View User",
        });

        setCreatedUser(values);
        resetForm();
        setAvatarPreview(null);
      }

      // Fetch admins (unchanged)
      const q = query(collection(db, "users"), where("role", "==", "admin"));
      const adminsSnapshot = await getDocs(q);
      const admins = adminsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      for (const admin of admins) {
        await sendNotification(admin.id, {
          type: "info",
          title: mode === "add" ? "New Staff Created" : "Staff Updated",
          message:
            mode === "add"
              ? `A new Staff "${values.name}" has been added.`
              : `Staff "${values.name}" has been updated.`,
          senderId: user.name,
          meta: {
            userId: values.username,
            userName: values.name,
            entity: "User",
          },
        });
      }
    } catch (error) {
      console.error(error);
      setSlider({
        show: true,
        title: "Error Saving User!",
        subtitle: "Please try again.",
        viewText: "",
      });
    }
  };

  const inputCls = (hasError) =>
    `w-full px-3 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-gray-700 placeholder-gray-400 ${
      hasError ? "border-red-400" : "border-[#e5e7eb]"
    }`;

  const selectCls = (hasError, empty) =>
    `w-full px-3 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm appearance-none pr-9 ${
      hasError ? "border-red-400" : "border-[#e5e7eb]"
    } ${empty ? "text-gray-400" : "text-gray-700"}`;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border font-semibold transition-all hover:bg-gray-50 text-[13px]"
            style={{ borderColor: "#e5e7eb", color: "#374151" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        </div>
        <h1 className="font-bold text-2xl text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          {mode === "update" ? "Update Staff" : "Add Staff"}
        </h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          {mode === "update" ? "Update an existing staff member" : "Create a new staff member profile"}
        </p>
      </div>

      <div>
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={mode === "add" ? validationSchema : null}
          onSubmit={handleSubmit}
        >
          {({ touched, errors, values, setFieldValue }) => (
            <Form>
              {/* Single white card */}
              <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

                {/* Avatar Section */}
                <div className="mb-6 pb-6 border-b" style={{ borderColor: "#f3f4f6" }}>
                  <div className="flex items-center gap-4">
                    <div
                      className="flex-shrink-0 rounded-full overflow-hidden bg-gray-100 cursor-pointer"
                      style={{ width: 80, height: 80 }}
                      onClick={() => { if (avatarPreview) setIsImageModalOpen(true); }}
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Upload className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input id="avatarInput" type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleAvatarChange(e, setFieldValue)} />
                      <label htmlFor="avatarInput"
                        className="px-3 py-2 rounded-lg font-semibold text-white cursor-pointer text-xs"
                        style={{ backgroundColor: "#1f7a3c" }}>
                        Change Avatar
                      </label>
                      {avatarPreview && (
                        <button type="button" onClick={() => handleRemoveAvatar(setFieldValue)}
                          className="px-3 py-2 rounded-lg border font-semibold hover:bg-gray-50 text-xs"
                          style={{ borderColor: "#e5e7eb", color: "#374151" }}>
                          Remove Avatar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fields grid */}
                <div className="grid grid-cols-2 gap-5">

                  {/* Name */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Name</label>
                    <Field name="name" placeholder="Please enter the name of user" className={inputCls(touched.name && errors.name)} />
                    <ErrorMessage name="name" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Staff ID */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Staff ID</label>
                    <Field name="userId" placeholder="Please enter a specific ID" className={inputCls(touched.userId && errors.userId)} />
                    <ErrorMessage name="userId" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Username</label>
                    <Field name="username" placeholder="Please enter a specific username" className={inputCls(touched.username && errors.username)} />
                    <ErrorMessage name="username" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Password</label>
                    <Field name="password" type="password" placeholder="Please enter a specific password" className={inputCls(touched.password && errors.password)} />
                    <ErrorMessage name="password" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* E-Mail */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>E-Mail</label>
                    <Field name="email" type="email" placeholder="Please enter the e-mail ID" className={inputCls(touched.email && errors.email)} />
                    <ErrorMessage name="email" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Phone No */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Phone No</label>
                    <Field name="phone" placeholder="Please enter the phone no" className={inputCls(touched.phone && errors.phone)} />
                    <ErrorMessage name="phone" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Gender */}
                  <div className="relative">
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Gender</label>
                    <Field as="select" name="gender" className={selectCls(touched.gender && errors.gender, values.gender === "")}>
                      <option value="">Please enter the gender of the user</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </Field>
                    <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none">
                      <FaChevronDown className="text-gray-400 w-3.5 h-3.5" />
                    </span>
                    <ErrorMessage name="gender" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Day of Joining */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Day of Joining</label>
                    <Field name="dayOfJoining" type="date" className={inputCls(touched.dayOfJoining && errors.dayOfJoining)} />
                    <ErrorMessage name="dayOfJoining" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Daily Shift Hours */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Daily Allowed Shift Hours</label>
                    <Field name="dailyShiftHours" type="number" placeholder="Enter the Daily allowed hours" className={inputCls(touched.dailyShiftHours && errors.dailyShiftHours)} />
                    <ErrorMessage name="dailyShiftHours" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Salary Per Hour */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Salary Per Hour</label>
                    <Field name="salaryPerHour" type="number" placeholder="Please enter the specific amount for the user" className={inputCls(touched.salaryPerHour && errors.salaryPerHour)} />
                    <ErrorMessage name="salaryPerHour" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Address</label>
                    <PlacesAutocomplete
                      value={values.address}
                      placeholder="Please enter the address of the user"
                      onChange={(val) => setFieldValue("address", val)}
                      className={inputCls(touched.address && errors.address)}
                    />
                    <ErrorMessage name="address" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Employment Type / Role */}
                  <div className="relative">
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Employment Type</label>
                    <Field as="select" name="role" className={selectCls(touched.role && errors.role, values.role === "")}>
                      <option value="">Please enter the specific amount for the user</option>
                      <option value="Admin">Admin</option>
                      <option value="User">User</option>
                      <option value="Manager">Manager</option>
                    </Field>
                    <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none">
                      <FaChevronDown className="text-gray-400 w-3.5 h-3.5" />
                    </span>
                    <ErrorMessage name="role" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Position – full width */}
                  <div className="col-span-2">
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Position</label>
                    <Field name="position" placeholder="Add a position for the employee" className={inputCls(touched.position && errors.position)} />
                    <ErrorMessage name="position" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  {/* Description – full width */}
                  <div className="col-span-2">
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Description of User</label>
                    <Field as="textarea" name="description" placeholder="Write the description of the User" rows={4}
                      className={`${inputCls(touched.description && errors.description)} resize-none`} />
                    <ErrorMessage name="description" component="div" className="text-red-500 text-xs mt-1" />
                  </div>
                </div>

                {/* Submit */}
                <div className="mt-8 flex justify-end gap-3">
                  <button type="button" onClick={() => navigate(-1)}
                    className="px-5 py-2.5 rounded-lg border font-semibold text-sm transition-all hover:bg-gray-50"
                    style={{ borderColor: "#e5e7eb", color: "#374151" }}>
                    Cancel
                  </button>
                  <button type="submit"
                    className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-all"
                    style={{ backgroundColor: "#1f7a3c" }}>
                    {mode === "update" ? "Update Staff" : "Submit"}
                  </button>
                </div>
              </div>
            </Form>
          )}
        </Formik>

        <SuccessSlider
          show={slider.show}
          title={slider.title}
          subtitle={slider.subtitle}
          viewText={slider.viewText}
          onView={() => {
            if (createdUser) setInitialValues(createdUser);
            navigate("/admin-dashboard/users");
            setSlider({ ...slider, show: false });
          }}
          onDismiss={() => setSlider({ ...slider, show: false })}
        />

        {isImageModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setIsImageModalOpen(false)}>
            <div className="relative">
              <img src={avatarPreview} alt="Large Preview" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-xl" />
              <button className="absolute top-2 right-2 bg-white text-black px-3 py-1 rounded-full shadow cursor-pointer"
                onClick={() => setIsImageModalOpen(false)}>✕</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddUserForm;
