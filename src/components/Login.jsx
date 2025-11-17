import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from '../firebase'

const Login = ({ setUser }) => {   // ✅ added setUser here
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    // If already logged in → send to correct dashboard
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role === "admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/user-dashboard");
      }
    }
  }, [navigate]);

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", email),
        where("password", "==", password)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();

        // SAVE to localStorage
        localStorage.setItem("user", JSON.stringify(userData));

        // 🔥 UPDATE App state immediately
        setUser(userData);

        // Redirect by role
        if (userData.role === "admin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/user-dashboard");
        }

      } else {
        setError("Invalid email or password");
      }

    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Try again.");
    }
  };

  return (
    <div className=' bg-white min-h-screen  items-center grid grid-cols-2'>
      {/* Left image */}
      <div>
        <img src="/images/loginPic.png" alt="" />
      </div>

      {/* Login Card */}
      <div className='flex flex-col justify-center items-center m-auto p-6 w-[404px] gap-6 bg-white shadow-xl shadow-[#00000040] '>
        <div className='flex flex-col justify-center gap-3'>
          <p className='flex justify-center font-roboto font-bold text-[24px] leading-[20px] tracking-normal'>
            Welcome
          </p>
          <p className='flex font-normal text-[14px] leading-[20px] tracking-normal text-gray-600'>
            Sign in with your Family Forever Account.
          </p>
        </div>

        <div className='flex flex-col w-full gap-3'>
          <div className='flex flex-col gap-1'>
            <p className='flex font-bold text-[14px] leading-[20px] tracking-normal'>Email</p>
            <input
              type="text"
              placeholder='Enter your email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='border border-gray-300 rounded p-[10px] placeholder:font-normal text-[14px] leading-[20px] tracking-normal'
            />
          </div>

          <div className='flex flex-col gap-1'>
            <p className='flex font-bold text-[14px] leading-[20px] tracking-normal'>Password</p>
            <input
              type="password"
              placeholder='Enter your password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='border border-gray-300 rounded p-[10px] placeholder:font-normal text-[14px] leading-[20px] tracking-normal'
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className='flex w-full justify-center'>
            <button
              onClick={handleLogin}
              className='bg-dark-green text-white w-full rounded-[6px] py-[6px] px-3 cursor-pointer'
            >
              Log In
            </button>
          </div>

          <div className='flex items-center gap-3'>
            <hr className="flex-1 border-t border-gray-300" />
            <div className='font-medium text-[12px] leading-[16px] tracking-[0.002em] text-gray-500'>
              OR
            </div>
            <hr className="flex-1 border-t border-gray-300" />
          </div>

          <div className='flex justify-center items-center text-center'>
            <p className='text-[14px] text-gray-700'>
              Don’t have an account? Contact <span className='text-dark-green font-medium cursor-pointer'>familyforever@gmail.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
