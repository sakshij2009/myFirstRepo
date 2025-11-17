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

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState(""); // signup name
  const [email, setEmail] = useState(""); // signup email
  const [role, setRole] = useState(""); // signup role
  const [loginEmail, setLoginEmail] = useState(""); // login email
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Detect if user clicked on magic link
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let storedEmail = window.localStorage.getItem("emailForSignIn");

      if (!storedEmail) {
        storedEmail = window.prompt("Please confirm your email:");
      }

      signInWithEmailLink(auth, storedEmail, window.location.href)
        .then(async () => {
          window.localStorage.removeItem("emailForSignIn");

          // Fetch Firestore user details
          const q = query(
            collection(db, "intakeUsers"),
            where("email", "==", storedEmail)
          );
          const snap = await getDocs(q);

          if (!snap.empty) {
            const userData = snap.docs[0].data();

            // Store user data in localStorage for dashboard
            // localStorage.setItem("user", JSON.stringify(userData));

            navigate("/intake-form/dashboard");
          } else {
            setError("User not found in database.");
          }
        })
        .catch((err) => {
          setError("Sign-in failed: " + err.message);
        });
    }
  }, [navigate]);

  // SIGNUP — No password
  const handleSignup = async () => {
    setError("");
    setMessage("");

    if (!name || !email || !role) {
      setError("Name, Email, and Role are required.");
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
        email,
        role, // added role
        createdAt: new Date(),
      });

      alert("Signup successful! Please log in using your email.");
      setName("");
      setEmail("");
      setRole("");
      setIsLogin(true);

    } catch (err) {
      setError(err.message);
    }
  };

  // LOGIN — Send magic link to email
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
    <div className="flex bg-white min-h-screen  justify-center items-center">
      <div className="max-h-screen bg-amber-200">
        <img src="/images/loginPic.png" alt="login" className="h-max-screen"/>
      </div>

      <div className="flex flex-col justify-center items-center m-auto p-6 w-[404px] gap-6 bg-white shadow-xl rounded-xl">
        <p className="text-center font-bold text-[24px]">
          {isLogin ? "Welcome Back" : "Create an Account"}
        </p>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {message && <p className="text-green-600 text-sm">{message}</p>}

        {isLogin ? (
          <>
           <div className="flex flex-col gap-1 w-full">
  <label className="font-bold text-[14px]">Email</label>
  <input
    type="email"
    value={loginEmail}
    onChange={(e) => setLoginEmail(e.target.value)}
    placeholder="your@email.com"
    className="border border-gray-300 rounded p-[10px] text-[14px]"
  />
</div>


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
         {/* FULL NAME */}
<div className="flex flex-col gap-1 w-full">
  <label className="font-bold text-[14px]">Full Name</label>
  <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="John Doe"
    className="border border-gray-300 rounded p-[10px] text-[14px]"
  />
</div>

{/* ROLE DROPDOWN */}
<div className="flex flex-col gap-1 w-full">
  <label className="font-bold text-[14px]">Role</label>
  <select
    value={role}
    onChange={(e) => setRole(e.target.value)}
    className="border border-gray-300 rounded p-[10px] text-[14px]"
  >
    <option value="">Select Role</option>
    <option value="Private Family">Private Family</option>
    <option value="Intake Worker">Intake Worker</option>
  </select>
</div>

{/* EMAIL */}
<div className="flex flex-col gap-1 w-full">
  <label className="font-bold text-[14px]">Email</label>
  <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="email@example.com"
    className="border border-gray-300 rounded p-[10px] text-[14px]"
  />
</div>

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

// Fields
const InputField = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div className="flex flex-col gap-1">
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
