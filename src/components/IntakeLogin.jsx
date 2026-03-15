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
  // const [role, setRole] = useState(""); // REMOVED - Defaulting to Intake Worker
  const [role] = useState("Intake Worker");
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
    "invoicewest@upcs.org",
    "invoiceparkland@upcs.org",
  ];

  const isUPCSAgency =
    agency.trim().toLowerCase().startsWith("upcs");


  // Detect magic link login
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      // 1️⃣ Try reading email from URL query param (set when admin/user sent the link)
      const urlParams = new URLSearchParams(window.location.search);
      let storedEmail = urlParams.get("email");

      // 2️⃣ Fall back to localStorage (same-device self-login flow)
      if (!storedEmail) {
        storedEmail = window.localStorage.getItem("emailForSignIn");
      }

      // 3️⃣ Last resort: ask the user (should almost never be needed now)
      if (!storedEmail) {
        storedEmail = window.prompt("Please enter the exact email address this link was sent to:");
      }

      if (!storedEmail) return; // user cancelled the prompt

      signInWithEmailLink(auth, storedEmail.trim().toLowerCase(), window.location.href)
        .then(async () => {
          window.localStorage.removeItem("emailForSignIn");

          const q = query(
            collection(db, "intakeUsers"),
            where("email", "==", storedEmail.trim().toLowerCase())
          );
          const snap = await getDocs(q);

          if (!snap.empty) {
            navigate("/intake-form/dashboard");
          } else {
            // User authenticated but no profile -> Show Signup/Completion form
            setIsLogin(false);
            setEmail(storedEmail.trim().toLowerCase());
            setMessage("Email verification successful! Please complete your profile.");
          }
        })
        .catch((err) => {
          console.error("Link Sign-In Error:", err);
          if (err.code === "auth/invalid-action-code") {
            setError("");
            setIsLogin(true);
          } else {
            setError("Sign-in failed. The link may have expired or already been used. Please request a new one.");
          }
        });
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

      // Reset fields
      setName("");
      setAgency("");
      setPhone("");
      setEmail("");
      setInvoiceEmail("");

      if (auth.currentUser) {
        // Came via magic link and just finished registering
        alert("Profile saved! Redirecting to dashboard...");
        window.location.reload();
      } else {
        // Normal signup
        alert("Profile saved successfully! Please log in.");
        setIsLogin(true);
        setMessage("Account created successfully. Please log in.");
      }
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

      // Embed email in the redirect URL so the worker's browser auto-detects it
      const encodedEmail = encodeURIComponent(loginEmail.trim().toLowerCase());
      const actionCodeSettings = {
        url: `${window.location.origin}/intake-form/login?email=${encodedEmail}`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, loginEmail.trim().toLowerCase(), actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", loginEmail.trim().toLowerCase());

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

            {/* ROLE DROPDOWN - REMOVED, Defaulting to Intake Worker */}
            {/* <div className="flex flex-col gap-1 w-full">
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
            </div> */}

            {/* AGENCY FIELD — Always show for Intake Worker (which is now default) */}
            <InputField
              label="Name of Agency / Organisation"
              value={agency}
              onChange={setAgency}
              placeholder="Enter agency name"
            />

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
