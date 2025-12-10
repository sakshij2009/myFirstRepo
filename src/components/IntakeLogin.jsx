import React, { useState, useEffect } from "react";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import {
  sendSignInLinkToEmail,
  signInWithEmailLink,
  isSignInWithEmailLink,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

const IntakeLogin = () => {
  const navigate = useNavigate();

  // UI Toggle
  const [isLogin, setIsLogin] = useState(true);

  // SIGNUP FIELDS
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [agency, setAgency] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");

  // LOGIN FIELD
  const [loginEmail, setLoginEmail] = useState("");

  // Messages
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

   const UPCS_EMAIL_OPTIONS = [
    "billing@upcs.com",
    "accounts@upcs.com",
  ];

  const isUPCSAgency =
    agency.trim().toLowerCase().startsWith("upcs");

  
  // Detect magic link login
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let storedEmail = window.localStorage.getItem("emailForSignIn");

      if (!storedEmail) {
        storedEmail = window.prompt("Please confirm your email:");
      }

      signInWithEmailLink(auth, storedEmail, window.location.href)
        .then(async () => {
          window.localStorage.removeItem("emailForSignIn");

          const q = query(
            collection(db, "intakeUsers"),
            where("email", "==", storedEmail)
          );
          const snap = await getDocs(q);

          if (!snap.empty) {
            navigate("/intake-form/dashboard");
          } else {
            setError("User not found in database.");
          }
        })
        .catch((err) => setError("Sign-in failed: " + err.message));
    }
  }, [navigate]);

  // -----------------------------
  // SIGNUP HANDLER (UPDATED)
  // -----------------------------
  const handleSignup = async () => {
    setError("");
    setMessage("");

    if (!name || !role || !phone || !email || !invoiceEmail) {
      setError("All fields are required.");
      return;
    }

    if (role === "Intake Worker" && !agency) {
      setError("Agency Name is required for Intake Workers.");
      return;
    }

    

    try {
      const q = query(collection(db, "intakeUsers"), where("email", "==", email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setError("User already exists.");
        return;
      }

      await addDoc(collection(db, "intakeUsers"), {
        name,
        role,
        agency: role === "Intake Worker" ? agency : "",
        phone,
        email,
        invoiceEmail,
        createdAt: new Date(),
      });

      alert("Signup successful! Please log in using your email.");

      // Clear fields
      setName("");
      setRole("");
      setAgency("");
      setPhone("");
      setEmail("");
      setInvoiceEmail("");

      setIsLogin(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // -----------------------------
  // LOGIN HANDLER (unchanged)
  // -----------------------------
  const handleSendMagicLink = async () => {
    setError("");
    setMessage("");

    if (!loginEmail) {
      setError("Enter your email.");
      return;
    }

    try {
      const q = query(
        collection(db, "intakeUsers"),
        where("email", "==", loginEmail)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("User not found. Please sign up first.");
        return;
      }

      const actionCodeSettings = {
        url: "http://localhost:5173/intake-form/login",
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, loginEmail, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", loginEmail);

      setMessage("Login link sent! Please check your email.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex bg-white min-h-screen justify-center items-center">
      <div className=" bg-amber-200">
        <img src="/images/loginPic.png" alt="login" className="h-max-screen" />
      </div>

      <div className="flex flex-col justify-center items-center m-auto py-4 px-6 w-[404px] gap-6 bg-white shadow-xl rounded-xl">
        <p className="text-center font-bold text-[24px]">
          {isLogin ? "Welcome Back" : "Create an Account"}
        </p>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {message && <p className="text-green-600 text-sm">{message}</p>}

        {isLogin ? (
          <>
            {/* LOGIN FORM */}
            <InputField
              label="Email"
              type="email"
              value={loginEmail}
              onChange={setLoginEmail}
              placeholder="your@email.com"
            />

            <button
              onClick={handleSendMagicLink}
              className="bg-dark-green text-white w-full rounded-[6px] py-[8px]"
            >
              Send Login Link
            </button>

            <SwitchText
              text="Don't have an account?"
              linkText="Sign Up"
              onClick={() => setIsLogin(false)}
            />
          </>
        ) : (
          <>
            {/* SIGNUP FORM */}

            <InputField
              label="Name"
              value={name}
              onChange={setName}
              placeholder="Enter full name"
            />

            {/* ROLE DROPDOWN */}
            <div className="flex flex-col gap-1 w-full">
              <label className="font-bold text-[14px]">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="border border-gray-300 rounded p-[10px] text-[14px]"
              >
                <option value="">Select Role</option>
                <option value="Intake Worker">Intake Worker</option>
                <option value="Parent">Parent</option>
              </select>
            </div>

            {/* AGENCY FIELD — only if role is Intake Worker */}
            {role === "Intake Worker" && (
              <InputField
                label="Name of Agency / Organisation"
                value={agency}
                onChange={setAgency}
                placeholder="Enter agency name"
              />
            )}

            <InputField
              label="Phone Number"
              value={phone}
              onChange={setPhone}
              placeholder="Enter phone number"
              type="tel"
            />

            <InputField
              label="E-mail"
              value={email}
              onChange={setEmail}
              placeholder="Enter email address"
              type="email"
            />
{/* INVOICE EMAIL FIELD */}
{isUPCSAgency ? (
  <div className="w-full">
    <label className="font-semibold text-sm w-full">
      Invoice E-mail
    </label>

    <select
      value={invoiceEmail}
      onChange={(e) => setInvoiceEmail(e.target.value)}
      className="border border-gray p-2 rounded w-full"
    >
      <option value="">Select Invoice Email</option>
      {UPCS_EMAIL_OPTIONS.map((email) => (
        <option key={email} value={email}>
          {email}
        </option>
      ))}
    </select>
  </div>
) : (
  <InputField
    label="Invoice E-mail"
    value={invoiceEmail}
    onChange={setInvoiceEmail}
    placeholder="Enter invoice email"
    type="email"
  />
)}

            <button
              onClick={handleSignup}
              className="bg-dark-green text-white w-full rounded-[6px] py-[8px]"
            >
              Sign Up
            </button>

            <SwitchText
              text="Already have an account?"
              linkText="Log In"
              onClick={() => setIsLogin(true)}
            />
          </>
        )}
      </div>
    </div>
  );
};

// Reusable InputField
const InputField = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="font-bold text-[14px]">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border border-gray-300 rounded p-[10px] text-[14px]"
    />
  </div>
);

// Switch text link
const SwitchText = ({ text, linkText, onClick }) => (
  <div className="text-center text-[14px] text-gray-700">
    {text}{" "}
    <span
      className="text-dark-green font-medium cursor-pointer hover:underline"
      onClick={onClick}
    >
      {linkText}
    </span>
  </div>
);

export default IntakeLogin;
