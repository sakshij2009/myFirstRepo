import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { FaChevronDown } from "react-icons/fa6";
import SuccessSlider from "../components/SuccessSlider";
import { useNavigate, useParams } from "react-router-dom";
import { sendNotification } from "../utils/notificationHelper";
import GoogleAddressInput from "../components/GoogleAddressInput";

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

    // ✅ NEW FIELDS (kept optional so we don’t break your flow)
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-bold text-2xl leading-7 text-light-black">
          {mode === "update" ? "Update User" : "Add User"}
        </p>
      </div>
      <hr className="border-t border-gray" />
      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={mode === "add" ? validationSchema : null}
        onSubmit={handleSubmit}
      >
        {({ touched, errors, values, setFieldValue }) => (
          <Form className="flex flex-col gap-4">
            {/* Avatar Section */}
            <div className="flex items-center gap-4 p-4 bg-white border border-light-gray rounded-sm">
              <div
                className="flex bg-gray-200 h-[90px] w-[90px] rounded-full overflow-hidden items-center justify-center cursor-pointer hover:opacity-80 transition"
                onClick={() => {
                  if (avatarPreview) setIsImageModalOpen(true);
                }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <img src="/images/profile.jpeg" className="h-full w-full object-cover" />
                )}
              </div>

              <div className="flex gap-3">
                <input
                  id="avatarInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleAvatarChange(event, setFieldValue)}
                />

                <label
                  htmlFor="avatarInput"
                  className="text-light-green px-3 py-[6px] rounded-sm border-2 border-dark-green font-medium text-sm leading-5 tracking-normal cursor-pointer bg-dark-green text-white"
                >
                  Add Avatar
                </label>

                <button
                  type="button"
                  onClick={() => handleRemoveAvatar(setFieldValue)}
                  className="text-light-green px-3 py-[6px] rounded-sm border-2 border-light-green font-medium text-sm leading-5 tracking-normal "
                >
                  Remove Avatar
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-x-16 gap-y-4 bg-white p-4">
              {/* Name */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Name</label>
                <Field
                  name="name"
                  type="text"
                  placeholder="Please enter the name of user"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                    touched.name && errors.name ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="name" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* User Id */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">User Id</label>
                <Field
                  name="userId"
                  type="text"
                  placeholder="Please enter a specific ID"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                    touched.userId && errors.userId ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="userId" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* Username */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Username</label>
                <Field
                  name="username"
                  type="text"
                  placeholder="Please enter a specific username"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                    touched.username && errors.username ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="username" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* Password */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Password</label>
                <Field
                  name="password"
                  type="text"
                  placeholder="Please enter a specific password"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                    touched.password && errors.password ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="password" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* E-Mail */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">E-Mail</label>
                <Field
                  name="email"
                  type="email"
                  placeholder="Please enter the e-mail ID"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                    touched.email && errors.email ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="email" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* Phone */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Phone No</label>
                <Field
                  name="phone"
                  type="text"
                  placeholder="Please enter the phone no"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                    touched.phone && errors.phone ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="phone" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* Gender */}
              <div className="relative">
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Gender</label>
                <Field
                  as="select"
                  name="gender"
                  className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                    ${values.gender === "" ? "text-[#72787E] font-normal text-sm" : "text-light-black"}  
                    ${touched.gender && errors.gender ? "border-red-500" : "border-light-gray"}
                  `}
                >
                  <option value="">Please enter the gender of the user</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Field>
                <span className="absolute right-3 top-[65%] -translate-y-1/2 pointer-events-none">
                  <FaChevronDown className="text-light-green w-4 h-4" />
                </span>
                <ErrorMessage name="gender" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* Day of Joining */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Date of Joining</label>
                <Field
                  name="dayOfJoining"
                  type="date"
                  className={`w-full border rounded-sm p-[10px]  
                    ${values.dayOfJoining === "" ? "text-[#72787E] font-normal text-sm" : "text-light-black"}
                    ${touched.dayOfJoining && errors.dayOfJoining ? "border-red-500" : "border-light-gray"}
                  `}
                />
                <ErrorMessage name="dayOfJoining" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* Leaving Date (auto set from last shift on update mode) */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                  Date of Leaving/Last Working Date
                </label>
                <Field
                  name="dayOfLeaving"
                  type="date"
                  className={`w-full border rounded-sm p-[10px]  
                    ${values.dayOfLeaving === "" ? "text-[#72787E] font-normal text-sm" : "text-light-black"}
                    ${touched.dayOfLeaving && errors.dayOfLeaving ? "border-red-500" : "border-light-gray"}
                  `}
                />
                <ErrorMessage name="dayOfLeaving" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* ✅ NEW: Reason of leaving (after date of leaving) */}
              <div className="col-span-2">
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                  Reason of Leaving
                </label>
                <Field
                  as="textarea"
                  name="reasonOfLeaving"
                  placeholder="Enter reason of leaving"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal h-24 ${
                    touched.reasonOfLeaving && errors.reasonOfLeaving ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="reasonOfLeaving" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* Position */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Position</label>
                <Field
                  name="position"
                  type="text"
                  placeholder="Please enter the position of user"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                    touched.position && errors.position ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="position" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* Daily Shift Hours */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                  Daily Allowed Shift Hours
                </label>
                <Field
                  name="dailyShiftHours"
                  type="number"
                  placeholder="Enter the Daily allowed hours"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                    touched.dailyShiftHours && errors.dailyShiftHours ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="dailyShiftHours" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* Salary Per Hour */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Salary Per Hour</label>
                <Field
                  name="salaryPerHour"
                  type="number"
                  placeholder="Please enter the specific amount"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                    touched.salaryPerHour && errors.salaryPerHour ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="salaryPerHour" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* ✅ NEW: Total KMs */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Total KMs</label>
                <Field
                  name="totalKMs"
                  type="number"
                  placeholder="Enter total kms"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                    touched.totalKMs && errors.totalKMs ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="totalKMs" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* ✅ NEW: Rate before 5000km */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                  Rate before 5000km
                </label>
                <Field
                  name="rateBefore5000km"
                  type="number"
                  placeholder="Enter rate before 5000km"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                    touched.rateBefore5000km && errors.rateBefore5000km ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="rateBefore5000km" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* ✅ NEW: Rate after 5000km */}
              <div>
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                  Rate after 5000km
                </label>
                <Field
                  name="rateAfter5000km"
                  type="number"
                  placeholder="Enter rate after 5000km"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                    touched.rateAfter5000km && errors.rateAfter5000km ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="rateAfter5000km" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* Address */}
              <div>
                <label className="font-bold text-sm text-light-black">Address</label>
                <GoogleAddressInput
                  value={values.address}
                  placeholder="Enter user address"
                  onChange={(val) => setFieldValue("address", val)}
                />
                <ErrorMessage name="address" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* role */}
              <div className="relative">
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">Role</label>
                <Field
                  as="select"
                  name="role"
                  className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                      ${values.role === "" ? "text-[#72787E] font-normal text-sm" : "text-light-black"}
                      ${touched.role && errors.role ? "border-red-500" : "border-light-gray"}
                    `}
                >
                  <option value="">Please select role </option>
                  <option value="Admin">Admin</option>
                  <option value="User">User</option>
                  <option value="Manager">Manager</option>
                </Field>
                <span className="absolute right-3 top-[65%] -translate-y-1/2 pointer-events-none">
                  <FaChevronDown className="text-light-green w-4 h-4" />
                </span>
                <ErrorMessage name="role" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                  Description of User
                </label>
                <Field
                  as="textarea"
                  name="description"
                  placeholder="Write the description of the User"
                  className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal h-50 ${
                    touched.description && errors.description ? "border-red-500" : "border-light-gray"
                  }`}
                />
                <ErrorMessage name="description" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              {/* Submit Button */}
              <div className="col-span-2 flex justify-center">
                <button type="submit" className="bg-dark-green text-white px-6 py-2 rounded cursor-pointer">
                  {mode === "update" ? "Update User" : "Add User"}
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
        <div
          className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className="relative">
            <img
              src={avatarPreview}
              alt="Large Preview"
              className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-xl"
            />
            <button
              className="absolute top-2 right-2 bg-white text-black px-3 py-1 rounded-full shadow cursor-pointer"
              onClick={() => setIsImageModalOpen(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddUserForm;
